FROM docker.elastic.co/kibana/kibana:8.17.2

ENV ELASTICSEARCH_URL="http://elasticsearch:9200"

COPY ./config/kibana.yml /usr/share/kibana/config/kibana.yml

EXPOSE 5601

CMD ["bin/kibana"]