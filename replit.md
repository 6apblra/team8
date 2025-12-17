# TeamUp - Gaming Teammate Matchmaking App

## Overview

TeamUp is a mobile-first gaming teammate matchmaking application with Tinder-like swipe mechanics. The purpose is to help gamers find teammates based on games played, ranks, roles, regions, schedules, and playstyle preferences. The app supports iOS, Android, and web platforms through Expo/React Native.

Core user flow: Authentication → Onboarding (game/profile setup) → Swipe Discovery → Match → Chat

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Expo SDK 54 with React Native 0.81
- Uses React Native New Architecture (Fabric renderer enabled)
- React Compiler enabled for automatic optimization
- File-based organization under `client/` directory

**Navigation**: React Navigation v7
- Native stack navigator for root navigation (auth flow, modals)
- Bottom tab navigator for main app sections (Discover, Matches, Profile)
- Stack navigators nested within each tab

**State Management**:
- TanStack Query for server state (API data fetching, caching, mutations)
- React Context for authentication state (`AuthProvider`)
- AsyncStorage for persistent local storage (auth tokens, filters)

**Styling Approach**:
- Custom theming system in `client/constants/theme.ts`
- Dark mode by default (gaming aesthetic)
- Reanimated for gesture-based animations (swipe cards)
- Expo modules for native features (haptics, blur effects, images)

**Path Aliases**:
- `@/` maps to `client/`
- `@shared/` maps to `shared/`

### Backend Architecture

**Framework**: Express.js with TypeScript
- Single entry point at `server/index.ts`
- Session-based authentication using express-session
- PostgreSQL session store via connect-pg-simple

**API Design**:
- RESTful JSON API under `/api/` prefix
- Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
- Resource endpoints: `/api/profile`, `/api/games`, `/api/swipes`, `/api/matches`, `/api/messages`
- Session middleware protects authenticated routes

**Data Access Layer**:
- Storage interface pattern (`server/storage.ts`) abstracts database operations
- Drizzle ORM for type-safe database queries
- Schema defined in `shared/schema.ts` (shared between client/server)

### Data Storage

**Database**: PostgreSQL with Drizzle ORM
- UUID primary keys using `gen_random_uuid()`
- Relational schema with foreign key constraints

**Core Tables**:
- `users` - authentication credentials, premium status
- `profiles` - player profiles (nickname, region, languages, social links)
- `games` - supported games catalog (seeded on startup with string IDs: valorant, cs2, dota2, fortnite, lol)
- `user_games` - many-to-many linking users to games with rank/role/playstyle
- `availability_windows` - weekly schedule slots
- `swipes` - like/skip/super-invite actions
- `matches` - mutual likes
- `messages` - chat messages per match
- `reports`, `blocks` - moderation data
- `daily_swipe_counts` - rate limiting for monetization

**Migrations**: Managed via drizzle-kit (`npm run db:push`)

### Authentication Flow

**Session-Based Auth**:
- Passwords hashed with bcrypt (10 salt rounds)
- Sessions stored in PostgreSQL via connect-pg-simple
- Session ID stored in HTTP-only cookie
- Client persists session awareness via AsyncStorage

**Auth States**:
1. Not authenticated → Login screen
2. Authenticated, no profile → Onboarding flow
3. Authenticated with profile → Main app

### Key Design Decisions

**Expo over bare React Native**: Chosen for rapid cross-platform development with managed workflow. Enables easy deployment and OTA updates.

**Session auth over JWT**: Simpler implementation for MVP. Sessions stored server-side provide easy revocation and don't require token refresh logic.

**Drizzle over Prisma**: Lighter weight, SQL-first approach with better TypeScript inference. Schema sharing between client/server via `shared/` directory.

**Tab + Stack navigation pattern**: Standard mobile pattern. FAB for filters provides quick access without adding another tab.

## External Dependencies

### Database
- **PostgreSQL**: Primary database (provisioned via Replit's database feature)
- Connection via `DATABASE_URL` environment variable

### Client Libraries
- **TanStack Query**: Server state management and caching
- **React Native Reanimated**: Gesture-driven animations (swipe cards)
- **React Native Gesture Handler**: Touch gesture recognition
- **Expo Image**: Optimized image loading with caching
- **AsyncStorage**: Local key-value storage

### Server Libraries
- **express-session + connect-pg-simple**: Session management with PostgreSQL backing
- **bcrypt**: Password hashing
- **drizzle-orm + pg**: Database ORM and PostgreSQL driver
- **drizzle-zod**: Schema validation

### Build & Development
- **Expo CLI**: Development server, builds
- **drizzle-kit**: Database migrations
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Real-Time Features (WebSocket)

**Server**: WebSocket server attached at `/ws` path
- Session-based authentication for connections
- Auto-subscribes users to their match conversations
- Broadcasts: new messages, typing indicators, read receipts, new matches

**Client**: WebSocket manager (`client/lib/websocket.ts`)
- Singleton pattern with auto-reconnection (3s retry)
- Hooks: `useWebSocket()` for connection status, `useWebSocketMessages()` for subscribing
- Connects when authenticated, disconnects on logout

**Message Types**:
- `new_message`: Real-time message delivery
- `typing` / `stop_typing`: Typing indicators
- `messages_read`: Read receipt notifications
- `new_match`: Match creation notifications
- `connected`: Connection acknowledgment with user's match IDs

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS`: CORS configuration
- `SESSION_SECRET`: Express session encryption key

## Recent Changes

**December 2024:**
- Implemented Activity Status feature with "Ready to Play" toggle and real-time online indicators
  - Users can mark themselves as "Available Now" for 1 hour to signal they're looking for teammates
  - Online status shown via green dot indicators on swipe cards
  - "Available Now" badge displayed on cards for users actively seeking matches
  - Countdown timer shows remaining availability time on profile screen
  - Filter option to show only "Available Now" users in discover feed
  - Backend: lastSeenAt tracking via 30-second heartbeat, isAvailableNow with expiration
- Implemented WebSocket-based real-time chat with typing indicators and instant message delivery
- Architecture: REST API creates messages (single source of truth), WebSocket broadcasts events
- Fixed React hooks error in DiscoverScreen by moving inline `useSharedValue(0)` to component top level
- WebSocket connection lifecycle tied to authentication state (connects on login, disconnects on logout)