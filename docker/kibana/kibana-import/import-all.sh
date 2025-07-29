#!/usr/bin/env bash
set -e

# ───────────────────────────────────────────────
# 0) Environment variables
# ───────────────────────────────────────────────
# NOTE: drop the "/kibana" prefix here so we can call /api directly
KIBANA_BASE="http://kibana:5601"
ELASTIC_USER="elastic"
ELASTIC_PASS="${ELASTIC_PASSWORD}"
AUTH="-u ${ELASTIC_USER}:${ELASTIC_PASS}"
PATTERN="ft_transcende-logs*"

# ───────────────────────────────────────────────
# 1) Wait for Kibana
# ───────────────────────────────────────────────
echo "🔄 Waiting for Kibana TCP port…"
until nc -z kibana 5601; do
  sleep 2
done
echo "✔ TCP port is open."

echo "🔄 Waiting for Kibana /api/status…"
until curl -sf ${AUTH} "${KIBANA_BASE}/api/status" >/dev/null; do
  sleep 2
done
echo "✔ Kibana HTTP is up!"


# ───────────────────────────────────────────────
# 2) Lookup the index-pattern ID
# ───────────────────────────────────────────────
echo "▶ Looking up index-pattern ID for ${PATTERN}"
RESPONSE=$(curl -s ${AUTH} \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  "${KIBANA_BASE}/api/saved_objects/_find?type=index-pattern&search_fields=title&search=${PATTERN}&per_page=1")

INDEX_PATTERN_ID=$(printf '%s' "$RESPONSE" | jq -r '.saved_objects[0].id // empty')

if [ -z "$INDEX_PATTERN_ID" ]; then
  echo "↪ Index-pattern not found, creating…"
  CREATE_RESP=$(curl -s ${AUTH} \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -X POST "${KIBANA_BASE}/api/saved_objects/index-pattern/${PATTERN}" \
    -d '{
      "attributes": {
        "title": "'"${PATTERN}"'",
        "timeFieldName": "@timestamp"
      }
    }')
  INDEX_PATTERN_ID=$(printf '%s' "$CREATE_RESP" | jq -r '.id')
  echo "   ✔ Created index-pattern with ID: $INDEX_PATTERN_ID"
else
  echo "   ✔ Found index-pattern ID: $INDEX_PATTERN_ID"
fi

# ───────────────────────────────────────────────
# 3) Export pattern + all references
# ───────────────────────────────────────────────
EXPORT_FILE="/tmp/export_${PATTERN}.ndjson"
echo "▶ Exporting index-pattern and all references → $EXPORT_FILE"
if 
  curl -s ${AUTH} \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -X POST "${KIBANA_BASE}/api/saved_objects/_export" \
    -d '{
      "objects":[{"type":"index-pattern","id":"'"${INDEX_PATTERN_ID}"'"}],
      "includeReferencesDeep": true
    }' > "$EXPORT_FILE"
then
  echo "   ✔ Export complete: $(wc -l < "$EXPORT_FILE") lines dumped"
else
  echo "❌ Export failed, check Kibana logs for details."
  exit 1
fi

# ───────────────────────────────────────────────
# 4) Import the dumped NDJSON
# ───────────────────────────────────────────────
echo "▶ Importing saved objects from $EXPORT_FILE"
IMPORT_RESP=$(curl -s ${AUTH} \
  -H "kbn-xsrf: true" \
  -F "file=@${EXPORT_FILE}" \
  "${KIBANA_BASE}/api/saved_objects/_import?overwrite=true")

# 2) success 필드(true/false)로 검사
if printf '%s' "$IMPORT_RESP" | jq -e '.success == true' >/dev/null; then
  echo "✔ Import succeeded: $(wc -l < "$EXPORT_FILE") objects imported"
else
  echo "❌ Import failed, check Kibana logs for details."
  # (print the full response for debugging)
  # echo "$IMPORT_RESP"
  exit 1
fi
echo "✔ All objects imported successfully."