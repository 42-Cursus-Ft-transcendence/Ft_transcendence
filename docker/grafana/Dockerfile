ARG GRAFANA_VERSION=11.6.3
FROM grafana/grafana-oss:${GRAFANA_VERSION}

# Copy provisioning config (optional)
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
COPY provisioning/datasources /etc/grafana/provisioning/datasources

COPY grafana.ini /etc/grafana/grafana.ini

# Switch back to the default Grafana user (UID 472)
USER grafana

# Expose Grafana's default port
EXPOSE 3000

# Start Grafana with explicitly defined plugin and data paths
CMD ["grafana-server","--homepath=/usr/share/grafana","--config=/etc/grafana/grafana.ini", \
  "--packaging=oss","cfg:default.paths.data=/var/lib/grafana", \
  "cfg:default.paths.plugins=/var/lib/grafana/plugins", \
  "cfg:default.paths.provisioning=/etc/grafana/provisioning"]

