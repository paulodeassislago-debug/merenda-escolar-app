---
phase: 08
slug: improvements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-05
---

# Phase 8 — Validation Strategy

> Contrato de validação por fase para amostragem de feedback durante a execução.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend); build+lint sem framework de teste (frontend, padrão do projeto) |
| **Config file** | none — pytest detecta `backend/tests/` (conftest.py com SQLite in-memory StaticPool) |
| **Quick run command** | `source backend/venv/bin/activate && pytest backend/tests/test_<arquivo>.py -x` |
| **Full suite command** | `source backend/venv/bin/activate && pytest backend/tests/` |
| **Frontend gates** | `cd frontend && npm run build && npm run lint` |
| **Estimated runtime** | ~30s (backend); ~40s (frontend gates) |

---

## Sampling Rate

- **Após cada commit de tarefa:** rodar os testes do arquivo tocado (`pytest backend/tests/test_X.py -x`)
- **Após cada onda:** suíte completa backend (`pytest backend/tests/`) + gates frontend (`npm run build && npm run lint`)
- **Antes do `/gsd-verify-work`:** suíte completa verde (baseline 103 testes + novos desta fase)
- **Max feedback latency:** ~60s

---

## Per-task Verification Map

| task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 08-01 | 1 | IMP-06/07, DELIV-05/06 | T-08-01 | Migração idempotente; colunas com defaults seguros (sem perda de dados legados) | unit | `pytest backend/tests/test_entregas.py -x` | ✅ | ⬜ pending |
| 08-01-02 | 08-01 | 1 | IMP-06/07, DELIV-05/06 | T-08-01 | Schemas com validação por origem e fornecedor obrigatório | unit | `pytest backend/tests/ -x` | ✅ | ⬜ pending |
| 08-01-03 | 08-01 | 1 | IMP-06/07 | — | Tipos TS espelham schemas backend | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 08-02-01 | 08-02 | 2 | IMP-01/02 | T-08-02 | Limiar > 0 exigido (400); default 5.0 | unit | `pytest backend/tests/test_itens.py backend/tests/test_dashboard.py -x` | ✅ | ⬜ pending |
| 08-02-02 | 08-02 | 2 | IMP-02 | — | Dashboard usa limiar por item na unidade de exibição | unit | `pytest backend/tests/test_dashboard.py -x` | ✅ | ⬜ pending |
| 08-02-03 | 08-02 | 2 | IMP-01/02 | — | Form de item com limiar; badges e copy dinâmica | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-03-01 | 08-03 | 3 | IMP-08, DELIV-05/06 | T-08-03 | Regras por origem (manual: obs+recebido; xml: nota+justificativa) | unit | `pytest backend/tests/test_entregas.py -x` | ✅ | ⬜ pending |
| 08-03-02 | 08-03 | 3 | IMP-03, D-13 | T-08-03 | POST /itens/inline admin+secretaria; admin-only fora do fluxo | unit | `pytest backend/tests/test_itens.py -x` | ✅ | ⬜ pending |
| 08-04-01 | 08-04 | 1 | IMP-04/05 | — | normalizar/similaridade determinísticos (sem IA) | build | `cd frontend && npm run build` | ✅ | ⬜ pending |
| 08-04-02 | 08-04 | 1 | IMP-04/05 | — | sugerirCandidatos com confiança e motivo legível | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-05-01 | 08-05 | 4 | IMP-06/07/08 | T-08-04 | Campos origem/data/fornecedor/obs/nota no form | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-05-02 | 08-05 | 4 | IMP-07 | — | Autocomplete de fornecedor + cadastro inline | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-05-03 | 08-05 | 4 | IMP-06/08 | — | Pré-preenchimento XML (data/fornecedor/nota) e manual (hoje) | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-06-01 | 08-06 | 5 | IMP-03 | — | Modal inline preserva rascunho; vincula item à linha | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-06-02 | 08-06 | 5 | IMP-04/05 | — | Sugestões confirmáveis em linhas XML sem correspondência | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-07-01 | 08-07 | 4 | IMP-09/10, MEAL-02 | T-08-05 | Config de alunos admin-only; totais derivados por slot | unit | `pytest backend/tests/test_alunos_por_periodo.py backend/tests/test_refeicoes.py -x` | ⚠ W0 cria | ⬜ pending |
| 08-07-02 | 08-07 | 4 | IMP-10, MEAL-02 | — | POST /refeicoes deriva tipo e qtd_alunos do slot | unit | `pytest backend/tests/test_refeicoes.py -x` | ✅ | ⬜ pending |
| 08-07-03 | 08-07 | 4 | IMP-11 | — | Projeção cumulativa não bloqueia; avisos aditivos | unit | `pytest backend/tests/test_planejamento.py -x` | ✅ | ⬜ pending |
| 08-08-01 | 08-08 | 5 | IMP-09 | — | Página admin de configuração de alunos | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-08-02 | 08-08 | 5 | IMP-10, MEAL-02 | — | PainelCozinha sem input de alunos; avulso por slot | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-09-01 | 08-09 | 5 | IMP-11 | — | Badge de déficit na célula + painel colapsável | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |
| 08-09-02 | 08-09 | 5 | IMP-11 | — | Banner não-bloqueante com "Ver projeção" | build | `cd frontend && npm run build && npm run lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_alunos_por_periodo.py` — stubs para IMP-09/10 (criado na tarefa 08-07-01)
- [ ] `backend/tests/conftest.py` — fixtures existentes cobrem todos os perfis (admin/secretaria/cozinheira)

*Nenhuma instalação de framework necessária.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fluxo Entregas: XML sem correspondência → sugestão → "Cadastrar novo item" → submit sem perder rascunho | IMP-03/04/05 | Interação visual multi-etapa | `/admin/entregas` → upload XML de teste → conferir sugestões → cadastrar item inline → conferir linha vinculada → submeter |
| Badge de déficit + painel "Projeção da semana" + banner com "Ver projeção" | IMP-11/D-19 | Visual/UX | `/admin/planejamento` com estoque insuficiente na semana → conferir badge na célula, painel e banner |
| Cozinheira lança refeição sem digitar alunos; avulso por slot | IMP-09/10 | Fluxo de usuário | `/cozinha` com alunos configurados → lançar do planejamento e avulso selecionando slot |
| Painel "Configure os alunos por período" quando configuração vazia | D-19 | Estado visual | Zerar config de alunos → abrir projeção no planejamento |
| Migração do banco de desenvolvimento (`backend/merenda.db`) | D-01/D-10 | Ambiente real | Subir backend com db antigo → conferir colunas e backfill via sqlite3 |
