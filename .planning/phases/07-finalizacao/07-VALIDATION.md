---
phase: 07
slug: finalizacao
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-04
updated: 2026-08-05
approved: 2026-08-05
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript/Vite build + ESLint frontend; pytest/httpx backend |
| **Config file** | `frontend/tsconfig.json`, `frontend/eslint.config.js`, `backend/tests/` |
| **Quick run command** | `cd frontend && npm run lint`; directed backend feedback: `cd backend && source venv/bin/activate && pytest tests/test_publico.py tests/test_planejamento.py tests/test_refeicoes.py -q` |
| **Full suite command** | `cd frontend && npm run build && npm run lint`; then `cd backend && source venv/bin/activate && pytest tests/ -q` |
| **Estimated runtime** | Quick sampling on the under-30-second path; the complete wave gate is approximately 60 seconds (production frontend build + full backend suite) and is intentionally reserved for the final sign-off. |

### Command execution contract

- Frontend commands run exclusively from `frontend/`: `cd frontend && npm run build` and `cd frontend && npm run lint`.
- Backend commands run exclusively from `backend/` with the venv active: `cd backend && source venv/bin/activate && pytest tests/ -q`, `cd backend && source venv/bin/activate && pytest tests/test_publico.py -q` and `cd backend && source venv/bin/activate && pytest tests/test_refeicoes.py tests/test_planejamento.py -q`.
- Never run backend commands from the repository root: the relative `sqlite:///./merenda.db` URL would create a stray empty database at the root.
- Uvicorn starts from `backend/` (`source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000`) and Vite from `frontend/` (`npm run dev`), conforme `AGENTS.md`.

---

## Sampling Rate

- **After every implementation task:** Run `cd frontend && npm run lint` for frontend changes, or the directed backend command above for validation-artifact changes that depend on backend evidence.
- **After every plan wave:** Run the full frontend build/lint and backend suite.
- **Before `/gsd-verify-work`:** Full suite must be green and the manual UAT must have no failed rows.
- **Max feedback latency:** Keep quick sampling on the under-30-second path where available; the approximately 60-second full suite is reserved for the wave gate and final sign-off because it exercises the full build and backend regression set.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Human-check | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|-------------|--------|
| 07-01-01 | 07-01 | 1 | PUBLIC-02 | T-07-01-01, T-07-01-02, T-07-01-03 | Public route remains unauthenticated; response is rendered as text without raw HTML | build + lint + manual | `cd frontend && npm run build && npm run lint` | Confirm anonymous `/cardapio`, four-slot output and name-only ingredients in the browser (UAT F16). | ✅ | ✅ green* |
| 07-01-02 | 07-01 | 1 | PUBLIC-02 | T-07-01-01, T-07-01-02, T-07-01-04 | Four slots, sparse data, disclosure, focus and overflow follow the UI contract | build + lint + manual | `cd frontend && npm run build && npm run lint` | Confirm loading/error/empty/partial states, retry, exact disclosure labels, keyboard focus and 320px/768px/desktop layout (UAT F16/F17). | ✅ | ✅ green* |
| 07-02-01 | 07-02 | 2 | QUAL-05, QUAL-06 | T-07-02-01, T-07-02-02, T-07-02-05 | UAT records F1-F17 and defines controlled before/after stock and audit evidence without silent approval | artifact checks + backend regression | `test -f .planning/phases/07-finalizacao/07-VALIDATION.md && test -f .planning/phases/07-finalizacao/07-UAT.md && cd backend && source venv/bin/activate && pytest tests/test_publico.py tests/test_planejamento.py tests/test_refeicoes.py -q` | — | ✅ | ✅ green (32 passed em 2026-08-05) |
| 07-02-02 | 07-02 | 2 | QUAL-05, QUAL-06 | T-07-02-02, T-07-02-03, T-07-02-04, T-07-02-05 | F1-F17 and QUAL-06 have observed evidence; failed or missing evidence blocks approval and preserves atomicity checks | full regression + manual checkpoint | `cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` | Execute every UAT row, including F16/F17 exact `Ver ingredientes`/`Ocultar ingredientes` behavior and QUAL-06 atomic failures; approve only with complete evidence. | ✅ | ✅ green (build 94 módulos + lint exit 0 + 103 passed em 2026-08-05; aceite manual F1-F17/QUAL-06 aprovado integralmente — ver `07-UAT.md`) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — `*` = automated gate green; the manual human-check is recorded in `07-UAT.md` (rows F1-F17/QUAL-06) and remains pending until executed in the 07-02-02 acceptance checkpoint.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No frontend test framework, Playwright dependency, CI pipeline, schema migration, or new backend fixture is added in this phase.

---

## Non-Scope (D-07-13)

The Phase 07 validation contract explicitly excludes: external API integration, package installation, Playwright/E2E automation, CI/CD pipeline, schema migration (Alembic/PostgreSQL) and formal NF-e fiscal validation. All remain deferred to the production milestone. The gates stay exactly: `cd frontend && npm run build`, `cd frontend && npm run lint` and, from `backend/` with the venv active, `pytest tests/ -q`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | UAT Row | Test Instructions |
|---|---|---|---|---|
| F1 valid login and profile route | QUAL-05 | Browser routing and persisted auth state | F1 | Login with each development profile; verify `/admin`, `/gestao`, and `/cozinha` destinations and both persisted keys. |
| F2 invalid login feedback | QUAL-05 | Visible copy and `role="alert"` | F2 | Submit invalid credentials; verify an actionable error is visible. |
| F3 protected route without session | QUAL-05 | Browser redirect | F3 | Clear auth storage, open `/admin`, verify return to `/`. |
| F4 wrong-profile route | QUAL-05 | Profile-specific navigation guard | F4 | Login as admin, open `/cozinha`, verify redirect to `/admin`. |
| F5 logout cleanup | QUAL-05 | Browser navigation and localStorage | F5 | Click `Sair`, verify `/` and both auth keys removed. |
| F6-F12 prior admin flows | QUAL-05 | Existing acceptance is manual | F6-F12 | Prior evidence from Phase 5 preserved; flows touched by the controlled dataset are re-executed and re-recorded. |
| F13-F15 prior kitchen/management flows | QUAL-05 | Existing acceptance is manual | F13-F15 | Prior evidence from Phase 6 preserved; kitchen/management flows exercised by the QUAL-06 controlled run are re-recorded. |
| F16 public menu access and day data | PUBLIC-02, QUAL-05 | Public browser rendering | F16 | Open `/cardapio` logged out; verify today’s menu loads without authentication, four slots in fixed order, `A definir`, name-only disclosure, recipe-free/partial, loading/error/empty/retry and keyboard disclosure. |
| F17 public responsive polish | PUBLIC-02, QUAL-05 | Visual and keyboard behavior | F17 | Inspect 320px, 768px and desktop; verify 1/2/4 columns, no horizontal overflow, long-name wrapping and visible focus. |
| Conversion → stock → meal → audit | QUAL-06 | Requires controlled database state and browser/API evidence | QUAL-06 | Record balance before, confirm conversion and meal, verify exact deduction, meal item audit fields, and unchanged state after failed conversion/stock attempts. |

### F1-F5 Provenance

F1-F5 are reconstructed from the historical `TESTING.md` at commit `93e1be4^`, lines 103-107 (via `07-RESEARCH.md` → Historical F1–F5 Reconstruction), and corroborated by the current auth implementation (`frontend/src/auth.tsx:24-60`, `frontend/src/auth-context.ts:22-30`, `frontend/src/components/ProtectedRoute.tsx:15-27`, `frontend/src/pages/Login.tsx:19-30,79-87`, `frontend/src/components/Layout.tsx:43-50`). Their exact meanings are:

- F1: valid login redirects each profile to its correct route.
- F2: invalid login displays a visible error.
- F3: unauthenticated `/admin` redirects to `/`.
- F4: an admin opening `/cozinha` is redirected to `/admin`.
- F5: logout returns to `/` and removes persisted auth keys.

---

## Controlled Data Preconditions

- Run Uvicorn from `backend/` and Vite from `frontend/`; never run backend commands from the repository root.
- Back up `backend/merenda.db` before manual mutations and use unique UAT-prefixed records.
- Prepare one item and conversion, four dishes, four recipes, and four planning slots for the current weekday.
- Record stock before meal confirmation, submitted scaled quantity, conversion factor, stock after confirmation, and persisted audit fields.
- Do not copy development passwords or tokens into planning artifacts.

---

## Blocking Policy (D-07-12)

Any failure in an automated gate, in any UAT row F1-F17, in any manual state check, or in any QUAL-06 atomicity proof **blocks phase completion**. The failing flow must be corrected and re-executed before the row may be marked approved — a failure is never silently waived and an absent observation is never treated as a pass. The final sign-off below only flips `nyquist_compliant` to `true` and `status` to `approved` when every gate and every UAT row has complete evidence with `pass`; otherwise the values remain `false`/`draft` and `Approval: pending`.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Quick sampling commands are defined for feedback under the full-suite runtime; the approximately 60-second delay is documented for the final wave gate.
- [x] After all gates, F1-F17 and QUAL-06 pass with complete evidence, change frontmatter `nyquist_compliant: false` to `nyquist_compliant: true`.
- [x] In the same conditional sign-off, change frontmatter `status: draft` to `status: approved` and change `Approval: pending` to `Approval: approved`; otherwise preserve the pending values.

**Approval:** approved (2026-08-05) — gate combinado de sign-off verde (`cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` → build 94 módulos + lint exit 0 + 103 passed; direcionados: test_publico 3 passed, test_refeicoes+test_planejamento 29 passed) e aceite manual integral F1-F17/QUAL-06 concedido pelo usuário ("teste de UAT fully approved"), registrado em `07-UAT.md` sem invenção de evidências.
