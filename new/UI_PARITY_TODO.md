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
- [ ] Add simple FPS sampler during dice animations (placeholder; logs to console).
- [ ] Document thresholds (<16ms/frame target for major interactions).

### Phase P6 – Enforcement
- [ ] Create Git pre-commit hook (optional) or manual script invocation instructions.
- [ ] Document variance acceptance criteria (≤2px layout diff, identical hex colors, etc.).

---
Maintainer Notes:
- Keep tasks checked off directly here, then summarize in migration plan when each Phase completes.
