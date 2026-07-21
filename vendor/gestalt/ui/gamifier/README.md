# Gamifier (public quest log HUD)

Shared React package: a **floating, always-visible** quest log widget for
Gestalt product sites. Public counterpart to `ui/dev-quest`'s `DevQuestHud` —
same arcade look, but this one is **meant to ship to production** and be seen
by owner and visitors alike.

**Path:** `ui/gamifier/`

## Components

| Export | Role |
|--------|------|
| `GamifierHud` | Floating QUEST LOG button + expandable, multi-product panel |
| `buildGamifierProducts` | Pure helper — shapes flat `portfolio.quests`/`portfolio.products` rows into the `products` prop |

## Data source

`portfolio.quests` in Supabase (see [data/schema/portfolio/quests.sql](../../data/schema/portfolio/quests.sql) and [quests_alter.sql](../../data/schema/portfolio/quests_alter.sql)). Fetch with `fetchAllQuests()` / `fetchProductsMeta()` from `@gestalt/auth` (`ui/auth/quests.js`), shape with `buildGamifierProducts(questRows, productRows)`, pass the result as `products` to `GamifierHud`.

This package has **no fetching of its own** — each app's own provider (portfolio's `RoadmapProvider`, Deviante's `GamifierProvider`) owns the Supabase call and its offline fallback. `GamifierHud` only renders whatever `products` it's given.

## Usage

```jsx
import { GamifierHud } from '@gestalt/gamifier'
import '@gestalt/gamifier/gamifier.css'

<GamifierHud products={products} />
```

`products`: `[{ code, name, done, total, percent, phases }]` — one entry per product. A single-product app (Deviante) passes a one-element array.

## Agent skill

See [gestalt-kit/skills/gamifier/reference.md](../../gestalt-kit/skills/gamifier/reference.md) — owns this widget, the UC→quest transform, and the auto-sync trigger.

## Related

- [ui/dev-quest](../dev-quest) — the dev-only sibling this is modeled on; never merge the two, their rules (dev-only vs always-on) are opposite by design.
