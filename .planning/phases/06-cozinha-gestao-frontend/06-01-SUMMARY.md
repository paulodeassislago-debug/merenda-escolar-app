---
phase: 06-cozinha-gestao-frontend
plan: 01
subsystem: ui/api
tags: [react, typescript, fastapi, refeicoes, conversoes, auditoria, acessibilidade]

# Dependency graph
requires:
  - phase: 05-p-ginas-admin-frontend
    provides: planejamento vigente, receitas, conversões pré-cadastradas, tipos de refeição e cliente autenticado
provides:
  - Painel da cozinha API-backed com seleção de data, quatro slots, receita real e lançamento autenticado
  - Quantidades de receita escaladas por aluno, baixa de estoque sobre a quantidade final e auditoria da divergência escalada
  - Medidas somente por selects de conversões existentes, ingredientes adicionados/removidos auditáveis e diálogo acessível
affects: [06-02-dashboard-gestao, 07-finalizacao-validacao]

# Actuals (#2632)
actuals:
  tokens: 18750
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fluxo de cozinha bloqueado até qtd_alunos inteiro positivo; receita-base é escalada no cliente para revisão e no backend para autoridade"
    - "Linha de ingrediente auditável preserva quantidade-base, quantidade esperada, quantidade final, medida cadastrada e justificativa"
    - "Dialog semântico com foco inicial, retorno de foco, contenção de Tab, Esc e confirmação textual de descarte"

key-files:
  created:
    - .planning/phases/06-cozinha-gestao-frontend/06-01-SUMMARY.md
  modified:
    - frontend/src/pages/PainelCozinha.tsx
    - frontend/src/pages/PainelCozinha.css
    - backend/main.py
    - backend/schemas.py
    - backend/tests/test_conversoes.py
    - backend/tests/test_refeicoes.py

key-decisions:
  - "A quantidade da receita é por aluno: o frontend exibe a base e envia a quantidade final base × alunos; o backend recalcula a expectativa para validar e auditar."
  - "Quantidade divergente da expectativa escalada, inclusão e remoção exigem justificativa por linha; quantidade original persistida é a expectativa escalada."
  - "A cozinheira somente lê conversões autorizadas e escolhe medidas cadastradas; nenhum peso livre ou cadastro de conversão entra no painel."

requirements-completed: [MEAL-07, MEAL-08]

coverage:
  - id: D1
    description: "Painel da cozinheira consulta planejamento, receita e conversões reais e lança refeição autenticada sem identidade ou medida livre."
    requirement: MEAL-07
    verification:
      - kind: other
        ref: "cd frontend && npm run build"
        status: pass
      - kind: other
        ref: "cd frontend && npm run lint"
        status: pass
      - kind: unit
        ref: "backend/tests/test_conversoes.py::test_5_5_perfil_errado"
        status: pass
    human_judgment: true
    rationale: "A rede, seleção visual de slots e ausência de controles de mutação foram confirmadas manualmente em 2026-08-04 (06-UAT.md, testes 1-3)."
  - id: D2
    description: "Quantidade final é receita-base × alunos, a baixa usa a quantidade enviada e divergências da expectativa escalada são auditadas."
    requirement: MEAL-08
    verification:
      - kind: unit
        ref: "backend/tests/test_refeicoes.py::test_r9_ajuste_sem_justificativa"
        status: pass
      - kind: unit
        ref: "backend/tests/test_refeicoes.py::test_r10_conforme_receita_sem_justificativa"
        status: pass
      - kind: other
        ref: "cd backend && source venv/bin/activate && pytest tests/ -q"
        status: pass
    human_judgment: true
    rationale: "A interação de informar alunos, editar a quantidade final e preencher justificativas foi confirmada no navegador em 2026-08-04 (06-UAT.md, teste 4)."
  - id: D3
    description: "Editor responsivo apresenta estados de recuperação, inclusão/remoção auditável e diálogo acessível com foco contido."
    verification:
      - kind: other
        ref: "cd frontend && npm run build && npm run lint"
        status: pass
    human_judgment: true
    rationale: "Foco, Esc, descarte, viewport estreito e mensagens anunciadas foram observados manualmente em 2026-08-04 (06-UAT.md, testes 5 e 8)."

duration: 123min
completed: 2026-08-04
status: complete
---

# Phase 06 Plan 01: Tracer e fluxo auditável da cozinha

**Painel da cozinha autenticado com receita real, escala por alunos, conversões pré-cadastradas, baixa sobre a quantidade final e auditoria acessível por ingrediente.**

## Performance

- **Duration:** 123 min (execução inicial, correção do checkpoint e tarefas restantes)
- **Started:** 2026-08-03T23:00:00Z
- **Completed:** 2026-08-04T00:33:12Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Substituído o painel legado por planejamento real do dia, quatro slots, receita carregada após quantidade válida de alunos e POST autenticado em `/refeicoes`.
- Implementada escala `quantidade-base × qtd_alunos` no editor e no backend, com baixa usando a quantidade final e persistência da expectativa escalada.
- Conversões passaram a ser somente leitura para cozinheira; selects bloqueiam medidas inexistentes e ingredientes adicionados/removidos mantêm justificativas auditáveis.
- Tratados loading, retry, sessão expirada, falha de POST com preservação do rascunho, refetch de planejamento/estoque e dialog acessível/responsivo.

## Task Commits

Cada tarefa foi commitada atomicamente; a correção solicitada no checkpoint também foi preservada:

1. **Task 1: Tracer da seleção do planejamento à confirmação real** — `1e61dde` (feat)
2. **Checkpoint: justificativa visível para alteração de quantidade** — `9a50715` (fix)
3. **Task 2: Rascunho de ingredientes com auditoria e escala por alunos** — `72ff4a7` (feat)
4. **Task 3: Estados de recuperação, diálogo acessível e acabamento operacional** — `1531c4c` (feat)

## Files Created/Modified

- `frontend/src/pages/PainelCozinha.tsx` — fluxo real, bloqueio por alunos, escala, selects, auditoria, recuperação e dialog.
- `frontend/src/pages/PainelCozinha.css` — superfície operacional responsiva, estados, linhas auditáveis e confirmação de descarte.
- `backend/main.py` — leitura de conversões para cozinheira e auditoria/expectativa escalada no lançamento.
- `backend/schemas.py` — `qtd_alunos` positivo no contrato de refeição.
- `backend/tests/test_conversoes.py` — leitura 200 para cozinheira e mutações 403.
- `backend/tests/test_refeicoes.py` — escala, baixa, quantidade original escalada e justificativa adicional.

## Decisions Made

- A receita é definida por aluno; a quantidade final enviada e baixada é multiplicada por `qtd_alunos`.
- A auditoria compara contra a expectativa escalada, não contra a quantidade-base, evitando exigir justificativa no fluxo normal.
- Conversões continuam sob administração; a cozinha nunca envia `peso_em_kg` nem cadastra medida inline.

## Deviations from Plan

### User-directed contract adjustment

**1. Escala da receita por quantidade de alunos**
- **Encontrado durante:** continuação após o checkpoint humano.
- **Decisão:** o usuário definiu que a receita-base é por aluno e que o backend deve validar/persistir a quantidade escalada.
- **Implementação:** bloqueio da receita até alunos válidos, campos base/esperada/final no frontend, validação escalada e testes de estoque/auditoria no backend.
- **Arquivos:** `PainelCozinha.tsx`, `main.py`, `schemas.py`, `test_refeicoes.py`.
- **Verificação:** 103 testes backend, build e lint frontend passaram.

**Total de desvios:** 1 ajuste dirigido pelo usuário. **Impacto:** alteração necessária no contrato operacional; sem dependências novas e sem mudança de autorização.

## Issues Encountered

- A execução paralela de `npm run` excedeu o timeout em algumas tentativas; `tsc`, Vite, ESLint e os comandos oficiais foram executados novamente de forma sequencial e passaram.
- Permanecem somente os avisos de depreciação já existentes do ambiente Python (`httpx`/Starlette, `crypt` e `declarative_base`).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- MEAL-07 e MEAL-08 estão implementados e cobertos por build, lint, suíte backend completa e UAT manual F13 validado em 2026-08-04 (06-UAT.md).
- `STATE.md` e `ROADMAP.md` não foram alterados; o orquestrador deve atualizar a posição do plano.

## Self-Check: PASSED

- `06-01-SUMMARY.md` criado.
- Commits `1e61dde`, `9a50715`, `72ff4a7` e `1531c4c` existem no histórico.
- `npm run build` passou.
- `npm run lint` passou sem warnings/erros.
- `pytest tests/ -q` passou: 103 testes.
- Nenhuma alteração desta execução foi feita em `STATE.md` ou `ROADMAP.md`.

---
*Phase: 06-cozinha-gestao-frontend*
*Completed: 2026-08-04*
