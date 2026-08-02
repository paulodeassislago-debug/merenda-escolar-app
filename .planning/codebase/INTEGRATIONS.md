# External Integrations

**Analysis Date:** 2026-07-31

## Database

- **Type:** SQLite (development)
- **Connection string:** `sqlite:///./merenda.db` — `backend/database.py:6`
- **Database file:** `backend/merenda.db` (auto-created on first `uvicorn` startup)
- **Migrations:** Not implemented — schema is created automatically via `models.Base.metadata.create_all(bind=engine)` in `backend/main.py:10`. Tables are dropped and recreated on schema changes (no migration framework like Alembic).
- **Test database:** SQLite in-memory (`sqlite:///:memory:`) — isolated per test via `backend/tests/conftest.py`

## External APIs

**None detected.** The application does not consume any third-party APIs. All data comes from:
- Local SQLite database
- User input via the frontend UI
- (Planned) XML NF-e files parsed client-side using `fast-xml-parser`

## Authentication

- **Current state:** Hybrid — backend has real JWT auth, frontend login uses simulated routing
  - **Backend:** Real JWT authentication via `backend/auth.py` — `POST /auth/login` returns `{ access_token, perfil }`, `GET /auth/me` validates the token. Tokens use HS256, expire after 8 hours.
  - **Frontend:** Login page (`frontend/src/pages/Login.tsx:13-18`) routes based on username string matching (`admin` → `/gestao`, anything else → `/cozinha`). No actual API call to `/auth/login`.
  - **Hardcoded user ID:** `PainelCozinha.tsx:82` uses `id_usuario: 1` for meal submissions.
- **Mechanism:** JWT (Bearer token) via `python-jose[cryptography]`, password hashing via `passlib[bcrypt]`.
- **Secret key:** Default `"chave-dev-trocar-em-producao"` — override via `SECRET_KEY` environment variable (`backend/auth.py:14`).
- **Token expiry:** 8 hours (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8` at `backend/auth.py:16`).

## External Services

**None detected.** No third-party services, payment processors, email providers, or cloud APIs are integrated.

## Webhooks & Callbacks

- **Incoming:** None
- **Outgoing:** None

## Environment Configuration

- **`SECRET_KEY`** (optional): JWT signing key. Defaults to dev key if not set (`backend/auth.py:14`).
- No `.env` file detected in the repository root, `backend/`, or `frontend/`.
- **CORS origins** are hardcoded in `backend/main.py:17-20`:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- **API base URL** is hardcoded in the frontend:
  - `http://127.0.0.1:8000` in `PainelCozinha.tsx:90` (POST `/refeicoes/lancar`)
  - `http://127.0.0.1:8000` in `DashboardGestao.tsx:15` (GET `/estoque`)

## CI/CD & Deployment

- **CI Pipeline:** None configured
- **Hosting:** Single VPS via Docker + Coolify
- **Container orchestration:** No `docker-compose.yml` — separate Dockerfiles per app, orchestrated by Coolify

<!-- refreshed: 2026-07-31 -->
*Integration analysis: 2026-07-31*