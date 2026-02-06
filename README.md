## ⚙️ Переменные окружения и деплой

- **DATABASE_URL**: строка подключения к PostgreSQL (используется бэкендом).
- **SESSION_SECRET**: секрет для сессионных куки (меняйте в продакшене).
- **EXPO_PUBLIC_DOMAIN** / **EXPO_PUBLIC_DOMAINS**: домен(ы), где развёрнут клиент — используется сервером для CORS и формирования manifest.
- **EXPO_PUBLIC_API_URL**: базовый URL API, который можно установить на клиенте вместо правки `client/lib/api-client.ts`.

Рекомендации:
- Для локальной разработки используйте `localhost` и соответствующие IP-адреса для симуляторов/устройств (см. раздел Mobile App).
- При развертывании установите `EXPO_PUBLIC_DOMAIN` и `EXPO_PUBLIC_API_URL` в окружении сервера/CI, чтобы избежать проблем с CORS и manifest.

# TeamUp - Gaming Teammate Finder MVP

Приложение для поиска тиммейтов в играх со свайп-механикой (Tinder-style).

## 🚀 Структура проекта

```
Senior-Engineer/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI app
│   │   ├── database.py     # SQLAlchemy setup
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # JWT authentication
│   │   ├── websocket.py    # WebSocket handler
│   │   └── routers/        # API routes
│   │       ├── auth.py
│   │       ├── profile.py
│   │       ├── feed.py
│   │       ├── swipe.py
│   │       ├── matches.py
│   │       ├── messages.py
│   │       └── moderation.py
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed.py            # Seed data script
├── client/                 # React Native mobile app
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   └── lib/
├── docker-compose.yml      # Docker setup
└── README.md
```

## 📋 Технологии

### Backend
- **FastAPI** 0.115.0
- **SQLAlchemy** 2.0.36
- **Alembic** 1.13.3
- **PostgreSQL** 16
- **JWT** authentication
- **WebSocket** для realtime чата

### Mobile
- **React Native** (Expo)
- **TypeScript**
- **React Navigation**
- **TanStack Query** (React Query)
- **Zustand** (state management)

## ⚡ Оптимизированный старт (30 сек)

**Новое!** Проект оптимизирован для максимальной скорости разработки.

```bash
# Один раз:
npm run init

# Каждый день (все сервисы запускаются одной командой):
npm run dev
```

💡 **Полный список команд:**
```bash
npm run dev              # ✅ Рекомендуется - все сразу
npm run dev:backend     # Только backend (Docker)
npm run dev:local       # Backend локально (без Docker)
npm run dev:frontend    # Только frontend (Expo)
npm run test            # Все тесты (типы + lint + format)
npm run test:check      # Проверка перед коммитом
```

📚 **Документация по оптимизациям:**
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Полный гайд разработки
- [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md) - Детали оптимизаций

---

## 🛠 Установка и запуск

### Требования
- Docker & Docker Compose
- Python 3.12+ (для локальной разработки)
- Node.js 18+ (для мобильного приложения)

### Быстрый старт (Рекомендуется)

```bash
# 1. Инициализация (один раз)
npm run init

# 2. Запуск всех сервисов
npm run dev
```

Это запустит:
- PostgreSQL на порту 5432
- FastAPI backend на порту 8000
- Expo dev server для мобильного приложения
- Автоматически создаст таблицы и заполнит seed данными

API будет доступен на `http://localhost:8000` с документацией на `http://localhost:8000/docs`

### Локальная разработка (без Docker)

#### Backend

1. **Создайте виртуальное окружение:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
```

2. **Установите зависимости:**
```bash
pip install -r requirements.txt
```

3. **Настройте базу данных:**
```bash
# Создайте .env файл
cp .env.example .env

# Или установите переменные окружения:
export DATABASE_URL="postgresql://teamup:teamup123@localhost:5432/teamup_db"
export SECRET_KEY="your-secret-key-change-in-production"
```

4. **Создайте базу данных:**
```bash
# Убедитесь, что PostgreSQL запущен
createdb teamup_db

# Или через psql:
psql -U postgres
CREATE DATABASE teamup_db;
CREATE USER teamup WITH PASSWORD 'teamup123';
GRANT ALL PRIVILEGES ON DATABASE teamup_db TO teamup;
```

5. **Запустите миграции:**
```bash
alembic upgrade head
```

6. **Заполните seed данными:**
```bash
python seed.py
```

7. **Запустите сервер:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен на `http://localhost:8000`

#### Mobile App

1. **Установите зависимости:**
```bash
cd client  # или корневая директория проекта
npm install
```

2. **Настройте API URL:**
Отредактируйте `client/lib/query-client.ts` и установите правильный базовый URL:
```typescript
const API_BASE_URL = 'http://localhost:8000';  // Для эмулятора
// или
const API_BASE_URL = 'http://10.0.2.2:8000';  // Для Android эмулятора
// или
const API_BASE_URL = 'http://YOUR_IP:8000';    // Для физического устройства
```

3. **Запустите приложение:**
```bash
npm run expo:dev
# или
npx expo start
```

## 📱 API Endpoints

### Authentication
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `GET /auth/me` - Получить текущий профиль

### Profile
- `PUT /me/profile` - Создать/обновить профиль
- `PATCH /me/profile` - Частичное обновление профиля

### Feed
- `GET /feed?game=Valorant&region=EU&language=en&limit=10&cursor=...` - Получить ленту кандидатов

### Swipe
- `POST /swipe` - Свайпнуть пользователя
  ```json
  {
    "to_user_id": "uuid",
    "type": "like" | "pass" | "superlike"
  }
  ```

### Matches
- `GET /matches` - Список матчей

### Messages
- `GET /matches/{match_id}/messages?cursor=...&limit=50` - История сообщений
- `POST /matches/{match_id}/messages` - Отправить сообщение (REST fallback)

### WebSocket
- `WS /ws?token=JWT_TOKEN` - WebSocket для realtime чата
  ```json
  // Отправить сообщение:
  {
    "type": "send_message",
    "match_id": "uuid",
    "text": "Hello!"
  }
  
  // Получить сообщение:
  {
    "type": "new_message",
    "message": {
      "id": "uuid",
      "match_id": "uuid",
      "sender_id": "uuid",
      "text": "Hello!",
      "created_at": "2024-01-01T12:00:00"
    }
  }
  ```

### Moderation
- `POST /moderation/block` - Заблокировать пользователя
- `POST /moderation/report` - Пожаловаться на пользователя

## 🗄 База данных

### Основные таблицы:
- `users` - Пользователи
- `profiles` - Профили игроков
- `games` - Игры
- `user_games` - Игры пользователей (rank, roles)
- `availability_windows` - Доступность по дням недели
- `swipes` - Свайпы (like/pass/superlike)
- `matches` - Матчи (взаимные лайки)
- `messages` - Сообщения в чате
- `blocks` - Блокировки
- `reports` - Жалобы

### Seed данные

После запуска seed скрипта будут созданы 5 тестовых пользователей:
- `player1@test.com` / `password123` - ProGamer (Valorant, Immortal)
- `player2@test.com` / `password123` - CasualPlayer (Valorant, CS2)
- `player3@test.com` / `password123` - FlexGamer (Dota2, LoL)
- `player4@test.com` / `password123` - RusGamer (CS2, Global Elite)
- `player5@test.com` / `password123` - FortnitePro (Fortnite)

## 🔧 Разработка

### Создание миграций Alembic

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Тестирование API

1. **Swagger UI:** `http://localhost:8000/docs`
2. **ReDoc:** `http://localhost:8000/redoc`

### Пример запросов

```bash
# Регистрация
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Вход
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Получить профиль (нужен токен)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Получить ленту
curl "http://localhost:8000/feed?game=Valorant&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 TODO / Улучшения

- [ ] Добавить валидацию рангов для каждой игры
- [ ] Реализовать superlike функциональность
- [ ] Добавить push-уведомления
- [ ] Добавить изображения профилей (загрузка файлов)
- [ ] Улучшить алгоритм рекомендаций (по рангу, региону)
- [ ] Добавить статистику свайпов
- [ ] Реализовать премиум функции
- [ ] Добавить тесты (pytest)
- [ ] Настроить CI/CD

## 🐛 Troubleshooting

### Проблема: База данных не подключается
```bash
# Проверьте, что PostgreSQL запущен
docker ps

# Проверьте логи
docker-compose logs db
```

### Проблема: Миграции не применяются
```bash
# Удалите и пересоздайте базу
docker-compose down -v
docker-compose up -d

# Или вручную:
alembic downgrade base
alembic upgrade head
```

### Проблема: Mobile app не подключается к API
- Убедитесь, что используете правильный IP адрес
- Для Android эмулятора используйте `10.0.2.2`
- Для iOS симулятора используйте `localhost`
- Для физического устройства используйте IP вашего компьютера в локальной сети

## 📄 Лицензия

MIT

