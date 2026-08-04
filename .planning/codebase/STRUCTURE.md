# Codebase Structure

**Analysis Date:** 2026-08-03

## Top-Level Layout

```text
merenda-escolar-app/
├── .planning/       # GSD project, requirements, roadmap, state and phase artifacts
├── .opencode/       # OpenCode project configuration
├── AGENTS.md        # Runtime and repository instructions read by GSD agents
├── backend/         # FastAPI application and pytest suite
└── frontend/        # React/Vite/TypeScript application
```

## Backend Layout

- `main.py`: application and endpoints.
- `models.py`: SQLAlchemy persistence model.
- `schemas.py`: Pydantic API model.
- `auth.py`: authentication and authorization dependencies.
- `config.py`: environment configuration.
- `database.py`: SQLite engine and sessions.
- `requirements.txt`: pinned Python dependencies.
- `tests/conftest.py`: isolated test fixtures and profile tokens.
- `tests/test_*.py`: auth, users, items, conversions, menu, planning, deliveries, meals, dashboard and public menu tests.

## Frontend Layout

- `src/App.tsx`: route composition.
- `src/api.ts`: API client.
- `src/auth.tsx` and `src/auth-context.ts`: authentication state.
- `src/components/`: protected route and shared layout.
- `src/pages/admin/`: Dashboard, Usuarios, Itens, Cardapio, Receitas, Planejamento and Entregas.
- `src/pages/PainelCozinha.tsx`: kitchen legacy surface.
- `src/pages/DashboardGestao.tsx`: management legacy surface.
- `src/pages/CardapioPublico.tsx`: public menu surface.
- Each page has a co-located `.css` file where styling is needed.
- `src/types.ts`: shared frontend contracts.

## GSD Planning Layout

- Root context: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`.
- Codebase map: `.planning/codebase/`.
- Phase artifacts: `.planning/phases/NN-name/`.
- Phase 5 artifacts document the completed admin frontend and its decisions.

## Extension Points

- New backend endpoint: schema in `schemas.py`, route/business logic in `main.py`, tests in `backend/tests/`.
- New frontend page: component and CSS under `frontend/src/pages/`, route in `App.tsx`, types in `types.ts`.
- New shared behavior: prefer existing `api.ts`, auth context, `Layout` and `ProtectedRoute` patterns.

---
*Refreshed: 2026-08-03 after Phase 5.7*
