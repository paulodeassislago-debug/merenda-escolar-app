# Phase 8: Improvements - Context

**Gathered:** 2026-08-03
**Status:** Backlog documented; not ready for execution
**Boundary:** Melhorias operacionais posteriores à conclusão das Fases 6 e 7.

<domain>
## Phase Boundary

A Fase 8 melhora o recebimento e a leitura operacional do estoque sem alterar o fluxo contratado das fases anteriores antes que elas sejam concluídas. Ela cobre três frentes: limiar de baixo estoque por item, cadastro inline de itens novos durante a revisão de XML e sugestão inteligente de correspondência entre nomes de fornecedores e itens já cadastrados.

Esta fase não deve ser iniciada em paralelo com as Fases 6 ou 7. Antes do planejamento detalhado, a pesquisa deve confirmar os impactos nos modelos, schemas, autorização, migração SQLite e contratos frontend/backend.

</domain>

<decisions>
## Implementation Decisions

### 1. Limiar individual de baixo estoque

- **IMP-01:** Cada item poderá armazenar um limiar configurável de baixo estoque; itens existentes devem manter comportamento compatível com o valor padrão atual de 5.
- **IMP-02:** O limiar será interpretado na mesma unidade de exibição usada pelo usuário. O backend deve ser a autoridade para o valor persistido e para a regra de alerta; o frontend apenas apresenta o saldo convertido e o status.
- O cadastro deve rejeitar limiar nulo quando não permitido, zero ou valor negativo. A pesquisa deverá decidir se `null` representa explicitamente o fallback de 5 ou se a migração grava 5 em todos os itens existentes.
- Dashboard, página de Itens, painel da secretaria e qualquer alerta futuro devem consumir o limiar retornado pela API, sem manter `5` hardcoded em múltiplas telas.

### 2. Cadastro inline de item novo durante entrega XML

- **IMP-03:** Quando uma linha XML não tiver correspondência, o select deve oferecer `Cadastrar novo item` além dos itens existentes.
- A opção abre um formulário/modal dentro de Entregas, preserva o XML parseado e o restante do rascunho, cria o item e vincula o novo `item_id` à linha que originou a ação.
- O fluxo deve reutilizar os mesmos campos e validações de item existentes, incluindo unidade livre, unidade interna `KG`/`L` e fator de conversão quando aplicável.
- A criação não pode confirmar automaticamente uma linha incompleta: o usuário ainda deve revisar quantidade, unidade, ação e justificativas antes de enviar a entrega.
- A pesquisa deve resolver a matriz de autorização: o endpoint atual de criação de item é administrativo, enquanto Entregas também é acessível à secretaria. Caso a secretaria possa cadastrar pelo fluxo inline, a mudança de permissão precisa ser explícita, testada e limitada ao necessário.

### 3. Normalização e sugestão de correspondência

- **IMP-04:** O formulário deve normalizar nomes de fornecedores antes de sugerir itens. A normalização inicial deve considerar caixa, acentos, pontuação, espaços repetidos e tokens, sem apagar o nome original exibido na nota ou armazenado no histórico.
- **IMP-05:** Sugestões devem ser assistivas e confirmáveis: mostrar candidatos, similaridade/confiança e motivo legível; nunca selecionar ou fundir itens silenciosamente.
- Exemplos como `Músculo Bovino` e `MUSC BOV` devem ser tratados como candidatos relacionados, não como equivalência garantida sem confirmação humana.
- A pesquisa deverá comparar alternativas: normalização determinística local, dicionário de abreviações e/ou similaridade controlada. Não adicionar IA externa ou dependência nova sem demonstrar necessidade e custo.
- O histórico da entrega deve preservar a descrição original do XML, o item escolhido e, se adotado, o alias/normalização usado para explicar a decisão.

### Non-regression boundary

- Nenhuma melhoria da Fase 8 altera os tipos de refeição, os quatro slots de planejamento, a auditoria obrigatória ou a conversão interna kg/L definida na Fase 5.7.
- O fluxo XML já validado permanece: parse no navegador, correspondência revisável, confirmação explícita e atualização auditável do estoque.
- A Fase 8 deve incluir regressões para entrega manual, entrega XML, conversão, alertas de estoque e autorização por perfil.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md` — contexto global e limites do produto.
- `.planning/REQUIREMENTS.md` — `IMP-01` a `IMP-05`, requisitos de estoque e entregas já implementados.
- `.planning/ROADMAP.md` — posição da Fase 8 depois da Fase 7 e dependências do milestone.
- `.planning/STATE.md` — fase atual e regra de não interferir na execução da Fase 6.
- `.planning/phases/05-p-ginas-admin-frontend/05-07-SUMMARY.md` — unidades livres, fator de conversão e tipo `Lanche` unificado.
- `.planning/phases/05-p-ginas-admin-frontend/05-UAT.md` — fluxo XML manual validado.
- `.planning/phases/05-p-ginas-admin-frontend/05-VERIFICATION.md` — evidências de integração da tela de Entregas.
- `.planning/codebase/ARCHITECTURE.md` — fronteiras frontend/backend e fluxo de entregas.
- `.planning/codebase/TESTING.md` — gates e regressões existentes.
- `backend/models.py`, `backend/schemas.py`, `backend/main.py` — modelos, contratos e autorização a serem avaliados na pesquisa.
- `frontend/src/pages/admin/Entregas.tsx`, `frontend/src/pages/admin/nfe.ts`, `frontend/src/pages/admin/Itens.tsx` — implementação atual de XML, itens e conversões.
- `frontend/src/types.ts`, `frontend/src/api.ts` — contratos compartilhados e cliente autenticado.
- `AGENTS.md` e `backend/requirements.txt` — execução e dependências fixadas.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseNfe` já normaliza a estrutura XML e marca itens sem correspondência para seleção manual.
- `Entregas.tsx` já mantém linhas editáveis e usa o mesmo submit para fluxo manual e XML.
- `Itens.tsx` já possui formulário de unidade livre e conversões internas.
- `fetchJson` e `ApiError` devem continuar sendo o caminho único de API.

### Established Patterns
- Backend valida atomicidade, autorização, fator de conversão e justificativas.
- Frontend usa CSS plain co-localizado, tokens globais e revisão humana antes de persistir.
- `unidade_oficial` pode ser livre, mas o estoque interno permanece em kg/L.

### Integration Points
- Novo limiar afetará `Item`/schemas, endpoints de itens, dashboard e todas as superfícies que calculam baixo estoque.
- Cadastro inline afetará `Entregas.tsx`, `Itens` compartilhado, `POST /itens`, autorização e o ciclo de vida do rascunho XML.
- Sugestões afetarão parser/utilitário de normalização, estado da linha XML, tipos compartilhados e possivelmente persistência de aliases.

</code_context>

<specifics>
## Specific Ideas

- O usuário deve permanecer na aba Entregas quando um item novo for necessário.
- A descrição do fornecedor não deve ser perdida só porque foi vinculada a um item interno.
- A sugestão deve prevenir duplicação sem transformar uma aproximação textual em decisão automática de estoque.

</specifics>

<deferred>
## Deferred Ideas

- Fusão automática ou exclusão de itens duplicados — requer política de dados e auditoria próprias.
- Integração com catálogo externo, IA ou serviço de matching remoto — fora do escopo até pesquisa demonstrar necessidade.
- Validação fiscal formal de XML contra schema SEFAZ — continua fora do escopo atual.

</deferred>

---

*Phase: 08-improvements*
*Context documented: 2026-08-03*
