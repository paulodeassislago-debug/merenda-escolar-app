---
phase: 05-páginas-admin-frontend
fixed_at: 2026-08-02T00:00:00Z
review_path: .planning/phases/05-p-ginas-admin-frontend/05-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report — Páginas Admin Frontend

**Fixed at:** 2026-08-02
**Source review:** `.planning/phases/05-p-ginas-admin-frontend/05-REVIEW.md`
**Iteration:** 1
**Verification:** Tier 1 (re-read) — syntax check unavailable in worktree (untracked `api.ts` prevents `tsc`)

**Summary:**
- Findings in scope (CR+WR): 6
- Fixed: 6
- Skipped: 0
- Info findings skipped: 4 (IN-01 through IN-04 — outside fix_scope=critical_warning)

## Fixed Issues

### CR-01: Entregas.tsx — Ação `'alterado'` nunca é aplicada; reversão de quantidade quebrada

**Files modified:** `frontend/src/pages/admin/Entregas.tsx`
**Commit:** `b85aa31`
**Applied fix:** Three defects fixed in the justification flow:

1. **Defect A** — `atualizarQuantidade` now defers quantity application: opens the modal with `quantidadePendente` stored in state, does NOT mutate `linhas` before confirmation. Only for lines already `acao: 'alterado'` is the quantity applied immediately (free editing within the same acao).

2. **Defect B** — `cancelarJustificativa` no longer needs to revert quantity because it's never prematurely applied. For 'excluído', it reverts `removida` and `acao` as before. For 'alterado', it simply closes the modal.

3. **Defect C** — `confirmarJustificativa` now correctly sets `acao: 'alterado'` and applies the pending `quantidadePendente` when the user confirms. The `justificativaPendente` state type was extended with optional `quantidadePendente?: number`.

Result: The submit guard (`semJustificativa` filter) now correctly detects lines with `acao: 'alterado'` that lack justification, enforcing PNAE audit trail requirements.

### CR-02: Planejamento.tsx — Falha parcial no salvamento deixa estado cliente/servidor inconsistente

**Files modified:** `frontend/src/pages/admin/Planejamento.tsx`
**Commit:** `afc0a0f`
**Applied fix:** Added `await carregarDados()` inside the `catch` block of `handleSalvar`, after setting the error message but before `finally`. This ensures that after a partial save failure (e.g., slot N fails after slots 1..N-1 were already persisted), the UI is re-synced with the actual server state. The user still sees the error but the grid reflects what was actually saved.

### WR-01: Entregas.tsx — `style={{}}` inline viola UI-SPEC anti-pattern

**Files modified:** `frontend/src/pages/admin/Entregas.tsx`, `frontend/src/pages/admin/Entregas.css`
**Commit:** `da67585`
**Applied fix:** Removed the `style={{ border: '...' }}` inline style from the justificativa textarea. Added `.campo-auditoria-preenchido` CSS class to `Entregas.css` with `border: 1px solid var(--borda)`. The textarea now uses only className-based border toggling: `.campo-auditoria` (yellow border, empty state) and `.campo-auditoria-preenchido` (border color, filled state).

### WR-02: Receitas.tsx — Sem guarda para `cardapioId` inválido (NaN)

**Files modified:** `frontend/src/pages/admin/Receitas.tsx`
**Commit:** `3c7ee92`
**Applied fix:** Added a guard after all hooks (to respect React's rules of hooks) and before the JSX return: if `isNaN(cardapioId) || cardapioId <= 0`, renders an error message "ID do prato inválido. Volte ao cardápio e selecione um prato." instead of making fetches with NaN in the URL.

### WR-03: Múltiplas páginas — Tratamento de erro 401 inconsistente

**Files modified:** `frontend/src/pages/admin/Dashboard.tsx`, `frontend/src/pages/admin/Usuarios.tsx`, `frontend/src/pages/admin/Cardapio.tsx`, `frontend/src/pages/admin/Receitas.tsx`, `frontend/src/pages/admin/Planejamento.tsx`
**Commit:** `5774008`
**Applied fix:** Added `err.status === 401` checks in all fetch catch blocks across 5 pages, matching the pattern already present in `Itens.tsx` and `Entregas.tsx`. When a 401 is detected, the error message is "Sua sessão expirou. Entre novamente." — directing the user to re-login rather than showing a generic error. Applied to both `useEffect` initial fetches and `carregar*` refetch functions.

### WR-04: Dashboard.tsx — Falta botão "Tentar novamente" no estado de erro

**Files modified:** `frontend/src/pages/admin/Dashboard.tsx`
**Commit:** `4c124f9`
**Applied fix:** Extracted the inline fetch logic from `useEffect` into a named `carregarDashboard` function with proper loading/error state management and 401 detection. The `useEffect` now calls `carregarDashboard()`. The error state now renders a `<div>` with both the error message and a "Tentar novamente" secondary button that calls `carregarDashboard`. This matches the UI-SPEC requirement (line 116: "Error state + inline 'Tentar novamente' button").

## Skipped Issues

None — all 6 in-scope findings (2 CR + 4 WR) were successfully fixed.

---

_Fixed: 2026-08-02_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_