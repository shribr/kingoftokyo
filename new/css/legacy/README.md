# Legacy CSS (Transplanted Reference)

This folder centralizes copied legacy or transplanted global CSS taken from the original (non-`new/`) codebase.

Purpose:
- Provide a single quarantine location for styles pending incremental migration into the new modular architecture.
- Prevent accidental editing of legacy snapshots scattered across active component styling.
- Enable a final cleanup (delete entire folder) once every required token/rule has been re-homed.

Guidelines:
1. Do NOT add new rules here. Create or extend component-scoped CSS instead (e.g. `components.*.css`).
2. When you migrate a rule, annotate the destination file (temporary comment) then remove the rule here ONLY after validation.
3. Avoid importing these legacy files wholesale in production once parity is achieved—prefer selective reimplementation.
4. `base.css` and `layout.css` here are snapshots; the *active* versions remain in `new/css/` until fully modularized.

Deletion Criteria (UPDATED – achieved):
✔ All global layout, header, panel, dice, and modal styling refactored into component/tokens.
✔ No remaining runtime references to legacy-only selectors (.players-area, .cards-area, .dice-area, .action-menu) – components now use cmp-* equivalents.
✔ Power cards + player profile card visuals sourced from dedicated component styles.
✔ Action menu + dice tray fully migrated (positioning + styling) with draggable service.

Status: Folder retained temporarily only for rollback safety. Safe to delete `css/legacy/` in next cleanup commit.

---
Timestamp: Auto-generated on migration pass.
