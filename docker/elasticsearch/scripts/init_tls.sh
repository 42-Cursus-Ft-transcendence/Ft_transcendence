#!/usr/bin/env bash
set -euo pipefail

# Host-mounted paths inside container
SHARED=/usr/share/elasticsearch/config/shared
CERT_DIR=/usr/share/elasticsearch/config/certs
SHARED_CA_DIR=$SHARED/ca

CA_DIR=${CERT_DIR}/ca
NODE_DIR=${CERT_DIR}/node

mkdir -p "$CA_DIR" "$NODE_DIR" "$SHARED_CA_DIR"

# if sheard volume already has CA certs, copy them to local certs dir
if [ -f "$SHARED_CA_DIR/ca.crt" ] && [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "📥  Re‑using existing CA from shared volume"
  cp "$SHARED_CA_DIR/ca."{crt,key} "$CA_DIR/"
fi

# 1) Create self-signed CA if missing
if [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "🔐  Creating brand‑new CA (first run)…"
  elasticsearch-certutil ca --silent --pem --out "$CA_DIR/ca.zip"
  unzip -o "$CA_DIR/ca.zip" -d "$CA_DIR"
  mv "$CA_DIR/ca/ca.crt" "$CA_DIR/"
  mv "$CA_DIR/ca/ca.key" "$CA_DIR/"
  rm -rf "$CA_DIR/ca" "$CA_DIR/ca.zip"
fi

if [ -f "$SHARED_CA_DIR/ca.crt" ] && ! cmp -s "$CA_DIR/ca.crt" "$SHARED_CA_DIR/ca.crt"; then
  echo "⚠️  Detected existing CA in shared volume with different fingerprint."
  echo "    → Using the *shared* CA and leaving internal copy intact."
  # if the shared CA is different, we do not overwrite it
  # exit 1
fi

cp -u "$CA_DIR/ca."{crt,key} "$SHARED_CA_DIR/"
chmod 644               "$SHARED_CA_DIR/ca.crt" "$SHARED_CA_DIR/ca.key"
chown 1000:1000         "$SHARED_CA_DIR/ca.crt" "$SHARED_CA_DIR/ca.key"

# 2) Generate node certificate if missing
if [ ! -f "$NODE_DIR/elasticsearch.crt" ]; then
  echo "🔐 Generating node certificate…"
  elasticsearch-certutil cert \
    --silent --pem \
    --ca-cert "$CA_DIR/ca.crt" \
    --ca-key "$CA_DIR/ca.key" \
    --name ft_transcende \
    --dns elasticsearch --dns es \
    --out "$NODE_DIR/node.zip"
  unzip -o "$NODE_DIR/node.zip" -d "$NODE_DIR"
  mv "$NODE_DIR/ft_transcende/ft_transcende.crt" "$NODE_DIR/elasticsearch.crt"
  mv "$NODE_DIR/ft_transcende/ft_transcende.key" "$NODE_DIR/elasticsearch.key"
  echo "✅ Node cert generated"
fi

chmod 600 "$NODE_DIR/elasticsearch."{crt,key} "$CA_DIR/ca.crt"
chown 1000:1000 "$NODE_DIR/elasticsearch."{crt,key} "$CA_DIR/ca.crt"

# 4) Hand off to official entrypoint
# exec /usr/local/bin/docker-entrypoint.sh "$@"
exec gosu elasticsearch /usr/local/bin/docker-entrypoint.sh "$@"