FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.2

COPY ./config/elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml
COPY ./scripts/init_tls.sh      /usr/share/elasticsearch/config/init_tls.sh

USER root

RUN ln -sf /usr/share/elasticsearch/jdk/bin/keytool /usr/bin/keytool \
    && chmod +x /usr/share/elasticsearch/config/init_tls.sh

EXPOSE 9200 9300

ENTRYPOINT ["/usr/share/elasticsearch/config/init_tls.sh"]

# elasticsearch dies if it is not run as the elasticsearch user
USER elasticsearch
CMD ["bin/elasticsearch"]
