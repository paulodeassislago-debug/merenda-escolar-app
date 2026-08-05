---
phase: 08-improvements
plan: 06
subsystem: ui
tags: [react, typescript, entregas, xml, modal, matching, sugestoes]

# Dependency graph
requires:
  - phase: 08-03
    provides: POST /itens/inline (admin+secretaria, mesmas validacoes de POST /itens)
  - phase: 08-04
    provides: matching.ts (normalizar/tokenizar/similaridade/sugerirCandidatos)
  - phase: 08-05
    provides: Entregas.tsx com origem/data/fornecedor/nota/observacoes e autocomplete de fornecedor
provides:
  - Modal 'Cadastrar novo item' com form completo de item dentro do fluxo de Entregas
  - Vinculo item→linha XML sem perder o rascunho da entrega (D-11/D-12)
  - Sugestoes assistivas top-3 por linha XML sem correspondencia (D-22/D-23)
affects: [08-09 (projecao), 08-VALIDATION (backstop manual), fases posteriores de revisao de Entregas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Modal inline acessivel (foco inicial, TrapTab, Escape, retorno de foco) — mesmo padrao do modal de fornecedor/PainelCozinha
    - Sugestoes derivadas em tempo de render (descricaoNf × catalogo) sem efeito colateral
    - Reuso de fatorParaUnidade/atualizarItemLinha para linhas de entrega

key-files:
  created: []
  modified:
    - frontend/src/pages/admin/Entregas.tsx
    - frontend/src/pages/admin/Entregas.css

key-decisions:
  - "Opcao '__novo__' no select apenas para linhas XML sem itemId; manual nao oferece cadastro inline (escopo D-11)"
  - "Ao salvar item inline, unidade/fator da linha derivam de unidadeNf ou unidade_oficial do novo item, sem conversoes (item recem-criado nao tem conversoes)"
  - "Lista de sugestoes renderiza apenas quando ha candidatos — o helper existente ja explica o estado sem correspondencia"

patterns-established:
  - "Modal inline de cadastro (item/fornecedor) nunca reseta o rascunho da entrega — estado vive na pagina, nao no modal"
  - "Sugestao assistiva exige clique explicito; nenhuma associacao automatica (D-22)"

requirements-completed: [IMP-03, IMP-04, IMP-05]

# Metrics
duration: 28min
completed: 2026-08-05
---

# Phase 08 Plan 06: Cadastro inline de item e sugestoes assistivas nas linhas XML Summary

**Modal 'Cadastrar novo item' com form completo de item (unidade livre, KG/L, fator, limiar 5.0) dentro do fluxo de Entregas, vinculo do novo item a linha XML sem perder o rascunho, e sugestoes assistivas top-3 (nome + motivo) por linha sem correspondencia — sem nenhuma associacao automatica**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-05T14:49:00Z (aproximado)
- **Completed:** 2026-08-05T15:17:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Select de linha XML sem `itemId` ganha a opcao `Cadastrar novo item` (valor `__novo__`), que abre o modal em vez de limpar a linha (D-11)
- Modal espelha o form de Itens: nome obrigatorio, unidade oficial livre com `UNIDADES_SUGERIDAS`, unidade interna KG/L (radio, default KG), fator de conversao > 0 (somente quando unidade != KG/L), limiar default 5.0 (min 0.01); `saldo_atual` nao aparece — o saldo vem da linha da entrega
- Submit usa `POST /itens/inline` (admin+secretaria, 08-03): em 200 vincula `itemId` a linha via `setLinhas` com spread `...l` (rascunho preservado), adiciona o item ao catalogo local, NAO confirma a entrega e devolve o foco ao select
- Erro (nome duplicado 409, etc.) mantem o modal aberto com o rascunho do formulario intacto; Cancelar/Escape fecham sem tocar em nenhum estado da entrega (D-12)
- Acessibilidade: dialogo com foco inicial, TrapTab, Escape e retorno de foco ao select que abriu (padrao `handleDialogKeyDown`)
- Linhas XML sem correspondencia exibem lista `Sugestoes` com ate 3 candidatos de `sugerirCandidatos(descricaoNf, itens)` — nome + motivo legivel (ex.: "3 de 4 palavras batem"); clique seleciona o item na linha sem POST automatico (D-22)
- `descricaoNf`/`unidadeNf` nunca sao alterados ao escolher sugestao ou cadastrar item (historico preserva a descricao original do XML — D-23)

## Task Commits

Each task was committed atomically:

1. **task 1: Modal 'Cadastrar novo item' com form completo e vinculo a linha sem perder rascunho** - `dc6b926` (feat)
2. **task 2: Sugestoes assistivas por linha XML sem correspondencia** - `ccd2d2b` (feat)

**Plan metadata:** commit do SUMMARY pendente (docs: complete plan)

## Files Created/Modified
- `frontend/src/pages/admin/Entregas.tsx` - Opcao `Cadastrar novo item` no select, modal inline de item (estado, validacoes, submit, acessibilidade), sugestoes top-3 por linha com motivo
- `frontend/src/pages/admin/Entregas.css` - Estilos do modal de item (radio-group, campo-ajuda, espelho de Itens.css) e da lista de sugestoes por linha

## Decisions Made
- Opcao `__novo__` restrita a linhas XML sem `itemId` (escopo literal da D-11); o fluxo manual continua sem cadastro inline
- Ao salvar, a linha herda `unidade = unidadeNf || unidade_oficial` e fator via `fatorParaUnidade` com conversoes vazias (item recem-criado ainda nao tem conversoes cadastradas) — mesmo comportamento do fluxo de selecao de item existente
- Sugestoes calculadas como derivacao pura no render (sem `useMemo`/efeito): recomputadas a cada mudanca de linhas/catalogo, sem efeito colateral
- Lista de sugestoes so renderiza quando ha candidatos; o helper amarelo existente ja comunica o estado "nao reconhecido" sem ruido visual

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Nenhum. Build + lint verdes em cada tarefa; os 3 `setLinhas([])` existentes (inicio manual, pos-submit e cancelar editor) estao fora do fluxo do modal, confirmado por inspecao.
- Nota de execucao: as duas tarefas alteram o mesmo arquivo; para manter commits atomicos, as mudancas da task 2 foram temporariamente revertidas, verificadas e commitadas a task 1, e reaplicadas em seguida (sem perda de trabalho).

## Known Stubs
Nenhum. Nenhum valor placeholder, mock ou componente sem fonte de dados foi introduzido.

## Threat Flags
Nenhum. A unica superficie nova (browser→API em `POST /itens/inline`) ja estava registrada no threat model do plano (T-08-09, mitigada por validacoes locais + revalidacao do backend). Nenhum endpoint, rota de auth ou mudanca de schema novo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- IMP-03, IMP-04 e IMP-05 satisfeitos na UI de Entregas (backend ja entregue em 08-03/08-04)
- Backstop manual pendente da fase (08-VALIDATION.md): XML sem correspondencia → sugestoes → cadastro inline → submit sem perder rascunho
- Proximos planos da onda 5 (08-08 PainelCozinha, 08-09 Projecao) nao dependem deste plano alem do catalogo de itens ja existente

---

*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED
- FOUND: frontend/src/pages/admin/Entregas.tsx
- FOUND: frontend/src/pages/admin/Entregas.css
- FOUND: .planning/phases/08-improvements/08-06-SUMMARY.md
- FOUND: commit dc6b926 (task 1)
- FOUND: commit ccd2d2b (task 2)
