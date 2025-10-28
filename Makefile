# === Makefile ===

NETWORK_NAME=cv_shelves_network
DOCKER_COMPOSE=docker compose
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# === Main Commands ===

up:
	@echo "🔍 Checking if network '$(NETWORK_NAME)' exists..."
	@if ! docker network inspect $(NETWORK_NAME) >/dev/null 2>&1; then \
		echo "🌐 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists."; \
	fi
	@echo "🚀 Starting Docker Compose with BuildKit..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) up -d --build
	@echo "⏳ Waiting for containers to be ready..."
	sleep 15
	@echo "🤖 Checking and downloading ML models..."
	$(DOCKER_COMPOSE) exec app /app/scripts/download_models_docker.sh
	@echo "✅ Setup completed!"

up-dev:
	@echo "🔍 Checking if network '$(NETWORK_NAME)' exists..."
	@if ! docker network inspect $(NETWORK_NAME) >/dev/null 2>&1; then \
		echo "🌐 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists."; \
	fi
	@echo "🚀 Starting in development mode..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) up -d --build

up-prod:
	@echo "🔍 Checking if network '$(NETWORK_NAME)' exists..."
	@if ! docker network inspect $(NETWORK_NAME) >/dev/null 2>&1; then \
		echo "🌐 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists."; \
	fi
	@echo "🚀 Starting in production mode..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) --profile production up -d --build

down:
	@echo "🛑 Stopping and removing containers..."
	$(DOCKER_COMPOSE) down

restart:
	@echo "🔁 Restarting containers..."
	$(DOCKER_COMPOSE) down
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) up -d --build

rebuild:
	@echo "🧱 Full rebuild (remove old containers and volumes)..."
	$(DOCKER_COMPOSE) down -v
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) up -d --build

rebuild-no-cache:
	@echo "🧱 Full rebuild without cache..."
	$(DOCKER_COMPOSE) down -v
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) $(DOCKER_COMPOSE) build --no-cache
	$(DOCKER_COMPOSE) up -d

ps:
	@$(DOCKER_COMPOSE) ps

logs:
	@$(DOCKER_COMPOSE) logs -f

logs-app:
	@$(DOCKER_COMPOSE) logs -f app

logs-frontend:
	@$(DOCKER_COMPOSE) logs -f frontend

clean:
	@echo "🧹 Removing all unused containers, images, and networks..."
	docker system prune -af

clean-volumes:
	@echo "🧹 Removing volumes and containers..."
	$(DOCKER_COMPOSE) down -v
	docker volume prune -f

# === Model Management ===

download-models:
	@echo "📥 Downloading ML models..."
	$(DOCKER_COMPOSE) exec app uv run python /app/scripts/download_models.py

check-models:
	@echo "🔍 Checking ML models status..."
	$(DOCKER_COMPOSE) exec app ls -la /app/app/data/ml_models/rfdetr/
	$(DOCKER_COMPOSE) exec app ls -la /app/app/data/ml_models/yolo/

models:
	@echo "🤖 Managing ML models..."
	$(DOCKER_COMPOSE) exec app /app/scripts/download_models_docker.sh

# === Development Helpers ===

shell:
	@echo "🐚 Opening shell in app container..."
	$(DOCKER_COMPOSE) exec app /bin/bash

shell-frontend:
	@echo "🐚 Opening shell in frontend container..."
	$(DOCKER_COMPOSE) exec frontend /bin/sh

# === Performance Monitoring ===

stats:
	@echo "📊 Container resource usage..."
	docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

images:
	@echo "🖼️ Docker images..."
	docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# === Help ===

help:
	@echo "📋 Available commands:"
	@echo "  up              - Start all services"
	@echo "  up-dev          - Start in development mode"
	@echo "  up-prod         - Start in production mode"
	@echo "  down            - Stop all services"
	@echo "  restart         - Restart all services"
	@echo "  rebuild         - Full rebuild with cache"
	@echo "  rebuild-no-cache- Full rebuild without cache"
	@echo "  ps              - Show running containers"
	@echo "  logs            - Show all logs"
	@echo "  logs-app        - Show app logs"
	@echo "  logs-frontend   - Show frontend logs"
	@echo "  clean           - Remove unused Docker resources"
	@echo "  clean-volumes   - Remove volumes and containers"
	@echo "  download-models - Download ML models"
	@echo "  check-models    - Check ML models status"
	@echo "  models          - Manage ML models"
	@echo "  shell           - Open shell in app container"
	@echo "  shell-frontend  - Open shell in frontend container"
	@echo "  stats           - Show container resource usage"
	@echo "  images          - Show Docker images"
	@echo "  help            - Show this help"
