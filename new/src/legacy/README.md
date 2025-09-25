# Legacy JS (Reference Zone)

Centralized repository of legacy or monolithic logic copied from outside `new/` for the purpose of:
- Analyzing existing behavior while rewriting features into modular services/components.
- Preventing accidental edits to the **real** legacy implementation that still powers the original game outside `new/`.

Rules:
1. Never modify original root JS files—copy into here if you need to reference them.
2. Do not import these legacy files directly into new runtime code paths (unless explicitly creating a compatibility shim during migration).
3. Port logic into:
   - `new/src/domain` (pure logic)
   - `new/src/services` (stateful orchestration)
   - `new/src/components/*` (UI rendering / interaction)
4. Mark each ported chunk with a comment referencing the source file & removal ticket.

Cleanup Checklist Before Deletion:
- All AI decision heuristics modularized into smaller testable units.
- Turn / dice / card effects logic consolidated under domain & services.
- No TODO references to legacy file names in active code.

---
Timestamp: Auto-generated.
