#!/usr/bin/env bash
set -euo pipefail

SHARED=/usr/share/elasticsearch/config/shared
CERT_DIR=/usr/share/elasticsearch/config/certs
SHARED_CA_DIR=$SHARED/ca
TOKEN_DIR=$SHARED/tokens
CA_DIR=${CERT_DIR}/ca
NODE_DIR=${CERT_DIR}/node
KEYSTORE=${CERT_DIR}/keystore.p12
TRUSTSTORE=${CERT_DIR}/truststore.p12

mkdir -p "$CA_DIR" "$NODE_DIR" "$TOKEN_DIR" "$SHARED_CA_DIR"

# 1) Create a self‑signed CA if needed
if [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "🔐 Generating CA…"
  elasticsearch-certutil ca --silent --pem --out "$CA_DIR/ca.zip"
  unzip -o "$CA_DIR/ca.zip" -d "$CA_DIR"

  # Move into top-level for convenience
  mv "$CA_DIR/ca/ca.crt" "$CA_DIR/ca.crt"
  mv "$CA_DIR/ca/ca.key" "$CA_DIR/ca.key"
  echo "✅ CA files are at $CA_DIR/ca.crt and $CA_DIR/ca.key"
fi

# 2) Issue a node cert signed by that CA
if [ ! -d "$NODE_DIR" ]; then
  mkdir -p "$NODE_DIR"
fi

if [ ! -f "$NODE_DIR/elasticsearch.crt" ]; then
  echo "🔐 Generating node certificate…"
  elasticsearch-certutil cert \
    --silent --pem \
    --ca-cert "$CA_DIR/ca.crt" \
    --ca-key  "$CA_DIR/ca.key" \
    --name    ft_transcende \
    --dns     elasticsearch \
    --dns     es \
    --out     "$NODE_DIR/node.zip"

  unzip -o "$NODE_DIR/node.zip" -d "$NODE_DIR"
  mv "$NODE_DIR/ft_transcende/ft_transcende.crt" "$NODE_DIR/elasticsearch.crt"
  mv "$NODE_DIR/ft_transcende/ft_transcende.key" "$NODE_DIR/elasticsearch.key"
  echo "✅ Node certificate at $NODE_DIR/elasticsearch.crt"
fi

# 3) Build a PKCS#12 keystore from the node key+cert
if [ ! -f "$KEYSTORE" ]; then
  echo "🔐 Building keystore.p12…"
  openssl pkcs12 -export \
    -in  "$NODE_DIR/elasticsearch.crt" \
    -inkey "$NODE_DIR/elasticsearch.key" \
    -out  "$KEYSTORE" \
    -passout pass:
  echo "✅ Keystore created at $KEYSTORE"
fi

# 4) Build a PKCS#12 truststore from the CA cert
if [ ! -f "$TRUSTSTORE" ]; then
  echo "🔐 Building truststore.p12…"
  TRUSTPASS=1q2w3e4r # Keytool requires a password which is 6 characters long
  keytool -importcert \
    -alias elastic-stack-ca \
    -file   "$CA_DIR/ca.crt" \
    -keystore "$TRUSTSTORE" \
    -storepass "$TRUSTPASS" \
    -noprompt \
    -storetype PKCS12
  echo "✅ Truststore created at $TRUSTSTORE"
fi

chmod 600 "$KEYSTORE" "$TRUSTSTORE"

# Fix permission issues on the target directory (ignore errors)
chown -R elasticsearch:elasticsearch "$SHARED_CA_DIR" || true
chmod -R 750 "$SHARED_CA_DIR" || true

# 5) Copy the CA certificate to shared location for Kibana, Logstash, etc.
cat "$CA_DIR/ca.crt" > "$SHARED_CA_DIR/ca.crt" || {
  echo "[ERROR] Failed to write CA cert to $SHARED_CA_DIR"
  exit 1
}

# 6) Generate Kibana enrollment token
echo "[INFO] Generating Kibana enrollment token…"
if bin/elasticsearch-create-enrollment-token --scope kibana > "$TOKEN_DIR/kibana.token"; then
  echo "[SUCCESS] Kibana token generated at $TOKEN_DIR/kibana.token"
else
  echo "[ERROR] Failed to generate Kibana token (exit code $?)"
fi

# 7) Finally, hand off to the official entrypoint
exec /usr/local/bin/docker-entrypoint.sh "$@"
