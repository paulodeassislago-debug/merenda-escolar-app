---
phase: 08-improvements
plan: 05
subsystem: ui
tags: [react, typescript, entregas, autocomplete, matching, css-tokens, nfe-xml]

# Dependency graph
requires:
  - phase: 08-01
    provides: EntregaCreatePayload/OrigemEntrega/Fornecedor types, backend POST /entregas com origem/fornecedor
  - phase: 08-03
    provides: Regras por origem no POST /entregas (manual exige observações, xml exige nota_numero) e GET/POST /fornecedores
  - phase: 08-04
    provides: matching.ts (normalizar/similaridade/sugerirCandidatos) para as sugestões de fornecedor
provides:
  - Campos novos do form de Entregas (data da entrega, fornecedor, número da nota, observações) com regras por origem
  - Autocomplete de fornecedor com sugestões explicáveis (sugerirCandidatos) e cadastro inline (POST /fornecedores)
  - Prefill XML de data_entrega (dhEmi), fornecedor (emitente, confirmável) e nota_numero
  - Regras de ação por origem: manual só 'recebido' sem justificativa; XML mantém fluxo de auditoria
  - Extensão de nfe.ts com dataEmissao (ide.dhEmi)
affects: [08-06, 08-07, 08-08, 08-09, 08-VALIDATION]

# Tech tracking
tech-stack:
  added: [none]
  patterns:
    - Pré-seleção por matching sem efeito de estado: helper puro chamado em event handlers (regra react-hooks/set-state-in-effect)
    - Autocomplete com role combobox/listbox, navegação por teclado (setas/Enter/Escape) e onMouseDown preventDefault
    - Diálogo inline acessível: foco inicial autoFocus, Escape fecha, Tab trap, retorno de foco ao fechar

key-files:
  created: []
  modified:
    - frontend/src/pages/admin/Entregas.tsx
    - frontend/src/pages/admin/nfe.ts
    - frontend/src/pages/admin/Entregas.css

key-decisions:
  - "Pré-seleção XML do fornecedor feita por helper puro (preSelecionarEmitente) chamado em handleUploadXml/recarregarFornecedores em vez de useEffect — a regra react-hooks/set-state-in-effect do lint rejeita setState direto em efeito; comportamento D-09/D-22 preservado (confianca >= 0.6, campo confirmável, escolha manual nunca sobrescrita via fornecedorTocadoRef)"
  - "Ação por linha na origem manual: sem select de ação na UI atual (ação é implícita por edição/remoção + badge); ramificação implementada nos handlers atualizarQuantidade/removerLinha, na célula do badge e no payload (força acao='recebido' e justificativa=null)"
  - "Falha do GET /fornecedores não derruba a página: fetch separado com estado erroFornecedores + botão 'Tentar novamente' (recarregarFornecedores)"
  - "Prefill XML só ocorre quando fornecedores já carregaram no upload; se a carga chega depois (rede lenta), degrada para seleção manual — nunca sobrescreve input do usuário"

patterns-established:
  - "Prefill derivado de dados assíncronos: helper puro + chamada nos pontos de chegada de dados (evita set-state-in-effect)"
  - "Lista de sugestões: itens com onMouseDown preventDefault para não perder o foco do input antes do clique"

requirements-completed: [IMP-06, IMP-07, IMP-08, IMP-04, IMP-05]

# Metrics
duration: 16min
completed: 2026-08-05
---

# Phase 08 Plan 05: Revisão do form de Entregas Summary

**Form de Entregas com origem (manual/xml), data da entrega, fornecedor por autocomplete com sugestões de matching + cadastro inline, observações obrigatórias no manual, número da nota obrigatório no XML e prefill da NF (dhEmi/emitente/nNF) confirmável**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-05T14:36:00Z (aprox.)
- **Completed:** 2026-08-05T14:56:56Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `nfe.ts` extrai `dataEmissao` (ide.dhEmi, validada, YYYY-MM-DD) — pré-preenche `data_entrega` no upload XML (D-09).
- Form envia `EntregaCreatePayload` completo: `origem`, `data_entrega`, `fornecedor_id`, `nota_numero` (xml) / `observacoes` (manual) + itens, com validações locais espelhando as 400/422 do backend (T-08-04).
- Campo Fornecedor com autocomplete: `sugerirCandidatos` (top 3, motivo legível, CNPJ), navegável por teclado e clique, opção fixa `Cadastrar fornecedor` abrindo modal inline com `POST /fornecedores` (D-08) — modal preserva o rascunho (D-12: nunca chama `setLinhas([])` nem limpa `notaNumero`/`emitente`).
- Pré-seleção XML do fornecedor pelo emitente com `confianca >= 0.6`, sempre confirmável e nunca sobrescrevendo escolha manual (D-09/D-22).
- Regras de ação por origem: manual só `recebido` (edição direta de quantidade, remoção real, guarda de justificativa desativada, payload forçando `acao='recebido'`/`justificativa=null`); XML mantém badge por linha, modal de justificativa e guarda intactos (D-07, não-regressão F12).
- CSS co-localizado com tokens institucionais apenas (zero hex literal novo): `.entrega-campos-form`, `.sugestoes-lista`, `.sugestao-item`, modal inline, textarea 72px — escala 4/8/16/24/32.

## task Commits

Each task was committed atomically:

1. **task 1: Extrair data de emissão da NF e adicionar campos de origem/data/nota/observações ao form** - `3850f00` (feat)
2. **task 2: Autocomplete de fornecedor com sugestões e cadastro inline** - `1fe5250` (feat)
3. **task 3: Regras de ação por origem na UI e estilos dos novos elementos** - `b146715` (feat)

**Plan metadata:** `b146715` é o último commit de task do plano (docs de fechamento ficam neste SUMMARY, commitado separadamente abaixo)

## Files Created/Modified
- `frontend/src/pages/admin/nfe.ts` - `NfeParseResult.dataEmissao` extraída e validada de `ide.dhEmi` (primeiro segmento ISO + checagem `Date`)
- `frontend/src/pages/admin/Entregas.tsx` - estados novos (origem/dataEntrega/fornecedorId/notaNumero/observacoes), payload completo, autocomplete + modal inline de fornecedor, regras de ação por origem, prefill XML confirmável
- `frontend/src/pages/admin/Entregas.css` - estilos dos campos novos, lista de sugestões, botão de retry e ajustes do modal (somente tokens)

## Decisions Made
- Pré-seleção XML via helper puro em event handlers (em vez de useEffect) — ver auto-fix 1.
- Ação manual implementada nos handlers/badge/payload (a UI atual não tem select de ação — a ação é implícita por edição/remoção); o contrato do payload (`acao: 'recebido'`) é o que importa para o backend (D-07).
- Erro de carregamento de fornecedores isolado com retry, sem derrubar a página.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug de lint] Pré-seleção XML em useEffect rejeitada por react-hooks/set-state-in-effect**
- **Found during:** task 2 (autocomplete de fornecedor)
- **Issue:** O plano mandava pré-selecionar o fornecedor do emitente via efeito (setState direto no corpo do useEffect); a versão atual do eslint-plugin-react-hooks falha o lint com `react-hooks/set-state-in-effect` — gate do plano exige lint verde.
- **Fix:** Extraído helper puro `preSelecionarEmitente(lista, emitenteNf)` (módulo) chamado nos pontos de chegada de dados: `handleUploadXml` (após parse) e `recarregarFornecedores` (retry). `fornecedorTocadoRef` garante que escolha manual nunca é sobrescrita. Comportamento D-09/D-22 preservado (confianca >= 0.6, campo confirmável).
- **Files modified:** frontend/src/pages/admin/Entregas.tsx
- **Verification:** `npm run lint` verde; `npm run build` verde
- **Committed in:** `1fe5250` (parte do commit da task 2)

**2. [Rule 1 - Bug] Import `EntregaItemRequest` órfão após tipagem do payload**
- **Found during:** task 1 (submit com EntregaCreatePayload)
- **Issue:** Ao tipar o payload como `EntregaCreatePayload`, o tipo `EntregaItemRequest` deixou de ser usado no arquivo (lint de imports não usados).
- **Fix:** Removido do import type.
- **Files modified:** frontend/src/pages/admin/Entregas.tsx
- **Verification:** `npm run lint` verde
- **Committed in:** `3850f00` (parte do commit da task 1)

---

**Total deviations:** 2 auto-fixed (2 Rule 1)
**Impact on plan:** Ajustes de implementação para satisfazer os gates (lint) com o mesmo comportamento funcional especificado. Sem scope creep.

## Issues Encountered
- Nenhum. Observação de drift de linha: o plano referenciou "select de ação das linhas ~L283-301" — a revisão atual do arquivo não tem select de ação (a ação é implícita via edição/remoção de quantidade + badge); a ramificação por origem foi aplicada nos handlers e no badge, cobrindo a intenção (D-07) e os critérios de aceite (grep de `origem === 'manual'` junto ao ponto de ação).
- Caso raro: XML enviado antes de `/fornecedores` terminar de carregar → prefill não aplica (degrada para seleção manual); nunca perde input do usuário.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Contrato de payload do form alinhado ao backend de 08-01/08-03 (origem/data/fornecedor/nota/observações).
- `sugerirCandidatos` agora consumido em duas superfícies (fornecedores; itens XML na 08-06) — padrão provado.
- Manual de validação (08-VALIDATION.md): upload XML → prefill → cadastro inline → submit sem perder rascunho.

---
*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/08-improvements/08-05-SUMMARY.md`
- FOUND: commit `3850f00` (task 1), `1fe5250` (task 2), `b146715` (task 3)
- FOUND: `frontend/src/pages/admin/nfe.ts`, `frontend/src/pages/admin/Entregas.tsx`, `frontend/src/pages/admin/Entregas.css`
- `npm run build` e `npm run lint` verdes após cada task e na verificação final
- Nenhuma modificação em STATE.md / ROADMAP.md / REQUIREMENTS.md / PROJECT.md / backend/*
