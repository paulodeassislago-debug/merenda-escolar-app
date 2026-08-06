---
phase: 08-improvements
plan: 11
subsystem: api
tags: [refeicoes, extras, cardapio-publico, cozinha, planejamento, responsivo, sqlite, react, fastapi]

# Dependency graph
requires:
  - phase: 08-improvements
    provides: slot persistido e status por slot com flag extra (08-10), projeção por slot com badge de ruptura (08-10), contrato por slot de /refeicoes/hoje
provides:
  - "Refeicao.nome_extra persistido (migração idempotente) com nome obrigatório em avulsas (400 sem nome) e rejeitado em planejadas"
  - "Cardápio público em LISTA: planejada e extra do mesmo slot coexistem, ordenadas pela ordem canônica dos slots (planejada primeiro)"
  - "Campo 'Nome da refeição' no lançamento avulso (max 120) e nome da extra no card da cozinheira com tag EXTRA"
  - "Padrão único de tag (Confirmado/Disponível/Pendente/EXTRA) e cards da cozinha com áreas previsíveis e altura uniforme"
  - "Grid do Planejamento com área de aviso reservada em todas as células e overflow horizontal controlado (320px/768px/desktop)"
affects: [verificação UAT re-manual (re-UAT de extras nomeadas e layout), 09 (fase seguinte)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contrato público por slot: /publico/cardapio responde lista com tipo_refeicao (= rótulo do momento = slot), nome_refeicao, slot, extra e ingredientes — sem deduplicação por slot"
    - "Nome da extra como identidade: prato de /refeicoes/hoje e nome_refeicao do histórico usam nome_extra; o nome extra nunca substitui o prato planejado (rejeitado no backend)"
    - "Área de aviso reservada: wrapper vertical estável por célula com min-height fixo para o badge de ruptura, presente ou não"
    - "Fallback de slot para avulsas legadas no cardápio público: primeiro slot canônico cujo tipo derivado casa (mesmo critério do status por slot)"

key-files:
  created: []
  modified:
    - backend/models.py
    - backend/migracao.py
    - backend/schemas.py
    - backend/main.py
    - backend/tests/test_refeicoes.py
    - backend/tests/test_publico.py
    - backend/tests/test_dashboard.py
    - frontend/src/types.ts
    - frontend/src/pages/PainelCozinha.tsx
    - frontend/src/pages/PainelCozinha.css
    - frontend/src/pages/CardapioPublico.tsx
    - frontend/src/pages/CardapioPublico.css
    - frontend/src/pages/admin/Planejamento.tsx
    - frontend/src/pages/admin/Planejamento.css

key-decisions:
  - "Refeição planejada com nome_extra no payload é REJEITADA (400) — o prato do planejamento é a única identidade; o nome extra nunca o substitui"
  - "No /publico/cardapio, tipo_refeicao das extras é o nome canônico do slot (rótulo do momento de serviço), alinhado ao contrato das planejadas"
  - "Ingredientes de uma extra no cardápio público são os itens efetivamente servidos (quantidade_ajustada) — transparência do que foi oferecido"
  - "Avulsa legada (sem slot e sem nome) publica no primeiro slot cujo tipo derivado casa; sem slot derivável não publica"

patterns-established:
  - "Slot como chave pública: agrupamento do cardápio por `slot` no frontend (sem Map por tipo que elimine duplicatas)"
  - "Badge padronizado: inline-flex, min-height 28px, 14px/600, padding 4px 10px, raio 999px; EXTRA distinto por --amarelo + borda --verde-escuro, sem crescer"
  - "Área de ação ancorada: .slot-card-acao com margin-top:auto mantém o botão na base do card independente do tamanho do título"

requirements-completed: [IMP-10, PUBLIC-01, PUBLIC-02]

# Metrics
duration: 41min
completed: 2026-08-05
---

# Phase 08 Plan 11: Named Extra Meals + Aligned Kitchen & Planejamento Layout Summary

**Refeições extraordinárias com nome obrigatório persistido e publicadas no cardápio público junto das planejadas (sem ocultação), cards da cozinheira e tags padronizados, e grid do Planejamento com área de aviso reservada e overflow controlado**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-05T15:10:00Z (aprox.)
- **Completed:** 2026-08-05T15:51:00Z (aprox.)
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- **Extras nomeadas (backend)** — `Refeicao.nome_extra` nullable com migração idempotente (legado intocado); `POST /refeicoes` exige nome não vazio em avulsas (400 ausente/só espaços, T-08-17) e rejeita nome_extra em planejadas; `GET /refeicoes` serializa `nome_extra` + `nome_refeicao`; `/refeicoes/hoje` devolve o nome da extra no campo `prato` com `extra: true`.
- **Cardápio público combinado** — `/publico/cardapio` reestruturado para LISTA de entradas (`tipo_refeicao`, `nome_refeicao`, `slot`, `extra`, `ingredientes`) ordenada pela ordem canônica dos 4 slots, planejada primeiro e extras por id dentro do slot — planejada e extra do mesmo slot aparecem simultaneamente, sem dedup. Ingredientes da extra = itens efetivamente servidos. (T-08-18/T-08-19: sem dados de usuário/auditoria, escopo limitado à data.)
- **Lançamento avulso com nome** — modal da cozinheira ganhou campo obrigatório "Nome da refeição" (max 120, antes dos ingredientes) enviado como `nome_extra`; o card do slot exibe o nome da extra com a tag EXTRA.
- **Cards e tags padronizados** — `slots-grade` com linhas uniformes, `slot-card` com `height: 100%` e áreas previsíveis (topo/nome/metadados/ação com `margin-top: auto`); títulos longos quebram (`overflow-wrap`) sem deslocar tags/botões; Confirmado/Disponível/Pendente/EXTRA com a mesma métrica (min-height 28px, 14px, padding 4px 10px, raio 999px), EXTRA distinto via `--amarelo` + borda `--verde-escuro` (tokens existentes).
- **Cardápio público multi-entrada** — renderização por slot agrupando todas as entradas (sem Map que elimine duplicatas); extra com nome próprio + tag EXTRA; disclosure/estados vazio/erro/loading e responsividade preservados; ids de heading únicos por entrada (a11y).
- **Grid do Planejamento estável** — célula com wrapper `.planejamento-celula-conteudo` (coluna flex, `min-width: 0`), área `.planejamento-celula-aviso` com `min-height: 32px` em TODAS as células (badge ou placeholder) — avisos de ruptura não desalinham selects/colunas; badge quebra dentro da célula; grade `width: 100%` + `min-width: 640px` com `overflow-x: auto` no container (320px/768px/desktop); banner com `overflow-wrap` sem deslocar a grade.

## task Commits

Cada task foi commitada atomicamente:

1. **task 1: Backend — nome da refeição extra e cardápio público combinado** - `9498c0b` (feat)
2. **task 2: Frontend — nome da extra e cards da cozinha alinhados** - `d114abc` (feat)
3. **task 3: Frontend — grid responsivo do Planejamento sem desalinhamento** - `128997d` (feat)

**Plan metadata:** `e60be83` (docs: plan) — anterior à execução.

## Files Created/Modified

- `backend/models.py` - `Refeicao.nome_extra` (String, nullable)
- `backend/migracao.py` - ALTER `refeicoes.nome_extra` idempotente em `_ALTERACOES_REFEICOES` (sem backfill — legado intocado)
- `backend/schemas.py` - `RefeicaoCreate.nome_extra` (opcional no schema, `max_length=120`; obrigatoriedade validada no handler para 400 claro)
- `backend/main.py` - validação/persistência do nome extra; `nome_refeicao`/`nome_extra` no histórico; prato = nome_extra em `/refeicoes/hoje`; `/publico/cardapio` em lista com `_slot_fallback_por_tipo`
- `backend/tests/test_refeicoes.py` - R21 atualizado (nome no prato); R23/R24/R25 novos; avulsas existentes ganharam `nome_extra`
- `backend/tests/test_publico.py` - P4/P5 novos (coexistência no mesmo slot; extra sozinha)
- `backend/tests/test_dashboard.py` - D1 com `nome_extra`
- `frontend/src/types.ts` - `RefeicaoPublica`/`IngredientePublico`, `RefeicaoHistorico.nome_refeicao/nome_extra`, `RefeicaoCreatePayload.nome_extra`
- `frontend/src/pages/PainelCozinha.tsx` - campo nome da avulsa + payload `nome_extra`; card com nome da extra e estrutura topo/nome/metadados/ação
- `frontend/src/pages/PainelCozinha.css` - `.slot-card` height 100%, `.slot-card-nome/metadados/acao`, `.estado-badge` padronizado, `.estado-badge-extra` distinto sem crescer, `.campo-nome-extra`
- `frontend/src/pages/CardapioPublico.tsx` - agrupamento por slot sem dedup; entradas múltiplas com tag EXTRA; ids únicos
- `frontend/src/pages/CardapioPublico.css` - `.publico-entradas/.publico-entrada/.publico-tag-extra`
- `frontend/src/pages/admin/Planejamento.tsx` - `.planejamento-celula-conteudo` + `.planejamento-celula-aviso` sempre presente
- `frontend/src/pages/admin/Planejamento.css` - área reservada (min-height 32px), `min-width: 0`, quebra do badge, grade `width: 100%` + container `overflow-x: auto`

## Decisions Made

- **Planejada nunca recebe nome extra:** `POST /refeicoes` rejeita (400) nome_extra em refeição com `planejamento_id` — contrato explícito (T-08-17), sem caminho para o nome extra substituir o prato planejado.
- **`tipo_refeicao` público = rótulo do slot:** no `/publico/cardapio`, extras usam o nome canônico do slot como `tipo_refeicao` (mesmo das planejadas) — o frontend agrupa por `slot` e o rótulo exibido é o momento de serviço, não o tipo derivado Lanche/Almoço/Janta.
- **Ingredientes da extra = servidos:** o cardápio público lista para extras os `refeicao_itens` reais (quantidade_ajustada), não receita — transparência do que foi oferecido.
- **Avulsas legadas:** sem slot → fallback pelo primeiro slot cujo tipo derivado casa (mesmo critério do status por slot de 08-10); sem nome → `nome_refeicao: null` e o frontend exibe "Refeição extraordinária".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Testes novos colidiram com fixtures existentes**
- **Found during:** task 1 (verificação dos novos testes)
- **Issue:** P4 criava um item "Arroz" que colidia com o item já criado por `_seed_cardapio_do_dia` (409 → KeyError); R25 lançava refeição planejada sem receita cadastrada, caindo na regra de divergência (400 "justificativa obrigatória") em vez de validar o contrato de nome.
- **Fix:** P4 usa item "Feijão"; R25 cadastra a receita (2 kg × 180 alunos) antes do lançamento planejado.
- **Files modified:** backend/tests/test_publico.py, backend/tests/test_refeicoes.py
- **Verification:** suíte completa verde (152 passed).
- **Committed in:** 9498c0b

**2. [Rule 2 - Missing detail] Ids de heading duplicados no cardápio público multi-entrada**
- **Found during:** task 2 (duas entradas no mesmo slot geravam o mesmo `id` para `aria-labelledby`)
- **Issue:** com planejada + extra no mesmo slot, dois `<h2>` compartilhavam `publico-prato-{i}` — a11y quebrada.
- **Fix:** id único por entrada (`publico-prato-{i}-{j}`); a `<section>` referencia o primeiro heading da entrada.
- **Files modified:** frontend/src/pages/CardapioPublico.tsx
- **Verification:** `npm run build` + `npm run lint` verdes.
- **Committed in:** d114abc

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing detail)
**Impact on plan:** Nenhum — correções contidas nos próprios testes/componentes do plano.

## Issues Encountered

- Nenhum bloqueador. Backend dev (uvicorn sem --reload) e Vite (5173) continuaram rodando; o backend será reiniciado pelo orquestrador para carregar o novo código.

## User Setup Required

None - nenhuma configuração externa necessária (migração aplicada automaticamente no startup; dev DB verificado com 2 execuções).

## Next Phase Readiness

- 152 testes backend verdes (147 baseline + 5 novos: R23/R24/R25, P4/P5); testes existentes de avulsas atualizados para o contrato de nome obrigatório.
- `npm run build` e `npm run lint` verdes.
- Migração `nome_extra` idempotente: 2 execuções no merenda.db dev sem erro; coluna presente; 0 registros legados alterados (avulsa legada permanece com nome NULL e o cardápio público a publica via fallback de slot).
- Pendente: re-UAT manual (lançar extra "Lasanha" → card da cozinheira, `/cardapio` com planejada+extra no mesmo slot; cards com títulos longos; Planejamento com avisos alternados em 320px/768px/desktop).
- Sem bloqueadores conhecidos.

---

*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED

- 14 arquivos do plano modificados existem (verificados via `[ -f ]`).
- 3 commits de task existem: `9498c0b`, `d114abc`, `128997d` (verificados via `git log`).
- Nenhum commit de task deletou arquivos rastreados (diff-filter=D vazio em todos).
- Backend: `152 passed` (147 baseline + 5 novos).
- Frontend: `npm run build` e `npm run lint` verdes.
- Migração: 2 execuções no merenda.db dev — idempotente; coluna `nome_extra` presente; legado intocado (0 registros alterados).
- STATE.md / ROADMAP.md / REQUIREMENTS.md / PROJECT.md não foram modificados (verificado via git status).
