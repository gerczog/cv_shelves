#!/bin/bash

# CV Shelves Frontend Startup Script

echo "🚀 Запуск CV Shelves Frontend..."

# Check if .env.local exists, if not create it
if [ ! -f .env.local ]; then
    echo "📝 Создание файла .env.local..."
    echo "REACT_APP_API_URL=http://localhost:8000" > .env.local
    echo "✅ Файл .env.local создан"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

echo "🌐 Запуск фронтенда на http://localhost:3000"
echo "📡 API URL: http://localhost:8000"
echo ""
echo "Убедитесь, что бэкенд запущен на порту 8000!"
echo ""

npm start
