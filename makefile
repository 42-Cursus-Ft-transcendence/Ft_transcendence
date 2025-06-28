# ──────────────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────────────
BACK_DIR       := src/back
FRONT_DIR      := src/front
DOCKERFILE     := src/docker/Dockerfile
IMAGE_NAME     := fastify-app
CONTAINER_NAME := fastify-app-dev
PORT           := 3000

# ──────────────────────────────────────────────────────
# Cibles par défaut et aide
# ──────────────────────────────────────────────────────
.PHONY: all help install-back install-front build-front-ts watch-front-ts watch-front-css dev-back dev-front dev docker-build docker-run docker-stop docker-clean logs exec

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
	@echo "Docker targets:"
	@echo "  docker-build       Build Docker image ($(IMAGE_NAME))"
	@echo "  docker-run         Run Docker container ($(CONTAINER_NAME))"
	@echo "  docker-stop        Stop Docker container"
	@echo "  docker-clean       Remove container and image"
	@echo "  logs               Follow container logs"
	@echo "  exec               Shell into the running container"
	@echo ""

# ──────────────────────────────────────────────────────
# 1) LOCAL DEV (hors Docker)
# ──────────────────────────────────────────────────────

all:docker-run

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
# 2) DOCKER WORKFLOW
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
