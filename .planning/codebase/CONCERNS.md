# Codebase Concerns

**Analysis Date:** 2026-08-03

## Active Before Phase 6

- `frontend/src/pages/PainelCozinha.tsx` still contains legacy API URLs, `id_usuario: 1` and hardcoded menu data.
- `frontend/src/pages/DashboardGestao.tsx` still contains legacy API access and must become the secretary management surface.
- The backend uses `create_all` rather than migrations; acceptable for local SQLite, unsafe for production evolution.
- There is no CI/CD pipeline.
- Frontend acceptance is mainly manual; Playwright is deferred.
- XML NF-e parsing is best-effort and requires human review/matching.

## Domain Risks

- Missing conversion entries can block meal submission; the UI must expose conversion management and clear errors.
- Planning has four slots but only three cardapio/meal types; careless refactors can reintroduce the old four-type contract.
- Relative SQLite paths can create a second empty database if commands run from the wrong directory.
- Stock changes must remain atomic so failed delivery or meal validation cannot leave partial balances.
- Justification records are part of the audit trail and must not be dropped during UI modernization.

## Documentation Risks Addressed

- Canonical GSD project and requirement files were missing; they are now present.
- The old root action plan duplicated GSD responsibilities; its relevant information was consolidated into canonical files and phase summaries.
- Legacy product docs had stale unit/type/test claims; current behavior is now recorded in `PROJECT.md`, `REQUIREMENTS.md` and Phase 5 summaries.

## Production Concerns

- Replace development/default secrets before deployment.
- Review CORS origins and environment variables for the VPS.
- Introduce PostgreSQL migrations and a backup/rollback strategy before production data is considered durable.
- Add automated CI and E2E coverage before relying on unattended releases.

---
*Refreshed: 2026-08-03 after Phase 5.7*
