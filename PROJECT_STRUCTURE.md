# Структура проекта TeamUp MVP

```
Senior-Engineer/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI приложение
│   │   ├── database.py               # SQLAlchemy настройка
│   │   ├── models.py                 # Модели БД (User, Profile, Match, etc.)
│   │   ├── schemas.py                # Pydantic схемы
│   │   ├── auth.py                  # JWT аутентификация
│   │   ├── websocket.py              # WebSocket обработчик
│   │   └── routers/                 # API роутеры
│   │       ├── __init__.py
│   │       ├── auth.py               # POST /auth/register, /auth/login, GET /auth/me
│   │       ├── profile.py            # PUT /me/profile, PATCH /me/profile
│   │       ├── feed.py               # GET /feed
│   │       ├── swipe.py              # POST /swipe
│   │       ├── matches.py            # GET /matches
│   │       ├── messages.py           # GET/POST /matches/{id}/messages
│   │       └── moderation.py         # POST /moderation/block, /moderation/report
│   ├── alembic/                      # Миграции базы данных
│   │   ├── versions/                 # Файлы миграций
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── alembic.ini                   # Конфигурация Alembic
│   ├── requirements.txt              # Python зависимости
│   ├── Dockerfile                    # Docker образ для backend
│   ├── seed.py                       # Скрипт для заполнения тестовыми данными
│   ├── .env.example                  # Пример .env файла
│   ├── .gitignore
│   └── run.sh                        # Скрипт для локального запуска
│
├── client/                           # React Native Mobile App
│   ├── components/                   # UI компоненты
│   │   ├── ActionButton.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorFallback.tsx
│   │   ├── GameBadge.tsx
│   │   ├── HeaderTitle.tsx
│   │   ├── KeyboardAwareScrollViewCompat.tsx
│   │   ├── MatchCard.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── QuickMessageChip.tsx
│   │   ├── SelectableChip.tsx
│   │   ├── Spacer.tsx
│   │   ├── SwipeCard.tsx
│   │   ├── ThemedText.tsx
│   │   └── ThemedView.tsx
│   ├── screens/                      # Экраны приложения
│   │   ├── LoginScreen.tsx           # Авторизация
│   │   ├── OnboardingScreen.tsx     # Онбординг/создание профиля
│   │   ├── DiscoverScreen.tsx       # Лента свайпов
│   │   ├── MatchesScreen.tsx        # Список матчей
│   │   ├── ChatScreen.tsx           # Чат
│   │   ├── ProfileScreen.tsx        # Профиль пользователя
│   │   ├── EditProfileScreen.tsx    # Редактирование профиля
│   │   └── FiltersScreen.tsx        # Фильтры для ленты
│   ├── navigation/                   # Навигация
│   │   ├── RootStackNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── HomeStackNavigator.tsx
│   │   ├── MatchesStackNavigator.tsx
│   │   └── ProfileStackNavigator.tsx
│   ├── lib/                          # Утилиты и логика
│   │   ├── api-client.ts             # API клиент для FastAPI
│   │   ├── auth-context.tsx         # Контекст аутентификации
│   │   ├── query-client.ts          # React Query настройка
│   │   ├── websocket.ts             # WebSocket менеджер
│   │   └── game-data.ts             # Данные об играх
│   ├── hooks/                        # React хуки
│   │   ├── useColorScheme.ts
│   │   ├── useScreenOptions.ts
│   │   └── useTheme.ts
│   ├── constants/
│   │   └── theme.ts                  # Тема приложения
│   └── App.tsx                       # Главный компонент
│
├── docker-compose.yml                # Docker Compose конфигурация
├── README.md                         # Основная документация
└── PROJECT_STRUCTURE.md              # Этот файл
```

## Основные компоненты

### Backend (FastAPI)

**Модели базы данных:**
- `User` - пользователи (email, password_hash)
- `Profile` - профили игроков (nickname, bio, region, language, platforms, playstyle, mic)
- `Game` - игры (Valorant, CS2, Dota2, LoL, Fortnite)
- `UserGame` - игры пользователя (rank, roles)
- `AvailabilityWindow` - доступность по дням недели
- `Swipe` - свайпы (like/pass/superlike)
- `Match` - матчи (взаимные лайки)
- `Message` - сообщения в чате
- `Block` - блокировки
- `Report` - жалобы

**API Endpoints:**
- `/auth/register` - регистрация
- `/auth/login` - вход
- `/auth/me` - текущий профиль
- `/me/profile` - создание/обновление профиля
- `/feed` - лента кандидатов
- `/swipe` - свайпнуть пользователя
- `/matches` - список матчей
- `/matches/{id}/messages` - сообщения
- `/ws?token=...` - WebSocket для realtime чата
- `/moderation/block` - заблокировать
- `/moderation/report` - пожаловаться

### Mobile App (React Native)

**Экраны:**
1. **LoginScreen** - вход/регистрация
2. **OnboardingScreen** - создание профиля (nickname, games, availability)
3. **DiscoverScreen** - лента карточек со свайп-механикой
4. **MatchesScreen** - список матчей
5. **ChatScreen** - чат с realtime сообщениями через WebSocket
6. **ProfileScreen** - просмотр/редактирование профиля
7. **FiltersScreen** - фильтры для ленты

**Ключевые компоненты:**
- `SwipeCard` - карточка для свайпа
- `MatchCard` - карточка матча
- `MessageBubble` - сообщение в чате
- `GameBadge` - бейдж игры

## База данных

PostgreSQL с следующими основными таблицами:
- Индексы на `swipes(from_user_id, to_user_id)` - уникальный
- Индексы на `matches(user1_id, user2_id)` - уникальный
- Индексы на `user_games(game_id)`, `profiles(region, language)`

## Запуск

### Docker Compose (рекомендуется)
```bash
docker-compose up -d
```

### Локально
1. Backend: `cd backend && ./run.sh`
2. Mobile: `npm run expo:dev`

Подробные инструкции в `README.md`.

