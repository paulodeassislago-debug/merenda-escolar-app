# Arquivo historico: Plano de Acao legado

Este documento foi movido para fora de `.planning/` em 2026-08-03. Ele e mantido apenas para preservar contexto historico. Nao e fonte de autoridade para requisitos, arquitetura, design, testes ou estado do projeto. Consulte `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` e `.planning/phases/`.

**Data original:** 2026-07-31
**Fontes originais:** PRD.md, spec.md, TESTING.md, context.md, AGENTS.md, DESIGN.md, .planning/codebase/*

## Visao geral original

Sistema web para o **Colegio Estadual do Campo Nancy de Castro Esteves** — controle automatico de estoque com baixa por consumo real, conversao de medidas caseiras para kg/L, planejamento semanal de cardapio e auditoria de ajustes da cozinha, em conformidade com PNAE/SEC-BA.

**Stack original:** Backend Python 3.12 + FastAPI 0.139 + SQLAlchemy 2.0 + SQLite; Frontend React 19 + Vite 8 + TypeScript 6; Docker + Coolify em VPS.

**Estrategia original:** evoluir o codigo existente, backend-first com testes e frontend consumindo os contratos.

## Estado e gaps registrados originalmente

O plano original registrava como concluidos a autenticacao JWT, a infraestrutura de testes, a conversao e baixa de estoque, os Dockerfiles e os primeiros paineis. Tambem registrava como gaps historicos: login simulado, `id_usuario` hardcoded, tabelas de dominio ausentes, autorizacao incompleta, `cardapiosPadrao`, URLs hardcoded, ausencia de `ProtectedRoute`/`AuthContext`/`Layout`/`api.ts`, schemas separados, nomes antigos de modelos, fallback de segredo, checks de perfil, CI/CD e Alembic.

Esses gaps foram posteriormente implementados ou reclassificados nas fases 1 a 5.7. O estado atual esta nos artefatos canonicos, nao nesta lista historica.

## Decisoes tecnicas historicas

- Identidade visual baseada no brasao da escola e nos tokens verdes/amarelos.
- CSS plain co-localizado; Tailwind permaneceu como dependencia nao ativa.
- `create_all` e SQLite para desenvolvimento; Alembic/PostgreSQL foram adiados para producao.
- JWT em localStorage com `fetchWithAuth` centralizado.
- Evolucao incremental em vez de reescrita.
- XML NF-e parseado no frontend com `fast-xml-parser` e revisao humana.
- Testes frontend manuais; Playwright foi adiado.

## Fases historicas

### Fases 1 a 4

As fases 1 a 4 cobriram a fundacao backend, CRUDs protegidos, logica de negocio, planejamento, entregas, refeicoes, dashboard, cardapio publico e fundacao frontend com JWT, rotas protegidas, layout e cliente API.

### Fase 5

A Fase 5 entregou as paginas administrativas: Dashboard, Usuarios, Itens, Cardapio, Receitas, Planejamento e Entregas. Incluiu fluxo manual e XML NF-e, justificativas e os portoes de build/lint/testes.

### Fase 5.7

A Fase 5.7 consolidou as decisoes que substituem as regras antigas:

- O cardapio e as refeicoes usam tres tipos: `Lanche`, `Almoco` e `Janta`.
- O planejamento preserva quatro slots: `Lanche da Manha`, `Almoco`, `Lanche da Tarde` e `Janta`.
- Unidades de exibicao podem ser livres; a unidade interna permanece `KG` ou `L` com fator de conversao positivo.
- O frontend converte saldo para a unidade de exibicao; o backend mantem o saldo interno.
- Entregas aplicam o fator antes de incrementar o saldo.

O fechamento da fase 5.7 registrou 94 testes, build e lint limpos. O baseline atual do worktree foi posteriormente validado com 100 testes passando.

### Fase 6 planejada

A Fase 6 moderniza os paineis da cozinha e da gestao com planejamento, API autenticada, auditoria e dados reais. O contexto canonico atual esta em `.planning/phases/06-cozinha-gestao-frontend/06-CONTEXT.md`.

### Fase 7 planejada

A Fase 7 finaliza o cardapio publico, o checklist manual e a verificacao ponta a ponta.

## Rotas historicas

O plano original listava as rotas publicas, administrativas, de cozinha e gestao. A composicao atual e mantida em `frontend/src/App.tsx` e documentada em `.planning/codebase/ARCHITECTURE.md`.

## Dependencias e riscos historicos

- A Fase 6 depende dos contratos de planejamento e refeicoes das fases 3 e 5.7 e da autenticacao da fase 4.
- A Fase 5 depende dos CRUDs, logica de negocio e fundacao frontend.
- A Fase 7 depende da Fase 6.
- Os riscos de migracao SQLite, concorrencia, `create_all` sem migracoes e segredo de desenvolvimento continuam registrados em `.planning/codebase/CONCERNS.md` quando ainda aplicaveis.

## Criterios historicos de conclusao

O plano original usava como gates `pytest`, `npm run build`, `npm run lint`, backend sem traceback e testes manuais aplicaveis. Os gates atuais e a contagem vigente estao em `.planning/codebase/TESTING.md` e `.planning/REQUIREMENTS.md`.

---

*Arquivo historico; supersedido em 2026-08-03 pela hierarquia GSD canonica.*
