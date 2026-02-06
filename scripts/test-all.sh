#!/bin/bash

# 🧪 Полное тестирование (типы, линтинг, форматирование)
# Использование: ./scripts/test-all.sh

echo "🧪 Full Test Suite"
echo "=================="

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FAILED=0
TOTAL=0

run_test() {
    local name=$1
    local cmd=$2

    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}$TOTAL. $name...${NC}"

    if eval "$cmd" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}   ✓ Пройдено${NC}"
    else
        echo -e "${RED}   ✗ Ошибка!${NC}"
        cat /tmp/test_output.log | sed 's/^/     /'
        FAILED=$((FAILED + 1))
    fi
}

# Тесты
run_test "TypeScript type checking" "npm run check:types"
run_test "ESLint code quality" "npm run lint"
run_test "Code formatting" "npm run check:format"

# Backend тесты (если будут добавлены)
if [ -f "backend/pytest.ini" ] || [ -f "backend/tests" ]; then
    run_test "Backend unit tests" "cd backend && python -m pytest -q"
fi

# Результаты
echo ""
echo "════════════════════════════"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Все тесты пройдены ($TOTAL/$TOTAL)${NC}"
    exit 0
else
    echo -e "${RED}❌ Не пройдены тесты: $FAILED из $TOTAL${NC}"
    exit 1
fi
