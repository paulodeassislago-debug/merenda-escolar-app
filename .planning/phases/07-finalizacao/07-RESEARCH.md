# Phase 07: Finalizacao — Research

**Researched:** 2026-08-04
**Domain:** Cardápio público React/CSS, regressão de autenticação e aceite operacional ponta a ponta
**Confidence:** HIGH for repository behavior; MEDIUM for historical F1–F5 reconstruction

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-07-01:** O prato é o foco visual principal de cada bloco; o tipo/slot funciona como rótulo secundário.
- **D-07-02:** Ingredientes podem ser consultados, mas a apresentação pública mostra somente os nomes dos itens. Não expor quantidade, medida caseira ou peso da ficha técnica.
- **D-07-03:** Um prato sem receita continua visível com seu nome; não transformá-lo em erro nem ocultar a refeição.
- **D-07-04:** Ingredientes devem começar em um resumo compacto e ter um controle explícito para expansão. O controle precisa ser acessível por teclado e a expansão não pode truncar ou perder nomes; o limite visual exato fica a critério do planejamento.
- **D-07-05:** O público deve distinguir os quatro slots de serviço: `Lanche da Manhã`, `Almoço`, `Lanche da Tarde` e `Janta`. Não agrupar os dois lanches em um único bloco.
- **D-07-06:** A ordem visual é fixa e operacional: `Lanche da Manhã` → `Almoço` → `Lanche da Tarde` → `Janta`, independentemente da ordem recebida pela API.
- **D-07-07:** Os quatro slots permanecem visíveis mesmo quando não há planejamento vigente. Um slot ausente deve aparecer como `A definir`, diferenciado de loading e erro.
- **D-07-08:** Usar os nomes operacionais completos dos slots. Não inventar horários de atendimento que não existam no contrato.
- **D-07-09:** F1-F5 devem ser reconstruídos a partir de commits, código, testes e artefatos históricos antes da execução final. A definição consolidada deve ser registrada no contrato de validação/UAT da Fase 07; não assumir silenciosamente o significado desses fluxos.
- **D-07-10:** A execução manual usará um cenário controlado e reproduzível, com pré-condições, dados mínimos e limpeza/recriação do banco de desenvolvimento quando necessário para comparar saldos e auditorias.
- **D-07-11:** O pacote de aceite é um `07-UAT.md` com pré-condições, passos, resultado e status de cada F1-F17, acompanhado dos gates automatizados de frontend e backend. Capturas de tela não são requisito obrigatório.
- **D-07-12:** Qualquer falha no checklist ou nos gates bloqueia a conclusão da fase. O fluxo deve ser corrigido e repetido antes de marcar o item como aprovado.
- **D-07-13:** Os gates automatizados permanecem: `cd frontend && npm run build`, `cd frontend && npm run lint` e, a partir de `backend/` com o venv ativo, `pytest tests/ -q`. Playwright continua adiado por decisão do projeto.

Source: `.planning/phases/07-finalizacao/07-CONTEXT.md:13-33` [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:13-33]

### the agent's Discretion

- Definir o limiar exato do resumo expansível, desde que o estado fechado seja compacto, o estado aberto preserve todos os nomes e o controle tenha nome acessível.
- Escolher cards, lista vertical ou composição híbrida para implementar os quatro slots, desde que a ordem fixa, os estados vazios e a leitura em 320px, 768px e desktop sejam preservados.
- Escolher a organização dos dados de teste e a sequência operacional do UAT, desde que as pré-condições e o reset/recriação necessários fiquem documentados.
- Reaproveitar tipos locais ou promover contratos públicos para `frontend/src/types.ts`, sem duplicar shapes incompatíveis com a API.

Source: `.planning/phases/07-finalizacao/07-CONTEXT.md:35-39` [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:35-39]

### Deferred Ideas (OUT OF SCOPE)

- Playwright/E2E automatizado, CI/CD e migração Alembic/PostgreSQL permanecem para o milestone de produção.
- Validação formal de XML NF-e contra schema fiscal permanece fora do escopo.
- Melhorias de limiar por item, cadastro inline de itens XML e correspondência inteligente de fornecedores continuam na Fase 08.

Source: `.planning/phases/07-finalizacao/07-CONTEXT.md:117-123` [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:117-123]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUBLIC-02 | “Cardapio publico deve ser polido e responsivo em desktop, tablet e mobile.” | Current public page/CSS gaps, fixed four-slot normalization, disclosure semantics, and 320px/768px/desktop validation below. [VERIFIED: .planning/REQUIREMENTS.md:67-68] |
| QUAL-05 | “Checklist manual F1-F17 deve ser concluido sem falhas.” | Historical F1-F5 reconstruction, prior F6-F15 evidence, F16-F17 public checks, controlled data setup, and consolidated UAT strategy. [VERIFIED: .planning/REQUIREMENTS.md:70-77] |
| QUAL-06 | “Fluxo ponta a ponta conversao → baixa → refeicao → auditoria deve ser verificado.” | Existing conversion, stock deduction, meal, and audit contracts plus a reproducible balance/audit scenario. [VERIFIED: .planning/REQUIREMENTS.md:70-77; backend/main.py:871-982; backend/tests/test_refeicoes.py:31-69] |
</phase_requirements>

## Summary

The public route already exists and is intentionally unauthenticated, but its current page is only a sparse response renderer: it fetches the endpoint directly, displays only returned entries, exposes recipe quantity/measure, has no disclosure control or retry action, and uses an auto-fit grid rather than the locked four-slot layout. [VERIFIED: frontend/src/App.tsx:23-25; frontend/src/pages/CardapioPublico.tsx:30-89; frontend/src/pages/CardapioPublico.css:61-108]

The backend contract is sufficient for the UI work. `GET /publico/cardapio` already accepts an optional date, filters active planning for that weekday, returns recipe item names plus technical fields, and omits unplanned slots; the frontend should normalize that sparse response and hide technical fields rather than create a new public endpoint. [VERIFIED: backend/main.py:569-596; backend/main.py:1116-1148; backend/tests/test_publico.py:39-71]

The critical planning risk is acceptance evidence, not a missing framework. F1–F5 were lost from the current planning map but are recoverable verbatim from the historical `TESTING.md`; F6–F12 and F13–F15 have prior passing UAT artifacts. Phase 7 should create a fresh consolidated `07-UAT.md`, explicitly list F1–F17, and repeat/record the end-to-end stock/audit scenario before claiming completion. [VERIFIED: historical `TESTING.md` at commit `93e1be4^`:97-119; .planning/phases/05-p-ginas-admin-frontend/05-UAT.md:15-63; .planning/phases/06-cozinha-gestao-frontend/06-UAT.md:13-63]

**Primary recommendation:** Keep the backend endpoint and route unchanged; refactor only `CardapioPublico.tsx` and its co-located CSS around a typed sparse-response normalizer, four fixed service cards, native disclosure, exact state copy, and a consolidated manual UAT plus existing automated gates. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:83-103; .planning/phases/07-finalizacao/07-UI-SPEC.md:91-113]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public menu request and sparse-response normalization | Browser / Client | API / Backend | The public endpoint already owns date/vigency selection; the client must turn omitted entries into four visible slots without changing the API contract. [VERIFIED: backend/main.py:1118-1148; .planning/phases/07-finalizacao/07-CONTEXT.md:96-102] |
| Public access boundary | API / Backend | Browser / Client | `/publico/cardapio` has no auth dependency, while `/cardapio` is a public frontend route; do not put authentication into this surface. [VERIFIED: backend/main.py:1118-1121; frontend/src/App.tsx:23-25] |
| Dish/slot/ingredient presentation | Browser / Client | — | Hierarchy, disclosure, copy, keyboard behavior, and responsive grid are presentation concerns governed by the UI contract. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:91-134] |
| Conversion → stock deduction → meal → audit | API / Backend | Database / Storage | Backend conversion and validation happen before writes; the meal endpoint deducts stock and persists `RefeicaoItem` audit fields. [VERIFIED: backend/main.py:871-982] |
| F1–F17 acceptance evidence | Validation process | Browser / API / Database | Prior artifacts separate manual browser acceptance from automated backend/frontend gates; the phase artifact must record both. [VERIFIED: .planning/codebase/TESTING.md:25-39; .planning/phases/06-cozinha-gestao-frontend/06-VALIDATION.md:10-34] |

## Current Implementation

### Public route and component

- `frontend/src/App.tsx:23-25` maps `/cardapio` directly to `CardapioPublico` with no `ProtectedRoute`; this satisfies the public access boundary and must remain unchanged. [VERIFIED: frontend/src/App.tsx:23-25]
- `frontend/src/pages/CardapioPublico.tsx:9-19` defines a local response shape containing `tipo_refeicao`, nullable `nome_refeicao`, and ingredient `item_nome`, `quantidade`, and `medida_caseira`. The shape matches the current backend response, but the render must not expose the latter two fields publicly. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:9-19; backend/main.py:1131-1147]
- `frontend/src/pages/CardapioPublico.tsx:35-44` calls raw `fetch`, checks only `response.ok`, and has no retry state. The repository convention requires `fetchJson`/`fetchWithAuth` for API calls, so use `fetchJson<...>('/publico/cardapio')` and a retryable loader instead of adding another HTTP abstraction. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:35-44; .planning/codebase/CONVENTIONS.md:20-27; frontend/src/api.ts:22-43]
- `frontend/src/pages/CardapioPublico.tsx:58-89` distinguishes loading, error, empty, and populated states, but the empty state is only a paragraph and populated rendering maps the sparse API array directly. It therefore cannot currently guarantee four cards or distinguish an absent slot from a settled empty response. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:58-89]
- `frontend/src/pages/CardapioPublico.tsx:74-84` makes the slot/type heading the first card heading and renders `item_nome ?? 'Item' — quantidade medida_caseira`; this violates the locked dish-first hierarchy, fallback copy, and ingredient privacy contract. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:74-84; .planning/phases/07-finalizacao/07-CONTEXT.md:16-20; .planning/phases/07-finalizacao/07-UI-SPEC.md:73-89]

### Public CSS

- `frontend/src/pages/CardapioPublico.css:3-17` already provides the light ceremonial shell and white header; `:root` tokens in `frontend/src/index.css:8-38` are the approved palette, typography, radius, and card shadow. Reuse them rather than introducing new colors or a component library. [VERIFIED: frontend/src/pages/CardapioPublico.css:3-17; frontend/src/index.css:8-38; .planning/phases/07-finalizacao/07-UI-SPEC.md:17-27,58-71]
- `frontend/src/pages/CardapioPublico.css:42-49` caps content at `960px`; `:61-65` uses `repeat(auto-fit, minmax(260px, 1fr))`. The UI contract instead requires one column at 320–599px, two at 600–959px, and four at 960px+, so explicit media-query columns are needed. [VERIFIED: frontend/src/pages/CardapioPublico.css:42-65; .planning/phases/07-finalizacao/07-UI-SPEC.md:91-99]
- `frontend/src/pages/CardapioPublico.css:67-99` styles the card and a permanently visible ingredient list, but contains no disclosure-control styles or public-page focus-visible rule. Existing operational pages demonstrate the project’s focus pattern, but the public control must receive its own visible focus treatment. [VERIFIED: frontend/src/pages/CardapioPublico.css:67-99; frontend/src/pages/Login.css:114-116; frontend/src/pages/PainelCozinha.css:122-125]

### API and domain contracts

- `backend/main.py:37-42` separates the three meal types (`TIPOS_REFEICAO_VALIDOS`) from the four planning slots (`SLOTS_PLANEJAMENTO`). The public UI must use the four slot values exactly and must not collapse the two snack slots into the three-type vocabulary. [VERIFIED: backend/main.py:37-42; .planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md:198-204]
- `backend/main.py:1118-1127` uses today when `data` is omitted, resolves vigency, filters to `data_ref.weekday()`, and sorts by the slot string. The response is therefore sparse and its order is not the locked operational order; client-side normalization is required. [VERIFIED: backend/main.py:1118-1127; .planning/phases/07-finalizacao/07-CONTEXT.md:22-26]
- `backend/main.py:1128-1147` returns a dish name (nullable) and technical ingredient fields. A recipe-free dish remains representable by an empty ingredient array; the UI must show the dish and `Ingredientes não informados.` without fabricating data. [VERIFIED: backend/main.py:1128-1147; .planning/phases/07-finalizacao/07-UI-SPEC.md:83-89,100-105]
- `backend/tests/test_publico.py:39-71` proves anonymous access, explicit-date selection, default-today behavior, and a settled empty list for a day without planning. It does not prove four-slot normalization or frontend privacy, so those remain Phase 7 manual checks. [VERIFIED: backend/tests/test_publico.py:39-71]

### Existing authentication behavior relevant to reconstructed F1–F5

- `frontend/src/auth.tsx:24-52` performs real JWT login, persists `pnae_token`, calls `/auth/me`, persists `pnae_usuario`, and returns the authenticated profile. [VERIFIED: frontend/src/auth.tsx:24-52]
- `frontend/src/auth-context.ts:22-30` defines the local-storage keys and the exact route map: `admin: '/admin'`, `secretaria: '/gestao'`, `cozinheira: '/cozinha'`. [VERIFIED: frontend/src/auth-context.ts:22-30]
- `frontend/src/components/ProtectedRoute.tsx:15-27` redirects unauthenticated users to `/`; an authenticated user with the wrong profile is redirected to that profile’s home route. Thus F4 is “redirected to `/admin`” for an admin opening `/cozinha`, not a generic public denial page. [VERIFIED: frontend/src/components/ProtectedRoute.tsx:15-27; frontend/src/auth-context.ts:25-30]
- `frontend/src/pages/Login.tsx:19-30,79-87` exposes login failure in a `role="alert"` and navigates after successful `login`; `frontend/src/components/Layout.tsx:43-50` logs out and navigates to `/`. [VERIFIED: frontend/src/pages/Login.tsx:19-30,79-87; frontend/src/components/Layout.tsx:43-50]
- `frontend/src/auth.tsx:55-60` removes both `pnae_token` and `pnae_usuario` on logout. Backend auth regression tests cover valid login, invalid credentials, `/auth/me`, absent token, malformed token, and expired token. [VERIFIED: frontend/src/auth.tsx:55-60; backend/tests/test_auth.py:8-63]

## Standard Stack

### Core

| Library / tool | Version in repository | Purpose | Why use it here |
|---|---:|---|---|
| React | `^19.2.7` | Public page rendering and state | Existing application runtime; no new component system is approved. [VERIFIED: frontend/package.json:12-16; .planning/phases/07-finalizacao/07-UI-SPEC.md:17-27] |
| TypeScript | `~6.0.2` | Typed API response and slot view model | Existing build includes `tsc -b`; it catches response/view-model drift without adding a test framework. [VERIFIED: frontend/package.json:18-34; frontend/package.json:6-10] |
| Vite | `^8.1.1` manifest; build reported `8.1.5` on 2026-08-04 | Dev server and production bundle | Existing `npm run build` gate; current build completed successfully. [VERIFIED: frontend/package.json:32-34; command run 2026-08-04] |
| Plain co-located CSS | repository convention | Responsive grid, tokens, focus and disclosure styling | Locked project convention; no Tailwind/shadcn/dark mode. [VERIFIED: .planning/codebase/CONVENTIONS.md:29-35; .planning/phases/07-finalizacao/07-UI-SPEC.md:17-27] |
| `fetchJson` / `fetchWithAuth` | local `frontend/src/api.ts` | Centralized HTTP and JSON/error handling | Prevents a second raw-fetch path; public calls work without a token because the helper only adds `Authorization` when a token exists. [VERIFIED: frontend/src/api.ts:18-43] |

### Supporting

| Tool / contract | Version or value | Purpose | When to use |
|---|---:|---|---|
| FastAPI + SQLite | `fastapi==0.139.2`, `SQLite` dev | Preserve public response and business-flow API | Use existing endpoint; no new backend layer. [VERIFIED: backend/requirements.txt:10-10; .planning/PROJECT.md:61-65] |
| pytest + TestClient/httpx | `pytest==9.1.1`, `httpx==0.28.1` | Backend regression and endpoint checks | Run full suite and targeted public/meal tests from `backend/`. [VERIFIED: backend/requirements.txt:14,25; .planning/codebase/TESTING.md:5-12] |
| Native `<details>/<summary>` | browser HTML semantics | Collapsed ingredient disclosure | Preferred by the UI contract; avoids hand-rolled keyboard state while supporting a named native control. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:100-105] |

**Installation:** None. Phase 7 should not add a package or registry block; the UI contract explicitly says `none — manual CSS/plain React`. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:152-156]

## Recommended Decomposition

1. **Data loader and response type — `frontend/src/pages/CardapioPublico.tsx` (or a small adjacent `.ts` helper):** Replace raw `fetch` with `fetchJson`, keep `carregando`, `erro`, and data state independent, expose a `Tentar novamente` action, and keep the shell visible during loading. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:30-44; frontend/src/api.ts:35-43; .planning/phases/07-finalizacao/07-UI-SPEC.md:73-81,109-113]
2. **Four-slot normalizer — same page/helper:** Normalize the sparse response to exactly the source-quoted list `SLOTS_PLANEJAMENTO = ["Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"]`, index returned entries by slot, and synthesize absent entries with `nome_refeicao: null` and zero ingredients. [VERIFIED: backend/main.py:40-41; .planning/phases/07-finalizacao/07-UI-SPEC.md:83-89,95-113]
3. **Slot card renderer — same page:** Render semantic `section`/heading hierarchy as slot label → dish heading → optional disclosure. Use `A definir` for missing slot/null dish; keep a returned dish visible when its ingredient array is empty; use `Ingrediente não informado` for a null item name. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:83-89,98-105,130-135]
4. **Ingredient disclosure — same page:** Start non-empty lists closed, use `Ver ingredientes` / `Ocultar ingredientes`, optionally append a count, render only item names, and allow normal wrapping for every item. For zero items, omit the control and show `Ingredientes não informados.`. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:73-89,100-105]
5. **Responsive CSS — `frontend/src/pages/CardapioPublico.css`:** Preserve existing tokens and shell; add explicit 1/2/4-column breakpoints, compact mobile spacing, 44px disclosure hit area, visible `:focus-visible`, and wrapping rules (`overflow-wrap`/normal wrapping) without ellipsis or clipping. [VERIFIED: frontend/src/pages/CardapioPublico.css:3-17,67-108; .planning/phases/07-finalizacao/07-UI-SPEC.md:29-43,91-113,130-148]
6. **Contract typing — `frontend/src/types.ts` only if promoted:** Reuse the current local response shape or promote one public type, but do not create a second incompatible shape. Keep technical fields available for deserialization while excluding them from JSX output. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:9-19; frontend/src/types.ts:57-79; .planning/phases/07-finalizacao/07-CONTEXT.md:35-39]
7. **Acceptance artifacts — `.planning/phases/07-finalizacao/07-VALIDATION.md` and `07-UAT.md`:** Record gates, controlled-data preconditions, F1–F17 result/status, F1–F5 provenance, and the before/after stock plus audit evidence for QUAL-06. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:28-33,99-113]

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| HTTP/error handling | A second `fetch` wrapper or hardcoded API URL | `fetchJson` from `frontend/src/api.ts` | The repository centralizes base URL and `ApiError` parsing there. [VERIFIED: frontend/src/api.ts:6-16,35-45; .planning/codebase/CONVENTIONS.md:25-27] |
| Disclosure keyboard behavior | A custom click/keydown disclosure state without a semantic contract | Native `<details>/<summary>` | The UI contract explicitly prefers native disclosure semantics and requires keyboard access. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:100-105] |
| Four-slot data authority | A new backend aggregation endpoint or hardcoded dish data | Client normalization of `/publico/cardapio` | The endpoint already supplies current-day/vigency data and the phase forbids a new backend layer. [VERIFIED: backend/main.py:1118-1148; .planning/phases/07-finalizacao/07-CONTEXT.md:9-10,99-103] |
| Public technical-data filtering | A backend contract rewrite or separate public DTO in this phase | Render only `item_nome` in the existing response | The locked decision is presentation privacy while preserving the endpoint contract. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:16-20,99-103; backend/tests/test_publico.py:50-52] |
| Responsive system | Tailwind/shadcn or arbitrary palette/layout framework | Existing co-located CSS and `index.css` tokens | The UI contract and project convention explicitly prohibit introducing those systems. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:17-27,152-165; .planning/codebase/CONVENTIONS.md:29-35] |

## Common Pitfalls

### Sparse response mistaken for complete menu

**What goes wrong:** Only one or two cards render because the API intentionally omits absent slots. [VERIFIED: backend/main.py:1122-1147; backend/tests/test_publico.py:67-71]

**How to avoid:** Normalize against the exact four-slot list before rendering, and test populated, sparse, and zero-item responses. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:95-113]

### Loading, empty and missing-slot states collapse into `A definir`

**What goes wrong:** Placeholder cards appear before the request settles, or an API failure looks like a normal empty plan. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:109-113]

**How to avoid:** Render only the loading status during `carregando`; render four `A definir` cards only after a successful settled response. Keep error copy and retry in `role="alert"`. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:73-89,109-113]

### Recipe metadata leaks into public UI

**What goes wrong:** The current JSX exposes quantity and `medida_caseira` for each ingredient. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:77-82]

**How to avoid:** Render only `item_nome ?? "Ingrediente não informado"`; do not change the API response or transmit a fabricated privacy field. React’s official documentation warns that raw HTML rendering of untrusted data can introduce XSS, so keep names as ordinary React text children and do not add `dangerouslySetInnerHTML`. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:77-82; CITED: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html]

### Slot vocabulary is confused with meal-type vocabulary

**What goes wrong:** The two snack slots are merged because `Lanche` is a meal type while the planning API uses two full slot labels. [VERIFIED: backend/main.py:37-42; .planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md:47-55]

**How to avoid:** Treat `TIPOS_REFEICAO_VALIDOS` and `SLOTS_PLANEJAMENTO` as separate contracts; public rendering uses the latter. [VERIFIED: backend/main.py:37-42,623-627]

### Long names are clipped at 320px

**What goes wrong:** Fixed/single-line styles or ellipses hide dish or ingredient names, violating the privacy/readability requirement. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:104,126-128]

**How to avoid:** Test an intentionally long dish and ingredient name at 320px with disclosure open; require natural wrapping and no horizontal page overflow. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:115-128,141-149]

### Backend is run from the wrong directory during UAT

**What goes wrong:** Relative `sqlite:///./merenda.db` points at a stray root database. [VERIFIED: AGENTS.md:21-26; backend/config.py:10-12]

**How to avoid:** Run Uvicorn and pytest from `backend/`; treat `backend/merenda.db` as mutable development state and document any backup/reset. [VERIFIED: AGENTS.md:8-13,21-26,29-34; .planning/codebase/CONVENTIONS.md:5-10]

## Historical F1–F5 Reconstruction

The original checklist is recoverable from the pre-consolidation tracked `TESTING.md`, commit `93e1be4^`, lines 97–119. The five entries are: [VERIFIED: git commit `93e1be4^`: `TESTING.md`:97-119]

| Flow | Reconstructed definition | Current code evidence | Acceptance action |
|---|---|---|---|
| F1 | Login with valid credentials redirects to the correct route for the profile. | `Login` calls `login` and navigates using `ROTA_POR_PERFIL`; the provider obtains `/auth/me` before returning the profile. [VERIFIED: historical `TESTING.md`:103; frontend/src/pages/Login.tsx:19-30; frontend/src/auth.tsx:24-52] | Test `admin → /admin`, `secretaria → /gestao`, and `cozinheira → /cozinha` in a logged-out browser session. [VERIFIED: frontend/src/auth-context.ts:25-30] |
| F2 | Invalid login shows a visible error message. | Backend returns 401 for invalid credentials and Login renders the error in `role="alert"`. [VERIFIED: historical `TESTING.md`:104; backend/main.py:57-64; backend/tests/test_auth.py:18-28; frontend/src/pages/Login.tsx:79-82] | Submit a wrong password and assert the exact visible message; do not accept a silent button state. [VERIFIED: frontend/src/pages/Login.tsx:24-29,79-87] |
| F3 | Opening `/admin` without login redirects to `/`. | ProtectedRoute redirects when either token or saved user is absent. [VERIFIED: historical `TESTING.md`:105; frontend/src/components/ProtectedRoute.tsx:15-20; frontend/src/App.tsx:28-37] | Clear both auth keys, open `/admin`, and record final URL `/`. [VERIFIED: frontend/src/auth-context.ts:22-23; frontend/src/components/ProtectedRoute.tsx:18-20] |
| F4 | Opening `/cozinha` as an admin is redirected/blocked. | Profile mismatch redirects to `ROTA_POR_PERFIL[admin]`, which is `/admin`. [VERIFIED: historical `TESTING.md`:106; frontend/src/App.tsx:99-109; frontend/src/components/ProtectedRoute.tsx:22-24; frontend/src/auth-context.ts:25-30] | Login as admin, navigate directly to `/cozinha`, and record the resulting `/admin` route; do not call a generic 403 page a pass. [VERIFIED: frontend/src/components/ProtectedRoute.tsx:22-24] |
| F5 | Logout returns to `/` and removes the local-storage token. | Layout calls `logout` then navigates; logout removes both `pnae_token` and `pnae_usuario`. [VERIFIED: historical `TESTING.md`:107; frontend/src/components/Layout.tsx:47-50; frontend/src/auth.tsx:55-60] | Login, click `Sair`, record `/`, and inspect localStorage for absence of both keys. [VERIFIED: frontend/src/auth-context.ts:22-23; frontend/src/auth.tsx:55-60] |

**Explicit conclusion:** F1–F5 are not undefined smoke tests. They are the five authentication/authorization browser flows above, reconstructed from historical source lines 103–107 and corroborated by current React and backend auth code. They must be copied into `07-UAT.md` with explicit status and fresh browser evidence; prior phase UATs do not claim these five flows. [VERIFIED: historical `TESTING.md`:97-107; .planning/phases/05-p-ginas-admin-frontend/05-UAT.md:15-63; .planning/phases/06-cozinha-gestao-frontend/06-UAT.md:19-51]

## Prior UAT and Validation Evidence

| Scope | Existing evidence | Planning implication |
|---|---|---|
| F6–F12 | Phase 5 UAT records 10/10 pass, including F6–F12, responsive overflow/long-text backstops, and session-expiry copy; F12 was manually confirmed on 2026-08-03. [VERIFIED: .planning/phases/05-p-ginas-admin-frontend/05-UAT.md:15-63] | Carry these as prior evidence in the consolidated UAT, but retain their source references and re-run any flow affected by Phase 7 data/setup. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:28-33] |
| F13–F15 | Phase 6 UAT records 8/8 pass, including kitchen conversion/adjustment/audit behavior, management data, session recovery, keyboard dialog behavior, and 320px/768px/desktop layouts. [VERIFIED: .planning/phases/06-cozinha-gestao-frontend/06-UAT.md:21-63] | Do not change kitchen or management contracts while adding public-menu polish; use the same backend regression gates. [VERIFIED: .planning/phases/06-cozinha-gestao-frontend/06-VALIDATION.md:10-34; .planning/phases/07-finalizacao/07-CONTEXT.md:9-10] |
| F16–F17 | Historical checklist defines public access/data-of-day and public mobile/tablet responsiveness; the Phase 7 UI contract expands these into four-slot, privacy, state, keyboard, overflow, and 320px/768px/desktop checks. [VERIFIED: historical `TESTING.md`:118-119; .planning/phases/07-finalizacao/07-UI-SPEC.md:137-150] | Treat F16 and F17 as the public-menu acceptance pair and include the new exact-copy/state checks in their evidence. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:137-150] |

## Controlled Data Setup

The manual run must not rely on whichever mutable rows happen to be in the development database. `backend/main.py:14-15` creates tables at import/startup, while the runtime seed users are documented in `AGENTS.md`; no application-runtime seed routine was verified in the files read. Therefore, prefer a backup plus unique UAT-prefixed records, and perform a destructive reset only when the operator has an explicit way to recreate the dev users. [VERIFIED: backend/main.py:14-15; AGENTS.md:21-24; backend/tests/conftest.py:23-90]

### Preconditions

1. Run `source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000` from `backend/`, and `npm run dev` from `frontend/`; use `http://127.0.0.1:5173/cardapio`. [VERIFIED: AGENTS.md:8-19; backend/config.py:10-15]
2. Preserve or back up `backend/merenda.db` before manual mutations. Do not run backend commands from the repository root. [VERIFIED: AGENTS.md:21-26,29-34]
3. Use the documented development users for the three profiles; retrieve their credentials from the local development instructions rather than copying passwords into planning artifacts. The test fixtures independently corroborate the same profile setup for their isolated database. [VERIFIED: AGENTS.md:23-24; backend/tests/conftest.py:61-90; backend/tests/test_auth.py:8-15]

### Minimum reproducible dataset

1. As admin, create uniquely named UAT records: one stock item with initial internal balance `50 KG`; one conversion such as `pacote = 0.5 kg`; four dishes with types `Lanche`, `Almoço`, `Lanche`, and `Janta`; and at least one recipe item per dish. These values are a controlled test choice, not a production rule. [VERIFIED: backend/main.py:40-41; backend/main.py:321-354; backend/main.py:386-405; backend/main.py:480-510]
2. In planning, assign the four dishes to today’s weekday using the exact slots `Lanche da Manhã`, `Almoço`, `Lanche da Tarde`, and `Janta`, with today as `data_inicio_vigencia`. The two snack slots must point to dishes whose meal type is `Lanche`. [VERIFIED: backend/main.py:614-657; backend/tests/test_planejamento.py:171-205; .planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md:153-164]
3. Record the selected item’s balance before meal confirmation. Use a recipe quantity and student count that make the expected converted deduction easy to calculate; record the exact submitted quantity, measure, and conversion factor. [VERIFIED: backend/main.py:925-978; backend/tests/test_refeicoes.py:31-47]
4. For a partial-data public check, leave one dish without a recipe or clear one slot in a copied scenario; do not delete the dish. For a long-text check, use long dish and ingredient names and expand the ingredient disclosure at 320px. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:16-20; .planning/phases/07-finalizacao/07-UI-SPEC.md:104-128]

### QUAL-06 execution sequence

1. Confirm the conversion is visible to the cook through the existing conversion read contract, then open the planned meal in `/cozinha`. [VERIFIED: backend/main.py:301-318; .planning/phases/06-cozinha-gestao-frontend/06-VALIDATION.md:31-33]
2. Enter a positive student count, optionally adjust one ingredient with a written justification, and confirm the meal. The backend converts each submitted measure before checking/deducting stock, then persists the meal and per-item audit row. [VERIFIED: backend/main.py:871-982; backend/tests/test_refeicoes.py:184-248]
3. Read the balance again as admin and verify `before − (submitted quantity × conversion factor) = after`; use the final adjusted quantity, not the original recipe quantity, when an audited adjustment was made. [VERIFIED: backend/main.py:932-978; backend/tests/test_refeicoes.py:226-247]
4. Read the admin meal history and record `quantidade_original`, `quantidade_ajustada`, `medida_caseira`, and `justificativa`. A failed conversion or insufficient-stock attempt must leave the balance and audit history unchanged. [VERIFIED: backend/main.py:925-982,985-1019; backend/tests/test_refeicoes.py:72-89,134-150,226-247]

## Requirement Traceability

| Requirement | Implementation evidence | Validation evidence required in Phase 7 |
|---|---|---|
| PUBLIC-02 | Public route exists; current shell/tokens exist; required work is normalization, privacy-preserving disclosure, exact states, and responsive CSS. [VERIFIED: frontend/src/App.tsx:23-25; frontend/src/pages/CardapioPublico.tsx:46-94; frontend/src/pages/CardapioPublico.css:3-108] | Browser at 320px, 768px and desktop: one/two/four columns, no horizontal overflow, four ordered cards, long names wrap, keyboard disclosure/retry. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:91-113,137-150] |
| QUAL-05 | Historical F1–F5 recovered; F6–F12 and F13–F15 have prior UAT artifacts; F16–F17 map to public menu checks. [VERIFIED: historical `TESTING.md`:97-119; .planning/phases/05-p-ginas-admin-frontend/05-UAT.md:15-63; .planning/phases/06-cozinha-gestao-frontend/06-UAT.md:19-63] | `07-UAT.md` must list every F1–F17 with precondition, steps, result, status, and source/command; any failure blocks completion. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:28-33] |
| QUAL-06 | Conversion helper, atomic prevalidation, stock deduction, meal persistence and audit serialization already exist. [VERIFIED: backend/main.py:871-982,985-1019] | Controlled before/after balance, exact conversion math, persisted meal item audit, and no partial change on failed conversion/stock. [VERIFIED: backend/tests/test_refeicoes.py:31-89,134-150,184-248] |

## Validation Strategy

### Automated gates

| Gate | Command | Current research run |
|---|---|---|
| Frontend typecheck/bundle | `cd frontend && npm run build` | PASS on 2026-08-04; Vite reported a successful production build. [VERIFIED: command run 2026-08-04; frontend/package.json:6-10] |
| Frontend lint | `cd frontend && npm run lint` | PASS on 2026-08-04 with exit code 0. [VERIFIED: command run 2026-08-04; frontend/package.json:6-10] |
| Full backend suite | `cd backend && source venv/bin/activate && pytest tests/ -q` | PASS: 103 tests; 3 dependency/deprecation warnings were emitted, none failed the gate. [VERIFIED: command run 2026-08-04; .planning/STATE.md:38-44] |
| Public endpoint regression | `cd backend && source venv/bin/activate && pytest tests/test_publico.py -q` | Required targeted check for anonymous, explicit-date, today, and empty response. [VERIFIED: backend/tests/test_publico.py:39-71] |
| Flow regression | `cd backend && source venv/bin/activate && pytest tests/test_refeicoes.py tests/test_planejamento.py -q` | Required targeted check for slots, conversion, deduction, audit, and atomic failures. [VERIFIED: backend/tests/test_planejamento.py:171-220; backend/tests/test_refeicoes.py:31-425] |

### Manual browser matrix for the public surface

| State / viewport | Expected evidence |
|---|---|
| Loading | Shell remains visible; exactly `Carregando cardápio…`; no premature `A definir` cards. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:73-89,109-110] |
| Successful populated | Four separate cards in exact operational order; dish name visually dominates slot label. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:91-99,112-113] |
| Sparse/empty success | Four cards remain; absent/null dishes read `A definir`; settled zero-item response also shows the exact empty heading/body. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:73-89,109-113] |
| Recipe-free/zero-ingredient | Dish remains visible and shows `Ingredientes não informados.` without disclosure. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:83-89,100-105] |
| One/many ingredients | Closed by default; control has accessible Portuguese name; open state exposes every name only, including `Ingrediente não informado` fallback. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:100-105,130-135] |
| Request failure | Exact error text plus `Tentar novamente` in `role="alert"`; retry can recover; no stale/fabricated menu. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:73-81,109-110] |
| 320px / 768px / desktop | One / two / four columns respectively; no horizontal page scroll, clipping, ellipsis, overlap, or lost ingredient names. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:91-99,115-128,141-149] |
| Keyboard | Tab reaches disclosure and retry; Enter/Space or native summary toggles; focus is visible and the state is understandable without color alone. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:100-105,130-148] |

### Sampling and artifact contract

- Run the quick frontend lint after each implementation task, the full three-gate command at each wave, and require a green full suite before verification. [VERIFIED: .planning/phases/05-p-ginas-admin-frontend/05-VALIDATION.md:18-35; .planning/phases/07-finalizacao/07-CONTEXT.md:28-33]
- Write `07-VALIDATION.md` for automated/manual mapping and `07-UAT.md` for F1–F17. Screenshots are optional; textual result/status and command output are mandatory evidence. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:28-33]
- Do not add Playwright or frontend test dependencies in this phase. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:9-10,117-123; .planning/codebase/TESTING.md:42-46]

## Security Domain

OWASP describes ASVS as a basis for testing web-application technical security controls and lists XSS/injection among the controls it helps assess; this phase uses the project’s configured ASVS level 1 as a focused regression lens, not as a claim of formal certification. [CITED: https://owasp.org/www-project-application-security-verification-standard/; VERIFIED: .planning/config.json:12-22]

| ASVS category | Applies | Phase 7 control |
|---|---|---|
| V2 Authentication | Yes for F1–F2; no auth on public menu by design | Preserve `/auth/login` status behavior and do not add auth to `/publico/cardapio`. [VERIFIED: backend/main.py:57-64,1118-1121; backend/tests/test_auth.py:8-28; .planning/config.json:19-22] |
| V3 Session Management | Yes for F3–F5 | Test both `pnae_token` and `pnae_usuario` cleanup and route protection. [VERIFIED: frontend/src/auth-context.ts:20-30; frontend/src/auth.tsx:55-60; frontend/src/components/ProtectedRoute.tsx:15-27] |
| V4 Access Control | Yes for protected route regression | Preserve profile-specific route map and wrong-profile redirect. [VERIFIED: frontend/src/App.tsx:28-119; frontend/src/components/ProtectedRoute.tsx:22-24] |
| V5 Input Validation / output encoding | Yes | Treat API dish/ingredient names as untrusted text; render normal React children, never raw HTML; keep backend schemas and endpoint unchanged. [VERIFIED: frontend/src/pages/CardapioPublico.tsx:74-82; backend/main.py:1128-1147; CITED: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html] |
| V6 Cryptography | Not changed in this phase | Do not alter JWT/hash code while polishing public UI; auth crypto is already covered by backend auth tests. [VERIFIED: backend/tests/test_auth.py:30-63; .planning/phases/07-finalizacao/07-CONTEXT.md:9-10] |

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | Frontend build/dev server | ✓ | 22.23.1 | — [VERIFIED: command run 2026-08-04] |
| npm | Frontend gates | ✓ | 12.0.2 | — [VERIFIED: command run 2026-08-04] |
| Python | Backend tooling | ✓ | 3.12.3 | — [VERIFIED: command run 2026-08-04] |
| Backend venv / pytest | Backend gates | ✓ | pytest 9.1.1 in fixed requirements | — [VERIFIED: backend/requirements.txt:25; command run 2026-08-04] |
| Backend venv / Uvicorn | Manual API/browser run | ✓ | 0.51.0 | — [VERIFIED: backend/requirements.txt:34; command run 2026-08-04] |
| Docker | Deployment context only | ✓ | 29.1.3 | Not needed for local Phase 7 gates. [VERIFIED: command run 2026-08-04; .planning/PROJECT.md:7,66] |
| Playwright | Automated E2E | Intentionally unavailable/not required | — | Manual browser checks; explicitly deferred. [VERIFIED: .planning/codebase/TESTING.md:42-46; .planning/phases/07-finalizacao/07-CONTEXT.md:117-123] |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The current development credentials documented in `AGENTS.md` remain usable for manual UAT. [VERIFIED: AGENTS.md:23-24] | Controlled Data Setup | F1–F5 and authenticated setup cannot start; recreate credentials through the project’s supported development procedure. |
| A2 | The final UAT operator can run a browser against the local Vite/FastAPI servers. [ASSUMED] | Validation Strategy | Manual QUAL-05/PUBLIC-02 evidence cannot be collected; use the documented manual environment or explicitly block the phase. |

## Open Questions (RESOLVED)

1. **RESOLVED — Which existing browser/session data should be retained?** Preserve the mutable development database with a backup, use unique UAT-prefixed records, and document the controlled setup in `07-UAT.md`. Do not perform a destructive reset unless there is an explicit credential-recreation procedure; this is the locked controlled-UAT decision. [VERIFIED: AGENTS.md:21-24; backend/main.py:14-15; backend/tests/conftest.py:23-90; .planning/phases/07-finalizacao/07-CONTEXT.md:28-33]
2. **RESOLVED — Should public response types be promoted to `frontend/src/types.ts`?** Keep the response shape local unless another page consumes it. If it is promoted, retain all backend fields needed for deserialization while rendering only ingredient names in the public UI. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:35-39; frontend/src/pages/CardapioPublico.tsx:9-19; frontend/src/types.ts:57-79]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/07-finalizacao/07-CONTEXT.md` — locked scope, UI/data decisions, gates, and artifact contract. [VERIFIED: .planning/phases/07-finalizacao/07-CONTEXT.md:6-123]
- `.planning/phases/07-finalizacao/07-UI-SPEC.md` — exact copy, slot order, responsive breakpoints, accessibility, and manual checks. [VERIFIED: .planning/phases/07-finalizacao/07-UI-SPEC.md:17-150]
- `frontend/src/pages/CardapioPublico.tsx`, `frontend/src/pages/CardapioPublico.css`, `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/index.css` — current public implementation and reusable frontend patterns. [VERIFIED: cited file line ranges throughout]
- `backend/main.py`, `backend/tests/test_publico.py`, `backend/tests/test_planejamento.py`, `backend/tests/test_refeicoes.py` — current API and regression contracts. [VERIFIED: cited file line ranges throughout]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `AGENTS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md` — requirements, phase status, commands, and conventions. [VERIFIED: cited file line ranges throughout]

### Historical evidence (MEDIUM confidence)

- `93e1be4^:TESTING.md:97-119` — original F1–F17 manual checklist; F1–F5 reconstruction is verbatim from lines 103–107. [VERIFIED: git history]
- `.planning/phases/05-p-ginas-admin-frontend/05-UAT.md` and `05-VALIDATION.md` — F6–F12 prior acceptance and gates. [VERIFIED: cited file line ranges]
- `.planning/phases/06-cozinha-gestao-frontend/06-UAT.md` and `06-VALIDATION.md` — F13–F15 prior acceptance and gates. [VERIFIED: cited file line ranges]

### Official security documentation (MEDIUM confidence)

- OWASP ASVS project page — purpose, security-control verification role, and current stable version information. [CITED: https://owasp.org/www-project-application-security-verification-standard/]
- React DOM common components reference — warning about `dangerouslySetInnerHTML` with untrusted data. [CITED: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing manifests, fixed backend requirements, and successful build/lint/test execution. [VERIFIED: frontend/package.json:6-34; backend/requirements.txt:1-34; command run 2026-08-04]
- Architecture: HIGH — route, endpoint, API helper, and component source were read directly this session. [VERIFIED: cited file line ranges]
- F1–F5 semantics: MEDIUM — exact historical checklist recovered and corroborated by current code, but no prior F1–F5 UAT result artifact exists. [VERIFIED: historical `TESTING.md`:97-107; .planning/phases/05-p-ginas-admin-frontend/05-UAT.md:15-63; .planning/phases/06-cozinha-gestao-frontend/06-UAT.md:19-63]
- Manual data setup: MEDIUM — API contracts are verified, but the mutable development DB and operator browser state require explicit UAT recording. [VERIFIED: backend/main.py:14-15; AGENTS.md:21-24]

**Research date:** 2026-08-04
**Valid until:** 2026-09-03 for this stable repository phase; recheck if auth/API contracts or UI-SPEC change. [ASSUMED]
