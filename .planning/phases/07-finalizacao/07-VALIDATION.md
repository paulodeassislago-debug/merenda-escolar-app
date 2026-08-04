---
phase: 07
slug: finalizacao
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-04
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript/Vite build + ESLint frontend; pytest/httpx backend |
| **Config file** | `frontend/tsconfig.json`, `frontend/eslint.config.js`, `backend/tests/` |
| **Quick run command** | `cd frontend && npm run lint`; for directed backend feedback, `cd backend && source venv/bin/activate && pytest tests/test_publico.py tests/test_planejamento.py tests/test_refeicoes.py -q` |
| **Full suite command** | `cd frontend && npm run build && npm run lint`; then `cd backend && source venv/bin/activate && pytest tests/ -q` |
| **Estimated runtime** | Quick sampling is the first feedback path; the complete wave gate is approximately 60 seconds because it includes the production frontend build and the full backend suite. |

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
| 07-01-01 | 07-01 | 1 | PUBLIC-02 | T-07-01-01, T-07-01-02, T-07-01-03 | Public route remains unauthenticated; response is rendered as text without raw HTML | build + lint + manual | `cd frontend && npm run build && npm run lint` | Confirm anonymous `/cardapio`, four-slot output and name-only ingredients in the browser. | ✅ | ⬜ pending |
| 07-01-02 | 07-01 | 1 | PUBLIC-02 | T-07-01-01, T-07-01-02, T-07-01-04 | Four slots, sparse data, disclosure, focus and overflow follow the UI contract | build + lint + manual | `cd frontend && npm run build && npm run lint` | Confirm loading/error/empty/partial states, retry, exact disclosure labels, keyboard focus and 320px/768px/desktop layout. | ✅ | ⬜ pending |
| 07-02-01 | 07-02 | 2 | QUAL-05, QUAL-06 | T-07-02-01, T-07-02-02, T-07-02-05 | UAT records F1-F17 and defines controlled before/after stock and audit evidence without silent approval | artifact checks + backend regression | `test -f .planning/phases/07-finalizacao/07-VALIDATION.md && test -f .planning/phases/07-finalizacao/07-UAT.md && cd backend && source venv/bin/activate && pytest tests/test_publico.py tests/test_planejamento.py tests/test_refeicoes.py -q` | — | ✅ | ⬜ pending |
| 07-02-02 | 07-02 | 2 | QUAL-05, QUAL-06 | T-07-02-02, T-07-02-03, T-07-02-04, T-07-02-05 | F1-F17 and QUAL-06 have observed evidence; failed or missing evidence blocks approval and preserves atomicity checks | full regression + manual checkpoint | `cd frontend && npm run build && npm run lint && cd ../backend && source venv/bin/activate && pytest tests/ -q` | Execute every UAT row, including F16/F17 exact `Ver ingredientes`/`Ocultar ingredientes` behavior and QUAL-06 atomic failures; approve only with complete evidence. | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No frontend test framework, Playwright dependency, CI pipeline, schema migration, or new backend fixture is added in this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| F1 valid login and profile route | QUAL-05 | Browser routing and persisted auth state | Login with each development profile; verify `/admin`, `/gestao`, and `/cozinha` destinations. |
| F2 invalid login feedback | QUAL-05 | Visible copy and `role="alert"` | Submit invalid credentials; verify an actionable error is visible. |
| F3 protected route without session | QUAL-05 | Browser redirect | Clear auth storage, open `/admin`, verify return to `/`. |
| F4 wrong-profile route | QUAL-05 | Profile-specific navigation guard | Login as admin, open `/cozinha`, verify redirect to `/admin`. |
| F5 logout cleanup | QUAL-05 | Browser navigation and localStorage | Click `Sair`, verify `/` and both auth keys removed. |
| F6-F12 prior admin flows | QUAL-05 | Existing acceptance is manual | Re-run affected admin flows, preserving source evidence from Phase 5 in the consolidated UAT. |
| F13-F15 prior kitchen/management flows | QUAL-05 | Existing acceptance is manual | Re-run or reference the Phase 6 UAT where Phase 7 data setup does not affect behavior; record source and status. |
| F16 public menu access and day data | PUBLIC-02, QUAL-05 | Public browser rendering | Open `/cardapio` logged out; verify today’s menu loads without authentication and four slots are represented. |
| F17 public responsive polish | PUBLIC-02, QUAL-05 | Visual and keyboard behavior | Inspect 320px, 768px and desktop; verify fixed order, `A definir`, closed `Ver ingredientes`, expanded `Ocultar ingredientes`, return to `Ver ingredientes`, disclosure keyboard access, retry, wrapping and no horizontal overflow. |
| Conversion → stock → meal → audit | QUAL-06 | Requires controlled database state and browser/API evidence | Record balance before, confirm conversion and meal, verify exact deduction, meal item audit fields, and unchanged state after failed conversion/stock attempts. |

### F1-F5 Provenance

F1-F5 are reconstructed from the historical `TESTING.md` at commit `93e1be4^`, lines 103-107, and corroborated by the current auth implementation. Their exact meanings are:

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

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Quick sampling commands are defined for feedback under the full-suite runtime; the approximately 60-second delay is documented for the final wave gate.
- [ ] After all gates, F1-F17 and QUAL-06 pass with complete evidence, change frontmatter `nyquist_compliant: false` to `nyquist_compliant: true`.
- [ ] In the same conditional sign-off, change frontmatter `status: draft` to `status: approved` and change `Approval: pending` to `Approval: approved`; otherwise preserve the pending values.

**Approval:** pending
