#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# regenerate_certs.sh
# Always (re)generates Kibana / Logstash / Filebeat TLS cert‑key pairs
# using the shared CA inside the Elasticsearch container.
# If a previous certificate exists it is replaced and a clear message is printed.
# -----------------------------------------------------------------------------
set -euo pipefail

ENV_FILE=${ENV_FILE:-.env}

# shellcheck source=/dev/null
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD must be set in ${ENV_FILE}}"

SHARED=/usr/share/elasticsearch/config/shared
CERT_DIR="$SHARED/certs"
CA_DIR="$SHARED/ca"

# -----------------------------------------------------------------------------
# helper ─ update or insert a key=value in .env
# -----------------------------------------------------------------------------
upsert() {
  local var=$1 val=$2
  if grep -q "^${var}=" "$ENV_FILE"; then
    # GNU/BSD‑sed compatible in‑place edit
    sed -i'' -e "s|^${var}=.*|${var}=${val}|" "$ENV_FILE"
  else
    echo "${var}=${val}" >>"$ENV_FILE"
  fi
}

# ensure we have a Kibana encryption key
if ! grep -q '^KIBANA_ENCRYPTION_KEY=' "$ENV_FILE" \
   || [ -z "$(grep '^KIBANA_ENCRYPTION_KEY=' "$ENV_FILE" | cut -d= -f2-)" ]; then
  KEY=$(openssl rand -hex 32)
  upsert KIBANA_ENCRYPTION_KEY "$KEY"
  echo "🔑  Generated new KIBANA_ENCRYPTION_KEY"
fi

wait_for_ca() {
  local max_wait=30 
  local ca_path=/usr/share/elasticsearch/config/shared/ca/ca.crt

  while ! docker compose exec -T elasticsearch \
        bash -c "[ -f $ca_path ]" 2>/dev/null; do
    if [ $max_wait -le 0 ]; then
      echo "❌  CA is still missing after timeout – abort"
      exit 1
    fi
    echo "⏳  Waiting for CA inside container … (remaining ${max_wait}s)"
    sleep 1
    max_wait=$((max_wait-1))
  done

  echo "✅  CA detected in Elasticsearch container"
}


# -----------------------------------------------------------------------------
# function ─ issue or replace a certificate/key pair
# -----------------------------------------------------------------------------
issue_cert() {
  local name=$1          # kibana | logstash | filebeat
  local dir=$2           # full target directory
  local crt="$dir/$name.crt"
  local key="$dir/$name.key"

  local action="created"
  if [[ -f $crt ]]; then
    action="replaced"
    echo "⚠️  $name certificate already exists → will be replaced"
  fi

  docker compose exec -T elasticsearch sh -s <<SH
set -e
name="${name}" dir="${dir}" 
mkdir -p "$dir"
rm -f "$crt" "$key"   # remove old certs if they exist
elasticsearch-certutil cert --silent --pem \
  --ca-cert "$CA_DIR/ca.crt" \
  --ca-key  "$CA_DIR/ca.key" \
  --name "$name" --dns "$name" \
  --out "$dir/${name}.zip"
unzip -qo "\$dir/\${name}.zip" -d "\$dir"
mv -f "$dir/$name/$name.crt" "$dir/"
mv -f "$dir/$name/$name.key" "$dir/"
rm -rf "$dir/$name" "$dir/${name}.zip"
chmod 600 "$key" && chmod 644 "$crt"
chown 1000:1000 "$key" "$crt"
SH

  echo "✅  $name certificate $action successfully"
}

safe_restart () {
  # Restart services only if they are running
  for svc in "$@"; do
    if docker compose ps --services --filter "status=running" | grep -qx "$svc"; then
      echo "🔄  Restarting $svc ..."
      docker compose restart -t 30 "$svc"
    else
      echo "⏩  $svc is not running – skip restart"
    fi
  done
}

# -----------------------------------------------------------------------------
# main
# -----------------------------------------------------------------------------
main() {
  issue_cert kibana   "$CERT_DIR/kibana"
  issue_cert logstash "$CERT_DIR/logstash"
  issue_cert filebeat "$CERT_DIR/filebeat"

  echo "🔄  Restarting Logstash & Filebeat to load fresh certs…"
  safe_restart logstash filebeat  

  echo "🎉  All certificates are up to date and services reloaded."
}

wait_for_ca
main