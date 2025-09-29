## UI Parity Pipeline – Task Board

Goal: Achieve reproducible, testable visual parity vs legacy implementation.

### Phase P1 – Token & Inventory
- [ ] Extract color tokens from existing legacy CSS.
- [ ] Extract spacing scale (min, preferred, max) & map to `--space-*`.
- [ ] Extract typography (font-family, weights, sizes, line-heights) → `--font-*`, `--text-*`.
- [ ] Extract radii, border, shadow, z-index layers.
- [ ] Create `tokens.css` and integrate into existing components.

### Phase P2 – Snapshot & Baselines
- [ ] Author `tools/uiAudit.js` to walk DOM and produce JSON of computed styles for key selectors.
- [ ] Define selector list in `ui-audit-selectors.json`.
- [ ] Generate baseline JSON (`/new/.baselines/ui-styles.json`).
- [ ] Add comparison script stub (`tools/compareAudit.js`).

### Phase P3 – Visual Regression (Optional Early)
- [ ] Decide tooling (Playwright + pixelmatch).
- [ ] Add minimal script to capture screenshots for three states: initial lobby, post-roll, post-resolve.
- [ ] Store images under `/new/.baselines/screenshots/`.

### Phase P4 – Accessibility & Semantics
- [ ] Add landmark roles to root container.
- [ ] Add ARIA live region for phase/log updates.
- [ ] Run axe (manual for now) and record findings.

### Phase P5 – Performance Hooks

### Phase P6 – Enforcement
### Phase 6 – Player Profile Card (COMPLETED)
Deliverables Achieved:
	- Component scaffold (`player-profile-card`) with dual-class root.
	- Token-based structural CSS (`components.player-profile-card.css`).
	- Config registration (kept disabled) plus separate multi-instance manager (`player-profile-cards`).
	- Owned cards miniature lane placeholder.
	- Lightweight test harness (`player-profile-card.test.js`).
	- Manager component enabled for live multi-player rendering.
Closure Criteria Met: All planned scaffold objectives done; no redesign introduced; legacy untouched.

### Phase 7 – Layout Rails & Positional Persistence (IN PROGRESS)
Objectives:
	- Introduce layout rail container abstraction (players, dice/actions, log, modals staging) inside `new/` only.
	- Add UI slice support for persisted positions: `ui.positions[componentName] = { x, y }`.
	- Implement drag handling utility (pointer events) with throttled store writes.
	- Provide `reset positions` internal API (no legacy UI wiring yet).
	- Visual parity: maintain current stacking & approximate spacing (no redesign) while decoupling absolute positioning.
Tasks:
		[x] Add actions: `UI_POSITION_SET`, `UI_POSITIONS_RESET`.
		[x] Extend `ui.reducer` to handle position updates.
		[x] Create `services/positioningService.js` for drag registration & persistence.
		[x] Add `layout-rails.css` scaffold with rail container tokens.
		[x] Update `player-profile-cards` container to opt into rail system.
		[x] Provide test harness to simulate drag and assert state persistence.
		[x] Integrate draggable persistence into dice tray.
		[x] Add hydration & localStorage persistence.
		[x] Add optional bounds & grid snap logic (not yet leveraged).
			[x] Implement reset-all internal command event (`ui/positions/resetRequested`).
		[ ] Apply positioning to second future component (e.g., action menu) after migration.
Exit Criteria:
	- Dragging a profile card updates stored position.
	- Refresh (manual test) re-applies last positions via initial mount pass.
	- Reset API clears positions and DOM transforms.


---
Maintainer Notes:
- Keep tasks checked off directly here, then summarize in migration plan when each Phase completes.

---
### Addendum (Sept 29, 2025 – Parity Audit Alignment)

New Flow / Parity Tasks:
- [ ] Introduce phase FSM assertions (build lightweight dev-only validator)
- [ ] Add `DICE_ROLL_RESOLVED` event & remove CPU polling loop
- [ ] Unified Yield Modal (replace heuristic/timeouts hybrid) with accessibility roles
- [ ] BUY_WAIT phase visual state (timer or dismissal CTA)
- [ ] Timing spans (rollPhase, resolvePhase, buyPhase, cleanupPhase) captured & logged
- [ ] Dev Timing Overlay component (toggle via query param or keyboard)
- [ ] AI decision rationale panel: show factor weight breakdown per last roll
- [ ] Tokyo takeover sequence visual cues (highlight attacker, flashing empty slot)
- [ ] Automatic screenshot harness states updated to include yield modal & buy phase
- [ ] Accessibility: Add live region for phase announcements & yield prompts

Metrics to Collect (post-implementation):
- Mean & σ of ROLL phase duration (CPU vs Human)
- Yield decision latency (AI)
- Number of stale async actions (should remain 0)

Review Trigger: Re-run visual parity audit after Phase Alpha completion (FSM + yield + timing overlay) and update baseline snapshots.
