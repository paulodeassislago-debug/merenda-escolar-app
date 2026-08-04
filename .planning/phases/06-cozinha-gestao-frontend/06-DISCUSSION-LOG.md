# Phase 6 Discussion Log

**Phase:** 06-cozinha-gestao-frontend
**Date:** 2026-08-03
**Mode:** Canonical-context discussion

## Context Used

The phase discussion was grounded in `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `AGENTS.md`, `backend/requirements.txt`, the current backend schemas/routes, and the final Phase 5.7 summary. The legacy pages were inspected to identify exactly which behavior must be replaced.

## Decisions Captured

### Kitchen source of truth

- Selected API-backed planning and recipes over local defaults.
- Selected `GET /planejamento?data=` plus `GET /cardapio/{id}/receita` for the selection flow.
- Selected `POST /refeicoes` with `planejamento_id` and per-item justifications; user identity remains JWT-derived.
- Preserved four planning slots while sending one of the three meal types to the meal endpoint.

### Management data

- Selected the endpoints authorized for secretary (`/itens`, `/refeicoes`, `/planejamento`, `/entregas`) instead of the admin-only `/admin/dashboard`.
- Selected existing planning and delivery routes for navigation.
- Required explicit loading, error, empty and populated states with no legacy `/estoque` dependency.

### Presentation and quality

- Preserved the institutional light visual language, co-located CSS and existing shell/route guards.
- Kept implementation details such as exact card/table composition as agent discretion for research and planning.
- Locked build, lint and full backend regression as exit gates.

### Measure responsibility refinement

- The backend may accept new measure/conversion values, but creating, editing and deleting those values is an admin responsibility.
- The kitchen editor must load the item's existing conversions and expose them in a select only; it must not provide a free-text measure field or ad hoc `peso_em_kg` input.
- Because the current `GET /conversoes` authorization excludes `cozinheira`, the Phase 6 plan permits the minimal read-only authorization adjustment while preserving admin-only mutations.
- Missing conversions block confirmation with guidance to the admin rather than silently creating a conversion.

## Legacy Reconciliation

- The former `DESIGN.md` is no longer a project file; its retained visual decisions are in `.planning/PROJECT.md` and `frontend/src/index.css`.
- The former `TESTING.md` is no longer a project file; its acceptance gates are in `.planning/codebase/TESTING.md`.
- `backend/requirements.txt` is part of the canonical runtime context and must remain unchanged unless a later implementation task explicitly requires a dependency change.

## Deferred

- Phase 7 work and infrastructure automation remain deferred as listed in `06-CONTEXT.md`.

---

*Phase: 06-cozinha-gestao-frontend*
*Discussion captured: 2026-08-03*
