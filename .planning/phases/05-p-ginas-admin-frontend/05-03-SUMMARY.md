---
phase: 05-p-ginas-admin-frontend
plan: 03
subsystem: ui
tags: [react, typescript, crud, cardapio, receitas, ingredientes, design-tokens]

requires:
  - phase: 05-01
    provides: [Tipos admin, constantes, rotas, template Usuarios CRUD]
provides:
  - CRUD de pratos com tipo restrito TIPOS_REFEICAO
  - Editor de ingredientes por prato com quantidade/medida caseira
  - Navegação Cardápio → Receitas via botão por linha
affects: [05-05, 05-06]

actuals:
  tokens: 9374
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CRUD table + modal pattern (replicado de Usuarios.tsx)"
    - "fetchJson<T> + ApiError como único caminho de API"
    - "CSS plain co-localizado com tokens var(--*)"
    - "Ternário carregando → erro → conteúdo"
    - "Select restrito a TIPOS_REFEICAO de constants.ts"
    - "useParams + Number(id) para rota com parâmetro"
    - "nomeItem() merge local — resolve item_nome após POST/PUT sem depender da resposta"

key-files:
  created:
    - frontend/src/pages/admin/Cardapio.css — CSS co-localizado com tokens de design
    - frontend/src/pages/admin/Receitas.css — CSS co-localizado com tokens + form inline
  modified:
    - frontend/src/pages/admin/Cardapio.tsx — CRUD completo de pratos (substitui scaffolding)
    - frontend/src/pages/admin/Receitas.tsx — editor de ingredientes por prato (substitui scaffolding)

key-decisions:
  - "Select de tipo_refeicao restrito às 4 strings de TIPOS_REFEICAO (import de constants.ts) — backend rejeita variantes com 400"
  - "nomeItem() como função de merge local: busca item_nome no catálogo de itens carregado quando a resposta POST/PUT não o inclui"
  - "Edição inline de ingredientes com Salvar/Cancelar por linha — preserva o contexto visual da tabela"
  - "Modal overlay re-tokenizado: rgba(18, 76, 15, 0.35) verde translúcido conforme DESIGN.md"

patterns-established:
  - "Pattern 1: useParams<{ id: string }>() + Number(id) — primeira página do projeto com parâmetro de rota"
  - "Pattern 2: nomeItem() como ponte local — usa catálogo de itens já carregado para resolver nomes após POST/PUT"
  - "Pattern 3: Formulário inline de adição com flex-gap — alternativa ao modal quando o contexto da tabela deve permanecer visível"

requirements-completed: ["F9"]

coverage:
  - id: D1
    description: "Página Cardápio — CRUD de pratos com tipo restrito TIPOS_REFEICAO e navegação para Receitas"
    requirement: "F9"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Cardapio.tsx — grep fetchJson ≥ 6"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Cardapio.tsx — grep TIPOS_REFEICAO.map ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Cardapio.tsx — grep navigate('/admin/receitas/...') ≥ 1"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false
  - id: D2
    description: "Editor de Receitas (/admin/receitas/:id) — adicionar/editar/remover ingredientes com quantidade e medida caseira"
    requirement: "F9"
    verification:
      - kind: unit
        ref: "frontend/src/pages/admin/Receitas.tsx — grep useParams<{ id: string }> ≥ 1"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Receitas.tsx — grep /cardapio/ ≥ 5"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/admin/Receitas.tsx — grep nomeItem ≥ 4 (merge local)"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-08-01
status: complete
---

# Phase 05 Plan 03: Cardápio + Receitas — F9 completo com editor de ingredientes

**CRUD de pratos com tipo restrito e editor de ingredientes por prato — o fluxo completo do teste F9 (criar prato → abrir receita → adicionar/editar/remover ingredientes)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-01T22:25:00Z
- **Completed:** 2026-08-01T22:32:55Z
- **Tasks:** 2
- **Files modified:** 4 (2 .tsx substituídos, 2 .css criados)

## Accomplishments

- Página Cardápio completa com CRUD de pratos: tabela com colunas Prato/Tipo/Ações, modal de criar/editar com select de tipo restrito a TIPOS_REFEICAO (4 strings exatas do backend), modal destrutivo de exclusão
- Botão "Editar receita" por linha da tabela navega para `/admin/receitas/:id` via `useNavigate` — o encadeamento Cardápio → Receitas que o F9 exige
- Editor de Receitas completo: fetch inicial em paralelo (receita + catálogo de itens + listagem de cardápio), `useParams<{ id: string }>()` + `Number(id)`, header com nome do prato + badge de tipo + "Voltar ao cardápio"
- Formulário inline de adição: select de item (nome + unidade_oficial), quantidade (`step="0.1"`), medida caseira (placeholder "ex.: 1 xícara")
- Edição inline por linha com Salvar/Cancelar (PUT /cardapio/{id}/receita/{receita_id}) e remoção destrutiva com modal de confirmação
- Merge local de `item_nome` via `nomeItem()`: após POST/PUT (que não retornam `item_nome`), a tabela exibe o nome correto a partir do catálogo de itens já carregado (gotcha #11 do RESEARCH coberto)
- Ambos os `.css` co-localizados seguem o vocabulário compartilhado (`.pagina-header`, `.card`, `.tabela-*`, `.badge`, `.btn-*`, `.modal-*`, `.form-*`, `.alerta-erro`) com tokens `var(--*)` do DESIGN.md
- Células de tabela com `word-wrap: break-word` para nomes longos (backstop long-text do UI-SPEC)

## Task Commits

Each task was committed atomically:

1. **Task 1: Página Cardápio** — `8e51444` (feat)
2. **Task 2: Editor de Receitas** — `047ebb0` (feat)

## Files Created/Modified

- `frontend/src/pages/admin/Cardapio.tsx` — CRUD completo de pratos (substitui scaffolding de 9 linhas)
- `frontend/src/pages/admin/Cardapio.css` — CSS co-localizado com tokens var(--*) do DESIGN.md
- `frontend/src/pages/admin/Receitas.tsx` — Editor de ingredientes por prato (substitui scaffolding de 13 linhas)
- `frontend/src/pages/admin/Receitas.css` — CSS co-localizado com tokens + classes do form inline

## Decisions Made

- Select de `tipo_refeicao` importa exclusivamente de `TIPOS_REFEICAO` em `constants.ts` — nunca strings inline. O backend rejeita variantes com 400.
- `nomeItem()` como função de merge local: busca `item.nome` no catálogo de itens já carregado (`GET /itens`). Após POST/PUT (que não incluem `item_nome` na resposta), o refetch do `GET /cardapio/{id}/receita` traz os nomes, mas a função local serve como fallback imediato.
- Edição inline (inputs na própria linha da tabela) em vez de modal — preserva o contexto visual e reduz fricção ao editar vários ingredientes em sequência.
- `useEffect` com flag `cancelled` (padrão de Usuarios.tsx) para evitar `setState` pós-unmount, compatível com `react-hooks/set-state-in-effect`.
- CSS duplicado por página (`.btn-primario`, `.modal-*`, `.form-*` etc.) — conforme D-01, cada página é autossuficiente e não compartilha classes via global. Tokens `var(--*)` garantem consistência visual sem acoplamento de arquivos.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **Lint `react-hooks/set-state-in-effect`:** Em ambos os arquivos, a chamada inicial de `useEffect` precisou ser reescrita para usar a flag `cancelled` + fetch inline (mesmo padrão de `Usuarios.tsx` do plano 01). As funções `carregarPratos`/`carregarDados` permanecem para refetch pós-mutação CRUD.

## Threat Flags

No new threat surface beyond the plan's threat model. All mitigations from the plan executed:
- T-05-03-01 (Tampering via :id): `Number(id)` coage para número antes de montar o path; nenhum dado de URL interpolado em HTML
- T-05-03-02 (Tampering tipo_refeicao): Select restrito a TIPOS_REFEICAO (fonte única em constants.ts)
- T-05-03-03 (EoP via rotas): `perfis={['admin']}` registrado no plano 01; ProtectedRoute redireciona perfil errado
- T-05-03-SC (npm installs): Nenhum pacote novo instalado neste plano

## Next Phase Readiness

- Cardápio + Receitas completos e encadeados — F9 satisfeito
- Prato criado no Cardápio fica disponível como opção no dropdown do Planejamento (F10) e Entregas — pendente de verificação manual no `/gsd-verify-work`
- Ready for plan 05-04 (Planejamento semanal — grade 7×4)

---

*Phase: 05-p-ginas-admin-frontend*
*Completed: 2026-08-01*