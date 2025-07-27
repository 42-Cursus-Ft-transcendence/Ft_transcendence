FROM docker.elastic.co/beats/filebeat:8.17.2

USER root

# Copy configuration and certificates
COPY ./config/filebeat.yml /usr/share/filebeat/filebeat.yml

RUN chmod 644 /usr/share/filebeat/filebeat.yml

USER filebeat

ENTRYPOINT ["filebeat"]
CMD ["-e", "-c", "/usr/share/filebeat/filebeat.yml"]

# At runtime, mount your application log directory:
# docker run -d --name ft-filebeat \
#   -v /path/to/logs:/var/log/ft_transcendence:ro \
#   ft-transcendence-filebeat:latest

# And mount certs if not baked in:
#   -v /path/to/certs:/usr/share/filebeat/certs:ro
