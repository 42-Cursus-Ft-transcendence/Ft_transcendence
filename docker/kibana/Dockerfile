FROM docker.elastic.co/kibana/kibana:8.17.2

COPY ./config/kibana.yml /usr/share/kibana/config/kibana.yml

USER root

RUN apt-get update \
&& apt-get install -y --no-install-recommends \
    jq \
    netcat-openbsd \
 && rm -rf /var/lib/apt/lists/*

COPY ./kibana-import /usr/share/kibana/scripts/kibana-import

USER kibana

EXPOSE 5601
CMD ["bin/kibana"]
