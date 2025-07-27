#!/usr/bin/env bash
set -euo pipefail

TMP=/tmp/logstash-certs
mkdir -p "$TMP"

cp /usr/share/logstash/certs/logstash.crt "$TMP/"
cp /usr/share/logstash/certs/logstash.key "$TMP/"
cp /usr/share/logstash/ca/ca.crt           "$TMP/"

# Generate full chaine (leaf + CA)
cat "$TMP/logstash.crt" "$TMP/ca.crt" > "$TMP/logstash-fullchain.pem"
chmod 600 "$TMP/logstash.key"
chmod 644 "$TMP/logstash-fullchain.pem"

exec /usr/share/logstash/bin/logstash \
     -f /usr/share/logstash/pipeline/ft_transcend.conf \
     --path.settings /usr/share/logstash/config
