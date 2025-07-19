#!/bin/bash
set -e

# Grafana 데이터 디렉토리 및 파일 권한 설정
if [ -f /var/lib/grafana/grafana.db ]; then
    chmod 640 /var/lib/grafana/grafana.db
    chown grafana:grafana /var/lib/grafana/grafana.db
fi

# 플러그인 디렉토리 권한 설정
chmod -R 755 /usr/share/grafana/data/plugins
chown -R grafana:grafana /usr/share/grafana/data/plugins

# Grafana 서버 시작
echo "Grafana Server start !!"
exec "$@"