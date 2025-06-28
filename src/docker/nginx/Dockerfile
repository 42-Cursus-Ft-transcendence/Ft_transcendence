FROM nginx:1.25-alpine

RUN apk add --no-cache openssl

# generate certs…
RUN mkdir -p /etc/nginx/certs \
 && openssl req -x509 -nodes -days 365 \
      -newkey rsa:2048 \
      -keyout /etc/nginx/certs/server.key \
      -out /etc/nginx/certs/server.crt \
      -subj "/C=FR/ST=Paris/L=Paris/O=MyOrg/OU=Dev/CN=localhost"

# copy the default.conf from its true location
COPY src/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# remove default static files
RUN rm -rf /usr/share/nginx/html/*

# copy your built front-end from the project tree
COPY src/front/public /usr/share/nginx/html
