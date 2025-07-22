#!/bin/bash
set -e

TOKEN_FILE="/usr/share/kibana/config/shared/tokens/kibana.token"

if [ -f "$TOKEN_FILE" ]; then
  export KIBANA_ENROLLMENT_TOKEN=$(cat "$TOKEN_FILE")
fi

exec "$@"