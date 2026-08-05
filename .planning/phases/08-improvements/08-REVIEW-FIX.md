---
phase: 08-improvements
fixed_at: 2026-08-05T16:07:43Z
review_path: .planning/phases/08-improvements/08-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-08-05T16:07:43Z
**Source review:** `.planning/phases/08-improvements/08-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical + 4 Warning; Info-level items untouched per scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: POST /entregas accepts negative quantities — stock tampering vector

**Files modified:** `backend/schemas.py`, `backend/tests/test_entregas.py`
**Commit:** `b077a5d`
**Applied fix:** `EntregaItemRequest.quantidade` now uses `Field(ge=0)`, mirroring `RefeicaoItemRequest` (R13). Decision: **`ge=0`, not `gt=0`** — the handler treats `quantidade: 0` as legitimate for `acao: "excluído"` rows (E4 sends `{"quantidade": 0, "acao": "excluído"}` and the saldo-mutation branch only applies `item_req.quantidade * fator` for `recebido`/`alterado`). A negative `recebido`/`alterado` quantity now fails Pydantic validation with 422 before any stock mutation. Regression test `E19` added: negative quantity for both `recebido` (−1000) and `alterado` (−5) → 422, saldo unchanged, no delivery row persisted.

### WR-01: Projection grid badges misalign days when a weekday has no consumption

**Files modified:** `frontend/src/pages/admin/Planejamento.tsx`
**Commit:** `dbbf5b3`
**Applied fix:** The cell badge now looks up the projection day by the `dia_semana` field the backend provides (`projecao.dias.find((d) => d.dia_semana === diaIdx)`) instead of positional access (`projecao.dias[diaIdx]`). Since `_simular_semana` only appends days **with** consumption, the sparse array no longer shifts rupture badges into the wrong grid column. (Chose the frontend fix over "always emit 7 days" — keeps the backend payload lean and honors the existing `dia_semana` contract already in `types.ts`.)

### WR-02: Meal audit compares quantities in different measures — false divergence and mixed-unit audit record

**Files modified:** `backend/main.py`, `backend/tests/test_refeicoes.py`
**Commit:** `495b870`
**Status: fixed: requires human verification** (logic change — see note)
**Applied fix:** In `lancar_refeicao_v2`, the expected recipe-scaled quantity is now converted to the official unit with the same conversion table used for the submitted quantity (`_converter_para_unidade_oficial(db, item, quantidade_esperada, receita_item.medida_caseira)`), and the divergence check compares `esperada_oficial` against `qtd_oficial` — always in kg/L. The audit row stores `quantidade_original` expressed in the **submitted measure** (`esperada_oficial / fator_enviado`), so `medida_caseira`, `quantidade_original` and `quantidade_ajustada` share one unit. Fallback preserved: if the recipe measure has no registered conversion, the historical raw comparison is kept (with raw expected value in the audit row). Regression test `R20` added: recipe 0.5 kg/aluno (90 kg for 180 alunos) served as 180 pacotes (0.5 kg each) → **200 without justification** (previously false 400); real divergence (170 pacotes = 85 kg) still requires justification; audit record stores original=180/ajustada=170 in pacotes.
**Human verification note:** this changes the divergence *decision* logic (recipe measure conversion may raise/fallback) — please sanity-check the fallback branch behavior with a recipe whose measure has no conversion registered before closing the phase.

### WR-03: GET /entregas?data= filters by data_hora, not the new data_entrega

**Files modified:** `backend/main.py`, `backend/tests/test_entregas.py`
**Commit:** `e106a1c`
**Applied fix:** `listar_entregas` now filters by `func.date(func.coalesce(data_entrega, data_hora)) == data.isoformat()`. Decision: **keep the `data_hora` fallback** — `data_entrega` is nullable for legacy rows (D-10), so a hard filter on `data_entrega` would silently drop pre-Phase-8 deliveries from the Gestão "Entregas na data" view. `func.date()` normalizes the datetime `data_hora` to its day for a correct string comparison in SQLite. E9 updated to assert the new semantics (delivered 2026-07-01, registered today → appears only under `?data=2026-07-01`, not under today); new `E9b` regression test inserts a legacy row (`data_entrega=None`) directly and asserts the `data_hora` fallback matches.

### WR-04: XML parse failure in the "Nova entrega" choice modal is silent

**Files modified:** `frontend/src/pages/admin/Entregas.tsx`
**Commit:** `8f3a767`
**Applied fix:** `erroSubmit` is now rendered inside the choice modal (`fluxo === 'escolha'`) after the flow buttons, so a failed `parseNfe` (or unreadable file) shows "Não foi possível ler o arquivo. Verifique se é um XML de NF-e válido." immediately in the modal where the user picked the file — no need to re-open "Nova entrega" to discover the failure. The existing render in the editor flow is unchanged, and the error is cleared when opening/closing the modal.

## Verification

- Backend: `venv/bin/python -m pytest tests/ -q` → **140 passed** (baseline 137 + E19, E9b, R20), 3 pre-existing SQLAlchemy warnings.
- Frontend: `npm run build` → green (typecheck included); `npm run lint` → 0 issues.
- Git: each finding committed atomically (`fix(08): {id} {desc}`); no files outside the findings were modified; `.planning/STATE.md` and `backend/venv/` (pre-existing local modifications) were never staged.

## Deviations

- Worktree isolation not used: `git worktree add` for branch `main` failed because the primary working directory already holds the only checkout of `main` (git forbids two worktrees on the same branch), and this run is the only session touching the repo. Operated directly in the working tree with explicit-path staging only.
- WR-03 filter uses `func.date(func.coalesce(...))` rather than the bare `coalesce(...) == date` from the review suggestion — the bare form would not match legacy `data_hora` datetime strings in SQLite (datetime vs `YYYY-MM-DD` literal comparison), defeating the fallback the review asked to keep.
- `_payload_entrega` test helper extended to allow overriding `data_entrega` (default unchanged, so existing tests unaffected).

---

_Fixed: 2026-08-05T16:07:43Z_
_Fixer: OpenCode (gsd-code-fixer)_
_Iteration: 1_
