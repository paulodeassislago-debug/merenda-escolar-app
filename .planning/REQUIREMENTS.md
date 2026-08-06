# Requirements: Sistema de Gestao da Cozinha Escolar (PNAE)

**Defined:** 2026-08-03
**Core Value:** Controle automatico do estoque com baixa por consumo real, rastreabilidade e conformidade PNAE/SEC-BA.

## v1 Requirements

### Authentication and Authorization

- [x] **AUTH-01**: Usuario pode autenticar com nome e senha e recebe token JWT.
- [x] **AUTH-02**: API rejeita credencial invalida com erro 401.
- [x] **AUTH-03**: API valida token em `/auth/me` e rejeita token ausente, invalido ou expirado.
- [x] **AUTH-04**: Rotas protegidas autorizam somente os perfis previstos para cada recurso.
- [x] **AUTH-05**: Frontend redireciona admin, secretaria e cozinheira para suas areas corretas.
- [x] **AUTH-06**: Frontend impede acesso a rotas protegidas sem autenticacao ou com perfil incompatível.

### Inventory and Conversions

- [x] **STOCK-01**: Admin pode criar, listar, editar e excluir itens do estoque.
- [x] **STOCK-02**: Itens exibem saldo e alerta quando ficam abaixo do limiar de 5 unidades na unidade de exibicao.
- [x] **STOCK-03**: Admin pode criar, listar e excluir conversoes de medidas caseiras por item.
- [x] **STOCK-04**: Item pode usar unidade de cozinha livre com unidade interna `KG` ou `L` e fator de conversao positivo.
- [x] **STOCK-05**: Estoque interno permanece em kg/L; frontend converte o saldo para a unidade de exibicao.
- [x] **STOCK-06**: Entrega recebida aplica o fator de conversao antes de incrementar o saldo interno.
- [x] **STOCK-07**: Medida caseira sem conversao cadastrada falha com mensagem clara e nao deduz saldo parcialmente.
- [x] **STOCK-08**: Estoque insuficiente nao permite saldo negativo.

### Menu, Recipes and Planning

- [x] **MENU-01**: Admin pode criar, listar, editar e excluir pratos do cardapio.
- [x] **MENU-02**: Cada prato possui receita com ingredientes, quantidade e medida caseira.
- [x] **MENU-03**: Admin pode adicionar, editar e remover ingredientes da receita.
- [x] **MENU-04**: Cardapio e refeicoes usam os tipos `Lanche`, `Almoco` e `Janta`.
- [x] **MENU-05**: Planejamento preserva os quatro slots `Lanche da Manha`, `Almoco`, `Lanche da Tarde` e `Janta`.
- [x] **MENU-06**: Pratos do tipo `Lanche` podem ser escolhidos nos dois slots de lanche.
- [x] **MENU-07**: Admin e secretaria podem preencher a grade semanal e salvar por vigencia.
- [x] **MENU-08**: Recarregar a grade recupera os slots vigentes; limpar slot remove sua entrada vigente.
- [x] **MENU-09**: API rejeita dia, tipo ou prato inexistente/invalido.

### Deliveries and Audit

- [x] **DELIV-01**: Admin e secretaria podem listar entregas e consultar seus detalhes.
- [x] **DELIV-02**: Usuario pode criar entrega manual com um ou mais itens.
- [x] **DELIV-03**: Frontend pode importar XML NF-e, preencher linhas e permitir revisao humana antes do envio.
- [x] **DELIV-04**: Item recebido incrementa o estoque; item excluido nao altera o saldo.
- [ ] **DELIV-05**: Alteracao ou exclusao de item exige justificativa individual apenas em entregas de origem XML (NF-e); entregas manuais nao exigem justificativa por item. **Phase 8 (revisado)**
- [ ] **DELIV-06**: Cada item da entrega registra acao, quantidade, justificativa (quando pertinente) e fator aplicado; entregas manuais registram descricao no nivel da entrega. **Phase 8 (revisado)**
- [x] **DELIV-07**: Entrega vazia, item inexistente ou acao invalida falham antes de persistir alteracoes parciais.

### Meals and Kitchen

- [x] **MEAL-01**: Cozinheira pode consultar refeicoes e planejamento do dia conforme seu perfil.
- [ ] **MEAL-02**: Lancamento registra tipo, quantidade de alunos (derivada da configuracao de periodos definida pelo admin), usuario e planejamento relacionado; a cozinheira nao informa mais a quantidade. **Phase 8 (revisado)**
- [x] **MEAL-03**: Lancamento converte medidas caseiras e deduz o estoque correspondente.
- [x] **MEAL-04**: Ajuste de quantidade, adicao ou remocao de ingrediente exige justificativa individual.
- [x] **MEAL-05**: `refeicao_itens` preserva quantidade original, quantidade ajustada, medida e justificativa.
- [x] **MEAL-06**: Divergencia de receita e erro de estoque nao deixam registros parciais.
- [ ] **MEAL-07**: Painel da cozinheira deve consumir planejamento e API reais sem `cardapiosPadrao`, URL fixa ou `id_usuario` hardcoded. **Phase 6**
- [ ] **MEAL-08**: Cozinheira deve concluir o fluxo completo de selecionar, ajustar, confirmar e verificar a baixa. **Phase 6**

### Management and Public Menu

- [x] **DASH-01**: Admin pode consultar dashboard com estoque, refeicoes, entregas e alunos.
- [x] **DASH-02**: Dashboard exibe estados vazios e valores zero sem quebrar.
- [ ] **MGMT-01**: Painel da secretaria deve consumir dados reais de estoque, refeicoes, planejamento e entregas. **Phase 6**
- [ ] **MGMT-02**: Painel da secretaria deve oferecer navegacao para planejamento e entregas. **Phase 6**
- [x] **PUBLIC-01**: Visitante pode consultar o cardapio planejado do dia sem autenticacao.
- [x] **PUBLIC-02**: Cardapio publico deve ser polido e responsivo em desktop, tablet e mobile. **Phase 7**

### Quality and Operations

- [x] **QUAL-01**: Suite backend automatizada passa integralmente; baseline atual: 100 testes.
- [x] **QUAL-02**: Frontend compila com `npm run build` sem erros TypeScript ou bundle.
- [x] **QUAL-03**: Frontend passa `npm run lint` sem warnings ou erros.
- [x] **QUAL-04**: Comandos backend sao executados a partir de `backend/` para respeitar a URL SQLite relativa.
- [x] **QUAL-05**: Checklist manual F1-F17 deve ser concluido sem falhas. **Phase 7**
- [x] **QUAL-06**: Fluxo ponta a ponta conversao → baixa → refeicao → auditoria deve ser verificado. **Phase 7**

## Phase 8 Improvements

These improvements are intentionally scheduled after Phase 7. They must not change the contracts or acceptance scope of Phases 6 and 7 before those phases are completed.

### Inventory Thresholds

- [ ] **IMP-01**: Admin pode cadastrar e editar um limiar de baixo estoque individual por item, com valor padrão de 5 para preservar o comportamento atual.
- [ ] **IMP-02**: Listagens, dashboard e alertas usam o limiar configurado para cada item na unidade de exibição correta; valores inválidos são rejeitados e não alteram o saldo.

### Delivery Item Onboarding

- [ ] **IMP-03**: Durante a revisão de um item XML não reconhecido, o usuário pode escolher `Cadastrar novo item` no próprio fluxo de Entregas, preencher os dados obrigatórios e vincular o item criado à linha sem sair da página ou perder o rascunho.

### Intelligent Item Matching

- [ ] **IMP-04**: O formulário de Entregas normaliza nomes de fornecedores e sugere correspondências com itens existentes para reduzir duplicidades, sempre exigindo confirmação humana antes de vincular ou criar um item.
- [ ] **IMP-05**: Sugestões ambíguas exibem as melhores opções e o motivo/confiança da sugestão; nenhuma correspondência ou fusão é aplicada silenciosamente.

### Delivery Origin, Supplier and Audit (Phase 8 — user flow revision)

- [ ] **IMP-06**: Toda entrega possui origem (`xml` ou `manual`), data de entrega obrigatória e fornecedor associado; entregas XML salvam o número da nota (obrigatório), entregas manuais o tornam opcional.
- [ ] **IMP-07**: Fornecedores são registrados em tabela própria (nome obrigatório, CNPJ opcional); o form de Entregas permite escolher um existente (campo com sugestão) ou cadastrar um novo inline, para admin e secretaria.
- [ ] **IMP-08**: Entrega manual exige observações no nível da entrega; entrega XML não exige. Justificativa por item é obrigatória apenas para ações `alterado`/`excluído` de entregas XML.

### Fixed Students per Period and Stock Projection (Phase 8 — user flow revision)

- [ ] **IMP-09**: Admin configura a quantidade de alunos por período (`manha`, `tarde`, `noite`); o total de cada slot é derivado (Lanche da Manhã = manhã; Almoço = manhã + tarde; Lanche da Tarde = tarde; Janta = noite) e a receita escala por esse total no lançamento da refeição.
- [ ] **IMP-10**: O lançamento de refeição registra `qtd_alunos` derivado da configuração vigente, sem digitação pela cozinheira; a refeição registrada continua deduzindo o estoque e bloqueando quando insuficiente.
- [ ] **IMP-11**: O planejamento não bloqueia por falta de estoque, mas calcula e exibe a projeção cumulativa da semana (consumo estimado por item vs. saldo), avisando ao admin os itens que faltarão em cada refeição planejada.

## v2 Requirements

### Production Readiness

- [x] **PROD-01**: Migrar o banco de desenvolvimento SQLite para PostgreSQL com Alembic. **2026-08-05** — Alembic + driver psycopg adicionados; migração inicial `b95009c1442e` validada em PostgreSQL 16; startup executa `alembic upgrade head` quando `DATABASE_URL` não é sqlite; bootstrap do primeiro admin via `scripts/bootstrap_admin.py` (schema vazio). Deploy Coolify pendente de configuração.
- **PROD-02**: Criar pipeline CI/CD para backend, frontend, testes e deploy.
- **PROD-03**: Adicionar testes E2E automatizados com Playwright.
- **PROD-04**: Validar XML NF-e formalmente contra schema fiscal quando houver requisito operacional para isso.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Aplicativo mobile nativo | O milestone atual e web-first. |
| Tema escuro | Contraria a identidade visual institucional definida nos tokens frontend. |
| Tailwind como linguagem de UI | O projeto usa CSS plain co-localizado. |
| Validacao fiscal formal de NF-e | O fluxo atual e best-effort com revisao humana. |

## Traceability

| Requirement Group | Phase | Status |
|-------------------|-------|--------|
| AUTH-01..AUTH-06 | Phase 4 | Complete |
| STOCK-01..STOCK-08 | Phases 2, 3 and 5 | Complete |
| MENU-01..MENU-09 | Phases 2, 3 and 5 | Complete |
| DELIV-01..DELIV-07 | Phases 3 and 5 | Complete |
| MEAL-01..MEAL-06 | Phase 3 | Complete |
| MEAL-07..MEAL-08 | Phase 6 | Pending |
| DASH-01..DASH-02 | Phase 3 and 5 | Complete |
| MGMT-01..MGMT-02 | Phase 6 | Pending |
| PUBLIC-01 | Phase 3 and 4 | Complete |
| PUBLIC-02 | Phase 7 | Complete |
| QUAL-01..QUAL-04 | Phases 1-5 | Complete |
| QUAL-05..QUAL-06 | Phase 7 | Pending |
| IMP-01..IMP-05 | Phase 8 | Pending |
| IMP-06..IMP-11 | Phase 8 | Pending |
| DELIV-05, DELIV-06 | Phase 8 (revisado) | Pending |
| MEAL-02 | Phase 8 (revisado) | Pending |

**Coverage:**

- v1 requirements: 58 total
- Complete: 37
- Pending: 21
- Mapped to phases: 58
- Unmapped: 0

---
*Requirements defined: 2026-08-03*
*Last updated: 2026-08-03 after GSD context consolidation*
