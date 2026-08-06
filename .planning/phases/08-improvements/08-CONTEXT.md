# Phase 8: Improvements - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning
**Boundary:** Melhorias operacionais posteriores às Fases 6 e 7: limiar de baixo estoque por item, revisão do fluxo de Entregas (origem, fornecedor, auditoria), cadastro inline de itens XML, alunos fixos por período, projeção cumulativa de estoque no planejamento e sugestão de correspondência de nomes.

<domain>
## Phase Boundary

A Fase 8 revisa fluxos operacionais já entregues e adiciona capacidades novas, sem quebrar os contratos validados nas Fases 5-7:

1. **Limiar individual de baixo estoque** — cada item passa a ter limiar configurável; alertas calculados na unidade de exibição.
2. **Entregas com origem e fornecedor** — toda entrega tem origem (`xml`/`manual`), data obrigatória, fornecedor associado e regras de auditoria diferenciadas por origem; manual exige observações, XML exige número da nota e mantém justificativa por item.
3. **Cadastro inline de item** — linha XML sem correspondência pode criar item novo dentro do fluxo de Entregas, preservando o rascunho.
4. **Alunos fixos por período** — a cozinheira deixa de digitar alunos; admin configura 3 grupos (manhã, tarde, noite) e o total de cada slot é derivado; receita escala por esse total.
5. **Projeção cumulativa de estoque no planejamento** — planejar não bloqueia; o sistema calcula e avisa os itens que faltarão, com simulação cumulativa da semana.
6. **Sugestão de correspondência** — nomes de fornecedores/linhas XML são normalizados e produzem sugestões assistivas confirmáveis, sem associação automática.

**Não-regressão:** tipos de refeição (Lanche/Almoço/Janta), quatro slots de planejamento, auditoria e conversão interna kg/L permanecem. O lançamento de refeição continua bloqueando quando o estoque é insuficiente (STOCK-08, MEAL-06). O upload XML permanece parse no navegador com revisão humana.

</domain>

<decisions>
## Implementation Decisions

### 1. Limiar individual de baixo estoque (IMP-01, IMP-02)

- **D-01:** `Item` ganha coluna `limiar` (Float, NOT NULL, default 5.0). A migração grava 5.0 em todos os itens existentes — **não** se usa `null` como fallback (decisão: sem valor nulo no banco).
- **D-02:** O limiar é interpretado na **unidade de exibição** do item (saldo convertido por `fator_conversao`), exatamente como a regra atual em `main.py:1068-1078`. O backend é a autoridade do valor persistido e da regra de alerta.
- **D-03:** Cadastro/edição de item rejeita limiar ausente, zero ou negativo (400). `ItemCreate`/`ItemUpdate`/`ItemResponse` ganham `limiar`.
- **D-04:** Toda superfície que calcula baixo estoque consome o `limiar` da API: página de Itens (badge), `/admin/dashboard` (`baixo_estoque`, `itens_criticos`), painel da secretaria (`DashboardGestao.tsx:241` — o texto "limiar de 5" deixa de ser fixo). A constante `LIMIAR_BAIXO_ESTOQUE` de `frontend/src/pages/admin/constants.ts` é removida.

### 2. Entregas: origem, data, fornecedor e auditoria (revisão DELIV-05/06)

- **D-05:** `Entrega` ganha `origem` (`"xml"` | `"manual"`), `data_entrega` (Date, obrigatória no payload), `fornecedor_id` (FK obrigatória no payload), `nota_numero` (String, opcional) e `observacoes` (Text, opcional no banco).
- **D-06:** Nova tabela `fornecedores` com `id`, `nome` (obrigatório, índice) e `cnpj` (opcional). CNPJ é pré-preenchido do emitente da NF quando presente.
- **D-07:** Regras por origem no `POST /entregas`:
  - `manual`: `observacoes` obrigatório; **não** há justificativa por item — linhas são sempre `acao = "recebido"` (o form manual não oferece alterado/excluído); `nota_numero` opcional.
  - `xml`: `nota_numero` obrigatório; ações `alterado`/`excluído` continuam exigindo justificativa individual (regra atual em `main.py:766-770`); `observacoes` opcional.
- **D-08:** Form de Entregas tem campo de fornecedor com **sugestão** (autocomplete): admin e secretaria podem escolher fornecedor existente ou cadastrar novo inline no próprio form. O mesmo padrão de normalização do matching (D-17) alimenta as sugestões de fornecedores.
- **D-09:** Upload XML pré-preenche `data_entrega` (data de emissão da NF), `fornecedor` (emitente da NF, confirmável), `nota_numero` (número da nota) e `origem=xml`. Form manual pré-preenche `data_entrega` com hoje (editável).
- **D-10:** Legado: entregas existentes migram com `origem=manual`, `data_entrega` = data de `data_hora`, `fornecedor_id` nulo (coluna nullable no banco para preservar linhas antigas; sem seed de fornecedor artificial).

### 3. Cadastro inline de item XML (IMP-03)

- **D-11:** O select de linha XML sem correspondência ganha a opção `Cadastrar novo item`, abrindo um modal dentro de Entregas com os mesmos campos e validações do form de Itens (inclui unidade livre, unidade interna KG/L e fator de conversão quando aplicável).
- **D-12:** O modal preserva o rascunho (XML parseado e demais linhas) e, ao salvar, vincula o novo `item_id` à linha que originou a ação. Não confirma a linha automaticamente: o usuário continua revisando quantidade, unidade e ação antes do submit (não-regressão do fluxo F12).
- **D-13:** **Autorização (decisão de negócio):** secretaria pode criar item pelo fluxo inline de Entregas, no mesmo escopo do cadastro inline de fornecedor (D-08). Isso amplia o `POST /itens` (hoje admin-only) — a pesquisa deve confirmar o escopo mínimo (endpoint dedicado ou permissão ampliada testada). A criação fora do fluxo de Entregas permanece admin-only.

### 4. Alunos fixos por período (revisão MEAL-02/07/08)

- **D-14:** Nova tabela de configuração `alunos_por_periodo` com 3 registros: `manha`, `tarde`, `noite` (quantidade inteira > 0, com `updated_at`/`updated_by`). Admin configura; cozinheira não edita.
- **D-15:** Total de cada slot (regra de negócio): Lanche da Manhã = `manha`; Almoço = `manha + tarde`; Lanche da Tarde = `tarde`; Janta = `noite`. A configuração é por **período/grupo**; o total por slot é derivado.
- **D-16:** `PainelCozinha` remove o campo "Quantos alunos foram atendidos?". O lançamento (com ou sem `planejamento_id`) obtém `qtd_alunos` da configuração do período correspondente ao slot; `refeicao.qtd_alunos` grava o valor configurado no momento (auditoria fiel ao que foi servido). Ajustes de ingredientes continuam exigindo justificativa.
- **D-16b:** Lançamento avulso (sem planejamento): a cozinheira seleciona um dos **4 slots** (não o tipo), e o backend deriva tipo e total de alunos do slot. Isso elimina a ambiguidade entre os dois lanches.

### 5. Projeção cumulativa de estoque no planejamento

- **D-17:** O backend é a autoridade do cálculo. `GET /planejamento?data=` passa a incluir a projeção cumulativa da semana da vigência: simulação dia a dia (segunda→domingo, slots em ordem), saldo corrente por item, consumo de cada slot = ∑(ingrediente da receita × alunos do slot) convertido para kg/L via `/conversoes`. Item sem conversão cadastrada aparece como "não avaliável" (não bloqueia, não quebra).
- **D-18:** `POST /planejamento` **não bloqueia** e retorna os avisos da refeição salva (itens que faltarão, considerando o consumo acumulado até aquele dia). O lançamento de refeição continua bloqueando sem estoque (sem mudança em `main.py:939-943`).
- **D-19:** UI de exibição (aprovada com liberdade criativa) na página Planejamento:
  - **Badge de alerta na célula** da grade com déficit projetado — tooltip lista itens e o quanto falta ("Arroz −12,5 kg").
  - **Painel colapsável "Projeção da semana"** abaixo da grade: tabela `item | saldo atual | consumo projetado da semana | saldo projetado final | primeiro dia de ruptura`; linhas com ruptura em vermelho, sobra em verde; resumo "X itens com ruptura prevista"; itens sem conversão como "não avaliável".
  - **Banner não-bloqueante ao salvar** listando as refeições afetadas e itens faltantes, com ação "Ver projeção" que rola até o painel.
  - Config de alunos vazia → painel exibe "Configure os alunos por período para ativar a projeção".
- **D-20:** A secretaria (Planejamento é acessível a admin e secretaria) vê os mesmos alertas. Cozinheira não vê projeção.

### 6. Sugestão de correspondência (IMP-04, IMP-05)

- **D-21:** Normalização determinística local, sem IA externa e sem dependência nova: caixa, acentos, pontuação, espaços repetidos e tokens. Complemento com dicionário curto de abreviações (ex.: "MUSC" → "Músculo") e score simples explicável (ex.: "3 de 4 palavras batem").
- **D-22:** Sugestões assistivas e confirmáveis: candidatos, confiança e motivo legível; nunca selecionar, vincular ou fundir silenciosamente (ex.: `Músculo Bovino` × `MUSC BOV` são candidatos, não equivalência automática).
- **D-23:** O mesmo mecanismo atende: (a) correspondência de linhas XML com itens; (b) sugestão de fornecedores no form de Entregas (D-08). O histórico preserva a descrição original do XML por linha.
- **D-24:** Persistência de aliases (nome normalizado ↔ item) fica adiada (ver Deferred).

### OpenCode's Discretion

- Detalhes visuais finos de badge/painel/banner (cores já guiadas pelos tokens: `--erro`, `--verde-vivo`).
- Estratégia exata de migração SQLite (script de startup com ALTER TABLE + defaults) — mantendo o padrão `create_all` e sem introduzir Alembic nesta fase.
- Implementação do score de similaridade e do dicionário de abreviações.
- Mecânica exata do autocomplete de fornecedor (input com lista filtrada) e do modal inline de item.

</decisions>

<specifics>
## Specific Ideas

- "Use sua criatividade" para a exibição da projeção — proposta em D-19 foi apresentada e aceita.
- A escola presume que todos os alunos comparecem: a receita deve ser calculada pelo total fixo, não pelo presencial.
- O usuário permanece na aba Entregas quando precisa cadastrar fornecedor ou item novo (sem perder o rascunho).
- A sugestão previne duplicidade sem transformar aproximação textual em decisão automática de estoque.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e roadmap
- `.planning/REQUIREMENTS.md` — IMP-01 a IMP-05 revisados e novos requisitos IMP-06 a IMP-11 (entregas com origem, fornecedores, alunos por período, projeção); DELIV-05/06 e MEAL-02 com contratos revisados.
- `.planning/ROADMAP.md` — posição da Fase 8 e sucesso esperado.
- `.planning/STATE.md` — fase atual e histórico de sessão.

### Fases anteriores (contratos vigentes e UAT)
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — unidades livres, fator de conversão e tipo `Lanche` unificado.
- `.planning/phases/05-p-ginas-admin-frontend/05-UAT.md` — fluxo XML manual validado (F12).
- `.planning/phases/05-p-ginas-admin-frontend/05-VERIFICATION.md` — evidências de integração da tela de Entregas.
- `.planning/phases/06-cozinha-gestao-frontend/06-CONTEXT.md` — decisões do painel da cozinheira (D-06-08: limiar e unidade de exibição).
- `.planning/phases/06-cozinha-gestao-frontend/06-UAT.md` — fluxo F13-F15 validado (será parcialmente revisado: cozinheira deixa de digitar alunos).
- `.planning/phases/07-finalizacao/07-02-SUMMARY.md` — UAT F1-F17 e prova QUAL-06.

### Código (contratos e regras atuais)
- `backend/models.py` — `Item`, `Entrega`, `ItemEntrega`, `Refeicao`, `Planejamento` (mudanças de schema).
- `backend/schemas.py` — `EntregaCreate`, `ItemCreate/Update/Response`, `RefeicaoCreate` (novos campos e validações por origem).
- `backend/main.py` — `POST /entregas` (L745, regra de justificativa L766-770), `POST /refeicoes` (L897, escala por aluno L947), `POST /planejamento` (L614, sem checagem de estoque), `/admin/dashboard` (L1059, críticos L1068-1078), `GET /planejamento` (L599).
- `backend/tests/test_entregas.py` — E8 (ação sem justificativa) será condicionada à origem xml.
- `backend/tests/test_refeicoes.py` — R9/R10 (escala por aluno e justificativa) serão revisados com alunos configurados.
- `frontend/src/pages/admin/Entregas.tsx` — fluxo manual + XML, modal de justificativa (L853-879), guarda de justificativas (L400-408).
- `frontend/src/pages/admin/nfe.ts` — `parseNfe` (linhas sem correspondência → `item_id` null).
- `frontend/src/pages/admin/Itens.tsx` — form de itens (unidade livre, KG/L, fator) reutilizável no modal inline; badge de limiar (L315, L329).
- `frontend/src/pages/admin/constants.ts` — `LIMIAR_BAIXO_ESTOQUE = 5.0` (a remover).
- `frontend/src/pages/PainelCozinha.tsx` — campo `qtd-alunos` (L577-594) a remover; escala de receita (L155-183).
- `frontend/src/pages/admin/Planejamento.tsx` — grade semanal (onde entram badge, painel e banner de projeção).
- `frontend/src/pages/DashboardGestao.tsx` — texto do limiar fixo (L241) a consumir da API.
- `frontend/src/types.ts`, `frontend/src/api.ts` — contratos compartilhados e cliente autenticado.

### Mapas técnicos
- `.planning/codebase/ARCHITECTURE.md` — fronteiras frontend/backend e rotas.
- `.planning/codebase/TESTING.md` — gates e regressões existentes (F12/F13-F15).
- `.planning/codebase/CONVENTIONS.md` — padrões de código e execução.
- `.planning/codebase/STACK.md` — stack e decisão de adiar Alembic (migração SQLite manual nesta fase).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseNfe` (nfe.ts) — já normaliza a estrutura XML e marca itens sem correspondência para seleção manual.
- `Entregas.tsx` — linhas editáveis compartilhadas entre fluxo manual e XML; mesmo submit para ambos.
- `Itens.tsx` — formulário completo de item (unidade livre, unidade interna KG/L, fator de conversão) reaproveitável no modal inline.
- `_resolver_fator_entrega` / `_upsert_conversao` (main.py) — resolução de fator e conversões pendentes para entregas.
- `_converter_para_unidade_oficial` (main.py) — conversão medida caseira → unidade interna (reutilizável na projeção).
- `fetchJson`/`ApiError` (api.ts) — caminho único de API.
- `SLOTS_REFEICAO`/`SLOTS_PLANEJAMENTO` (constants.ts / main.py) — ordem canônica dos quatro slots (reutilizada na simulação da projeção).

### Established Patterns
- Backend valida atomicidade, autorização, fator de conversão e justificativas antes de persistir.
- Frontend usa CSS plain co-localizado, tokens globais e revisão humana antes de persistir.
- `unidade_oficial` pode ser livre, mas o estoque interno permanece em kg/L.
- Auditoria: justificativas obrigatórias não podem ser removidas para simplificar a UI (PROJECT.md Constraints) — a exceção da origem manual é decisão explícita desta fase (D-07).

### Integration Points
- Limiar: `Item`/schemas, endpoints de itens, dashboard, Itens.tsx, DashboardGestao.tsx, testes de dashboard.
- Entregas: `Entrega`/`ItemEntrega`, `POST /entregas`, `Entregas.tsx`, form de fornecedor, `nfe.ts`, tipos compartilhados, testes E*.
- Alunos por período: nova tabela + endpoint de configuração, `POST /refeicoes`, `PainelCozinha.tsx`, tipos, testes R*.
- Projeção: `GET/POST /planejamento`, `Planejamento.tsx`, conversões, configuração de alunos, tipos.
- Matching: normalização client-side em Entregas (itens e fornecedores), `nfe.ts`, tipos compartilhados.

</code_context>

<deferred>
## Deferred Ideas

- **Fusão automática ou exclusão de itens duplicados** — requer política de dados e auditoria próprias.
- **Persistência de aliases** (nome normalizado ↔ item/fornecedor) — adiada; a sugestão funciona sem banco de aliases.
- **Histórico de alterações da configuração de alunos** — a auditoria relevante é o `qtd_alunos` gravado em cada refeição; histórico de edits da config fica para depois.
- **Integração com catálogo externo, IA ou serviço de matching remoto** — fora do escopo até pesquisa demonstrar necessidade.
- **Validação fiscal formal de XML contra schema SEFAZ** — continua fora do escopo atual.
- **Projeção além da vigência** (multi-semana / horizonte mensal) — fora do escopo desta fase.

</deferred>

---

*Phase: 08-improvements*
*Context gathered: 2026-08-05*
