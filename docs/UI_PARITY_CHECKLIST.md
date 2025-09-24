# UI Parity Checklist (Lean Path Item 5)

Use this checklist during pre-release verification to ensure the UI remains consistent and accessible.

## Monster Selection
- [ ] All player tiles present (matches selected player count)
- [ ] Each assigned monster unique
- [ ] Start button states:
  - [ ] Needs at least one human (message shown when 0 humans)
  - [ ] Shows remaining required players when incomplete
  - [ ] Shows "Start Game" and enabled when conditions met
- [ ] Randomize function never duplicates monsters
- [ ] Reset restores placeholders (human slot first, others CPU)

## Roll-Off Modal
- [ ] Skip button accessible via keyboard (Enter/Space)
- [ ] Skipping produces randomized first player order
- [ ] Winner announcement phrase uses non-victory tone
- [ ] Announcement triggers ARIA live region update

## In-Game Board
- [ ] First player indicator updated correctly
- [ ] Dice area becomes visible after game start
- [ ] Action buttons initial states: Roll enabled, Keep disabled, End Turn enabled

## AI Decision Tree Modal
- [ ] Opens without errors after at least one AI roll
- [ ] Branch count ≤ 25 (performance cap)
- [ ] Projection trial count annotation reflects adaptive range (25–110)

## Accessibility
- [ ] Monster option tiles focusable (tab navigation)
- [ ] Monster tiles selectable via Enter/Space (keyboard)
- [ ] Skip roll-off control usable via keyboard
- [ ] Live regions update phase announcements

## Debug & Diagnostics
- [ ] `Shift+D` toggles debug overlay
- [ ] `seedRNG(1234)` makes sequence deterministic (re-run to confirm identical first decision stats)
- [ ] `__debugUIState()` returns structured snapshot JSON

## Visual Consistency (Manual Baseline)
Capture baseline screenshots (1440×900) and compare:
- [ ] Splash screen
- [ ] Monster Selection (empty)
- [ ] Monster Selection (partially filled)
- [ ] Monster Selection (ready to start)
- [ ] Roll-Off modal active
- [ ] First turn start (dice area visible)

## Error / Console Hygiene
- [ ] No uncaught exceptions during full flow
- [ ] No accessibility-related warnings

## Performance Smoke
- [ ] AI avg decision time < 60ms (normal conditions)
- [ ] No noticeable input lag when overlay visible

---
For extended regression, integrate a lightweight pixel diff harness under `tests/visual` using Playwright + pixelmatch.
