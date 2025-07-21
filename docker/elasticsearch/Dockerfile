FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.2

COPY ./config/elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml

EXPOSE 9200
EXPOSE 9300

CMD ["bin/elasticsearch"]