# Deployment and Environment Variables

This document summarizes the environment variables and deployment recommendations for the TeamUp project.

Required environment variables

- DATABASE_URL: PostgreSQL connection string used by the backend.
- SESSION_SECRET: Secret used by session cookies (change in production).
- EXPO_PUBLIC_DOMAIN / EXPO_PUBLIC_DOMAINS: Domain(s) where the client is hosted — used by the server for CORS and manifest generation.
- EXPO_PUBLIC_API_URL: Base API URL for the client. You can also set this on the client by editing `client/lib/api-client.ts` or by passing `EXPO_PUBLIC_API_URL` into your Expo environment.

Recommendations

- For local development use `localhost` and the specific emulator addresses (e.g., `10.0.2.2` for Android emulator).
- In CI / production, set `EXPO_PUBLIC_DOMAIN` and `EXPO_PUBLIC_API_URL` so the server can properly serve manifests and allow CORS from your client domain(s).

Example (Linux / macOS):

```bash
export DATABASE_URL="postgresql://teamup:teamup123@db:5432/teamup_db"
export SESSION_SECRET="replace-with-secure-secret"
export EXPO_PUBLIC_DOMAIN="app.example.com"
export EXPO_PUBLIC_API_URL="https://api.example.com"
```

CI note

- In GitHub Actions, set these variables in the workflow `env` or repository Secrets to ensure tests and deployments run with correct settings.
