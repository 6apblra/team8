#!/bin/bash

# ✅ Pre-commit проверки - убедиться что код готов к коммиту
# Использование: ./scripts/pre-commit-check.sh

echo "✅ Pre-Commit Checks"
echo "==================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FAILED=0

# 1. Type checking
echo -e "${BLUE}1️⃣  Проверка типов TypeScript...${NC}"
if npm run check:types > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Типы в порядке${NC}"
else
    echo -e "${RED}   ✗ Ошибки типов!${NC}"
    npm run check:types
    FAILED=1
fi

# 2. Linting
echo -e "${BLUE}2️⃣  Проверка кода (ESLint)...${NC}"
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Код соответствует стилю${NC}"
else
    echo -e "${YELLOW}   ⚠️  Найдены проблемы с стилем${NC}"
    echo "   Попытка автоматически исправить..."
    npm run lint:fix
    echo -e "${GREEN}   ✓ Исправлено${NC}"
fi

# 3. Format checking
echo -e "${BLUE}3️⃣  Проверка форматирования...${NC}"
if npm run check:format > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Форматирование в порядке${NC}"
else
    echo -e "${YELLOW}   ⚠️  Нужно форматирование${NC}"
    echo "   Автоматическое форматирование..."
    npm run format
    echo -e "${GREEN}   ✓ Отформатировано${NC}"
fi

# 4. Git status
echo -e "${BLUE}4️⃣  Проверка git статуса...${NC}"
if git status --porcelain | grep -q '??'; then
    echo -e "${YELLOW}   ⚠️  Неотслеживаемые файлы:${NC}"
    git status --short | grep '^??'
fi

if git diff --cached --name-only | grep -E '\.env$|\.secrets$|credentials' > /dev/null; then
    echo -e "${RED}   ✗ Обнаружены секреты в коммите!${NC}"
    FAILED=1
else
    echo -e "${GREEN}   ✓ Секреты не найдены${NC}"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Все проверки пройдены! Готово к коммиту${NC}"
    exit 0
else
    echo -e "${RED}❌ Исправьте ошибки перед коммитом${NC}"
    exit 1
fi
