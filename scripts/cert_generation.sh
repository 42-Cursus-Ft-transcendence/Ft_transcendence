#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=${ENV_FILE:-.env}

set -o allexport
source "${ENV_FILE}"
set +o allexport

: "${ELASTIC_PASSWORD:?Need ELASTIC_PASSWORD to be set in ${ENV_FILE}}"

echo "🔐 Bootstrapping ${ENV_FILE} (enrollment & encryption)…"
[ -f "${ENV_FILE}" ] && echo "DEBUG: ${ENV_FILE} exists" || echo "DEBUG: ${ENV_FILE} does NOT exist"


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

# 1) KIBANA_ENCRYPTION_KEY
if ! grep -q '^KIBANA_ENCRYPTION_KEY=' "${ENV_FILE}" \
    || [ -z "$(grep '^KIBANA_ENCRYPTION_KEY=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  printf "  • Generating KIBANA_ENCRYPTION_KEY… "
  KEY="$(openssl rand -hex 32)"
  upsert KIBANA_ENCRYPTION_KEY "$KEY"
  echo "done"
else
  echo "  • KIBANA_ENCRYPTION_KEY exists, skipping"
fi

echo "✅ Elasticsearch users created and passwords stored in .env"

SHARED=/usr/share/elasticsearch/config/shared
CERT_DIR=$SHARED/certs
CA_DIR=$SHARED/ca
KIBANA_DIR="$CERT_DIR/kibana"
LOGSTASH_DIR="$CERT_DIR/logstash"

# 3) Create Kibana cert if missing
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

# 4) Create Logstash cert if missing
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