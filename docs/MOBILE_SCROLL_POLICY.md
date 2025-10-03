# Mobile Scroll & AI Banner Policy

## Overview
On mobile / touch or narrow viewports (<=760px or pointer coarse):
- The global page (`html, body`) is locked against scrolling.
- Only the Power Cards panel (`.cmp-power-cards-panel`) and Monsters panel (`.cmp-monsters-panel`) may scroll to reveal full content.
- Scrollbars are visually suppressed (WebKit) to keep a clean arcade aesthetic; Firefox falls back to native minimal scrollbars.
- Panels expand to fill their side rail height so interaction elements remain within the viewport.

## Rationale
1. Prevent accidental background scroll when interacting with dice, action menu, or modals.
2. Maintain a stable layout for core interactive regions (arena, dice tray, action/menu buttons) without vertical drift.
3. Preserve access to long lists of cards / monsters via controlled internal scrolling.

## Implementation Notes
- Body scroll lock via `overflow:hidden` inside the mobile media query in `layout.game.css`.
- Side rails given 100% height; internal panel given `overflow:auto` and `min-height:0` so flexbox permits scrolling.
- Scrollbar hiding uses `::-webkit-scrollbar { width:0; height:0; }`. Firefox-specific properties are omitted to avoid linter compatibility warnings.
- No JavaScript lock required (pure CSS) minimizing risk of scroll chaining issues.

## AI Thinking Banner Changes
- Replaced keyframe entrance/exit with CSS transitions for smoother integration and reduced initial auto-play.
- Added `is-active`, `leaving`, `footer-enter`, `footer-exit` state classes to manage fade/slide and relocation between header and footer.
- Reserved left header spacer width to prevent title reflow when banner toggles.
- Footer relocation now animates (slide up/down with slight scale) rather than a hard DOM jump.

## Edge Cases Considered
- Viewport height changes (mobile browser chrome) still keep interactive elements visible due to 100vh container and internal scroll areas.
- Banner hidden on human turns regardless of stored state to avoid stale display.
- If panels overflow massively (extreme card counts), internal scroll remains the only scrolling context, avoiding page bounce.

## Future Enhancements
- Optionally implement inertial scroll smoothing for non-WebKit browsers.
- Add reduced-motion variant to disable transform scaling for users with prefers-reduced-motion.
- Tokenize panel height / breakpoints into design tokens for easier tuning.
