---
phase: 07
slug: finalizacao
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-04
---

# Phase 07 — UI Design Contract

> Visual and interaction contract for the public menu surface. Generated for the
> Phase 07 planner/executor and verified by gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — established plain React + co-located CSS |
| Preset | not applicable |
| Component library | none |
| Icon library | none; use text labels and native disclosure affordance |
| Font | `var(--fonte-serif)` (Georgia fallback) for institutional/menu titles; `var(--fonte-sans)` for labels, body, states, and controls |

Source: `07-CONTEXT.md`, `PROJECT.md`, `frontend/src/index.css`, and the existing `CardapioPublico` implementation. Do not introduce Tailwind, shadcn, dark mode, or a new component system.

## Spacing Scale

Declared values (all multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Label-to-value and icon/marker gaps |
| sm | 8px | Compact card internals and summary spacing |
| md | 16px | Card padding, grid gap, default content spacing |
| lg | 24px | Header/content section padding |
| xl | 32px | Larger separation between institutional header and menu |
| 2xl | 48px | Desktop page-level vertical breathing room |
| 3xl | 64px | Reserved for large desktop section breaks; do not force on mobile |

Exceptions: disclosure controls must expose at least a 44px-high keyboard/touch hit area, even when the visible label is shorter. Preserve the existing `--raio`, `--sombra-card`, and token-based CSS rather than adding arbitrary values.

## Typography

Use only the two existing weights: regular `400` and bold `700`.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 12px | 700 | 1.2 |
| Heading | 20px | 700 | 1.2 |
| Display | 28px | 700 | 1.2 |

The school name is the display treatment and may wrap naturally on narrow screens. The dish name is the heading treatment and is the dominant content inside each slot card. Use the serif family only for the school name, date, and dish name; all state messages and controls remain sans-serif.

## Color

Use the existing institutional tokens from `frontend/src/index.css`:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--fundo)` / `#F7FAF5` | Page background and visual field |
| Secondary (30%) | `var(--branco)` / `#FFFFFF` | Header, four slot cards, footer, and disclosure surfaces |
| Accent (10%) | `var(--verde-vivo)` / `#48BB2C` | Slot-card top rule, disclosure marker/open state, and the visible focus ring companion; not body copy or every control |
| Destructive | `var(--erro)` / `#B3261E` | Load failure message only; there are no destructive public-menu actions |

Use `var(--verde-escuro)` for the school name, dish names, and high-emphasis headings; use `var(--texto)` and `var(--texto-suave)` for readable body/supporting text. The logo JPG must remain on a white header surface. Do not add gradients, dark mode, or new palette values.

Accent reserved for: the 3px slot-card top border, the disclosure marker/open-state cue, and the 3px `:focus-visible` outline. It is not a general fill color for every interactive or decorative element.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Ver ingredientes` (disclosure control); expanded state changes to `Ocultar ingredientes` |
| Empty state heading | `Nenhum cardápio planejado para hoje.` |
| Empty state body | `Os quatro momentos do serviço permanecem visíveis e aparecem como “A definir” quando não há planejamento.` |
| Error state | `Não foi possível carregar o cardápio de hoje. Tente novamente.` plus the action `Tentar novamente` |
| Destructive confirmation | Não aplicável — a superfície pública é somente leitura e não possui ações destrutivas. |

Additional required copy:

- Service labels, in this exact order: `Lanche da Manhã`, `Almoço`, `Lanche da Tarde`, `Janta`.
- Missing slot or null dish name: `A definir`. This is a normal planning state, never an error style.
- A dish with no recipe/ingredients remains visible by name and shows `Ingredientes não informados.` without inventing quantities or hiding the dish.
- Ingredient fallback for a missing item name: `Ingrediente não informado`; never expose quantity, measure, weight, or recipe metadata publicly.
- Loading status: `Carregando cardápio…`.

## Interaction and Layout Contract

### Page composition

1. Keep the existing public `/cardapio` route and ceremonial shell: light header, school logo, school name, today’s date, menu content, and PNAE footer. No authenticated navigation and no date navigation.
2. The menu content must always normalize the sparse public API response into exactly four visual slot cards in the fixed operational order. The API may omit unplanned slots; omission is rendered as `A definir`.
3. Use a responsive card grid: one column from 320px through 599px, two columns from 600px through 959px, and four columns from 960px upward. Keep the content centered, readable, and free of horizontal scrolling at 320px, 768px, and desktop widths.
4. Each card has this hierarchy: secondary slot label → prominent dish name → optional compact ingredient disclosure. The dish name must be visually stronger and larger than the slot label.

### Ingredient disclosure

- Start every non-empty ingredient list collapsed. The compact control reads `Ver ingredientes` and may include a count, such as `Ver ingredientes (3)`; the count must not expose quantities or measures.
- Prefer native `<details>/<summary>` semantics, or an equivalent button with `aria-expanded` and `aria-controls`. The control must be keyboard-operable with a visible focus ring and a minimum 44px hit area.
- On expansion, show every ingredient name with normal wrapping. Never truncate, ellipsize, clip, or replace names with quantities; the list must remain usable at 320px.
- With zero ingredients, omit the disclosure control and show the documented `Ingredientes não informados.` supporting state. A missing recipe is partial data, not a load error.

### State behavior

- Loading: retain the shell and show `Carregando cardápio…` as a status; do not render `A definir` cards before the request settles.
- Error: show the exact error copy in a visible `role="alert"` region and provide `Tentar novamente`. Do not silently show stale or fabricated menu content.
- Empty response: show the documented empty heading/body and still render all four slot cards as `A definir`, so empty planning is distinct from loading and error.
- Populated response: render all four cards, including any absent slots as `A definir`; preserve the fixed order regardless of API order.
- Partial response: keep a returned dish visible when its recipe is absent, and keep a slot visible when its dish name is null. Do not turn either condition into an error.

## UI Considerations

Applicable state considerations resolved: 8 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Four-slot menu collection | ✅ covered | A zero-item response shows the documented empty notice and still renders four cards with `A definir`. |
| loading | Menu collection | ✅ covered | The shell remains visible with `Carregando cardápio…` as a status; slot placeholders are not misrepresented as `A definir`. |
| error | Menu collection, retry control | ✅ covered | `role="alert"` presents the problem and `Tentar novamente` provides the recovery path; no stale/fabricated content is shown. |
| populated | Four-slot menu collection | ✅ covered | Normal data produces exactly four separate cards in the fixed morning snack → lunch → afternoon snack → dinner order. |
| partial | Slot cards and ingredient disclosure | ✅ covered | Missing slot, null dish, and dish-without-recipe each retain their place and use explicit normal-state copy. |
| overflow | Dish names, ingredient names, card grid | ✅ covered | Long text wraps; expanded lists show every name; the grid must not create horizontal page overflow at 320px. |
| zero-one-many | Ingredient collection | ✅ covered | Zero ingredients has no disclosure; one and many ingredients use the same name-only list treatment, with an optional count in the summary. |
| long-text | School name, date, dish and ingredient names | ✅ covered | Text reflows naturally within cards and header; no clipping, forced single-line layout, or ellipsis is allowed for content names. |

Accessibility requirements that apply in addition to the state matrix:

- Use semantic `header`, `main`, `section`, `footer`, and heading order. Each service card is a labelled section with its slot label and dish heading.
- Preserve a visible `:focus-visible` outline using the institutional green token. Do not rely on color alone to communicate expanded, missing, loading, or error states.
- Keep contrast readable on all light surfaces, provide meaningful logo alt text, and ensure the retry/disclosure controls have accessible names in Portuguese.
- Do not announce `A definir` as a failure; it is a planned-but-unfilled service state.

## Manual Acceptance Considerations

The planner/executor must carry these checks into `07-UAT.md`; screenshots are optional, but the result of each check must be recorded.

| Check | Acceptance evidence |
|-------|---------------------|
| Public access | Open `/cardapio` in a logged-out browser; menu renders without `ProtectedRoute` or login. |
| Four-slot contract | With a fully populated response, verify four separate cards and exact fixed order. With a sparse/zero response, verify every missing slot remains visible as `A definir`. |
| Dish-first hierarchy | At 320px and desktop, dish names are the strongest card content; slot labels are secondary and ingredients are hidden until requested. |
| Ingredient privacy | Expand a recipe with one and many items. Verify only item names are shown—no quantity, unit, measure, weight, or recipe metadata. Verify every name is present. |
| Keyboard/accessibility | Tab to each disclosure and retry control, activate with keyboard, observe visible focus, and verify expanded/collapsed state is understandable without color alone. |
| Responsive reading | Manually inspect 320px mobile, 768px tablet, and desktop. Verify no horizontal scroll, clipped long names, or overlapping cards; verify one/two/four-column behavior. |
| State coverage | Exercise loading, successful populated, partial/no-recipe, empty, and failed-request states. Verify exact copy and distinction between `A definir`, empty, and error. |
| Regression gates | Record `cd frontend && npm run build`, `cd frontend && npm run lint`, and from `backend/` with venv active `pytest tests/ -q`. Playwright, CI/CD, date navigation, and unrelated capabilities remain out of scope. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none — manual CSS/plain React | none | not applicable; no registry code or third-party block introduced |

## Quality Dimensions

1. **Copywriting:** Portuguese labels and recovery copy are explicit, action-oriented, and distinguish normal `A definir` from empty and error states.
2. **Visuals:** The public surface keeps the existing ceremonial shell and makes the dish the focal point of each of four clearly separated service cards.
3. **Color:** Existing institutional tokens enforce the 60/30/10 surface hierarchy, with green accent use deliberately limited to borders, disclosure cues, and focus.
4. **Typography:** Four declared sizes, two weights, explicit line heights, and serif/sans role separation preserve hierarchy and readability.
5. **Spacing:** The 4px-based scale, responsive grid gaps, card padding, and 44px control target produce predictable layouts at mobile, tablet, and desktop widths.
6. **Registry Safety:** No shadcn or third-party registry is initialized or consumed; implementation remains plain React and co-located CSS.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved by gsd-ui-checker
