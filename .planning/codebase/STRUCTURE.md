# Codebase Structure

**Analysis Date:** 2026-07-31

## Top-Level Layout

```
merenda-escolar-app/
├── .opencode/            # OpenCode agent configuration
├── .planning/            # GSD planning artifacts (codebase/ docs)
├── .git/                 # Git repository
├── AGENTS.md             # Agent instruction file for Claude Code
├── PRD.md                # Product Requirements Document (v2)
├── spec.md               # Technical specifications and implementation steps
├── TESTING.md            # Test routine checklist and commands
├── package-lock.json     # (unused — no root Node project; may be vestigial)
│
├── backend/              # Python/FastAPI backend application
│   ├── main.py           # FastAPI app + all endpoints + Pydantic schemas
│   ├── auth.py           # JWT auth, bcrypt hashing, get_usuario_atual
│   ├── models.py         # SQLAlchemy ORM models (5 tables)
│   ├── database.py       # SQLAlchemy engine + SessionLocal + Base
│   ├── context.md        # Project context/status document (Portuguese)
│   ├── requirements.txt  # Pinned Python dependencies
│   ├── Dockerfile        # python:3.11-slim, uvicorn on port 8000
│   ├── merenda.db        # SQLite database file
│   ├── venv/             # Python virtual environment (not committed)
│   └── tests/            # pytest test suite
│       ├── __init__.py
│       ├── conftest.py   # Fixtures: client, db, tokens per role
│       └── test_auth.py  # Auth endpoint tests (6 tests)
│
└── frontend/             # React/Vite/TypeScript frontend application
    ├── package.json      # Node dependencies and npm scripts
    ├── package-lock.json # Locked dependency versions
    ├── tsconfig.json     # TypeScript project references root
    ├── tsconfig.app.json # App TS config (ES2023, strict, verbatimModuleSyntax)
    ├── tsconfig.node.json# Node-side TS config (for vite.config.ts)
    ├── vite.config.ts    # Vite build config (React plugin)
    ├── eslint.config.js  # ESLint flat config (TS + React)
    ├── postcss.config.js # PostCSS pipeline (Tailwind + autoprefixer)
    ├── tailwind.config.js# Tailwind v4 content paths
    ├── Dockerfile        # Multi-stage: Node build → Nginx serve
    ├── index.html        # HTML entry point (<div id="root">)
    ├── README.md         # Frontend README (Vite/React default)
    ├── .gitignore        # Frontend-specific git ignores
    ├── public/           # Static assets
    │   ├── favicon.svg
    │   └── icons.svg
    ├── dist/             # Build output (not committed)
    ├── node_modules/     # Node dependencies (not committed)
    └── src/              # Application source code
        ├── main.tsx      # React entry point (createRoot)
        ├── App.tsx       # Root component with BrowserRouter
        ├── App.css       # Global app styles
        ├── index.css     # Tailwind directives (@tailwind base/components/utilities)
        ├── types.ts      # Shared TypeScript interfaces
        ├── assets/       # Static asset imports
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        └── pages/        # Page components (co-located CSS)
            ├── Login.tsx
            ├── Login.css
            ├── PainelCozinha.tsx
            ├── PainelCozinha.css
            ├── DashboardGestao.tsx
            └── DashboardGestao.css
```

## Backend Structure (`backend/`)

| Directory/File | Purpose |
|---|---|
| `main.py` | FastAPI application, CORS middleware, Pydantic schemas (inline), all 7 API endpoints (GET/POST), database initialization |
| `auth.py` | JWT token management: `criar_token`, `decodificar_token`, bcrypt password functions, `get_usuario_atual` FastAPI dependency, `get_db` session factory (duplicate of database.py's — intentional to avoid circular imports) |
| `models.py` | SQLAlchemy ORM models: `Usuario`, `Estoque`, `CardapioBase`, `DicionarioConversoes`, `RegistroRefeicoes` |
| `database.py` | SQLAlchemy engine setup (`sqlite:///./merenda.db`), `SessionLocal` factory, `Base = declarative_base()` |
| `requirements.txt` | 33 pinned Python packages (fastapi, uvicorn, sqlalchemy, python-jose, passlib, bcrypt, pytest) |
| `Dockerfile` | Production Docker image: `python:3.11-slim`, port 8000 |
| `merenda.db` | SQLite database (auto-created, gitignored in practice) |
| `venv/` | Python 3.12 virtual environment |
| `tests/conftest.py` | Pytest fixtures: in-memory SQLite test DB, TestClient, role-based user+tokens (admin, cozinheira, secretaria) |
| `tests/test_auth.py` | 6 auth endpoint tests covering login success/failure, token validation, token expiry |

## Frontend Structure (`frontend/`)

| Directory/File | Purpose |
|---|---|
| `src/main.tsx` | React DOM entry point — renders `<App />` into `#root` inside `StrictMode` |
| `src/App.tsx` | Router setup with 3 routes: `/` → Login, `/cozinha` → PainelCozinha, `/gestao` → DashboardGestao |
| `src/types.ts` | Shared TypeScript interfaces: `Ingrediente`, `PratoPadrao`, `ItemEstoque` |
| `src/index.css` | Tailwind CSS `@tailwind` directives (base, components, utilities) |
| `src/App.css` | Global app styles (currently empty or minimal) |
| `src/pages/Login.tsx` | Login page — simulated auth (username check → navigate), not connected to backend `/auth/login` |
| `src/pages/PainelCozinha.tsx` | Kitchen panel — meal selection, ingredient editing, POST to `/refeicoes/lancar`. Contains hardcoded `cardapiosPadrao` object and `id_usuario: 1` |
| `src/pages/DashboardGestao.tsx` | Management dashboard — fetches `GET /estoque`, renders table with low-stock alerts |
| `src/assets/` | Static images (hero.png, react.svg, vite.svg) |
| `public/` | Public static files (favicon.svg, icons.svg) |
| `vite.config.ts` | Vite build configuration with `@vitejs/plugin-react` |
| `eslint.config.js` | ESLint flat config: `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` |
| `tailwind.config.js` | Tailwind v4 config: scans `./src/**/*.{js,ts,jsx,tsx}` |
| `Dockerfile` | Multi-stage: builder (node:20-alpine) → nginx:alpine with SPA routing config |

## Configuration Files

| File | Type | Notes |
|------|------|-------|
| `backend/requirements.txt` | Python deps | 33 packages, all pinned |
| `frontend/package.json` | Node deps | npm scripts: dev, build, lint, preview |
| `frontend/tsconfig.json` | TypeScript root | References tsconfig.app.json + tsconfig.node.json |
| `frontend/tsconfig.app.json` | TypeScript app | ES2023, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, strict checks |
| `frontend/vite.config.ts` | Vite | React plugin only, default config |
| `frontend/eslint.config.js` | ESLint | Flat config, TS + React rules |
| `frontend/tailwind.config.js` | Tailwind | v4 config, default theme |
| `frontend/postcss.config.js` | PostCSS | `@tailwindcss/postcss` + autoprefixer |
| `backend/Dockerfile` | Docker | Python 3.11 slim, uvicorn |
| `frontend/Dockerfile` | Docker | Multi-stage Node 20 → Nginx |

## Naming Conventions

**Files:**
- Backend: `snake_case.py` (e.g., `main.py`, `models.py`, `database.py`, `conftest.py`)
- Frontend: `PascalCase.tsx` for components (e.g., `PainelCozinha.tsx`, `DashboardGestao.tsx`), `kebab-case` or `snake_case` not used
- CSS: Co-located with components, same name as component (e.g., `Login.tsx` → `Login.css`, `PainelCozinha.tsx` → `PainelCozinha.css`)
- Test files: `test_*.py` (e.g., `test_auth.py`)

**Functions:**
- Backend: `snake_case` (e.g., `criar_token`, `verificar_senha`, `get_usuario_atual`, `ler_raiz`)
- Frontend: `camelCase` for handlers/utilities (e.g., `handleLogin`, `handleFinalizar`, `atualizarQuantidade`), `PascalCase` for components (e.g., `Login`, `PainelCozinha`, `DashboardGestao`)

**Variables:**
- Backend: `snake_case` (e.g., `qtd_a_descontar`, `novo_item`, `estoque_item`)
- Frontend: `camelCase` (e.g., `isModalOpen`, `tipoRefeicao`, `setAlunos`)
- Portuguese variable naming throughout both codebases

**Database:**
- Table names: `snake_case` (matching SQL convention) — `usuarios`, `estoque`, `cardapio_base`, `dicionario_conversoes`, `registro_refeicoes`
- Column names: `snake_case` — `nome_ingrediente`, `unidade_medida_oficial`, `saldo_atual`, `senha_hash`

**TypeScript conventions:**
- `type`-only imports required: `import type { Ingrediente, PratoPadrao } from '../types'` (enforced by `verbatimModuleSyntax: true`)
- `interface` preferred over `type` for object shapes in `types.ts`
- Default exports for page components: `export default function Login()` (except types.ts uses named exports)

## Where to Add New Code

**New backend endpoint:**
- Add Pydantic schema inline in `backend/main.py` (near existing schemas, lines 36-58)
- Add route function in `backend/main.py` (near existing routes, lines 62-151)
- Add corresponding test in `backend/tests/` (new `test_*.py` file)

**New frontend page:**
- Create `frontend/src/pages/NewPage.tsx` with co-located `NewPage.css`
- Add route in `frontend/src/App.tsx`: `<Route path="/new" element={<NewPage />} />`
- Add any new shared types to `frontend/src/types.ts`

**New database model:**
- Add SQLAlchemy class in `backend/models.py`
- Delete `backend/merenda.db` to trigger auto-recreation on next startup
- Add Pydantic schemas in `backend/main.py`

**New shared component:**
- Create `frontend/src/components/ComponentName.tsx` with co-located CSS (directory does not exist yet — create it)

**New test file:**
- Create `backend/tests/test_*.py` following existing pattern
- Use fixtures from `backend/tests/conftest.py` (client, db, admin_token, cozinheira_token)
- Follow test naming: `test_N_N_descriptive_name`

<!-- refreshed: 2026-07-31 -->
*Structure analysis: 2026-07-31*