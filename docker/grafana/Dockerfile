ARG GRAFANA_VERSION=11.6.3
FROM grafana/grafana-oss:${GRAFANA_VERSION}

# Grafana 설정 파일 복사 (필요 시)
COPY provisioning /etc/grafana/provisioning

USER root
RUN mkdir -p /var/lib/grafana/plugins \
    && chown -R grafana:root /var/lib/grafana/plugins

# 엔트리포인트 스크립트 복사 및 권한 설정
COPY entrypoint.sh /usr/local/bin/grafana_entrypoint.sh
RUN chmod +x /usr/local/bin/grafana_entrypoint.sh

USER grafana

# 포트 개방
EXPOSE 3000

# 엔트리포인트 스크립트 설정
ENTRYPOINT ["/usr/local/bin/grafana_entrypoint.sh"]

# Grafana 실행
CMD ["grafana-server", "--homepath=/usr/share/grafana", "cfg:default.paths.data=/var/lib/grafana"]