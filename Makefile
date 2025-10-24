# === Makefile ===

NETWORK_NAME=cv_shelves_network

# === Main Commands ===

up:
	@echo "🔍 Checking if network '$(NETWORK_NAME)' exists..."
	@if ! docker network inspect $(NETWORK_NAME) >/dev/null 2>&1; then \
		echo "🌐 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists."; \
	fi
	@echo "🚀 Starting Docker Compose..."
	docker compose up -d --build   # 🧱 rebuild project on startup
	@echo "⏳ Waiting for containers to be ready..."
	sleep 15
	@echo "🤖 Checking and downloading ML models..."
	docker compose exec app /app/scripts/download_models_docker.sh
	@echo "✅ Setup completed!"

down:
	@echo "🛑 Stopping and removing containers..."
	docker compose down

restart:
	@echo "🔁 Restarting containers..."
	docker compose down
	docker compose up -d --build

rebuild:
	@echo "🧱 Full rebuild (remove old containers and volumes)..."
	docker compose down -v
	docker compose up -d --build

ps:
	@docker compose ps

logs:
	@docker compose logs -f

clean:
	@echo "🧹 Removing all unused containers, images, and networks..."
	docker system prune -af

# === Model Management ===

download-models:
	@echo "📥 Downloading ML models..."
	docker compose exec app uv run python /app/scripts/download_models.py

check-models:
	@echo "🔍 Checking ML models status..."
	docker compose exec app ls -la /app/app/data/ml_models/rfdetr/
	docker compose exec app ls -la /app/app/data/ml_models/yolo/

models:
	@echo "🤖 Managing ML models..."
	docker compose exec app /app/scripts/download_models_docker.sh
