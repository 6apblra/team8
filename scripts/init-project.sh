#!/bin/bash

# 🎯 Инициализация проекта - одноразовая настройка
# Использование: ./scripts/init-project.sh

echo "🎯 TeamUp Project Initialization"
echo "================================"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверить Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен${NC}"
    echo "Скачайте с https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Проверить Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker не установлен (опционально)${NC}"
    echo "Скачайте с https://docker.com/"
else
    echo -e "${GREEN}✓ Docker установлен${NC}"
fi

# Создать .env если не существует
if [ ! -f ".env" ]; then
    echo -e "${BLUE}📝 Создание .env файла...${NC}"
    cat > .env << 'EOF'
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000

# Development settings
NODE_ENV=development
DEBUG=true

# Database (для локального запуска)
DATABASE_URL=postgresql://teamup:teamup123@localhost:5432/teamup_db

# JWT Secret (измени в продакшене!)
JWT_SECRET=dev-secret-key-change-in-production

# Session Secret (измени в продакшене!)
SESSION_SECRET=session-secret-change-in-production
EOF
    echo -e "${GREEN}✓ Создан .env${NC}"
else
    echo -e "${BLUE}✓ .env уже существует${NC}"
fi

# Установить зависимости
echo -e "${BLUE}📥 Установка npm зависимостей...${NC}"
npm install

echo ""
echo -e "${BLUE}🔧 Чтобы начать разработку, выполни:${NC}"
echo ""
echo -e "${GREEN}./scripts/dev-start.sh${NC}              # Полный старт с Docker (рекомендуется)"
echo -e "${GREEN}./scripts/dev-backend.sh${NC}            # Только backend с Docker"
echo -e "${GREEN}./scripts/local-backend.sh${NC}          # Backend локально (требует PostgreSQL)"
echo ""
echo -e "${BLUE}📚 Доп. инфо:${NC}"
echo "  • DEVELOPMENT_GUIDE.md - Полный гайд разработки"
echo "  • QUICKSTART.md - Быстрый старт"
echo "  • docker-compose ps - Статус контейнеров"
echo ""
