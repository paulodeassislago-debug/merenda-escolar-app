# Roadmap: Sistema de Gestão da Cozinha Escolar (PNAE)

## Overview

Sistema web para o Colégio Estadual do Campo Nancy de Castro Esteves — controle automático de estoque com baixa por consumo real, conversão de medidas caseiras → kg/L, planejamento semanal de cardápio, e auditoria de ajustes da cozinha, em conformidade com PNAE/SEC-BA. Backend-first com testes, depois frontend consome. Fonte detalhada: `.planning/PLAN.md` (plano de ação completo com tarefas por fase).

## Phases

- [x] **Phase 1: Fundação Backend** - Refatorar base (schemas.py, models.py, .env, require_perfil) sem quebrar testes
- [x] **Phase 2: CRUD Endpoints (Backend)** - CRUDs protegidos por perfil: usuários, itens, conversões, cardápio, receitas
- [x] **Phase 3: Lógica de Negócio (Backend)** - Planejamento, entregas, refeições auditadas, dashboard, cardápio público
- [x] **Phase 4: Fundação Frontend** - Auth JWT real: api.ts, AuthContext, ProtectedRoute, Layout, Login, rotas
- [ ] **Phase 5: Páginas Admin (Frontend)** - 7 páginas do painel administrativo
- [ ] **Phase 6: Cozinha + Gestão (Frontend)** - Painéis com dados reais e auditoria de ajustes
- [ ] **Phase 7: Finalização** - Cardápio público polido, suite completa de testes, ponto a ponta

## Phase Details

### Phase 1: Fundação Backend

**Goal**: Refatorar a base sem quebrar os 6 testes existentes; preparar terreno para as fases seguintes
**Depends on**: Nothing (first phase)
**Success Criteria** (what must be TRUE):

  1. `pytest backend/tests/ -v` 6/6 passando
  2. Backend sobe com schema novo (`uvicorn main:app`)

**Plans**: Executed pre-GSD (detalhes em PLAN.md Fase 1, tarefas 1.1–1.6)

### Phase 2: CRUD Endpoints (Backend)

**Goal**: Implementar todos os CRUDs protegidos por perfil + testes
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):

  1. 36 testes novos passando (42 no total)
  2. Todos os CRUDs documentados no Swagger `/docs` (15 rotas)

**Plans**: Executed pre-GSD (detalhes em PLAN.md Fase 2, tarefas 2.1–2.5)

### Phase 3: Lógica de Negócio (Backend)

**Goal**: Planejamento semanal, entregas, refeições auditadas, dashboard e cardápio público
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):

  1. 77 testes totais passando no backend
  2. Todos os endpoints do spec.md implementados (23 rotas no Swagger)

**Plans**: Executed pre-GSD (detalhes em PLAN.md Fase 3, tarefas 3.1–3.5)

### Phase 4: Fundação Frontend

**Goal**: Infra de autenticação real no frontend — substituir simulação por JWT
**Depends on**: Phase 3
**Success Criteria** (what must be TRUE):

  1. `npm run build` + `npm run lint` limpos (zero warnings)
  2. Login JWT verificado de ponta a ponta (admin/cozinheira, 401/403 corretos)
  3. Redirecionamento por perfil via `ROTA_POR_PERFIL`

**Plans**: Executed pre-GSD (detalhes em PLAN.md Fase 4, tarefas 4.1–4.6)

### Phase 5: Páginas Admin (Frontend)

**Goal**: 7 páginas do painel administrativo (Dashboard, Usuários, Itens, Cardápio, Receitas, Planejamento, Entregas)
**Depends on**: Phase 4 (auth real + api.ts + Layout); consome endpoints das Phases 2–3
**Success Criteria** (what must be TRUE):

  1. `npm run build` limpo (typecheck + bundle, zero erros)
  2. `npm run lint` zero warnings/errors
  3. Admin consegue gerenciar usuários, itens, cardápio, receitas, planejamento e entregas via UI (testes manuais F6–F12 do TESTING.md)
  4. Entregas suporta entrada manual com justificativa obrigatória ao alterar/excluir + upload de XML NF-e populando a tabela

**Plans**: 1/6 plans executed

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Fatia vertical tracer: tipos + constantes + 6 rotas + Usuários CRUD completo + Dashboard real (F6, F7)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 05-02-PLAN.md — Itens: CRUD de estoque com badge de baixo estoque + conversões por item (F8)
- [ ] 05-03-PLAN.md — Cardápio + Receitas: CRUD de pratos e editor de ingredientes (F9)
- [ ] 05-04-PLAN.md — Planejamento: grade semanal 7×4 com upsert por vigência (F10)
- [ ] 05-05-PLAN.md — Entregas: entrada manual com justificativa PNAE + parser XML NF-e (F11, F12)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 05-06-PLAN.md — Portões de saída: build/lint zero, regressão pytest (77), varredura de anti-padrões (D-12)

### Phase 6: Cozinha + Gestão (Frontend)

**Goal**: Evoluir painéis existentes com dados reais e auditoria
**Depends on**: Phase 3 (planejamento + refeições) e Phase 4 (auth real + api.ts)
**Success Criteria** (what must be TRUE):

  1. Fluxo cozinheira completo com auditoria (testes manuais F13–F15)
  2. Estoque deduzido corretamente após confirmação de refeição

**Plans**: TBD

### Phase 7: Finalização

**Goal**: Cardápio público polido, suite completa de testes, verificação ponto a ponta
**Depends on**: Phase 5 e Phase 6
**Success Criteria** (what must be TRUE):

  1. `pytest backend/tests/ -v` — todos os testes passando
  2. `npm run build` + `npm run lint` — zero erros
  3. Checklist F1–F17 do TESTING.md executado sem falhas
  4. Conversão medidas caseiras → dedução estoque → registro refeição → auditoria verificada ponto a ponta

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação Backend | - | Complete | 2026-07-31 |
| 2. CRUD Endpoints (Backend) | - | Complete | 2026-07-31 |
| 3. Lógica de Negócio (Backend) | - | Complete | 2026-07-31 |
| 4. Fundação Frontend | - | Complete | 2026-07-31 |
| 5. Páginas Admin (Frontend) | 1/6 | In Progress|  |
| 6. Cozinha + Gestão (Frontend) | 0/? | Not started | - |
| 7. Finalização | 0/? | Not started | - |
