---
phase: 08-improvements
plan: 02
subsystem: api, ui
tags: [fastapi, pydantic, react, typescript, low-stock, limiar, dashboard]

# Dependency graph
requires:
  - phase: 08-01
    provides: Item.limiar column (NOT NULL default 5.0), ItemCreate/Update/Response com limiar, types.ts Item.limiar, migracao.py ALTER TABLE
provides:
  - "Validação 400 (não 422) de limiar inválido (zero/negativo) em POST/PUT /itens (D-03)"
  - "dashboard_admin com críticos por item.limiar na unidade de exibição (D-02/D-04)"
  - "Form de Itens com campo 'Limiar de baixo estoque' + badge por item.limiar"
  - "DashboardGestao com copy dinâmica e comparação por item.limiar"
  - "Constante LIMIAR_BAIXO_ESTOQUE eliminada do frontend e do backend"
affects: [08-improvements, verificação, UAT Fase 8]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validação de regra de negócio no handler com 400 explícito (D-03) em vez de Field(gt=0) do Pydantic (que geraria 422)"
    - "Regra de alerta de baixo estoque sempre na unidade de exibição: saldo / (fator or 1.0) < (limiar or 5.0)"

key-files:
  created: []
  modified:
    - backend/main.py
    - backend/schemas.py
    - backend/tests/test_itens.py
    - backend/tests/test_dashboard.py
    - frontend/src/pages/admin/Itens.tsx
    - frontend/src/pages/admin/Itens.css
    - frontend/src/pages/admin/constants.ts
    - frontend/src/pages/DashboardGestao.tsx

key-decisions:
  - "D-03 executado como 400 via checagem explícita no handler; Field(gt=0) removido do schema porque o Pydantic rejeitaria antes do handler com 422"
  - "D-04: LIMIAR_BAIXO_ESTOQUE removida de main.py e constants.ts; todas as superfícies consomem item.limiar (default persistido 5.0)"
  - "D-02: cálculo de crítico sempre na unidade de exibição com fallbacks (fator_conversao or 1.0, limiar or 5.0) — sem divisão por zero"

patterns-established:
  - "Padrão de teste de limiar: default 5.0 no POST sem limiar; 400 para 0 e -1; PUT persiste e GET confirma"
  - "Ajuda de formulário com classe co-localizada .campo-ajuda (mesmo padrão de PainelCozinha)"

requirements-completed: [IMP-01, IMP-02]

# Metrics
duration: 40min
completed: 2026-08-05
---

# Phase 08 Plan 02: Limiar individual de baixo estoque Summary

**Backend valida limiar por item com 400 (default 5.0) e dashboard/Itens/Gestão alertam pelo limiar do próprio item na unidade de exibição — constante global LIMIAR_BAIXO_ESTOQUE eliminada**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-05
- **Completed:** 2026-08-05
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `POST/PUT /itens` rejeitam `limiar <= 0` com **400** `"limiar deve ser maior que zero"` (D-03); sem limiar → default 5.0 (IMP-01); `limiar` persistido e serializado em `ItemResponse`.
- `dashboard_admin` (`/admin/dashboard`) filtra `itens_criticos` por `(saldo / fator) < (limiar or 5.0)` e inclui `limiar` no dict — regra na unidade de exibição (D-02), sem divisão por zero (T-08-04).
- Form de Itens ganhou campo obrigatório `Limiar de baixo estoque` (`step 0.01`, `min 0.01`, default 5.0, ajuda exata da UI-SPEC, validação local > 0); POST/PUT enviam `limiar`; badge e classe `saldo-baixo` comparam com `item.limiar`.
- DashboardGestao: copy fixa "limiar de 5" substituída por `O alerta considera o limiar configurado de cada item na unidade de exibição.`; resumo e badge usam `item.limiar` (D-04).
- `LIMIAR_BAIXO_ESTOQUE` removida de `backend/main.py` e `frontend/src/pages/admin/constants.ts` — grep global em `frontend/src` retorna 0.

## task Commits

Each task was committed atomically:

1. **task 1: Validar limiar com 400 no backend e usar item.limiar no dashboard** - `6214ab6` (feat)
2. **task 2: Adicionar campo limiar ao form e badge por item em Itens.tsx** - `8d36630` (feat)
3. **task 3: Consumir limiar por item em DashboardGestao.tsx com copy dinâmica** - `2f2e477` (feat)

## Files Created/Modified
- `backend/main.py` - Constante removida; checagem 400 em `criar_item`/`atualizar_item`; `dashboard_admin` com `i.limiar or 5.0` na comparação e no dict de críticos.
- `backend/schemas.py` - `Field(5.0, gt=0)` → `Field(5.0)` e `Field(default=None, gt=0)` → `Field(default=None)` (ver Deviations).
- `backend/tests/test_itens.py` - `test_4_6_limiar_default`, `test_4_7_limiar_invalido_400`, `test_4_8_limiar_atualizado`.
- `backend/tests/test_dashboard.py` - `test_d5_limiar_individual_critico`, `test_d6_limiar_individual_estavel`.
- `frontend/src/pages/admin/Itens.tsx` - `ItemPayload.limiar`, estado `limiar` (default 5.0 / `item.limiar` na edição), campo numérico com ajuda, validação local, payload POST/PUT, badges por `item.limiar`.
- `frontend/src/pages/admin/Itens.css` - Classe `.campo-ajuda` (estilo co-localizado para o texto de ajuda).
- `frontend/src/pages/admin/constants.ts` - `LIMIAR_BAIXO_ESTOQUE` removida.
- `frontend/src/pages/DashboardGestao.tsx` - Import enxuto (`SLOTS_REFEICAO`), copy dinâmica, comparações por `item.limiar`.

## Decisions Made
- Executadas D-01..D-04 conforme 08-CONTEXT.md; nenhuma decisão nova além do ajuste de schema abaixo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Plan consistency] Removido `Field(gt=0)` dos schemas para o 400 de D-03 ser alcançável**
- **Found during:** task 1 (checagem 400 em criar/atualizar item)
- **Issue:** O schema da 08-01 tinha `limiar: float = Field(5.0, gt=0)`. Com isso, `limiar=0`/`-1` é rejeitado pelo Pydantic com **422** antes de o handler executar — mas D-03 (08-CONTEXT.md) e o teste do próprio plano (`test_4_7_limiar_invalido_400`) exigem **400**. Com o `gt=0`, o teste falharia.
- **Fix:** Removida a restrição `gt=0` de `ItemCreate.limiar` e `ItemUpdate.limiar` (mantidos os defaults 5.0/None). A checagem explícita no handler (`limiar <= 0 → 400`) passa a ser a autoridade da regra (ASVS V5.1.3 satisfeita pela validação no handler).
- **Files modified:** `backend/schemas.py` (fora da lista `files_modified` do plano — mudança mínima exigida pelos critérios de aceite do próprio plano)
- **Verification:** `test_4_7_limiar_invalido_400` passa (400 para 0 e -1); suíte completa 113 verdes.
- **Committed in:** `6214ab6` (parte do commit da task 1)

**2. [Rule 2 - Missing detail] Classe `.campo-ajuda` adicionada ao Itens.css**
- **Found during:** task 2 (campo limiar no form)
- **Issue:** O plano exige o texto de ajuda da UI-SPEC, mas Itens.css não tinha estilo de ajuda; sem a classe o texto ficaria sem o estilo `--texto-suave` usado no padrão de PainelCozinha.
- **Fix:** Regra `.campo-ajuda` co-localizada em Itens.css, replicando o padrão de `PainelCozinha.css`.
- **Files modified:** `frontend/src/pages/admin/Itens.css`
- **Verification:** build + lint verdes.
- **Committed in:** `8d36630` (parte do commit da task 2)

---

**Total deviations:** 2 auto-fixed (2 Rule 2)
**Impact on plan:** Ambos necessários para cumprir os critérios de aceite do próprio plano (400 de D-03; copy da UI-SPEC). Nenhum escopo adicional.

## Issues Encountered
- **Gate de build entre tasks 2 e 3:** a remoção de `LIMIAR_BAIXO_ESTOQUE` (task 2, constants.ts) quebra temporariamente o build enquanto `DashboardGestao.tsx` (task 3) ainda referencia a constante. Resolvido executando a task 3 em sequência e validando `npm run build && npm run lint` após as duas; cada task foi commitada separadamente com seus próprios arquivos.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend é autoridade do limiar (400, default 5.0, exposição em todos os endpoints de item e no dashboard); frontend consome `item.limiar` em todas as superfícies de alerta.
- Pronto para planos subsequentes da Fase 8 (entregas, alunos fixos, projeção) sem conflito com o limiar.

## Self-Check: PASSED
- [x] `backend/main.py` sem `LIMIAR_BAIXO_ESTOQUE`; com `limiar deve ser maior que zero` em criar/atualizar; `i.limiar` no dashboard (grep verificado)
- [x] `test_itens.py` com `test_4_6_limiar_default`, `test_4_7_limiar_invalido_400`, `test_4_8_limiar_atualizado`; `test_dashboard.py` com `test_d5_limiar_individual_critico`, `test_d6_limiar_individual_estavel`
- [x] Backend: `venv/bin/python -m pytest tests/ -q` → 113 passed (baseline 108 + 5 novos)
- [x] Frontend: `npm run build` e `npm run lint` verdes
- [x] Grep global: `LIMIAR_BAIXO_ESTOQUE` ausente em `frontend/src` e `backend/main.py`
- [x] Commits: `6214ab6`, `8d36630`, `2f2e477` existem em `git log`
- [x] STATE.md / ROADMAP.md / REQUIREMENTS.md / PROJECT.md não modificados por este executor

---
*Phase: 08-improvements*
*Completed: 2026-08-05*
