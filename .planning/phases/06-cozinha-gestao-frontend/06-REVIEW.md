---
status: findings
phase: 06
reviewed: 2026-08-04T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - backend/main.py
  - backend/schemas.py
  - backend/tests/test_conversoes.py
  - backend/tests/test_refeicoes.py
  - frontend/src/pages/DashboardGestao.css
  - frontend/src/pages/DashboardGestao.tsx
  - frontend/src/pages/PainelCozinha.css
  - frontend/src/pages/PainelCozinha.tsx
  - frontend/src/types.ts
critical: 1
warning: 5
info: 3
total: 9
---

# Phase 6: Code Review Report

**Reviewed:** 2026-08-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Phase 6 changes: the kitchen panel (`PainelCozinha`) with authenticated meal launch, recipe scaling by student count, audited ingredient adjustments, conversion-select-only measures, and the secretary dashboard (`DashboardGestao`) with four independent data sections, plus the backend endpoints they depend on (`POST /refeicoes`, `/refeicoes`, `/refeicoes/hoje`, `/conversoes`).

Baseline verified: backend suite passes (103 tests), frontend `npm run build` (typecheck + bundle) passes, all fetches go through `fetchJson`, no raw `alert`/`confirm`, no new dependencies, authz per profile enforced, `extra="forbid"` correctly blocks client-controlled identity/conversion fields (R11/R12/R15 tests confirm).

**Top concern:** the audit divergence control — the headline feature of this phase — is bypassable by simply changing the measure unit. The comparison in `lancar_refeicao_v2` and the frontend's `itemTemDivergencia` compare raw quantities across different units without conversion, and `medidaInicial()` silently falls back to the first caseira conversion when the recipe measure is a base unit (kg/L). A recipe scaled to 6 kg can be launched as "6 xícaras" (1.08 kg) with stock under-deducted and no justification recorded — corrupting the PNAE audit trail.

## Critical

### CR-01: Divergence audit compares quantities across different units without conversion — audit control bypassable by changing the measure

**File:** `backend/main.py:946-952` (also `frontend/src/pages/PainelCozinha.tsx:71-75, 64-69`)
**Issue:** In `lancar_refeicao_v2`, `quantidade_esperada = receita_item.quantidade * dados.qtd_alunos` is expressed in the *recipe's* measure (`receita_item.medida_caseira`), while `item_req.quantidade` is expressed in the *client-supplied* measure (`item_req.medida_caseira`). The check `abs(quantidade_esperada - item_req.quantidade) > 1e-9` compares raw numbers with no unit conversion. If the cook changes the measure select (e.g. recipe says 6 kg, cook selects "xícara" and leaves the quantity at 6), the quantities are numerically equal → no divergence flagged → no justification required, even though the served amount is 6 xícaras ≈ 1.08 kg instead of 6 kg.

This is aggravated by the frontend: `medidaInicial()` (PainelCozinha.tsx:64-69) falls back to `conversoes[0]` when the recipe's measure isn't among the item's caseira conversions — which is the *normal* case, since recipes are usually in "kg"/"L" (base units) and conversions hold only caseira measures. The default flow therefore sends the scaled number expressed in the first caseira conversion with `quantidadeAtual === quantidadeEsperada`, and `itemTemDivergencia()` (71-75) also compares numerically, so no justification is ever demanded. The stock deduction itself (`_converter_para_unidade_oficial`, main.py:932-937) is correct, so the actual impact is: large silent under-deduction of stock + `quantidade_original=6` recorded next to `medida_caseira="xícara"` in the audit row (`quantidade_original=quantidade_esperada` at line 974), which is unit-inconsistent and misleading for the PNAE prestação de contas.

**Fix:** Compare in a common unit. Convert the expected quantity to the official unit before comparing, e.g.:

```python
qtd_oficial = _converter_para_unidade_oficial(db, item, item_req.quantidade, item_req.medida_caseira)
quantidade_esperada = None
if receita_item is not None:
    quantidade_esperada_oficial = _converter_para_unidade_oficial(
        db, item, receita_item.quantidade * dados.qtd_alunos, receita_item.medida_caseira
    )
    divergente = abs(quantidade_esperada_oficial - qtd_oficial) > 1e-9
    # gravar quantidade_original na unidade enviada:
    # quantidade_original = quantidade_esperada_oficial / fator_da_medida_enviada
```

Frontend: make `itemTemDivergencia` measure-aware (recompute `quantidadeEsperada` in `medidaSelecionada` via `conversoes` fator, e.g. `esperada_em_medida = esperada_kg / fator`), and make `medidaInicial` prefer a conversion equal to the recipe measure — never a silent arbitrary fallback — or force the user to confirm the measure before submit.

## Warnings

### WR-01: Changing the student count silently wipes cook-entered adjustments and justifications

**File:** `frontend/src/pages/PainelCozinha.tsx:305-314`
**Issue:** `atualizarQtdAlunos` fires on every keystroke (typing "300" triggers "3" → "30" → "300"). For each non-removed recipe item it resets `quantidadeAtual` to the rescaled `quantidadeEsperada` and clears `justificativa` (`justificativa: item.removido ? item.justificativa : ''`). A cook who has already adjusted quantities and typed justifications loses all of them — with no warning — the moment they touch the student-count field (or even by the keystrokes themselves if they typed the count after filling the form). The draft silently reverts and previously valid submissions become blocked with a generic error.
**Fix:** Only rescale expectations, never overwrite user-edited state: track whether `quantidadeAtual`/`justificativa` were touched per item (e.g. `editado: boolean` set by `atualizarQuantidade`/`atualizarJustificativa`), and on rescale only update untouched items. Alternatively debounce/apply on blur instead of per-keystroke.

### WR-02: `planejamento_id` is accepted without validating consistency with `tipo_refeicao` or weekday

**File:** `backend/main.py:916-923`
**Issue:** `lancar_refeicao_v2` looks up the `Planejamento` by id and uses its recipe, but never verifies that the entry's `tipo_refeicao` corresponds to the sent `tipo_refeicao` (e.g. "Lanche da Manhã" mapped vs "Janta") or that `dia_semana` matches the launch day. A cozinheira can attach any planejamento (e.g. next week's Janta) to today's Lanche launch, producing an inconsistent audit row (`planejamento_id` pointing to a plan that has nothing to do with the launched meal).
**Fix:** After loading `plan`, validate `tipoParaLancamento(plan.tipo_refeicao) == dados.tipo_refeicao` (mirror the frontend mapping) and reject with 400 otherwise. Optionally also check `plan.dia_semana` against `date.today().weekday()` when no explicit date is provided.

### WR-03: Duplicate `item_id` rows in `dados.itens` are accepted — double deduction and duplicated audit rows

**File:** `backend/main.py:926-978`
**Issue:** Nothing deduplicates `item_id` in `RefeicaoCreate.itens`. The frontend guards against duplicates (`ingredientes.some(...)` at PainelCozinha.tsx:333), but a buggy or crafted client can send the same item twice: stock is deducted twice and two `RefeicaoItem` rows are persisted for one meal, corrupting both stock and audit history.
**Fix:** Validate in the endpoint: reject (400) or merge duplicate `item_id` entries before processing:

```python
vistos: set[int] = set()
for item_req in dados.itens:
    if item_req.item_id in vistos:
        raise HTTPException(status_code=400, detail=f"Item {item_req.item_id} duplicado no lançamento")
    vistos.add(item_req.item_id)
```

### WR-04: Clearing the date input in DashboardGestao fires three 422 requests

**File:** `frontend/src/pages/DashboardGestao.tsx:206`
**Issue:** The date input's `onChange` sets `dataReferencia` unconditionally: `onChange={(event) => setDataReferencia(event.target.value)}`. If the user clears the field, `dataReferencia` becomes `''` and the effect fires `/refeicoes?data=`, `/planejamento?data=`, `/entregas?data=` — all three fail with FastAPI 422 and every section renders an error state. PainelCozinha guards this correctly (`if (!evento.target.value) return;` at line 469); DashboardGestao does not.
**Fix:** Add the same guard:

```tsx
onChange={(event) => {
  if (!event.target.value) return;
  setDataReferencia(event.target.value);
}}
```

### WR-05: `/refeicoes/hoje` and the admin dashboard collapse multiple meals of the same type with nondeterministic selection

**File:** `backend/main.py:1022-1046`
**Issue:** There are 4 planning slots but 3 meal types — both "Lanche da Manhã" and "Lanche da Tarde" launch as "Lanche" (`tipoParaLancamento`). When both are served on the same day, `_status_refeicoes_do_dia` picks the *first* matching row per type via `next(...)` over a query with no `ORDER BY` (arbitrary row), reporting only one "Lanche" entry with the first meal's prato/alunos. The second Lanche becomes invisible in `/refeicoes/hoje` and in the admin dashboard's `refeicoes_hoje`, while `alunos_hoje.por_tipo` sums both — internally inconsistent status data.
**Fix:** Aggregate instead of picking one: for each type, report the list of meals (or sum `alunos` and list `prato`s), or at minimum add `ORDER BY models.Refeicao.id` for deterministic first-match and document the collapse.

## Info

### IN-01: Raw color literal in PainelCozinha.css violates token-only convention

**File:** `frontend/src/pages/PainelCozinha.css:290`
**Issue:** `.modal-overlay` uses `background: rgb(29 43 26 / 55%)` — a hard-coded color instead of a design token. The project convention (AGENTS.md / index.css) requires all colors from `var(--...)` tokens.
**Fix:** Add a scrim token to `frontend/src/index.css` (e.g. `--sobreposicao: rgb(29 43 26 / 55%)`) and reference `var(--sobreposicao)` here.

### IN-02: Double DB query per item for `item_nome` with a dead `or {}` branch

**File:** `backend/main.py:856-857` (also `1009-1010`)
**Issue:** `(db.query(models.Item).filter(models.Item.id == ie.item_id).first() or {}).nome if db.query(...).first() else None` runs the same query twice per item; the `or {}` branch is unreachable (the ternary guard already ensures a row exists), and `{}.nome` would raise `AttributeError` if it ever executed. Same pattern in `historico_refeicoes`.
**Fix:** Query once and hold the reference:

```python
item = db.query(models.Item).filter(models.Item.id == ie.item_id).first()
"item_nome": item.nome if item else None,
```

### IN-03: Stock balance ("Saldo após a última leitura") never populated during the normal review flow

**File:** `frontend/src/pages/PainelCozinha.tsx:96, 699, 381`
**Issue:** `saldos` starts as `{}` and is only populated inside `relerDepoisDaTentativa` (which runs after a POST attempt). `carregarReceita` fetches `/itens` into `itensCatalogo` but not into `saldos`, so during the initial recipe review — exactly when the cook needs the stock info to decide adjustments — the balance line never renders; it appears only after the first (usually successful) launch.
**Fix:** Populate `saldos` from the `/itens` response in `carregarReceita` (the fetch already happens at line 169).

---

_Reviewed: 2026-08-04T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
