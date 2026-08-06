---
phase: 08-improvements
plan: 12
subsystem: api
tags: [planejamento, estoque, projeção, fastapi, react, typescript]

# Dependency graph
requires:
  - phase: 08-improvements
    provides: projeção cumulativa por slot e prévia com parâmetro `rascunho` (08-11)
provides:
  - Rupturas de estoque independentes por refeição, com déficit calculado contra o saldo anterior ao slot
  - Regressões para consumo repetido, slots sem ingrediente, rascunho completo e cenário sem falta
  - Prévia frontend reativa ao rascunho completo, protegida contra respostas obsoletas e com estados de carregamento/erro recuperável
affects: [UAT da Fase 8, planejamento semanal, projeção de estoque]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ruptura por slot: faltando = max(0, consumo_do_slot - max(saldo_antes_do_slot, 0))"
    - "Prévia assíncrona protegida por geração de requisição e AbortController"
    - "Badges derivados ficam ocultos durante debounce/requisição para não exibir projeção obsoleta"

key-files:
  created: []
  modified:
    - backend/main.py
    - backend/tests/test_planejamento.py
    - frontend/src/pages/admin/Planejamento.tsx
    - frontend/src/pages/admin/Planejamento.css

key-decisions:
  - "Cada slot que consome um item insuficiente recebe sua própria ruptura; não há mais supressão diária por ingrediente."
  - "Toda requisição de projeção recebe o rascunho completo da grade; respostas que não pertencem à geração atual são descartadas."

patterns-established:
  - "O saldo usado para atribuir uma falta é capturado antes do consumo do slot, preservando o déficit específico da refeição."
  - "A atualização da projeção é feedback não bloqueante: selects e salvar permanecem utilizáveis durante debounce, rede e erro."

requirements-completed: [IMP-11]

# Metrics
duration: 18min
completed: 2026-08-06
---

# Phase 08 Plan 12: Reliable Pre-save Cumulative Stock Projection Summary

**Projeção pré-salvamento confiável por refeição, com alertas cumulativos independentes por slot e proteção frontend contra rascunhos/respostas obsoletos.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-06T00:02:00Z (aprox.)
- **Completed:** 2026-08-06T00:19:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- O backend removeu a supressão diária e calcula cada `faltando` a partir do saldo anterior ao slot, sem criar alerta para ingredientes ausentes da receita.
- A suíte de planejamento ganhou quatro regressões para rupturas repetidas, déficit próprio da Janta, slots sem Batata, rascunho com duas alterações e ausência de falta.
- A tela Planejamento envia o rascunho completo, invalida projeções durante debounce, descarta respostas antigas via geração/abort e mostra feedback visual não bloqueante.
- O salvamento continua separado da simulação: apenas os fluxos POST/DELETE existentes persistem alterações.

## Task Commits

Cada task foi commitada atomicamente:

1. **task 1: Backend — ruptura específica por refeição** - `e4bdb44` (fix)
2. **task 2: Frontend — prévia reativa consistente e estado de carregamento** - `7702564` (feat)

## Files Created/Modified

- `backend/main.py` - simulação cumulativa com rupturas atribuídas a cada slot consumidor.
- `backend/tests/test_planejamento.py` - regressões P10–P13 para o contrato por refeição e rascunho completo.
- `frontend/src/pages/admin/Planejamento.tsx` - requests com rascunho integral, geração/abort, loading, erro recuperável e badges sem estado obsoleto.
- `frontend/src/pages/admin/Planejamento.css` - indicador discreto de atualização e estado de erro usando tokens do design system.

## Decisions Made

- Mantido o contrato `dias[].slots[]`, `itens`, `resumo` e `rascunho`; a correção altera apenas a granularidade do alerta.
- O contrato TypeScript existente já cobria a resposta e não precisou de alteração em `frontend/src/types.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigida expectativa do déficit da Janta no teste novo**
- **Found during:** task 1 (verificação das regressões)
- **Issue:** o teste inicialmente esperava 180 kg para a Janta, mas o slot usa somente o grupo `noite` configurado com 40 alunos.
- **Fix:** ajustada a expectativa para o consumo específico de 40 kg; a lógica de produção permaneceu conforme o plano.
- **Files modified:** `backend/tests/test_planejamento.py`
- **Verification:** `venv/bin/python -m pytest tests/test_planejamento.py -q` e suíte completa verdes.
- **Committed in:** `e4bdb44`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - bug de expectativa de teste).
**Impact on plan:** Nenhum impacto funcional; a correção tornou a regressão fiel à regra de alunos por slot.

## Issues Encountered

- Nenhum bloqueador. A suíte backend emitiu apenas três warnings de depreciação já existentes nas dependências.
- Os arquivos não relacionados `.planning/phases/08-improvements/08-UAT-ISSUES.md` e `frontend/public/nf-exemplo.xml` permaneceram intocados e não foram incluídos nos commits.

## User Setup Required

None - nenhuma configuração externa necessária.

## Known Stubs

None - os arquivos modificados não introduzem placeholders, dados vazios usados pela UI ou componentes sem fonte de dados.

## Verification

- Backend direcionado: `25 passed` em `tests/test_planejamento.py`.
- Backend completo: `156 passed` em `tests/` (152 baseline + 4 regressões novas).
- Frontend: `npm run build` passou com typecheck/bundle.
- Frontend: `npm run lint` passou.
- Verificações estáticas confirmaram ausência de `ja_negativo_no_dia`, uso do cálculo com `saldo_antes_do_slot`, envio de `montarRascunho(...)` em todas as chamadas de projeção e proteção por `geracaoProjecaoRef`/`AbortController`.

## Next Phase Readiness

- Implementação pronta para re-UAT manual: duas refeições no mesmo dia devem mostrar badges independentes; alterações rápidas devem deixar visível apenas a projeção final; limpar uma seleção deve remover o badge sem salvar.
- STATE.md, ROADMAP.md, REQUIREMENTS.md e PROJECT.md não foram alterados, conforme instrução do orquestrador.

---
*Phase: 08-improvements*
*Completed: 2026-08-06*

## Self-Check: PASSED

- SUMMARY.md e os quatro arquivos modificados existem.
- Commits `e4bdb44` e `7702564` existem no histórico.
- Backend: 156 testes passaram; frontend build e lint passaram.
- STATE.md, ROADMAP.md, REQUIREMENTS.md, PROJECT.md e `backend/venv/` não foram incluídos nem alterados por este plano.
