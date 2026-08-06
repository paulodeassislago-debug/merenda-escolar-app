---
phase: 08-improvements
plan: 03
subsystem: api
tags: [fastapi, entregas, auditoria, autorizacao, pytest]

# Dependency graph
requires:
  - phase: 08-improvements (08-01)
    provides: Entrega com origem/data_entrega/fornecedor_id/nota_numero/observacoes, tabela fornecedores
  - phase: 08-improvements (08-02)
    provides: Item.limiar com default 5.0 e validacao 400
provides:
  - Validacao por origem no POST /entregas (manual: observacoes + so recebido; xml: nota_numero + justificativa por item)
  - Fornecedor obrigatorio e existente (404) no POST /entregas
  - Endpoint POST /itens/inline (admin + secretaria) com validacao compartilhada do cadastro de item
affects: [08-05 (form de Entregas), 08-06 (modal inline de item)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validacao por origem antes de persistir (bloco unico de validacao no handler)"
    - "Criacao de item compartilhada via _criar_item_no_banco para /itens e /itens/inline"

key-files:
  created: []
  modified:
    - backend/main.py
    - backend/tests/test_entregas.py
    - backend/tests/test_itens.py
    - backend/tests/test_dashboard.py

key-decisions:
  - "Justificativa por item exigida apenas para origem xml; entrega manual grava justificativa=None (D-07)"
  - "POST /itens/inline reusa a validacao de /itens via helper compartilhado, sem duplicacao (D-13/R-2)"
  - "Payload xml dos testes existentes (E1-E13, D2) passou a incluir nota_numero default via helper"

patterns-established:
  - "Padrao 2 (RESEARCH): validacao por origem no POST /entregas — origem valida, fornecedor existente, observacoes (manual), nota (xml), acoes restritas (manual=recebido)"
  - "Endpoints de criacao com autorizacao e validacao identicas compartilham helper _criar_item_no_banco + _serializar_item"

requirements-completed: [IMP-06, IMP-07, IMP-08, IMP-03, DELIV-05, DELIV-06]

# Metrics
duration: 60min
completed: 2026-08-05
---

# Phase 08 Plan 03: Regras por origem nas entregas + endpoint inline de item Summary

**POST /entregas valida por origem (manual exige observações e só ação 'recebido'; xml exige nota_numero e mantém justificativa por item), rejeita fornecedor inexistente (404) e ganha POST /itens/inline para admin+secretaria com validação compartilhada do cadastro de item**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-08-05
- **Completed:** 2026-08-05
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Regras de auditoria por origem (D-07) no `POST /entregas`: origem inválida → 400; fornecedor inexistente → 404; manual sem observações → 400; manual com linha `alterado`/`excluído` → 400; xml sem `nota_numero` → 400; justificativa por item só é exigida/gravada para xml (`justificativa=None` em manuais).
- Endpoint `POST /itens/inline` autorizado para admin + secretaria (D-13), reutilizando a validação de `POST /itens` via helper `_criar_item_no_banco` (nome único 409, unidade livre exige conversão, limiar default 5.0 com 400 para ≤ 0). `POST /itens` permanece admin-only.
- Suíte de entregas ampliada: E8 revisado para origem xml (`test_e8_xml_acao_sem_justificativa`) + E14–E18 (manual sem observações, manual só recebido + justificativa None, xml sem nota, fornecedor inexistente, origem inválida).
- Suíte completa backend verde: **121 passed** (baseline 113 + 8 novos), incluindo o teste de rota estática (secretaria cria via `/itens/inline` sem cair em `/itens/{item_id}`).

## task Commits

Each task was committed atomically:

1. **task 1: Implementar regras por origem no POST /entregas** - `6fb6139` (feat)
2. **task 2: Revisar E8 e adicionar testes das regras por origem** - `8b40d17` (test)
3. **task 3: Criar POST /itens/inline para o fluxo de Entregas** - `a99e1f1` (feat)

**Auto-fix (Rule 3):** `42b2cbe` (fix) — payload xml de `test_d2_metricas_atualizadas` ganha `nota_numero`.

## Files Created/Modified

- `backend/main.py` - Validação por origem no `registrar_entrega` (origem, fornecedor 404, observações/nota obrigatórias, ações restritas por origem, justificativa None em manuais); helpers `_criar_item_no_banco`/`_serializar_item`; rota `POST /itens/inline` (admin+secretaria).
- `backend/tests/test_entregas.py` - Helper `_payload_entrega` com `nota_numero` default e override de `origem`; E8 renomeado para `test_e8_xml_acao_sem_justificativa`; E14–E18 adicionados.
- `backend/tests/test_itens.py` - Testes `test_4_9_inline_secretaria_cria_item`, `test_4_10_inline_cozinheira_negado`, `test_4_11_itens_continua_admin_only`.
- `backend/tests/test_dashboard.py` - `test_d2` com `nota_numero` no payload xml (Rule 3).

## Decisions Made

- Seguido o plano conforme D-07/D-13/R-2. Refatoração da criação de item em helper compartilhado (`_criar_item_no_banco` + `_serializar_item`) para não duplicar lógica entre `/itens` e `/itens/inline` — alinhado à instrução do plano ("Do NOT duplicate logic — refactor shared validation if cleaner").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Payloads xml dos testes existentes sem `nota_numero`**
- **Found during:** task 1 (regras por origem no POST /entregas)
- **Issue:** A nova regra D-07 (xml exige `nota_numero`) rejeitava com 400 os payloads xml dos testes E1–E4/E9–E13, que não enviavam a nota — o gate `pytest tests/test_entregas.py` falhava e o critério "E1–E13 permanecem verdes" exigia ajuste.
- **Fix:** `_payload_entrega` passou a incluir `nota_numero` default `"NF-TESTE"` (override permitido) — os testes mantêm o comportamento alvo (saldo, ações, conversões) e E16 prova a rejeição da ausência da nota com payload explícito.
- **Files modified:** backend/tests/test_entregas.py
- **Verification:** `pytest tests/test_entregas.py -q` → 18 passed (no gate da task 1); E16 valida o 400 por nota ausente.
- **Committed in:** 6fb6139 (part of task 1 commit)

**2. [Rule 3 - Blocking] `test_d2_metricas_atualizadas` criava entrega xml sem `nota_numero`**
- **Found during:** task 3 (gate da suíte completa)
- **Issue:** Com a regra da task 1, o POST /entregas do teste D2 passou a retornar 400, zerando `entregas.ultimos_7_dias` e quebrando o gate da suíte completa (113 baseline deveria permanecer verde).
- **Fix:** Adicionado `"nota_numero": "NF-TESTE"` ao payload xml do teste D2, preservando a intenção do teste (métricas atualizadas após entrega + refeição).
- **Files modified:** backend/tests/test_dashboard.py
- **Verification:** `pytest tests/ -q` → 121 passed.
- **Committed in:** 42b2cbe (commit fix dedicado)

---

**Total deviations:** 2 auto-fixed (2 blocking — regras novas exigindo payloads de teste atualizados)
**Impact on plan:** Auto-fixes necessários para a correção/regressão dos testes após a aplicação das regras D-07. Nenhum escopo adicional.

## Issues Encountered

- Após a task 1, os testes legados com payload xml sem nota falhavam em massa (esperado pela nova regra) — resolvido com default no helper de payload, mantendo a semântica original dos testes e isolando a prova da regra no E16.
- Nenhum outro problema: rota `/itens/inline` resolve para a rota estática (FastAPI prioriza rotas fixas sobre path params; confirmado pelo teste 4.9, que cria o item com 200 em vez de 404/422).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend de Entregas com regras por origem testadas (IMP-06/07/08, DELIV-05/06) pronto para os planos de frontend 08-05 (form com origem/data/fornecedor/obs/nota) e 08-06 (modal inline de item usando `POST /itens/inline`).
- `POST /itens/inline` disponível para o fluxo de Entregas da secretaria; `POST /itens` segue admin-only (D-13).
- Fornecedor inexistente agora rejeita a entrega (404) — o form 08-05 precisa garantir fornecedor selecionado/cadastrado antes do submit.

---
*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED

- [x] `backend/main.py` exists: [ -f backend/main.py ] → FOUND
- [x] `backend/tests/test_entregas.py` exists: FOUND
- [x] `backend/tests/test_itens.py` exists: FOUND
- [x] Commit 6fb6139 exists: FOUND
- [x] Commit 8b40d17 exists: FOUND
- [x] Commit a99e1f1 exists: FOUND
- [x] Commit 42b2cbe exists: FOUND
- [x] Full suite green: `venv/bin/python -m pytest tests/ -q` → 121 passed
- [x] No changes to STATE.md / ROADMAP.md / REQUIREMENTS.md / PROJECT.md
