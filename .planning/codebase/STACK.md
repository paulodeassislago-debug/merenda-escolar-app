# Technology Stack

**Analysis Date:** 2026-07-31

## Languages

**Primary:**
- Python 3.12 - Backend API (`backend/`)
- TypeScript ~6.0 - Frontend SPA (`frontend/src/`)

**Secondary:**
- CSS 3 (plain `.css` files) - Component styling

## Runtime & Package Management

**Backend:**
- Runtime: Python 3.12 (virtual environment at `backend/venv/`)
- Package manager: pip (via `backend/requirements.txt`)
- Lock file: Not present (requirements.txt is pinned)

**Frontend:**
- Runtime: Node.js 20+ (Dockerfile targets `node:20-alpine`)
- Package manager: npm
- Lock file: `frontend/package-lock.json`

## Backend Framework

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.139.2 | Web framework, auto-generated OpenAPI docs at `/docs` |
| Uvicorn | 0.51.0 | ASGI server with hot-reload |
| SQLAlchemy | 2.0.51 | ORM for database access |
| Pydantic | 2.13.4 | Request/response validation schemas (inline in `backend/main.py`) |
| Starlette | 1.3.1 | FastAPI's underlying ASGI toolkit (CORS middleware) |

**Key backend dependencies:**
- `python-jose` 3.5.0 — JWT token creation and decoding (HS256)
- `passlib` 1.7.4 + `bcrypt` 4.0.1 — Password hashing
- `httpx` 0.28.1 — HTTP client (used internally by FastAPI test client)
- `pytest` 9.1.1 — Test runner

## Frontend Framework

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.7 | UI library |
| React DOM | 19.2.7 | DOM rendering |
| React Router DOM | 7.11.0 | Client-side routing (BrowserRouter) |
| Vite | 8.1.1 | Build tool and dev server |
| TypeScript | ~6.0.2 | Type checking |
| Tailwind CSS | 4.3.3 | Utility-first CSS framework (configured but largely unused in components) |
| fast-xml-parser | 5.10.1 | XML parsing for NF-e (nota fiscal) on the frontend |

**Dev dependencies:**
- ESLint 10.6.0 (`eslint.config.js` — flat config format)
- `typescript-eslint` 8.62.0 — TypeScript lint rules
- `eslint-plugin-react-hooks` 7.1.1 — Hooks rules
- `@vitejs/plugin-react` 6.0.3 — React Fast Refresh for Vite
- PostCSS 8.5.21 + `@tailwindcss/postcss` 4.3.3 + `autoprefixer` 10.5.4 — CSS processing
- `@types/react` 19.2.17, `@types/react-dom` 19.2.3 — TypeScript type definitions

## Database

- Type: SQLite (development)
- File: `backend/merenda.db` — auto-created on first startup
- ORM: SQLAlchemy 2.0.51 with `declarative_base()`
- Connection string: `sqlite:///./merenda.db` (defined in `backend/database.py:6`)
- Production target: PostgreSQL (planned, per `backend/context.md` and `PRD.md`)

## Infrastructure

**Deployment:**
- Docker + Coolify (single VPS)
- Backend Dockerfile (`backend/Dockerfile`): `python:3.11-slim`, uvicorn on port 8000
- Frontend Dockerfile (`frontend/Dockerfile`): multi-stage build — Node.js 20 Alpine for build, Nginx Alpine for serving port 80

**Configuration files:**

| File | Purpose |
|------|---------|
| `backend/requirements.txt` | Python dependencies (pinned versions) |
| `frontend/package.json` | Node dependencies and scripts |
| `frontend/tsconfig.json` | TypeScript project references root |
| `frontend/tsconfig.app.json` | App TypeScript config (ES2023, strict) |
| `frontend/tsconfig.node.json` | Node-side TypeScript config (for vite.config.ts) |
| `frontend/vite.config.ts` | Vite build config (React plugin) |
| `frontend/eslint.config.js` | ESLint flat config |
| `frontend/tailwind.config.js` | Tailwind v4 content paths |
| `frontend/postcss.config.js` | PostCSS pipeline (Tailwind + autoprefixer) |

**Build commands:**
- Frontend: `npm run build` runs `tsc -b && vite build` — typecheck then bundle
- Backend: No build step; Python runs directly

<!-- refreshed: 2026-07-31 -->
*Stack analysis: 2026-07-31*