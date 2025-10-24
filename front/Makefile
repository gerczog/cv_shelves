# === Makefile ===

NETWORK_NAME=cv_shelves_network

up:
	@echo "🔍 Checking if network '$(NETWORK_NAME)' exists..."
	@if ! docker network inspect $(NETWORK_NAME) >/dev/null 2>&1; then \
		echo "🌐 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists."; \
	fi
	@echo "🚀 Starting Docker Compose..."
	docker compose up -d

down:
	@echo "🛑 Stopping containers..."
	docker compose down

ps:
	@docker compose ps

logs:
	@docker compose logs -f
