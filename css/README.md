# CSS Conventions (Rewrite Path)

This directory centralizes all styles for the rewrite environment. The goals are: predictable load order, easy fuzzy-search by component name, and a clear future path for theming + refactors.

## Naming Patterns
- `base.css` – Global resets, typography, structural element defaults.
- `tokens.css` / `tokens.<theme>.css` – Design tokens (colors, spacing scale, radii, z-index, motion durations). Dark / variant themes live alongside the base.
- `layout*.css` – High-level page or board layout rules (grid / flex scaffolding). Suffixes clarify scope: `layout.game.css`, `layout-rails.css`.
- `responsive.css` – Media-query driven adaptations (could later be split if it grows large).
- `components.<thing>.css` – Styles for a specific feature or UI component. Prefixed consistently for fast navigation.
- `util.*.css` – Cross-cutting utility classes (e.g., shared button primitives). Keep these minimal; prefer tokens + semantic component classes first.

## Component Styles
Instead of colocating a CSS file inside every component folder, this approach:
1. Reduces file count / import ceremony while no bundler-based CSS scoping is in use.
2. Keeps naming consistent: search `components.roll-for-first` instantly jumps to relevant rules.

If we adopt a build step later (PostCSS / CSS Modules / bundler), these can be migrated to colocated styles without semantic churn.

## Theming Strategy
- Tokens define semantic categories (e.g., `--color-bg-surface`, `--color-border-muted`).
- The dark edition overrides only tokens (not raw component selectors) to minimize duplication.
- Future accessibility or seasonal themes follow the same pattern: new token file only.

## Adding a New Component Style File
1. Name it `components.<name>.css` where `<name>` matches the component folder in `src/components/`.
2. Group selectors under a single top-level block with a BEM-like root class (e.g., `.cmp-settings-panel`).
3. Prefer design tokens over hard-coded values; introduce a new token if a value repeats ≥3 times.

## Scenario Styles
`components.scenarios.css` houses styling specific to the scenarios tab / experimental scenario features. If scenarios become a core feature, the file remains. If they stay optional, the file can be gated or eventually colocated with a feature flag.

## Potential Future Evolutions
- Split `layout` files into `layout/` subfolder if count grows.
- Introduce a `themes/` subfolder if >3 token variant files appear.
- Lint: enforce custom property usage in component files (no arbitrary hex values except in tokens).

## DO / AVOID
| Do | Avoid |
|----|-------|
| Use semantic token names | Copy-paste raw colors across files |
| Keep utility files small | Dumping global one-off helpers into `util.*` |
| Namespace component roots (`.cmp-*`) | Unscoped generic class names that risk conflicts |
| Document new token categories in `tokens.css` | Adding ambiguous tokens with unclear purpose |

---
Last updated: Sept 29, 2025.
