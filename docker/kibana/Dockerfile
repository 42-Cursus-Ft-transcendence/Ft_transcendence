FROM docker.elastic.co/kibana/kibana:8.17.2

ENV ELASTICSEARCH_URL="http://elasticsearch:9200"

COPY ./config/kibana.yml /usr/share/kibana/config/kibana.yml
COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
USER kibana
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bin/kibana"]

