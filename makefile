# ──────────────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────────────
DOCKERFILE       := src/docker/Dockerfile
COMPOSE_FILE     := src/docker/docker-compose.yml
IMAGE_NAME       := fastify-app
CONTAINER_NAME   := fastify-app-dev
PORT             := 3000

# ──────────────────────────────────────────────────────
# Cibles par défaut et aide
# ──────────────────────────────────────────────────────
.PHONY: all help install-back install-front build-front-ts \
        watch-front-ts watch-front-css dev-back dev-front dev \
        docker-build docker-run docker-stop docker-clean logs exec \
        compose-build compose-up compose-down compose-logs \
        compose-exec-backend compose-exec-nginx

all: help

help:
	@echo "Local development with npm"
	@npm run help --silent
	@echo "──────────────────────────────────────────────────────"
	@echo "Usage: make [target]"
	@echo "\nSingle-container Docker targets:"
	@echo "  docker-build       Build Docker image ($(IMAGE_NAME))"
	@echo "  docker-run         Run Docker container ($(CONTAINER_NAME))"
	@echo "  docker-stop        Stop Docker container"
	@echo "  docker-clean       Remove container and image"
	@echo "  logs               Follow container logs"
	@echo "  exec               Shell into the running container"
	@echo "\nDocker-Compose targets:"
	@echo "  compose-build      Build all images via docker-compose"
	@echo "  compose-up         Start all services in background"
	@echo "  compose-down       Stop and remove all services"
	@echo "  compose-logs       Follow logs for the entire stack"
	@echo "  compose-exec-backend   Shell into the backend service"
	@echo "  compose-exec-nginx     Shell into the nginx service\n"

# ──────────────────────────────────────────────────────
# 1) SINGLE-CONTAINER DOCKER WORKFLOW
# ──────────────────────────────────────────────────────

docker-build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .

docker-run: docker-stop docker-clean docker-build
	docker run --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME)

docker-stop:
	docker stop $(CONTAINER_NAME) 2>/dev/null || true

docker-clean: docker-stop
	docker rm -f $(CONTAINER_NAME) 2>/dev/null || true
	docker rmi -f $(IMAGE_NAME)        2>/dev/null || true

logs:
	docker logs -f $(CONTAINER_NAME)

exec:
	docker exec -it $(CONTAINER_NAME) sh

# ──────────────────────────────────────────────────────
# 2) MULTI-CONTAINER DOCKER-COMPOSE WORKFLOW
# ──────────────────────────────────────────────────────

compose-build:
	docker-compose -f $(COMPOSE_FILE) build

compose-up: compose-build
	docker-compose -f $(COMPOSE_FILE) up -d

compose-down:
	docker-compose -f $(COMPOSE_FILE) down --remove-orphans

compose-logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

# Ensure services are running before exec
compose-exec-backend: compose-up
	docker-compose -f $(COMPOSE_FILE) exec backend sh

compose-exec-nginx: compose-up
	docker-compose -f $(COMPOSE_FILE) exec nginx sh
