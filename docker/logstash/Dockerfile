FROM docker.elastic.co/logstash/logstash:8.17.2

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends iproute2 lsof netcat-traditional && \
    rm -rf /var/lib/apt/lists/*

COPY ./scripts/pull_chaine_generation.sh /usr/local/bin/pull_chaine_generation.sh
RUN chmod +x /usr/local/bin/pull_chaine_generation.sh

USER logstash
COPY ./pipeline/ft_transcend.conf /usr/share/logstash/pipeline/
COPY ./config/logstash.yml /usr/share/logstash/config/logstash.yml
#COPY ./config/pipelines.yml /usr/share/logstash/config/pipelines.yml
# The above settings are additional when using multi-pipelines.

EXPOSE 5044

ENTRYPOINT ["/usr/local/bin/pull_chaine_generation.sh"]
CMD ["bin/logstash"]