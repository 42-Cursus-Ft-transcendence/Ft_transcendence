FROM docker.elastic.co/kibana/kibana:8.17.2

COPY ./config/kibana.yml /usr/share/kibana/config/kibana.yml

USER kibana

EXPOSE 5601

CMD ["bin/kibana"]