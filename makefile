# Variables
IMAGE_NAME=ft_transcendence-backend
CONTAINER_NAME=transcendence-dev
PORT=3000

# Commandes de base
build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run  \
		--name $(CONTAINER_NAME) \
		-p $(PORT):3000 \
		$(IMAGE_NAME)

all: build run

stop:
	docker stop $(CONTAINER_NAME) || true

logs:
	docker logs -f $(CONTAINER_NAME)

exec:
	docker exec -it $(CONTAINER_NAME) sh

clean:
	docker rm -f $(CONTAINER_NAME) || true
	docker rmi -f $(IMAGE_NAME) || true

prune:
	docker system prune -f --volumes

re: clean build run

.PHONY: build run all stop logs exec clean prune re
