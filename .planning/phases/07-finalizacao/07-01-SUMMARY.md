---
phase: 07-finalizacao
plan: 01
subsystem: ui
tags: [react, css, publico, cardapio, disclosure, acessibilidade, responsivo]

# Dependency graph
requires:
  - phase: 04-autenticacao
    provides: fetchJson/fetchWithAuth em frontend/src/api.ts e rota pública /cardapio sem ProtectedRoute
  - phase: 05-p-ginas-admin-frontend
    provides: SLOTS_REFEICAO em frontend/src/pages/admin/constants.ts e tokens institucionais em frontend/src/index.css
  - phase: 06-cozinha-gestao-frontend
    provides: padrões de CSS co-localizado, foco visível e estados explícitos (DashboardGestao.css, PainelCozinha.css)
provides:
  - "CardapioPublico.tsx: loader com fetchJson, normalização esparsa para quatro slots, hierarquia prato-first, disclosure nativo e estados explícitos"
  - "CardapioPublico.css: shell institucional, grid responsivo 1/2/4 colunas, foco acessível, hit area de disclosure e wrapping sem clipping"
affects: [07-02 (UAT F16/F17), verificação visual manual, verificador de fases]

# Actuals (#2632) — chars/4 sobre o diff realizado (12.852 chars)
actuals:
  tokens: 3213
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Normalização de resposta esparsa no cliente com Map por tipo_refeicao + SLOTS_REFEICAO como única ordem"
    - "Disclosure nativo <details>/<summary> com texto alternado via onToggle, sem estado duplicado de abertura"
    - "Estado vazio distinto de slot ausente: mensagem do contrato + quatro cartões A definir"

key-files:
  created: []
  modified:
    - frontend/src/pages/CardapioPublico.tsx
    - frontend/src/pages/CardapioPublico.css

key-decisions:
  - "fetchJson('/publico/cardapio') substitui fetch direto; nenhuma URL paralela e nenhuma segunda camada HTTP (CONVENTIONS.md)"
  - "SLOTS_REFEICAO como fonte única da ordem operacional; slots omitidos sintetizados como prato nulo com ingredientes vazios"
  - "Detalhes/summary nativos com alternância de rótulo via onToggle (React 19); hit area mínima de 44px no summary"
  - "Grid responsivo explícito 1fr → repeat(2, minmax(0, 1fr)) → repeat(4, minmax(0, 1fr)) nos breakpoints 600px e 960px"
  - "Campos técnicos (quantidade, medida_caseira) permanecem apenas no tipo de transporte; só item_nome chega ao JSX"

patterns-established:
  - "Estados públicos: loading sem cartões sintéticos; erro em role=alert com retry que limpa dados transitórios; vazio com copy do contrato + 4 cartões A definir"
  - "Semântica de cartão: section com aria-labelledby no heading do prato; rótulo do slot secundário"

requirements-completed: [PUBLIC-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Rota pública /cardapio consumindo GET /publico/cardapio via fetchJson, sem autenticação e sem segunda camada HTTP"
    requirement: PUBLIC-02
    verification:
      - kind: integration
        ref: "backend/tests/test_publico.py#test_p1_cardapio_publico_com_data (3 passed)"
        status: pass
      - kind: other
        ref: "cd frontend && npm run build && npm run lint (passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Normalização esparsa para quatro cartões na ordem fixa Lanche da Manhã → Almoço → Lanche da Tarde → Janta, prato dominante, A definir para slot/prato nulo e disclosure nome-only"
    requirement: PUBLIC-02
    verification:
      - kind: other
        ref: "cd frontend && npm run build && npm run lint (passed)"
        status: pass
    human_judgment: true
    rationale: "Frontend não possui framework de teste automatizado e Playwright está adiado; a ordem fixa, os textos exatos do disclosure e a leitura prato-first são verificados manualmente nos backstops F16/F17 do plano 07-02 (07-UAT.md)."
  - id: D3
    description: "Estados loading/erro/vazio/parcial, retry recuperável, foco por teclado e layout sem overflow em 320px, 768px e desktop (1/2/4 colunas)"
    requirement: PUBLIC-02
    verification:
      - kind: other
        ref: "cd frontend && npm run build && npm run lint (passed)"
        status: pass
    human_judgment: true
    rationale: "Backstops manuais de loading, erro, vazio, partial, long-text, teclado e viewport são exercidos no navegador pelo UAT do plano 07-02, conforme seção <verification> do plano 07-01."

# Metrics
duration: 16min
completed: 2026-08-05
status: complete
---

# Phase 7 Plan 1: Cardápio Público Responsivo Summary

**Normalização cliente-side da resposta esparsa de `GET /publico/cardapio` em quatro cartões na ordem operacional fixa (Lanche da Manhã → Almoço → Lanche da Tarde → Janta), com prato dominante, disclosure nativo nome-only (`Ver ingredientes`/`Ocultar ingredientes`), estados loading/erro/vazio explícitos com retry recuperável e grid responsivo 1/2/4 colunas sem overflow.**

## Performance

- **Duração:** 16 min
- **Início:** 2026-08-04T23:57:00Z
- **Conclusão:** 2026-08-05T00:13:00Z
- **Tarefas:** 2
- **Arquivos modificados:** 2 (250 inserções, 61 deleções)
- **Gates:** `npm run build` ✅ · `npm run lint` ✅ · `pytest tests/test_publico.py` ✅ (3 passed)

## Accomplishments

- `fetchJson` centralizado substitui o `fetch` direto; `/cardapio` permanece pública sem token e sem URL fixa — nenhum segundo cliente HTTP.
- Normalização dos quatro slots com `SLOTS_REFEICAO` como fonte única: resposta fora de ordem ou com slots omitidos vira sempre quatro cartões na ordem operacional; `A definir` é estado normal de slot/prato ausente (D-07-05 a D-07-08).
- Hierarquia prato-first (D-07-01): rótulo de slot secundário (12px label), nome do prato dominante em serif (20px heading); prato retornado permanece visível mesmo sem receita (D-07-03).
- Disclosure nativo `<details>/<summary>` fechado inicialmente, com `Ver ingredientes` → `Ocultar ingredientes` via `onToggle` e retorno ao texto original ao recolher; somente `item_nome` é renderizado, com fallback `Ingrediente não informado`; zero ingredientes mostra `Ingredientes não informados.` sem disclosure (D-07-02, D-07-04).
- Estados distintos: `Carregando cardápio…` sem cartões sintéticos; erro exato em `role="alert"` com `Tentar novamente` que limpa erro e dados transitórios; vazio com heading/body do contrato e ainda os quatro cartões `A definir`.
- CSS co-localizado conforme UI-SPEC: grid 1 coluna (320–599px), 2 colunas (600–959px), 4 colunas (≥960px) com `minmax(0, 1fr)` e `min-width: 0`; `overflow-wrap: anywhere` sem ellipsis/clipping; hit area mínima de 44px no summary; `:focus-visible` verde em summary e retry; escala 4/8/16/24/32/48 e tipografia 400/700 do contrato.
- Threat model mitigado: sem raw HTML (T-07-01-01), campos técnicos fora do JSX (T-07-01-02), rota e endpoint públicos preservados com regressão P1–P3 verde (T-07-01-03), retry limpa estado transitório e layout não cria overflow (T-07-01-04).

## Task Commits

Cada tarefa foi commitada atomicamente:

1. **Task 1 (tracer): Completar o slice público de dados esparsos até o cartão do prato** - `3ab5ab0` (feat)
2. **Task 2: Expandir estados, recuperação, responsividade e backstops de leitura pública** - `b2c94cb` (feat)

**Metadata do plano:** `docs(07-01)` (commit final, após o SUMMARY)

## Files Created/Modified

- `frontend/src/pages/CardapioPublico.tsx` - Loader com `fetchJson<RefeicaoPublica[]>('/publico/cardapio')`, tipo de transporte com campos técnicos apenas para desserialização, `normalizarQuatroSlots` (Map por `tipo_refeicao` + `SLOTS_REFEICAO`), seções por slot com `aria-labelledby`, disclosure nativo com rótulos alternados via `onToggle`, estados loading/erro/vazio/parcial com retry.
- `frontend/src/pages/CardapioPublico.css` - Shell institucional preservado (logo branco, serif, rodapé PNAE), grid responsivo 1/2/4 colunas, cartões com borda superior verde 3px, estados loading/vazio/erro, botão de retry e summary com `:focus-visible`, `overflow-wrap` em nomes longos, hit area de 44px no disclosure.

## Decisions Made

- **`fetchJson` no lugar de `fetch` direto:** segue CONVENTIONS.md ("new pages must not use raw fetch or hardcoded API URLs") sem criar segunda camada HTTP; a rota continua pública porque `fetchJson` só anexa token quando existe, e visitantes não têm token.
- **`SLOTS_REFEICAO` importado de `./admin/constants`:** fonte única da ordem operacional, evitando duplicar a lista de slots no componente público.
- **`<details>/<summary>` nativo com `onToggle`:** preserva semântica nativa (teclado, aria-expanded implícito); o estado `ingredientesAbertos` só controla o rótulo textual, nunca a abertura.
- **Breakpoints explícitos em vez de `auto-fit/minmax`:** a matriz 1/2/4 do UI-SPEC (320–599/600–959/≥960) fica verificável no CSS sem depender de largura mínima de coluna derivada.
- **Mensagem de vazio + quatro cartões `A definir`:** atende o UI-SPEC (empty ≠ loading ≠ erro) mantendo a distinção operacional dos slots.
- **`A definir` sem `text-transform: uppercase`:** preserva os nomes operacionais completos do contrato (D-07-08) na apresentação e na leitura por leitores de tela.

## Deviations from Plan

None - plan executed exactly as written. As duas tasks seguiram o escopo previsto (apenas `CardapioPublico.tsx` e `CardapioPublico.css` foram alterados; nenhuma rota, endpoint, dependência ou camada de autenticação nova).

## Issues Encountered

- **Gate do tracer em modo interativo:** o prompt de execução sequencial exige SUMMARY.md completo e o plano declara `autonomous: true` sem tasks de checkpoint; os backstops manuais (320px/768px/desktop, teclado) são explicitamente delegados ao plano 07-02 pela seção `<verification>` do plano 07-01 ("Manual backstops in the next plan exercise the rendered states"). Por isso a execução prosseguiu até o fim sem pausa de verificação humana — a verificação visual acontece no UAT 07-02 (F16/F17).
- **`react-hooks/set-state-in-effect`:** o padrão de carregamento do `Dashboard.tsx` (função de carregar chamada no `useEffect` com `eslint-disable-next-line`) foi reutilizado; lint verde.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PUBLIC-02 implementado sem alterações no backend e sem novas dependências; build, lint e regressão P1–P3 verdes.
- Pronto para o plano 07-02 (07-02-PLAN.md): consolidação do UAT F1–F17 (incluindo os backstops manuais F16/F17 de loading, erro, vazio, partial, long-text, teclado e viewport), evidência ponta a ponta conversão → baixa → refeição → auditoria e marcação final dos gates QUAL-05/QUAL-06.
- Estados visuais prontos para inspeção manual: `npm run dev` em `frontend/` + `uvicorn main:app --reload` em `backend/`, abrir `/cardapio` deslogado.

## Self-Check: PASSED

- ✅ `frontend/src/pages/CardapioPublico.tsx` existe no disco
- ✅ `frontend/src/pages/CardapioPublico.css` existe no disco
- ✅ Commit `3ab5ab0` (Task 1) presente no histórico
- ✅ Commit `b2c94cb` (Task 2) presente no histórico

---
*Phase: 07-finalizacao*
*Completed: 2026-08-05*
