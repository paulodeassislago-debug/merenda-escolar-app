---
phase: 07-finalizacao
reviewed: 2026-08-05T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - .gitignore
  - frontend/src/pages/CardapioPublico.tsx
  - frontend/src/pages/CardapioPublico.css
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-08-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Adversarial review of the Phase 07 (finalizacao) public cardápio work: `CardapioPublico.tsx`, `CardapioPublico.css`, and `.gitignore`. Cross-file verification performed against the real contract: `GET /publico/cardapio` (`backend/main.py:1118-1148`), `SLOTS_PLANEJAMENTO` (`backend/main.py:41`), the `/planejamento` upsert (`backend/main.py:615-657`), `fetchJson`/`fetchWithAuth` (`frontend/src/api.ts`), route wiring (`App.tsx:25`), `SLOTS_REFEICAO` (`frontend/src/pages/admin/constants.ts:8`), `Planejamento.tsx` slot usage, `main.tsx` (StrictMode, no ErrorBoundary), and `index.css` CSS variables.

**Verified correct:**
- Slot names match 1:1 across frontend (`SLOTS_REFEICAO`) and backend (`SLOTS_PLANEJAMENTO` = `['Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Janta']`), so `normalizarQuatroSlots` correctly maps sparse responses; planning entries created in `Planejamento.tsx` use the same names, so the public page will actually match planned meals.
- No XSS vectors: all database-controlled strings rendered as React text nodes; no `dangerouslySetInnerHTML`.
- Public route has no auth wrapper; endpoint has no auth dependency — the page works without login. The stale-JWT header sent by `fetchWithAuth` is harmless since the endpoint ignores auth.
- Error/retry, loading, empty, and per-slot fallback states are distinct and reachable.
- `.gitignore` change is functional: `backend/merenda.db.bak-20260804` exists on disk and `git status` is clean — no tracked-then-ignored database files.
- CSS variables all resolve (`--erro`, `--raio`, `--sombra-card`, `--verde-vivo`, `--verde-escuro`, `--texto-suave`, `--fonte-serif`, `--fonte-sans` in `index.css`).

No critical issues found. Three warnings (one visible rendering defect, two robustness gaps) and five info items below.

## Warnings

### WR-01: `text-transform: capitalize` corrupts the pt-BR date

**File:** `frontend/src/pages/CardapioPublico.css:47`
**Issue:** `text-transform: capitalize` capitalizes the first letter of **every word**. `toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })` returns lowercase ("sexta-feira, 5 de agosto de 2026"), so the rendered header becomes "Sexta-feira, 5 De Agosto De 2026" — prepositions "De" capitalized, breaking standard pt-BR orthography. This is the most visible surface of the page (public kiosk/TV screen).
**Fix:** Remove the rule; the locale output is already correct:
```css
.publico-data {
  margin: 0;
  font-family: var(--fonte-serif);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--texto-suave);
  /* remove: text-transform: capitalize; */
}
```

### WR-02: Unvalidated payload shape can crash the whole app during render

**File:** `frontend/src/pages/CardapioPublico.tsx:55-56, 36`
**Issue:** `fetchJson` only checks `resposta.ok` (`api.ts:38-42`); a 200 with `null`, an object, or a string passes through and is stored via `setRefeicoes(resposta)`. `normalizarQuatroSlots` then calls `resposta.map(...)` **during render** (line 36, invoked at line 107). A non-array payload throws a TypeError at render time, which the `.catch()` in the fetch chain cannot intercept (it only handles promise rejections). `main.tsx` renders `<App />` with no ErrorBoundary, so the entire frontend white-screens — including the authenticated pages, since the crash happens during React render of the public route. This is the public endpoint of an unauthenticated surface; a backend hiccup (e.g., a future shape change returning `{"detail": ...}` with 200, or a proxy returning `null`) takes down the kiosk with no recovery.
**Fix:** Guard the shape before storing, or inside the normalizer:
```tsx
.then((resposta) => setRefeicoes(Array.isArray(resposta) ? resposta : []))
```
```ts
function normalizarQuatroSlots(resposta: RefeicaoPublica[]): RefeicaoPublica[] {
  if (!Array.isArray(resposta)) return SLOTS_REFEICAO.map((slot) =>
    ({ tipo_refeicao: slot, nome_refeicao: null, ingredientes: [] }));
  // ...
}
```

### WR-03: Disclosure label desyncs from the DOM after a retry

**File:** `frontend/src/pages/CardapioPublico.tsx:49, 54, 66-68, 120-130`
**Issue:** `ingredientesAbertos` mirrors the native `<details>` open state via `onToggle`, but `carregarCardapio` never resets it. Flow to reproduce: user opens a disclosure (state `{ 'Almoço': true }`, DOM open) → a later fetch fails → error state hides the grid → user clicks "Tentar novamente" → grid re-mounts with fresh `<details>` elements (native `open` defaults to closed) while `ingredientesAbertos['Almoço']` is still `true` → the summary label reads "Ocultar ingredientes" on a **closed** disclosure until the user toggles it again. Visible state inconsistency on the public page's primary interaction.
**Fix:** Reset the mirrored state when reloading:
```ts
const carregarCardapio = () => {
  setCarregando(true);
  setErro(null);
  setRefeicoes([]);
  setIngredientesAbertos({});   // ← reset mirror
  // ...
};
```
Alternatively, drop the mirror entirely and derive the label from the DOM: `evento.currentTarget.open` in `onToggle` is the source of truth; use `(e) => e.currentTarget.open ? 'Ocultar ingredientes' : 'Ver ingredientes'` inside a state stored per slot only when needed.

## Info

### IN-01: No request cancellation — overlapping retries can interleave

**File:** `frontend/src/pages/CardapioPublico.tsx:51-64`
**Issue:** `carregarCardapio` fires `fetchJson` with no `AbortController`. Rapid double-clicks on "Tentar novamente" (44px button, easily double-tapped) start overlapping requests; responses resolve out of order and the last writer wins, potentially showing stale data. Additionally, `main.tsx` wraps the app in `StrictMode`, so the empty-dep effect double-fires the fetch in dev. The eslint-disable comment acknowledges the pattern but doesn't fix the race.
**Fix:** Add an `AbortController` per load and ignore stale responses:
```ts
useEffect(() => {
  const controller = new AbortController();
  // pass { signal: controller.signal } into fetchJson and swallow AbortError
  return () => controller.abort();
}, []);
```

### IN-02: Header date (client) vs. fetched menu date (server) can disagree

**File:** `frontend/src/pages/CardapioPublico.tsx:24-31, 55`
**Issue:** The page displays `formatarDataHoje()` computed from the client clock, but the API defaults to server-side `date.today()` (`backend/main.py:1121`). A kiosk/TV with a drifted clock, or a request crossing midnight while server and client are in different timezones, shows the header date of day X with the menu of day Y. No way for the user to detect the mismatch.
**Fix:** Pass the date explicitly so both sides agree: `fetchJson('/publico/cardapio?data=' + formatISO(new Date()))` using the same local-date formatting as the header — or document the single-timezone deployment assumption.

### IN-03: Slot names duplicated across frontend and backend with no drift test

**File:** `frontend/src/pages/CardapioPublico.tsx:37` (`SLOTS_REFEICAO` in `admin/constants.ts:8` vs `SLOTS_PLANEJAMENTO` in `backend/main.py:41`)
**Issue:** The two constants currently match exactly (verified), and `normalizarQuatroSlots` silently drops any response entry whose `tipo_refeicao` is not in the frontend list. If the lists ever drift (backend adds/renames a slot), the public page would render all slots as "A definir" with **no error** — a silent total failure of the feature. No test asserts the contract.
**Fix:** Add a backend test asserting `SLOTS_PLANEJAMENTO == ["Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"]` and a frontend unit test for `normalizarQuatroSlots` covering an unknown-slot response.

### IN-04: `.gitignore` backup pattern is narrower than reality

**File:** `.gitignore:2`
**Issue:** `backend/merenda.db.bak-*` only ignores backups with a dash-suffixed date. A backup named `merenda.db.bak` or `merenda.db.old` (or any future naming from the dev-db backup tooling) would be committed, leaking the dev database (which contains seeded credentials and meal data). Current files are properly ignored (`git status` clean), so this is preventive.
**Fix:** Broaden the pattern: `backend/merenda.db.bak*` or `backend/merenda.db.*`.

### IN-05: JSX indentation inside the slot map is misleading

**File:** `frontend/src/pages/CardapioPublico.tsx:107-141`
**Issue:** The `section`/`details` children of the `.map((refeicao, indice) => (` callback are indented at the same level as the `.map(` call itself, so the JSX tree structure is hard to read (the closing `))}` at line 141 doesn't visually match anything). No lint failure (no formatter enforced), but it degrades maintainability of the phase's central component.
**Fix:** Run Prettier (or re-indent the callback body one level).

---

_Reviewed: 2026-08-05T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
