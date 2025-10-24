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
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Документація**: http://localhost:8000/docs

## 🛠️ Команди Управління

```bash
make up          # Запуск всіх сервісів
make down        # Зупинка сервісів
make restart     # Перезапуск
make ps          # Статус контейнерів
make logs        # Перегляд логів
make clean       # Очищення системи
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

## 🔍 API Endpoints

- `GET /v1/api/ml/detect` - Детекція об'єктів
- `GET /v1/api/history/predictions` - Історія передбачень
- `GET /v1/api/history/statistics` - Статистика
- `GET /docs` - Swagger документація

## 📞 Підтримка

Для питань та підтримки створюйте issues в репозиторії або звертайтеся до команди розробки.
