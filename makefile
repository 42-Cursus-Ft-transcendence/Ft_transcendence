# ──────────────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────────────
BACK_DIR         := src/back
FRONT_DIR        := src/front
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
	@echo "Usage: make [target]"
	@echo ""
	@echo "Local development (no Docker):"
	@echo "  install-back       Install backend deps"
	@echo "  install-front      Install frontend deps"
	@echo "  build-front-ts     Compile front TypeScript once"
	@echo "  watch-front-ts     Watch & recompile front TS"
	@echo "  watch-front-css    Watch & rebuild Tailwind CSS"
	@echo "  dev-back           Run backend in dev mode"
	@echo "  dev-front          Run front TS+CSS watchers"
	@echo "  dev                install-* then dev-back & dev-front"
	@echo ""
	@echo "Single-container Docker targets:"
	@echo "  docker-build       Build Docker image ($(IMAGE_NAME))"
	@echo "  docker-run         Run Docker container ($(CONTAINER_NAME))"
	@echo "  docker-stop        Stop Docker container"
	@echo "  docker-clean       Remove container and image"
	@echo "  logs               Follow container logs"
	@echo "  exec               Shell into the running container"
	@echo ""
	@echo "Docker-Compose targets:"
	@echo "  compose-build      Build all images via docker-compose"
	@echo "  compose-up         Start all services in background"
	@echo "  compose-down       Stop and remove all services"
	@echo "  compose-logs       Follow logs for the entire stack"
	@echo "  compose-exec-backend   Shell into the backend service"
	@echo "  compose-exec-nginx     Shell into the nginx service"
	@echo ""

# ──────────────────────────────────────────────────────
# 1) LOCAL DEV (hors Docker)
# ──────────────────────────────────────────────────────

install-back:
	cd $(BACK_DIR) && npm install

install-front:
	cd $(FRONT_DIR) && npm install

build-front-ts:
	cd $(FRONT_DIR) && npm run build:ts

watch-front-ts:
	cd $(FRONT_DIR) && npm run watch:ts

watch-front-css:
	cd $(FRONT_DIR) && npm run watch:css

dev-back:
	cd $(BACK_DIR) && npm run dev

dev-front: install-front
	$(MAKE) watch-front-css &
	$(MAKE) watch-front-ts

dev: install-back install-front
	@echo "🚀 Starting backend and frontend in dev mode…"
	$(MAKE) dev-back &
	$(MAKE) dev-front

# ──────────────────────────────────────────────────────
# 2) SINGLE-CONTAINER DOCKER WORKFLOW
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
# 3) MULTI-CONTAINER DOCKER-COMPOSE WORKFLOW
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
