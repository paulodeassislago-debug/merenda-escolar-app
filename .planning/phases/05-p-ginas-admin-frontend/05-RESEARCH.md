# Phase 5 Research: Páginas Admin (Frontend)

**Researched:** 2026-07-31
**Domain:** Frontend React/TypeScript — consumo de API FastAPI já implementada e testada
**Confidence:** HIGH (todos os contratos e padrões verificados por leitura direta do repo nesta sessão)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Estilização e identidade visual**
- **D-01:** CSS plain co-localizado por página (ex.: `Usuarios.css` ao lado de `Usuarios.tsx`), seguindo o padrão de `Login.css`/`CardapioPublico.css`. Tailwind NÃO é usado (dependência inativa).
- **D-02:** Tokens visuais obrigatórios do `.planning/PROJECT.md` (definidos em `src/index.css` `:root`): verde-escuro `#124C0F`, verde-vivo `#48BB2C`, amarelo `#C5D227`. Logo (`src/assets/Logo Nancy (Logotipo) (1).jpg`) é JPG com fundo branco — renderizar apenas em superfícies claras.

**Acesso à API e autenticação**
- **D-03:** Todas as chamadas via `fetchJson<T>`/`fetchWithAuth` de `src/api.ts` (base URL de `VITE_API_URL`, JWT do localStorage anexado automaticamente). Nenhuma URL hardcoded, nenhum `id_usuario` no body — o backend resolve o usuário pelo token.
- **D-04:** Tipos compartilhados em `src/types.ts` — adicionar/espelhar os shapes dos schemas Pydantic do backend (`backend/schemas.py`) conforme necessário (Item, Conversao, CardapioItem, Receita, Planejamento, Entrega, ItemEntrega, DashboardResponse).

**Rotas e proteção por perfil**
- **D-05:** Novas rotas em `src/App.tsx`, todas dentro de `<ProtectedRoute><Layout>`: `/admin` (Dashboard, admin), `/admin/usuarios` (admin), `/admin/itens` (admin), `/admin/cardapio` (admin), `/admin/receitas/:id` (admin), `/admin/planejamento` (admin + secretaria), `/admin/entregas` (admin + secretaria).
- **D-06:** Sidebar do `Layout.tsx` ganha os links admin condicionados por perfil (`isAdmin`, `isSecretaria` do `useAuth`).

**Padrão de páginas CRUD**
- **D-07:** Usuários, Itens, Cardápio seguem o padrão tabela + modal CRUD (criar/editar/excluir com feedback visual), conforme testes F7–F9 do `.planning/codebase/TESTING.md`. Itens destaca visualmente baixo estoque (limiar definido no backend: 5.0 unidade oficial — badge/alerta no frontend).
- **D-08:** Receitas é editor de ingredientes por prato (`/admin/receitas/:id`): adicionar/remover/editar quantidade de ingrediente, consumindo `GET/POST /cardapio/{id}/receita` e PUT/DELETE de item.
- **D-09:** Planejamento é uma grade semanal (dias da semana × tipos de refeição) com dropdown de pratos por slot; salvar faz upsert via `POST /planejamento` (vigência por `data_inicio_vigencia`); recarregar deve persistir (F10).

**Entregas (manual + XML)**
- **D-10:** Entrada manual: tabela editável de itens; alterar ou excluir item EXIGE justificativa (backend retorna 400 sem ela) — modal de justificativa obrigatória antes do submit (F11).
- **D-11:** Upload de XML NF-e parseado NO FRONTEND com `fast-xml-parser` (decisão consolidada em `.planning/PROJECT.md` e `.planning/REQUIREMENTS.md`); o parse popula a tabela editável, que depois segue o mesmo fluxo da manual (F12). Verificar se `fast-xml-parser` está em `frontend/package.json`; se não estiver, adicionar. → **VERIFICADO: já está instalado** (`package.json:13`, v5.10.1).

**Qualidade e verificação**
- **D-12:** Critério de saída: `npm run build` (typecheck + bundle) e `npm run lint` com ZERO erros/warnings. Testes de frontend são manuais — checklist F6–F12 do `.planning/codebase/TESTING.md` (sem framework E2E; Playwright adiado).
- **D-13:** TypeScript estrito: `verbatimModuleSyntax` (usar `import type { X }` para tipos) e `erasableSyntaxOnly` (sem enums, namespaces, parameter properties).

### the agent's Discretion
- Estrutura interna de componentes por página (extrair componentes menores ou manter página única)
- Design de estados de loading/erro/vazio (seguir o padrão já usado em `DashboardGestao.tsx`)
- Ordem/colunas exatas das tabelas, textos de feedback ao usuário
- Estratégia de formulário (controlled inputs, validações client-side além das do backend)

### Deferred Ideas (OUT OF SCOPE)
- Migração de `PainelCozinha.tsx` e `DashboardGestao.tsx` → **Phase 6**
- Polimento/responsividade do cardápio público → **Phase 7**
- Playwright E2E, CI/CD, Alembic/PostgreSQL → fora do milestone
- Validação fiscal formal de NF-e (schema SEFAZ) — o parse frontend é best-effort
</user_constraints>

## Summary

- **Backend pronto para os contratos consumidos.** As 23 rotas que a fase consome existem; o baseline inicial era 77 testes e a fase 5.7 encerrou com 94 após as mudanças de unidades e tipos. Phase 5.1–5.6 foi frontend-first; Phase 5.7 também atualizou backend e testes. [VERIFIED: backend/main.py, backend/tests/]
- **Escopo de arquivos:** 7 páginas novas em `frontend/src/pages/admin/` (cada uma com `.css` co-localizado), 6–7 rotas novas em `App.tsx` (único arquivo de Phase 4 alterado além de `types.ts`), ~10 interfaces novas em `types.ts`. A sidebar **NÃO** precisa de alteração — `NAV_POR_PERFIL` em `Layout.tsx:18-35` já contém todos os links admin e secretaria; basta as rotas existirem. [VERIFIED: frontend/src/components/Layout.tsx:18-35]
- **Única dependência (fast-xml-parser 5.10.1) já está instalada** (`frontend/package.json:13`) e sua API de parse foi verificada empiricamente nesta sessão. [VERIFIED: frontend/package.json:13 + teste node]
- **Padrões a replicar:** formulário + `role="alert"` de `Login.tsx`; CSS com tokens `var(--*)` de `CardapioPublico.css`/`Layout.css`; estados loading/erro/vazio de `DashboardGestao.tsx` (repetir o padrão, **NÃO** o fetch hardcoded); estrutura de modal de `PainelCozinha.css` (repetir a estrutura, **NÃO** as cores hardcoded).
- **Três semânticas de backend dominam o desenho das páginas:** (1) planejamento por vigência com upsert por (slot + `data_inicio_vigencia`); (2) entregas com ação `alterado`/`excluído` exigindo justificativa (400) e validação total antes de gravar; (3) `GET /admin/dashboard` agregado pronto para 4 cards.
- **Gotcha nº 1:** `dia_semana` do backend é Python (`0=segunda…6=domingo`); `Date.getDay()` do JS é `0=domingo…6=sábado`. Mapear `(jsDay + 6) % 7`. [VERIFIED: backend/main.py:581-582 — "dia_semana deve estar entre 0 (segunda) e 6 (domingo)"]
- **Gotcha nº 2:** a string de ação é `"excluído"` **com acento** — o backend rejeita qualquer variante (400). Centralizar as três strings numa constante. [VERIFIED: backend/main.py:41]
- **Saída da fase:** `npm run build` + `npm run lint` com zero warnings (D-12), checklist manual F6–F12, e `pytest backend/tests/ -v` como guarda de regressão; o baseline final esta em 94 testes (`05-07-SUMMARY.md`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Renderização de tabelas/modais/grade | Browser (React) | — | D-01/D-07: páginas CRUD client-side |
| Agregações (dashboard) | API (`GET /admin/dashboard`) | — | Backend já agrega (main.py:916-963); frontend só apresenta |
| Parse de XML NF-e | Browser (`fast-xml-parser`) | — | D-11: decisão registrada nos requisitos canônicos |
| Autorização por perfil | API (`require_perfil` → 401/403) | Browser (`ProtectedRoute`) | Backend é a autoridade; frontend só esconde/redireciona |
| Regras de estoque/auditoria | API (valida antes de gravar) | Browser (UX de justificativa) | 400 do backend é o guarda final; o modal é conveniência |

## API Contracts per Page

Todos os shapes abaixo foram lidos diretamente de `backend/main.py` e `backend/schemas.py` nesta sessão. Chamadas sempre via `fetchJson<T>(path, options)` (`api.ts:36-43`), que lança `ApiError(status, detail)` — o `detail` do backend (ex.: "Item 3: ação 'alterado' exige justificativa") chega pronto para exibição.

Constantes do backend a espelhar no frontend [VERIFIED: backend/main.py:38-44, verbatim]:

```python
PERFIS_VALIDOS = ["admin", "secretaria", "cozinheira"]
UNIDADES_VALIDAS = ["KG", "L"]
TIPOS_REFEICAO_VALIDOS = ["Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"]
ACOES_ENTREGA_VALIDAS = ["recebido", "alterado", "excluído"]
LIMIAR_BAIXO_ESTOQUE = 5.0
```

### 5.1 Dashboard (`/admin`, admin)

| Endpoint | Request | Response |
|---|---|---|
| `GET /admin/dashboard` | — | `DashboardResponse` (shape abaixo) |

[VERIFIED: backend/main.py:947-963, verbatim]

```json
{
  "estoque": { "total_itens": 45, "baixo_estoque": 3,
    "itens_criticos": [{ "id": 1, "nome": "Arroz Parboilizado", "saldo_atual": 2.5 }] },
  "refeicoes_hoje": [
    { "tipo_refeicao": "Almoço", "status": "confirmado", "prato": "Músculo com Batata", "alunos": 200 },
    { "tipo_refeicao": "Janta", "status": "pendente", "prato": null, "alunos": null }
  ],
  "entregas": { "ultimos_7_dias": 3, "ultimos_30_dias": 12, "ultima_data": "2026-07-30" },
  "alunos_hoje": { "total": 300, "por_tipo": { "Almoço": 200 } }
}
```

Notas: `refeicoes_hoje` tem os 3 tipos atuais (pendente/confirmado); `ultima_data` pode ser `null`. Substituir o placeholder atual (`admin/Dashboard.tsx`, 11 linhas).

### 5.2 Usuários (`/admin/usuarios`, admin)

| Endpoint | Request | Response |
|---|---|---|
| `GET /usuarios` | — | `[{ id, nome, perfil }]` [VERIFIED: main.py:77-83] |
| `POST /usuarios` | `{ nome, senha, perfil }` | `{ id, nome, perfil }`; 409 nome duplicado; 400 perfil inválido [VERIFIED: main.py:86-107] |
| `PUT /usuarios/{id}` | campos opcionais `{ nome?, senha?, perfil? }` | `{ id, nome, perfil }`; 404/409/400 [VERIFIED: main.py:110-140] |
| `DELETE /usuarios/{id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:143-155] |

Schemas espelhados: `UsuarioCreate/Update/Response` [VERIFIED: backend/schemas.py:38-53]. Senha nunca retorna. No modal de edição, senha vazia = não alterar (omitir o campo).

### 5.3 Itens (`/admin/itens`, admin)

| Endpoint | Request | Response |
|---|---|---|
| `GET /itens` | — | `[{ id, nome, unidade_oficial, saldo_atual }]` [VERIFIED: main.py:160-174] |
| `POST /itens` | `{ nome, unidade_oficial, saldo_atual? }` (default 0.0) | `ItemResponse`; 409/400 [VERIFIED: main.py:177-203] |
| `PUT /itens/{id}` | `{ nome?, unidade_oficial?, saldo_atual? }` | `ItemResponse`; 404/409/400 [VERIFIED: main.py:206-241] |
| `DELETE /itens/{id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:244-256] |
| `GET /conversoes?item_id={id}` | query param obrigatório | `[{ id, item_id, medida_caseira, peso_em_kg }]` [VERIFIED: main.py:261-278] |
| `POST /conversoes` | `{ item_id, medida_caseira, peso_em_kg }` | `ConversaoResponse`; 404 item inexistente; 409 duplicada [VERIFIED: main.py:281-314] |
| `DELETE /conversoes/{id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:317-329] |

- Baixo estoque: `saldo_atual < 5.0` → saldo em **`--erro` negrito (nunca fundo vermelho cheio)** + badge (.planning/PROJECT.md §5.2, D-07).
- **Recomendação (discricionariedade do agente):** embutir o gerenciador de conversões na própria página de Itens (expandir linha ou modal por item). Sem conversão cadastrada, `POST /refeicoes` falha com 400 (AGENTS.md) — o admin precisa de onde cadastrá-las; os planos `05-01-PLAN.md` a `05-07-PLAN.md` não criam página separada.

### 5.4 Cardápio (`/admin/cardapio`, admin)

| Endpoint | Request | Response |
|---|---|---|
| `GET /cardapio` | — | `[{ id, nome_refeicao, tipo_refeicao }]` (admin+sec) [VERIFIED: main.py:334-343] |
| `POST /cardapio` | `{ nome_refeicao, tipo_refeicao }` | `CardapioItemResponse`; 400 tipo inválido [VERIFIED: main.py:346-365] |
| `PUT /cardapio/{id}` | `{ nome_refeicao?, tipo_refeicao? }` | `CardapioItemResponse`; 404/400 [VERIFIED: main.py:368-392] |
| `DELETE /cardapio/{id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:395-407] |

Cada linha ganha ação "Editar receita" → `navigate('/admin/receitas/' + id)`. Select de `tipo_refeicao` restrito a `TIPOS_REFEICAO_VALIDOS`.

### 5.5 Receitas (`/admin/receitas/:id`, admin)

| Endpoint | Request | Response |
|---|---|---|
| `GET /cardapio/{id}/receita` | — | `[{ id, cardapio_item_id, item_id, item_nome, quantidade, medida_caseira }]` — **inclui `item_nome`** [VERIFIED: main.py:412-437] |
| `POST /cardapio/{id}/receita` | `{ item_id, quantidade, medida_caseira }` | `{ id, cardapio_item_id, item_id, quantidade, medida_caseira }` — **sem `item_nome`**; 404 prato/item inexistente [VERIFIED: main.py:440-470] |
| `PUT /cardapio/{id}/receita/{receita_id}` | `{ quantidade?, medida_caseira? }` | igual ao POST; 404 [VERIFIED: main.py:473-501] |
| `DELETE /cardapio/{id}/receita/{receita_id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:504-520] |

Notas: `useParams<{ id: string }>()` → `Number(id)`; dropdown de ingredientes vem de `GET /itens`; após POST/PUT, refazer o GET (ou mergear `item_nome` localmente a partir da lista de itens já carregada).

### 5.6 Planejamento (`/admin/planejamento`, admin + secretaria)

| Endpoint | Request | Response |
|---|---|---|
| `GET /planejamento?data=YYYY-MM-DD` | query (default: hoje) | `[{ id, dia_semana, tipo_refeicao, cardapio_item_id, nome_refeicao, data_inicio_vigencia }]` — **só slots vigentes**, ordenados por (dia, tipo) [VERIFIED: main.py:545-571] |
| `POST /planejamento` | `{ cardapio_item_id, tipo_refeicao, dia_semana, data_inicio_vigencia }` | entrada serializada; 400 dia/tipo inválido; 404 prato inexistente [VERIFIED: main.py:574-617] |
| `DELETE /planejamento/{id}` | — | `{ mensagem }`; 404 [VERIFIED: main.py:620-632] |
| `GET /cardapio` | — | opções do dropdown (filtrar por `tipo_refeicao` da coluna) |

### 5.7 Entregas (`/admin/entregas`, admin + secretaria)

| Endpoint | Request | Response |
|---|---|---|
| `GET /entregas?data=YYYY-MM-DD` | query opcional | `[{ id, data_hora, id_usuario, qtd_itens }]` — **sem itens** (mais recente primeiro) [VERIFIED: main.py:687-705] |
| `GET /entregas/{id}` | — | `{ id, data_hora, id_usuario, itens: [{ id, item_id, item_nome, quantidade, acao, justificativa }] }` [VERIFIED: main.py:708-735] |
| `POST /entregas` | `EntregaCreate` (abaixo) | `{ id, mensagem }`; 400 ação inválida/sem justificativa; 404 item; 422 lista vazia [VERIFIED: main.py:637-684, schemas.py:150-158] |
| `GET /itens` | — | catálogo para as linhas da tabela editável |

`EntregaCreate` [VERIFIED: backend/schemas.py:150-158, verbatim]:

```python
class EntregaItemRequest(BaseModel):
    item_id: int
    quantidade: float
    acao: str  # "recebido" | "alterado" | "excluído"
    justificativa: str | None = None

class EntregaCreate(BaseModel):
    itens: list[EntregaItemRequest] = Field(min_length=1)
```

## Planejamento Semantics

**Vigência (regra de leitura):** para cada slot `(dia_semana, tipo_refeicao)`, vale a entrada com a `data_inicio_vigencia` mais recente **≤ data consultada** [VERIFIED: main.py:529-542, verbatim do docstring: *"Para cada slot, vale a entrada com a data_inicio_vigencia mais recente <= data."*]. Entrada com vigência futura **não aparece** em consulta de data anterior (teste 8.9 em `test_planejamento.py:150-167`).

**Upsert (regra de escrita):** `POST /planejamento` procura entrada com **mesmo (dia_semana, tipo_refeicao, data_inicio_vigencia)** — se existir, substitui o `cardapio_item_id`; senão, cria nova [VERIFIED: main.py:595-617]. Ou seja:
- Mesmo slot + mesma vigência → **atualiza** (idempotente).
- Mesmo slot + vigência nova → **nova entrada**; a antiga deixa de valer a partir da nova data.

**Payload da grade semanal:**

```json
{
  "cardapio_item_id": 7,
  "tipo_refeicao": "Almoço",
  "dia_semana": 0,
  "data_inicio_vigencia": "2026-07-27"
}
```

**Implicações para a página:**
1. `GET /planejamento?data=<segunda da semana exibida>` devolve **somente slots preenchidos e vigentes** — células sem entrada = "A definir" (mapa `${dia_semana}|${tipo_refeicao}` → entrada, com o `id` necessário para DELETE).
2. A escolha de `data_inicio_vigencia` no POST é decisão de UX (discricionariedade): o natural é **a segunda-feira da semana em edição** (ou a data de hoje). Salvar duas vezes a mesma semana = upsert limpo.
3. **Filtrar o dropdown de pratos pelo `tipo_refeicao` da coluna** — o backend valida que a string do tipo é válida e que o prato existe, mas **NÃO** valida que `prato.tipo_refeicao == slot.tipo_refeicao` (main.py:583-593). Sem o filtro, dá para gravar "Janta" num slot de "Almoço".
4. **Mapeamento de dia:** backend usa Python `weekday()` (`0=segunda…6=domingo`, main.py:581-582); JS `Date.getDay()` usa `0=domingo…6=sábado`. Converter com `(jsDay + 6) % 7` ao derivar o dia de colunas/datas.
5. DELETE remove uma entrada de vigência específica (pelo `id` retornado no GET). "Limpar slot" = DELETE do id vigente.

## Entregas Flow

### Regras de backend (verificadas em main.py:649-684 e testes E1–E9)

- **Valida TUDO antes de gravar qualquer coisa** — um item inválido aborta a entrega inteira com 400 e nada é persistido [VERIFIED: main.py:649-663].
- `recebido`: soma `quantidade` ao `saldo_atual`. `alterado`: soma a quantidade **corrigida**, justificativa obrigatória. `excluído`: **não altera** saldo, justificativa obrigatória [VERIFIED: main.py:670-681; testes E2–E4].
- Sem justificativa em `alterado`/`excluído` → **400** com mensagem por item (`"Item 3: ação 'alterado' exige justificativa"`) [VERIFIED: main.py:656-660, test_e8].
- Lista vazia → **422** (`Field(min_length=1)`) [VERIFIED: schemas.py:158, test_e5] — desabilitar "Confirmar recebimento" com 0 linhas.
- Ação inválida → 400 listando as válidas. As três strings exatas: `"recebido"`, `"alterado"`, `"excluído"` (com acento) [VERIFIED: main.py:41].

### Fluxo da página (F11 + F12)

1. Lista de entregas (`GET /entregas`) + botão "Nova entrega" → escolha **Manual** ou **Upload XML**.
2. **Manual:** tabela editável começa vazia; cada linha = select de item (`GET /itens`) + quantidade + ação.
3. **XML:** `<input type="file" accept=".xml">` → `FileReader`/`file.text()` → parse → linhas pré-preenchidas (`acao: 'recebido'` por padrão), que seguem **exatamente** o mesmo caminho da manual (D-11).
4. **Edição com auditoria:** mudar quantidade após o parse → `acao: 'alterado'`; remover linha → `acao: 'excluído'` (manter a linha marcada, não sumir com ela — o backend espera o item no payload com ação `excluído`). Ambos abrem **modal de justificativa obrigatória** antes do submit (D-10); texto deve mencionar que é exigência de prestação de contas PNAE (CONTEXT.md specifics).
5. Submit monta `EntregaCreate`, exibe `mensagem` de sucesso, refaz `GET /entregas` (e `GET /itens` se saldos forem exibidos).
6. Detalhe de entrega passada: modal/expand com `GET /entregas/{id}` (a listagem não traz itens).

### Parse NF-e no frontend (fast-xml-parser)

**Status da dependência:** `fast-xml-parser@^5.10.1` **já instalado** (`frontend/package.json:13`) — nada a instalar (D-11 satisfeito). API verificada empiricamente nesta sessão: [VERIFIED: node + fast-xml-parser 5.10.1 instalado]

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false });
const doc = parser.parse(xmlText);
// nfeProc.NFe.infNFe.det → objeto único OU array (normalizar!)
// det.prod = { cProd: 123, xProd: 'ARROZ', qCom: 10, uCom: 'KG', vUnCom: 5.5 }
```

**Mapeamento NF-e → linha da tabela** (layout padrão SEFAZ; parse best-effort — validação fiscal formal fora de escopo) [ASSUMED — estrutura padrão NF-e; o parser em si foi verificado]:

| Campo XML | Caminho | Uso na linha |
|---|---|---|
| Código do produto | `nfeProc.NFe.infNFe.det[].prod.cProd` | exibição (referência do fornecedor) |
| Descrição | `...prod.xProd` | casar com `Item.nome` (normalizar: lowercase, trim, sem acentos); sem match → linha marcada p/ seleção manual |
| Quantidade | `...prod.qCom` | pré-preencher `quantidade` |
| Unidade da NF | `...prod.uCom` | exibição apenas — **NÃO** é a `unidade_oficial` do estoque (KG/L); conversões de NF são responsabilidade do usuário na revisão |
| Valor unitário | `...prod.vUnCom` | opcional (exibição) |
| Nº da nota / emitente | `...infNFe.ide.nNF`, `...infNFe.emit.xNome` | cabeçalho informativo da entrega |

**Três armadilhas do parse:**
1. `det` vem como **objeto único** quando a nota tem 1 item e **array** quando tem N — normalizar com `[].concat(det)` ou `Array.isArray` antes do `.map`.
2. Nem todo XML vem embrulhado em `nfeProc` — aceitar também raiz `NFe` direta (`doc.nfeProc?.NFe ?? doc.NFe`).
3. Valores numéricos já chegam coeridos para `number` (default `parseTagValue`), mas `qCom` da NF pode estar em unidade diferente do estoque (CX, PCT, UN) — por isso a tabela editável é **revisão humana obrigatória**, não importação cega.

## Frontend Patterns to Replicate

| Arquivo | Padrão | Como aplicar na Phase 5 |
|---|---|---|
| `src/pages/Login.tsx:19-31,79-87` | Form controlled + `erro` state + `role="alert"` + botão desabilitado durante submit ("Entrando…") | Mesmo esqueleto em todos os modais CRUD: estado `erro`/`salvando`, `role="alert"` no erro, botão com texto de progresso |
| `src/api.ts:36-43` | `fetchJson<T>` desserializa e lança `ApiError` com `detail` do backend | Toda chamada: `try { await fetchJson(...) } catch (e) { if (e instanceof ApiError) setErro(e.message) }` — o `detail` (ex.: 409 nome duplicado) já é amigável |
| `src/pages/DashboardGestao.tsx:7-30,62-68` | Estados `carregando`/`erro`/vazio antes de renderizar tabela | Repetir a **estrutura** (ternário loading → erro → vazio → conteúdo). **NÃO copiar:** `fetch('http://127.0.0.1:8000/...')` hardcoded (linha 15) — usar `fetchJson` |
| `src/pages/PainelCozinha.css:152-201` | `.modal-overlay` (fixed, z-50) + `.modal-content` (max-height 90vh, scroll) + `.modal-header` + `.btn-fechar` | Repetir a **estrutura** do modal. **NÃO copiar:** cores hex hardcoded (`#16a34a`, `#2563eb`…) e overlay preto — overlay do .planning/PROJECT.md é `rgba(18, 76, 15, 0.35)` |
| `src/pages/CardapioPublico.css:67-99` | Card branco + `border-top: 3px solid var(--verde-vivo)` + grid responsivo | Base visual dos 4 cards do Dashboard e dos cards de seção |
| `src/pages/DashboardGestao.tsx:93-100` | `saldo_atual.toFixed(2)` + badge de status por limiar | Formatação de saldo na página de Itens; badge BAIXO ESTOQUE vs ESTÁVEL (re-tokenizado) |
| `src/pages/Login.css:60-95` | `.form-group` label acima + `.form-input` com focus ring verde-vivo | Copiar classes-base de formulário para os modais CRUD |
| `src/components/Layout.css:82-88,135-157` | Link ativo (borda lateral verde-vivo), badges de perfil | Referência de como os tokens viram componentes; badges de ação de entrega seguem o mesmo molde |
| `src/auth-context.ts:32-38` | `useAuth()` → `isAdmin`, `isSecretaria`, `usuario` | Guards de UI (ex.: esconder ações admin se secretaria estiver em planejamento/entregas — ambos têm permissão total nelas, então raramente necessário) |

**Anti-padrões a NÃO replicar (legado pré-.planning/PROJECT.md, Phase 6 cuida deles):** URLs `http://127.0.0.1:8000` hardcoded, `id_usuario: 1` no body, `alert()` como feedback, `cardapiosPadrao` hardcoded, cores fora da paleta (`#2563eb`, `#1e40af`), inline styles.

## Layout/Sidebar Integration

**Descoberta que simplifica a fase:** a sidebar **já está completa** desde a Phase 4. [VERIFIED: frontend/src/components/Layout.tsx:18-35, verbatim]

```typescript
const NAV_POR_PERFIL: Record<Perfil, NavItem[]> = {
  admin: [
    { para: '/admin', rotulo: 'Dashboard', end: true },
    { para: '/admin/usuarios', rotulo: 'Usuários' },
    { para: '/admin/itens', rotulo: 'Itens / Estoque' },
    { para: '/admin/cardapio', rotulo: 'Cardápio' },
    { para: '/admin/planejamento', rotulo: 'Planejamento' },
    { para: '/admin/entregas', rotulo: 'Entregas' },
  ],
  secretaria: [
    { para: '/gestao', rotulo: 'Gestão', end: true },
    { para: '/admin/planejamento', rotulo: 'Planejamento' },
    { para: '/admin/entregas', rotulo: 'Entregas' },
  ],
  cozinheira: [
    { para: '/cozinha', rotulo: 'Painel da Cozinha', end: true },
  ],
};
```

- D-06 está efetivamente cumprido: os links existem e hoje levam a 404 — a fase só precisa **criar as rotas** em `App.tsx`. Nenhuma edição em `Layout.tsx` é necessária (a menos que se queira adicionar link para Receitas — não recomendado; ela é sub-página de Cardápio, acessada por botão na linha do prato).
- Padrão de registro de rota [VERIFIED: frontend/src/App.tsx:22-31]:

```tsx
<Route path="/admin/itens" element={
  <ProtectedRoute perfis={['admin']}>
    <Layout><Itens /></Layout>
  </ProtectedRoute>
} />
```

- Perfis por rota (D-05 + `.planning/ROADMAP.md`): `/admin`, `/admin/usuarios`, `/admin/itens`, `/admin/cardapio`, `/admin/receitas/:id` → `['admin']`; `/admin/planejamento`, `/admin/entregas` → `['admin', 'secretaria']`.
- Secretaria cai em `/gestao` após login (`ROTA_POR_PERFIL`, auth-context.ts:26-30) e alcança planejamento/entregas pela sidebar.
- `ProtectedRoute` redireciona perfil errado para a home do próprio perfil (`ProtectedRoute.tsx:22-25`) — secretaria que digitar `/admin/itens` volta para `/gestao` sem erro.

## Design Tokens in Practice

Tokens disponíveis em `:root` [VERIFIED: frontend/src/index.css:8-38, verbatim das variáveis]:

```
--verde-escuro: #124C0F   --verde-vivo: #48BB2C   --amarelo: #C5D227   --branco: #FFFFFF
--verde-escuro-hover: #0D3809   --verde-tint: #EDF4EA   --fundo: #F7FAF5
--texto: #1D2B1A   --texto-suave: #5A6B56   --borda: #D9E4D4
--erro: #B3261E   --erro-fundo: #FBEDEB
--cor-primaria / --cor-primaria-hover / --cor-sucesso / --cor-alerta / --cor-erro (semânticos)
--raio: 8px   --sombra-card: 0 1px 3px rgba(18, 76, 15, 0.10)
--fonte-serif: Georgia, 'Times New Roman', serif   --fonte-sans: system-ui, ...
```

Regras do .planning/PROJECT.md aplicáveis a estas 7 páginas [CITED: .planning/PROJECT.md §3, §5, §6]:

- **Tipografia:** serif é proibida em telas operacionais — só Login/Cardápio Público. Admin usa `--fonte-sans` (títulos 600/18–22px).
- **Botões:** primário = fundo `--verde-escuro` (hover `--verde-escuro-hover`), texto branco; perigo = fundo branco, borda+texto `--erro`, hover `--erro-fundo`; foco visível `outline: 2px solid var(--verde-vivo)`.
- **Tabelas:** header com fundo `--verde-tint` e texto `--verde-escuro` 600; linhas com borda inferior `--borda`; hover `--verde-tint` a 50%.
- **Baixo estoque:** texto do saldo em `--erro` **negrito** — nunca fundo vermelho cheio (.planning/PROJECT.md §5.2).
- **Badges de status (mapeamento direto para Entregas):** `recebido` → fundo `--verde-vivo`, texto branco (badge grande); `alterado` → fundo `--amarelo`, texto `--texto` (contraste obrigatório); `excluído` → fundo `--erro-fundo`, texto `--erro`.
- **Modal:** overlay `rgba(18, 76, 15, 0.35)` (verde translúcido, não preto), card branco raio 12px.
- **Campo de justificativa:** obrigatório destacado com **borda `--amarelo` até ser preenchido** (.planning/PROJECT.md §5.4) — perfeito para o modal de justificativa das Entregas.
- **Contraste:** branco sobre `--verde-vivo` proibido em texto pequeno; amarelo sempre com texto escuro; fundo geral `--fundo`, conteúdo em cards brancos.
- **Logo:** só aparece via `Layout` (sidebar) — as páginas admin não precisam importá-lo.

## Manual Test Map (F6–F12)

| # | Teste (.planning/codebase/TESTING.md) | Página | Dicas de aceite para o plano |
|---|---|---|---|
| F6 | Dashboard admin → 4 cards/seções exibem dados reais | Dashboard | Verificar as 4 seções de `GET /admin/dashboard`; com banco fresco, valores zerados são válidos (seções presentes); após criar entrega/refeição, números sobem |
| F7 | CRUD de usuários → criar, editar, excluir com feedback visual | Usuários | Criar `teste/teste123` secretaria → aparece na tabela; editar perfil; excluir; tentar nome duplicado → 409 visível; login com o usuário criado funciona |
| F8 | CRUD de itens → criar, editar, excluir com feedback visual | Itens | Item com saldo < 5.0 exibe destaque de baixo estoque; 409 em nome duplicado; conversão cadastrada via UI aparece no `GET /conversoes` |
| F9 | Cardápio + receitas → adicionar prato, ingredientes, remover | Cardapio + Receitas | Criar prato → abrir `/admin/receitas/:id` → adicionar 2 ingredientes (qtd + medida caseira) → editar qtd → remover 1 → prato aparece no dropdown do Planejamento |
| F10 | Planejamento → selecionar prato em cada slot, salvar, recarregar persiste | Planejamento | Salvar slots → F5 → grade reidratada via GET; mudar prato de um slot (upsert) → reflete; verificar no cardápio público (`/cardapio`) que o prato do dia aparece |
| F11 | Entregas manual → criar, editar item (abre justificativa), confirmar | Entregas | Alterar qtd sem justificativa → bloqueado na UI (e backend 400 se forçado); com justificativa → 200; saldo do item sobe na página Itens; entrega aparece na listagem |
| F12 | Entregas XML → upload, parse, editar, confirmar | Entregas | Upload de XML NF-e real ou sintético → tabela populada; item não reconhecido → seleção manual; editar com justificativa → confirmar → saldos atualizados |

Setup dos testes manuais: backend de `backend/` (`source venv/bin/activate && uvicorn main:app --reload --port 8000`) + `npm run dev` (porta 5173) + usuários seed `admin/admin123`, `secretaria/secretaria123`.

## Risks & Gotchas

1. **`dia_semana` JS vs Python** — backend `0=segunda…6=domingo` (main.py:581-582), JS `0=domingo`. Sem o mapa `(jsDay + 6) % 7`, a grade salva no dia errado silenciosamente. Centralizar constantes `DIAS_SEMANA = ['Segunda',…,'Domingo']` indexadas pelo valor do backend.
2. **`"excluído"` com acento** — typo (`excluido`) passa pelo TS (é `string`) e explode em 400 no submit. Tipar como union literal `type AcaoEntrega = 'recebido' | 'alterado' | 'excluído'` em `types.ts` e nunca digitar a string inline.
3. **Lint zero warnings (D-12) com regra `react-refresh/only-export-components`** — arquivos `.tsx` de página só podem exportar o componente. Helpers/constantes/tipos (DIAS_SEMANA, parsers de XML, `AcaoEntrega`) vão para arquivos `.ts` separados (mesma lição da Phase 4 com `auth-context.ts`).
4. **`verbatimModuleSyntax` + `erasableSyntaxOnly` (D-13)** — `import type { Item }` para tipos; sem enums TS nem parameter properties. `tsc -b` roda no `npm run build`, então erro de tipo bloqueia o critério de saída.
5. **Parse XML: `det` objeto vs array; raiz `nfeProc` vs `NFe`; `uCom` ≠ unidade oficial.** Normalizações obrigatórias; a tabela editável é revisão humana, não importação cega. XML malformado → `parser.parse` lança → capturar e mostrar erro amigável ("arquivo não é um XML de NF-e válido").
6. **`POST /planejamento` não valida coerência prato×tipo** — o dropdown da grade DEVE filtrar pratos por `tipo_refeicao` da coluna, senão grava incoerência (ex.: prato de Janta no slot de Almoço).
7. **`GET /planejamento` retorna só slots vigentes/preenchidos** — a grade se constrói por junção local (7 dias × 4 slots) com o resultado; célula ausente ≠ erro, é "A definir". Vigências futuras ficam invisíveis para a data consultada (comportamento correto — não "bug do GET").
8. **401 em meio à sessão (token expirado)** — `fetchJson` lança `ApiError(401)`. Não há refresh nem interceptor global; tratar por página com mensagem "sessão expirada — entre novamente" (o próximo acesso a rota protegida redireciona via `ProtectedRoute`). Não construir mecanismo global novo nesta fase.
9. **Não tocar nas páginas legadas** (`PainelCozinha`, `DashboardGestao`) — URLs hardcoded e `id_usuario: 1` são débito conhecido da Phase 6 (CONTEXT.md deferred). Alterá-las agora infla o escopo.
10. **Rodar comandos do diretório certo** — `DATABASE_URL` é relativa: backend/uvicorn/pytest sempre de `backend/`, senão cria `merenda.db` vazio na raiz (AGENTS.md).
11. **Listagens sem detalhe** — `GET /entregas` não traz itens (usa `qtd_itens`); detalhe exige `GET /entregas/{id}`. Idem `POST /cardapio/{id}/receita` sem `item_nome` — planejar refetch ou merge local.
12. **Saldo como float** — exibir com `toFixed(2)` (padrão de `DashboardGestao.tsx:93`); inputs de quantidade com `step="0.1"` ou `any`.

## Validation Architecture

`.planning/config.json` não existe → `workflow.nyquist_validation` tratado como habilitado. Por decisão travada (D-12), **não há framework de teste de frontend** — a validação é: typecheck/build, lint zero warnings, checklist manual F6–F12, e pytest do backend como guarda de regressão.

### Test Framework

| Property | Value |
|----------|-------|
| Framework (frontend) | nenhum (testes manuais — D-12; Playwright adiado) |
| Framework (backend, regressão) | pytest + httpx TestClient — 100 testes no baseline atual, SQLite in-memory StaticPool |
| Config file | `frontend/eslint.config.js` (flat config: js + tseslint + react-hooks + react-refresh) |
| Quick run command | `npm run build && npm run lint` (rodar de `frontend/`) |
| Full suite command | `pytest backend/tests/ -v` (rodar de `backend/` com venv ativo) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| F6 | Dashboard exibe 4 seções reais | manual | — (verificar com seed + entrega/refeição criadas) | n/a |
| F7–F9 | CRUDs usuários/itens/cardápio+receitas com feedback | manual | — | n/a |
| F10 | Planejamento persiste após reload | manual | — | n/a |
| F11 | Entrega manual com justificativa obrigatória | manual | — | n/a |
| F12 | Entrega via XML parse → editar → confirmar | manual | — | n/a |
| Regressão API | 23 rotas continuam íntegras | automatizado | `cd backend && source venv/bin/activate && pytest tests/ -v` | ✅ (100 testes atuais; 94 no fechamento de 05-07) |
| Typecheck | TS estrito compila | automatizado | `npm run build` (`tsc -b && vite build`) | ✅ |
| Lint | zero warnings | automatizado | `npm run lint` | ✅ |

### Sampling Rate
- **Per task commit:** `npm run build && npm run lint` (de `frontend/`)
- **Per wave merge:** os dois acima + `pytest backend/tests/ -v` (de `backend/`)
- **Phase gate:** tudo verde + checklist manual F6–F12 executado sem falhas → `/gsd-verify-work`

### Wave 0 Gaps
- Nenhum gap automatizado — a fase não adiciona framework de testes (D-12). O checklist manual F6–F12 já existe em `.planning/codebase/TESTING.md`.
- Útil preparar: **XML de NF-e de exemplo** (sintético, 2–3 itens) em um arquivo de apoio para executar F12 sem nota fiscal real.

## Package Legitimacy Audit

Nenhum pacote novo é instalado nesta fase. A única dependência relevante já consta do projeto:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| fast-xml-parser | npm | 9.5 anos (criado 2017-01-28) | ~83M/semana | github.com/NaturalIntelligence/fast-xml-parser | OK | Approved (já instalado: 5.10.1) |

**Nota sobre o veredito do seam:** `package-legitimacy check` retornou `SUS` com razão `too-new` — falso positivo: o sinal `publishedAt` reflete a data da **última release** (2026-07-16), não a idade do pacote (2017, 83M downloads/semana, repo oficial, sem postinstall). Adicionalmente, o pacote é decisão travada do projeto (D-11 / requisitos canônicos) e **já está instalado** — nenhuma instalação nova ocorre na fase, portanto nenhum `checkpoint:human-verify` é necessário.

**Packages removed (SLOP):** nenhum.
**Packages flagged (SUS):** nenhum efetivo (ver nota acima).

## Sources

### Primary (HIGH confidence) — lidos nesta sessão
- `backend/main.py:38-44,77-963` — constantes, todos os endpoints consumidos, semânticas de planejamento/entregas/dashboard
- `backend/schemas.py:38-158` — shapes Pydantic exatos (Usuario, Item, Conversao, CardapioItem, Receita, Planejamento, Entrega)
- `backend/tests/test_planejamento.py`, `test_entregas.py` — comportamento esperado (upsert, vigência, E1–E9)
- `frontend/src/api.ts`, `auth-context.ts`, `App.tsx`, `components/Layout.tsx` + `.css`, `components/ProtectedRoute.tsx`, `pages/Login.tsx` + `.css`, `pages/CardapioPublico.tsx` + `.css`, `pages/DashboardGestao.tsx` + `.css`, `pages/PainelCozinha.tsx` + `.css`, `pages/admin/Dashboard.tsx`, `types.ts`, `index.css`, `package.json`, `eslint.config.js`, `.env`
- `.planning/ROADMAP.md` §4–§5, `.planning/STATE.md`, `05-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/codebase/TESTING.md`, `AGENTS.md`
- Execução empírica: `node` + `fast-xml-parser@5.10.1` instalado — parse de XML NF-e sintético confirmou o shape `{cProd, xProd, qCom, uCom, vUnCom}`

### Secondary (MEDIUM confidence)
- npm registry (`npm view fast-xml-parser`) — idade, downloads, releases

### Tertiary (LOW confidence)
- Caminhos internos do layout NF-e (`nfeProc.NFe.infNFe.det[].prod.*`, `ide.nNF`, `emit.xNome`) — layout padrão SEFAZ do conhecimento de treinamento, não verificado contra um XML real nesta sessão; parse é best-effort por decisão (CONTEXT.md deferred). Marcado [ASSUMED] onde usado.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — dependências e versões lidas do `package.json`; parser verificado por execução
- Architecture: HIGH — padrões extraídos dos arquivos-fonte existentes, não de memória
- Pitfalls: HIGH — derivados de contratos lidos (dia_semana, acento em "excluído", validação-total-antes-de-gravar); armadilhas de NF-e MEDIUM (layout assumido)

**Research date:** 2026-07-31
**Valid until:** 2026-08-30 (contratos de backend estáveis e testados; revisitar se Phase 6 renomear algo)
