FROM docker.elastic.co/logstash/logstash:8.17.2

COPY /pipeline /usr/share/logstash/pipeline
COPY ./config/logstash.yml /usr/share/logstash/config/logstash.yml
COPY ./config/pipeline.yml ./usr/share/logstash/pipeline/pipeline.yml

RUN bin/logstash-plugin install logstash-filter-useragent

EXPOSE 5044

CMD ["bin/logstash"]