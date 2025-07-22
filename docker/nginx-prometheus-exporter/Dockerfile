ARG VERSION=1.4.0

FROM nginx/nginx-prometheus-exporter:${VERSION}

# Expose port 9113
EXPOSE 9113

# Set entrypoint
ENTRYPOINT ["nginx-prometheus-exporter", "--nginx.scrape-uri=http://nginx:80/nginx_status"]
