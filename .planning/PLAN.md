# Plano de Ação — Sistema de Gestão da Cozinha Escolar (PNAE)

**Data:** 2026-07-31
**Fontes:** PRD.md, spec.md, TESTING.md, context.md, AGENTS.md, DESIGN.md, .planning/codebase/*

---

## 1. Visão Geral

Sistema web para o **Colégio Estadual do Campo Nancy de Castro Esteves** — controle automático de estoque com baixa por consumo real, conversão de medidas caseiras → kg/L, planejamento semanal de cardápio, e auditoria de ajustes da cozinha. Em conformidade com PNAE/SEC-BA.

**Stack:** Backend Python 3.12 + FastAPI 0.139 + SQLAlchemy 2.0 + SQLite | Frontend React 19 + Vite 8 + TypeScript 6.0 | Deploy Docker + Coolify em VPS única.

**Estratégia:** evoluir o código existente (não reescrever). Backend-first com testes, depois frontend consome.

---

## 2. Estado Atual

### 2.1 Bem-feito (manter)

| Item | Evidência |
|---|---|
| Auth JWT + bcrypt + 6 testes verdes | `backend/auth.py`, `tests/test_auth.py` |
| Infra de testes (fixtures por perfil, SQLite em memória StaticPool) | `tests/conftest.py:90` |
| Loop core de conversão + baixa automática | `main.py:115-151` |
| PainelCozinha funcional (modal, edição, submit) | `PainelCozinha.tsx:207` |
| DashboardGestao com loading/error/alertas | `DashboardGestao.tsx:111` |
| Dockerfiles prontos | `backend/Dockerfile`, `frontend/Dockerfile` |
| Documentação detalhada e alinhada | PRD, spec, TESTING, context |

### 2.2 Gaps (construir/corrigir)

| # | Gap | Severidade | Local |
|---|---|---|---|
| G1 | Login frontend simulado (string match, sem JWT) | 🔴 Crítico | `Login.tsx:14-17` |
| G2 | `id_usuario: 1` hardcoded em toda chamada de API | 🔴 Crítico | `PainelCozinha.tsx:82` |
| G3 | 6 tabelas do PRD ausentes (receitas, planejamento, entregas, itens_entrega, refeicao_itens, cardapio_itens) | 🔴 Crítico | `models.py:38` |
| G4 | Sem autorização por perfil nos endpoints existentes | 🟠 Alto | `main.py:85-151` |
| G5 | `cardapiosPadrao` hardcoded no frontend | 🟠 Alto | `PainelCozinha.tsx:7-42` |
| G6 | URLs de API hardcoded em 2 lugares | 🟠 Alto | `PainelCozinha.tsx:90`, `DashboardGestao.tsx:15` |
| G7 | Sem ProtectedRoute / AuthContext / Layout / api.ts | 🟠 Alto | `App.tsx` |
| G8 | Backend flat sem `schemas.py` | 🟡 Médio | `main.py` |
| G9 | Modelos com nomes antigos (Estoque→Item, DicionarioConversoes→Conversao) | 🟡 Médio | `models.py` |
| G10 | Sem `.env` (SECRET_KEY com fallback dev) | 🟡 Médio | `auth.py:14` |
| G11 | Sem CHECK(perfil) no modelo Usuario | 🟡 Médio | `models.py:10` |
| G12 | Tailwind instalado mas não usado; CSS plain | 🟢 Baixo | — |
| G13 | Sem CI/CD; sem Alembic (create_all) | 🟢 Baixo | — |

---

## 3. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Identidade visual | DESIGN.md (paleta/regras do brasão da escola) | Logo oficial em `frontend/src/assets/`; tokens CSS verde-escuro `#124C0F` / verde-vivo `#48BB2C` / amarelo `#C5D227`; obrigatório nas Fases 4–7 |
| Estilização | CSS plain co-localizado | Convenção atual do projeto; Tailwind mantido como dependência não-ativa |
| Migração de banco | `create_all` + deletar `merenda.db` | Suficiente para SQLite dev; Alembic adiado p/ fase de produção com PostgreSQL |
| Token JWT | localStorage + `fetchWithAuth` centralizado | Simplicidade; adequado para app interno escolar |
| Nomes de tabelas | Renomear p/ padrão PRD (Estoque→Item, etc.) | Alinhamento com spec; nomes em português mantidos |
| Estratégia | Evoluir existente, não reescrever | Decisão do PRD seção 5 |
| XML NF-e | Parse no frontend com `fast-xml-parser` | Decisão do PRD seção 5 |
| Testes frontend | Manuais (F1–F17) | Sem framework de E2E configurado; Playwright adiado |

---

## 4. Plano de Fases

### Fase 1 — Fundação Backend ✅ CONCLUÍDA (2026-07-31)

**Objetivo:** refatorar a base sem quebrar os 6 testes existentes. Preparar o terreno para as fases seguintes.

| # | Tarefa | Arquivos | Detalhe |
|---|---|---|---|
| 1.1 | [x] Extrair `schemas.py` | `backend/schemas.py` (novo), `main.py` | Mover Pydantic de `main.py` para arquivo dedicado |
| 1.2 | [x] Refatorar `models.py` | `backend/models.py` | Renomear: `Estoque`→`Item`, `DicionarioConversoes`→`Conversao` com `item_id` FK, `CardapioBase`→`CardapioItem`. Adicionar: `Receita`, `Planejamento`, `Entrega`, `ItemEntrega`, `RefeicaoItem`. Adicionar CHECK(perfil) no `Usuario`. Ver schema SQL completo em `spec.md:22-100`. |
| 1.3 | [x] Criar `.env` | `backend/.env` (novo) | `SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL` |
| 1.4 | [x] Adicionar `require_perfil` | `backend/auth.py` | Dependência FastAPI: `require_perfil(db, token, *perfis)` → 403 se perfil errado |
| 1.5 | [x] Atualizar `main.py` | `backend/main.py` | Importar de `schemas.py`; endpoints existentes continuam funcionando |
| 1.6 | [x] Deletar DB + testar | `backend/merenda.db` | Remover DB antigo; rodar `pytest -v` (6 verdes); subir backend |

**Critério de saída:** ✅ `pytest backend/tests/ -v` 6/6 passando (3.37s). Backend sobe com schema novo (`uvicorn main:app`).

---

### Fase 2 — CRUD Endpoints (Backend) ✅ CONCLUÍDA (2026-07-31)

**Objetivo:** implementar todos os CRUDs protegidos por perfil + testes.

| # | Tarefa | Arquivos | Endpoints | Testes |
|---|---|---|---|---|
| 2.1 | [x] Usuários (admin) | `main.py` | GET/POST `/usuarios`, PUT/DELETE `/usuarios/{id}` | `tests/test_usuarios.py` |
| 2.2 | [x] Itens (admin CRUD, todos GET) | `main.py` | GET/POST `/itens`, PUT/DELETE `/itens/{id}` | `tests/test_itens.py` |
| 2.3 | [x] Conversões (admin) | `main.py` | GET `/conversoes?item_id=`, POST/DELETE `/conversoes/{id}` | `tests/test_conversoes.py` |
| 2.4 | [x] Cardápio (admin+sec) | `main.py` | GET/POST `/cardapio`, PUT/DELETE `/cardapio/{id}` | `tests/test_cardapio.py` |
| 2.5 | [x] Receitas (admin) | `main.py` | GET `/cardapio/{id}/receita`, POST, PUT/DELETE item | junta com 2.4 |

**Padrão de testes (cada grupo):**
- `test_N_1_post` — cria registro, 200, dados conferem
- `test_N_2_get` — lista inclui o registro criado
- `test_N_3_put` — atualiza, GET confirma alteração
- `test_N_4_delete` — remove, GET confirma ausência
- `test_N_5_sem_token` — 401
- `test_N_6_perfil_errado` — 403

**Critério de saída:** ✅ 36 testes novos passando (42 no total, 24.21s). Todos os CRUDs documentados no Swagger `/docs` (15 rotas).

**Nota:** o `POST /conversoes` legado (por `nome_ingrediente`) foi substituído pela versão do spec (por `item_id`) — o frontend atual não o utilizava.

---

### Fase 3 — Lógica de Negócio (Backend) ✅ CONCLUÍDA (2026-07-31)

**Objetivo:** planejamento semanal, entregas, refeições auditadas, dashboard e cardápio público.

| # | Tarefa | Endpoints | Testes | Descrição |
|---|---|---|---|---|
| 3.1 | [x] Planejamento | GET `/planejamento?data=`, POST, DELETE | `tests/test_planejamento.py` | Admin+sec definem cardápio por dia×tipo |
| 3.2 | [x] Entregas | GET/POST `/entregas`, GET `/entregas/{id}` | `tests/test_entregas.py` (E1–E5) | POST atualiza estoque; itens com acao (recebido/alterado/excluído) + justificativa |
| 3.3 | [x] Refeições | GET `/refeicoes?data=`, POST `/refeicoes`, GET `/refeicoes/hoje` | `tests/test_refeicoes.py` (R1–R6) | Conversão caseira→kg, dedução estoque, `refeicao_itens` com original/ajustada/justificativa |
| 3.4 | [x] Dashboard | GET `/admin/dashboard` | `tests/test_dashboard.py` (D1–D2) | 4 seções agregadas: estoque, refeições hoje, entregas, alunos |
| 3.5 | [x] Cardápio público | GET `/publico/cardapio?data=` | `tests/test_publico.py` (P1–P2) | Sem auth; usa data atual se não informada |

**Critério de saída:** ✅ 77 testes totais passando no backend (48.16s). Todos os endpoints do spec.md implementados (23 rotas no Swagger).

**Notas de implementação:**
- **Planejamento** usa vigência: para cada slot (dia_semana × tipo), vale a entrada com `data_inicio_vigencia` mais recente ≤ data consultada. POST faz upsert por (slot + vigência).
- **Auditoria de refeições:** quando ligada a um `planejamento_id`, quantidades divergentes da receita (ou itens fora dela) exigem justificativa (400). `quantidade_original` vem da receita; `quantidade_ajustada` do lançamento.
- **Entregas:** `alterado`/`excluído` exigem justificativa (400). `recebido`/`alterado` somam ao saldo; `excluído` não altera.
- **Fix timezone:** `Entrega.data_hora` e `Refeicao.data_hora` mudaram de `utcnow` para horário local (`datetime.now`) — os filtros "de hoje" (`date.today()`) são locais por natureza e divergiam do UTC após as 21h (UTC-3).
- **Baixo estoque:** limiar de 5.0 (unidade oficial) definido em `LIMIAR_BAIXO_ESTOQUE` no `main.py`.

---

### Fase 4 — Fundação Frontend ✅ CONCLUÍDA (2026-07-31)

**Objetivo:** infra de autenticação real no frontend — substituir simulação por JWT.

| # | Tarefa | Arquivo | Detalhe |
|---|---|---|---|
| 4.1 | [x] API client | `src/api.ts` (novo) | `fetchWithAuth(url, options)` — anexa JWT do localStorage no header, base URL de `.env` |
| 4.2 | [x] Auth context | `src/auth.tsx` + `src/auth-context.ts` (novos) | `AuthContext` + `AuthProvider`: estado `{ user, token, perfil }`, `login(nome, senha)`, `logout()`, helpers `isAdmin`, `isSecretaria`, `isCozinheira` |
| 4.3 | [x] Protected route | `src/components/ProtectedRoute.tsx` (novo) | Verifica `isAuthenticated` + perfil; redireciona para `/` se inválido |
| 4.4 | [x] Layout | `src/components/Layout.tsx` (novo) | Sidebar condicional por perfil + header com nome do usuário e botão logout |
| 4.5 | [x] Login real | `src/pages/Login.tsx` | Chamar `POST /auth/login` → `AuthContext.login(token, perfil)` → redirect por perfil (admin→`/admin`, secretaria→`/gestao`, cozinheira→`/cozinha`) |
| 4.6 | [x] Atualizar rotas | `src/App.tsx` | Envolver em `AuthProvider`; rotas protegidas com `ProtectedRoute`; `Layout` nas páginas autenticadas; rota pública `/cardapio` |

**Critério de saída:** ✅ `npm run build` + `npm run lint` limpos (zero warnings). Login JWT verificado de ponta a ponta via curl (admin/cozinheira, 401/403 corretos). Redirecionamento por perfil implementado via `ROTA_POR_PERFIL`.

**Notas de implementação:**
- **Split auth:** `auth-context.ts` (contexto + `useAuth`, sem JSX) separado de `auth.tsx` (`AuthProvider`) para não disparar a regra `react-refresh/only-export-components` (TESTING.md exige zero warnings).
- **CardapioPublico** criado em versão simples (lista pratos do dia via `GET /publico/cardapio`, visual cerimonial do DESIGN.md) — Fase 7 cuida do polimento/responsividade (7.1).
- **`admin/Dashboard.tsx`** é placeholder mínimo para a rota `/admin` não quebrar — Fase 5 implementa as métricas reais.
- **Seed dev:** 3 usuários criados em `backend/merenda.db` (`admin/admin123`, `secretaria/secretaria123`, `cozinheira/cozinheira123`) — sem seed, o primeiro login é impossível (só admin cria usuários).
- **UX (ui-ux-pro-max):** `role="alert"` no erro de login, feedback de submit (botão "Entrando…" desabilitado), labels com `htmlFor`, `useMemo` no valor do AuthContext.
- **Páginas legadas** (`PainelCozinha`, `DashboardGestao`) continuam funcionando dentro do `Layout`/`ProtectedRoute` porque suas rotas de API legadas não exigem auth — serão migradas na Fase 6.

---

### Fase 5 — Páginas Admin (Frontend)

**Objetivo:** 7 páginas do painel administrativo.

| # | Página | Arquivo | Funcionalidade |
|---|---|---|---|
| 5.1 | Dashboard | `src/pages/admin/Dashboard.tsx` | 4 cards com métricas do `GET /admin/dashboard` |
| 5.2 | Usuários | `src/pages/admin/Usuarios.tsx` | Tabela + modal CRUD |
| 5.3 | Itens | `src/pages/admin/Itens.tsx` | Tabela estoque + CRUD + destaque baixo estoque |
| 5.4 | Cardápio | `src/pages/admin/Cardapio.tsx` | Lista de pratos + CRUD + link para receitas |
| 5.5 | Receitas | `src/pages/admin/Receitas.tsx` | Editor de ingredientes por prato (add/remover/editar qtd) |
| 5.6 | Planejamento | `src/pages/admin/Planejamento.tsx` | Grade semanal (dias × tipos de refeição) com dropdown de pratos |
| 5.7 | Entregas | `src/pages/admin/Entregas.tsx` | Manual (tabela editável + justificativa obrigatória ao alterar/excluir) + upload XML (parse com `fast-xml-parser`, popula tabela) |

**Critério de saída:** `npm run build` limpo. Testes manuais F6–F12 passando.

---

### Fase 6 — Cozinha + Gestão (Frontend)

**Objetivo:** evoluir painéis existentes com dados reais e auditoria.

| # | Tarefa | Arquivo | Detalhe |
|---|---|---|---|
| 6.1 | Remover hardcoded | `src/pages/PainelCozinha.tsx` | Substituir `cardapiosPadrao` por `GET /planejamento?data=hoje` |
| 6.2 | Ajustes auditados | `src/pages/PainelCozinha.tsx` | Botão "+" (add ingrediente do catálogo), lápis (editar qtd → abre justificativa), X (remover → abre justificativa). Marcar visualmente itens alterados. |
| 6.3 | POST refeições novo | `src/pages/PainelCozinha.tsx` | Enviar `tipo_refeicao`, `planejamento_id`, `itens` com `item_id` + `quantidade` + `medida_caseira` + `justificativa` |
| 6.4 | Adaptar Gestão | `src/pages/Gestao.tsx` (renomear) | DashboardGestao → Gestao; adicionar links para `/admin/entregas` e `/admin/planejamento`; proteger para perfil secretaria |

**Critério de saída:** Fluxo cozinheira completo com auditoria. Testes manuais F13–F15. Estoque deduzido corretamente após confirmação.

---

### Fase 7 — Finalização

| # | Tarefa | Detalhe |
|---|---|---|
| 7.1 | Cardápio público | `src/pages/CardapioPublico.tsx` — `GET /publico/cardapio`, layout limpo, responsivo, sem elementos de navegação autenticada |
| 7.2 | Testes backend | `pytest backend/tests/ -v` — todos os ~50 testes passando |
| 7.3 | Build + lint | `npm run build` (typecheck + bundle) + `npm run lint` — zero erros |
| 7.4 | Testes manuais | Executar checklist F1–F17 do `TESTING.md` |
| 7.5 | Ponto a ponta | Verificar conversão medidas caseiras → dedução estoque → registro refeição → auditoria |

---

## 5. Mapa de Rotas

### Atual (implementado)

```
/          →  Login.tsx          (simulado, sem JWT)
/cozinha   →  PainelCozinha.tsx  (id_usuario: 1, cardapio hardcoded)
/gestao    →  DashboardGestao.tsx (sem auth, GET /estoque)
```
Nenhuma rota tem proteção por perfil.

### Planejado (pós-implementação)

| Rota | Página | Perfil | Fase |
|---|---|---|---|
| `/` | Login.tsx | Todos | F4 |
| `/cardapio` | CardapioPublico.tsx | Visitante (público) | F7 |
| `/admin` | admin/Dashboard.tsx | Admin | F5 |
| `/admin/usuarios` | admin/Usuarios.tsx | Admin | F5 |
| `/admin/itens` | admin/Itens.tsx | Admin | F5 |
| `/admin/cardapio` | admin/Cardapio.tsx | Admin | F5 |
| `/admin/receitas/:id` | admin/Receitas.tsx | Admin | F5 |
| `/admin/planejamento` | admin/Planejamento.tsx | Admin + Secretaria | F5 |
| `/admin/entregas` | admin/Entregas.tsx | Admin + Secretaria | F5 |
| `/cozinha` | PainelCozinha.tsx | Cozinheira | F6 |
| `/gestao` | Gestao.tsx | Secretaria | F6 |

**Redirect pós-login:** admin → `/admin` | secretaria → `/gestao` | cozinheira → `/cozinha`

---

## 6. Dependências e Riscos

### Dependências entre fases

```
F1 (fundação) ──► F2 (CRUDs) ──► F3 (negócio)
                                      │
                     ┌────────────────┘
                     ▼
               F4 (frontend fundação)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    F5 (admin pages)    F6 (cozinha+gestão)
          │                     │
          └──────────┬──────────┘
                     ▼
               F7 (finalização)
```

- **F6 depende de F3** (planejamento + refeições novos) **e F4** (auth real + api.ts)
- **F5 depende de F2/F3** (CRUDs + negócio) **e F4** (api.ts + Layout)
- **F2 e F3 podem ser paralelizadas** no backend (CRUDs e negócio em ondas)

### Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Renomear tabelas quebra dados existentes | Dados de dev perdidos | Deletar `merenda.db` e recriar (SQLite dev, sem dados críticos) |
| Concorrência em dedução de estoque | Saldo inconsistente | Transações SQLAlchemy por request (escopo atual não tem concorrência real) |
| `create_all` sem migrações | Perda de dados em produção | Adiar Alembic para quando migrar p/ PostgreSQL |
| SECRET_KEY hardcoded no fallback | Token previsível em dev | `.env` na F1; valor dev aceitável até deploy |

---

## 7. Critério de Conclusão por Fase

Conforme `TESTING.md`, cada fase está concluída quando:

1. ✅ `pytest backend/tests/ -v` — todos os testes do backend passam
2. ✅ `npm run build` — compila sem erros de TypeScript
3. ✅ `npm run lint` — zero warnings/errors
4. ✅ Backend sobe sem erros (`uvicorn main:app --port 8000`)
5. ✅ Testes manuais de frontend aplicáveis executados sem falhas

---

## 8. Próximo Passo

Rodar `/gsd-execute-phase` para a Fase 1 — ou iniciar manualmente pelo item 1.1 (extrair `schemas.py`).