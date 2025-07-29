#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=${ENV_FILE:-.env}

# shellcheck source=/dev/null
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD must be set in ${ENV_FILE}}"

POLICY_NAME=ft_transcende-logs-policy
TEMPLATE_NAME=ft_transcende-logs-template

POLICY_FILE="$(dirname "$0")/../ilm/ft_transcende-logs-policy.json"
TEMPLATE_FILE="$(dirname "$0")/../ilm/ft_transcende-logs-template.json"

for f in "$POLICY_FILE" "$TEMPLATE_FILE"; do
  [[ -f $f ]] || { echo "❌  Missing $f"; exit 1; }
done

echo "⏳  Installing ILM policy & template to Elasticsearch container …"

# 1) ILM Policy
docker compose exec -T elasticsearch \
  sh -c "
    curl -sk -u elastic:${ELASTIC_PASSWORD} \
         --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
         -X PUT https://localhost:9200/_ilm/policy/${POLICY_NAME} \
         -H 'Content-Type: application/json' \
         --data-binary @-  <<'EOF'
$(cat "$POLICY_FILE")
EOF
  " || echo '⚠️  (Policy already exists or other non‑fatal error, skipping)'

# 2) Index Template
docker compose exec -T elasticsearch \
  sh -c "
    curl -sk -u elastic:${ELASTIC_PASSWORD} \
         --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
         -X PUT https://localhost:9200/_index_template/${TEMPLATE_NAME} \
         -H 'Content-Type: application/json' \
         --data-binary @-  <<'EOF'
$(cat "$TEMPLATE_FILE")
EOF
  " || echo '⚠️  (Template already exists or other non‑fatal error, skipping)'

echo '✅  ILM policy & template installed.'
