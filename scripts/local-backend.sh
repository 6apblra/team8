#!/bin/bash

# 🐍 Запуск Backend локально (без Docker) с Python
# Требуется: PostgreSQL установлен локально
# Использование: ./scripts/local-backend.sh

set -e

echo "🐍 TeamUp Backend (Local Python Development)"
echo "=============================================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd backend

# Проверить Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 не установлен${NC}"
    exit 1
fi

# Проверить PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql не найден. Пожалуйста установите PostgreSQL${NC}"
    echo "  brew install postgresql (macOS)"
    echo "  sudo apt-get install postgresql (Ubuntu)"
    exit 1
fi

# Создать или активировать виртуальное окружение
if [ ! -d "venv" ]; then
    echo -e "${BLUE}📦 Создание virtual environment...${NC}"
    python3 -m venv venv
fi

echo -e "${BLUE}🔄 Активация virtual environment...${NC}"
source venv/bin/activate

# Установить зависимости
echo -e "${BLUE}📥 Установка Python зависимостей...${NC}"
pip install -r requirements.txt > /dev/null 2>&1 || pip install -r requirements.txt

# Проверить БД подключение
echo -e "${BLUE}🔍 Проверка подключения к БД...${NC}"
export DATABASE_URL="postgresql://teamup:teamup123@localhost:5432/teamup_db"

# Создать БД если её нет
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = 'teamup_db'" | grep -q 1 || \
    psql -U postgres -h localhost -c "CREATE DATABASE teamup_db OWNER teamup" 2>/dev/null || true

# Применить миграции
echo -e "${BLUE}🗄️  Применение миграций...${NC}"
alembic upgrade head

# Засеять тестовые данные
echo -e "${BLUE}🌱 Засев тестовых данных...${NC}"
python seed.py

echo -e "${GREEN}✅ Backend готов к запуску!${NC}"
echo ""
echo -e "${BLUE}🚀 Запуск FastAPI с hot reload...${NC}"
echo ""

# Запустить сервер с hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
