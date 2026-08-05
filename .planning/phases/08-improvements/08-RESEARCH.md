# Phase 8: Improvements — Research

**Data:** 2026-08-05
**Status:** Pronto para planejamento
**Método:** Pesquisa inline (agentes GSD não instalados neste ambiente) — análise direta do código e das decisões D-01..D-24.

---

## Resumo

A Fase 8 revisa fluxos operacionais das Fases 5-7 sem quebrar contratos validados. Seis frentes: (1) limiar individual de item, (2) entregas com origem/fornecedor/auditoria diferenciada, (3) cadastro inline de item XML, (4) alunos fixos por período, (5) projeção cumulativa de estoque, (6) sugestão de correspondência determinística. Stack inalterada: FastAPI + SQLAlchemy + SQLite (backend), React + Vite + CSS plain co-localizado (frontend), pytest (103 testes). **Nenhuma dependência nova.**

## User Constraints (from CONTEXT.md)

### Locked Decisions (resumo operacional)

- **D-01..D-04 (limiar):** `Item.limiar` Float NOT NULL default 5.0; regra avaliada na unidade de exibição (saldo / fator_conversao, como em `main.py:1068-1078`); validação 400 para limiar inválido; remover `LIMIAR_BAIXO_ESTOQUE` de `constants.ts` e do backend.
- **D-05..D-10 (entregas):** `Entrega` ganha `origem`/`data_entrega`/`fornecedor_id`/`nota_numero`/`observacoes`; tabela `fornecedores`; regras por origem no `POST /entregas`; fornecedor com autocomplete no form; XML pré-preenche data/fornecedor/nota; legado migra `origem=manual`, `data_entrega=data_hora`, `fornecedor_id` nulo.
- **D-11..D-13 (inline item):** opção "Cadastrar novo item" no select de linha XML sem correspondência; modal com campos do form de Itens; preserva rascunho; secretaria pode criar item no fluxo de Entregas (endpoint dedicado, ver decisão R-2).
- **D-14..D-16b (alunos):** tabela `alunos_por_periodo` (manha/tarde/noite); totais derivados (Lanche Manhã=manhã, Almoço=manhã+tarde, Lanche Tarde=tarde, Janta=noite); cozinheira não digita alunos; avulso seleciona slot (não tipo).
- **D-17..D-20 (projeção):** backend é autoridade do cálculo; simulação cumulativa da semana; `POST /planejamento` não bloqueia e retorna avisos; UI com badge na célula, painel colapsável e banner não-bloqueante; secretaria vê, cozinheira não.
- **D-21..D-24 (matching):** normalização determinística local, sem IA e sem dependência; sugestões confirmáveis com motivo; atende linhas XML e fornecedores; aliases persistidos ficam adiados (D-24).

### OpenCode's Discretion (resolvidas nesta pesquisa)

- **R-1 (migração SQLite):** módulo `backend/migracao.py` chamado no startup após `create_all`. Usa `sqlalchemy.inspect` para detectar colunas ausentes e emite `ALTER TABLE` com defaults: `itens.limiar FLOAT NOT NULL DEFAULT 5.0`; `entregas.origem VARCHAR NOT NULL DEFAULT 'manual'`, `entregas.data_entrega DATE`, `entregas.fornecedor_id INTEGER`, `entregas.nota_numero VARCHAR`, `entregas.observacoes TEXT`; backfill `data_entrega = date(data_hora)` onde NULL. Tabelas novas (`fornecedores`, `alunos_por_periodo`) são criadas pelo próprio `create_all`. Testes usam banco em memória com `create_all` — migração não roda em teste. Sem seed de fornecedor artificial (D-10). Sem seed de alunos: admin configura (a configuração vazia é estado explícito, exibido na UI).
- **R-2 (escopo do POST /itens — D-13):** novo endpoint **`POST /itens/inline`** (admin + secretaria) para criação de item no fluxo de Entregas, com as mesmas validações do `POST /itens` (limiar default 5.0, saldo 0). O `POST /itens` permanece admin-only (criação fora do fluxo de Entregas continua restrita, conforme D-13). Testado explicitamente.
- **R-3 (contrato GET /planejamento — D-17):** a projeção vai para **`GET /planejamento/projecao?data=`** (admin + secretaria), preservando o contrato vigente de `GET /planejamento` (lista) — exigência de não-regressão da fronteira da fase ("sem quebrar os contratos validados nas Fases 5-7"; três consumidores usam a lista). O `POST /planejamento` ganha campo **aditivo** `avisos` na resposta.
- **R-4 (limiar "ausente" — D-03):** `ItemCreate.limiar: float = Field(5.0, gt=0)` — default 5.0 preserva IMP-01 ("valor padrão de 5 para preservar o comportamento atual"); zero/negativo rejeitados pelo schema e por checagem explícita 400 no handler (D-03 exige 400, não 422). Isso mantém todos os testes existentes verdes (payloads de criação de item inalterados).
- **R-5 (slot no lançamento — D-16b):** `RefeicaoCreate` passa a `{slot, planejamento_id?, itens}` — sem `tipo_refeicao` e sem `qtd_alunos` no payload. Backend deriva tipo (Lanche da Manhã→Lanche, Almoço→Almoço, Lanche da Tarde→Lanche, Janta→Janta) e `qtd_alunos` da configuração. Quebra de contrato intencional (revisão MEAL-02) — todos os testes R* são atualizados na mesma entrega.
- **R-6 (score de similaridade):** score = sobreposição de tokens (ex.: "3 de 4 palavras batem") sobre nomes normalizados (caixa, acentos, pontuação, espaços repetidos); dicionário curto `ABREVIACOES` (ex.: MUSC→Músculo, BOV→Bovino). Sem IA, sem serviço externo (D-21).

### Deferred Ideas (FORA DO ESCOPO)

Fusão/exclusão automática de duplicados; persistência de aliases (D-24); histórico de edits da config de alunos; catálogo externo/IA/matching remoto; validação fiscal SEFAZ; projeção multi-semana.

## Phase Requirements

IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 (revisões de DELIV-05, DELIV-06 e MEAL-02). Ver `.planning/REQUIREMENTS.md` §"Phase 8 Improvements".

## Architectural Responsibility Map

| Camada | Responsável | Frentes |
|--------|-------------|---------|
| Backend (models/migração) | Planos 08-01 | Schema novo + dados legados |
| Backend (regras) | Planos 08-02/03/07 | Limiar, origem, alunos, projeção |
| Frontend (contratos) | Planos 08-05/06/08/09 | Forms, modal, painel, badge |
| Matching | Plano 08-04 | Módulo puro TS compartilhado |

## Standard Stack

- **Backend:** FastAPI + SQLAlchemy + Pydantic v2 + SQLite (sem Alembic — decisão de projeto). `models.Base.metadata.create_all` + `migracao.py` para ALTERs.
- **Frontend:** React 18 + Vite + TypeScript (`verbatimModuleSyntax`, `erasableSyntaxOnly`), CSS plain co-localizado, tokens de `frontend/src/index.css` (`--erro #B3261E`, `--verde-vivo #48BB2C`, `--verde-tint #EDF4EA`, `--alerta #C5D227`, `--raio`, `--sombra-card`).
- **Testes:** pytest (`backend/tests/`, SQLite in-memory StaticPool, fixtures `client/db/admin_token/secretaria_token/cozinheira_token` em `conftest.py`). Frontend: `npm run build` (inclui typecheck) + `npm run lint` (sem framework de teste no frontend — padrão do projeto).
- **Sem dependências novas** (nenhum pacote a adicionar em `backend/requirements.txt` nem `frontend/package.json`).

## Architecture Patterns

### Padrão 1 — Migração sem Alembic (mantém `create_all`)

`backend/migracao.py` exporta `migrar(engine)`; `main.py` chama após `create_all` (L15). Detecta colunas via `sqlalchemy.inspect(engine)` e executa `text("ALTER TABLE ...")` somente quando ausentes — idempotente, seguro para re-start.

### Padrão 2 — Validação por origem no POST /entregas

O endpoint atual valida tudo antes de persistir (bloco "1. Validar tudo"). A origem decide: `manual` → `observacoes` obrigatório e somente `acao="recebido"`; `xml` → `nota_numero` obrigatório e regra de justificativa por item mantida (atual `main.py:766-770`). Reaproveitar `_resolver_fator_entrega`/`_upsert_conversao`/`_converter_para_unidade_oficial` sem alteração.

### Padrão 3 — Derivação de total por slot

Helper `_total_por_slot(db, slot) -> int` consulta `alunos_por_periodo` e soma por regra D-15; 400 com mensagem clara quando a configuração não existe (estado explícito, não silencioso). Usado pelo `POST /refeicoes` e pela projeção.

### Padrão 4 — Projeção cumulativa (simulação dia a dia)

Para a semana da vigência (segunda=0 … domingo=6), em ordem de `SLOTS_PLANEJAMENTO` ("Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"): para cada slot planejado (via `_planejamento_ativo`), consumo por item = `receita.quantidade × alunos_do_slot` convertido por `_converter_para_unidade_oficial` (usa `/conversoes`); saldo corrente por item é decrementado dia a dia. Item sem conversão → marcado `nao_avaliavel` (não bloqueia, não quebra — D-17). Config de alunos vazia → resposta com `configurado: false` (D-19: painel mostra "Configure os alunos por período para ativar a projeção"). Avisos do `POST /planejamento` usam a mesma simulação até o `dia_semana` salvo (D-18).

### Padrão 5 — Matching determinístico (sem dependência)

`frontend/src/pages/admin/matching.ts` (TS puro, sem JSX — regra react-refresh): `normalizar()`, `ABREVIACOES`, `similaridade()`, `sugerirCandidatos(texto, candidatos)` → `{id, nome, confianca, motivo}[]`. Reutiliza a ideia de `normalizarTexto` de `nfe.ts` (caixa, NFD, acentos, espaços) e adiciona tokens + abreviações + score explicável ("3 de 4 palavras batem"). Nunca vincula automaticamente (D-22).

### Anti-Patterns a Evitar

- **Não** usar `null` como fallback de limiar (D-01) nem `qtd_alunos` opcional no payload (R-5).
- **Não** bloquear planejamento por falta de estoque (D-18); o bloqueio continua só no lançamento (`main.py:939-943`).
- **Não** mudar a forma da resposta de `GET /planejamento` (R-3) nem de `/cardapio`, `/refeicoes`, `/entregas` (campos novos são aditivos).
- **Não** adicionar frameworks de UI, Tailwind utilitário, nem dependências de matching (CONTEXT: "sem IA externa e sem dependência nova").

## Common Pitfalls

1. **Unidade de exibição × unidade interna:** alerta de limiar usa `saldo_atual / fator_conversao` (unidade de exibição) — mesmo cálculo de `main.py:1068-1078` e `DashboardGestao.tsx:saldoExibicao`.
2. **Quatro slots, três tipos (Fase 6, já mapeado):** Lanche da Manhã/Tarde → tipo `Lanche`; a derivação de slot→tipo deve espelhar `tipoParaLancamento` (`PainelCozinha.tsx:59-61`).
3. **Conversão faltante quebra lançamento/projeção:** na projeção o item vira "não avaliável" (não lança 400); no lançamento o comportamento atual de 400 é mantido.
4. **Rascunho de Entregas:** modal inline (item/fornecedor) NÃO pode resetar `linhas`/XML parseado (D-12) — estado vive em `Entregas.tsx`, não no modal.
5. **`E8` condicional:** o teste atual "ação sem justificativa → 400" vale apenas para origem `xml` (DELIV-05 revisado).
6. **Erro de contexto `verbatimModuleSyntax`:** novos tipos no frontend usam `import type` (AGENTS.md).
7. **JS Date vs backend:** semana backend 0=segunda; conversão `(getDay()+6)%7` (padrão `Planejamento.tsx:14`).

## Runtime State Inventory

| Estado | Onde | Regra |
|--------|------|-------|
| `limiar` por item | `Item.limiar` | NOT NULL, default 5.0, > 0 |
| Origem da entrega | `Entrega.origem` | `"xml"`/`"manual"`, legado `"manual"` |
| Config de alunos | `alunos_por_periodo` | 3 linhas; vazio = estado explícito |
| Projeção | calculada por request | nunca persistida |
| Fornecedores | `fornecedores` | nome obrigatório, CNPJ opcional |

## Validation Architecture

### Infraestrutura de validação

- **Backend:** pytest 7.x + TestClient; banco SQLite em memória (`conftest.py`); comando rápido: `pytest backend/tests/test_<arquivo>.py -x`; suíte completa: `pytest backend/tests/` (baseline 103 testes; deve permanecer verde ao fim de cada plano).
- **Frontend:** sem framework de teste (decisão do projeto); gates: `npm run build` (typecheck) + `npm run lint` + inspeção de contrato (grep em tokens/campos).
- **Migração:** verificada por execução idempotente em `backend/merenda.db` de desenvolvimento (não cobre testes — estes usam `create_all`).

### Estratégia de amostragem

- Após cada commit de tarefa: testes do arquivo tocado (`pytest backend/tests/test_X.py -x`).
- Após cada onda: suíte completa backend + build/lint frontend.
- Antes do `/gsd-verify-work`: suíte completa verde.

### Mapa de verificação por tarefa

| task ID | Plano | Onda | Requisito | Ameaça | Comportamento seguro | Tipo | Comando automatizado |
|---------|-------|------|-----------|--------|----------------------|------|----------------------|
| 08-01-01 | 08-01 | 1 | IMP-06/07 | T-08-01 | Migração idempotente; colunas com defaults | unit+migração | `pytest backend/tests/test_entregas.py -x` |
| 08-01-02 | 08-01 | 1 | IMP-07 | T-08-01 | Schemas com validação por origem | unit | `pytest backend/tests/ -x` |
| 08-01-03 | 08-01 | 1 | IMP-06/07 | — | Contratos TS espelham schemas | build | `cd frontend && npm run build` |
| 08-02-01 | 08-02 | 2 | IMP-01/02 | T-08-02 | Limiar > 0 exigido (400); default 5.0 | unit | `pytest backend/tests/test_itens.py backend/tests/test_dashboard.py -x` |
| 08-02-02 | 08-02 | 2 | IMP-02 | — | Alertas por item na unidade de exibição | unit | `pytest backend/tests/test_dashboard.py -x` |
| 08-02-03 | 08-02 | 2 | IMP-01/02 | — | Form de item + badges + copy dinâmica | build | `cd frontend && npm run build && npm run lint` |
| 08-03-01 | 08-03 | 3 | IMP-08/DELIV-05 | T-08-03 | Regras por origem no POST /entregas | unit | `pytest backend/tests/test_entregas.py -x` |
| 08-03-02 | 08-03 | 3 | IMP-03/D-13 | T-08-03 | POST /itens/inline admin+secretaria | unit | `pytest backend/tests/test_itens.py -x` |
| 08-04-01/02 | 08-04 | 1 | IMP-04/05 | — | Normalização determinística; score explicável | build | `cd frontend && npm run build && npm run lint` |
| 08-05-01..03 | 08-05 | 4 | IMP-06/07/08 | T-08-04 | Form com origem/data/fornecedor/obs/nota | build+manual | `cd frontend && npm run build && npm run lint` |
| 08-06-01/02 | 08-06 | 5 | IMP-03/04/05 | — | Modal inline preserva rascunho; sugestões confirmáveis | build | `cd frontend && npm run build && npm run lint` |
| 08-07-01..03 | 08-07 | 4 | IMP-09/10/11/MEAL-02 | T-08-05 | Derivação por slot; projeção não bloqueia | unit | `pytest backend/tests/test_refeicoes.py backend/tests/test_planejamento.py backend/tests/test_alunos_por_periodo.py -x` |
| 08-08-01..03 | 08-08 | 5 | IMP-09/10/MEAL-02 | — | Cozinheira sem digitar alunos; admin configura | build | `cd frontend && npm run build && npm run lint` |
| 08-09-01/02 | 08-09 | 5 | IMP-11/D-19 | — | Badge/painel/banner de projeção | build | `cd frontend && npm run build && npm run lint` |

### Requisitos de Onda 0

Infraestrutura existente cobre todas as frentes (conftest + fixtures + gates frontend). Nenhum scaffold novo necessário.

### Verificações manuais (backstops)

| Comportamento | Requisito | Por que manual | Roteiro |
|---------------|-----------|----------------|---------|
| Fluxo completo Entregas: XML sem correspondência → sugestões → cadastro inline → submit sem perder rascunho | IMP-03/04/05 | Interação visual | Subir backend+frontend; abrir `/admin/entregas`; upload XML de teste; conferir sugestões; cadastrar item; submeter |
| Badge de déficit + painel "Projeção da semana" + banner "Ver projeção" | IMP-11/D-19 | Visual/UX | Planejar semana com estoque insuficiente; conferir badge na célula, painel e banner |
| Cozinheira lança sem digitar alunos (avulso por slot) | IMP-09/10 | Fluxo de usuário | `/cozinha` com config de alunos cadastrada; lançar avulso selecionando slot |
