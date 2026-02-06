---
description: Запуск TeamUp приложения (PostgreSQL + Node.js сервер)
---

# Запуск TeamUp

## Предварительные требования
- Docker Desktop должен быть запущен

## Шаги

// turbo-all

1. Запустить PostgreSQL в Docker:
```bash
docker compose up -d db
```

2. Подождать 5 секунд пока база запустится

3. Инициализировать схему БД:
```bash
DATABASE_URL="postgresql://teamup:teamup123@localhost:5432/teamup_db" npm run db:push
```

4. Запустить сервер:
```bash
DATABASE_URL="postgresql://teamup:teamup123@localhost:5432/teamup_db" npm run server:dev
```

## Результат
Сервер будет доступен на http://localhost:5001

## Остановка
```bash
docker compose down
```
