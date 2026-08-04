---
phase: 06-cozinha-gestao-frontend
status: complete
nyquist_validation: true
validated: 2026-08-04
---

# Phase 6 Validation Contract

## Automated gates

| Surface | Command | Purpose |
|---|---|---|
| Frontend | `cd frontend && npm run build` | Typecheck and production bundle |
| Frontend | `cd frontend && npm run lint` | Zero lint warnings/errors |
| Meal flow | `cd backend && source venv/bin/activate && pytest tests/test_refeicoes.py -q` | Regressions for authenticated meal launch, audit, conversion and stock deduction |
| Conversion access | `cd backend && source venv/bin/activate && pytest tests/test_conversoes.py -q` | Authorization contract: cozinheira receives 200 for read-only `GET /conversoes`; conversion creation/deletion remain 403 for cozinheira and 200 for admin (no alteration endpoint is introduced) |
| Management contracts | `cd backend && source venv/bin/activate && pytest tests/test_dashboard.py tests/test_planejamento.py tests/test_refeicoes.py -q` | Regression coverage for dashboard, planning and meal response shapes |
| Phase gate | `cd backend && source venv/bin/activate && pytest tests/ -q` | Full backend baseline remains green |

No watch-mode or E2E command is required; Playwright is deferred by project decision.

## Plan-task sampling

- `06-01` Tasks 1–3 each run frontend build/lint; Task 2 also runs meal regressions.
- `06-02` Tasks 1–3 each run frontend build/lint; Task 2 also runs management/planning/meal regressions.
- The phase verification blocks repeat the full frontend gates, full backend suite and manual F13–F15 flows.

## Manual acceptance

- **F13 / MEAL-07 / MEAL-08:** as `cozinheira`, select a date, inspect all four slots, enter a positive student count before the recipe appears, verify final quantities equal base recipe quantity × students, choose pre-registered measures only through selects, adjust/include/remove ingredients with per-row justifications, confirm lunch and snack slots separately, verify the updated balances from scaled quantities, and block/guide the user when no conversion is registered. Confirm that the kitchen has no free-measure, `peso_em_kg` or conversion create/edit/delete control and that the network request sends scaled quantities plus no free measure or `peso_em_kg`.
- **F14 / F15 / MGMT-01 / MGMT-02:** as `secretaria`, inspect real stock, meals, planning and deliveries for populated and empty dates, verify converted stock and threshold 5, exercise section retry/401 recovery, and navigate through `Abrir planejamento` and `Ver entregas`.
- Check 320px, 768px and desktop layouts, keyboard dialog behavior, focus-visible controls, long justifications and independent section errors.

**Result:** All manual acceptance flows validated 2026-08-04 — 8/8 UAT tests pass (see `06-UAT.md`).
