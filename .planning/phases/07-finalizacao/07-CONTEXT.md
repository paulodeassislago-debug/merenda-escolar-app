# Phase 07: Finalizacao - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fechar o produto existente com o polimento responsivo do cardápio público e a verificação manual/automatizada da entrega v1. A fase deve preservar o endpoint público e os contratos de domínio existentes, concluir o checklist F1-F17, comprovar build/lint/suíte backend e verificar o fluxo conversão → baixa → refeição → auditoria. Não criar uma nova camada de backend, autenticação pública, navegação por datas, Playwright, CI/CD, Alembic/PostgreSQL ou validação fiscal formal de NF-e.

</domain>

<decisions>
## Implementation Decisions

### Hierarquia do cardápio público
- **D-07-01:** O prato é o foco visual principal de cada bloco; o tipo/slot funciona como rótulo secundário.
- **D-07-02:** Ingredientes podem ser consultados, mas a apresentação pública mostra somente os nomes dos itens. Não expor quantidade, medida caseira ou peso da ficha técnica.
- **D-07-03:** Um prato sem receita continua visível com seu nome; não transformá-lo em erro nem ocultar a refeição.
- **D-07-04:** Ingredientes devem começar em um resumo compacto e ter um controle explícito para expansão. O controle precisa ser acessível por teclado e a expansão não pode truncar ou perder nomes; o limite visual exato fica a critério do planejamento.

### Slots e ordem do dia
- **D-07-05:** O público deve distinguir os quatro slots de serviço: `Lanche da Manhã`, `Almoço`, `Lanche da Tarde` e `Janta`. Não agrupar os dois lanches em um único bloco.
- **D-07-06:** A ordem visual é fixa e operacional: `Lanche da Manhã` → `Almoço` → `Lanche da Tarde` → `Janta`, independentemente da ordem recebida pela API.
- **D-07-07:** Os quatro slots permanecem visíveis mesmo quando não há planejamento vigente. Um slot ausente deve aparecer como `A definir`, diferenciado de loading e erro.
- **D-07-08:** Usar os nomes operacionais completos dos slots. Não inventar horários de atendimento que não existam no contrato.

### Checklist e evidências
- **D-07-09:** F1-F5 devem ser reconstruídos a partir de commits, código, testes e artefatos históricos antes da execução final. A definição consolidada deve ser registrada no contrato de validação/UAT da Fase 07; não assumir silenciosamente o significado desses fluxos.
- **D-07-10:** A execução manual usará um cenário controlado e reproduzível, com pré-condições, dados mínimos e limpeza/recriação do banco de desenvolvimento quando necessário para comparar saldos e auditorias.
- **D-07-11:** O pacote de aceite é um `07-UAT.md` com pré-condições, passos, resultado e status de cada F1-F17, acompanhado dos gates automatizados de frontend e backend. Capturas de tela não são requisito obrigatório.
- **D-07-12:** Qualquer falha no checklist ou nos gates bloqueia a conclusão da fase. O fluxo deve ser corrigido e repetido antes de marcar o item como aprovado.
- **D-07-13:** Os gates automatizados permanecem: `cd frontend && npm run build`, `cd frontend && npm run lint` e, a partir de `backend/` com o venv ativo, `pytest tests/ -q`. Playwright continua adiado por decisão do projeto.

### the agent's Discretion
- Definir o limiar exato do resumo expansível, desde que o estado fechado seja compacto, o estado aberto preserve todos os nomes e o controle tenha nome acessível.
- Escolher cards, lista vertical ou composição híbrida para implementar os quatro slots, desde que a ordem fixa, os estados vazios e a leitura em 320px, 768px e desktop sejam preservados.
- Escolher a organização dos dados de teste e a sequência operacional do UAT, desde que as pré-condições e o reset/recriação necessários fiquem documentados.
- Reaproveitar tipos locais ou promover contratos públicos para `frontend/src/types.ts`, sem duplicar shapes incompatíveis com a API.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase authority and requirements
- `.planning/PROJECT.md` — contexto do produto, limites, identidade visual, comandos e decisões globais.
- `.planning/REQUIREMENTS.md` — `PUBLIC-01`, `PUBLIC-02`, `QUAL-01`..`QUAL-06` e o que permanece fora do escopo.
- `.planning/ROADMAP.md` — objetivo, dependência, critérios de sucesso e refs canônicas da Fase 07.
- `.planning/STATE.md` — estado do milestone, UATs anteriores e riscos adiados; o caminho de continuidade antigo deve ser tratado como stale.
- `.planning/codebase/TESTING.md` — comandos de validação, cobertura backend, escopo F6-F15 e decisões de automação adiada.
- `.planning/codebase/CONVENTIONS.md` — convenções TypeScript, API, CSS, acessibilidade e semântica de dados.
- `AGENTS.md` — comandos por subdiretório e regra de executar pytest/Uvicorn a partir de `backend/`.

### Existing public-menu implementation
- `frontend/src/pages/CardapioPublico.tsx` — superfície pública a polir; atualmente busca o endpoint diretamente e renderiza cards com ingredientes.
- `frontend/src/pages/CardapioPublico.css` — CSS co-localizado, tokens e layout público existente.
- `frontend/src/App.tsx` — rota pública `/cardapio`, sem `ProtectedRoute`.
- `frontend/src/api.ts` — cliente HTTP centralizado, `fetchJson` e `API_BASE_URL`; novas chamadas não devem criar outra forma de acesso.
- `frontend/src/types.ts` — contratos compartilhados; atualizar se o shape público deixar de ser local.
- `frontend/src/index.css` — tokens institucionais, tipografia, superfícies e foco visual.
- `frontend/src/components/Layout.tsx` — link autenticado que abre o cardápio público em nova aba.

### API and regression contracts
- `backend/main.py` § `cardapio_publico` — endpoint sem autenticação, parâmetro opcional `data`, slots retornados e ordem atual; ausências não aparecem na resposta.
- `backend/main.py` — `TIPOS_REFEICAO_VALIDOS` e `SLOTS_PLANEJAMENTO`, que não devem ser confundidos.
- `backend/tests/test_publico.py` — regressões P1-P3 para acesso sem token, data atual, data explícita e dia sem planejamento.
- `backend/tests/test_planejamento.py` — contrato dos quatro slots e mapeamento dos dois lanches.
- `backend/tests/test_refeicoes.py` — conversão, baixa, auditoria e atomicidade que participam do fluxo ponta a ponta.

### Prior phase acceptance evidence
- `.planning/phases/05-p-ginas-admin-frontend/05-CONTEXT.md` — decisões de frontend, planejamento, cardápio público adiado e gates da fase anterior.
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — decisão final sobre unidade livre e tipo `Lanche` unificado.
- `.planning/phases/05-p-ginas-admin-frontend/05-UAT.md` — fluxos F6-F12 já validados e relação com o cardápio público.
- `.planning/phases/06-cozinha-gestao-frontend/06-CONTEXT.md` — decisões de API/auth/CSS que a Fase 07 deve preservar.
- `.planning/phases/06-cozinha-gestao-frontend/06-UAT.md` — fluxos F13-F15, estados responsivos e gates já validados.
- `.planning/phases/06-cozinha-gestao-frontend/06-VALIDATION.md` — contrato de validação manual e automatizada mais recente.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/pages/CardapioPublico.tsx`: já fornece o shell público, estados de loading/erro/vazio, logo e acesso ao endpoint; evoluir a superfície em vez de criar outra rota.
- `frontend/src/pages/CardapioPublico.css`: já usa `--fundo`, `--branco`, `--verde-escuro`, `--verde-vivo`, `--borda`, `--raio` e `--sombra-card`; manter esses tokens.
- `frontend/src/api.ts`: `fetchJson`/`fetchWithAuth` centralizam URL e desserialização; o acesso público pode usar o mesmo cliente sem exigir login.
- `frontend/src/index.css`: tokens e fontes existentes suportam a distinção serif do cardápio público versus sans operacional.

### Established Patterns
- Páginas usam CSS plain co-localizado, sem Tailwind como linguagem de implementação.
- Estados de loading, erro, vazio e conteúdo são explícitos; erros acionáveis usam `role="alert"`.
- Controles devem manter foco visível, labels acessíveis e comportamento por teclado, conforme a validação da Fase 6.
- O frontend deve normalizar a resposta pública para quatro slots em ordem fixa, porque o endpoint só retorna slots preenchidos e hoje ordena por texto.
- O backend é a autoridade para conversão, baixa, auditoria e atomicidade; a validação da fase deve provar o comportamento, não duplicá-lo no frontend.

### Integration Points
- A rota `/cardapio` em `frontend/src/App.tsx` permanece pública e separada das rotas protegidas.
- `GET /publico/cardapio` continua a fonte do menu diário; alteração de backend só entra no plano se a resposta existente não permitir representar os quatro slots e seus estados.
- O fluxo de verificação ponta a ponta cruza `GET /conversoes`, `POST /refeicoes`, estoque atualizado e registros de auditoria no backend.
- O aceite de qualidade depende de `frontend/`, `backend/` e dos artefatos `.planning/phases/07-finalizacao/07-VALIDATION.md`/`07-UAT.md`.

</code_context>

<specifics>
## Specific Ideas

- A leitura pública deve ser rápida: nome do prato em destaque, nomes dos ingredientes sob demanda e quatro momentos do serviço claramente separados.
- `A definir` representa slot sem planejamento; não deve ser confundido com falha de API ou com a mensagem de ausência total de cardápio.
- O relatório final deve permitir auditar exatamente quais F1-F17 passaram e quais comandos automatizados foram executados.
- O cenário controlado deve preservar a prova do encadeamento conversão → baixa → refeição → auditoria, incluindo saldos antes/depois e justificativas quando houver ajustes.

</specifics>

<deferred>
## Deferred Ideas

- Playwright/E2E automatizado, CI/CD e migração Alembic/PostgreSQL permanecem para o milestone de produção.
- Validação formal de XML NF-e contra schema fiscal permanece fora do escopo.
- Melhorias de limiar por item, cadastro inline de itens XML e correspondência inteligente de fornecedores continuam na Fase 08.

</deferred>

---

*Phase: 07-finalizacao*
*Context gathered: 2026-08-04*
