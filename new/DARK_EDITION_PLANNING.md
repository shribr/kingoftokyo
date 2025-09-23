# Dark Edition Planning (Forward Compatibility Scaffold)

This document captures hooks, extension points, and upcoming data model deltas required to support a future "Dark Edition" variant without retrofitting large swaths of code later.

## Core Concepts
1. Mode Selection (Bootstrap Time)
   - A `gameMode` property ("classic" | "dark") to be added to `meta` or a new `config` slice.
   - Dark Edition auto-enables alternative visual theme, NOT a user-toggle in-session.

2. Wickness Scale (Progression Track)
   - New slice: `wickness` with `{ value: 0..N, tilesChosen: [], unlockedThresholds: [] }`.
   - Gain triggers: certain dice outcomes, dark-only card effects, poison applications.
   - Threshold tiles: choosing a tile adds a persistent modifier (similar pipeline to existing player modifiers).

3. Poison / Corruption Mechanics
   - New status effect on players: `poisonStacks` (damage over time or restrict healing) & `corruption` (enhances dark card effects).
   - Resolution integrated into turn start/end service.

4. Card Metadata Extensions
   - Add optional fields: `dark: boolean`, `wicknessGain?: number`, `poisonApply?: number`, `requiresDark?: boolean`.
   - Shop filtering: if `gameMode === 'dark'`, include `dark === true` cards; optionally exclude `excludeInDark` base cards.

5. Theming Hooks
   - CSS: use a `.theme-dark-edition` class on root to swap token set (e.g. override subset in `tokens.css`).
   - Provide parallel gradient + accent overrides (e.g., neon cyan + abyssal purple palette).

6. AI Adaptation
   - AI decision scoring pipeline extended with `wicknessValue` and `poisonPotential` heuristics.
   - Logging tags: `[DARK]` prefix for dark-specific actions to make filtering simpler.

7. Effect Engine Additions
   - New effect kinds: `wickness_gain`, `apply_poison`, `corruption_gain`, `tile_select_prompt`.
   - Queue handlers mirror existing pattern (pure interpreter + dispatch side-effects).

## Minimal Forward Hooks Already Added
| Area | Hook | Status |
|------|------|--------|
| Cards Service | `opts.darkEdition` parameter in `initCards` | Added placeholder |
| Deck Build | Planned filter for dark-only cards | Placeholder comment |
| Theming | Will rely on token override layer | Pending |
| AI Log / Tree | (Planned) tag injection | Pending |

## Incremental Next Steps (Deferred Until Classic Completion)
1. Introduce `gameConfig` slice (`{ mode: 'classic' }`).
2. Add `wickness` slice with pure increment / tile selection reducers.
3. Extend card catalog builder to merge a `darkCatalog` list when `mode === 'dark'`.
4. Add effect kinds to interpreter; write unit tests for each pure effect application.
5. Implement CSS token override file: `css/tokens.dark.css` with root `.theme-dark-edition` scope.
6. Create a dark edition bootstrap path (e.g., `startDarkEditionGame()` wrapper) that sets mode before init.
7. Add AI decision weight adjustments for dark mode heuristics.

## Design Token Override Sketch
```
.theme-dark-edition {
  --color-brand-gold: #d7bf5e;
  --color-brand-orange: #ff4d00;
  --color-bg-root: #06050a;
  --color-bg-panel: #13111a;
  --grad-header: linear-gradient(135deg,#1a0328,#320a46,#52006a,#8a0072,#320a46,#1a0328);
}
```

## Logging Conventions (Planned)
- Prefix dark-only mechanic events with `[DARK]`.
- Wickness gain: `logger.system('[DARK] Wickness +1 (source: card:XYZ)')`.
- Poison tick: `logger.info('[DARK] Poison deals 1 damage to P2 (stacks=2)')`.

## Testing Strategy Outline
- Unit tests for new reducers (wickness, poison application).
- Effect engine tests for new dark effect kinds.
- Integration test ensuring dark-only cards never appear in classic mode.
- Snapshot tests for token override computed styles (optional dev tooling via `uiAudit`).

## Risk Mitigation
- Keeping all dark edition logic additive prevents regression risk in classic pipeline.
- Clear separation of catalog augmentation vs. replacement ensures maintainability.

---
Document acts as a living blueprint; update as new dark mechanics are conceived.