#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Load all variables from .env into the shell environment
# (so that ES_PASSWORD, etc. become defined)
# ─────────────────────────────────────────────────────────────
set -o allexport
source "${ENV_FILE}"
set +o allexport

: "${ES_PASSWORD:?Need ES_PASSWORD to be set in ${ENV_FILE}}"

echo "🔐 Bootstrapping ${ENV_FILE} (enrollment & encryption)…"
[ -f "${ENV_FILE}" ] && echo "DEBUG: ${ENV_FILE} exists" || echo "DEBUG: ${ENV_FILE} does NOT exist"


# 1) ES health check
printf "⏳ Waiting for Elasticsearch to be healthy… "
until docker compose ${COMPOSE_FILES} exec -T elasticsearch \
     sh -c "curl -k -u elastic:${ES_PASSWORD} \
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

