# CV Shelves - ML Додаток для Детекції Об'єктів

Сучасний веб-додаток для детекції об'єктів на зображеннях з використанням моделей RFDETR та YOLO.

## 🚀 Швидкий Старт

### Локальний запуск
```bash
# Клонуйте репозиторій
git clone <repository-url>
cd cv_shelves_backend

# Налаштуйте змінні середовища
cp example.env .env
nano .env  # Відредагуйте налаштування

# Запустіть проект
make up
```

### Доступ до сервісів
- **Frontend (Development)**: http://localhost:3001
- **Frontend (Production)**: http://localhost:3002
- **Backend API**: http://localhost:8000
- **API Документація**: http://localhost:8000/docs

## 🛠️ Команди Управління

```bash
make up              # Запуск всіх сервісів
make up-dev          # Запуск в режимі розробки
make up-prod         # Запуск в production режимі
make down            # Зупинка сервісів
make restart         # Перезапуск
make rebuild         # Повна пересборка з кешем
make rebuild-no-cache # Повна пересборка без кешу
make ps              # Статус контейнерів
make logs            # Перегляд логів
make logs-app        # Логи backend
make logs-frontend   # Логи frontend
make clean           # Очищення системи
make clean-volumes   # Очищення volumes
make stats           # Використання ресурсів
make images          # Розмір Docker образів
make help            # Список всіх команд
```

## 📋 Технології

- **Backend**: FastAPI, Python 3.13
- **Frontend**: React, TypeScript, Ant Design
- **База даних**: PostgreSQL
- **ML Моделі**: RFDETR, YOLO
- **Контейнеризація**: Docker, Docker Compose
- **Управління моделями**: Hugging Face Hub

## 🔧 Налаштування

### Обов'язкові змінні середовища
```env
HF_TOKEN=hf_your_token_here          # Токен Hugging Face
POSTGRES_PASSWORD=your_password       # Пароль БД
```

### Структура проекту
```
cv_shelves_backend/
├── app/              # Backend додаток
├── front/             # Frontend додаток
├── scripts/           # Скрипти управління
├── DB/                # Модулі бази даних
├── Dockerfile         # Docker образ
├── docker-compose.yml # Конфігурація сервісів
└── Makefile          # Команди управління
```

## 🚀 Розгортання на Сервері

### Через Git
```bash
git clone <repository-url>
cd cv_shelves_backend
cp example.env .env
# Відредагуйте .env файл
make up
```

### Через SCP
```bash
# На локальній машині
tar -czf cv_shelves_backend.tar.gz cv_shelves_backend/
scp cv_shelves_backend.tar.gz user@server:/home/user/

# На сервері
tar -xzf cv_shelves_backend.tar.gz
cd cv_shelves_backend
cp example.env .env

# ВАЖЛИВО: Відредагуйте .env файл для сервера
nano .env
# Змініть:
# REACT_APP_API_URL=http://YOUR_SERVER_IP:8000
# CORS_ORIGINS=http://YOUR_SERVER_IP:3001,http://YOUR_SERVER_IP:8000
# POSTGRES_PASSWORD=strong_password_here

make up
```

## 📊 Можливості

- **Детекція об'єктів** з RFDETR та YOLO моделями
- **Історія передбачень** з фільтрацією та пошуком
- **Статистика використання** моделей
- **REST API** для інтеграції
- **Автоматичне завантаження** ML моделей
- **Docker контейнеризація** для легкого розгортання
- **Оптимізована збірка** з BuildKit та кешуванням
- **Многоэтапная сборка** для зменшення розміру образів

## 🔍 API Endpoints

- `GET /v1/api/ml/detect` - Детекція об'єктів
- `GET /v1/api/history/predictions` - Історія передбачень
- `GET /v1/api/history/statistics` - Статистика
- `GET /docs` - Swagger документація

## ⚡ Оптимізація Docker

### Швидкість збірки
- **BuildKit** увімкнений для прискореної збірки
- **Кешування шарів** для швидших пересборок
- **`.dockerignore`** файли для виключення зайвих файлів

### Розмір образів
- **Многоэтапная сборка** для frontend (nginx + статичні файли)
- **Точне копіювання** тільки необхідних файлів
- **Оптимізовані базові образи** (alpine, slim)

### Команди для оптимізації
```bash
make rebuild-no-cache  # Повна пересборка без кешу
make clean-volumes     # Очищення volumes
make stats             # Моніторинг ресурсів
make images            # Перегляд розміру образів
```

## 📞 Підтримка

Для питань та підтримки створюйте issues в репозиторії або звертайтеся до команди розробки.
