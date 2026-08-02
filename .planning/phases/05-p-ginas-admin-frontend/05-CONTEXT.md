# Phase 5: Páginas Admin (Frontend) - Context

**Gathered:** 2026-07-31
**Status:** Ready for planning
**Source:** Decisões sintetizadas de `.planning/PLAN.md` (seções 3, 4-Fase-5, 5) — travadas pelo usuário no plano de ação aprovado.

<domain>
## Phase Boundary

Implementar as 7 páginas do painel administrativo: Dashboard, Usuários, Itens, Cardápio, Receitas, Planejamento e Entregas — consumindo a API já construída e testada (Phases 2–3, 23 rotas) sobre a infra de auth real da Phase 4 (`api.ts`, `AuthContext`, `ProtectedRoute`, `Layout`). Evoluir painéis da cozinheira/secretaria é Phase 6; polimento do cardápio público é Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Estilização e identidade visual
- **D-01:** CSS plain co-localizado por página (ex.: `Usuarios.css` ao lado de `Usuarios.tsx`), seguindo o padrão de `Login.css`/`CardapioPublico.css`. Tailwind NÃO é usado (dependência inativa).
- **D-02:** Tokens visuais obrigatórios do `DESIGN.md` (definidos em `src/index.css` `:root`): verde-escuro `#124C0F`, verde-vivo `#48BB2C`, amarelo `#C5D227`. Logo (`src/assets/Logo Nancy (Logotipo) (1).jpg`) é JPG com fundo branco — renderizar apenas em superfícies claras.

### Acesso à API e autenticação
- **D-03:** Todas as chamadas via `fetchJson<T>`/`fetchWithAuth` de `src/api.ts` (base URL de `VITE_API_URL`, JWT do localStorage anexado automaticamente). Nenhuma URL hardcoded, nenhum `id_usuario` no body — o backend resolve o usuário pelo token.
- **D-04:** Tipos compartilhados em `src/types.ts` — adicionar/espelhar os shapes dos schemas Pydantic do backend (`backend/schemas.py`) conforme necessário (Item, Conversao, CardapioItem, Receita, Planejamento, Entrega, ItemEntrega, DashboardResponse).

### Rotas e proteção por perfil
- **D-05:** Novas rotas em `src/App.tsx`, todas dentro de `<ProtectedRoute><Layout>`: `/admin` (Dashboard, admin), `/admin/usuarios` (admin), `/admin/itens` (admin), `/admin/cardapio` (admin), `/admin/receitas/:id` (admin), `/admin/planejamento` (admin + secretaria), `/admin/entregas` (admin + secretaria).
- **D-06:** Sidebar do `Layout.tsx` ganha os links admin condicionados por perfil (`isAdmin`, `isSecretaria` do `useAuth`).

### Padrão de páginas CRUD
- **D-07:** Usuários, Itens, Cardápio seguem o padrão tabela + modal CRUD (criar/editar/excluir com feedback visual), conforme testes F7–F9 do `TESTING.md`. Itens destaca visualmente baixo estoque (limiar definido no backend: 5.0 unidade oficial — badge/alerta no frontend).
- **D-08:** Receitas é editor de ingredientes por prato (`/admin/receitas/:id`): adicionar/remover/editar quantidade de ingrediente, consumindo `GET/POST /cardapio/{id}/receita` e PUT/DELETE de item.
- **D-09:** Planejamento é uma grade semanal (dias da semana × tipos de refeição) com dropdown de pratos por slot; salvar faz upsert via `POST /planejamento` (vigência por `data_inicio_vigencia`); recarregar deve persistir (F10).

### Entregas (manual + XML)
- **D-10:** Entrada manual: tabela editável de itens; alterar ou excluir item EXIGE justificativa (backend retorna 400 sem ela) — modal de justificativa obrigatória antes do submit (F11).
- **D-11:** Upload de XML NF-e parseado NO FRONTEND com `fast-xml-parser` (decisão do PRD seção 5); o parse popula a tabela editável, que depois segue o mesmo fluxo da manual (F12). Verificar se `fast-xml-parser` está em `frontend/package.json`; se não estiver, adicionar.

### Qualidade e verificação
- **D-12:** Critério de saída: `npm run build` (typecheck + bundle) e `npm run lint` com ZERO erros/warnings. Testes de frontend são manuais — checklist F6–F12 do `TESTING.md` (sem framework E2E; Playwright adiado).
- **D-13:** TypeScript estrito: `verbatimModuleSyntax` (usar `import type { X }` para tipos) e `erasableSyntaxOnly` (sem enums, namespaces, parameter properties).

### the agent's Discretion
- Estrutura interna de componentes por página (extrair componentes menores ou manter página única)
- Design de estados de loading/erro/vazio (seguir o padrão já usado em `DashboardGestao.tsx`)
- Ordem/colunas exatas das tabelas, textos de feedback ao usuário
- Estratégia de formulário (controlled inputs, validações client-side além das do backend)

</decisions>

<specifics>
## Specific Ideas

- Dashboard admin: 4 cards/seções com dados reais do `GET /admin/dashboard` (estoque, refeições hoje, entregas, alunos) — substituir o placeholder atual de `src/pages/admin/Dashboard.tsx`.
- Baixo estoque deve "gritar" visualmente na página de Itens (a cozinheira e a secretaria dependem desse alerta para compras PNAE).
- Modal de justificativa nas Entregas deve deixar claro que a auditoria é exigência do PNAE (prestacao de contas) — não um capricho da UI.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e tarefas da fase
- `.planning/PLAN.md` §4 "Fase 5 — Páginas Admin" — tarefas 5.1–5.7 com arquivos-alvo e critério de saída
- `.planning/PLAN.md` §5 "Mapa de Rotas" — tabela rota × página × perfil (inclui admin+secretaria em planejamento/entregas)

### API e modelos de dados
- `spec.md` §3.2–3.7, §3.10 — contratos dos endpoints consumidos (usuários, itens, conversões, cardápio/receitas, planejamento, entregas, dashboard)
- `spec.md` §2 — modelo de dados (nomes de campos das tabelas que os endpoints retornam)
- `backend/schemas.py` — shapes Pydantic exatos a espelhar em `src/types.ts`

### Frontend existente (padrões a replicar)
- `frontend/src/api.ts` — `fetchJson`/`fetchWithAuth`/`ApiError` (único caminho de API)
- `frontend/src/auth-context.ts` — `useAuth`, `isAdmin`/`isSecretaria`, `ROTA_POR_PERFIL`
- `frontend/src/components/ProtectedRoute.tsx` + `frontend/src/components/Layout.tsx` — wrapper obrigatório das rotas admin
- `frontend/src/pages/CardapioPublico.tsx` + `.css` — referência de CSS plain co-localizado com tokens do DESIGN.md
- `frontend/src/pages/DashboardGestao.tsx` — referência de loading/error/alertas (padrão a repetir, NÃO a forma de API — ela usa URL hardcoded legada)
- `frontend/src/App.tsx` — padrão de registro de rota protegida

### Identidade visual e testes
- `DESIGN.md` — regras de marca da escola (paleta, brasão, superfícies claras para o logo)
- `TESTING.md` — checklist F6–F12 (critérios manuais de aceite desta fase) e regra de zero warnings
- `AGENTS.md` — convenções do projeto (`verbatimModuleSyntax`, venv do backend, rodar uvicorn de `backend/`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchJson<T>(path, options)` (`src/api.ts`): desserializa e lança `ApiError` com `detail` do backend — usar em todas as páginas novas
- `useAuth()` (`src/auth-context.ts`): expõe `isAdmin`, `isSecretaria`, `usuario` — para sidebar condicional e guards de UI
- `ProtectedRoute perfis={[...]}`: já valida token + perfil e redireciona para `/`
- `Layout`: sidebar + header com nome do usuário e logout — páginas novas entram como filhas
- `admin/Dashboard.tsx`: placeholder mínimo criado na Phase 4 — será substituído pela implementação real (5.1)

### Established Patterns
- Rota protegida: `<ProtectedRoute perfis={[...]}><Layout><Pagina/></Layout></ProtectedRoute>` (ver `App.tsx`)
- CSS: um `.css` por página, classes sem framework de utilitários, cores via variáveis CSS do `:root` em `index.css`
- Tipos: interfaces PT-BR espelhando o backend em `src/types.ts`; `import type` obrigatório
- Backend devolve `401` sem token e `403` perfil errado — frontend não precisa revalidar perfil no fetch, mas deve tratar o erro

### Integration Points
- `src/App.tsx`: registrar as 6 novas rotas (5.1–5.7) — única alteração em arquivo existente de Phase 4
- `src/components/Layout.tsx`: adicionar links admin na sidebar por perfil
- `src/types.ts`: adicionar interfaces novas (não quebrar `ItemEstoque`, `Usuario`, etc. já em uso)
- Endpoints novos consumidos: `/usuarios`, `/itens`, `/cardapio`, `/cardapio/{id}/receita`, `/planejamento`, `/entregas`, `/admin/dashboard` (todos já implementados e testados no backend)

</code_context>

<deferred>
## Deferred Ideas

- Migração de `PainelCozinha.tsx` (remover `cardapiosPadrao` hardcoded, ajustes auditados) e `DashboardGestao.tsx` → **Phase 6**
- Polimento/responsividade do cardápio público → **Phase 7**
- Playwright E2E, CI/CD, Alembic/PostgreSQL → fora do escopo do milestone (ver PLAN.md §3 e STATE.md Deferred Items)
- Importação de NF-e com validação de schema SEFAZ — o parse frontend é best-effort; validação fiscal formal não é escopo

</deferred>

---

*Phase: 05-p-ginas-admin-frontend*
*Context gathered: 2026-07-31*
