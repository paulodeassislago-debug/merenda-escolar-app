---
phase: 05-p-ginas-admin-frontend
plan: 07
subsystem: api
tags: [unidades-livres, conversao-interna, tipo-lanche-unificado, fastapi, react, sqlite, pydantic]

# Dependency graph
requires:
  - phase: 05-p-ginas-admin-frontend
    provides: CRUD de itens, cardápio, planejamento, entregas e refeições estabelecidos na fase 05
provides:
  - Unidades livres com conversão interna para itens de estoque (datalist + campos condicionais)
  - Tipo "Lanche" unificado com slots de serviço preservados na grade de planejamento
  - 94 testes backend passando, build e lint frontend limpos
affects: [06-painel-cozinha-modernizacao]

# Actuals (#2632)
actuals:
  tokens: 9257
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unidade livre com validação condicional: itens com unidade_oficial ∉ {KG,L} exigem unidade_interna ∈ {KG,L} + fator_conversao > 0"
    - "Separar vocabulário de TIPO (3 valores: Lanche/Almoço/Janta) de SLOT (4 valores: Lanche da Manhã/Almoço/Lanche da Tarde/Janta)"
    - "Conversão de saldo no frontend: saldo_atual (sempre kg/L) ÷ fator_conversao → exibição na unidade_oficial"

key-files:
  created: []
  modified:
    - "backend/models.py — Item com unidade_interna + fator_conversao; CardapioItem CHECK atualizado"
    - "backend/schemas.py — ItemCreate/ItemUpdate/ItemResponse com novos campos"
    - "backend/main.py — validação condicional itens; TIPOS_REFEICAO_VALIDOS encurtado; SLOTS_PLANEJAMENTO; fator_conversao em entregas"
    - "backend/merenda.db — migrações SQL (ALTER TABLE itens + rebuild cardapio_itens)"
    - "frontend/src/types.ts — Item com unidade_interna + fator_conversao"
    - "frontend/src/pages/admin/constants.ts — UNIDADES_SUGERIDAS; TIPOS_REFEICAO (3); SLOTS_REFEICAO (4)"
    - "frontend/src/pages/admin/Itens.tsx — input+datalist, campos condicionais, saldo convertido"
    - "frontend/src/pages/admin/Itens.css — .radio-group, .radio-label"
    - "frontend/src/pages/admin/Cardapio.tsx — sem mudanças de código (constantes bastam)"
    - "frontend/src/pages/admin/Planejamento.tsx — SLOTS_REFEICAO na grade; filtro slot→tipo 'Lanche'"
    - "frontend/src/pages/PainelCozinha.tsx — select com 3 opções; cardapiosPadrao unificado"
    - "backend/tests/ — test_itens.py (+10), test_cardapio.py (+2), test_planejamento.py (+3), test_refeicoes.py (+2, R5 atualizado), test_dashboard.py (assert 3 refs)"

key-decisions:
  - "Validação condicional no backend: unidade_oficial livre → exigir unidade_interna ∈ {KG,L} + fator_conversao > 0; unidade KG/L → aceitar sem conversão (compatibilidade retroativa)"
  - "Backend NUNCA converte saldo — sempre retorna valor bruto em kg/L; frontend divide por fator_conversao para exibição"
  - "fator_conversao aplicado no POST /entregas: quantidade × fator_conversao antes de somar ao saldo_atual"
  - "SLOTS_PLANEJAMENTO como constante separada de TIPOS_REFEICAO_VALIDOS — planejamento aceita 4 slots; cardápio e refeições aceitam 3 tipos"

patterns-established:
  - "Pattern: Unidade livre com conversão — input text + datalist substitui select restrito; campos condicionais (radio + number) só aparecem para unidades não-KG/L"
  - "Pattern: Slot vs Tipo — grade de planejamento usa SLOTS_REFEICAO (4 colunas) mas o filtro de dropdown mapeia slots de lanche para tipo 'Lanche' (1 tipo, 2 slots)"
  - "Pattern: Migração SQL via Python quando sqlite3 CLI indisponível — sqlite3.connect() + execute() como fallback"

requirements-completed: ["D-03", "D-12", "D-13"]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Unidades livres com conversão interna — itens aceitam unidades de cozinha (Dúzia, Pacote, Maço...) com campos condicionais de conversão para estoque interno em kg/L"
    requirement: "D-12"
    verification:
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_unidade_livre_com_conversao"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_unidade_livre_sem_conversao"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_unidade_livre_interna_invalida"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_fator_conversao_zero"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_fator_conversao_negativo"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_criar_item_kg_sem_conversao"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_put_atualiza_unidade_livre"
        status: pass
      - kind: unit
        ref: "backend/tests/test_itens.py#test_put_unidade_livre_sem_conversao"
        status: pass
      - kind: unit
        ref: "backend/tests/test_entregas.py#test_e2_recebido_incrementa_saldo"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tipo 'Lanche' unificado — cardápio aceita 3 tipos (Lanche, Almoço, Janta); grade de planejamento preserva 4 colunas como slots; pratos tipo 'Lanche' alocáveis em ambos os slots de lanche"
    requirement: "D-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_cardapio.py#test_cardapio_tipo_lanche"
        status: pass
      - kind: unit
        ref: "backend/tests/test_cardapio.py#test_cardapio_tipo_antigo_rejeitado"
        status: pass
      - kind: unit
        ref: "backend/tests/test_planejamento.py#test_planejamento_lanche_slot_manha"
        status: pass
      - kind: unit
        ref: "backend/tests/test_planejamento.py#test_planejamento_lanche_slot_tarde"
        status: pass
      - kind: unit
        ref: "backend/tests/test_planejamento.py#test_planejamento_slot_invalido"
        status: pass
      - kind: unit
        ref: "backend/tests/test_refeicoes.py#test_refeicoes_tipo_lanche"
        status: pass
      - kind: unit
        ref: "backend/tests/test_refeicoes.py#test_refeicoes_tipo_antigo_rejeitado"
        status: pass
    human_judgment: false
  - id: D3
    description: "Portões de saída — build (tsc+vite), lint (eslint), e pytest full suite passando"
    requirement: "D-13"
    verification:
      - kind: other
        ref: "cd frontend && npm run build (exit 0, zero errors)"
        status: pass
      - kind: other
        ref: "cd frontend && npm run lint (zero warnings)"
        status: pass
      - kind: other
        ref: "cd backend && pytest tests/ -v (94/94 passing)"
        status: pass
    human_judgment: false

# Metrics
duration: 31 min
completed: 2026-08-03
status: complete
---

# Phase 05 Plan 07: Unidades livres e tipo Lanche unificado

**Unidades de cozinha (Dúzia, Pacote, Maço...) com conversão interna para estoque em kg/L; tipo "Lanche" unificado com slots de serviço preservados na grade de planejamento — 94 testes verdes, build e lint limpos**

## Performance

- **Duration:** 31 min
- **Started:** 2026-08-03T02:04:49Z
- **Completed:** 2026-08-03T02:35:53Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Cadastro de itens aceita 8 unidades de cozinha via datalist (KG, L, Un, Pacote, Penca, Caixa, Dúzia, Maço) — não mais restrito a KG|L
- Para unidades não-KG/L, formulário revela campos condicionais: unidade interna (radio KG|L) + fator de conversão (>0)
- Estoque interno sempre em kg/L; tabela exibe saldo convertido: `(saldo_atual / fator_conversao).toFixed(2) unidade_oficial`
- Entregas aplicam `fator_conversao`: `saldo_atual += quantidade × item.fator_conversao`
- Cardápio e refeições aceitam 3 tipos (Lanche, Almoço, Janta) — "Lanche da Manhã" e "Lanche da Tarde" unificados em "Lanche"
- Grade de planejamento preserva 4 colunas como SLOTS: Lanche da Manhã, Almoço, Lanche da Tarde, Janta
- Pratos tipo "Lanche" aparecem nos dropdowns de ambos os slots de lanche (filtro inteligente com mapeamento slot→tipo)
- PainelCozinha.tsx: select com 3 opções (Lanche, Almoço, Janta)
- Dados existentes migrados sem perda (unidade_interna='KG', fator_conversao=1.0; cardapio_itens rebuild com novo CHECK)
- Backend: 94 testes passando; frontend: build e lint limpos

## Task Commits

Each task was committed atomically:

1. **Tarefa A: Unidade livre com conversão interna** - `61889a3` (feat)
2. **Tarefa B: Tipo "Lanche" único com slots preservados** - `1c667fc` (feat)
3. **Tarefa C: Portões de saída** - `ef27b43` (fix)

## Files Created/Modified

### Backend
- `backend/models.py` — Item: colunas `unidade_interna` e `fator_conversao`, CHECK removido; CardapioItem: CHECK atualizado para `['Lanche','Almoço','Janta']`
- `backend/schemas.py` — ItemCreate/ItemUpdate: campos novos opcionais; ItemResponse: campos novos obrigatórios
- `backend/main.py` — `UNIDADES_OFICIAIS_INTERNAS`; validação condicional em POST/PUT /itens; `TIPOS_REFEICAO_VALIDOS` (3 valores); `SLOTS_PLANEJAMENTO` (4 valores); fator_conversao em POST /entregas; GET /itens retorna novos campos
- `backend/merenda.db` — migração: ALTER TABLE itens ADD COLUMN (2 colunas); rebuild cardapio_itens com novo CHECK + dados migrados

### Frontend
- `frontend/src/types.ts` — Item interface: `unidade_interna: string` e `fator_conversao: number`
- `frontend/src/pages/admin/constants.ts` — `UNIDADES_SUGERIDAS` (8 valores); `TIPOS_REFEICAO` (3 valores); `SLOTS_REFEICAO` (4 valores)
- `frontend/src/pages/admin/Itens.tsx` — input+datalist substitui select; campos condicionais (radio KG/L + number fator); coluna saldo convertida; estados unidadeInterna/fatorConversao
- `frontend/src/pages/admin/Itens.css` — `.radio-group`, `.radio-label` estilos
- `frontend/src/pages/admin/Cardapio.tsx` — sem alterações de código (constantes bastam)
- `frontend/src/pages/admin/Planejamento.tsx` — SLOTS_REFEICAO na grade; filtro com mapeamento slot→tipo 'Lanche'
- `frontend/src/pages/PainelCozinha.tsx` — select com 3 opções; cardapiosPadrao unificado para "Lanche"

### Tests
- `backend/tests/test_itens.py` — +10 testes (unidade livre, conversão, validação condicional, compatibilidade KG/L)
- `backend/tests/test_cardapio.py` — +2 testes (tipo "Lanche" unificado, tipos antigos rejeitados)
- `backend/tests/test_planejamento.py` — +3 testes (slots "Lanche da Manhã"/"Lanche da Tarde", slot inválido)
- `backend/tests/test_refeicoes.py` — +2 testes (tipo "Lanche", tipo antigo rejeitado); R5 atualizado (3 tipos)
- `backend/tests/test_dashboard.py` — assert len(refeicoes_hoje) == 3 (era 4)

## Decisions Made

- **Validação condicional no backend:** unidade_oficial livre → exigir unidade_interna ∈ {KG,L} + fator_conversao > 0; unidade KG/L → aceitar sem conversão (compatibilidade retroativa)
- **Backend NUNCA converte saldo** — sempre retorna valor bruto em kg/L; frontend divide por fator_conversao para exibição
- **fator_conversao aplicado no POST /entregas:** `quantidade × fator_conversao` antes de somar ao `saldo_atual`
- **SLOTS_PLANEJAMENTO como constante separada** de TIPOS_REFEICAO_VALIDOS — planejamento aceita 4 slots; cardápio e refeições aceitam 3 tipos
- **Migração via Python** quando sqlite3 CLI indisponível — `sqlite3.connect()` + `execute()` como fallback

## Deviations from Plan

None — plan executed exactly as written. One minor fix in the Plan file (Cardapio.tsx didn't need code changes since the constant update sufficed). One gate fix: `test_dashboard.py` assert updated from 4→3 refeicoes_hoje entries to match unified 3-type vocabulary (Rule 3 — blocking issue, test testing obsolete behavior).

## Issues Encountered

- `sqlite3` CLI not installed on the system — used Python's built-in `sqlite3` module to execute migrations
- `test_dashboard.py` failed with `len(refeicoes_hoje) == 4` after tipo Lanche unificação — fixed to `== 3` (expected behavior for 3-type vocabulary)
- Planejamento.tsx build error: unused `TIPOS_REFEICAO` import after switching to `SLOTS_REFEICAO` — removed unused import

## Next Phase Readiness

- Phase 05 plan 07 complete — all 7 plans of Phase 05 now have SUMMARY.md files
- All exit gates green: build, lint, pytest
- Ready for Phase 06 (painel-cozinha-modernizacao)

---
*Phase: 05-p-ginas-admin-frontend*
*Completed: 2026-08-03*
<!-- gsd:write-continue -->
