---
phase: 08-improvements
reviewed: 2026-08-05T22:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - backend/main.py
  - backend/migracao.py
  - backend/models.py
  - backend/schemas.py
  - backend/tests/test_alunos_por_periodo.py
  - backend/tests/test_dashboard.py
  - backend/tests/test_entregas.py
  - backend/tests/test_itens.py
  - backend/tests/test_planejamento.py
  - backend/tests/test_refeicoes.py
  - frontend/src/App.tsx
  - frontend/src/components/Layout.tsx
  - frontend/src/pages/DashboardGestao.tsx
  - frontend/src/pages/PainelCozinha.css
  - frontend/src/pages/PainelCozinha.tsx
  - frontend/src/pages/admin/Alunos.css
  - frontend/src/pages/admin/Alunos.tsx
  - frontend/src/pages/admin/Entregas.css
  - frontend/src/pages/admin/Entregas.tsx
  - frontend/src/pages/admin/Itens.css
  - frontend/src/pages/admin/Itens.tsx
  - frontend/src/pages/admin/Planejamento.css
  - frontend/src/pages/admin/Planejamento.tsx
  - frontend/src/pages/admin/constants.ts
  - frontend/src/pages/admin/matching.ts
  - frontend/src/pages/admin/nfe.ts
  - frontend/src/types.ts
findings:
  critical: 1
  warning: 4
  info: 7
  total: 12
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-08-05T22:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Reviewed the Phase 08 improvements: per-item low-stock threshold (`limiar`), delivery origin/supplier/audit rules, inline item creation (`/itens/inline`), students-per-period config with slot-derived totals, slot-based meal launch, cumulative stock projection, deterministic matching engine, and the new Alunos page + revised Entregas/PainelCozinha/Planejamento pages.

Verification performed: full backend suite passes (137 tests) and `npm run build` + `npm run lint` pass on the frontend.

Authorization boundaries are correctly implemented (PUT `/alunos-por-periodo` admin-only; deliveries/fornecedores/projection admin+secretaria; `/itens/inline` admin+secretaria while `/itens` admin-only; `POST /refeicoes` cozinheira-only; `/planejamento/projecao` blocked for cozinheira). Per-origin delivery rules (manual → observações + only `recebido`; xml → nota_numero + justification for `alterado`/`excluído`) match D-07. Slot-derived totals match D-15. `migracao.py` uses only fixed literals — no injection surface. Draft preservation in Entregas modals (D-12) is respected, matching suggestions never auto-associate (D-22), and the projection UI is correctly non-blocking (D-19). No new hex colors in CSS; no enums; `import type` conventions respected (build-verified).

However, one BLOCKER-level input-validation gap (negative delivery quantities corrupt stock) and several WARNING-level correctness issues were found: a day-misalignment bug in the projection grid badges, a unit-mismatch in the meal audit comparison, an `?data=` filter that ignores the new `data_entrega`, and a silent XML parse failure in the Entregas choice modal.

## Critical Issues

### CR-01: POST /entregas accepts negative quantities — stock tampering vector

**File:** `backend/schemas.py:147` (and effect at `backend/main.py:1103`)
**Issue:** `EntregaItemRequest.quantidade: float` has no lower bound, while the sibling `RefeicaoItemRequest.quantidade` in the same file was hardened with `Field(ge=0)` (schemas.py:200, test R13 "Quantidade negativa não pode aumentar o estoque"). The entregas endpoint is the *only* stock-mutation surface available to the secretaria role, and `item.saldo_atual += item_req.quantidade * fator` applies the raw value. A request with `{"quantidade": -1000, "acao": "recebido"}` silently reduces the stock by 1000×fator and is persisted as a "recebido" delivery — corrupting inventory with no audit trail pointing at the anomaly (negative quantity in a receipt). The same asymmetry applies to `acao: "alterado"`. This is inconsistent with the phase's own hardening of the refeições payload and leaves inventory integrity dependent on the client.
**Fix:**
```python
class EntregaItemRequest(BaseModel):
    item_id: int
    quantidade: float = Field(ge=0)  # mesmo padrão de RefeicaoItemRequest (R13)
    acao: str
    unidade: str | None = None
    fator_conversao: float | None = None
    justificativa: str | None = None
```
Add a regression test mirroring R13 (negative quantity → 422, saldo unchanged).

## Warnings

### WR-01: Projection grid badges misalign days when a weekday has no consumption

**File:** `backend/main.py:766-772` + `frontend/src/pages/admin/Planejamento.tsx:358`
**Issue:** The backend only appends a `dias` entry when the day has consumption (`if consumo_dia: dias.append(...)`), so `dias` is sparse relative to the 7-day week. The frontend accesses it positionally: `projecao.dias[diaIdx]` (line 358) and ignores the `dia_semana` field the backend provides. If a middle weekday has no planned consumption (e.g., a Wednesday holiday), every subsequent day's rupture badge is displayed in the wrong grid cell (Thursday's ruptures appear on Wednesday, Friday's on Thursday, etc.). The per-item "primeiro dia de ruptura" column in the panel is correct; only the cell badges drift.
**Fix (frontend — look up by day instead of position):**
```tsx
const diaProjecao = projecao?.configurado
  ? projecao.dias.find((d) => d.dia_semana === diaIdx)
  : undefined;
```
Alternatively, always emit all 7 days from `_simular_semana` with empty `consumo`/`rupturas` for idle days.

### WR-02: Meal audit compares quantities in different measures — false divergence and mixed-unit audit record

**File:** `backend/main.py:1367-1373`
**Issue:** `quantidade_esperada = receita_item.quantidade * qtd_alunos` is expressed in the *recipe's* measure (e.g., 0.5 kg per student → 90 "kg"), but it is compared with `item_req.quantidade`, which is expressed in the measure the cook *selected* (e.g., 180 "pacotes" for the same 90 kg). `abs(90 - 180) > 1e-9` → the meal is flagged as divergent even though the kitchen served exactly the scaled quantity, forcing an unnecessary justification; when the cook complies, the audit row stores `quantidade_original=90` (kg) against `quantidade_ajustada=180` (pacotes) — a prestação de contas record mixing units. Tests pass only because R9/R10 use the same measure on both sides.
**Fix:** compare in the same unit — convert the expected quantity with the same conversion used for the actual one:
```python
esperada_oficial = _converter_para_unidade_oficial(
    db, item, quantidade_esperada, receita_item.medida_caseira
)
divergente = receita_item is None or abs(esperada_oficial - qtd_oficial) > 1e-9
```
(and store `quantidade_original` as the value in the submitted measure, or document the unit in the field).

### WR-03: GET /entregas?data= filters by data_hora, not the new data_entrega

**File:** `backend/main.py:1127-1128`
**Issue:** The phase introduced `data_entrega` (D-05/D-09) as the meaningful delivery date, but `listar_entregas` still filters `func.date(models.Entrega.data_hora) == data.isoformat()` — the *registration* timestamp. The Gestão page ("Entregas na data", DashboardGestao.tsx:163) therefore misses deliveries registered on a previous day but delivered on the reference date, and shows deliveries registered on the reference date whose `data_entrega` is a different day. The new field is ignored by the only date-filtered read path.
**Fix:** filter by `data_entrega` when present, falling back to `data_hora` for legacy rows:
```python
if data:
    query = query.filter(
        func.coalesce(models.Entrega.data_entrega, models.Entrega.data_hora) == data.isoformat()
    )
```

### WR-04: XML parse failure in the "Nova entrega" choice modal is silent

**File:** `frontend/src/pages/admin/Entregas.tsx:729-733` (catch) vs render at 968-1027
**Issue:** `handleUploadXml`'s catch sets `setErroSubmit('Não foi possível ler o arquivo...')`, but `erroSubmit` is only rendered inside the `fluxo === 'editando'` block (line 1423-1427). When the parse fails from the choice modal (`fluxo === 'escolha'`), the user sees the file picker close and nothing else — no feedback, no way to know the upload failed. Only a subsequent "Nova entrega" click would surface the error.
**Fix:** render the error inside the choice modal as well, or use a dedicated `erroUpload` state shown in both `escolha` and `editando` flows.

## Info

### IN-01: Duplicate item+unit rows with different factors — conversion table keeps only the last

**File:** `backend/main.py:980-990, 1086-1087`
**Issue:** `conversoes_pendentes` is keyed by `(item.id, unidade.casefold())`; if two delivery lines use the same item+unit with different `fator_conversao`, each `ItemEntrega` row correctly stores its own factor, but `_upsert_conversao` persists only the last one — the stored conversion silently disagrees with the first line's recorded factor. Edge case (NF-e can repeat a product line), but the inconsistency is silent.
**Fix:** reject conflicting factors for the same (item, unit) within one payload with a 400, or skip upserting when a pending factor already exists.

### IN-02: types.ts `EntregaResumo.data_entrega: string` vs nullable backend value

**File:** `frontend/src/types.ts:150-158`
**Issue:** Backend returns `data_entrega: ... if e.data_entrega else None` (main.py:1140) — nullable for legacy deliveries — but the TS type declares `data_entrega: string`. Any code path formatting it (`new Date(null)`) will render the epoch. Also `ProjecaoDia` omits the backend's `consumo` field (harmless, but the mirror is incomplete).
**Fix:** `data_entrega: string | null` and add `consumo?: Record<string, number>` to `ProjecaoDia`.

### IN-03: Itens.tsx assumes non-null `fator_conversao` on legacy items

**File:** `frontend/src/pages/admin/Itens.tsx:105-109, 331-333`
**Issue:** `abrirModalEditar` calls `item.fator_conversao.toString()` and the table divides `item.saldo_atual / item.fator_conversao`. Items created before Phase 5.7 may have `fator_conversao = NULL` in a legacy DB (migracao.py backfills `limiar` and entrega columns but not `fator_conversao`); `null.toString()` throws and the edit modal breaks. DashboardGestao already guards this (`saldoExibicao`), Itens.tsx does not.
**Fix:** `(item.fator_conversao ?? 1)` in both spots.

### IN-04: matching `similaridade` counts duplicate tokens — inflated scores

**File:** `frontend/src/pages/admin/matching.ts:101`
**Issue:** `tokensA.filter((t) => tokensB.includes(t)).length` counts repetitions, so `["frango","frango"]` vs `["frango"]` scores 1.0 ("Todas as 2 palavras batem"). Duplicate tokens in supplier/product names can produce misleading confidence.
**Fix:** score on unique tokens (`new Set(...)`), or document the behavior.

### IN-05: Negative initial saldo accepted for items

**File:** `backend/schemas.py:46` + `frontend/src/pages/admin/Itens.tsx:474-483`
**Issue:** `ItemCreate.saldo_atual: float = 0.0` has no `ge=0`, and the Itens form's saldo input has no `min` attribute, so an item can be created with negative stock; it then permanently flags as critical. Low impact (visible, admin-only), but inconsistent with the phase's validation posture.
**Fix:** `saldo_atual: float = Field(0.0, ge=0)` and `min="0"` on the input.

### IN-06: `fator_conversao` accepted on KG/L items silently

**File:** `backend/main.py:186-216, 300-307`
**Issue:** For `unidade_oficial` KG/L the conversion validation is skipped, but `fator_conversao` is still persisted and `saldo_atual` is multiplied by it (`_criar_item_no_banco`, `atualizar_item`). A crafted payload `{unidade_oficial: "KG", fator_conversao: 2, saldo_atual: 10}` stores saldo 20; deliveries then add 2× the displayed quantity while meal launches deduct 1× — internal units drift. The UI never sends fator for KG/L, so this needs a crafted request, but the endpoint should reject it.
**Fix:** force `fator_conversao = 1.0` (ignore or 400) when `unidade_oficial` is KG/L.

### IN-07: POST /fornecedores has no duplicate-name check

**File:** `backend/main.py:427-443`
**Issue:** Creating the same supplier twice is allowed (name is not unique). The matching suggestions then present near-identical candidates, and the XML emitente preselect may bind to either. Consistent with the phase's "no auto-merge" stance, but a 409 on exact normalized-name duplicates would prevent pollution of the autocomplete.
**Fix:** 409 when a supplier with the same normalized name already exists (or defer, since D-24 defers alias persistence).

---

_Reviewed: 2026-08-05T22:00:00Z_
_Reviewer: OpenCode (gsd-code-reviewer)_
_Depth: standard_
