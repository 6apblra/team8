#!/bin/bash

# 🚀 Оптимизированный скрипт полного старта (Docker + Backend + Frontend)
# Использование: ./scripts/dev-start.sh

set -e

echo "🚀 TeamUp Development Server - Full Startup"
echo "============================================"

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверить Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker не установлен${NC}"
    exit 1
fi

echo -e "${BLUE}1️⃣  Запуск Docker контейнеров...${NC}"
docker-compose up -d --wait

# Дождаться пока backend готов
echo -e "${BLUE}2️⃣  Ожидание готовности backend...${NC}"
TIMEOUT=30
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend готов${NC}"
        break
    fi
    echo -n "."
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${YELLOW}⚠️  Backend не ответил на запрос. Проверь docker logs${NC}"
    echo "Команда: docker-compose logs -f backend"
    exit 1
fi

# 3. Установить зависимости
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}3️⃣  Установка зависимостей npm...${NC}"
    npm install
fi

# 4. Запустить frontend
echo ""
echo -e "${GREEN}✅ Все сервисы готовы!${NC}"
echo ""
echo -e "${BLUE}📊 Статус сервисов:${NC}"
docker-compose ps
echo ""
echo -e "${BLUE}🌐 API документация:${NC}"
echo "   http://localhost:8000/docs"
echo ""
echo -e "${BLUE}📱 Запуск Expo (для мобильного тестирования):${NC}"
echo ""

npm run expo:dev
