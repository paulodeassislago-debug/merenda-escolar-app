<!-- refreshed: 2026-07-31 -->
# Architecture

**Analysis Date:** 2026-07-31

## Overall Pattern

**Monorepo with two independent applications** — no shared monorepo tooling (no workspace config, Turborepo, Lerna, etc.). Each app runs independently from its own directory.

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React SPA)                     │
│  `frontend/src/`                                             │
│  ┌──────────┬───────────────┬──────────────────────────────┐│
│  │ App.tsx  │  pages/Login  │  pages/PainelCozinha         ││
│  │ (Router) │  pages/       │  pages/DashboardGestao       ││
│  │          │  DashboardG.  │                              ││
│  └────┬─────┴───────┬───────┴──────────┬───────────────────┘│
│       │             │                   │                    │
│       │    fetch('http://127.0.0.1:8000/...')               │
│       │             │                   │                    │
└───────┼─────────────┼───────────────────┼────────────────────┘
        │             │                   │
        ▼             ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  `backend/main.py`                                           │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  CORS Middleware  │  Pydantic Schemas  │  Endpoints      ││
│  │  (port 5173)      │  (inline in main)  │  /auth/*        ││
│  │                   │                    │  /estoque       ││
│  │                   │                    │  /conversoes    ││
│  │                   │                    │  /refeicoes/*   ││
│  └─────────┬─────────┴────────────────────┴─────────────────┘│
│            │                                                  │
│  ┌─────────▼────────────────────────────────────────────────┐│
│  │  auth.py          │  models.py     │  database.py        ││
│  │  (JWT + bcrypt)   │  (SQLAlchemy)  │  (engine + session) ││
│  └───────────────────┴────────────────┴─────────────────────┘│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     SQLite Database                          │
│  `backend/merenda.db`                                        │
│  Tables: usuarios, estoque, cardapio_base,                   │
│          dicionario_conversoes, registro_refeicoes           │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

**Pattern:** Flat single-file API with modules for cross-cutting concerns. No service layer or repository pattern yet — routes contain business logic directly.

- **Entry point:** `backend/main.py` — creates FastAPI app, CORS middleware, defines Pydantic schemas and all endpoints
- **Database setup:** `backend/database.py` — SQLAlchemy engine with SQLite, session factory, declarative base
- **Models:** `backend/models.py` — SQLAlchemy ORM classes (`Usuario`, `Estoque`, `CardapioBase`, `DicionarioConversoes`, `RegistroRefeicoes`)
- **Auth module:** `backend/auth.py` — JWT creation/decoding, bcrypt password hashing, `get_usuario_atual` dependency

**Route organization:**
All endpoints are defined inline in `backend/main.py`:

| Route | Method | Purpose | Lines |
|-------|--------|---------|-------|
| `/` | GET | Health check | 63-65 |
| `/auth/login` | POST | Login, returns JWT + perfil | 70-77 |
| `/auth/me` | GET | Current user data (JWT required) | 80-82 |
| `/estoque` | POST | Register new ingredient | 85-95 |
| `/estoque` | GET | List all stock | 98-100 |
| `/conversoes` | POST | Register measurement conversion | 103-112 |
| `/refeicoes/lancar` | POST | Submit meal, deduct stock | 115-151 |

**Data flow (meal submission example):**
1. Frontend sends POST to `/refeicoes/lancar` with `{ qtd_alunos_atendidos, id_usuario, ingredientes }` (`PainelCozinha.tsx:90`)
2. `main.py:116-151` iterates through each ingredient
3. If measure is not KG/L, queries `DicionarioConversoes` to convert caseira → kg (`main.py:123-133`)
4. Deducts calculated quantity from `Estoque.saldo_atual` (`main.py:136-140`)
5. Creates `RegistroRefeicoes` record for audit trail (`main.py:143-149`)
6. Commits transaction and returns success/error message

**Error handling:** HTTPException for validation errors (e.g., 401 for bad login). Business errors returned as JSON `{ "erro": "..." }` with 200 status (not HTTP error codes). No global exception handler.

## Frontend Architecture

**Pattern:** React SPA with page-based routing, no state management library

- **Entry point:** `frontend/src/main.tsx` — renders `<App />` inside `StrictMode`
- **Root component:** `frontend/src/App.tsx` — BrowserRouter with 3 routes
- **Routing:** Client-side via `react-router-dom` v7. Routes:
  - `/` → `Login` (`frontend/src/pages/Login.tsx`)
  - `/cozinha` → `PainelCozinha` (`frontend/src/pages/PainelCozinha.tsx`)
  - `/gestao` → `DashboardGestao` (`frontend/src/pages/DashboardGestao.tsx`)
- **State management:** Local `useState` per component only — no Redux, Context, or Zustand
- **Component organization:** Flat pages directory with co-located CSS files
- **Shared types:** `frontend/src/types.ts` — `Ingrediente`, `PratoPadrao`, `ItemEstoque` interfaces

**Component tree:**
```
App (BrowserRouter)
├── Login           — useState(usuario, senha), useNavigate
├── PainelCozinha   — useState(isModalOpen, tipoRefeicao, pratoAtual, alunos, ingredientes)
│   ├── cardapiosPadrao (hardcoded config)
│   ├── Modal overlay (meal selection + ingredient editing)
│   └── fetch → POST /refeicoes/lancar
└── DashboardGestao — useState(estoque, carregando, erro), useEffect(fetch on mount)
    └── fetch → GET /estoque
```

**Data flow:**
1. `PainelCozinha` has hardcoded `cardapiosPadrao` object (menu items) → will be replaced by API calls
2. User selects meal type → loads predefined ingredients from `cardapiosPadrao`
3. User adjusts quantities, clicks "Confirmar" → `handleFinalizar()` POSTs to backend
4. `DashboardGestao` fetches `/estoque` on mount, renders table with low-stock alerts

## Key Abstractions

**Pydantic models (inline in `backend/main.py`):**
- `LoginRequest` (line 36) — `{ nome, senha }`
- `IngredienteCreate` (line 40) — `{ nome_ingrediente, unidade_medida_oficial, saldo_atual }`
- `ConversaoCreate` (line 45) — `{ nome_ingrediente, medida_caseira, peso_em_kg }`
- `IngredienteUsado` (line 50) — `{ nome, quantidade, medida }`
- `LancamentoRefeicao` (line 55) — `{ qtd_alunos_atendidos, id_usuario, ingredientes }`

**SQLAlchemy models (`backend/models.py`):**
- `Usuario` — id, nome, senha_hash, perfil (admin/cozinheira)
- `Estoque` — id_ingrediente, nome_ingrediente, unidade_medida_oficial, saldo_atual
- `CardapioBase` — id_prato, nome_refeicao, ingredientes_padrao (JSON)
- `DicionarioConversoes` — id, nome_ingrediente, medida_caseira, peso_em_kg
- `RegistroRefeicoes` — id_registro, data_hora, id_usuario, qtd_alunos_atendidos, ingredientes_utilizados (JSON)

**Auth dependency (`backend/auth.py`):**
- `get_usuario_atual(db, token)` — FastAPI dependency that extracts JWT from `Authorization: Bearer` header, validates, and returns the `Usuario` model instance

**Frontend shared types (`frontend/src/types.ts`):**
- `Ingrediente` — `{ nome, qtd, medida }`
- `PratoPadrao` — `{ prato, ingredientes }`
- `ItemEstoque` — `{ id, nome_ingrediente, unidade_medida_oficial, saldo_atual }`

## Cross-Cutting Concerns

**CORS:** Configured via `CORSMiddleware` in `main.py:15-24`. Allows `localhost:5173` and `127.0.0.1:5173` with all methods and headers. Credentials enabled.

**Authentication:** JWT Bearer tokens. Only used by backend — frontend routes are unprotected (no auth guard/ProtectedRoute component). The `get_usuario_atual` dependency is only used in `/auth/me` endpoint.

**Logging:** No logging framework configured. Errors are caught with try/catch and surfaced to the UI via `alert()` calls (frontend).

**Error handling patterns:**
- Backend: Returns JSON `{ "erro": "..." }` or `HTTPException` with status codes
- Frontend: `try/catch` around fetch calls, error shown via `alert()` in `PainelCozinha`, via state variable in `DashboardGestao`

<!-- refreshed: 2026-07-31 -->
*Architecture analysis: 2026-07-31*