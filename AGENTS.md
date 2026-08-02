# AGENTS.md

## Project overview
- Two separate apps: `backend/` (Python/FastAPI) and `frontend/` (React/Vite/TypeScript).
- No monorepo tooling; run each app independently from its own directory.
- Deployment target: single VPS via Docker + Coolify.

## Commands (run from each subdirectory)

### Backend (`backend/`)
- Activate venv first: `source backend/venv/bin/activate`
- Start dev server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- Interactive API docs: http://127.0.0.1:8000/docs

### Frontend (`frontend/`)
- Install deps: `npm install`
- Dev server: `npm run dev` (runs on port 5173)
- Lint: `npm run lint`
- Build (includes typecheck): `npm run build`

## Architecture
- **Database**: SQLite (`backend/merenda.db`), auto-created on startup by `models.Base.metadata.create_all`. Note: `DATABASE_URL` is relative (`sqlite:///./merenda.db`) — always run Python/uvicorn from `backend/`, never from the repo root, or a stray empty db is created at the root.
- **Routes** (`App.tsx`): `/` (Login), `/cardapio` (public menu), `/admin` (admin), `/cozinha` (kitchen panel), `/gestao` (management dashboard). Authenticated routes are wrapped in `ProtectedRoute` + `Layout`.
- **Auth**: real JWT login (Phase 4). `src/auth.tsx` (AuthProvider) + `src/auth-context.ts` (context, `useAuth`, `ROTA_POR_PERFIL`) — split to keep the `react-refresh/only-export-components` lint rule clean. Dev users seeded in `backend/merenda.db`: `admin/admin123`, `secretaria/secretaria123`, `cozinheira/cozinheira123`.
- **Shared types**: `frontend/src/types.ts` — update both frontend and backend Pydantic models when changing data shapes.
- **API base URL**: centralized in `frontend/.env` (`VITE_API_URL`), consumed via `src/api.ts` (`fetchWithAuth`/`fetchJson`). Exception: legacy pages (`PainelCozinha.tsx`, `DashboardGestao.tsx`) still use hardcoded URLs and `id_usuario: 1` until Phase 6.
- **Design system**: `DESIGN.md` (brand rules from the school crest) — tokens live in `frontend/src/index.css` (`:root`). Logo file: `frontend/src/assets/Logo Nancy (Logotipo) (1).jpg` (white-background JPG — always render on light surfaces).

## Conventions & gotchas
- `verbatimModuleSyntax: true` in tsconfig — always use `import type { X }` for type-only imports.
- `erasableSyntaxOnly: true` — avoid enums, namespaces, and parameter properties in TypeScript.
- The conversion engine (medidas caseiras → kg/L) relies on entries in the `/conversoes` endpoint. A `POST /refeicoes/lancar` call will fail if a conversion is missing.
- CSS is plain `.css` files co-located with components (e.g. `PainelCozinha.css`) — not Tailwind utility classes, despite Tailwind being in the dependencies.
- Backend test suite: `pytest backend/tests/` (77 tests, SQLite in-memory via StaticPool). Run pytest from `backend/`. No CI configured.