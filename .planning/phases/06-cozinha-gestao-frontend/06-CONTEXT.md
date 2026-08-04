# Phase 6: Cozinha + Gestao (Frontend) - Context

**Gathered:** 2026-08-03
**Status:** Ready for research and planning
**Mode:** Context discussion completed from the canonical project context and the current API contracts.

<domain>
## Phase Boundary

Modernizar `PainelCozinha.tsx` e `DashboardGestao.tsx` sem criar uma nova camada de backend. A cozinheira deve consultar o planejamento vigente do dia, selecionar o prato, revisar alunos e ingredientes, justificar divergencias e registrar a refeicao pela API autenticada. A secretaria deve consultar estoque, refeicoes, planejamento e entregas reais e navegar para as paginas administrativas permitidas.

The phase is frontend-only unless research proves that an existing API contract is insufficient. A minimal read-only authorization adjustment for pre-registered item conversions is allowed; conversion creation and deletion remain admin-only. New mobile, E2E, CI/CD, migration and public-menu work remain outside this phase.

</domain>

<decisions>
## Implementation Decisions

### Cozinha: fonte de verdade e fluxo de lancamento
- **D-06-01:** Remover o uso funcional de `cardapiosPadrao`, `fetch` direto, `http://127.0.0.1:8000` e `id_usuario` hardcoded. O planejamento vigente e os pratos/receitas do backend sao a fonte de verdade.
- **D-06-02:** Carregar o dia por `GET /planejamento?data=YYYY-MM-DD` e exibir os quatro slots de servico (`Lanche da Manha`, `Almoco`, `Lanche da Tarde`, `Janta`). Os dois slots de lanche continuam mapeados para o tipo de refeicao `Lanche` no `POST /refeicoes`.
- **D-06-03:** Ao selecionar uma entrada, carregar a receita por `GET /cardapio/{cardapio_id}/receita` e as conversoes previamente cadastradas de cada item por `GET /conversoes?item_id={id}`; o payload de confirmacao deve usar IDs de itens e o contrato atual de `RefeicaoCreate`, incluindo `planejamento_id`, `tipo_refeicao`, `qtd_alunos`, `quantidade`, `medida_caseira` e justificativas quando houver divergencia.
- **D-06-04:** A baixa de estoque, a conversao de medidas, a validacao de estoque e a autoria pertencem ao backend. O frontend deve apresentar os erros do `ApiError` sem tentar duplicar essas regras ou enviar `id_usuario`. A cozinha nunca cadastra, altera ou exclui conversoes.
- **D-06-05:** Alterar quantidade, incluir ingrediente fora da receita ou remover ingrediente exige justificativa visivel por ingrediente, conforme `MEAL-04` e `MEAL-05`. Nao usar alertas silenciosos como substituto do registro auditavel.
- **D-06-12:** Cada ingrediente no editor da cozinha deve usar um `select` somente leitura com as unidades/medidas previamente cadastradas para aquele item. Nao oferecer input livre, `datalist`, cadastro inline de conversao ou envio ad hoc de `peso_em_kg`; se nao houver opcao cadastrada, bloquear a confirmacao e orientar a solicitar ao admin o cadastro em Itens/Conversoes.
- **D-06-13:** Ao abrir um slot, a cozinha deve informar primeiro uma quantidade inteira e positiva de alunos; somente depois a receita/ingredientes são exibidos. Cada quantidade inicial exibida e enviada deve ser `quantidade_base_da_receita × qtd_alunos`; o backend deve tratar esse valor escalado como quantidade esperada para auditoria e baixa. Alterações adicionais feitas pela cozinheira continuam exigindo justificativa.

### Gestao: dados reais e navegacao
- **D-06-06:** A secretaria deve consultar endpoints autorizados para secretaria: `GET /itens`, `GET /refeicoes`, `GET /planejamento`, `GET /entregas` e detalhes quando necessarios. Nao usar `/admin/dashboard`, pois esse endpoint permanece autorizado somente para `admin`.
- **D-06-07:** A tela deve mostrar estados de carregamento, erro, vazio e dados reais, sem depender da rota legada `/estoque`. Os links de Planejamento e Entregas devem reutilizar as rotas existentes `/admin/planejamento` e `/admin/entregas`.
- **D-06-08:** Os indicadores de estoque devem respeitar a semantica atual: o saldo interno e kg/L e unidades livres sao exibidas com `fator_conversao`; o limiar operacional e 5 unidades na unidade de exibicao quando essa informacao for apresentada.

### Integracao e qualidade
- **D-06-09:** Todas as chamadas novas ou migradas passam por `frontend/src/api.ts` (`fetchJson`/`fetchWithAuth`) e usam o JWT mantido pelo `AuthProvider`. Erro 401 deve produzir mensagem de sessao expirada e permitir nova entrada.
- **D-06-10:** Preservar CSS plain co-localizado, tokens de `frontend/src/index.css`, superficies claras para a logo e tipografia sans-serif operacional. Nao introduzir Tailwind nem uma identidade visual paralela.
- **D-06-11:** A fase deve fechar com `npm run build`, `npm run lint` e a suite backend completa verde. O baseline historico de 05-07 foi 94 testes; o baseline atual validado no worktree e 100 testes passando.

### the agent's Discretion
- Organizar a tela da cozinha como pagina, painel e modal desde que o fluxo de selecao → ajuste → confirmacao permaneça claro.
- Escolher se o dashboard da secretaria usa cards, tabela ou secoes compactas, desde que exponha estoque, refeicoes, planejamento e entregas sem inventar agregacoes que a API nao fornece.
- Definir os textos de loading, vazio e erro, mantendo o `detail` do backend quando ele for acionavel para o usuario.
- Decidir se a tela recarrega dados sob demanda ou ao montar, desde que nao apresente estado stale apos confirmar ou falhar parcialmente.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and product authority
- `.planning/PROJECT.md` — contexto global, arquitetura, identidade visual e decisoes de unidades/tipos.
- `.planning/REQUIREMENTS.md` — `MEAL-07`, `MEAL-08`, `MGMT-01`, `MGMT-02` e requisitos de qualidade.
- `.planning/ROADMAP.md` — objetivo, limites, criterios de sucesso e rastreabilidade da Fase 6.
- `.planning/STATE.md` — estado atual do milestone e riscos conhecidos.
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — decisao final sobre unidades livres e tipo `Lanche` unificado.

### API and runtime contracts
- `backend/main.py` — autorizacao e comportamento de `/planejamento`, `/cardapio`, `/refeicoes`, `/itens`, `/entregas` e `/admin/dashboard`.
- `backend/main.py` — leitura de `/conversoes` e separacao entre permissao de consulta e mutacao de conversoes.
- `backend/schemas.py` — payloads `PlanejamentoCreate`, `RefeicaoCreate` e `RefeicaoItemRequest`.
- `backend/models.py` — persistencia de planejamento, refeicoes, itens e auditoria.
- `backend/requirements.txt` — dependencias Python fixadas e referencia de reproducibilidade do backend.
- `frontend/src/types.ts` — contratos compartilhados que devem ser atualizados se algum shape mudar.
- `frontend/src/api.ts` — cliente HTTP autenticado e `ApiError`.
- `frontend/src/auth-context.ts` e `frontend/src/auth.tsx` — token, usuario e perfil autenticado.

### Existing frontend patterns and acceptance
- `frontend/src/App.tsx` — rotas protegidas existentes para `/cozinha` e `/gestao`.
- `frontend/src/components/Layout.tsx` e `frontend/src/components/ProtectedRoute.tsx` — shell, navegacao e guardas por perfil.
- `frontend/src/pages/PainelCozinha.tsx` e `frontend/src/pages/PainelCozinha.css` — superficie a migrar; somente a estrutura visual pode ser reutilizada, nao os dados hardcoded.
- `frontend/src/pages/DashboardGestao.tsx` e `frontend/src/pages/DashboardGestao.css` — superficie a migrar; somente padroes de estados podem ser reutilizados.
- `frontend/src/pages/admin/Planejamento.tsx` — padrao existente para vigencia, slots e consulta autenticada do planejamento.
- `frontend/src/pages/admin/Entregas.tsx` — padrao existente para dados reais, justificativas e feedback de API.
- `frontend/src/pages/admin/Itens.tsx` — superficie administrativa onde conversoes sao cadastradas e removidas.
- `.planning/codebase/TESTING.md` — gates automatizados e checklist manual; substitui o antigo `TESTING.md`.
- `AGENTS.md` — instrucoes operacionais, comandos por subdiretorio e convencoes de autenticacao/API.

### Design authority
- `frontend/src/index.css` — tokens efetivos de marca.
- `.planning/PROJECT.md` — substitui o antigo `DESIGN.md` como autoridade de design e registra a regra da logo em fundo branco.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchJson<T>` e `ApiError` centralizam JWT, JSON e mensagens de erro.
- `useAuth` fornece usuario e perfil; a identidade da cozinheira nao deve ser enviada no body.
- `Layout` e `ProtectedRoute` ja protegem `/cozinha`, `/gestao`, `/admin/planejamento` e `/admin/entregas`.
- `Planejamento.tsx` ja implementa a conversao local de semana e a distincao entre quatro slots e tres tipos.
- `types.ts` ja contem os shapes de planejamento, receitas, itens e dashboard usados pelas paginas admin.

### Established Patterns
- Paginas usam CSS co-localizado e classes sem framework de utilitarios.
- Chamadas autenticadas usam `fetchJson`; nao adicionar `fetch` direto em paginas migradas.
- Erros de API sao exibidos em `role="alert"`; loading, vazio e conteudo sao estados explicitos.
- O backend valida autorizacao, conversoes, estoque e atomicidade; o frontend oferece UX e justificativas, sem duplicar a regra.

### Integration Points
- `App.tsx` continua apontando `/cozinha` para `PainelCozinha` e `/gestao` para `DashboardGestao`; a migracao pode ser interna às paginas.
- `GET /planejamento` retorna apenas entradas vigentes/preenchidas; a UI deve representar slots ausentes como pendentes, nao como erro.
- `GET /cardapio/{id}/receita` retorna itens com `item_id`, `item_nome`, quantidade e medida caseira.
- `GET /conversoes?item_id=` deve fornecer as opcoes de medida para a cozinha; POST/DELETE continuam restritos ao admin.
- `POST /refeicoes` deriva `id_usuario` do JWT e registra `planejamento_id` e auditoria dos ingredientes.

</code_context>

<specifics>
## Specific Ideas

- A cozinheira deve ver claramente o prato planejado antes de confirmar e distinguir os dois horarios de lanche mesmo usando o tipo `Lanche`.
- A cozinheira deve escolher medidas em selects preenchidos por conversoes existentes; medida ausente e bloqueio orientado, nao convite para digitar uma nova unidade.
- A secretaria precisa de uma visao operacional, nao de uma copia do dashboard exclusivo do admin: estoque, refeicoes, planejamento e entregas devem ser links/dados reais.
- O contexto deve sempre ser lido junto com `05-07-SUMMARY.md`, `AGENTS.md`, `backend/requirements.txt`, `PROJECT.md`, `REQUIREMENTS.md` e `codebase/TESTING.md`.

</specifics>

<deferred>
## Deferred Ideas

- Cardapio publico responsivo e polido, checklist manual completo e verificacao ponta a ponta — Phase 7.
- Playwright/E2E, CI/CD, Alembic/PostgreSQL e validacao formal de XML NF-e — futuro milestone.
- Novos endpoints de agregacao para secretaria — somente se a pesquisa provar que os endpoints existentes nao cobrem `MGMT-01`; nao ampliar o escopo preventivamente.

</deferred>

---

*Phase: 06-cozinha-gestao-frontend*
*Context gathered: 2026-08-03*
