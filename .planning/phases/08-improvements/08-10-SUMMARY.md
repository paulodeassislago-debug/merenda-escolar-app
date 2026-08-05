---
phase: 08-improvements
plan: 10
subsystem: api
tags: [entregas, projecao, refeicoes, planejamento, uat, sqlite, react, fastapi]

# Dependency graph
requires:
  - phase: 08-improvements
    provides: entregas com origem/fornecedor (D-05..D-10), alunos por período (D-14..D-16b), projeção cumulativa (D-17..D-20), matching (D-21..D-24)
provides:
  - "id_usuario_nome e observacoes nas entregas (listagem e detalhe)"
  - "Projeção por slot (dias[].slots[].rupturas) com rascunho de pré-visualização"
  - "Refeicao.slot persistido + status de refeições por slot com flag extra (avulsas)"
  - "Botão de confirmação de entrega sem disable silencioso + hint dinâmico"
  - "Badge de projeção por slot e refetch reativo com debounce no Planejamento"
  - "Foco ancorado no alertdialog de descarte e tag EXTRA nos cards da cozinheira"
  - "Fornecedor e observações nas entregas do /gestao e no modal de detalhe"
affects: [09 (fase seguinte), 08-11, verificação UAT re-manual]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pré-visualização por rascunho: parâmetro de consulta `rascunho` (dia|slot|cardapio_item_id) com entradas inválidas ignoradas — nunca persiste"
    - "Ruptura granular por slot: registrada no slot em que o saldo corrente fica negativo pela primeira vez no dia"
    - "Contrato de status por slot: /refeicoes/hoje e /admin/dashboard respondem 4 slots com `extra` para avulsas"
    - "Migração idempotente com backfill via SQL UPDATE (sem Alembic)"

key-files:
  created: []
  modified:
    - backend/main.py
    - backend/models.py
    - backend/migracao.py
    - backend/tests/test_entregas.py
    - backend/tests/test_planejamento.py
    - backend/tests/test_refeicoes.py
    - backend/tests/test_dashboard.py
    - frontend/src/types.ts
    - frontend/src/pages/admin/Entregas.tsx
    - frontend/src/pages/admin/Entregas.css
    - frontend/src/pages/admin/Planejamento.tsx
    - frontend/src/pages/PainelCozinha.tsx
    - frontend/src/pages/PainelCozinha.css
    - frontend/src/pages/DashboardGestao.tsx
    - frontend/src/pages/admin/Dashboard.tsx
    - frontend/src/pages/admin/Dashboard.css

key-decisions:
  - "Ruptura da projeção passou a ser registrada apenas no slot em que o saldo fica negativo pela primeira vez no dia (sem repetição nos slots seguintes)"
  - "Rascunho da projeção aceita entradas malformadas/slot inválido/prato inexistente e as ignora (T-08-14) — pré-visualização nunca bloqueia nem persiste"
  - "Avulsa legada (planejamento_id NULL) permanece com slot NULL — sem como derivar o lanche; status por slot usa fallback por tipo_refeicao para legado"
  - "O botão de confirmação de entrega habilitado com linhas ativas: validações completas movidas para o handleSubmit com mensagem visível + hint dinâmico"
  - "Badge 'Confirmado' da cozinheira derivado do contrato por slot de /refeicoes/hoje (estado local slotConfirmado removido)"

patterns-established:
  - "Status de refeição por slot: `{slot, status, extra, prato, alunos}` — 4 slots canônicos"
  - "Projeção por slot: `dias[].slots[]` sem consumo/rupturas de nível de dia"
  - "Pré-visualização reativa com debounce ~300ms e cancelamento do timer anterior"
  - "Foco ancorado em alertdialog com retorno ao elemento que o abriu"

requirements-completed: [IMP-06, IMP-07, IMP-11, MEAL-02, IMP-09, IMP-10]

# Metrics
duration: 68min
completed: 2026-08-05
---

# Phase 08 Plan 10: UAT Gap Closure Summary

**7 correções do UAT manual: nome real do registrador e observações nas entregas, projeção por slot com rascunho reativo, slot persistido nas refeições com status por slot e tag EXTRA para avulsas, botão de confirmação sem disable silencioso, detalhes de entrega completos (admin + secretaria) e foco ancorado no diálogo de descarte da cozinheira**

## Performance

- **Duration:** 68 min
- **Started:** 2026-08-05T13:40:00Z (aprox.)
- **Completed:** 2026-08-05T14:48:00Z (aprox.)
- **Tasks:** 6
- **Files modified:** 17

## Accomplishments

- **obs #3/#2d** — `GET /entregas` e `GET /entregas/{id}` resolvem `id_usuario_nome` (nome real, padrão `fornecedor_nome`); observações disponíveis na listagem; modal de detalhe e rota /gestao exibem fornecedor + observações.
- **obs #5/#4** — Projeção granular por slot: `dias[].slots[].rupturas` aponta só o slot afetado; `GET /planejamento/projecao` aceita `rascunho` (`dia|slot|cardapio_item_id`) para pré-visualizar sem salvar (entradas inválidas ignoradas — T-08-14); UI reativa com debounce ~300ms.
- **obs #7** — `Refeicao.slot` persistido (migração idempotente com backfill via planejamento); `/refeicoes/hoje` e `/admin/dashboard` respondem por slot (4 slots) com `extra: true` para avulsas; cards da cozinheira mostram "Confirmado" + badge **EXTRA**.
- **obs #1** — Botão "Confirmar recebimento" nunca mais mudo: desabilitado apenas sem linhas ativas/salvando; linhas incompletas produzem hint dinâmico e mensagem de erro visível.
- **obs #2/#3** — Listagem mostra Fornecedor (fallback "—"); modal de detalhe exibe Fornecedor, Observações, Registrado por (nome) e datas.
- **obs #6** — Alertdialog de descarte ancora o foco no primeiro botão ao abrir; Escape/"Continuar editando" devolvem o foco ao elemento que o abriu.

## task Commits

Cada task foi commitada atomicamente:

1. **task 1: Backend — nome do usuário e observações nas entregas** - `4680feb` (feat)
2. **task 2: Backend — projeção por slot + rascunho** - `3533911` (feat)
3. **task 3: Backend — slot persistido na refeição e status por slot com EXTRA** - `9e06fb9` (feat)
4. **task 4: Frontend Entregas — botão sem disable silencioso e detalhes da entrega** - `1f4c04d` (feat)
5. **task 5: Frontend Planejamento — badge por slot e projeção reativa** - `e102de5` (feat)
6. **task 6: Frontend Cozinheira + Secretaria — foco do diálogo, tag EXTRA e entregas no gestao** - `3ac8739` (feat)

**Plan metadata:** commit final pendente (docs: complete plan).

## Files Created/Modified

- `backend/main.py` - `id_usuario_nome` nas entregas; `_parse_rascunho` + `_simular_semana` por slot; `slot=dados.slot` no lançamento; `slot`/`extra` no histórico; `_status_refeicoes_do_dia` por `SLOTS_PLANEJAMENTO`
- `backend/models.py` - `Refeicao.slot` (String, nullable)
- `backend/migracao.py` - ALTER `refeicoes.slot` + backfill idempotente via planejamento
- `backend/tests/test_entregas.py` - F6/F7 (nome do usuário e observações)
- `backend/tests/test_planejamento.py` - P3 revisado; P7/P8/P9 (ruptura por slot, rascunho altera projeção, rascunho malformado ignorado)
- `backend/tests/test_refeicoes.py` - R5/R10 revisados; R21/R22 (avulsa com EXTRA, planejada sem EXTRA)
- `backend/tests/test_dashboard.py` - D1/D2 ajustados ao contrato de 4 slots
- `frontend/src/types.ts` - `EntregaResumo.id_usuario_nome/observacoes`, `EntregaDetalhe.id_usuario_nome`, `ProjecaoSlot`, `ProjecaoDia.slots`, `RefeicaoHistorico.slot/extra`, `StatusSlotRefeicao`, `DashboardRefeicaoHoje.slot`
- `frontend/src/pages/admin/Entregas.tsx` - botão sem disable silencioso + hint; coluna Fornecedor; modal de detalhe completo
- `frontend/src/pages/admin/Entregas.css` - `.submit-area`, `.hint-submit`, `.detalhe-meta` estruturado
- `frontend/src/pages/admin/Planejamento.tsx` - badge por slot; refetch com rascunho (debounce 300ms)
- `frontend/src/pages/PainelCozinha.tsx` - cards com status por slot + badge EXTRA; foco no alertdialog de descarte
- `frontend/src/pages/PainelCozinha.css` - `.slot-badges`, `.estado-badge-extra`
- `frontend/src/pages/DashboardGestao.tsx` - tabela de entregas com Fornecedor e Observações
- `frontend/src/pages/admin/Dashboard.tsx` / `Dashboard.css` - consumidor de `refeicoes_hoje` migrado para o contrato por slot + badge EXTRA

## Decisions Made

- **Ruptura por slot:** registrada apenas no slot em que o saldo corrente fica negativo pela primeira vez no dia; item já negativo em slot anterior do mesmo dia não repete (obs #5).
- **Rascunho tolerante:** entradas malformadas, slot inválido ou prato inexistente são ignoradas silenciosamente (T-08-14) — a pré-visualização nunca bloqueia nem persiste.
- **Legado de avulsas:** refeições avulsas antigas (planejamento_id NULL) seguem com `slot` NULL (sem como derivar o lanche); o status por slot cai no fallback por `tipo_refeicao` derivado.
- **Botão de confirmação:** habilitado com linhas ativas; todas as validações (item/quantidade/unidade/cabeçalho/justificativas) acontecem no `handleSubmit` com `erroSubmit` + hint dinâmico de linhas incompletas (obs #1).
- **Badge da cozinheira:** "Confirmado"/"EXTRA" derivados do contrato por slot de `/refeicoes/hoje`; o estado local `slotConfirmado` (baseado em `entrada.id`) foi removido.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Consumidor admin de `/refeicoes/hoje` quebrado pela mudança de contrato**
- **Found during:** task 3 (contrato de /refeicoes/hoje muda para slots)
- **Issue:** `frontend/src/pages/admin/Dashboard.tsx` consumia `refeicoes_hoje` por `ref.tipo_refeicao` — o tipo `DashboardRefeicaoHoje` perdeu esse campo e o typecheck/build quebrariam (a task 6 previa apenas PainelCozinha/DashboardGestao).
- **Fix:** Dashboard admin passou a usar `ref.slot` como chave/legenda e ganhou badge EXTRA (`.badge-extra` com tokens existentes).
- **Files modified:** frontend/src/pages/admin/Dashboard.tsx, frontend/src/pages/admin/Dashboard.css, frontend/src/types.ts
- **Verification:** `npm run build` + `npm run lint` verdes.
- **Committed in:** 3ac8739 (parte da task 6)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessário para manter o frontend admin íntegro após a mudança de contrato prevista no próprio plano. Sem escopo extra.

## Issues Encountered

- **httpx `params` substitui a query string da URL:** no teste P9, `client.get("/projecao?data=...", params={"rascunho": [...]})` descartava o `data` — o teste passou a enviar ambos via `params`. (Problema do harness de teste, não da aplicação.)
- **Lint `react-hooks/set-state-in-effect`:** chamar `carregarStatusRefeicoes()` (que seta estado) dentro de `useEffect` foi rejeitado pelo lint — refatorado para promise chain inline com flag `cancelado`, padrão já usado no arquivo.
- **`extra` em lançamentos avulsos:** R5 e D2 lançam refeições sem `planejamento_id` — a primeira versão dos asserts esperava `extra: false`; corrigido para `extra: true` (o caso planejado com `extra: false` é coberto por R22).

## User Setup Required

None - nenhuma configuração externa necessária (migração aplicada automaticamente no startup / dev DB verificado).

## Next Phase Readiness

- 7 observações do UAT (08-UAT-ISSUES.md) implementadas e cobertas por testes (147 backend verdes, build/lint frontend verdes).
- Migração idempotente verificada no merenda.db dev (coluna `slot` + backfill completo: 0 linhas com slot NULL e planejamento_id definido).
- Pendente: re-UAT manual dos 7 pontos pelo usuário (execução dupla da migração validada).
- Sem bloqueadores conhecidos.

---
*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED

- 17 arquivos do plano existem (verificados via `[ -f ]`).
- 6 commits de task existem: `4680feb`, `3533911`, `9e06fb9`, `1f4c04d`, `e102de5`, `3ac8739` (verificados via `git log`).
- Nenhum commit de task deletou arquivos rastreados (diff-filter=D vazio em todos).
- Backend: `147 passed` (140 baseline + 2 F + 3 P + 2 R).
- Frontend: `npm run build` e `npm run lint` verdes.
- Migração: 2 execuções no merenda.db dev — idempotente; coluna `slot` presente; backfill completo (0 linhas com slot NULL e planejamento_id definido).
