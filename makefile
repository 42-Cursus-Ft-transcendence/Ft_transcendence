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
.PHONY: all help install-back install-front dev-back dev-front dev docker-build docker-run docker-stop docker-clean logs exec

all: help

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Local development (no Docker):"
	@echo "  install-back    Install backend deps"
	@echo "  install-front   Install frontend deps"
	@echo "  dev-back        Run backend in dev mode (ts-node-dev)"
	@echo "  dev-front       Run Tailwind watch (CSS rebuild)"
	@echo "  dev             install-back, install-front, then dev-back & dev-front"
	@echo ""
	@echo "Docker targets:"
	@echo "  docker-build    Build Docker image ($(IMAGE_NAME))"
	@echo "  docker-run      Run Docker container ($(CONTAINER_NAME)) on port $(PORT)"
	@echo "  docker-stop     Stop Docker container"
	@echo "  docker-clean    Remove container and image"
	@echo "  logs            Follow container logs"
	@echo "  exec            Open a shell inside the running container"
	@echo ""

# ──────────────────────────────────────────────────────
# 1) LOCAL DEV (hors Docker)
# ──────────────────────────────────────────────────────

# ne pas oublier d installer :
#dotenv

install-back:
	cd $(BACK_DIR) && npm install

install-front:
	cd $(FRONT_DIR) && npm install

dev-back:
	cd $(BACK_DIR) && npm run dev

dev-front:
	cd $(FRONT_DIR) && npm run watch:css

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
