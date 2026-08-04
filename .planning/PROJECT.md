# Sistema de Gestao da Cozinha Escolar (PNAE)

## What This Is

Aplicacao web para o Colegio Estadual do Campo Nancy de Castro Esteves. O sistema apoia o controle de estoque, o planejamento de cardapios, o registro das refeicoes servidas e a auditoria das alteracoes feitas pela cozinha, com foco nas rotinas do PNAE e da SEC-BA.

O repositorio contem duas aplicacoes independentes: `backend/` (Python/FastAPI) e `frontend/` (React/Vite/TypeScript), implantadas juntas em uma VPS por Docker e Coolify.

## Core Value

Controlar automaticamente o estoque da cozinha com baixa baseada no consumo real das refeicoes, mantendo rastreabilidade e conformidade operacional com o PNAE/SEC-BA.

## Business Context

- **Usuarios:** admin, secretaria, cozinheira e visitante publico.
- **Ambiente:** cozinha escolar com uso de medidas caseiras e necessidade de operacao simples em telas de trabalho.
- **Sucesso:** planejamento, recebimento, preparo e auditoria registrados sem depender de planilhas ou ajustes manuais fora do sistema.

## Requirements

O conjunto verificavel de requisitos esta em `.planning/REQUIREMENTS.md`.

### Validated

- Autenticacao JWT e autorizacao por perfil implementadas.
- CRUDs de usuarios, itens, conversoes, cardapio, receitas, planejamento e entregas implementados.
- Conversao de medidas caseiras e baixa automatica de estoque implementadas.
- Auditoria de ajustes em entregas e refeicoes implementada.
- Sete paginas administrativas implementadas na Fase 5.
- Unidades livres com conversao interna e tipo `Lanche` unificado implementados na Fase 5.7.
- Upload XML NF-e, revisão humana e confirmação no fluxo de entregas validados manualmente na Fase 5.

### Active

- [ ] Modernizar o painel da cozinheira para consumir planejamento e API reais.
- [ ] Modernizar o painel de gestao para secretaria, com links e dados reais.
- [ ] Finalizar cardapio publico, testes manuais e verificacao ponta a ponta.
- [ ] Depois da Fase 7, executar a Fase 8 de melhorias operacionais documentadas.

### Out of Scope

- Aplicativo mobile nativo.
- Validacao fiscal formal de XML NF-e contra schema SEFAZ; a importacao atual e best-effort e exige revisao humana.
- Playwright/E2E automatizado neste milestone.
- CI/CD neste milestone.
- Alembic e migracao para PostgreSQL antes da etapa de producao.
- Tema escuro, Tailwind como linguagem de componentes ou outra identidade visual fora de `frontend/src/index.css`.

## Context

### Produto e dominio

- A escola trabalha com cardapios semanais, fichas tecnicas de preparo e atendimento de alunos.
- O estoque interno e mantido em kg/L. Itens podem ser cadastrados em unidades de cozinha livres, como pacote, maca, caixa, duzia ou peca, desde que informem unidade interna e fator de conversao.
- O tipo de refeicao do cardapio e da refeicao usa tres valores: `Lanche`, `Almoco` e `Janta`. O planejamento preserva quatro slots: `Lanche da Manha`, `Almoco`, `Lanche da Tarde` e `Janta`; os dois slots de lanche apontam para pratos do tipo `Lanche`.
- Entregas podem ser lancadas manualmente ou importadas de XML NF-e no frontend. Alteracoes e exclusoes exigem justificativa e ficam auditadas.
- O preparo usa receitas padrao, permite ajustes justificados por ingrediente, converte medidas caseiras e deduz estoque antes de registrar a refeicao.

### Stack e execucao

- Backend: Python 3.12, FastAPI 0.139.2, SQLAlchemy 2.0.51, Pydantic 2.13.4, Uvicorn 0.51.0, SQLite em desenvolvimento.
- Frontend: React 19.2.7, Vite 8.1.1, TypeScript 6.0.2, React Router DOM 7.11.0, CSS plain co-localizado.
- Dependencias backend fixadas em `backend/requirements.txt`; este arquivo e a referencia de reproducibilidade do ambiente Python.
- Banco: `backend/merenda.db`, criado por `Base.metadata.create_all`; `DATABASE_URL` e relativa, portanto comandos backend devem ser executados a partir de `backend/`.
- Testes backend: pytest + httpx, SQLite em memoria com StaticPool; a Fase 5.7 fechou com 94 testes e o baseline atual do worktree e 100 testes passando.
- Deploy: Dockerfiles separados para backend e frontend, servidos por uma VPS com Coolify.

### Auth e rotas

- `POST /auth/login` retorna JWT e perfil; o frontend persiste o token e usa `fetchWithAuth`/`fetchJson`.
- Rotas autenticadas usam `ProtectedRoute` e `Layout`.
- Redirecionamento pos-login: admin para `/admin`, secretaria para `/gestao`, cozinheira para `/cozinha`.
- `/cardapio` e `/publico/cardapio` permanecem publicos conforme os contratos atuais.

### Identidade visual

- Tokens de marca vivem em `frontend/src/index.css`: verde escuro `#124C0F`, verde vivo `#48BB2C`, amarelo `#C5D227`, superficies claras e estados de erro restritos.
- A logo `frontend/src/assets/Logo Nancy (Logotipo) (1).jpg` possui fundo branco e so deve ser renderizada em superficie clara ou dentro de container branco.
- Serif e reservada a Login/Cardapio Publico; telas operacionais usam sans-serif.
- CSS e co-localizado por pagina; nao introduzir Tailwind como linguagem de implementacao.

### Historico de implementacao

- Fases 1 a 3: fundacao, CRUDs e logica de negocio do backend.
- Fase 4: autenticacao JWT, `api.ts`, contexto de auth, rotas protegidas e layout.
- Fase 5: paginas administrativas, conversoes, planejamento, entregas manuais/XML e portoes de saida.
- Fase 5.7: unidades livres com conversao interna, tipo `Lanche` unificado, migracao SQLite e atualizacao dos testes.
- Fase 6: modernizacao dos paineis `PainelCozinha` e `DashboardGestao`.
- Fase 7: finalizacao, cardapio publico, suite e verificacao ponta a ponta.
- Fase 8: melhorias posteriores de estoque, onboarding de itens XML e correspondencia de nomes de fornecedores.

## Constraints

- **Arquitetura:** evoluir o codigo existente; nao reescrever as duas aplicacoes.
- **Banco:** SQLite local com `create_all`; perda/recriacao do banco de desenvolvimento e aceitavel, mas dados de producao exigirao migracoes antes do deploy.
- **API:** shapes frontend devem acompanhar os schemas Pydantic em `backend/schemas.py`.
- **Execucao backend:** nunca rodar Uvicorn ou pytest a partir da raiz, pois a URL SQLite relativa pode criar banco vazio no local errado.
- **TypeScript:** `verbatimModuleSyntax` exige `import type`; `erasableSyntaxOnly` proibe enums, namespaces e parameter properties.
- **Auditoria:** justificativas de alteracao/exclusao sao obrigatorias e nao podem ser removidas para simplificar a UI.
- **Conversao:** uma medida caseira sem entrada correspondente em `/conversoes` deve falhar de forma clara; nao assumir conversoes silenciosas.
- **Documentacao:** este arquivo, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md` e os artefatos de fase sao a fonte de planejamento GSD. Documentos de produto nao devem duplicar requisitos fora dessa hierarquia.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evoluir o codigo existente | O backend e frontend ja possuem fluxos validos e testes | Good |
| Backend-first, depois frontend | Contratos e regras de estoque precisam estar estaveis antes das telas | Good |
| JWT em localStorage com cliente centralizado | Aplicacao interna e fluxo simples; `fetchWithAuth` evita duplicacao | Good |
| CSS plain co-localizado | Padrao existente e identidade visual controlada por tokens | Good |
| XML NF-e parseado no frontend | Permite revisao humana antes da confirmacao da entrega | Good |
| Auditoria por item com justificativa | Necessidade operacional e de prestacao de contas do PNAE | Good |
| Unidades livres + unidade interna/fator | Representa unidades reais da cozinha sem perder estoque em kg/L | Good |
| `Lanche` como tipo e quatro slots de planejamento | Unifica o vocabulario do cardapio sem perder os horarios de servico | Good |
| Playwright, CI/CD e Alembic adiados | Nao bloqueiam o milestone atual; devem ser retomados antes de producao | Pending |

## Canonical References

- `.planning/REQUIREMENTS.md` — requisitos funcionais, qualidade e rastreabilidade.
- `.planning/ROADMAP.md` — fases, dependencias, planos e estado do milestone.
- `.planning/STATE.md` — posicao atual e continuidade da sessao.
- `.planning/codebase/` — mapa tecnico atualizado do repositorio.
- `backend/requirements.txt` — dependencias Python fixadas.
- `backend/models.py`, `backend/schemas.py`, `backend/main.py` — contratos e regras implementadas da API.
- `frontend/src/types.ts`, `frontend/src/api.ts`, `frontend/src/auth-context.ts` — contratos e infraestrutura frontend.
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — decisoes e comportamento mais recente da Fase 5.
- `.planning/phases/08-improvements/08-CONTEXT.md` — backlog estruturado das melhorias da Fase 8.

---
*Last updated: 2026-08-03 after GSD context consolidation*
