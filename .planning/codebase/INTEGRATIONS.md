# External Integrations

**Analysis Date:** 2026-08-03

## Internal API Integration

- Frontend calls the FastAPI backend through `frontend/src/api.ts`.
- `fetchWithAuth` adds the JWT bearer token from localStorage.
- `fetchJson` decodes JSON and raises `ApiError` with the backend detail message.
- `VITE_API_URL` is the frontend API base URL.
- Legacy pages `PainelCozinha.tsx` and `DashboardGestao.tsx` still contain hardcoded URLs and are the explicit Phase 6 migration scope.

## Authentication

- `POST /auth/login` returns an access token and profile.
- `GET /auth/me` validates the current user.
- Backend authorization is enforced with `require_perfil`.
- Frontend authorization is enforced with `ProtectedRoute` and `Layout` navigation.

## Database

- SQLite is local and file-backed at `backend/merenda.db`.
- Database schema is created automatically; there is no production migration layer yet.
- Tests replace the application database with in-memory SQLite fixtures.

## File-Based Integration

- XML NF-e is uploaded by the browser and parsed with `fast-xml-parser`.
- Parsed rows are matched against the stock catalog and require human review before confirmation.
- XML parsing is intentionally best-effort; formal SEFAZ schema validation is out of scope.

## External Services

No external API, payment processor, email provider, webhook or cloud data service is integrated.

## Environment

- Backend environment values use `.env`/`python-dotenv` for secrets and configuration.
- Frontend environment values use Vite variables, primarily `VITE_API_URL`.
- CORS is configured by the backend for local frontend origins and must be reviewed for production deployment.

---
*Refreshed: 2026-08-03 after Phase 5.7*
