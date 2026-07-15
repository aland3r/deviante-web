# Dev Quest HUD (arcade dev mode)

Shared React package for Gestalt products: **Quest Log** checklist, **page stamp**, and **arcade loading screen**. Visible only in `npm run dev` (hidden in production builds).

**Path:** `ui/dev-quest/`

## Components

| Export | Role |
|--------|------|
| `DevQuestProvider` | Context — product name, phases, loading lines |
| `DevQuestHud` | Floating QUEST LOG button + expandable checklist |
| `DevQuestStamp` | Footer signature with active quest + XP % |
| `ArcadeLoadingScreen` | Retro loading panel (use while auth/data loads) |
| `isDevQuestEnabled()` | `import.meta.env.DEV && VITE_DEV_QUEST_HUD !== 'false'` |

## Wire a product (Vite + React)

### 1. Vite alias

Use the shared helper (recommended):

```js
// vite.config.js
import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gestaltDevQuest } from '../../ui/dev-quest/vite-gestalt.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  defineConfig({ plugins: [react()] }),
  defineConfig(gestaltDevQuest(rootDir)),
)
```

`gestaltDevQuest(rootDir)` sets `@gestalt/dev-quest` alias, React dedupe, and `server.fs.allow` for the monorepo root.

### 2. Product roadmap

Create `{product}/web/src/lib/roadmap.js`:

```js
export const ROADMAP_PHASES = [
  {
    id: 'P0',
    codename: 'INSERT COIN',
    title: 'Fase 0',
    quests: [
      { id: '0.1', uc: null, label: '…', status: 'done' }, // done | active | locked
    ],
  },
]

export const LOADING_LINES = [
  'INSERT COIN TO CONTINUE...',
  'BUFFERING...',
]
```

Update quest `status` as work ships. Optional `uc` tag shown in HUD.

### 3. App shell

```jsx
import '@gestalt/dev-quest/dev-quest.css'
import { DevQuestProvider, DevQuestHud, DevQuestStamp, ArcadeLoadingScreen, isDevQuestEnabled } from '@gestalt/dev-quest'
import { ROADMAP_PHASES, LOADING_LINES } from './lib/roadmap'

export default function App() {
  return (
    <DevQuestProvider
      productName="Deviante"
      roadmapDoc="deviante/docs/roadmap.md"
      phases={ROADMAP_PHASES}
      loadingLines={LOADING_LINES}
    >
      {/* routes */}
      <DevQuestHud />
    </DevQuestProvider>
  )
}
```

Use `<DevQuestStamp />` in page footers. For auth guards:

```jsx
if (loading) {
  return isDevQuestEnabled() ? <ArcadeLoadingScreen label="SESSION" /> : <p>Carregando…</p>
}
```

### 4. Disable locally

`VITE_DEV_QUEST_HUD=false`

## Products using this

| Product | Roadmap data | Roadmap doc |
|---------|--------------|-------------|
| Deviante | `deviante/web/src/lib/roadmap.js` | `deviante/docs/roadmap.md` |
| Milebrick | `milebrick/web/src/lib/roadmap.js` | TBD |
| Harpia | `harpia/web/src/lib/roadmap.js` | TBD |

Portfolio (Next.js) — not wired yet; reuse CSS + pattern when needed.

## Agent skill

See [doc/agents/dev-quest-hud.md](../../doc/agents/dev-quest-hud.md).

## Related

- [deviante/docs/roadmap.md](../../deviante/docs/roadmap.md) — Deviante quest content
- [gestalt-context.md](../../doc/agents/gestalt-context.md) — no clutter in production
