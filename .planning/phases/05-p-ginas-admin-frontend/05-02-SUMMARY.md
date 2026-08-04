---
phase: 05-p-ginas-admin-frontend
plan: 02
subsystem: ui
tags: [react, typescript, crud, estoque, conversoes, design-tokens]

requires:
  - phase: 05
    plan: 01
    provides: [types (Item, Conversao), constants (LIMIAR_BAIXO_ESTOQUE), CRUD pattern (Usuarios.tsx)]
provides:
  - Página Itens/Estoque completa com CRUD de itens
  - Destaque visual de baixo estoque (saldo < 5.0)
  - Gerenciador de conversões por item (medida caseira → kg)
affects: [05-03, 05-04, 05-05, 05-06]

actuals:
  tokens: 6600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CRUD table + modal with badge overlays (Itens.tsx as Usuarios analog)"
    - "Status badges (.status-alerta/.status-ok) with pill pattern (999px radius)"
    - "Low-stock highlighting: --erro bold 700 text only, never solid red background"
    - "Nested modal pattern for conversões embedded in item page"
    - "Inline form within modal for quick CRUD additions"

key-files:
  created:
    - frontend/src/pages/admin/Itens.css — CSS co-localizado com tokens de design + badges + conversões
  modified:
    - frontend/src/pages/admin/Itens.tsx — substitui scaffolding por CRUD completo + gerenciador de conversões

key-decisions:
  - "Peso em kg formatado com toFixed(3) na tabela de conversões (step 0.001 no input)"
  - "Gerenciador de conversões embutido como modal por item — sem página separada (RESEARCH 5.3 recomendação)"
  - "Unidade oficial restrita a select KG/L (espelha UNIDADES_VALIDAS do backend)"
  - "Saldo_atual com default 0 na criação de item (espelha default do backend)"

patterns-established:
  - "Pattern 1: .status-alerta/.status-ok — pill badges (4px 8px padding, 999px radius, 13px 600 uppercase, 0.04em letter-spacing)"
  - "Pattern 2: .saldo-baixo — color: var(--erro); font-weight: 700; (nunca fundo vermelho cheio — D-07/.planning/PROJECT.md §5.2)"
  - "Pattern 3: .modal-conversoes — max-width 600px, nested inside page modal system"
  - "Pattern 4: .conversoes-form — flex inline form with align-items: flex-end inside modal body"

requirements-completed: ["F8"]

coverage:
  - id: D1
    description: "Página Itens CRUD completa — tabela, modal criar/editar, exclusão destrutiva e destaque de baixo estoque"
    requirement: "F8"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep fetchJson<Item[]>('/itens') ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep LIMIAR_BAIXO_ESTOQUE ≥ 2 (condition + badge)"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.css — grep color: var(--erro) ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.css — grep background-color: var(--erro-fundo) ≥ 1"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gerenciador de conversões por item — modal com listagem, adição inline e exclusão destrutiva"
    requirement: "F8"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep conversoes?item_id= ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep '/conversoes' (POST) ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep /conversoes/ (DELETE) ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Itens.tsx — grep 'Nenhuma conversão' ≥ 1"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-01
status: complete
---

# Phase 05 Plan 02: Itens/Estoque CRUD com baixo estoque + Conversões por item

**Página Itens funcional com CRUD completo, destaque visual de baixo estoque (saldo < 5.0) e gerenciador de conversões medida caseira→kg embutido por item.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-01T22:11:16Z
- **Completed:** 2026-08-01T22:19:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- CRUD completo de itens via `/itens` (GET/POST/PUT/DELETE) seguindo o template Usuarios — tabela com 5 colunas (Nome, Unidade KG/L, Saldo, Status, Ações), modal criar/editar e exclusão destrutiva
- Destaque de baixo estoque que "grita": saldo < `LIMIAR_BAIXO_ESTOQUE` (5.0) exibe texto em `--erro` bold 700 + badge "Baixo estoque" (`--erro-fundo`/`--erro`); demais linhas exibem badge "OK" (`--verde-tint`/`--verde-escuro`) — nunca fundo vermelho cheio (D-07/.planning/PROJECT.md §5.2)
- Saldo formatado com `toFixed(2)`; unidade oficial restrita a select KG/L (espelha `UNIDADES_VALIDAS` do backend)
- Gerenciador de conversões embutido como modal por item — lista conversões existentes, formulário inline de adição (medida caseira + peso em kg), exclusão com confirmação destrutiva
- Peso em kg formatado com `toFixed(3)` na tabela (step 0.001 no input); erros do backend (404 item, 409 duplicada) exibidos em `role="alert"` dentro do modal
- Estados completos: carregando → erro → vazio (com copy de orientação) → conteúdo, incluindo 401 tratado como "Sua sessão expirou. Entre novamente."

## Task Commits

Each task was committed atomically:

1. **Task 1: Página Itens — CRUD de estoque com destaque de baixo estoque** — `fd1da75` (feat)
2. **Task 2: Gerenciador de conversões por item** — `101143d` (feat)

## Files Created/Modified

- `frontend/src/pages/admin/Itens.tsx` — Substitui scaffolding por CRUD completo + gerenciador de conversões (606 linhas, import type Item/Conversao, LIMIAR_BAIXO_ESTOQUE de constants.ts)
- `frontend/src/pages/admin/Itens.css` — CSS co-localizado com vocabulário compartilhado (pagina-header, card, tabela, badge, btn-*, modal-*, form-*, alerta-erro) + classes específicas (.saldo-baixo, .status-alerta, .status-ok, .modal-conversoes, .conversoes-form)

## Decisions Made

- `LIMIAR_BAIXO_ESTOQUE` importado de `./constants` — nunca literal `5.0` inline (ponto único de verdade que espelha `backend/main.py:43`)
- Peso em kg formatado com `toFixed(3)` na tabela de conversões — consistente com `step="0.001"` do input, precisão suficiente para medidas caseiras em gramas
- Unidade oficial restrita a `<select>` com opções "KG" e "L" — sem campo de texto livre (espelha validação do backend)
- Gerenciador de conversões embutido como modal na página Itens — sem página separada, conforme recomendação RESEARCH 5.3 (sem conversão, POST /refeicoes falha com 400)
- Saldo_atual default `"0"` na criação de item (input type="number" step="0.1", espelha default do backend)
- ConversõesDe limpo ao fechar modal (junto com erroConversao e excluindoConversao) — evita estado residual entre sessões de modal

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Página Itens/Estoque completa (F8) — CRUD + baixo estoque + conversões
- Padrão CRUD replicado com sucesso de Usuarios (plano 01) — pronto para Cardápio (plano 03)
- F8 verificável via `/gsd-verify-work`: item com saldo < 5.0 exibe destaque; 409 em nome duplicado visível; conversão cadastrada via UI aparece no GET /conversoes
- Nenhum arquivo fora de Itens.tsx/Itens.css tocado
- Pronto para plano 05-03 (Cardápio CRUD)

---

*Phase: 05-p-ginas-admin-frontend*
*Completed: 2026-08-01*