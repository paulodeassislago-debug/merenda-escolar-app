# Roadmap: Sistema de Gestao da Cozinha Escolar (PNAE)

## Overview

Construir e finalizar o sistema web de gestao da cozinha escolar em incrementos backend-first. As fases 1-4 estabilizaram o backend e a infraestrutura frontend; a fase 5 entregou o painel administrativo; a fase 6 moderniza cozinha e gestao; a fase 7 fecha experiencia publica, testes e verificacao ponta a ponta; a fase 8 concentra melhorias operacionais posteriores.

## Phases

- [x] **Phase 1: Fundacao Backend** - Modelos, schemas, configuracao, JWT e autorizacao base.
- [x] **Phase 2: CRUD Endpoints (Backend)** - CRUDs protegidos de usuarios, itens, conversoes, cardapio e receitas.
- [x] **Phase 3: Logica de Negocio (Backend)** - Planejamento, entregas, refeicoes auditadas, dashboard e cardapio publico.
- [x] **Phase 4: Fundacao Frontend** - Auth JWT real, cliente API, rotas protegidas e layout.
- [x] **Phase 5: Paginas Admin (Frontend)** - Sete paginas administrativas, entregas XML e portoes de saida.
- [x] **Phase 6: Cozinha + Gestao (Frontend)** - Painel da cozinheira e painel da secretaria com dados reais; implementação, segurança e UAT concluídos.
- [x] **Phase 7: Finalizacao** - Cardapio publico, testes manuais completos e verificacao ponta a ponta. (completed 2026-08-04)
- [ ] **Phase 8: Improvements** - Limiar de estoque por item, entregas com origem/fornecedor e auditoria diferenciada, cadastro inline de itens XML, alunos fixos por período, projeção cumulativa de estoque no planejamento e sugestões de correspondência.

## Phase Details

### Phase 1: Fundacao Backend

**Goal**: Preparar modelos, schemas, ambiente e autorizacao sem quebrar a base existente.
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-03, STOCK-01, QUAL-01
**Success Criteria**:

  1. Backend sobe com schema inicial e configuracao de ambiente.
  2. Autenticacao JWT e hash de senha funcionam.
  3. Testes base passam.

**Plans**: Executed pre-GSD
**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/STACK.md`

### Phase 2: CRUD Endpoints (Backend)

**Goal**: Disponibilizar CRUDs de dominio protegidos por perfil.
**Depends on**: Phase 1
**Requirements**: AUTH-04, STOCK-01, STOCK-03, MENU-01, MENU-02
**Success Criteria**:

  1. CRUDs de usuarios, itens, conversoes, cardapio e receitas funcionam.
  2. Rotas sem token e com perfil incorreto retornam 401/403.
  3. Contratos aparecem no Swagger e possuem testes.

**Plans**: Executed pre-GSD
**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/ARCHITECTURE.md`

### Phase 3: Logica de Negocio (Backend)

**Goal**: Implementar planejamento, entregas, refeicoes, dashboard e cardapio publico.
**Depends on**: Phase 2
**Requirements**: MENU-05..MENU-09, DELIV-01..DELIV-07, MEAL-01..MEAL-06, DASH-01..DASH-02, PUBLIC-01
**Success Criteria**:

  1. Entregas atualizam estoque com auditoria e validacao atomica.
  2. Refeicoes convertem medidas, deduzem estoque e registram auditoria.
  3. Planejamento por vigencia, dashboard e cardapio publico funcionam.
  4. Testes backend passam integralmente.

**Plans**: Executed pre-GSD
**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/TESTING.md`

### Phase 4: Fundacao Frontend

**Goal**: Substituir login simulado por auth JWT real e estabelecer a casca protegida da aplicacao.
**Depends on**: Phase 3
**Requirements**: AUTH-05, AUTH-06, QUAL-02, QUAL-03
**Success Criteria**:

  1. Login, logout, persistencia de token e redirecionamento por perfil funcionam.
  2. Rotas protegidas bloqueiam perfis incorretos.
  3. Build e lint passam sem warnings.

**Plans**: Executed pre-GSD
**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/CONVENTIONS.md`

### Phase 5: Paginas Admin (Frontend)

**Goal**: Entregar sete paginas administrativas consumindo a API real.
**Depends on**: Phase 4
**Requirements**: STOCK-02, STOCK-04..STOCK-06, MENU-01..MENU-04, MENU-07..MENU-08, DELIV-01..DELIV-07, DASH-01..DASH-02, QUAL-02, QUAL-03
**Success Criteria**:

  1. Dashboard, usuarios, itens, cardapio, receitas, planejamento e entregas funcionam.
  2. XML NF-e pode ser revisado e confirmado com auditoria.
  3. Unidades livres e `Lanche` unificado respeitam os contratos atuais.
  4. Build, lint e a suite backend atual passam (100 testes no baseline deste contexto).

**Plans**: 7 plans complete

**Manual UAT:** F6-F12 concluído; o upload XML NF-e (F12) foi validado manualmente em 2026-08-03. A validação fiscal formal contra schema SEFAZ permanece fora do escopo.

Plans:

- [x] 05-01: Fundacao compartilhada, usuarios e dashboard
- [x] 05-02: Itens, estoque e conversoes
- [x] 05-03: Cardapio e receitas
- [x] 05-04: Grade de planejamento
- [x] 05-05: Entregas manual e XML NF-e
- [x] 05-06: Portoes de saida e regressao
- [x] 05-07: Unidade livre e tipo `Lanche` unificado

**Canonical refs**: `.planning/phases/05-p-ginas-admin-frontend/05-CONTEXT.md`, `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md`, `.planning/codebase/TESTING.md`

### Phase 6: Cozinha + Gestao (Frontend)

**Goal**: Modernizar os paineis da cozinheira e da secretaria com planejamento, API autenticada e auditoria reais.
**Depends on**: Phase 5
**Requirements**: MEAL-07, MEAL-08, MGMT-01, MGMT-02
**Success Criteria**:

  1. Cozinheira seleciona refeicao e carrega planejamento do dia via API.
  2. Ajustes de ingredientes exigem justificativa e ficam visiveis.
  3. Confirmacao deduz estoque e registra refeicao com usuario autenticado.
  4. Secretaria consulta dados reais e navega para planejamento e entregas.

**Plans**: 2 plans complete

**Manual UAT:** F13-F15 validado manualmente em 2026-08-04 — 8/8 fluxos passam no navegador (cozinha, gestão, sessão expirada e layouts 320px/768px/desktop); detalhes em `06-UAT.md`.

Plans:

- [x] 06-01-PLAN.md — Modernizar o fluxo real da cozinheira com receita, ajustes auditáveis e baixa autenticada
- [x] 06-02-PLAN.md — Modernizar o painel da secretaria com dados reais, estados e navegação administrativa

**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md`, `.planning/phases/06-cozinha-gestao-frontend/06-CONTEXT.md`, `frontend/src/api.ts`, `frontend/src/auth-context.ts`, `backend/requirements.txt`

### Phase 7: Finalizacao

**Goal**: Fechar o produto com cardapio publico responsivo, checklist completo e verificacao ponta a ponta.
**Depends on**: Phase 6
**Requirements**: PUBLIC-02, QUAL-05, QUAL-06
**Success Criteria**:

  1. Cardapio publico funciona sem login e em mobile/tablet.
  2. Build, lint e todos os testes passam.
  3. Fluxo conversao → baixa → refeicao → auditoria e verificado.
  4. Checklist manual F1-F17 passa.

**Plans**: 2/2 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Entregar o cardápio público responsivo com quatro slots, estados e disclosure acessível

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Consolidar validação, UAT F1-F17 e prova ponta a ponta de conversão, baixa e auditoria

**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/TESTING.md`

### Phase 8: Improvements

**Goal**: Reduzir alertas de estoque inadequados, evitar interrupcao no recebimento de itens novos, diminuir duplicidades causadas por nomes de fornecedores e ajustar os fluxos operacionais de entregas e refeicoes as regras reais da escola.
**Depends on**: Phase 7
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09, IMP-10, IMP-11 (revisoes de DELIV-05, DELIV-06 e MEAL-02)
**Success Criteria**:

  1. Cada item pode ter limiar próprio, com fallback compatível de 5 e alertas calculados na unidade de exibição.
  2. Item XML não reconhecido pode ser cadastrado dentro do fluxo de Entregas e vinculado à linha sem perder o rascunho.
  3. Nomes de fornecedores são normalizados e produzem sugestões explicáveis, sem associação automática silenciosa.
  4. Toda entrega tem origem, data e fornecedor; manual exige observações e XML exige número da nota com justificativa por item.
  5. O admin configura alunos por período; a cozinheira lança refeições sem digitar alunos e a receita escala pelo total do slot.
  6. O planejamento avisa (sem bloquear) os itens que faltarão com projeção cumulativa da semana; o lançamento continua bloqueando.
  7. Os fluxos existentes de entrega, auditoria, conversão e baixa permanecem íntegros (regressões manuais e automatizadas).

**Plans**: 9 planos (contexto capturado em 2026-08-05; planejamento concluído em 2026-08-05)

**Wave 1** *(independente — paralelo)*
- [ ] 08-01-PLAN.md — Fundação backend: models, migração SQLite, schemas, fornecedores, contratos TS
- [ ] 08-04-PLAN.md — Motor de matching determinístico (matching.ts)

**Wave 2** *(bloqueado pela Wave 1 — main.py)*
- [ ] 08-02-PLAN.md — Limiar individual: backend (validação 400, dashboard) + Itens.tsx + DashboardGestao

**Wave 3** *(bloqueado pela Wave 2 — main.py)*
- [ ] 08-03-PLAN.md — Entregas backend: regras por origem, fornecedores, POST /itens/inline

**Wave 4** *(bloqueado pelas Waves 1/3)*
- [ ] 08-05-PLAN.md — Entregas frontend: origem/data/fornecedor (autocomplete+inline), pré-preenchimento XML
- [ ] 08-07-PLAN.md — Backend alunos por período + lançamento por slot + projeção cumulativa

**Wave 5** *(bloqueado pelas Waves 4)*
- [ ] 08-06-PLAN.md — Cadastro inline de item + sugestões de linha XML
- [ ] 08-08-PLAN.md — Página admin Alunos + PainelCozinha sem digitação de alunos
- [ ] 08-09-PLAN.md — Projeção na UI: badge, painel colapsável e banner

**Cross-cutting constraints:** auditoria por origem em entregas (08-03/08-05); cozinheira não digita alunos — total derivado por slot (08-07/08-08); configuração de alunos ausente é estado explícito, não erro (08-08/08-09); planejamento não bloqueia por estoque — lançamento continua bloqueando (08-07/08-09).
**Canonical refs**: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/08-improvements/08-CONTEXT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md`

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundacao Backend | pre-GSD | Complete | 2026-07-31 |
| 2. CRUD Endpoints | pre-GSD | Complete | 2026-07-31 |
| 3. Logica de Negocio | pre-GSD | Complete | 2026-07-31 |
| 4. Fundacao Frontend | pre-GSD | Complete | 2026-07-31 |
| 5. Paginas Admin | 7/7 | Complete | 2026-08-03 |
| 6. Cozinha + Gestao | 2/2 | Complete | 2026-08-04 |
| 7. Finalizacao | 2/2 | Complete    | 2026-08-04 |
| 8. Improvements | 0/? | Backlog | - |

---
*Last updated: 2026-08-04 after Phase 6 UAT validation (F13-F15 complete)*
