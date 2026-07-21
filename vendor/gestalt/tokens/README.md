# Gestalt Design Tokens

Shared design tokens for all Gestalt products. Visual source of truth: [design-system/README.md](../design-system/README.md) (Figma ADS + product libraries).

## Figma ↔ código

| Figma | Código |
|-------|--------|
| [Alander Design System](https://www.figma.com/design/oTLpq3lBI3eXo11dJTn0lf/Alander-Design-System?node-id=9-10) | `tokens/` |
| [Deviante v1.0](https://www.figma.com/design/DzMGsKozRhijjcFFngdy4S/--PIBITI-----Deviante-v1.0?node-id=142-896) | `deviante/web/src/index.css` |

## Portfolio (Arcadia)

| File | Purpose |
|------|---------|
| [portfolio.css](portfolio.css) | Carbonot font + monochrome tokens for alander.io |
| [fonts/Carbonot-Bold.woff2](fonts/Carbonot-Bold.woff2) | Carbonot Bold web font |
| [fonts/Carbonot-Bold.woff](fonts/Carbonot-Bold.woff) | Carbonot Bold fallback |

Source: `CARBONOT-BOLD.OTF` → convert with `fonttools` (`flavor = woff2` / `woff`).

## Typography

| File | Purpose |
|------|---------|
| [typography.css](typography.css) | Font face, families, responsive type scale |
| [fonts/GT-Planar-VF.woff2](fonts/GT-Planar-VF.woff2) | GT Planar variable font (Deviante web) |
| [fonts/install/](fonts/install/) | Static TTF files for Figma / desktop install |

### Usage in a frontend

```css
@import '../../../tokens/typography.css';
```

### Responsive variables

Same property names at every breakpoint — only values change:

| Token group | Properties |
|-------------|------------|
| `--type-body-*` | size, line-height, weight, letter-spacing |
| `--type-h1-*` | size, line-height, weight, letter-spacing |
| `--type-h2-*` | size, line-height, weight, letter-spacing |
| `--type-h3-*` | size, line-height, weight, letter-spacing |
| `--type-lead-*` | size, line-height, weight, letter-spacing |
| `--type-eyebrow-*` | size, line-height, weight, letter-spacing |
| `--type-small-*` | size, line-height, weight, letter-spacing |
| `--type-button-*` | size, line-height, weight, letter-spacing |

Breakpoints: **mobile** (default) · **tablet** `768px` · **desktop** `1024px`
