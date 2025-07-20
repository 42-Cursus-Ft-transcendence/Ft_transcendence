###############################################################################
# 0. GLOBAL VARIABLES                                                         #
###############################################################################
# ── Architecture / compose overrides ─────────────────────────────────────────
ARCH               ?= $(shell uname -m)
ENV_FILE           ?= .env
COMPOSE_BASE        = docker-compose.yml
COMPOSE_ARM         = docker-compose.aarch64.yml
COMPOSE_FILES       = -f $(COMPOSE_BASE) $(if $(filter aarch64,$(ARCH)),-f $(COMPOSE_ARM),)
EXTRA_FLAGS         = $(if $(filter aarch64,$(ARCH)),--remove-orphans,)
BACK_ENV            = src/back/.env.backend
CONTAINERS_TO_CLEAN = anvil transcendence
VOLUMES		   := grafana-data

.DEFAULT_GOAL 	   := up
###############################################################################
# 1. HELP                                                                     #
###############################################################################
.PHONY: help
help:
	@echo "────────────────────────  Make targets  ────────────────────────"
	@echo "Single‑container dev:"
	@echo "  docker-build            Build docker image"
	@echo "  docker-run              Run docker container"
	@echo "  docker-stop             Stop the dev container"
	@echo "  docker-clean            Remove dev container + image"
	@echo "  logs                    Tail logs of dev container"
	@echo "  exec                    Shell into dev container"
	@echo
	@echo "Vanilla docker‑compose:"
	@echo "  compose-build           Build all images (compose)"
	@echo "  compose-up              Start all services in background"
	@echo "  compose-down            Stop & remove services"
	@echo "  compose-logs            Tail full‑stack logs"
	@echo "  compose-exec-backend    Shell into backend service"
	@echo "  compose-exec-nginx      Shell into nginx service"
	@echo
	@echo "Full blockchain pipeline:"
	@echo "  detect-arch             Detect host arch & persist to .env"
	@echo "  clean-zombies           Kill & remove stale Anvil/Trancendence containers"
	@echo "  anvil-up                Build + launch Anvil & wait for RPC"
	@echo "  deploy-contracts        Compile & deploy smart contracts (Foundry)"
	@echo "  stack-up                Bring up backend + nginx + exporter + Prom & Grafana"
	@echo "Maintenance:"
	@echo "  remove-volumes  	 Delete configured Docker volumes ($(VOLUMES_TO_REMOVE))"
	@echo
	@echo "Shortcuts:"
	@echo "  up                      End‑to‑end pipeline (detect → deploy → stack)"
	@echo "  down                    docker compose down --remove-orphans"
	@echo "  logs                    Tail logs of full stack"

###############################################################################
# 2. SINGLE‑CONTAINER DOCKER WORKFLOW                                         #
###############################################################################
.PHONY: docker-build docker-run docker-stop docker-clean exec

docker-build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME) .

docker-run: docker-stop docker-clean docker-build
	docker run --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME)

docker-stop:
	docker stop $(CONTAINER_NAME) 2>/dev/null || true

docker-clean: docker-stop
	docker rm   -f $(CONTAINER_NAME) 2>/dev/null || true
	docker rmi  -f $(IMAGE_NAME)     2>/dev/null || true

exec:
	docker exec -it $(CONTAINER_NAME) sh

###############################################################################
# 3. STANDARD DOCKER‑COMPOSE WORKFLOW                                         #
###############################################################################
.PHONY: compose-build compose-up compose-down compose-exec-backend \
	compose-exec-nginx

compose-build:
	docker-compose -f $(COMPOSE_FILE) build

compose-up: compose-build
	docker-compose -f $(COMPOSE_FILE) up -d

compose-down:
	docker-compose -f $(COMPOSE_FILE) down --remove-orphans

compose-logs:
	docker-compose -f $(COMPOSE_FILE) logs -f

compose-exec-backend: compose-up
	docker-compose -f $(COMPOSE_FILE) exec backend sh

compose-exec-nginx: compose-up
	docker-compose -f $(COMPOSE_FILE) exec nginx sh

###############################################################################
# 4. ADVANCED PIPELINE (Anvil → Foundry → Full stack)                         #
###############################################################################
.PHONY: detect-arch clean-zombies anvil-up deploy-contracts stack-up \
        up down remove-volumes logs re

# 4‑a. Detect architecture and persist to .env
detect-arch:
	@echo "Detected arch: $(ARCH)"
	@if grep -q '^ARCH=' $(ENV_FILE); then \
	  CURRENT=$$(grep '^ARCH=' $(ENV_FILE) | cut -d'=' -f2); \
	  if [ "$$CURRENT" != "$(ARCH)" ]; then \
	    echo "Updating ARCH in $(ENV_FILE): $$CURRENT → $(ARCH)"; \
	    sed -i "s/^ARCH=.*/ARCH=$(ARCH)/" $(ENV_FILE); \
	  else \
	    echo "ARCH unchanged in $(ENV_FILE) (still $(ARCH))"; \
	  fi \
	else \
	  echo "ARCH=$(ARCH)" >> $(ENV_FILE); \
	  echo "Added ARCH to $(ENV_FILE)"; \
	fi
# 4‑b. Remove stale containers that block ARM restarts
clean-zombies:
	@for c in $(CONTAINERS_TO_CLEAN); do \
	  if docker ps -a --format '{{.Names}}' | grep -q -w $$c; then \
	    echo "Removing stale container $$c"; \
	    docker rm -f $$c || { sudo systemctl restart docker && docker rm -f $$c; }; \
	  fi; \
	done

# 4‑c. Start Anvil and wait for RPC readiness
anvil-up: detect-arch clean-zombies
	@echo "🚀 Launching Anvil…"
	docker compose $(COMPOSE_FILES) up --build --force-recreate $(EXTRA_FLAGS) -d anvil
	@echo "🔧 Installing curl in Anvil…"
	docker compose $(COMPOSE_FILES) exec -T --user root anvil sh -c \
	  'apk add --no-cache curl || (apt-get -qq update && apt-get -qq -y install curl)'
	@echo "⌛ Waiting for RPC 8545"
	@until docker compose $(COMPOSE_FILES) exec -T anvil sh -c \
	  'curl -s --connect-timeout 1 http://localhost:8545 >/dev/null'; do sleep 1; done
	@echo "✅ Anvil ready"

# 4‑d. Compile & deploy smart contracts via Foundry
deploy-contracts: anvil-up
	@echo "🔨 Foundry compile + deploy"
	docker compose $(COMPOSE_FILES) up --build --force-recreate $(EXTRA_FLAGS) deployer

# 4‑e. Spin up full application + observability stack
stack-up: deploy-contracts
	@echo "🔄 Bringing up backend, nginx, exporters, Prometheus & Grafana"
	docker compose $(COMPOSE_FILES) up --build --force-recreate $(EXTRA_FLAGS) -d \
	  backend nginx nginx-prometheus-exporter prometheus grafana
	@echo "✅ All services running"

# Shortcuts
up: stack-up
down:
	docker compose $(COMPOSE_FILES) down -v --remove-orphans

logs:
	docker compose $(COMPOSE_FILES) logs -f

re: down up
	@echo "🔄 Full stack has been recreated."

###############################################################################
# 5. MAINTENANCE                                                              #
###############################################################################
remove-volumes:
	@for vol in $(VOLUMES); do \
	  echo "🗑️  Deleting volume '$$vol'…"; \
	  docker volume rm $$vol && echo "   ✅ $$vol deleted." || echo "   ⚠️ $$vol not found, skipping."; \
	done
