# Phase 6: Cozinha + Gestão (Frontend) — Research

**Researched:** 2026-08-03  
**Domain:** React/Vite/TypeScript com API FastAPI autenticada para operação de cozinha e gestão escolar  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Cozinha: fonte de verdade e fluxo de lançamento
- **D-06-01:** Remover o uso funcional de `cardapiosPadrao`, `fetch` direto, `http://127.0.0.1:8000` e `id_usuario` hardcoded. O planejamento vigente e os pratos/receitas do backend são a fonte de verdade.
- **D-06-02:** Carregar o dia por `GET /planejamento?data=YYYY-MM-DD` e exibir os quatro slots de serviço (`Lanche da Manhã`, `Almoço`, `Lanche da Tarde`, `Janta`). Os dois slots de lanche continuam mapeados para o tipo de refeição `Lanche` no `POST /refeicoes`.
- **D-06-03:** Ao selecionar uma entrada, carregar a receita por `GET /cardapio/{cardapio_id}/receita` e as conversões por `GET /conversoes?item_id={id}`; o payload de confirmação deve usar IDs de itens e o contrato atual de `RefeicaoCreate`, incluindo `planejamento_id`, `tipo_refeicao`, `qtd_alunos`, `quantidade`, `medida_caseira` e justificativas quando houver divergência.
- **D-06-04:** A baixa de estoque, a conversão de medidas, a validação de estoque e a autoria pertencem ao backend. O frontend deve apresentar os erros do `ApiError` sem tentar duplicar essas regras ou enviar `id_usuario`. A cozinheira não cria, altera ou exclui conversões.
- **D-06-05:** Alterar quantidade, incluir ingrediente fora da receita ou remover ingrediente exige justificativa visível por ingrediente, conforme `MEAL-04` e `MEAL-05`. Não usar alertas silenciosos como substituto do registro auditável.
- **D-06-12:** Cada ingrediente deve usar um `select` de medidas/conversões já cadastradas para o item; não há medida livre, `peso_em_kg` ad hoc ou cadastro de conversão no painel da cozinha. Sem opção, a confirmação é bloqueada e o admin deve cadastrar a conversão.
- **D-06-13:** A quantidade de alunos deve ser informada antes de exibir a receita; a quantidade inicial/final é `quantidade_base_da_receita × qtd_alunos`, enviada no POST e usada na baixa. O backend deve auditar alterações adicionais contra essa quantidade escalada.

### Gestão: dados reais e navegação
- **D-06-06:** A secretaria deve consultar endpoints autorizados para secretaria: `GET /itens`, `GET /refeicoes`, `GET /planejamento`, `GET /entregas` e detalhes quando necessários. Não usar `/admin/dashboard`, pois esse endpoint permanece autorizado somente para `admin`.
- **D-06-07:** A tela deve mostrar estados de carregamento, erro, vazio e dados reais, sem depender da rota legada `/estoque`. Os links de Planejamento e Entregas devem reutilizar as rotas existentes `/admin/planejamento` e `/admin/entregas`.
- **D-06-08:** Os indicadores de estoque devem respeitar a semântica atual: o saldo interno é kg/L e unidades livres são exibidas com `fator_conversao`; o limiar operacional é 5 unidades na unidade de exibição quando essa informação for apresentada.

### Integração e qualidade
- **D-06-09:** Todas as chamadas novas ou migradas passam por `frontend/src/api.ts` (`fetchJson`/`fetchWithAuth`) e usam o JWT mantido pelo `AuthProvider`. Erro 401 deve produzir mensagem de sessão expirada e permitir nova entrada.
- **D-06-10:** Preservar CSS plain co-localizado, tokens de `frontend/src/index.css`, superfícies claras para a logo e tipografia sans-serif operacional. Não introduzir Tailwind nem uma identidade visual paralela.
- **D-06-11:** A fase deve fechar com `npm run build`, `npm run lint` e a suite backend completa verde. O baseline histórico de 05-07 foi 94 testes; o baseline atual validado no worktree é 100 testes passando.

### the agent's Discretion
- Organizar a tela da cozinha como página, painel e modal desde que o fluxo de seleção → ajuste → confirmação permaneça claro.
- Escolher se o dashboard da secretaria usa cards, tabela ou seções compactas, desde que exponha estoque, refeições, planejamento e entregas sem inventar agregações que a API não fornece.
- Definir os textos de loading, vazio e erro, mantendo o `detail` do backend quando ele for acionável para o usuário.
- Decidir se a tela recarrega dados sob demanda ou ao montar, desde que não apresente estado stale após confirmar ou falhar parcialmente.

### Deferred Ideas (OUT OF SCOPE)
- Cardápio público responsivo e polido, checklist manual completo e verificação ponta a ponta — Phase 7.
- Playwright/E2E, CI/CD, Alembic/PostgreSQL e validação formal de XML NF-e — futuro milestone.
- Novos endpoints de agregação para secretaria — somente se a pesquisa provar que os endpoints existentes não cobrem `MGMT-01`; não ampliar o escopo preventivamente.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAL-07 | Painel da cozinheira deve consumir planejamento e API reais sem `cardapiosPadrao`, URL fixa ou `id_usuario` hardcoded. **Phase 6** | Contratos verificados de `/planejamento`, `/cardapio/{id}/receita`, `/refeicoes`, `fetchJson` e JWT; decomposição de migração da página legada. |
| MEAL-08 | Cozinheira deve concluir o fluxo completo de selecionar, ajustar, confirmar e verificar a baixa. **Phase 6** | Modelo de estado por slot/receita, payload auditável, tratamento de conversão/estoque pelo backend e refetch pós-confirmação. |
| MGMT-01 | Painel da secretaria deve consumir dados reais de estoque, refeições, planejamento e entregas. **Phase 6** | Matriz de endpoints autorizados para secretaria, sem `/admin/dashboard` ou `/estoque` legado, incluindo formato de cada resposta. |
| MGMT-02 | Painel da secretaria deve oferecer navegação para planejamento e entregas. **Phase 6** | Rotas protegidas existentes `/admin/planejamento` e `/admin/entregas`, já presentes no `Layout` e no `App`. |
</phase_requirements>

## Summary

`PainelCozinha.tsx` é uma superfície legada: mantém cardápio local, chama `/refeicoes/lancar` por `fetch` direto, usa `http://127.0.0.1:8000` e envia `id_usuario: 1` [VERIFIED: `frontend/src/pages/PainelCozinha.tsx:6-34,65-100`]. `DashboardGestao.tsx` também chama a rota legada `/estoque` sem JWT e calcula o alerta sobre o saldo bruto [VERIFIED: `frontend/src/pages/DashboardGestao.tsx:11-29,44-107`]. A migração correta é interna às duas páginas: manter `/cozinha` e `/gestao` protegidas pelo shell existente e substituir somente a fonte de dados, o fluxo de estado e a apresentação [VERIFIED: `frontend/src/App.tsx:99-121`; `frontend/src/components/Layout.tsx:18-35,88-105`].

Os contratos existentes cobrem o fluxo principal sem uma nova camada de backend: planejamento vigente, receita por prato, conversões por item, lançamento autenticado de refeição, estoque para todos os três perfis e leitura de refeições/entregas para secretaria [VERIFIED: `backend/main.py:300-318,452-477,599-611,914-1042`; `backend/schemas.py:139-183`]. A única lacuna para o novo requisito é autorizar a leitura de `/conversoes` para `cozinheira`; criação e exclusão permanecem admin-only. O ponto que também precisa de decisão explícita no plano é a distinção entre os dois slots de lanche: o planejamento tem quatro slots, mas `POST /refeicoes` e `/refeicoes/hoje` aceitam/representam apenas o tipo `Lanche`, portanto a UI deve preservar o slot como identidade de seleção e não inferir um status durável por slot a partir de `/refeicoes/hoje` [VERIFIED: `backend/main.py:37-42,1045-1077`; `backend/tests/test_dashboard.py:19-25`; `06-CONTEXT.md:19-25`].

**Primary recommendation:** usar `fetchJson` em uma única rotina de carregamento por página, exigir alunos antes de carregar a receita, calcular `quantidade_base × alunos` no cliente para apresentação/envio, alinhar o backend para auditar esse valor escalado, carregar conversões pré-cadastradas pelo `item_id`, renderizar medidas em selects somente leitura, enviar `POST /refeicoes` com IDs e justificativas por ingrediente, refazer a leitura após confirmação/falha e compor o painel da secretaria somente com `/itens`, `/refeicoes`, `/planejamento` e `/entregas`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seleção do slot e edição de alunos/ingredientes | Browser / Client | API / Backend | O cliente mantém estado transitório e campos de justificativa; o backend valida a submissão e persiste somente após validação [VERIFIED: `06-CONTEXT.md:19-25`; `backend/main.py:942-1005`]. |
| Planejamento e receita vigentes | API / Backend | Browser / Client | O backend calcula a vigência e retorna o prato/receita; a UI filtra o dia e renderiza slots ausentes como pendentes [VERIFIED: `backend/main.py:569-611`; `06-CONTEXT.md:97-101`]. |
| Cadastro de conversões | Admin / Backend | Cozinha / leitura | Admin cadastra/remove conversões; a cozinha apenas lê opções pré-cadastradas e escolhe no select. |
| Conversão, baixa e atomicidade da refeição | API / Backend | Database / Storage | Conversão de medidas, estoque insuficiente, auditoria e commit pertencem à rota autenticada de refeições [VERIFIED: `backend/main.py:871-1005`; `backend/models.py:133-155`]. |
| Indicadores da secretaria | Browser / Client | API / Backend | Não existe dashboard equivalente autorizado para secretaria; a página deve compor apenas contagens/listas diretamente observáveis dos endpoints permitidos [VERIFIED: `backend/main.py:816-867,1008-1042,1082-1136`; `06-CONTEXT.md:26-30`]. |
| Navegação para planejamento e entregas | Browser / Client | — | As rotas já existem no Router e no menu condicional da secretaria [VERIFIED: `frontend/src/App.tsx:78-96`; `frontend/src/components/Layout.tsx:27-30`]. |

## Project Constraints (from AGENTS.md)

- Tratar `backend/` e `frontend/` como duas aplicações independentes, sem tooling de monorepo [VERIFIED: `AGENTS.md:3-7` — “Two separate apps: `backend/` (Python/FastAPI) and `frontend/` (React/Vite/TypeScript).”].
- Executar comandos do backend a partir de `backend/` e ativar o venv antes de iniciar/validar [VERIFIED: `AGENTS.md:10-13` — “Activate venv first” e “run Python/uvicorn from `backend/`”].
- Executar no frontend `npm install`, `npm run dev`, `npm run lint` e `npm run build` a partir de `frontend/` [VERIFIED: `AGENTS.md:15-19`].
- Não rodar o backend na raiz: `DATABASE_URL` é relativa e pode criar um banco vazio no diretório errado [VERIFIED: `AGENTS.md:21-22` — “always run Python/uvicorn from `backend/`”].
- Preservar as rotas e guards existentes; `/cozinha` é da cozinheira e `/gestao` é da secretaria [VERIFIED: `AGENTS.md:23-24`; `frontend/src/App.tsx:99-121`].
- Atualizar tipos frontend e modelos Pydantic juntos quando um shape realmente mudar; esta pesquisa não recomenda mudança de shape [VERIFIED: `AGENTS.md:25-26`].
- Usar `VITE_API_URL` por meio de `src/api.ts`; as páginas legadas são precisamente a exceção que a Fase 6 deve remover [VERIFIED: `AGENTS.md:26`; `frontend/.env:1`; `frontend/src/api.ts:1-6`].
- Preservar CSS plain co-localizado, tokens de `frontend/src/index.css` e logo somente em superfície clara [VERIFIED: `AGENTS.md:27,33`; `frontend/src/index.css:8-38`].
- Usar `import type` com `verbatimModuleSyntax`, evitar enums/namespaces/parameter properties por `erasableSyntaxOnly` e manter a suíte backend em `pytest backend/tests/`/execução a partir de `backend/` [VERIFIED: `AGENTS.md:29-34`].
- Não duplicar conversão de medidas no frontend nem aceitar medida livre; uma medida sem conversão correspondente pode fazer `POST /refeicoes` falhar e deve ser bloqueada/explicada pela UI [VERIFIED: `AGENTS.md:32`; `backend/main.py:879-911`].

## Standard Stack

### Core

| Library / surface | Version | Purpose | Why standard here |
|-------------------|---------|---------|-------------------|
| React | lockfile `19.2.8`; manifest range `^19.2.7` | Estado, eventos e renderização das duas páginas | Já é a runtime da aplicação; não adicionar outra camada de componentes [VERIFIED: `frontend/package.json:12-17`; `frontend/package-lock.json:3105-3115`]. |
| TypeScript | lockfile `6.0.3`; manifest `~6.0.2` | Contratos de payload/resposta e typecheck | O build existente executa `tsc -b` antes do bundle [VERIFIED: `frontend/package.json:7-10,30-34`; `frontend/package-lock.json:3340-3352`]. |
| Vite | lockfile `8.1.5`; manifest range `^8.1.1` | Dev server e build | Ferramenta já configurada e validada pelo build atual [VERIFIED: `frontend/package.json:7-10,34`; `frontend/package-lock.json:3426-3437`]. |
| React Router DOM | lockfile `7.11.0`; manifest range `^7.11.0` | Rotas protegidas e links de navegação | `/cozinha`, `/gestao`, `/admin/planejamento` e `/admin/entregas` já usam o Router [VERIFIED: `frontend/package.json:12-17`; `frontend/src/App.tsx:78-121`]. |
| `fetchJson` / `ApiError` internos | contrato atual | JWT, JSON e propagação de `detail` | É o cliente HTTP centralizado, já usado por todas as páginas administrativas migradas [VERIFIED: `frontend/src/api.ts:8-43`; `frontend/src/pages/admin/Planejamento.tsx:3-7`; `frontend/src/pages/admin/Entregas.tsx:6-18`]. |
| FastAPI + Pydantic + SQLAlchemy | FastAPI `0.139.2`, Pydantic `2.13.4`, SQLAlchemy `2.0.51` | API, validação de body e persistência | São as dependências fixadas do backend; a fase não deve instalar ou atualizar nenhuma [VERIFIED: `backend/requirements.txt:10-33`; `06-DISCUSSION-LOG.md:32-36`]. |

### Supporting

| Surface | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `SLOTS_REFEICAO` / `TIPOS_REFEICAO` | constantes existentes | Separar quatro slots de planejamento dos três tipos aceitos em refeição | Reusar na cozinha; não duplicar strings em componentes [VERIFIED: `frontend/src/pages/admin/constants.ts:6-8`; `05-07-SUMMARY.md:47-55`]. |
| `LIMIAR_BAIXO_ESTOQUE` | `5.0` | Status de estoque na unidade de exibição | Usar somente depois de converter saldo com o fator do item [VERIFIED: `frontend/src/pages/admin/constants.ts:15`; `backend/main.py:44-45`; `frontend/src/pages/admin/Itens.tsx:311-333`]. |
| CSS plain co-localizado + tokens | sem pacote novo | Layout operacional, tabela, modal e estados | Reusar a estrutura visual, não as cores/inline styles legados [VERIFIED: `06-CONTEXT.md:31-34`; `frontend/src/index.css:8-38`; `frontend/src/pages/admin/Dashboard.tsx:37-167`]. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff / decision |
|------------|-----------|---------------------|
| `fetchJson` e estado local | TanStack Query/SWR | Não instalar: o contexto fixa `fetchJson`, não há pacote existente para cache e Playwright/E2E está fora do milestone [VERIFIED: `06-CONTEXT.md:31-34,114-119`; `frontend/package.json:12-34`]. |
| `/itens`, `/refeicoes`, `/planejamento`, `/entregas` | `/admin/dashboard` | Não usar: `/admin/dashboard` exige perfil `admin` e retornaria 403 para secretaria [VERIFIED: `backend/main.py:1082-1086`; `backend/tests/test_dashboard.py:87-95`]. |
| `/itens` | `/estoque` | Não usar: `/estoque` é rota legada sem autenticação e com nomes de campos antigos [VERIFIED: `backend/main.py:1174-1203`; `06-CONTEXT.md:26-30`]. |

**Installation:** nenhuma. A implementação deve usar as dependências já presentes; não há pacote externo novo a legitimar ou instalar [VERIFIED: `frontend/package.json:12-34`; `backend/requirements.txt:1-34`].

**Version verification:** o lockfile foi lido nesta sessão e o registry foi consultado para React, React Router DOM, Vite e TypeScript em 2026-08-03; as versões do lockfile são o baseline executável e não devem ser atualizadas como parte desta fase [VERIFIED: `frontend/package-lock.json:3105-3158,3340-3352,3426-3437`; execução local de `npm view` em 2026-08-03].

## Package Legitimacy Audit

Não aplicável: a recomendação é não instalar dependências externas nesta fase [VERIFIED: `06-CONTEXT.md:12,114-119`; `frontend/package.json:12-34`].

## Architecture Patterns

### System Architecture Diagram

```text
cozinheira autenticada
  -> /cozinha + Layout/ProtectedRoute
  -> GET /planejamento?data=YYYY-MM-DD
  -> filtrar dia local e renderizar 4 slots
  -> selecionar entrada (planejamento_id, cardapio_item_id)
  -> GET /cardapio/{cardapio_id}/receita
  -> editar qtd_alunos / ingredientes / justificativas
  -> POST /refeicoes com Bearer JWT
      -> FastAPI valida perfil, receita, conversão e estoque
      -> grava refeicao_itens auditáveis e deduz estoque atomicamente
  -> refetch de planejamento/status/estoque e feedback

secretaria autenticada
  -> /gestao + Layout/ProtectedRoute
  -> GET /itens + GET /refeicoes?data=... + GET /planejamento?data=... + GET /entregas?data=...
  -> composição de seções estoque / refeições / planejamento / entregas
  -> NavLink para /admin/planejamento e /admin/entregas
```

O fluxo acima atribui autenticação, autorização, conversão, baixa e persistência ao backend, enquanto a UI controla seleção, edição transitória, feedback e navegação [VERIFIED: `backend/main.py:599-611,914-1042`; `frontend/src/api.ts:18-42`; `frontend/src/App.tsx:78-121`].

### Recommended Project Structure

```text
frontend/src/
├── pages/PainelCozinha.tsx       # fluxo de slots, receita, ajustes e POST /refeicoes
├── pages/PainelCozinha.css       # estilos operacionais co-localizados
├── pages/DashboardGestao.tsx     # composição de quatro consultas autorizadas
├── pages/DashboardGestao.css     # estados, cards/tabelas e responsividade local
├── pages/admin/constants.ts      # slots, tipos e limiar reutilizáveis
├── api.ts                        # único cliente HTTP autenticado
└── types.ts                      # shapes compartilhados da API
```

Essa estrutura preserva os arquivos-alvo e os padrões que já existem, sem criar uma camada de backend ou um diretório de componentes prematuramente [VERIFIED: `06-CONTEXT.md:7-12,65-73`; `frontend/src/App.tsx:7-17`; `frontend/src/pages/admin/constants.ts:1-15`].

### Pattern 1: Load → select slot → load recipe → edit draft → submit

**What:** carregar o planejamento uma vez para o dia, indexar as entradas por `dia_semana` + slot, carregar a receita somente para a entrada selecionada e manter um draft separado do payload persistido [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:33-49,68-81`; `backend/main.py:452-477,599-611`].

**When to use:** sempre que a cozinheira trocar o slot ou o dia; slots ausentes são estado vazio/pendente, não erro [VERIFIED: `06-CONTEXT.md:97-101`; `06-CONTEXT.md:36-40`].

**Example:** o padrão existente para data e consulta autenticada é:

> “`fetchJson<PlanejamentoEntrada[]>('/planejamento?data=' + formatISO(seg))`” [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:73-77`]

O executor deve reutilizar `segundaDaSemana`/`formatISO` somente se a UI continuar mostrando semana; para o painel do dia, uma função equivalente deve formatar a data local sem `toISOString()` [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:12-30`].

### Pattern 2: Audit every non-default ingredient row

**What:** representar cada linha enviada com `item_id`, quantidade, medida escolhida de uma conversão previamente cadastrada e justificativa; uma divergência deve mostrar o campo de justificativa no próprio ingrediente antes de habilitar confirmação [VERIFIED: `backend/schemas.py:171-183`; `backend/main.py:965-975`; `06-CONTEXT.md:24-25`].

**When to use:** alteração de quantidade, inclusão de item fora da receita e remoção. Para remoção, manter a linha com quantidade `0` e justificativa explícita permite que ela atravesse a mesma validação de divergência do backend; não omitir silenciosamente a linha [VERIFIED: `backend/main.py:965-1001`; `backend/schemas.py:171-177`; `REQUIREMENTS.md:50-59`].

**Example:** o shape de referência contém literalmente:

> “`item_id: int`, `quantidade: float`, `medida_caseira: str`, `peso_em_kg: float | None = None`, `justificativa: str | None = None`” [VERIFIED: `backend/schemas.py:171-177`]

```typescript
const payload = {
  tipo_refeicao,
  qtd_alunos,
  planejamento_id,
  itens: draftItens.map((item) => ({
    item_id: item.itemId,
    quantidade: item.quantidade,
    medida_caseira: item.medidaCaseira,
    justificativa: item.justificativa || null,
  })),
};
```

O esqueleto acima é uma tradução restrita dos campos permitidos na cozinha: `peso_em_kg` existe no schema para fluxos administrativos/backend, mas deve ser omitido pelo painel da cozinheira [VERIFIED: `backend/schemas.py:171-183`; `06-CONTEXT.md:25`].

### Pattern 3: Explicit async states with stale-response protection

**What:** manter `carregando`, `erro`, dados vazios, dados preenchidos e `salvando`; usar uma flag de cancelamento no `useEffect` para não aplicar uma resposta antiga após troca de data/slot ou desmontagem [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:94-128`; `frontend/src/pages/admin/Entregas.tsx:62-92`].

**When to use:** carregamento inicial, mudança de data, carregamento de receita e refetch pós-submit.

**Official guidance:** o React recomenda declarar todas as dependências reativas e retornar cleanup; seu exemplo de fetch usa uma flag `ignore` para impedir que uma resposta fora de ordem atualize o estado [CITED: https://react.dev/reference/react/useEffect].

### Pattern 4: Section-level management dashboard

**What:** compor quatro seções com dados brutos e derivados locais simples: estoque formatado, refeições do período, slots de planejamento e entregas; cada seção tem loading/erro/vazio/conteúdo ou compartilha uma falha claramente indicada [VERIFIED: `06-CONTEXT.md:26-30,36-40`; `frontend/src/pages/admin/Dashboard.tsx:44-167`].

**When to use:** sempre que a secretaria abrir `/gestao`; filtros de data devem usar o mesmo formato local do planejamento [VERIFIED: `backend/main.py:816-834,1008-1042`; `frontend/src/pages/admin/Planejamento.tsx:20-25`].

### Anti-Patterns to Avoid

- **Copiar a fonte legada:** não conservar `cardapiosPadrao`, `/refeicoes/lancar`, `/estoque`, `fetch` cru ou `id_usuario: 1` [VERIFIED: `frontend/src/pages/PainelCozinha.tsx:6-34,65-100`; `frontend/src/pages/DashboardGestao.tsx:11-29`].
- **Confundir slot com tipo:** “Lanche da Manhã” e “Lanche da Tarde” são quatro slots de planejamento, mas o tipo enviado à refeição é “Lanche” [VERIFIED: `backend/main.py:37-42,623-627,925-929`; `05-07-SUMMARY.md:47-55`].
- **Usar `/admin/dashboard` para secretaria:** a autorização rejeita o perfil `secretaria` [VERIFIED: `backend/main.py:1082-1086`; `backend/tests/test_dashboard.py:92-95`].
- **Usar saldo bruto para alerta:** itens livres precisam de `saldo_atual / fator_conversao` na unidade de exibição [VERIFIED: `05-07-SUMMARY.md:27-30,47-51`; `frontend/src/pages/admin/Itens.tsx:311-333`].
- **Omitir ingrediente removido:** o backend valida somente itens presentes no request; omitir uma linha não produz auditoria de remoção [VERIFIED: `backend/main.py:942-977`; `backend/schemas.py:171-183`].
- **Tratar mensagem como sucesso:** `fetchJson` lança `ApiError` para qualquer HTTP não-2xx; só fechar/resetar o fluxo depois de resposta 2xx e refetch [VERIFIED: `frontend/src/api.ts:35-42`; `frontend/src/pages/admin/Entregas.tsx:426-452`].
- **Usar alertas nativos como auditoria:** a decisão da fase exige justificativa visível e persistível por ingrediente [VERIFIED: `06-CONTEXT.md:23-25`].
- **Espalhar estilos inline ou cores legadas:** o design efetivo usa tokens e CSS co-localizado [VERIFIED: `frontend/src/index.css:8-38`; `05-07-SUMMARY.md:53-58`; `frontend/src/pages/DashboardGestao.tsx:32-67`].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL base e JWT | `fetch` com host literal e headers repetidos | `fetchJson` / `fetchWithAuth` | O cliente centraliza `VITE_API_URL`, `Authorization: Bearer` e `ApiError.detail` [VERIFIED: `frontend/src/api.ts:1-43`]. |
| Identidade do operador | Campo `id_usuario` no formulário | JWT + dependência `require_perfil` | O endpoint deriva o usuário autenticado de `usuario.id` [VERIFIED: `backend/main.py:914-920,983-1005`; `backend/schemas.py:179-183`]. |
| Conversão caseira e baixa | Fórmula local para descontar estoque | Backend `/refeicoes` | O backend resolve conversão, verifica saldo, grava conversões novas e deduz antes do commit [VERIFIED: `backend/main.py:871-911,942-1005`]. |
| Auditoria | Log local, toast ou alerta | `justificativa` em cada `RefeicaoItemRequest` | O backend persiste `quantidade_original`, `quantidade_ajustada`, medida e justificativa [VERIFIED: `backend/main.py:992-1001`; `backend/models.py:146-155`]. |
| Semana/dia | Nova biblioteca de datas | Helpers locais de `Planejamento.tsx` + `SLOTS_REFEICAO` | O código existente já converte JS `getDay()` para o índice backend e evita UTC [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:12-30`; `frontend/src/pages/admin/constants.ts:8-13`]. |
| Dashboard agregado da secretaria | Novo endpoint prematuro ou cópia do admin | Composição local das quatro listas permitidas | O contexto proíbe novos agregadores preventivos e autoriza os endpoints existentes [VERIFIED: `06-CONTEXT.md:26-30,114-119`]. |

**Key insight:** a complexidade perigosa aqui não é renderizar cards; é preservar os contratos de autorização, slot/tipo, unidade interna, atomicidade e auditoria. Reimplementar qualquer uma dessas regras no cliente cria divergência com a fonte de verdade [VERIFIED: `backend/main.py:623-627,914-1005`; `06-CONTEXT.md:19-34`].

## Runtime State Inventory

Esta fase é uma modernização/refatoração de duas páginas, portanto o inventário de estado de runtime foi verificado explicitamente.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Nenhum identificador persistido precisa ser renomeado; refeição, planejamento, itens e auditoria continuam nas tabelas existentes [VERIFIED: `backend/models.py:35-155`; `06-CONTEXT.md:7-12`]. | Código frontend deve mudar o payload; nenhuma migração de dados. |
| Live service config | Nenhum serviço externo ou configuração de UI externa faz parte do escopo frontend-only [VERIFIED: `06-CONTEXT.md:7-12,114-119`; `AGENTS.md:3-7`]. | Nenhuma ação. |
| OS-registered state | Nenhum registro de serviço/tarefa do SO é referenciado por estas páginas [VERIFIED: `06-CONTEXT.md:7-12`; `AGENTS.md:3-7`]. | Nenhuma ação. |
| Secrets/env vars | `VITE_API_URL` é o único valor de configuração frontend lido pelo cliente; o arquivo atual contém “`VITE_API_URL=http://127.0.0.1:8000`” [VERIFIED: `frontend/.env:1`; `frontend/src/api.ts:1-6`]. | Não hardcodar novamente o host; deployment deve fornecer o valor correto. Não alterar segredo nesta fase. |
| Build artifacts / installed packages | O build usa o lockfile existente; nenhuma dependência nova ou pacote global é requerido [VERIFIED: `frontend/package-lock.json:1-33`; `frontend/package.json:12-34`]. | Regerar build normalmente; não há migração de artefato ou reinstalação global. |

## Common Pitfalls

### Pitfall 1: Four slots, three meal types

**What goes wrong:** a UI usa “Lanche da Manhã” no `tipo_refeicao` do POST, ou colapsa os dois lanches em uma única opção antes da seleção [VERIFIED: `backend/main.py:40-42,623-627,925-929`; `backend/tests/test_planejamento.py:171-205`].

**Why it happens:** planejamento aceita quatro nomes de slot, enquanto cardápio/refeição aceitam somente `Lanche`, `Almoço`, `Janta` [VERIFIED: `05-07-SUMMARY.md:95-117,159-163`].

**How to avoid:** conservar o slot selecionado no draft e mapear ambos os slots de lanche para o tipo `Lanche` apenas na montagem do POST [VERIFIED: `06-CONTEXT.md:19-23`; `frontend/src/pages/admin/Planejamento.tsx:268-279`].

**Warning signs:** erro 400 “Tipo de refeição inválido” ou prato de lanche aparecendo no slot errado [VERIFIED: `backend/main.py:925-929`; `backend/tests/test_refeicoes.py:312-326`].

### Pitfall 2: Management alerts use internal saldo

**What goes wrong:** “Baixo estoque” é calculado sobre `saldo_atual` sem considerar `fator_conversao` [VERIFIED: `frontend/src/pages/DashboardGestao.tsx:49-56,91-99`].

**Why it happens:** o backend mantém o saldo em kg/L e só retorna o valor bruto em `/itens` [VERIFIED: `backend/main.py:161-177`; `05-07-SUMMARY.md:47-51`].

**How to avoid:** calcular uma vez `saldoExibicao = item.saldo_atual / (item.fator_conversao || 1)` e usar esse valor para texto e limiar 5 [VERIFIED: `frontend/src/pages/admin/Itens.tsx:311-333`; `backend/main.py:44-45`].

**Warning signs:** item cadastrado em Pacote/Dúzia/Maço mostra valor interno como se fosse a unidade de cozinha [VERIFIED: `05-07-SUMMARY.md:155-158`].

### Pitfall 3: Partial/stale UI after submit failure

**What goes wrong:** a página fecha o modal ou mantém o draft como confirmado antes de saber se o backend aceitou, ou uma resposta antiga sobrescreve uma seleção nova [VERIFIED: `frontend/src/pages/PainelCozinha.tsx:88-100`; `frontend/src/pages/admin/Planejamento.tsx:174-183`].

**Why it happens:** requisições são assíncronas e o backend pode rejeitar conversão, estoque ou justificativa [VERIFIED: `backend/main.py:942-977`; `frontend/src/api.ts:35-42`].

**How to avoid:** manter `salvando`, exibir `ApiError.message`, refazer as leituras relevantes no sucesso e também no catch de falha parcial; usar cleanup/flag de cancelamento em effects [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:94-128,174-183`] [CITED: https://react.dev/reference/react/useEffect].

**Warning signs:** saldo visual não corresponde ao backend, botão fica habilitado durante POST ou receita de um slot aparece em outro [VERIFIED: `06-CONTEXT.md:31-34,36-40`].

### Pitfall 4: Removal is not represented by omission

**What goes wrong:** remover a linha do draft e simplesmente não enviá-la deixa o backend sem um item para comparar ou auditar [VERIFIED: `backend/main.py:942-977`; `backend/models.py:146-155`].

**Why it happens:** a validação percorre apenas `dados.itens` enviados; ela exige justificativa quando um item enviado está fora da receita ou tem quantidade diferente [VERIFIED: `backend/main.py:945-975`].

**How to avoid:** usar quantidade zero, medida original e justificativa na linha removida, com confirmação visual antes do submit; validar no ambiente de testes se o produto aceita essa representação [VERIFIED: `backend/schemas.py:171-177`; `06-CONTEXT.md:23-25`].

**Warning signs:** histórico sem `RefeicaoItem` para o ingrediente removido ou ausência de justificativa em uma alteração que a usuária considera auditada [VERIFIED: `backend/models.py:146-155`; `REQUIREMENTS.md:54-57`].

### Pitfall 5: Durable status cannot distinguish the two snack slots

**What goes wrong:** usar `/refeicoes/hoje` para pintar individualmente “Lanche da Manhã” e “Lanche da Tarde” como confirmados [VERIFIED: `backend/main.py:1045-1069`; `backend/tests/test_refeicoes.py:106-131`].

**Why it happens:** o status agrupa por três tipos e procura a primeira refeição daquele tipo; não retorna `planejamento_id` nem slot [VERIFIED: `backend/main.py:1052-1068`; `frontend/src/types.ts:129-134`].

**How to avoid:** usar `planejamento_id` no POST e manter o feedback de confirmação no contexto do slot atual; tratar o status global de `Lanche` como informativo, não como confirmação dos dois slots [VERIFIED: `backend/schemas.py:179-183`; `06-CONTEXT.md:19-23`].

**Warning signs:** os dois slots mudam de estado juntos ou uma refeição de lanche anterior aparece como confirmação do slot errado [VERIFIED: `backend/main.py:1045-1068`].

## Code Examples

### Contrato de carregamento do dia

```typescript
const entradas = await fetchJson<PlanejamentoEntrada[]>(
  '/planejamento?data=' + formatISO(dataReferencia),
);
```

O padrão de `fetchJson` e do query parameter está implementado na página de planejamento; a implementação deve adaptar somente o filtro para o dia e manter a proteção contra respostas obsoletas [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:20-25,68-81,94-128`; `frontend/src/api.ts:22-42`].

### Contrato de receita

```typescript
const receita = await fetchJson<ReceitaItem[]>(
  `/cardapio/${entrada.cardapio_item_id}/receita`,
);
```

Esse endpoint retorna `item_id`, `item_nome`, `quantidade` e `medida_caseira`, além dos IDs de receita/cardápio [VERIFIED: `backend/main.py:452-477`; `frontend/src/types.ts:63-70`].

### Contrato de confirmação

```typescript
await fetchJson<{ id: number; mensagem: string }>('/refeicoes', {
  method: 'POST',
  body: JSON.stringify(payload),
});
```

O schema exige `tipo_refeicao`, `qtd_alunos`, uma lista não vazia de itens e aceita `planejamento_id`; o usuário autenticado não é campo do request [VERIFIED: `backend/schemas.py:171-183`; `backend/main.py:914-920`].

### Tratamento de 401 e detalhe acionável

```typescript
catch (err) {
  setErro(
    err instanceof ApiError && err.status === 401
      ? 'Sua sessão expirou. Entre novamente.'
      : err instanceof ApiError
        ? err.message
        : 'Não foi possível carregar os dados.',
  );
}
```

Esse padrão é o já usado nas páginas admin e preserva o `detail` enviado pelo FastAPI [VERIFIED: `frontend/src/pages/admin/Planejamento.tsx:83-90,115-123`; `frontend/src/api.ts:35-42`]. FastAPI documenta `HTTPException` como resposta com status e JSON `detail` para o cliente [CITED: https://fastapi.tiangolo.com/tutorial/handling-errors/].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cardápio local e endpoint legado `/refeicoes/lancar` | Planejamento/receita reais + `/refeicoes` autenticado | Fase 6, decisão D-06-01..D-06-04 | A UI deixa de inventar prato/ingrediente e passa a registrar autoria/planejamento reais [VERIFIED: `06-CONTEXT.md:19-25`; `backend/main.py:914-1005`]. |
| Estoque `/estoque` e host fixo | `/itens` via `fetchJson` com `VITE_API_URL` | Fases 4/5 → Fase 6 | Secretaria respeita JWT, shape atual e conversão de unidade [VERIFIED: `frontend/src/api.ts:1-42`; `backend/main.py:159-177`; `06-CONTEXT.md:26-30`]. |
| Um tipo de lanche por horário | Tipo `Lanche` único + quatro slots de planejamento | Fase 5.7 | O slot continua visível, mas o payload de refeição usa o vocabulário atual [VERIFIED: `05-07-SUMMARY.md:141-164,198-204`]. |
| Alertas/feedback nativos e inline styles | Estados explícitos, `role="alert"`, CSS co-localizado e tokens | Fases 5/6 | Loading, erro, vazio e sucesso ficam verificáveis e consistentes [VERIFIED: `06-CONTEXT.md:31-34`; `frontend/src/pages/admin/Dashboard.tsx:44-53`; `frontend/src/index.css:8-38`]. |

**Deprecated/outdated:** as rotas e shapes legados `/estoque` e `/refeicoes/lancar` permanecem no backend por compatibilidade, mas não devem receber novas chamadas das páginas modernizadas [VERIFIED: `backend/main.py:1174-1258`; `06-CONTEXT.md:19-23`].

## Common API Contract Matrix

| Endpoint | Authorized profiles | Request | Response relevant to Phase 6 | UI implication |
|----------|---------------------|---------|------------------------------|----------------|
| `GET /planejamento?data=YYYY-MM-DD` | `admin`, `secretaria`, `cozinheira` [VERIFIED: `backend/main.py:599-604`] | query `data` opcional; default backend é hoje [VERIFIED: `backend/main.py:599-607`] | lista com `id`, `dia_semana`, `tipo_refeicao`, `cardapio_item_id`, `nome_refeicao`, `data_inicio_vigencia` [VERIFIED: `backend/main.py:585-610`] | filtrar `dia_semana` local e criar quatro slots, incluindo ausentes. |
| `GET /cardapio/{cardapio_id}/receita` | `admin`, `secretaria`, `cozinheira` [VERIFIED: `backend/main.py:452-457`] | path `cardapio_id` | lista de itens da receita, incluindo `item_id`, nome, quantidade e medida [VERIFIED: `backend/main.py:466-477`] | carregar sob demanda ao selecionar prato. |
| `GET /conversoes?item_id=` | `admin`, `secretaria` e, após ajuste mínimo, `cozinheira` [VERIFIED hoje: `backend/main.py:301-305`] | query `item_id` | `id`, `item_id`, `medida_caseira`, `peso_em_kg` [VERIFIED: `backend/main.py:307-317`] | preencher o select de medidas; POST/DELETE permanecem admin-only. |
| `POST /refeicoes` | somente `cozinheira` [VERIFIED: `backend/main.py:914-920`; `backend/tests/test_refeicoes.py:163-181`] | `RefeicaoCreate`; itens não vazios e IDs [VERIFIED: `backend/schemas.py:171-183`] | `{id, mensagem}` [VERIFIED: `backend/main.py:1003-1005`] | não enviar usuário; fechar/resetar apenas após 2xx e refetch. |
| `GET /refeicoes/hoje` | `admin`, `cozinheira` [VERIFIED: `backend/main.py:1072-1077`] | nenhum | três status por tipo, não quatro slots [VERIFIED: `backend/main.py:1045-1069`] | usar somente como informação global; não mapear status de lanche para cada slot. |
| `GET /itens` | `admin`, `secretaria`, `cozinheira` [VERIFIED: `backend/main.py:161-165`] | nenhum | saldo interno e `unidade_interna`/`fator_conversao` [VERIFIED: `backend/main.py:167-177`] | secretaria converte para unidade de exibição antes de alertar. |
| `GET /refeicoes?data=YYYY-MM-DD` | `admin`, `secretaria` [VERIFIED: `backend/main.py:1008-1016`] | query `data` opcional | histórico com itens, ajustes, medidas e justificativas [VERIFIED: `backend/main.py:1017-1042`] | usar para a seção real de refeições da secretaria. |
| `GET /entregas?data=YYYY-MM-DD` / `GET /entregas/{id}` | `admin`, `secretaria` [VERIFIED: `backend/main.py:816-841`] | query/data ou path | resumo com data, usuário e quantidade de itens; detalhe com linhas e justificativas [VERIFIED: `backend/main.py:822-867`] | mostrar lista/contagem observável e link para a página admin. |

## Decomposição Recomendada para o Planner

1. **Base de contratos e helpers:** acrescentar somente os tipos de resposta/payload que faltam em `frontend/src/types.ts`, reutilizar `SLOTS_REFEICAO`, criar helpers de data local e de saldo exibido; não mudar backend [VERIFIED: `frontend/src/types.ts:41-152`; `frontend/src/pages/admin/constants.ts:6-15`].
2. **Cozinha — leitura:** substituir dados locais por planejamento autenticado do dia, renderizar quatro slots, tratar ausência como pendente e carregar receita/conversões por seleção [VERIFIED: `06-CONTEXT.md:19-25`; `backend/main.py:300-318,452-477,599-611`].
3. **Cozinha — draft auditável:** editar alunos/quantidades, escolher medidas em select pré-cadastrado, permitir inclusão/remoção representadas no payload, exigir justificativa visível e mapear slot de lanche para tipo `Lanche` [VERIFIED: `06-CONTEXT.md:21-25`; `backend/main.py:965-1001`].
4. **Cozinha — submit e recuperação:** POST por `fetchJson`, mensagens `ApiError`, bloqueio de submit, refetch após sucesso e catch/falha parcial, sem regra local de estoque/conversão [VERIFIED: `frontend/src/api.ts:35-42`; `frontend/src/pages/admin/Entregas.tsx:426-452`; `backend/main.py:942-1005`].
5. **Gestão — composição real:** carregar itens, refeições, planejamento e entregas autorizados; converter saldos; exibir estados vazios e links existentes, sem `/admin/dashboard` ou `/estoque` [VERIFIED: `06-CONTEXT.md:26-30`; `backend/main.py:161-177,816-834,1008-1042,1082-1086`].
6. **Conversões e autorização:** ajustar somente a leitura autorizada de `/conversoes` para `cozinheira`, adicionar teste 200 para leitura e 403 para mutação; no frontend, bloquear medida livre e confirmar apenas opções carregadas.
7. **CSS e gates:** re-tokenizar os CSS legados com `index.css`, remover inline styles/cores fora da paleta e validar build/lint/backend/manual F13-F15 [VERIFIED: `frontend/src/index.css:8-38`; `.planning/codebase/TESTING.md:25-39`].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O fuso horário local do navegador e o fuso do processo backend serão suficientemente alinhados para “hoje”; não há decisão de timezone de produção registrada [ASSUMED]. | Common API Contract Matrix / Pitfalls | Perto da meia-noite, planejamento e refeições podem aparecer em dias diferentes; confirmar durante a validação manual ou registrar um timezone operacional antes de produção. |

## Open Questions (RESOLVED)

1. **O produto precisa de status persistente por slot, especialmente para os dois lanches?**
   - O que sabemos: `POST /refeicoes` aceita `planejamento_id`, mas `/refeicoes/hoje` produz somente três status por tipo e não retorna slot/planejamento [VERIFIED: `backend/schemas.py:179-183`; `backend/main.py:1045-1077`].
   - O que está incerto: se a confirmação precisa sobreviver a reload e distinguir manhã/tarde.
    - RESOLVED: para o escopo atual, usar o slot selecionado e o feedback local da confirmação; não inferir status persistente individual dos dois lanches. Status durável por slot exigiria contrato backend novo ou consulta histórica autorizada para cozinheira e permanece fora desta fase [VERIFIED: `06-CONTEXT.md:12,114-119`; `06-UI-SPEC.md:100,108,122`].

2. **Como representar remoção na aceitação visual?**
   - O que sabemos: omissão não é auditada pelo backend; uma linha enviada com quantidade divergente exige justificativa e é persistida [VERIFIED: `backend/main.py:965-1001`; `backend/models.py:146-155`].
   - O que está incerto: se a operação deve exibir “removido/0” ou “não utilizado” antes do envio.
    - RESOLVED: usar linha de quantidade zero, justificativa obrigatória e badge explícito; validar com o fluxo manual F13 [VERIFIED: `REQUIREMENTS.md:54-59`; `.planning/codebase/TESTING.md:25-30`; `06-UI-SPEC.md:87,120`].

3. **A secretaria precisa de métricas além das listas atuais?**
   - O que sabemos: os endpoints fornecem listas/resumos, mas não um dashboard autorizado para secretaria [VERIFIED: `backend/main.py:816-867,1008-1042,1082-1136`].
   - O que está incerto: qualquer KPI de 7/30 dias específico para a secretaria.
    - RESOLVED: não inventar KPI; mostrar contagens/listas da resposta filtrada e links para os detalhes existentes [VERIFIED: `06-CONTEXT.md:26-30,36-40`; `06-UI-SPEC.md:103,127,129-131`].

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | build/lint frontend | ✓ | `v22.23.1` | — [VERIFIED: execução local em 2026-08-03]. |
| npm | scripts frontend | ✓ | `12.0.2` | — [VERIFIED: execução local em 2026-08-03]. |
| Python | backend/testes | ✓ | `3.12.3` | — [VERIFIED: execução local em 2026-08-03]. |
| `backend/venv` + pytest | suíte backend | ✓ | 100 testes passaram | usar `source venv/bin/activate` antes de pytest [VERIFIED: `AGENTS.md:10-13`; execução local `source venv/bin/activate && pytest tests/ -q`]. |
| Context7/MCP | documentação externa | ✗ nesta sessão | — | docs oficiais via WebFetch; fontes citadas abaixo [VERIFIED: `research-documentation-lookup.md:1-29`; execução de WebFetch]. |
| Graphify | contexto semântico | ✗, `.planning/graphs/graph.json` ausente | — | pesquisa direta nos arquivos canônicos [VERIFIED: execução local em 2026-08-03]. |

**Missing dependencies with no fallback:** nenhuma para a implementação frontend-only [VERIFIED: `06-CONTEXT.md:7-12`; execução de build/lint/backend].

**Missing dependencies with fallback:** Context7 foi substituído por documentação oficial citada; não instalar CLI ou pacote de pesquisa [VERIFIED: `research-documentation-lookup.md:7-29`].

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Backend: pytest + FastAPI TestClient/httpx; frontend: não foi encontrado framework de testes unitários no `frontend/` [VERIFIED: `.planning/codebase/TESTING.md:5-11`; busca local `frontend/src/**/*.{test,spec}.{ts,tsx}`]. |
| Config file | Backend fixtures existentes; nenhum config de teste frontend encontrado [VERIFIED: `.planning/codebase/TESTING.md:5-11`; busca local]. |
| Quick run command | `cd frontend && npm run build` e `cd frontend && npm run lint`; backend direcionado: `cd backend && source venv/bin/activate && pytest tests/test_planejamento.py tests/test_refeicoes.py -q` [VERIFIED: `AGENTS.md:10-19`; `.planning/codebase/TESTING.md:25-39`]. |
| Full suite command | `cd frontend && npm run build && npm run lint`; `cd backend && source venv/bin/activate && pytest tests/ -q` [VERIFIED: `.planning/codebase/TESTING.md:25-39`; execução local]. |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAL-07 | Planejamento real do dia, quatro slots, sem URL/default/user hardcoded | Manual integration + build/lint | `cd frontend && npm run build && npm run lint`; depois login como cozinheira e verificar network/UI | Não há teste frontend automatizado; Wave 0 não deve instalar Playwright [VERIFIED: `.planning/codebase/TESTING.md:25-45`; `06-CONTEXT.md:114-119`]. |
| MEAL-08 | Receita, ajuste auditado, confirmação, baixa e feedback de erro/sucesso | Backend regression + manual integration | `cd backend && source venv/bin/activate && pytest tests/test_refeicoes.py -q`; fluxo manual F13 | `backend/tests/test_refeicoes.py` existe; teste de UI não existe [VERIFIED: `backend/tests/test_refeicoes.py:31-373`; busca local frontend]. |
| MGMT-01 | Secretaria vê estoque convertido, refeições, planejamento e entregas reais com estados vazios/erro | Manual integration + build/lint | `cd frontend && npm run build && npm run lint`; login como secretaria e validar quatro seções e respostas da API | Não há teste frontend automatizado; usar F14/F15 [VERIFIED: `.planning/codebase/TESTING.md:25-30`]. |
| MGMT-02 | Links para planejamento e entregas mantêm autorização e navegam para rotas existentes | Manual route check + build | `cd frontend && npm run build`; clicar links como secretaria | Rotas existentes em `App.tsx`/`Layout.tsx`; teste frontend não existe [VERIFIED: `frontend/src/App.tsx:78-96`; `frontend/src/components/Layout.tsx:27-30`]. |

### Sampling Rate

- **Per task commit:** `cd frontend && npm run lint`; para contratos de refeição/planejamento, teste backend direcionado [VERIFIED: `AGENTS.md:15-19`; `.planning/codebase/TESTING.md:25-30`].
- **Per wave merge:** `cd frontend && npm run build && npm run lint`; `cd backend && source venv/bin/activate && pytest tests/ -q` [VERIFIED: `.planning/codebase/TESTING.md:32-39`].
- **Phase gate:** build, lint, suíte backend verde e validação manual F13-F15 antes de `/gsd-verify-work` [VERIFIED: `.planning/codebase/TESTING.md:25-39`].

### Wave 0 Gaps

- [ ] Nenhuma lacuna de framework precisa ser criada: testes frontend automatizados e Playwright estão fora do escopo [VERIFIED: `.planning/codebase/TESTING.md:41-45`; `PROJECT.md:38-45`].
- [ ] Criar/atualizar tipos de resposta somente se o executor confirmar que `types.ts` ainda não cobre o shape; não criar backend schema novo preventivamente [VERIFIED: `frontend/src/types.ts:41-152`; `06-CONTEXT.md:7-12,114-119`].
- [ ] Preparar dados de validação manual: item KG/L, item com unidade livre/fator, conversão caseira, prato com receita e quatro slots; essas combinações são necessárias para exercitar os contratos verificados [VERIFIED: `05-07-SUMMARY.md:155-163`; `backend/tests/test_refeicoes.py:184-292`; `backend/tests/test_planejamento.py:171-205`].

## Security Domain

`security_enforcement` está habilitado e o nível ASVS configurado é 1 [VERIFIED: `.planning/config.json:20-23`].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Não criar login paralelo; `fetchJson` anexa Bearer token e `ProtectedRoute` exige usuário/perfil [VERIFIED: `frontend/src/api.ts:18-32`; `frontend/src/components/ProtectedRoute.tsx:15-27`]. |
| V3 Session Management | yes | Preservar `AuthProvider`/`localStorage` existentes, tratar 401 como sessão expirada e permitir login novamente [VERIFIED: `frontend/src/auth.tsx:20-60`; `06-CONTEXT.md:31-34`]. |
| V4 Access Control | yes | UI deve respeitar rotas por perfil, mas a autorização real permanece em `require_perfil`; não esconder um endpoint proibido como “solução” [VERIFIED: `frontend/src/App.tsx:78-121`; `backend/main.py:599-604,914-920,1008-1016,1082-1086`]. |
| V5 Input Validation | yes | Validar presença/forma para UX e deixar tipo, IDs, justificativa, conversão, estoque e atomicidade para Pydantic/FastAPI [VERIFIED: `backend/schemas.py:171-183`; `backend/main.py:942-977`] [CITED: https://fastapi.tiangolo.com/tutorial/handling-errors/]. |
| V6 Cryptography | no new crypto | Não implementar JWT, hash ou criptografia na página; usar o token já gerenciado pelo `AuthProvider` [VERIFIED: `frontend/src/auth.tsx:20-52`; `frontend/src/api.ts:18-32`]. |

### Known Threat Patterns for React + FastAPI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Chamada sem Bearer/endpoint de perfil errado | Spoofing / Elevation | `fetchJson` + endpoint autorizado; manual check com secretaria e cozinheira [VERIFIED: `frontend/src/api.ts:22-32`; `backend/tests/test_refeicoes.py:153-181`; `backend/tests/test_dashboard.py:87-95`]. |
| Incluir `id_usuario` vindo de input | Tampering | Remover o campo do payload; backend deriva do JWT [VERIFIED: `backend/main.py:914-920,983-988`; `06-CONTEXT.md:21-24`]. |
| Erro 401 tratado como erro genérico | Spoofing / Availability | Mensagem de sessão expirada, preservar `ApiError.status` e oferecer nova entrada [VERIFIED: `frontend/src/api.ts:8-16`; `frontend/src/pages/admin/Planejamento.tsx:83-90`]. |
| Justificativa perdida por estado local | Repudiation | Campo persistente por ingrediente, exigido na UI e enviado no request [VERIFIED: `backend/models.py:146-155`; `backend/main.py:965-1001`; `06-CONTEXT.md:23-25`]. |
| Renderização de conteúdo da API como HTML | Tampering / XSS | Renderizar nomes/mensagens como texto React; não introduzir `dangerouslySetInnerHTML` [ASSUMED — prática de segurança de UI, não verificada em documentação nesta sessão]. |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` — comandos, arquitetura, convenções e gotchas obrigatórios [VERIFIED: leitura nesta sessão].
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` — autoridade de produto, requisitos, dependências e estado [VERIFIED: leitura nesta sessão].
- `.planning/phases/06-cozinha-gestao-frontend/06-CONTEXT.md` — decisões travadas, escopo e contratos esperados [VERIFIED: leitura nesta sessão].
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — decisão final sobre unidade livre/fator e `Lanche` [VERIFIED: leitura nesta sessão].
- `backend/main.py`, `backend/schemas.py`, `backend/models.py` — autorização, payloads, respostas, validação e persistência [VERIFIED: leitura nesta sessão].
- `frontend/src/api.ts`, `frontend/src/auth-context.ts`, `frontend/src/auth.tsx`, `frontend/src/types.ts` — cliente autenticado e shapes frontend [VERIFIED: leitura nesta sessão].
- `frontend/src/pages/PainelCozinha.tsx`, `DashboardGestao.tsx`, páginas admin, `App.tsx`, `Layout.tsx`, `ProtectedRoute.tsx`, `index.css` — padrões e débito legado [VERIFIED: leitura nesta sessão].
- `.planning/codebase/TESTING.md` e testes backend — gates, escopo manual e regressões existentes [VERIFIED: leitura nesta sessão].

### Secondary (MEDIUM confidence)

- React `useEffect` reference — dependências, cleanup e proteção contra respostas fora de ordem [CITED: https://react.dev/reference/react/useEffect].
- FastAPI Dependencies — injeção para conexões, autenticação e requisitos compartilhados [CITED: https://fastapi.tiangolo.com/tutorial/dependencies/].
- FastAPI Handling Errors — `HTTPException` e resposta JSON `detail` para clientes [CITED: https://fastapi.tiangolo.com/tutorial/handling-errors/].

### Tertiary (LOW confidence)

- Nenhuma recomendação crítica depende de fonte terciária; a única hipótese não resolvida está marcada como `[ASSUMED]` no log acima.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versões e scripts foram lidos do manifest/lockfile e o build/lint executaram [VERIFIED: `frontend/package.json:7-34`; `frontend/package-lock.json:1-33`; execução local].
- Architecture: HIGH — rotas, autorização, schemas, respostas e páginas-alvo foram abertas nesta sessão [VERIFIED: `backend/main.py:599-1136`; `frontend/src/App.tsx:78-121`].
- Pitfalls: HIGH — riscos principais foram derivados de branches reais do backend e dos testes [VERIFIED: `backend/main.py:942-1069`; `backend/tests/test_refeicoes.py:184-373`]. A1 sobre timezone é a única hipótese marcada LOW [ASSUMED].

**Research date:** 2026-08-03  
**Valid until:** 2026-09-02 para contratos estáveis; revalidar antes se o backend/schema mudar [ASSUMED — prazo operacional de pesquisa].
