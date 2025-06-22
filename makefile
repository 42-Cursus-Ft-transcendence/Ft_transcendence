# Variables
BACK_DIR       := src/back
DOCKERFILE     := src/docker/Dockerfile
IMAGE_NAME     := fastify-app
CONTAINER_NAME := fastify-app-dev
PORT           := 3000

# Définir les cibles par défaut
.PHONY: all help install-back build-back dev-back docker-build docker-run docker-stop docker-clean logs exec

all: run

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo ""
	@echo "  build    Build Docker image ($(IMAGE_NAME))"
	@echo "  run      Run Docker container ($(CONTAINER_NAME)) on port $(PORT)"
	@echo "  stop     Stop Docker container"
	@echo "  clean    Remove container and image"
	@echo "  logs            Follow container logs"
	@echo "  exec            Open a shell inside the running container"
	@echo ""



# 🐳 Construit l’image Docker
build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .

# ▶️ Lance un conteneur en arrière-plan
run: stop clean build
	docker run  --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME)

# 🛑 Arrête le conteneur
stop:
	docker stop $(CONTAINER_NAME) || true

# 🧹 Supprime le conteneur et l’image
clean: stop
	docker rm -f $(CONTAINER_NAME) || true
	docker rmi -f $(IMAGE_NAME)        || true

# 📜 Affiche les logs du conteneur
logs:
	docker logs -f $(CONTAINER_NAME)

# 🔧 Ouvre un shell dans le conteneur
exec: build
	docker exec -it $(CONTAINER_NAME) sh
