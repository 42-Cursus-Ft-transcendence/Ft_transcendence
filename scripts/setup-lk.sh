#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Load all variables from .env into the shell environment
# (so that ELASTIC_PASSWORD, etc. become defined)
# ─────────────────────────────────────────────────────────────
set -o allexport
source "${ENV_FILE}"
set +o allexport

: "${ELASTIC_PASSWORD:?Need ELASTIC_PASSWORD to be set in ${ENV_FILE}}"

echo "🔐 Bootstrapping ${ENV_FILE} (enrollment & encryption)…"
[ -f "${ENV_FILE}" ] && echo "DEBUG: ${ENV_FILE} exists" || echo "DEBUG: ${ENV_FILE} does NOT exist"


# 1) ES health check
printf "⏳ Waiting for Elasticsearch to be healthy… "
until docker compose ${COMPOSE_FILES} exec -T elasticsearch \
    sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} \
        \"https://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=1s\" \
        >/dev/null 2>&1"
do
  printf "."; sleep 2
done
echo " ready!"

# helper: key creating function
upsert() {
  local var=$1 val=$2
  if grep -q "^${var}=" "${ENV_FILE}"; then
    # Linux와 macOS 모두 대응
    if sed --version >/dev/null 2>&1; then
      sed -i "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    else
      sed -i '' "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    fi
  else
    echo "${var}=${val}" >> "${ENV_FILE}"
  fi
}

# 2) KIBANA_ENCRYPTION_KEY
if ! grep -q '^KIBANA_ENCRYPTION_KEY=' "${ENV_FILE}" \
    || [ -z "$(grep '^KIBANA_ENCRYPTION_KEY=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  printf "  • Generating KIBANA_ENCRYPTION_KEY… "
  KEY="$(openssl rand -hex 32)"
  upsert KIBANA_ENCRYPTION_KEY "$KEY"
  echo "done"
else
  echo "  • KIBANA_ENCRYPTION_KEY exists, skipping"
fi

# 2) Generate random passwords for kibana_system and logstash_system users if not set
if ! grep -q '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" \
    || [ -z "$(grep '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  KIBANA_PASS=$(openssl rand -hex 16)
  upsert KIBANA_SYSTEM_PASSWORD "$KIBANA_PASS"
  echo "  • Generated KIBANA_SYSTEM_PASSWORD"
else
  KIBANA_PASS=$(grep '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)
  echo "  • KIBANA_SYSTEM_PASSWORD exists, skipping"
fi

if ! grep -q '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" \
    || [ -z "$(grep '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  LOGSTASH_PASS=$(openssl rand -hex 16)
  upsert LOGSTASH_SYSTEM_PASSWORD "$LOGSTASH_PASS"
  echo "  • Generated LOGSTASH_SYSTEM_PASSWORD"
else
  LOGSTASH_PASS=$(grep '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)
  echo "  • LOGSTASH_SYSTEM_PASSWORD exists, skipping"
fi

# 3) Create users in Elasticsearch using the REST API
create_user() {
  local username=$1
  local password=$2
  local role=$3

  echo "Creating user $username..."

  # Check if user already exists (ignore error output)
  if docker compose exec -T elasticsearch \
      sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -s -o /dev/null -w '%{http_code}' https://localhost:9200/_security/user/${username}" | grep -q '^200$'; then
    echo "User $username already exists, skipping creation."
  else
    docker compose exec -T elasticsearch sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -X POST https://localhost:9200/_security/user/${username} -H 'Content-Type: application/json' -d '{
      \"password\": \"${password}\",
      \"roles\": [\"${role}\"],
      \"full_name\": \"${username} user\",
      \"enabled\": true
    }'"
       echo "User $username creation requested."
  fi

  # Wait until user creation is confirmed
  echo "Waiting for user $username to be fully created..."
  until status=$(docker compose exec -T elasticsearch \
      sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -s -o /dev/null -w '%{http_code}' https://localhost:9200/_security/user/${username}") && [ "$status" = "200" ]; do
    printf "."
    sleep 2
  done
  echo "User $username confirmed."
}

create_user kibana_system "$KIBANA_PASS" kibana_system
create_user logstash_system "$LOGSTASH_PASS" logstash_system

echo "✅ Elasticsearch users created and passwords stored in .env"

SHARED=/usr/share/elasticsearch/config/shared
CERT_DIR=$SHARED/certs
CA_DIR=$SHARED/ca
KIBANA_DIR="$CERT_DIR/kibana"
LOGSTASH_DIR="$CERT_DIR/logstash"

# 4) Create Kibana cert if missing
if [ ! -f "$KIBANA_DIR/kibana.crt" ]; then
  echo "🔐 Generating Kibana cert..."
  docker compose exec elasticsearch sh -c "
    mkdir -p $KIBANA_DIR && \
    elasticsearch-certutil cert --silent --pem \
      --ca-cert $CA_DIR/ca.crt \
      --ca-key $CA_DIR/ca.key \
      --name kibana --dns kibana \
      --out $KIBANA_DIR/kibana.zip && \
    unzip -o $KIBANA_DIR/kibana.zip -d $KIBANA_DIR && \
    mv $KIBANA_DIR/kibana/kibana.crt $KIBANA_DIR/ && \
    mv $KIBANA_DIR/kibana/kibana.key $KIBANA_DIR/ && \
    rm -rf $KIBANA_DIR/kibana && \
    rm -rf $KIBANA_DIR/kibana.zip && \
    chmod 600 $KIBANA_DIR/kibana.key && \
    chmod 644 $KIBANA_DIR/kibana.crt
  "
  echo "✅ Kibana cert generated"
fi

# 5) Create Logstash cert if missing
if [ ! -f "$LOGSTASH_DIR/logstash.crt" ]; then
  echo "🔐 Generating Logstash cert..."
  docker compose exec elasticsearch sh -c "
    mkdir -p '$LOGSTASH_DIR' && \
    elasticsearch-certutil cert --silent --pem \
      --ca-cert '$CA_DIR/ca.crt' \
      --ca-key '$CA_DIR/ca.key' \
      --name logstash \
      --dns logstash \
      --out '$LOGSTASH_DIR/logstash.zip' && \
    unzip -o '$LOGSTASH_DIR/logstash.zip' -d '$LOGSTASH_DIR' && \
    mv '$LOGSTASH_DIR/logstash/logstash.crt' '$LOGSTASH_DIR/' && \
    mv '$LOGSTASH_DIR/logstash/logstash.key' '$LOGSTASH_DIR/' && \
    rm -rf '$LOGSTASH_DIR/logstash' && \
    rm -rf '$LOGSTASH_DIR/logstash.zip' && \
    chmod 600 '$LOGSTASH_DIR/logstash.key' && \
    chmod 644 '$LOGSTASH_DIR/logstash.crt'
  "

  echo "✅ Logstash cert generated"
fi
