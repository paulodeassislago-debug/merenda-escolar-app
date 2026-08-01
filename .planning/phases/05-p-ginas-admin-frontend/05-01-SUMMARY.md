---
phase: 05-p-ginas-admin-frontend
plan: 01
subsystem: ui
tags: [react, typescript, crud, dashboard, admin-panel, design-tokens]

requires:
  - phase: 04
    provides: [JWT auth, ProtectedRoute, Layout, fetchJson, AuthContext]
provides:
  - Tipos compartilhados Admin (types.ts com ~16 interfaces)
  - Constantes (TIPOS_REFEICAO, DIAS_SEMANA, LIMIAR_BAIXO_ESTOQUE, PERFIL_ROTULOS)
  - 6 rotas protegidas registradas em App.tsx (D-05)
  - Página Usuários CRUD completa (F7) — template para planos 02-03
  - Dashboard admin real com 4 cards + 3 seções (F6)
  - Scaffolding das 5 páginas da Wave 2 (planos 02-05)
affects: [05-02, 05-03, 05-04, 05-05, 05-06]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CRUD table + modal pattern (Usuarios.tsx como template)"
    - "fetchJson<T> + ApiError como único caminho de API"
    - "CSS plain co-localizado com tokens var(--*)"
    - "Ternário carregando → erro → conteúdo (zero inline styles)"
    - "Modal overlay rgba(18,76,15,0.35) verde translúcido (re-tokenizado de PainelCozinha.css)"

key-files:
  created:
    - frontend/src/pages/admin/constants.ts — constantes compartilhadas (.ts puro, sem JSX)
    - frontend/src/pages/admin/Usuarios.tsx — CRUD completo de usuários
    - frontend/src/pages/admin/Usuarios.css — CSS co-localizado com tokens de design
    - frontend/src/pages/admin/Dashboard.tsx — dashboard real com 4 cards + 3 seções
    - frontend/src/pages/admin/Dashboard.css — CSS co-localizado do dashboard
    - frontend/src/pages/admin/Itens.tsx — scaffolding (plano 05-02)
    - frontend/src/pages/admin/Cardapio.tsx — scaffolding (plano 05-03)
    - frontend/src/pages/admin/Receitas.tsx — scaffolding (plano 05-04)
    - frontend/src/pages/admin/Planejamento.tsx — scaffolding (plano 05-05)
    - frontend/src/pages/admin/Entregas.tsx — scaffolding (plano 05-06)
  modified:
    - frontend/src/types.ts — +~16 interfaces admin (Item, Conversao, CardapioItem, ReceitaItem, PlanejamentoEntrada, AcaoEntrega, EntregaResumo, EntregaDetalhe, ItemEntrega, EntregaItemRequest, DashboardResponse + 5 sub-shapes); legados (Ingrediente, PratoPadrao, ItemEstoque, Perfil, Usuario, LoginResponse) intactos
    - frontend/src/App.tsx — 6 novas rotas /admin/* com ProtectedRoute+Layout (D-05)

key-decisions:
  - "AcaoEntrega como union literal 'recebido' | 'alterado' | 'excluído' — 'excluído' COM acento (backend rejeita variantes com 400)"
  - "Password omitido do payload PUT quando vazio no modal de edição — backend mantém senha atual"
  - "Usuarios.tsx definido como template do padrão CRUD para os planos 02-03 (Itens e Cardápio)"
  - "Modal overlay re-tokenizado: rgba(18, 76, 15, 0.35) em vez do preto legado"

patterns-established:
  - "Pattern 1: CRUD page = tabela (tabela-container > table > thead/tbody) + modal (modal-overlay > modal-content > modal-header + form) + estados carregando/erro/conteúdo"
  - "Pattern 2: fetchJson<T> padrão com catch (err instanceof ApiError) exibindo err.message em role=\"alert\""
  - "Pattern 3: CSS tokens-only — classes .pagina-header, .card, .tabela, .badge-* (perfil/status), .btn-primario/.btn-secundario/.btn-perigo, .modal-overlay/.modal-content, .form-group/.form-input, .alerta-erro"
  - "Pattern 4: useEffect com cancelled flag para evitar setState pós-unmount (compatível com react-hooks/set-state-in-effect)"

requirements-completed: ["F6", "F7"]

coverage:
  - id: D1
    description: "Fundação compartilhada — tipos admin, constantes e 6 rotas protegidas em App.tsx"
    requirement: "F6"
    verification:
      - kind: unit
        ref: "npm run build (tsc -b && vite build)"
        status: pass
      - kind: unit
        ref: "npm run lint (eslint — zero warnings)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Página Usuários CRUD completa — tabela, modal criar/editar e exclusão destrutiva"
    requirement: "F7"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Usuarios.tsx — grep fetchJson ≥ 4"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Usuarios.tsx — grep role=\"alert\" ≥ 1"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dashboard admin real com 4 metric cards + 3 seções (Refeições, Itens críticos, Entregas)"
    requirement: "F6"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Dashboard.tsx — fetchJson<DashboardResponse>('/admin/dashboard')"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Dashboard.tsx — null handling: Prato não definido, Nenhuma entrega registrada ainda."
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false
  - id: D4
    description: "Scaffolding das 5 páginas da Wave 2 com componentes default válidos"
    verification:
      - kind: unit
        ref: "grep 'export default function' em Itens/Cardapio/Receitas/Planejamento/Entregas.tsx"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-08-01
status: complete
---

# Phase 05 Plan 01: Fundação compartilhada + Usuários CRUD + Dashboard real

**Fatia vertical tracer — tipos, constantes, rotas, página CRUD-modelo (Usuários), Dashboard completo e scaffolding das 5 páginas restantes**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-01T21:53:46Z
- **Completed:** 2026-08-01T22:03:38Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Tipos compartilhados Admin: ~16 interfaces adicionadas em `src/types.ts` (Item, Conversao, CardapioItem, ReceitaItem, PlanejamentoEntrada, EntregaResumo, EntregaDetalhe, ItemEntrega, EntregaItemRequest, DashboardResponse + 5 sub-shapes) sem quebrar tipos legados (Ingrediente, PratoPadrao, ItemEstoque)
- Constantes compartilhadas em `constants.ts` (`.ts` puro, sem JSX — regra react-refresh): TIPOS_REFEICAO (4), DIAS_SEMANA (7), LIMIAR_BAIXO_ESTOQUE (5.0), PERFIL_ROTULOS (Record<Perfil, string>)
- 6 novas rotas em `App.tsx`: `/admin/usuarios`, `/admin/itens`, `/admin/cardapio`, `/admin/receitas/:id` (admin), `/admin/planejamento`, `/admin/entregas` (admin + secretaria) — todas dentro de `<ProtectedRoute><Layout>`
- Página Usuários CRUD completa (F7): tabela com badges de perfil, modal criar/editar (senha vazia omitida do PUT, 409 duplicado exibido em `role="alert"`), modal destrutivo de exclusão, ternário carregando → erro → conteúdo — serve como template para os planos 02-03
- Dashboard admin real (F6): 4 cards de métricas com `border-top: 3px solid var(--verde-vivo)`, seção Refeições de hoje (4 tipos sempre, badges Confirmado/Pendente, null como "Prato não definido"), seção Itens críticos (lista com `toFixed(2)`, vazio como "Nenhum item em baixo estoque."), seção Entregas (últimos 7/30 dias, null como "Nenhuma entrega registrada ainda.")
- Scaffolding das 5 páginas da Wave 2 com componentes default válidos — substituídos pelos planos 02-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Fatia vertical end-to-end** — `d4fcf5c` (feat)
2. **Task 2: Dashboard admin real** — `5794655` (feat)

## Files Created/Modified

- `frontend/src/types.ts` — Adiciona ~16 interfaces admin após seção auth; legados intactos
- `frontend/src/pages/admin/constants.ts` — Constantes compartilhadas (`.ts` puro)
- `frontend/src/App.tsx` — 6 novas rotas `/admin/*` com ProtectedRoute+Layout
- `frontend/src/pages/admin/Usuarios.tsx` — CRUD completo (tabela + modal + delete)
- `frontend/src/pages/admin/Usuarios.css` — CSS co-localizado com tokens var(--*)
- `frontend/src/pages/admin/Dashboard.tsx` — 4 metric cards + 3 seções com dados reais
- `frontend/src/pages/admin/Dashboard.css` — CSS co-localizado do dashboard
- `frontend/src/pages/admin/Itens.tsx` — Scaffolding (plano 05-02)
- `frontend/src/pages/admin/Cardapio.tsx` — Scaffolding (plano 05-03)
- `frontend/src/pages/admin/Receitas.tsx` — Scaffolding (plano 05-04)
- `frontend/src/pages/admin/Planejamento.tsx` — Scaffolding (plano 05-05)
- `frontend/src/pages/admin/Entregas.tsx` — Scaffolding (plano 05-06)

## Decisions Made

- `AcaoEntrega` como union literal com "excluído" acentuado — backend rejeita variantes sem acento (400). Tipagem forte evita erros silenciosos.
- `LIMIAR_BAIXO_ESTOQUE = 5.0` em `constants.ts` — espelha `backend/main.py:43`, único ponto de verdade para F8.
- Senha vazia no modal de edição → campo omitido do payload PUT — backend mantém a senha atual.
- `DIAS_SEMANA` indexado pelo valor do backend (0=Segunda…6=Domingo), com comentário sobre conversão `(jsDay + 6) % 7`.
- Modal overlay re-tokenizado de `PainelCozinha.css`: `rgba(18, 76, 15, 0.35)` (verde translúcido conforme DESIGN.md) em vez do preto legado `rgba(0,0,0,0.6)`.
- Usuarios.tsx definido como template do padrão CRUD para Itens e Cardápio (planos 02-03).
- useEffect com `cancelled` flag — compatível com regra `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v6+).
- Responsividade do dashboard: `dashboard-grid` com `repeat(auto-fit, minmax(260px, 1fr))` — 4 cards em desktop, empilha em telas estreitas.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Lint `react-hooks/set-state-in-effect`:** O eslint-plugin-react-hooks v6+ detecta `setState` síncrono dentro de `useEffect`. Solução: inicializar fetch diretamente no efeito com flag `cancelled` para prevenir setState pós-unmount, mantendo `carregarUsuarios` como função de refetch para operações CRUD. Aplicado tanto em Usuarios quanto em Dashboard.

## Threat Flags

No new threat surface beyond the plan's threat model. All mitigations from the plan executed:
- T-05-01-01 (EoP via rotas): ProtectedRoute com `perfis` explícitos por rota (D-05)
- T-05-01-02 (Info Disclosure via senha): Senha omitida do GET; campo vazio no PUT omite do payload
- T-05-01-03 (Tampering forms): React escape por padrão; ApiError.detail exibido verbatim em role="alert"

## Next Phase Readiness

- Fundação compartilhada criada uma única vez — planos 02-05 não tocam em `types.ts`, `constants.ts` ou `App.tsx`
- Template CRUD (Usuarios) pronto para ser copiado nos planos 02 (Itens) e 03 (Cardápio)
- Dashboard admin substitui placeholder da Phase 4 com implementação real
- 7 rotas admin todas resolvem — links da sidebar (NAV_POR_PERFIL, já existente) param de levar a 404

Ready for plan 05-02 (Itens / Estoque CRUD).

---

*Phase: 05-p-ginas-admin-frontend*
*Completed: 2026-08-01*