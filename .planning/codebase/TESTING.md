# Codebase Testing

**Analysis Date:** 2026-08-03

## Automated Backend Tests

- Framework: pytest with FastAPI TestClient/httpx.
- Database: isolated in-memory SQLite with StaticPool.
- Fixtures: client, database session and tokens for admin, secretary and cook.
- Phase 5.7 completed with 94 tests; the current worktree baseline is 100 passing tests.
- Run from `backend/`: `source venv/bin/activate && pytest tests/ -v`.

Coverage areas:

- Authentication: valid login, invalid password, token validation and expiry.
- Users: admin CRUD and authorization.
- Items: CRUD, low stock, free units and conditional conversion validation.
- Conversions: item-scoped creation and deletion.
- Menu and recipes: CRUD, recipe items and unified `Lanche` type.
- Planning: weekly slots, vigency, upsert and slot/type mapping.
- Deliveries: received, altered and excluded actions, justifications, conversion factors and atomic validation.
- Meals: case-measure conversion, stock deduction, audit records, invalid conversion and insufficient stock.
- Dashboard and public menu: aggregates, empty values and unauthenticated access.

## Frontend Gates

- Build/typecheck: from `frontend/`, `npm run build`.
- Lint: from `frontend/`, `npm run lint`.
- Manual acceptance flows are tracked in phase artifacts and cover login, admin CRUDs, planning, deliveries, kitchen, management and public menu.
- Phase 5 manual scope was F6-F12; Phase 6 scope is F13-F15; Phase 7 completes F1-F17.
- F12 (upload XML NF-e, revisão humana e confirmação no fluxo de entregas) foi validado manualmente em 2026-08-03.

## Universal Verification

1. Backend starts without traceback from `backend/`.
2. Swagger is available at `/docs`.
3. Backend tests pass.
4. Frontend build passes.
5. Frontend lint passes.
6. Relevant browser flow is manually verified.

## Deferred Automation

- Playwright E2E is deferred to a future milestone.
- CI/CD is not configured.
- Formal NF-e schema validation remains out of scope for the current XML flow; the implemented upload/review flow is validated.

---
*Refreshed: 2026-08-03 after Phase 5.7*
