#!/bin/bash

# 🔧 Запуск только Backend с Docker (для быстрой итерации)
# Использование: ./scripts/dev-backend.sh

set -e

echo "🔧 TeamUp Backend Development"
echo "=============================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверить Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker не установлен${NC}"
    exit 1
fi

# Запустить только БД и backend
echo -e "${BLUE}▶️  Запуск PostgreSQL и FastAPI Backend...${NC}"
docker-compose up -d db backend

# Дождаться готовности
echo -e "${BLUE}⏳ Ожидание готовности...${NC}"
sleep 3

# Проверить статус
if docker-compose exec backend curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend готов!${NC}"
    echo ""
    echo -e "${BLUE}📊 Доступные команды:${NC}"
    echo "  • curl http://localhost:8000/health - Проверить статус"
    echo "  • http://localhost:8000/docs - Swagger UI"
    echo "  • docker-compose logs -f backend - Логи backend"
    echo "  • docker-compose down - Остановить контейнеры"
    echo ""
    echo -e "${BLUE}💡 Совет: Откройте второй терминал для фронтенда${NC}"
    echo "  npm run expo:dev"
    echo ""

    # Показывать логи в реальном времени
    docker-compose logs -f backend
else
    echo -e "${YELLOW}⚠️  Backend не отвечает. Проверь логи:${NC}"
    docker-compose logs backend
    exit 1
fi
