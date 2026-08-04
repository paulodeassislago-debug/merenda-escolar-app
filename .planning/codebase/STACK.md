# Technology Stack

**Analysis Date:** 2026-08-03

## Applications

- `backend/`: Python 3.12, FastAPI 0.139.2, SQLAlchemy 2.0.51 and Pydantic 2.13.4.
- `frontend/`: React 19.2.7, Vite 8.1.1, TypeScript 6.0.2 and React Router DOM 7.11.0.
- No monorepo workspace tooling; each application is run and built from its own directory.

## Backend Dependencies

The reproducible dependency list is `backend/requirements.txt`.

- API: `fastapi`, `uvicorn`, `starlette`.
- Data: `SQLAlchemy`, `greenlet`, SQLite through Python's standard library.
- Validation: `pydantic`, `pydantic-core`, `annotated-types`.
- Auth: `python-jose`, `cryptography`, `passlib`, `bcrypt`.
- Configuration: `python-dotenv`.
- Tests: `pytest`, `httpx`.

## Frontend Dependencies

- UI/runtime: `react`, `react-dom`, `react-router-dom`.
- Build: `vite`, `typescript`, `@vitejs/plugin-react`.
- XML: `fast-xml-parser` for client-side NF-e parsing.
- Quality: ESLint, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- CSS tooling exists in dependencies, but production page styling follows plain co-located CSS and CSS variables.

## Database and Runtime

- Development database: `backend/merenda.db`.
- URL: `sqlite:///./merenda.db`, relative to the process working directory.
- Initialization: `models.Base.metadata.create_all(bind=engine)`.
- Tests: in-memory SQLite with StaticPool from `backend/tests/conftest.py`.
- Production target: PostgreSQL with a future migration system; Alembic is deliberately deferred.

## Infrastructure

- Backend and frontend have separate Dockerfiles.
- Frontend is built with Node 20 and served by Nginx.
- Deployment target is one VPS managed through Coolify.

## Commands

- Backend: from `backend/`, activate `venv` and run `pytest tests/ -v` or `uvicorn main:app --reload --host 0.0.0.0 --port 8000`.
- Frontend: from `frontend/`, run `npm run build`, `npm run lint` or `npm run dev`.

## Version Notes

- The Phase 5.7 completion baseline was 94 tests; the current worktree baseline is 100 passing tests.
- The current frontend baseline is a clean build and lint after Phase 5.7.

---
*Refreshed: 2026-08-03 after Phase 5.7*
