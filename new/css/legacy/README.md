# CSS Architecture Overview

This document explains the layering and conventions introduced for improved maintainability.

## Layer Order (Load Sequence in `index.html`)
1. base.css – Reset, global tokens, accessibility primitives
2. splash.css – Entry screen visuals (can be skipped after load)
3. layout.css – Positional scaffolding (fixed panels, z-index, structural coordinates)
4. game-areas.css – In‑board area styling (Tokyo, player panels internals) – NO positional overrides of fixed panels
5. monsters.css – Player dashboard & monster visual skins
6. dice.css – Dice component skin (not position)
7. cards.css – Power card panel & card skin
8. modals.css – Overlay dialogs & complex UI flows
9. animations.css – Reusable animation keyframes & effect classes
10. ai-logic-flow.css / rolloff.css – Feature‑specific visualizations
11. responsive.css – Media queries & progressive enhancement

## Key Conventions
- Layout vs. Skin: All `position: fixed` and macro geometry stays in `layout.css`. Component skins live in their specific file.
- Animations: Project-scoped keyframes use `ko-` OR a descriptive unique name. Short entrance vs. persistent glow separated (`tokyoEnterGlow` vs. `tokyoGlow`).
- Utilities: Shared long shadows & text shadow tokens implemented via CSS custom properties + utility classes (see `base.css`).
- State Classes: Prefer additive class names (e.g., `.game-active`, `.cpu-rolling`) instead of overriding base styles inline.

## New Utility Classes
(Defined in `base.css`)
- `.ts-comic-outline` – Heavy 4-direction black outline text shadow (classic comic title)
- `.ts-comic-mid` – Mid weight multi-direction outline
- `.ts-comic-soft` – Softer small outline
- `.u-gradient-panel` – Standard panel gradient token reference
- `.u-focus-ring` – Explicit focus outline helper (overrides if needed)

## Migration Strategy
Gradually replace repeated `text-shadow` blocks by adding appropriate utility class to the element or its container. Keep legacy declarations during transition where risk of regression exists; prune them after visual QA.

## Don’ts
- Don’t redeclare `position` for `.players-area`, `.cards-area`, `.dice-area`, `.action-menu` outside `layout.css`.
- Don’t reintroduce generic keyframe names like `pulse` or `tokyoGlow` in feature files.

## Next Recommended Cleanups
1. Replace remaining duplicated text-shadow declarations (phase 2).
2. Introduce `prefers-reduced-motion` fallbacks for heavy glow/box-shadow animations.
3. Centralize gradient palettes into `:root` custom properties.
4. Add Stylelint to CI to guard against duplicate keyframe names & missing braces.

