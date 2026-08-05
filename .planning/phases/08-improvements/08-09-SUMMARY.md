---
phase: 08-improvements
plan: 09
subsystem: ui
tags: [react, typescript, projecao, planejamento, badge, disclosure]

# Dependency graph
requires:
  - phase: 08-07
    provides: "GET /planejamento/projecao (contrato configurado/dias/itens/resumo) e avisos aditivos no POST /planejamento"
provides:
  - "Badge de déficit projetado por célula da grade de Planejamento com tooltip por item (D-19)"
  - "Painel colapsável 'Projeção da semana' com tabela item | saldo atual | consumo projetado | saldo projetado final | 1º dia de ruptura"
  - "Banner não-bloqueante pós-save com avisos e ação 'Ver projeção' (scroll + open)"
affects: [08-VALIDATION (backstop manual IMP-11), fases posteriores de revisão de UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disclosure nativo <details>/<summary> para painel colapsável (padrão Fase 7)"
    - "Fetch de projeção com falha isolada (try/catch próprio) — nunca derruba a grade"
    - "Avisos do POST /planejamento com fallback derivado da projeção da semana (D-18)"

key-files:
  created: []
  modified:
    - frontend/src/types.ts
    - frontend/src/pages/admin/Planejamento.tsx
    - frontend/src/pages/admin/Planejamento.css

key-decisions:
  - "Avisos do banner usam o retorno `avisos` do POST /planejamento; quando vazios, derivam de `projecao.itens` com saldo projetado negativo (projecaoRef lido após refetch)"
  - "Falha do GET /planejamento/projecao é isolada em carregarProjecao com guarda de semana (semanaRef) — grade e save seguem funcionais"
  - "Botões btn-primario/btn-secundario definidos localmente em Planejamento.css (padrão das demais páginas admin — a página não tinha estilos de botão)"

patterns-established:
  - "Badge de alerta usa apenas tokens (--erro/--erro-fundo), tooltip nativo title multiline, contraste AA"
  - "Linhas do painel: ruptura (--erro/--erro-fundo), sobra (--verde-escuro/--verde-tint), não avaliável (--texto-suave)"

requirements-completed: [IMP-11]

# Metrics
duration: 58min
completed: 2026-08-05
---

# Phase 08 Plan 09: Stock Projection UI in Planejamento Summary

**Badge de déficit por célula, painel colapsável 'Projeção da semana' e banner não-bloqueante com 'Ver projeção' na página Planejamento, alimentados por GET /planejamento/projecao e avisos do POST (D-17/D-18/D-19/D-20)**

## Performance

- **Duration:** 58 min
- **Started:** 2026-08-05T16:05:00Z
- **Completed:** 2026-08-05T17:03:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Tipos compartilhados `ProjecaoRuptura`/`ProjecaoDia`/`ProjecaoItem`/`ProjecaoSemana` + `PlanejamentoAviso` espelhando o contrato da 08-07 (frontend/src/types.ts).
- Fetch de `GET /planejamento/projecao?data=` no efeito e no refetch pós-save com **falha isolada** (guarda de semana por `semanaRef`): erro do endpoint nunca derruba a grade nem o save (D-19).
- Badge `⚠ N item(ns) faltando` por célula com tooltip nativo `{Item} −{qtd} {unidade}` (ex.: `Arroz −12,5 kg`) quando `dias[diaIdx].rupturas.length > 0`.
- Painel colapsável `<details>` 'Projeção da semana': tabela `Item | Saldo atual | Consumo projetado | Saldo projetado final | 1º dia de ruptura`; ruptura em vermelho (`--erro`/`--erro-fundo`), sobra em verde (`--verde-escuro`/`--verde-tint`), itens sem conversão como `não avaliável` (`--texto-suave`); resumo `X item(ns) com ruptura prevista` + `sem conversão cadastrada`.
- `configurado: false` (ou erro de fetch) → painel mostra `Configure os alunos por período para ativar a projeção.` sem quebrar a grade; erro de fetch tem retry discreto.
- Banner não-bloqueante `role="status"` após salvar com copy exata `Atenção: N item(ns) podem faltar nas refeições planejadas.`, lista de itens faltantes e botão `Ver projeção` que abre o `<details>` e rola até o painel (`scrollIntoView` smooth).
- Avisos do banner: retorno `avisos` do POST /planejamento (D-18); fallback derivado de `projecao.itens` com `saldo_projetado < 0` quando o POST não retorna avisos (unidade do item resolvida na projeção, pois o aviso do POST não a carrega).

## Task Commits

Each task was committed atomically:

1. **task 1: Tipos de projeção, fetch do endpoint e badge de déficit na célula** - `905b26c` (feat)
2. **task 2: Painel 'Projeção da semana' e banner não-bloqueante com 'Ver projeção'** - `733d281` (feat)

## Files Created/Modified

- `frontend/src/types.ts` - `ProjecaoRuptura`, `ProjecaoDia`, `ProjecaoItem`, `ProjecaoSemana` (contrato GET /planejamento/projecao, D-17) e `PlanejamentoAviso` (avisos aditivos do POST, D-18).
- `frontend/src/pages/admin/Planejamento.tsx` - estado/fetch da projeção (`carregarProjecao` com guarda de semana e falha isolada), badge por célula, painel colapsável, banner de avisos, `abrirProjecao` (open + scrollIntoView), coleta de `avisos` no `handleSalvar` com fallback `derivarAvisos`.
- `frontend/src/pages/admin/Planejamento.css` - `.badge-ruptura`, `.painel-projecao` (+ corpo/aviso/resumo/tabela), `.linha-ruptura`/`.linha-sobra`/`.linha-nao-avaliavel`, `.banner-aviso` (+ título/lista/ações) e botões `.btn-primario`/`.btn-secundario` — todos com tokens institucionais apenas (zero hex novo).

## Decisions Made

- Banner usa os `avisos` do POST quando presentes; caso contrário deriva da projeção refetchada (via `projecaoRef` atualizado em `carregarProjecao`), garantindo dados frescos pós-save.
- A projeção é buscada em paralelo ao grid (não dentro do `Promise.all` crítico) com `try/catch` próprio — a grade nunca espera nem falha por causa da projeção.
- Painel posicionado dentro do form (após a grade, antes do CTA de salvar); botão `Ver projeção` com `type="button"` explícito para não submeter o form.
- Erro de fetch da projeção é estado explícito no painel (`Não foi possível carregar a projeção.` + retry), mantendo o grid e o save intactos.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Botões `btn-primario`/`btn-secundario` sem estilos na página Planejamento**
- **Found during:** task 2 (banner — ação `Ver projeção` exige `btn-secundario`)
- **Issue:** `Planejamento.css` não definia as classes de botão (as demais páginas admin definem as próprias cópias locais); o botão `Ver projeção` do plano ficaria sem estilo e os botões existentes da página (nav e salvar) já estavam sem estilo (estado pré-existente da F10).
- **Fix:** Adicionadas as definições locais `.btn-primario`/`.btn-secundario` (+ hover, focus-visible, disabled) copiadas do padrão de `Itens.css`, apenas com tokens institucionais.
- **Files modified:** frontend/src/pages/admin/Planejamento.css
- **Verification:** `npm run build && npm run lint` verdes; sem hex novo no CSS.
- **Committed in:** `733d281` (parte do commit da task 2)

**2. [Rule 2 - Missing Detail] Unidade dos itens no banner de avisos**
- **Found during:** task 2 (banner)
- **Issue:** O contrato dos `avisos` do POST /planejamento (08-07) é `{item_id, nome, faltando}` — sem `unidade_oficial`; o plano pedia `{item.nome} −{faltando} {unidade}`.
- **Fix:** Resolução da unidade a partir de `projecao.itens` por `item_id` (`unidadeDoItem`), omitindo a unidade quando a projeção não estiver disponível.
- **Files modified:** frontend/src/pages/admin/Planejamento.tsx
- **Verification:** build/lint verdes; contrato do POST não alterado (backend intacto).
- **Committed in:** `733d281` (parte do commit da task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing detail)
**Impact on plan:** Correções necessárias para a funcionalidade e o padrão visual do projeto. Sem scope creep — nenhum arquivo fora do plano foi alterado.

## Issues Encountered

- **Split de commits por task:** os dois tasks alteram o mesmo `Planejamento.tsx`; para manter commits atômicos, o estado completo foi salvo em backup, a versão task-1 foi reconstruída (sem os consumidores task-2 que causariam `noUnusedLocals`), commitada em `905b26c`, e o estado completo restaurado para o commit `733d281`. Ambos os commits passam build + lint.
- **Narrowing TypeScript no badge:** o render do badge dentro do JSX usava `projecao.dias[diaIdx]` — resolvido com variável local `diaProjecao` guardada por `projecao?.configurado`, sem non-null assertions.

## Known Stubs

None - projeção, painel e banner recebem dados reais do backend (contrato 08-07); estado `configurado: false` e erro de fetch têm mensagens explícitas no painel.

## User Setup Required

None - sem configuração de serviços externos. Backstop manual previsto em 08-VALIDATION.md (IMP-11): estoque insuficiente → badge na célula, painel com ruptura em vermelho, banner com 'Ver projeção' rolando ao painel; config vazia → mensagem de ativação.

## Next Phase Readiness

- IMP-11 completo na UI: admin e secretaria veem badge/painel/banner; cozinheira não acessa a página nem o endpoint (403 testado na 08-07 — D-20).
- Pronto para o backstop manual 08-VALIDATION e para a revisão visual da fase.
- Sem bloqueios conhecidos.

---

## Self-Check: PASSED

- Arquivos verificados: `frontend/src/types.ts`, `frontend/src/pages/admin/Planejamento.tsx`, `frontend/src/pages/admin/Planejamento.css` (presentes e commitados).
- Commits verificados: `905b26c` e `733d281` presentes em `git log`.
- Gates: `npm run build` e `npm run lint` verdes no estado commitado.
- Sem modificações em STATE.md/ROADMAP.md/REQUIREMENTS.md/PROJECT.md (STATE.md tem modificação pré-existente do orquestrador, não tocada) e nenhum arquivo de `backend/` alterado.

---
*Phase: 08-improvements*
*Completed: 2026-08-05*
