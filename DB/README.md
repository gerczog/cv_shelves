# Модуль Бази Даних

Цей модуль містить всі необхідні компоненти для роботи з базою даних додатку CV Shelves.

## Структура

- `schema.py` - Визначення моделей SQLAlchemy (User, Prediction, ModelInfo)
- `database.py` - Налаштування підключення до БД та створення сесій
- `crud.py` - CRUD операції для роботи з даними
- `create_user.py` - Скрипт для створення користувачів
- `init_db.py` - Скрипт ініціалізації БД з тестовими даними
- `init-db.sql` - SQL скрипт для початкової настройки PostgreSQL

## Моделі даних

### User (Користувач)
- `id` - Унікальний ідентифікатор користувача
- `username` - Ім'я користувача (унікальне)
- `email` - Email адреса (опціонально)
- `password_hash` - Хеш пароля
- `is_superuser` - Права суперкористувача
- `created_at` - Дата створення
- `is_active` - Статус активності

### Prediction (Передбачення)
- `id` - Унікальний ідентифікатор передбачення
- `user_id` - ID користувача (зовнішній ключ)
- `model` - Тип моделі ('rfdetr', 'yolo', 'both')
- `image_url` - URL зображення
- `image_base64` - Зображення в форматі base64
- `results` - Результати детекції (JSON)
- `confidence` - Впевненість для одиночної моделі
- `rfdetr_confidence` - Впевненість RFDETR моделі
- `yolo_confidence` - Впевненість YOLO моделі
- `comment` - Коментар користувача
- `created_at` - Дата створення

### ModelInfo (Інформація про модель)
- `id` - Унікальний ідентифікатор
- `model_name` - Назва моделі
- `model_path` - Шлях до файлу моделі
- `model_type` - Тип моделі ('rfdetr', 'yolo')
- `version` - Версія моделі
- `description` - Опис моделі
- `is_active` - Статус активності

## Використання

### Ініціалізація БД
```bash
# Створити таблиці та заповнити тестовими даними
uv run python -m DB.init_db

# Створити користувача
uv run python -m DB.create_user username email@example.com

# Список користувачів
uv run python -m DB.create_user --list
```

### Міграції Alembic
```bash
# Створити нову міграцію
uv run alembic revision --autogenerate -m "Опис змін"

# Застосувати міграції
uv run alembic upgrade head

# Відкотити міграцію
uv run alembic downgrade -1
```

### Docker міграції
```bash
# Автоматичні міграції при запуску контейнера
docker compose up migrations

# Ручний запуск міграцій
docker compose exec app alembic upgrade head
```

## API Endpoints

### Історія передбачень
- `GET /v1/api/history/predictions` - Отримати список передбачень з фільтрацією
- `GET /v1/api/history/predictions/{id}` - Отримати передбачення за ID
- `PUT /v1/api/history/predictions/{id}/comment` - Оновити коментар
- `DELETE /v1/api/history/predictions/{id}` - Видалити передбачення
- `GET /v1/api/history/statistics` - Отримати статистику
- `GET /v1/api/history/users` - Отримати список користувачів
- `POST /v1/api/history/users` - Створити користувача

### Параметри фільтрації
- `skip` - Кількість записів для пропуску
- `limit` - Максимальна кількість записів
- `user_id` - Фільтр за ID користувача
- `model` - Фільтр за типом моделі
- `search_text` - Пошук за коментарями та іменами користувачів
- `min_confidence` - Мінімальна впевненість
- `max_confidence` - Максимальна впевненість

## Конфігурація

База даних налаштовується через змінну середовища `DATABASE_URL`:
- SQLite (за замовчуванням): `sqlite:///./cv_shelves.db`
- PostgreSQL: `postgresql://user:password@localhost/dbname`

### Змінні середовища для PostgreSQL
```env
DATABASE_URL=postgresql://cv_shelves_user:cv_shelves_password@postgres:5432/cv_shelves
POSTGRES_DB=cv_shelves
POSTGRES_USER=cv_shelves_user
POSTGRES_PASSWORD=cv_shelves_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
```

## Залежності

- SQLAlchemy >= 2.0.0
- Alembic >= 1.13.0
- psycopg2-binary >= 2.9.0 (для PostgreSQL)
- asyncpg >= 0.29.0 (для асинхронних операцій PostgreSQL)
- bcrypt >= 4.0.0 (для хешування паролів)

## Docker інтеграція

### Автоматичні міграції
При запуску через Docker Compose міграції виконуються автоматично:
1. PostgreSQL контейнер запускається
2. Контейнер migrations чекає готовності PostgreSQL
3. Виконуються всі міграції Alembic
4. Запускається основний додаток

### Ручне керування міграціями
```bash
# Перевірити статус міграцій
docker compose exec app alembic current

# Застосувати міграції
docker compose exec app alembic upgrade head

# Створити нову міграцію
docker compose exec app alembic revision --autogenerate -m "Опис змін"
```
