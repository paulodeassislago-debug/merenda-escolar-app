---
phase: 05-p-ginas-admin-frontend
plan: 04
subsystem: ui
tags: [react, typescript, planejamento, grade-semanal, upsert, design-tokens]

requires:
  - phase: 05
    plan: 01
    provides: [types (PlanejamentoEntrada, CardapioItem), constants (DIAS_SEMANA, TIPOS_REFEICAO), fetchJson, ProtectedRoute, Layout]
provides:
  - Grade semanal 7×4 funcional com dropdowns filtrados por tipo_refeicao
  - Salvamento idempotente via POST /planejamento (upsert por slot + vigência)
  - Limpeza de slot via DELETE /planejamento/{id}
  - Navegação de semana (±7 dias + input date)
affects: [cardapio-publico, painel-cozinheira, 05-05]

actuals:
  tokens: 12000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Grade 7×4 com junção local: GET /planejamento?data= retorna só slots vigentes → junção com 28 slots (7 dias × 4 slots de serviço) via buildSelecoes()"
    - "Dropdown filtrado por tipo_refeicao da coluna (gotcha #6 mitigado — backend não valida coerência prato×tipo)"
    - "Conversão JS→backend dia: (jsDay + 6) % 7 em segundaDaSemana() (gotcha #1)"
    - "Refetch pós-salvar como prova de persistência (F10): carregarDados() após sucesso"
    - "Inline fetch com cancelled flag no useEffect (padrão react-hooks/set-state-in-effect v6+)"

key-files:
  created:
    - frontend/src/pages/admin/Planejamento.css — CSS co-localizado com tokens var(--*)
  modified:
    - frontend/src/pages/admin/Planejamento.tsx — substituído scaffolding (9 linhas) por grade completa (~270 linhas)

key-decisions:
  - "Ambas as tasks implementadas em um commit atômico — grade e save handler são interdependentes no mesmo componente"
  - "buildSelecoes() e chaveSlot() extraídas como funções puras de módulo (fora do componente) — evitam dependências cíclicas de useCallback e cumprem react-hooks/exhaustive-deps"
  - "Efeito inicial usa cancelled flag em vez de chamar carregarDados (useCallback) — compatível com react-hooks/set-state-in-effect v6+"
  - "carregarDados() mantido como refetch (useCallback com dep [semanaRef]) para o handler de save — só chamado após POST/DELETE, nunca do efeito"

patterns-established:
  - "Pattern: Tabela-grade — linhas=7 (DIAS_SEMANA indexados 0..6), colunas=4 (TIPOS_REFEICAO), select inline por célula"
  - "Pattern: Salvamento sequencial por slot — POST para criar/atualizar, DELETE para limpar, Promise.all não usado (backend transacional por request)"

requirements-completed: ["F10"]

coverage:
  - id: D1
    description: "Grade semanal 7×4 com leitura vigente, junção local, dropdowns filtrados por tipo_refeicao e navegação de semana"
    requirement: "F10"
    verification:
      - kind: unit
        ref: "npm run build (tsc -b && vite build)"
        status: pass
      - kind: unit
        ref: "npm run lint (eslint — zero warnings)"
        status: pass
      - kind: unit
        ref: "grep: '/planejamento?data=', pratos.filter, '— A definir —', 'Semana de referência', DIAS_SEMANA, getDay"
        status: pass
    human_judgment: false
  - id: D2
    description: "Salvamento via POST /planejamento (upsert) e DELETE /planejamento/{id} (limpar slot) com feedback 'Planejamento salvo.'"
    requirement: "F10"
    verification:
      - kind: unit
        ref: "grep: method: 'POST', method: 'DELETE', data_inicio_vigencia, 'Planejamento salvo.', 'Salvar planejamento'"
        status: pass
      - kind: unit
        ref: "npm run build + npm run lint"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-08-01
status: complete
---

# Phase 05 Plan 04: Grade semanal de planejamento com salvamento idempotente

**Grade 7×4 com dropdowns filtrados por tipo, navegação de semana e upsert persistente via POST /planejamento**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-01T22:38:03Z
- **Completed:** 2026-08-01T22:45:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Grade semanal 7×4 funcional: linhas = 7 dias (Segunda..Domingo, indexados pelo backend 0..6), colunas = 4 slots de planejamento
- Dropdowns filtrados por `tipo_refeicao` da coluna — mitigação do gotcha #6 (backend não valida coerência prato×tipo)
- Conversão correta JS→backend: `(jsDay + 6) % 7` em `segundaDaSemana()` — mitiga gotcha #1
- Células vazias exibem "— A definir —" em `--texto-suave` itálico; células preenchidas mostram o prato atual
- Navegação de semana: botões "‹ Semana anterior" / input date "Semana de referência" / "Próxima semana ›" + caption mostrando o intervalo
- Salvamento idempotente: POST /planejamento por slot alterado com `data_inicio_vigencia` = segunda-feira da semana; DELETE ao limpar slot preenchido
- Refetch após salvar: prova de persistência (F10) — grade reidratada via GET
- Feedback visual: "Salvando…" durante progresso, "Planejamento salvo." em `--verde-escuro` após sucesso
- Estados carregando/erro/conteúdo com `role="alert"` no erro
- CSS co-localizado com tokens `var(--*)`, zero inline styles, zero hex hardcoded

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Grade + salvar** — `a22ff4e` (feat)

## Files Created/Modified

- `frontend/src/pages/admin/Planejamento.tsx` — substituído scaffolding (9 linhas) por implementação completa (~270 linhas)
- `frontend/src/pages/admin/Planejamento.css` — CSS co-localizado com classes `.planejamento-grade`, `.planejamento-nav`, `.planejamento-caption`, `.celula-vazia`

## Decisions Made

- Ambas as tasks implementadas em um commit atômico — grade e save handler são interdependentes no mesmo componente; separar em commits distintos exigiria commit da grade sem a funcionalidade de salvar (incompleto para F10)
- `buildSelecoes()` e `chaveSlot()` extraídas como funções puras de módulo (fora do componente) — evitam dependências cíclicas de `useCallback` e satisfazem `react-hooks/exhaustive-deps` naturalmente
- Efeito inicial usa padrão `cancelled` flag em vez de chamar `carregarDados` (useCallback com dep `[semanaRef]`) — compatível com `react-hooks/set-state-in-effect` v6+ (mesmo padrão documentado no 05-01-SUMMARY)
- `carregarDados()` mantido como refetch para o handler de save — dependente de `[semanaRef]` via `useCallback`, chamado apenas após sucesso do POST/DELETE

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido lint react-hooks/set-state-in-effect**

- **Found during:** Task 1 (implementação inicial)
- **Issue:** `useEffect(() => { void carregarDados(); }, [carregarDados])` disparava erro de lint — `carregarDados()` é `useCallback` dependente de `semanaRef`, e chamar `setState` síncrono dentro de efeito é proibido pelo plugin v6+
- **Fix:** Extraídas funções puras (`chaveSlot`, `buildSelecoes`) para o nível do módulo; efeito inicial usa fetch inline com `cancelled` flag; `carregarDados` permanece como `useCallback` dependente de `[semanaRef]` apenas para o handler de save
- **Files modified:** frontend/src/pages/admin/Planejamento.tsx
- **Verification:** `npm run lint` — zero errors/warnings
- **Committed in:** a22ff4e

**2. [Rule 1 - Bug] Removido pattern com useRef que atualizava ref durante render**

- **Found during:** Task 1 (segunda iteração do lint)
- **Issue:** `semanaRefRef.current = semanaRef` durante render viola regra `react-hooks/refs` — refs não devem ser acessados durante renderização
- **Fix:** Removido o ref inteiramente; `carregarDados` passou a depender diretamente de `[semanaRef]` (fecha sobre o estado capturado no momento da chamada do handler de save)
- **Files modified:** frontend/src/pages/admin/Planejamento.tsx
- **Verification:** `npm run lint` — zero errors/warnings

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Ambos foram ajustes de conformidade com lint — nenhuma mudança de funcionalidade. Padrão resultante é exatamente o documentado no 05-01-SUMMARY para `react-hooks/set-state-in-effect`.

## Issues Encountered

- **Lint `react-hooks/set-state-in-effect` (v6+):** Mesmo problema documentado no 05-01-SUMMARY. Solução aplicada: fetch inline no efeito com flag `cancelled`, mantendo `carregarDados` como refetch para operações de salvamento. Padrão consistente com Usuarios.tsx e Dashboard.tsx.
- **Lint `react-hooks/refs`:** Tentativa inicial de usar `useRef` para capturar `semanaRef` no callback falhou — `semanaRefRef.current = semanaRef` durante render é proibido. Removido o ref; abordagem com `useCallback([semanaRef])` resolve.

## Threat Flags

No new threat surface beyond the plan's threat model. All mitigations from the plan executed:
- T-05-04-01 (Tampering — coerência prato×tipo): Dropdown filtrado por `tipo_refeicao` da coluna — `pratos.filter(p => p.tipo_refeicao === tipoDaColuna)`. Impossível gravar prato de tipo errado pela UI.
- T-05-04-02 (Tampering — deriva errada de dia_semana): Conversão centralizada `(jsDay + 6) % 7` em `segundaDaSemana()`. `data_inicio_vigencia` sempre derivada da segunda-feira calculada por esta função.
- T-05-04-03 (EoP — rota acessível a secretaria): Aceito por desenho (D-05). Backend `require_perfil` é a autoridade.
- T-05-04-SC (Tampering — npm installs): Nenhum pacote novo instalado.

## Next Phase Readiness

- `/admin/planejamento` funcional para admin + secretaria — grade vigente, edição, upsert e limpeza de slot
- Nenhuma incoerência prato×tipo possível pela UI (filtro obrigatório nos dropdowns)
- F10 (persistência) satisfeito: salvar → refetch → grade reidratada
- Pronto para verificação manual: `/gsd-verify-work` — selecionar pratos, salvar, F5, mudar prato, limpar slot

Ready for plan 05-05 (Entregas — JSON/XML).

---

*Phase: 05-p-ginas-admin-frontend*
*Completed: 2026-08-01*
