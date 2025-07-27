FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.2

COPY ./config/elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml
COPY ./scripts/init_tls.sh      /usr/share/elasticsearch/config/init_tls.sh

USER root

RUN \
  apt-get update && \
  apt-get install -y gosu && \
  rm -rf /var/lib/apt/lists/*

RUN chmod +x /usr/share/elasticsearch/config/init_tls.sh \
    && chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/config \
    && chmod -R 750 /usr/share/elasticsearch/config

EXPOSE 9200 9300

ENTRYPOINT ["/usr/share/elasticsearch/config/init_tls.sh"]

# elasticsearch dies if it is not run as the elasticsearch user
#USER elasticsearch
#CMD ["bin/elasticsearch"]
