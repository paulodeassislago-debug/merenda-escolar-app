# Phase 07: Finalizacao - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 5 planned/conditional files
**Analogs found:** 5 / 5 (role-match or direct baseline; no exact native-disclosure analog)

## Scope and file inventory

The phase should preserve `frontend/src/App.tsx` (the public `/cardapio` route), `backend/main.py`, and the backend test files. The implementation recommendation is to modify only the existing public page and stylesheet, plus create the two acceptance artifacts. `frontend/src/types.ts` is conditional: modify it only if the public response type is promoted from the page; otherwise keep the current local type.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/pages/CardapioPublico.tsx` | component/page | request-response + transform | existing `CardapioPublico.tsx`, `Dashboard.tsx`, `DashboardGestao.tsx` | direct baseline + role-match |
| `frontend/src/pages/CardapioPublico.css` | component stylesheet | view-state/presentation | existing `CardapioPublico.css`, `DashboardGestao.css`, `PainelCozinha.css` | direct baseline + role-match |
| `frontend/src/types.ts` *(only if promoted)* | shared model/contract | request-response | existing interfaces in `types.ts`, `PainelCozinha.tsx` imports | role-match |
| `.planning/phases/07-finalizacao/07-VALIDATION.md` | validation/config artifact | batch verification | `05-VALIDATION.md`, `06-VALIDATION.md` | exact artifact role |
| `.planning/phases/07-finalizacao/07-UAT.md` | acceptance/test artifact | manual request-response workflow | `05-UAT.md`, `06-UAT.md` | exact artifact role |

## Pattern Assignments

### `frontend/src/pages/CardapioPublico.tsx` (component/page, request-response + transform)

**Analog:** existing `frontend/src/pages/CardapioPublico.tsx` for the ceremonial public shell; `frontend/src/pages/admin/Dashboard.tsx` and `frontend/src/pages/DashboardGestao.tsx` for the repository HTTP/state pattern.

**Preserve the existing public shell** (`CardapioPublico.tsx:46-95`):

```tsx
<div className="publico-container">
  <header className="publico-header">
    <img src={logoNancy} alt="Brasão do Colégio Estadual do Campo Nancy de Castro Esteves" className="publico-logo" />
    <h1>Colégio Estadual do Campo Nancy de Castro Esteves</h1>
    <p className="publico-data">Cardápio de {formatarDataHoje()}</p>
  </header>
  <main className="publico-conteudo">{/* loading/error/empty/menu states */}</main>
  <footer className="publico-footer">Merenda escolar em conformidade com o PNAE</footer>
</div>
```

**Imports and API call:** replace the page's raw `fetch` (`CardapioPublico.tsx:4-7,35-44`) with the established typed helper. `Dashboard.tsx:3-6,13-29` is the closest small-page example:

```tsx
// Target-relative imports follow PainelCozinha.tsx:1-8; the loader lifecycle
// follows Dashboard.tsx:13-29.
import { ApiError, fetchJson } from '../api';
import { SLOTS_REFEICAO } from './admin/constants';
import './CardapioPublico.css';

const carregarDashboard = () => {
  setCarregando(true);
  setErro(null);
  fetchJson<RefeicaoPublica[]>('/publico/cardapio')
    .then((res) => setDados(res))
    .catch((err) => {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
    })
    .finally(() => setCarregando(false));
};
```

For this public page use `fetchJson<RefeicaoPublica[]>('/publico/cardapio')`, not `API_BASE_URL` or another wrapper. The helper's concrete contract is `api.ts:23-43`: it adds `Authorization` only when a token exists, parses `detail`, and throws `ApiError`; therefore the public request remains anonymous while using the common error path.

**Retry and independent states:** copy the reset/retry lifecycle from `Dashboard.tsx:13-29,44-52` or the race-safe version from `DashboardGestao.tsx:101-117`:

```tsx
const carregarDashboard = () => {
  setCarregando(true);
  setErro(null);
  // fetchJson(...).then(...).catch(...).finally(() => setCarregando(false))
};

{carregando && <p className="aviso">Carregando…</p>}
{erro && (
  <div className="aviso aviso-erro" role="alert">
    <p>{erro}</p>
    <button type="button" className="btn-secundario" onClick={carregarDashboard}>
      Tentar novamente
    </button>
  </div>
)}
```

Adapt the copy to the UI contract exactly: `Carregando cardápio…`; `Não foi possível carregar o cardápio de hoje. Tente novamente.`; and `Tentar novamente`. Keep the shell rendered while loading, and do not render synthesized `A definir` cards until a successful response has settled.

**Fixed four-slot normalization:** use the existing single source of truth, not a second literal or the three-type vocabulary. `frontend/src/pages/admin/constants.ts:6-8` defines:

```ts
export const TIPOS_REFEICAO = ['Lanche', 'Almoço', 'Janta'] as const;
export const SLOTS_REFEICAO = ['Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Janta'] as const;
```

The established render pattern is `SLOTS_REFEICAO.map` plus `find` in `PainelCozinha.tsx:451,516-524` and `DashboardGestao.tsx:269-274`. Normalize the sparse `/publico/cardapio` array by indexing `tipo_refeicao`, then map exactly `SLOTS_REFEICAO`; synthesize `{ nome_refeicao: null, ingredientes: [] }` for absent slots. Do not sort by the API's returned order. `backend/main.py:1118-1148` sorts by slot text and omits absent slots, so client normalization is required.

**Dish-first and partial-data rendering:** retain the semantic hierarchy from the UI contract: labelled `section` → slot label → prominent dish heading → optional disclosure. Use `A definir` for absent slot or null dish; keep a non-null dish visible when `ingredientes` is empty and show `Ingredientes não informados.`; for a null item name render `Ingrediente não informado`. Render only `item_nome` as ordinary React text children. Never render `quantidade` or `medida_caseira`, and never use `dangerouslySetInnerHTML`.

**Native disclosure:** no existing JSX uses `<details>/<summary>` or `aria-expanded` (repository search found no analog). Use the UI-SPEC-native semantic pattern rather than inventing a custom keydown state:

```tsx
{refeicao.ingredientes.length > 0 && (
  <details className="publico-ingredientes-detalhes">
    <summary>Ver ingredientes ({refeicao.ingredientes.length})</summary>
    <ul>{refeicao.ingredientes.map((ing, index) => (
      <li key={`${ing.item_nome ?? 'ingrediente'}-${index}`}>
        {ing.item_nome ?? 'Ingrediente não informado'}
      </li>
    ))}</ul>
  </details>
)}
```

Native disclosure supplies keyboard activation and an accessible name; update the summary label to `Ocultar ingredientes` when the open state needs to be announced, or use the equivalent accessible native treatment. Do not add a second abstraction or dependency. The exact required behavior is in `07-UI-SPEC.md:100-105`.

**Validation and errors:** follow `DashboardGestao.tsx:59-75` for a `role="alert"` block with an action, and `DashboardGestao.tsx:243-245` for `role="status"`/`aria-live="polite"`. The successful zero-item response must show the exact empty heading/body while still rendering four `A definir` cards; an API failure must not show stale or fabricated cards.

### `frontend/src/pages/CardapioPublico.css` (component stylesheet, view-state/presentation)

**Analog:** current `CardapioPublico.css` (`:3-108`) is the baseline shell and token vocabulary; `DashboardGestao.css` and `PainelCozinha.css` are the stronger responsive/accessibility analogs.

**Preserve tokens and shell:** keep `var(--fundo)`, `var(--branco)`, `var(--verde-escuro)`, `var(--verde-vivo)`, `var(--borda)`, `var(--raio)`, `var(--sombra-card)`, `var(--fonte-serif)`, and `var(--fonte-sans)`. The existing public header/card/footer treatment is concrete at `CardapioPublico.css:3-17,19-40,67-108`; do not add colors, gradients, Tailwind utilities, or a component library.

**Responsive grid:** replace `repeat(auto-fit, minmax(260px, 1fr))` (`CardapioPublico.css:61-65`) with explicit contract breakpoints: 1 column at 320–599px, 2 at 600–959px, 4 at 960px+. `DashboardGestao.css:365-413` demonstrates the project breakpoint style, including two columns at the intermediate width and one on mobile; `DashboardGestao.css:284-300` demonstrates `repeat(4, minmax(0, 1fr))` and `min-width: 0` for four-slot cards.

**Focus and hit area:** copy the repository-wide focus treatment from `PainelCozinha.css:90-128` or `DashboardGestao.css:356-363`:

```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid var(--verde-vivo);
  outline-offset: 2px;
}
```

Apply the equivalent to `summary:focus-visible`; ensure the disclosure control has at least 44px height/padding. Keep natural wrapping for dish and ingredient names (`overflow-wrap: anywhere` is used for long content at `DashboardGestao.css:253-256,320-325`), with no ellipsis, clipping, fixed single line, or horizontal page overflow.

**State styling:** retain the existing `publico-erro` red token (`CardapioPublico.css:51-59`) and give loading, empty, and error distinct styles/copy. `DashboardGestao.css:183-218` shows the local convention for centered status/empty states and red bordered `role="alert"` state. Use the green accent only for the 3px card top rule, disclosure cue/open state, and focus ring as required by `07-UI-SPEC.md:58-71`.

### `frontend/src/types.ts` (shared model/contract, request-response; conditional)

**Analog:** existing API-shaped interfaces in `frontend/src/types.ts:57-79` and type-only consumption in `PainelCozinha.tsx:4-8`:

```ts
export interface PlanejamentoEntrada {
  id: number;
  dia_semana: number;
  tipo_refeicao: string;
  cardapio_item_id: number;
  nome_refeicao: string;
  data_inicio_vigencia: string;
}

export interface ReceitaItem {
  id: number;
  cardapio_item_id: number;
  item_id: number;
  item_nome?: string;
  quantidade: number;
  medida_caseira: string;
}
```

If promoted, add one public response shape matching `backend/main.py:1131-1147` (nullable `nome_refeicao`, `ingredientes`, nullable `item_nome`, and technical fields retained for deserialization). Import it with `import type`. Do not create a competing shape with different names, and do not remove technical fields from the transport type merely because JSX must not display them. Keeping the current local `IngredientePublico`/`RefeicaoPublica` in `CardapioPublico.tsx:9-19` is valid and preferred if no other consumer needs the contract.

### `.planning/phases/07-finalizacao/07-VALIDATION.md` (validation artifact, batch verification)

**Analog:** `06-VALIDATION.md:8-21` for the automated-gate contract and `05-VALIDATION.md:18-35,39-56` for infrastructure, sampling, and per-task mapping.

Use frontmatter with phase/status/validation fields, then record the fixed gates as a table. The concrete Phase 6 pattern is:

```markdown
## Automated gates

| Surface | Command | Purpose |
|---|---|---|
| Frontend | `cd frontend && npm run build` | Typecheck and production bundle |
| Frontend | `cd frontend && npm run lint` | Zero lint warnings/errors |
| Phase gate | `cd backend && source venv/bin/activate && pytest tests/ -q` | Full backend baseline remains green |
```

For Phase 7 add targeted public/flow commands from `07-RESEARCH.md`: `pytest tests/test_publico.py -q` and `pytest tests/test_refeicoes.py tests/test_planejamento.py -q`. Preserve the directory rule: backend commands run from `backend/` with the venv active. Include a manual acceptance mapping for PUBLIC-02, QUAL-05, and QUAL-06, plus the rule that any failed gate/check blocks completion. Do not add Playwright, frontend test packages, CI/CD, or a backend source change.

### `.planning/phases/07-finalizacao/07-UAT.md` (acceptance artifact, manual request-response workflow)

**Analog:** `06-UAT.md:13-18,21-51,53-63` for automated evidence, named flow tests, and summary; `05-UAT.md:13-54,56-67` for `expected`/`result` entries and prior-flow evidence.

Use the same lightweight frontmatter and explicit numbered tests:

```markdown
### 1. F13 — Planejamento do dia na cozinha
expected: ...
result: pass

## Summary
total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0
```

The new artifact must list every F1–F17, with preconditions, steps, observed result, status, and source/command. Reconstruct F1–F5 explicitly as authentication flows: valid profile redirects, invalid-login alert, unauthenticated `/admin` redirect to `/`, admin opening `/cozinha` redirects to `/admin`, and logout returns to `/` while removing both `pnae_token` and `pnae_usuario`. The current code evidence is `Login.tsx:19-30,79-87`, `ProtectedRoute.tsx:15-25`, `auth-context.ts:22-30`, `auth.tsx:55-60`, and `Layout.tsx:47-50`.

Carry F6–F12 from `05-UAT.md` and F13–F15 from `06-UAT.md` as prior evidence, retaining their source references and re-running anything affected by the controlled dataset. Record F16–F17 as the new public-menu checks. The public checks must cover anonymous access, exact four-slot order and `A definir`, dish-first hierarchy, name-only ingredient disclosure, native keyboard/focus behavior, loading/error/empty/partial states, and 320px/768px/desktop no-overflow behavior.

For QUAL-06 record the controlled before/after balance, submitted quantity and measure, conversion factor, final adjusted quantity, and the persisted audit fields (`quantidade_original`, `quantidade_ajustada`, `medida_caseira`, `justificativa`). The backend test analogs are `test_refeicoes.py:31-47` (conversion and deduction), `:72-88` (failed conversion leaves balance unchanged), and `:184-247` (adjustment justification, audit, and final balance).

## Shared Patterns

### Public API contract and authorization boundary

**Sources:** `backend/main.py:37-42,1118-1148`, `backend/tests/test_publico.py:39-71`, `frontend/src/App.tsx:23-25`.

```python
SLOTS_PLANEJAMENTO = ["Lanche da Manhã", "Almoço", "Lanche da Tarde", "Janta"]

@app.get("/publico/cardapio")
def cardapio_publico(data: date | None = None, db: Session = Depends(get_db)):
    data_ref = data or date.today()
    # ... active planning for the weekday; absent slots are omitted
    return resultado
```

Preserve `GET /publico/cardapio`, its optional `data`, no-auth boundary, and response fields. Backend tests prove anonymous access and settled `[]` for an unplanned day; they intentionally do not prove client-side four-slot normalization or output privacy. Do not add a public auth guard or new aggregation endpoint.

### Slot/type vocabulary

Use `SLOTS_REFEICAO` for public display. `TIPOS_REFEICAO` is only the three meal types (`Lanche`, `Almoço`, `Janta`); never merge the two snack slots. `test_planejamento.py:171-205` is the regression pattern proving both `Lanche da Manhã` and `Lanche da Tarde` accept a `Lanche` dish.

### Authentication regression evidence

**Sources:** `ProtectedRoute.tsx:15-25`, `auth-context.ts:22-30`, `auth.tsx:55-60`, `Layout.tsx:47-50`.

```tsx
if (!isAuthenticated || !usuario) return <Navigate to="/" replace />;
if (perfis && !perfis.includes(usuario.perfil)) {
  return <Navigate to={ROTA_POR_PERFIL[usuario.perfil]} replace />;
}

const logout = useCallback(() => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
  setToken(null);
  setUsuario(null);
}, []);
```

Apply this only to UAT evidence; the public page itself stays outside `ProtectedRoute`.

### Conversion → deduction → meal → audit

**Sources:** `backend/tests/test_refeicoes.py:31-47,72-88,184-247` and `backend/main.py:871-982`.

The accepted evidence pattern is: prove a registered conversion; submit the measure; verify `before - (quantity * conversion factor) = after`; then read meal history and record original/scaled, adjusted, measure, and justification. Also prove that missing conversion or insufficient stock produces an error without a partial balance/audit change. This is a validation concern, not frontend logic to duplicate.

### Responsive and accessibility styling

**Sources:** `DashboardGestao.css:220-223,253-256,356-363,365-413` and `PainelCozinha.css:90-128,479-527`.

Use token-based surfaces, `min-width: 0`, natural wrapping, explicit responsive columns, 44px controls, and visible `:focus-visible`. Keep the public page's logo on the existing white header surface.

## No Analog Found

| Concern | Role/Data Flow | Why no analog | Planning source |
|---|---|---|---|
| Native ingredient disclosure with exact `Ver ingredientes` / `Ocultar ingredientes` behavior | component, request-response view state | No existing JSX uses `<details>/<summary>` or `aria-expanded`; use the browser-native semantics required by the UI contract instead of copying a custom control. | `07-UI-SPEC.md:100-105,130-148` |
| Four-slot public normalization of a sparse response | component, transform | Existing kitchen/management pages render `SLOTS_REFEICAO`, but no page converts `/publico/cardapio`'s omitted entries into four public cards. | `backend/main.py:1122-1147`; `07-UI-SPEC.md:95-113` |

## Metadata

**Analog search scope:** `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/api.ts`, `frontend/src/types.ts`, `frontend/src/index.css`, `backend/main.py`, `backend/tests/`, and prior `.planning/phases/05-*`/`06-*` validation artifacts.
**Project skills:** no repository-local `.claude/skills/` or `.agents/skills/` directory was present.
**Files scanned:** 20+ implementation, contract, test, and prior-acceptance files.
**Pattern extraction date:** 2026-08-04
