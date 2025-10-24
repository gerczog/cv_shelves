#!/usr/bin/env python3
"""
Скрипт для загрузки моделей ML с Hugging Face Hub.
Используется для первоначальной настройки проекта.
"""

import os
import sys
from pathlib import Path
from huggingface_hub import snapshot_download
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def download_models():
    """Загружает модели ML с Hugging Face Hub."""
    
    # Проверяем токен
    token = os.getenv("HF_TOKEN")
    if not token:
        print("❌ Ошибка: HF_TOKEN не найден в переменных окружения")
        print("Добавьте HF_TOKEN в файл .env")
        sys.exit(1)
    
    # Создаем директории
    models_dir = Path("app/data/ml_models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print("🔄 Загружаем модели с Hugging Face Hub...")
    
    try:
        # Загружаем модели
        snapshot_download(
            repo_id="gerczog/cv_shelves_detect",
            repo_type="model",
            local_dir=str(models_dir),
            token=token
        )
        
        print("✅ Модели успешно загружены!")
        print(f"📁 Расположение: {models_dir.absolute()}")
        
    except Exception as e:
        print(f"❌ Ошибка при загрузке моделей: {e}")
        sys.exit(1)

if __name__ == "__main__":
    download_models()
