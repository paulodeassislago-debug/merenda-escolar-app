# Architecture

**Analysis Date:** 2026-08-03

## Overall Pattern

The repository contains two independently run applications connected through a JSON HTTP API:

```text
React/Vite frontend
  -> api.ts / JWT / JSON
FastAPI backend
  -> SQLAlchemy models and business rules
SQLite development database
```

The project evolves an existing flat architecture rather than introducing service or repository layers.

## Backend

- `backend/main.py`: FastAPI app, route handlers, authorization wiring and domain logic.
- `backend/models.py`: SQLAlchemy models for users, items, conversions, menu items, recipes, planning, deliveries and meals.
- `backend/schemas.py`: Pydantic request/response contracts.
- `backend/auth.py`: JWT creation/decoding, password hashing and current-user dependencies.
- `backend/database.py`: engine, session factory and declarative base.
- `backend/config.py`: environment-backed configuration.
- `backend/tests/`: API tests by domain.

### Domain flow: meal registration

1. The cook selects a planned meal in the frontend.
2. Frontend sends the meal, students and adjusted ingredients through the authenticated API client.
3. Backend validates the user, planning entry, ingredient set, justifications and conversions.
4. Case measures are converted to internal kg/L values.
5. Stock is checked and decremented transactionally.
6. The meal and per-item audit records are persisted.

### Domain flow: delivery

1. Admin or secretary creates manual rows or imports NF-e XML in the browser.
2. Frontend maps rows to catalog items and records edits/removals.
3. Backend validates all rows before applying any stock change.
4. Received and altered quantities update internal stock; excluded rows do not.
5. Delivery items preserve action, quantity, conversion factor and justification.

## Frontend

- `frontend/src/main.tsx`: React entry point.
- `frontend/src/App.tsx`: BrowserRouter and protected route composition.
- `frontend/src/auth.tsx`: AuthProvider implementation.
- `frontend/src/auth-context.ts`: AuthContext, `useAuth` and route/profile helpers.
- `frontend/src/api.ts`: centralized authenticated API access.
- `frontend/src/components/`: `Layout` and `ProtectedRoute`.
- `frontend/src/pages/admin/`: seven completed admin pages.
- `frontend/src/pages/PainelCozinha.tsx`: legacy kitchen page, Phase 6 target.
- `frontend/src/pages/DashboardGestao.tsx`: legacy management page, Phase 6 target.
- CSS is co-located with components and uses tokens in `frontend/src/index.css`.

## Current Routes

- Public: `/`, `/cardapio`.
- Admin: `/admin`, `/admin/usuarios`, `/admin/itens`, `/admin/cardapio`, `/admin/receitas/:id`.
- Admin and secretary: `/admin/planejamento`, `/admin/entregas`.
- Cook: `/cozinha`.
- Secretary: `/gestao`.

## Cross-Cutting Rules

- Backend is the authorization and business-rule authority.
- Frontend must not send `id_usuario` when the backend can derive it from JWT.
- Planning has four service slots while cardapio/meals have three meal types.
- Internal stock is kg/L even when display units are free-form.

---
*Refreshed: 2026-08-03 after Phase 5.7*
