# Barely Legal

Platform for drafting legal agreements with AI. Current state: Mutual NDA creator (frontend) on a V1 foundation with a FastAPI backend and a temporary SQLite database.

## Run

Requires Docker. App at http://localhost:8000.

```bash
scripts/start-mac.sh        # or start-linux.sh / start-windows.ps1
scripts/stop-mac.sh         # or stop-linux.sh / stop-windows.ps1
```

The database is recreated on every container start.

## Layout

- `frontend/` Next.js, statically exported and served by FastAPI
- `backend/` FastAPI (uv project): `/api/health`, `/api/auth/signup`, `/api/auth/signin`
- `templates/`, `catalog.json` legal document templates

## Test

```bash
cd backend && uv run pytest
cd frontend && npm test
```

Set `JWT_SECRET` in `.env` to override the dev default.
