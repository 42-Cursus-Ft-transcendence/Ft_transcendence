FROM docker.elastic.co/logstash/logstash:8.17.2

COPY ./pipeline /usr/share/logstash/pipeline
COPY ./config/logstash.yml /usr/share/logstash/config/logstash.yml
# COPY ./config/pipelines.yml /usr/share/logstash/pipeline/pipelines.yml
# The above settings are additional when using multi-pipelines.

RUN bin/logstash-plugin install logstash-filter-useragent

EXPOSE 5044

CMD ["bin/logstash"]