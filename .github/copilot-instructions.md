# Repo-specific Copilot / AI instructions

This file helps AI coding agents become productive quickly in this repository. Keep guidance short, precise, and tied to concrete files and commands.

1. Big picture
- Backend: FastAPI (Python). Entrypoint: `backend/app/main.py`. DB via SQLAlchemy + Alembic (`backend/requirements.txt`, `alembic/`). WebSocket handler lives in `backend/app/websocket.py` and is mounted at `/ws` (see `backend/app/main.py`).
- Mobile client: React Native (Expo + TypeScript) located in `client/`. Network helpers live in `client/lib/api-client.ts` and `client/lib/query-client.ts` (note: these files expect `EXPO_PUBLIC_API_URL` or hardcoded localhost variants).
- Monorepo scripts: root `package.json` contains `expo:dev`, `server:dev`, and build/test helpers. Dockerized full-stack start uses `docker-compose.yml` (recommended for first-run).

2. How to run (developer workflow)
- Fastest: `docker-compose up -d` (root) — runs Postgres + backend + seeds. Check health at `/health` (see `QUICKSTART.md`).
- Backend local: from `backend/` create venv, `pip install -r requirements.txt`, set env from `.env.example`, run `alembic upgrade head`, then `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- Mobile: `cd client && npm install` then `npm run expo:dev` or `npx expo start`. Configure API URL in `client/lib/api-client.ts` or via `EXPO_PUBLIC_API_URL`.

3. Common, repo-specific conventions and pitfalls
- API base URL mismatch: README and QUICKSTART reference port `8000`, but `client/lib/api-client.ts` and `client/lib/query-client.ts` default to `5001`. Always check and set `EXPO_PUBLIC_API_URL` or edit `client/lib/api-client.ts` to match your backend port.
- Token storage: client stores JWT in AsyncStorage under `@teamup_token` (see `client/lib/api-client.ts`). Query functions fetch token via `getToken()`.
- WebSocket URL: backend exposes `/ws` and expects a `token` query param (see `backend/app/main.py` and `backend/app/websocket.py`). Tests or tools must supply `?token=JWT`.
- Database: migrations via Alembic. Seeds are `backend/seed.py`.

4. Where to make common changes
- Add API endpoints: `backend/app/routers/*.py`. Follow existing patterns — routers use Pydantic schemas in `backend/app/schemas.py` and models in `backend/app/models.py`.
- Add DB models: update `backend/app/models.py`, then `alembic revision --autogenerate -m "msg"` and `alembic upgrade head`.
- Change client query behavior: `client/lib/query-client.ts` (query defaults: no retries, staleTime Infinity).

5. Tests, linting, and formatting
- Type checking: `npm run check:types` (root). Lint/format: `npm run lint` / `npm run format`.
- Backend tests: none included — rely on manual API checks via `/docs` and seed users in `QUICKSTART.md`.

6. Integration points and external deps
- Postgres (exposed by `docker-compose.yml`).
- JWT auth: `backend/app/auth.py` and client token logic in `client/lib/api-client.ts`.
- Websocket realtime: `backend/app/websocket.py` and client WebSocket helpers (search in `client/lib` or `client/components` for `new WebSocket` usage).

7. Examples to copy-paste
- Health check curl: `curl http://localhost:8000/health`.
- Example API request (login): see `client/lib/api-client.ts` `api.login(email,password)` or curl in `README.md`.

8. When in doubt
- Read `README.md` and `QUICKSTART.md` for environment and quickstart steps.
- If API/port mismatch appears, prefer editing `EXPO_PUBLIC_API_URL` rather than changing client defaults.

If any of these notes are unclear or you want deeper coverage (tests, CI, or detailed WebSocket protocol examples), tell me which areas to expand.
