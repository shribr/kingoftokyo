# Project Provenance & Promotion Record

Date: 2025-10-01  
Branch: `V2`

## Overview
This document records the structural promotion of the rewritten King of Tokyo implementation that previously lived under the `new/` directory. The rewrite has been elevated to the repository root as the canonical codebase. The original root implementation (now considered legacy) was snapshot-captured for historical and regression reference before removal.

## Rationale for Promotion
- The rewrite reached a stability point (AI actuation unification + perception layer) suitable for becoming the primary development line.
- Maintaining dual roots (`/` and `/new/`) imposed cognitive overhead, duplicate path maintenance, and risk of drift.
- Tooling, documentation, and baseline scripts now assume root-relative paths without `new/` prefixes.

## Promotion Sequence (Auditable)
1. Created branch `V2` from latest main.
2. Snapshot copied legacy assets:
   - JavaScript → `src/legacy/`
   - Stylesheets → `css/legacy/`
   - Root-level markdown (historical context) → `docs/root-import/`
3. Committed snapshot: `chore(legacy-snapshot): archive original root implementation before promotion`.
4. Removed obsolete root files (except allowed config & assets) to eliminate conflict surface.
5. Moved all content from `new/` to repository root (structure-preserving rename operations).
6. Deleted the now-empty `new/` directory.
7. Committed promotion: `feat(v2-promotion): promote rewrite from new/ to root`.
8. Performed path reference scan for `new/` and updated runtime-impactful references (config loader fetch paths, README examples, UI parity checklist).
9. Committed cleanup: `chore(paths): cleanup obsolete new/ references; retain historical mentions`.

## What Was Intentionally Preserved
- Legacy AI decision variants under `src/legacy/` (`ai-decisions.js`, `ai-decisions.legacy.js`, backups) for regression comparison.
- Historical documentation referencing `new/` where context matters (e.g., parity audit provenance, architectural shift notes).
- Image and asset structure unchanged (no functional divergence between legacy and rewrite for static assets at time of promotion).

## What Was Removed or Rewritten
- Duplicate runtime path prefixes (`/new/...`) in active code and onboarding docs.
- Timer-based AI auto-keep actuation path (replaced by immediate controller-driven decision loop).
- Direct reducer state peeks bypassing perception layer (now centralized in `buildAIState`).

## Post-Promotion Invariants
- No runtime imports or fetch calls should reference `new/`.
- All AI engine consumers import a single enhanced engine implementation.
- Legacy code is inert: it must not be imported by production modules (use only for analysis/regression tooling).

## Next Planned Structural Tasks (Phase Alpha Continuation)
1. Introduce finite state machine (FSM) for phase transitions.
2. Add `turnCycleId` invalidation token to guard against stale async actions.
3. Implement roll resolution event (`DICE_ROLL_RESOLVED`) and remove polling.
4. Deterministic mode (seeded) for CI reproducibility.
5. Unified yield advisory + takeover sequence consolidation.

## How to Validate Promotion Integrity
- Grep: `grep -R "fetch('/new/" -n .` → Expect no matches.
- Grep: `grep -R "./new/src" -n .` → Expect only historical doc references (if any).
- Runtime smoke: Load app and confirm config JSON loads from `/config/*.json` (200 responses, no 404 on `new/` paths).

## Reversal / Contingency
If rollback is required:
1. Check out the commit immediately preceding `feat(v2-promotion)` on branch `V2` (the snapshot commit).
2. Cherry-pick any urgent fixes from promotion head onto that snapshot.
3. Force-push a `rollback/*` branch for evaluation before merging.

## Attribution
This provenance record was generated as part of the structural hygiene process to maintain historical traceability after eliminating the `new/` staging namespace.

---
_Last updated: 2025-10-01_
