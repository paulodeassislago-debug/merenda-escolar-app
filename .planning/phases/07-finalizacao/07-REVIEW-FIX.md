---
phase: 07-finalizacao
fixed_at: 2026-08-05T11:43:27Z
review_path: .planning/phases/07-finalizacao/07-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-08-05T11:43:27Z
**Source review:** `.planning/phases/07-finalizacao/07-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03 — critical_warning scope; Info findings out of scope)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `text-transform: capitalize` corrupts the pt-BR date

**Files modified:** `frontend/src/pages/CardapioPublico.css`
**Commit:** af22d2c
**Applied fix:** Removed `text-transform: capitalize;` from `.publico-data`. The pt-BR `toLocaleDateString` output ("sexta-feira, 5 de agosto de 2026") now renders with correct orthography instead of "Sexta-feira, 5 De Agosto De 2026". Replaced with a comment explaining why the property must not return.

### WR-02: Unvalidated payload shape can crash the whole app during render

**Files modified:** `frontend/src/pages/CardapioPublico.tsx`
**Commit:** 025887e
**Applied fix:** Defense in depth at both layers suggested by the review:
- Store-time guard: `.then((resposta) => setRefeicoes(Array.isArray(resposta) ? resposta : []))` — a 200 with `null`/object/string can no longer enter state.
- Render-time guard: `normalizarQuatroSlots` now returns the four-slot "A definir" grid for any non-array input, so even a bad payload cannot throw a TypeError during render (no ErrorBoundary in `main.tsx`).

### WR-03: Disclosure label desyncs from the DOM after a retry

**Files modified:** `frontend/src/pages/CardapioPublico.tsx`
**Commit:** edd4dfb
**Applied fix:** `carregarCardapio` now resets the mirrored state with `setIngredientesAbertos({})` alongside `setRefeicoes([])`. After an error + "Tentar novamente", the re-mounted `<details>` elements (natively closed) now show "Ver ingredientes" instead of the stale "Ocultar ingredientes".

## Verification

Each fix verified with the project's real gate — `npm run build` (runs `tsc -b` typecheck + `vite build`) — after WR-02 and WR-03, plus Tier 1 re-read of every modified section. Both runs passed clean (no type errors, 94 modules transformed).

**Where verification ran:** the isolated review-fix worktree (`/tmp/sv-07-reviewfix-*`, branch `gsd-reviewfix/07-415879`), with `frontend/node_modules` symlinked from the main checkout (the worktree has no node_modules by design). The build is reproducible from the main checkout after the fast-forward since the symlinked node_modules is the same directory the main checkout uses.

## Skipped Issues

None — all in-scope findings were fixed. Info findings (IN-01…IN-05) were out of scope per `fix_scope: critical_warning`.

---

_Fixed: 2026-08-05T11:43:27Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
