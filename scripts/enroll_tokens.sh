#!/usr/bin/env bash
set -euo pipefail

#   ENV_FILE     (.env file root)
#   COMPOSE_FILES (예: "-f docker-compose.yml -f docker-compose.aarch64.yml")
: "${ENV_FILE:?Need ENV_FILE}"
: "${COMPOSE_FILES:?Need COMPOSE_FILES}"

echo "🔐 Bootstrapping ${ENV_FILE} (enrollment & encryption)…"

# creating .env if it is not
[ -f "${ENV_FILE}" ] || touch "${ENV_FILE}"

# 1) ES health check
printf "⏳ Waiting for Elasticsearch to be healthy… "
until docker compose ${COMPOSE_FILES} exec -T elasticsearch \
     sh -c 'curl -su elastic:"$${ELASTIC_PASSWORD}" \
       "http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=1s" >/dev/null'
do
  printf "."; sleep 2
done
echo " ready!"

# helper: key/token creating function
upsert() {
  local var=$1
  local val=$2
  if grep -q "^${var}=" "${ENV_FILE}"; then
    sed -i "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
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

# 3) KIBANA_ENROLLMENT_TOKEN
if ! grep -q '^KIBANA_ENROLLMENT_TOKEN=' "${ENV_FILE}" \
    || [ -z "$(grep '^KIBANA_ENROLLMENT_TOKEN=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  printf "  • Generating Kibana enrollment token… "
  TOKEN="$(docker compose ${COMPOSE_FILES} exec -T elasticsearch \
    bin/elasticsearch-create-enrollment-token --scope node)"
  upsert KIBANA_ENROLLMENT_TOKEN "$TOKEN"
  echo "done"
else
  echo "  • Kibana enrollment token exists, skipping"
fi

# 4) LOGSTASH_ENROLLMENT_TOKEN
if ! grep -q '^LOGSTASH_ENROLLMENT_TOKEN=' "${ENV_FILE}" \
    || [ -z "$(grep '^LOGSTASH_ENROLLMENT_TOKEN=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  printf "  • Generating Logstash enrollment token… "
  TOKEN="$(docker compose ${COMPOSE_FILES} exec -T elasticsearch \
    bin/elasticsearch-create-enrollment-token --scope node)"
  upsert LOGSTASH_ENROLLMENT_TOKEN "$TOKEN"
  echo "done"
else
  echo "  • Logstash enrollment token exists, skipping"
fi
