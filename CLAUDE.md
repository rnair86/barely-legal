# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: a V1 technical foundation (see Implementation status below). Users draft any of the 11 catalog documents through an AI chat.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. When working on a Jira ticket, move the ticket to In Progress
3. Develop the feature - do not skip any step from the feature-dev 7 step process
4. Thoroughly test the feature with unit tests and integration tests and fix any issues
5. Submit a PR using your github tools
6. Once the PR is merged move the ticket to Done and add a brief description of what was done on the ticket

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is statically built and served via FastAPI.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

Done (BL-4, PR #8):
- `backend/`: uv + FastAPI (`app/main.py`, `routes.py`, `auth.py`, `db.py`). Endpoints: `GET /api/health`, `POST /api/auth/signup`, `POST /api/auth/signin` (argon2 hashing, JWT, email normalised, password min 8 chars). Set `JWT_SECRET` in `.env`, otherwise a random secret is used per start.
- SQLite `users` table at `/tmp/app.db` (`DB_PATH`), deleted and recreated on every startup.
- `frontend/`: Next.js with `output: "export"` (so `cacheComponents` and `partialPrefetching` are disabled). Templates are read from `templates/` at build time. FastAPI serves `frontend/out` from `/app/static`.
- `Dockerfile` (multi-stage, build context is the repo root), `docker-compose.yml`, `scripts/` start and stop for mac, linux, windows. Mac and linux scripts are untested.
- Tests: `cd backend && uv run pytest`, `cd frontend && npm test`.

Done (BL-5): AI chat for the Mutual NDA.
- `POST /api/chat` (`backend/app/chat.py`): stateless; the client sends message history plus current field values, the backend calls `openrouter/openai/gpt-oss-120b` (Cerebras) via LiteLLM with Structured Outputs (`ChatTurn`: `reply` plus partial `updates`). LLM failure returns 502. Request size is capped and `values` is typed. Known risk: the endpoint is NOT auth protected, so anyone who can reach the server can spend the OpenRouter budget; add JWT auth together with the sign-in UI.
- Frontend: `ChatPanel.tsx` replaces the form; `applyUpdates` in `lib/mnda.ts` merges updates into `MndaValues`; live preview and downloads unchanged.
- Backend tests mock `run_chat`; one `live` test calls the real model (needs `OPENROUTER_API_KEY` in `.env`, skipped if absent). First request after container start can be slow because litellm loads on import.

Done (BL-6): all catalog documents (11 types; the two NDA catalog entries are one `mutual-nda` document).
- `backend/app/documents.py` loads `catalog.json` and `templates/` (`DATA_ROOT`, set to `/app` in Docker). `GET /api/documents` and `GET /api/documents/{id}`.
- Only the NDA has a cover template and typed fields. Other documents' fields are auto-extracted from the template's `*_link` spans (parties first, plurals merged) and collected as `termUpdates` ({term, value}); the frontend renders a generic Key Terms table and signature block (`lib/documents.ts`) before the unmodified template body.
- Chat: `ChatTurn` also returns `document` (an id from the catalog, or null). The prompt lists every document's terms, so the turn that selects a document can already record details. Unsupported requests are declined with the closest document offered. One document per session; "Start new document" reloads the page.
- `ChatTurn` field order matters: `reply` is last so the model records data before confirming it (measured: first-turn recording went from 4/6 to 6/6).
- Known limitation: the model resolves "today" using the server (UTC) date, which can differ from the user's local date.

Not done: sign-in/sign-up UI, protected endpoints.
