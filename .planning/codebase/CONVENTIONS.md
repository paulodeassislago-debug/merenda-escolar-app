# Codebase Conventions

**Analysis Date:** 2026-08-03

## Repository and Commands

- Backend commands run from `backend/` with `venv` activated.
- Frontend commands run from `frontend/`.
- Do not run backend commands from the repository root because the relative SQLite URL can create a stray database.
- Keep backend and frontend changes independently testable.

## Backend

- Python functions and variables use `snake_case`; domain names remain in Portuguese where established.
- Pydantic models live in `backend/schemas.py`.
- Endpoint authorization uses the existing `require_perfil` dependency.
- Every domain change requires corresponding pytest coverage using fixtures from `backend/tests/conftest.py`.
- Do not silently convert missing measures or permit partial stock updates.

## Frontend

- Components and pages use PascalCase filenames; handlers use camelCase.
- Type-only imports must use `import type` because `verbatimModuleSyntax` is enabled.
- Do not use enums, namespaces or parameter properties because `erasableSyntaxOnly` is enabled.
- Helpers, constants and types that are not components belong in `.ts` files to satisfy `react-refresh/only-export-components`.
- API calls use `fetchJson`/`fetchWithAuth`; new pages must not use raw `fetch` or hardcoded API URLs.
- Shared shapes belong in `frontend/src/types.ts` and must match Pydantic contracts.

## Styling and Accessibility

- Use plain co-located CSS, not utility classes as the primary page language.
- Use CSS variables from `frontend/src/index.css`; avoid new arbitrary hex colors.
- Keep the institutional light/green visual language.
- Preserve visible keyboard focus, labels, `role="alert"` errors and disabled submit feedback.
- Audit fields must remain visible and justified; do not replace them with silent optimistic updates.

## Data Semantics

- Cardapio/meal types are `Lanche`, `Almoco`, `Janta`.
- Planning slots are `Lanche da Manha`, `Almoco`, `Lanche da Tarde`, `Janta`.
- Delivery action `excluido` is invalid; the backend contract uses the accented value `excluído` in source data.
- Internal inventory is kg/L; free display units use `unidade_interna` and `fator_conversao`.

---
*Refreshed: 2026-08-03 after Phase 5.7*
