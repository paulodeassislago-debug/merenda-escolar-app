---
phase: 08-improvements
plan: 04
subsystem: frontend
tags: [matching, normalizacao, similaridade, typescript, determinismo]

# Dependency graph
requires:
  - phase: 05-p-ginas-admin-frontend
    provides: "padrão normalizarTexto (caixa/NFD/acentos) em frontend/src/pages/admin/nfe.ts — base estendida para tokens"
provides:
  - "Módulo puro TS frontend/src/pages/admin/matching.ts: normalizar, tokenizar, ABREVIACOES, expandirTokens, similaridade, ScoreSimilaridade, SugestaoCandidato<T>, SugestaoFornecedor, sugerirCandidatos"
  - "Score explicável de similaridade por tokens ('Todas as N palavras batem' / 'K de N palavras batem' / 'Nenhuma palavra coincide') — D-21/R-6"
  - "Sugestões assistivas top-N com confiança (2 casas) e motivo, sem qualquer associação automática (D-22)"
affects: [08-05 (autocomplete de fornecedor), 08-06 (sugestões em linhas XML)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo .ts puro sem JSX (regra react-refresh), extensão determinística de normalizarTexto para tokens + abreviações"
    - "Verificação de aceite via script node com type stripping (node ≥ 22.18) + gates build/lint"

key-files:
  created: [frontend/src/pages/admin/matching.ts]
  modified: []

key-decisions:
  - "ABREVIACOES com chaves/valores sempre normalizados (formato normalizado: expandido) — chave acentuada seria inalcançável após normalizar()"
  - "normalizar() aplica trim final após colapso de espaços — pontuação pode reintroduzir bordas"
  - "SugestaoFornecedor entregue como alias de SugestaoCandidato<Fornecedor> (must_haves do plano), consumido pela 08-05"

patterns-established:
  - "Pattern 1: matching determinístico client-side sem dependência nova; dicionário de abreviações extensível sem mudar contrato"
  - "Pattern 2: sugestões retornam apenas candidatos — associação sempre decisão explícita da UI (D-22); módulo sem rede/armazenamento (D-24)"

requirements-completed: [IMP-04, IMP-05]

# Metrics
duration: 3min
completed: 2026-08-05
---

# Phase 8 Improvements Plan 04: Matching determinístico Summary

**Motor de correspondência determinístico em `frontend/src/pages/admin/matching.ts`: normalização local (caixa, acentos, pontuação, espaços, tokens), dicionário curto de abreviações, score explicável de similaridade e sugestões assistivas top-N com confiança e motivo — sem IA, sem dependência nova e sem associação automática (D-21..D-24)**

## Performance

- **Duration:** 3 min (start 14:28:45Z → 14:31:28Z; build+lint inclusos)
- **Started:** 2026-08-05T14:28:45Z
- **Completed:** 2026-08-05T14:31:28Z
- **Tasks:** 2
- **Files modified:** 1 (criado)

## Accomplishments
- `normalizar()` determinístico (lowercase, trim, NFD + remoção de acentos, pontuação → espaço, colapso de espaços, trim final) estendendo o padrão de `nfe.ts` para tokens — `normalizar('  MÚSCULO  BOVINO, T1!!  ') === 'musculo bovino t1'` comprovado por script.
- `ABREVIACOES` com 27 entradas de merenda escolar/fornecedores (carnes, estado de conservação, unidades, PJ) + `expandirTokens()`; `similaridade()` com score = comuns/max(lado maior) e motivo legível em PT-BR — determinístico (mesma entrada → mesmo score, verificado).
- `sugerirCandidatos()`: top-N (padrão 3) ordenado por confiança decrescente (desempate por nome asc), confiança arredondada a 2 casas, nunca retorna score 0, nunca vincula (D-22); `SugestaoCandidato<T>` genérico + alias `SugestaoFornecedor` para a 08-05.
- Gates verdes: `npm run build` (typecheck) e `npm run lint`; grep `localStorage|fetch|axios` → 0 (sem persistência — D-24 adiado).

## task Commits

Cada tarefa foi commitada atomicamente:

1. **task 1: normalizar(), ABREVIACOES e similaridade()** - `9b94d3b` (feat)
2. **task 2: sugerirCandidatos() com confiança e motivo** - `a8ea6f4` (feat)

## Files Created/Modified
- `frontend/src/pages/admin/matching.ts` - módulo .ts puro (sem JSX): normalizar, tokenizar, ABREVIACOES, expandirTokens, ScoreSimilaridade, similaridade, SugestaoCandidato<T>, SugestaoFornecedor, sugerirCandidatos. Sem rede/armazenamento (D-24).

## Decisions Made
- Seguido o plano conforme D-21..D-24; ver auto-fixes abaixo para ajustes de detalhe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] normalizar() podia reter espaços nas bordas**
- **Found during:** task 1 (criação de normalizar)
- **Issue:** `.trim()` rodava antes das transformações (pontuação → espaço e colapso `\s+` → ' '), então entradas com pontuação/espaços no fim (ex.: `"T1!!  "`) produziam `"musculo bovino t1 "` com espaço final — contrariando o exemplo de aceite `'musculo bovino t1'`.
- **Fix:** `.trim()` final após o colapso de espaços.
- **Files modified:** frontend/src/pages/admin/matching.ts
- **Verification:** script node — `normalizar('  MÚSCULO  BOVINO, T1!!  ') === 'musculo bovino t1'` PASS.
- **Committed in:** 9b94d3b (task 1)

**2. [Rule 1 - Trivial] Chave `suína` do dicionário normalizada para `suina`**
- **Found during:** task 1 (ABREVIACOES)
- **Issue:** o snippet do plano incluía a chave `suína` acentuada, contradizendo a regra do próprio plano ("as chaves já normalizadas") — tokens são normalizados antes do lookup, então uma chave acentuada jamais casaria.
- **Fix:** chave escrita como `suina: 'suina'` (formato `normalizado: expandido` mantido).
- **Files modified:** frontend/src/pages/admin/matching.ts
- **Verification:** script node — expandirTokens/ABREVIACOES PASS.
- **Committed in:** 9b94d3b (task 1)

**3. [Rule 1 - Bug] Comentário disparava o grep gate do próprio plano**
- **Found during:** task 2 (verificação de aceite)
- **Issue:** o comentário de cabeçalho continha os tokens literais `fetch`/`axios`/`localStorage` ("sem fetch/axios/localStorage neste módulo"), fazendo o grep gate `localStorage|fetch|axios → 0` retornar 1.
- **Fix:** comentário reescrito sem os tokens literais: "módulo sem efeitos de rede nem armazenamento local".
- **Files modified:** frontend/src/pages/admin/matching.ts
- **Verification:** `grep -c -E "localStorage|fetch|axios"` → 0.
- **Committed in:** a8ea6f4 (task 2)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 trivial)
**Impact on plan:** Todos os auto-fixes necessários para os critérios de aceite e gates do plano. Sem escopo creep.

## Issues Encountered
- Script de verificação (fora do repositório, /tmp/opencode): o primeiro rascunho do teste esperava "3 de 4 palavras batem" para 3 tokens vs 2 tokens — a implementação estava correta ("2 de 3", conforme K=comuns, N=maior lado); expectativa do teste corrigida. `import type` em `.mjs` exige extensão `.mts` no node com type stripping.
- `SugestaoFornecedor` (must_haves do plano) é type-only e não existe em runtime — validado via typecheck (build) e `import type` no script.

## User Setup Required
None - sem serviços externos; módulo client-side puro.

## Next Phase Readiness
- Base pronta para 08-05 (autocomplete de fornecedor com `sugerirCandidatos(emitente, fornecedores)` + prefill XML confirmável com confiança ≥ 0.6) e 08-06 (sugestões em linhas XML com itemId null, motivo legível, seleção explícita do usuário).
- Nenhuma associação automática e nenhuma persistência de aliases (D-24 permanece adiado).

---

*Phase: 08-improvements*
*Completed: 2026-08-05*

## Self-Check: PASSED
- FOUND: frontend/src/pages/admin/matching.ts
- FOUND: .planning/phases/08-improvements/08-04-SUMMARY.md
- FOUND: 9b94d3b (task 1 commit)
- FOUND: a8ea6f4 (task 2 commit)
- Gates: `cd frontend && npm run build` ✓ | `npm run lint` ✓ | grep `localStorage|fetch|axios` → 0 ✓
