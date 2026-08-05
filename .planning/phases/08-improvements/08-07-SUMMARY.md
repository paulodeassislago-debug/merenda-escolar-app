---
phase: 08-improvements
plan: 07
subsystem: api
tags: [fastapi, sqlalchemy, pydantic, pytest, sqlite]

# Dependency graph
requires:
  - phase: 08-01
    provides: "Tabela AlunosPorPeriodo (models.py) e migração sem Alembic"
  - phase: 08-03
    provides: "Padrões de validação por origem e helpers de conversão reutilizados"
provides:
  - "GET/PUT /alunos-por-periodo — configuração admin-only com auditoria (updated_at/updated_by)"
  - "POST /refeicoes por slot — tipo e qtd_alunos derivados no backend (payload sem tipo_refeicao/qtd_alunos)"
  - "GET /planejamento/projecao — simulação cumulativa da semana (admin+secretaria; cozinheira 403)"
  - "POST /planejamento com avisos aditivos não-bloqueantes (D-18)"
affects: [08-08, 08-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derivação de total por slot (D-15): Lanche Manhã=manha, Almoço=manha+tarde, Lanche Tarde=tarde, Janta=noite"
    - "Projeção cumulativa dia a dia com saldo corrente e itens não avaliáveis (D-17)"

key-files:
  created:
    - backend/tests/test_alunos_por_periodo.py
  modified:
    - backend/main.py
    - backend/schemas.py
    - backend/tests/test_refeicoes.py
    - backend/tests/test_planejamento.py
    - backend/tests/test_dashboard.py

key-decisions:
  - "RefeicaoCreate passa a {slot, planejamento_id, itens} — tipo e qtd_alunos derivados no backend (R-5/D-16b, revisão MEAL-02)"
  - "Projeção em GET /planejamento/projecao (admin+secretaria), preservando o contrato de GET /planejamento (R-3/D-20)"
  - "Avisos aditivos no POST /planejamento nunca bloqueiam; lançamento de refeição continua bloqueando por estoque (D-18)"

patterns-established:
  - "Config ausente de alunos é estado explícito: 404 no GET de configuração, 400 no lançamento, configurado:false na projeção, avisos [] no planejamento"
  - "Item sem conversão na projeção vira não avaliável sem quebrar a resposta (D-17)"

requirements-completed: [IMP-09, IMP-10, IMP-11, MEAL-02]

# Metrics
duration: 15min
completed: 2026-08-05
---

# Phase 8 Plan 7: Alunos por período, lançamento por slot e projeção cumulativa

**Configuração admin-only de alunos por período com totais derivados por slot, lançamento de refeição por slot sem digitação de alunos (quebra MEAL-02) e projeção cumulativa de estoque da semana com avisos não-bloqueantes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-05T15:00:53Z
- **Completed:** 2026-08-05T15:10:05Z
- **Tasks:** 3
- **Files modified:** 5 (+1 novo)

## Accomplishments

- **Configuração de alunos por período (IMP-09/10):** `GET /alunos-por-periodo` (admin+secretaria+cozinheira) e `PUT /alunos-por-periodo` (admin-only, D-14) com `Field(gt=0)` e auditoria `updated_at`/`updated_by`; `_total_por_slot` implementa as 4 regras de D-15 e `_derivar_tipo_slot` espelha `tipoParaLancamento` do frontend.
- **Lançamento por slot (MEAL-02 revisado):** `RefeicaoCreate` virou `{slot, planejamento_id, itens}` — a cozinheira não envia mais `tipo_refeicao`/`qtd_alunos`; backend deriva tipo e total da configuração vigente; bloqueio por estoque (`Estoque insuficiente`) e auditoria de divergência com justificativa preservados; avulso sem planejamento funciona (R19).
- **Projeção cumulativa (IMP-11):** `GET /planejamento/projecao` restrito a admin/secretaria (D-20, cozinheira 403) com contrato `configurado/dias/itens/resumo`, `primeiro_dia_ruptura` 0-6 ou null e itens sem conversão como `avaliavel:false` (D-17); `POST /planejamento` retorna `avisos` aditivos e nunca bloqueia (D-18).
- Suíte backend completa verde: **137 passed** (baseline 121 + 16 novos), sem modificar os testes 8_1..8_9 do GET /planejamento.

## Task Commits

Each task was committed atomically:

1. **task 1: Endpoints de configuração de alunos por período + helper de total por slot** - `a76d76d` (feat)
2. **task 2: Revisar POST /refeicoes para payload por slot e atualizar a suíte R*** - `b4094c8` (feat)
3. **task 3: Projeção cumulativa (GET /planejamento/projecao) e avisos no POST /planejamento** - `fa5f25e` (feat)

## Files Created/Modified

- `backend/schemas.py` - `AlunosPorPeriodoUpdate` (gt=0) / `AlunosPorPeriodoResponse`; `RefeicaoCreate` por slot
- `backend/main.py` - GET/PUT /alunos-por-periodo; `_total_por_slot`/`_derivar_tipo_slot`; `lancar_refeicao_v2` por slot; `_consumo_slot`/`_simular_semana`/`_calcular_avisos`; GET /planejamento/projecao; avisos no POST /planejamento
- `backend/tests/test_alunos_por_periodo.py` (novo) - 6 testes a1..a5 (permissoes, validação, atualização)
- `backend/tests/test_refeicoes.py` - payloads por slot, `_configurar_alunos`, escala 180 no Almoço, novos R16..R19
- `backend/tests/test_planejamento.py` - `_configurar_alunos`, novos P1..P6 (projeção e avisos)
- `backend/tests/test_dashboard.py` - D2 migrado para payload por slot (onda da quebra de contrato)

## Decisions Made

- Seguidos D-14..D-20 e R-3/R-5 exatamente como planejado: config admin-only, totais derivados, payload por slot, projeção em endpoint próprio, avisos aditivos.
- Avisos do POST /planejamento simulam a semana que contém `data_inicio_vigencia`, de segunda até `dia_semana` (inclusive), usando a mesma simulação da projeção.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste de dashboard com payload antigo quebrou a baseline**
- **Found during:** task 3 (verificação da suíte completa)
- **Issue:** `test_dashboard.py::test_d2_metricas_atualizadas` postava `/refeicoes` com `tipo_refeicao`/`qtd_alunos` (contrato antigo) — agora 422, deixando o Almoço "pendente" e falhando os asserts de alunos.
- **Fix:** Migrado para payload por slot com `_configurar_alunos` (100/80/40) e asserts atualizados para o total derivado 180 (manha+tarde).
- **Files modified:** backend/tests/test_dashboard.py
- **Verification:** suíte completa 137 passed.
- **Committed in:** fa5f25e

**2. [Rule 2 - Missing] Config de alunos necessária em testes não listados no plano**
- **Found during:** task 2 (revisão da suíte R*)
- **Issue:** `_total_por_slot` roda no início do handler; sem config, R3 (conversão), R4 (item inexistente) e R6 (estoque) receberiam 400 com a mensagem de config, falhando seus asserts; R5/R7/R8 e B10-1 também continham payloads antigos no corpo do POST.
- **Fix:** `_configurar_alunos` adicionado a R3, R4, R5, R6; payloads de R7/R8 e B10-1 convertidos para slot; R14 renomeou `qtd_alunos_atendidos` → `alunos_atendidos` para manter o grep gate limpo.
- **Files modified:** backend/tests/test_refeicoes.py
- **Verification:** test_refeicoes.py 21 passed; grep gate sem `"qtd_alunos"` em payloads.
- **Committed in:** b4094c8

**3. [Rule 1 - Bug na especificação do teste] Números internamente inconsistentes no P2**
- **Found during:** task 3 (escrita do teste P2)
- **Issue:** A spec pedia `saldo 100` com `saldo_projetado == 100 - 180` e `primeiro_dia_ruptura == null`/`itens_com_ruptura == 0` — 100 - 180 é negativo, ou seja, ruptura no dia 0; os três asserts são contraditórios.
- **Fix:** Ajustado para saldo 1000 com Almoço de segunda a sexta: consumo 180 kg/dia × 5 = 900, `saldo_projetado == 100`, sem ruptura — preservando a asserção essencial (1 kg × 180 alunos por ocorrência de Almoço).
- **Files modified:** backend/tests/test_planejamento.py
- **Verification:** test_planejamento.py 18 passed.
- **Committed in:** fa5f25e

**4. [Rule 1 - Semântica] B10-2 mudou de 400 para 422**
- **Found during:** task 2 (revisão da suíte R*)
- **Issue:** O teste antigo "tipo 'Lanche da Manhã' → 400" perdeu o sentido: "Lanche da Manhã" agora é slot VÁLIDO (deriva para "Lanche"). O equivalente do teste é rejeitar o contrato legado.
- **Fix:** B10-2 agora envia `tipo_refeicao` no envelope → 422 (extra="forbid"); slot inválido é coberto pelo novo R18 (400).
- **Files modified:** backend/tests/test_refeicoes.py
- **Verification:** test_refeicoes.py 21 passed.
- **Committed in:** b4094c8

---

**Total deviations:** 4 auto-fixed (3 Rule 1, 1 Rule 2)
**Impact on plan:** Todas as correções são consequência direta da quebra de contrato intencional (MEAL-02/R-5) ou de inconsistências numéricas da spec de teste. Sem mudança de escopo arquitetural.

## Issues Encountered

- Nenhum além dos documentados acima como desvios.

## User Setup Required

None - sem configuração externa. A configuração de alunos por período é feita via API (admin) e será exposta na UI do plano 08-08.

## Next Phase Readiness

- **08-08 (PainelCozinha):** consumir `slot` no lançamento (sem `qtd_alunos`), `GET /alunos-por-periodo` para leitura e painel de configuração admin (PUT).
- **08-09 (Planejamento):** consumir `GET /planejamento/projecao` (contrato `configurado/dias/itens/resumo`) para badge/painel/banner e exibir `avisos` do POST /planejamento.
- Contratos novos testados; nenhum bloqueio pendente.

---

*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED

- SUMMARY.md exists at `.planning/phases/08-improvements/08-07-SUMMARY.md` ✓
- `backend/tests/test_alunos_por_periodo.py` created ✓
- Commits verified in git log: `a76d76d`, `b4094c8`, `fa5f25e` ✓
- Suíte completa: `venv/bin/python -m pytest tests/ -q` → **137 passed** ✓
- Grep gates: `RefeicaoCreate` sem `qtd_alunos`/`tipo_refeicao`; payloads de POST /refeicoes sem `"qtd_alunos"` ✓
- STATE.md / ROADMAP.md / REQUIREMENTS.md / PROJECT.md não modificados (deixados ao orquestrador) ✓
