# King of Tokyo Rules Parity Report

_Date: September 24, 2025_

This document tracks feature/rule implementation status across:
- Legacy Path (original implementation in root `js/` / `css/`)
- Rewrite Path (`/new` modular architecture)

## Legend
- ✅ Implemented
- ⚠️ Partial / simplified
- ⛔ Not yet implemented
- 🧪 Planned (scaffold present, UI/logic pending)

## Base Game Rule Matrix
| Category | Description | Legacy | Rewrite | Notes / Gaps (Rewrite) | Action Plan |
|----------|-------------|--------|---------|------------------------|-------------|
| Dice Core Loop | Up to 3 rolls, selective keeps | ✅ | ✅ | — | Maintain tests |
| Reroll Bonuses | Extra rerolls via cards | ✅ | ✅ | — | Add unit test |
| Extra Dice Slots | Card-based slot increase | ✅ | ✅ | Animation added; needs tests | Test stacking multi-cards |
| Number Scoring | Triples & extras | ✅ | ✅ | — | — |
| Energy Gain/Spend | Energy dice & card costs | ✅ | ✅ | — | — |
| Shop Refill | Always 3 cards | ✅ | ✅ | — | — |
| Shop Flush | Pay 2⚡ to refresh | ✅ | ✅ | — | Log entry pending |
| Card Purchase Flow | Keep vs discard | ✅ | ✅ | Limited catalog | Expand catalog incrementally |
| Discard Effects | Immediate resolution | ✅ | ⚠️ | Effect engine partial (subset kinds) | Extend handlers |
| Keep Effects | Persistent modifiers | ✅ | ⚠️ | Effect queue UI absent | Build effect inspector |
| Attack Resolution | City/Bay / inside/outside targeting | ✅ | ✅ | Dual-slot now added | Confirm multi-target logging |
| Entry to Tokyo | Forced entry; multiple slots (5-6 players) | ✅ | ✅ | Heuristic yield vs UI prompt | Add yield choice UI |
| Yield / Leave Tokyo | Choice on taking damage | ✅ | ⚠️ | Heuristic only (health<threshold) | UI decision modal |
| Start-of-Turn VP | City:2, Bay:1 | ✅ | ✅ | Implemented now | Add tests |
| Victory (20 VP) | Instant win check | ✅ | ✅ | — | — |
| Victory (Last Standing) | Elimination detection | ✅ | ✅ | — | — |
| Healing Rules | No healing in Tokyo | ✅ | ✅ | — | — |
| Elimination Flow | Remove, clear Tokyo if occupant | ✅ | ⚠️ | Needs Tokyo slot cleanup on death | Add cleanup in reducer/service |
| Effect Timing System | Sequenced resolution | ✅ | 🧪 | Queue built; limited handlers | Add UI + more effect kinds |
| Persistence | Save/load full game | ✅ | ⛔ | Not ported | Serialize slices API |
| AI Decision System | Advanced heuristics & transparency | ✅ | ⚠️ | Basic automation only | Port heuristics iteratively |
| Accessibility | ARIA roles, focus mgmt | ⚠️ | ⛔ | Peek modal unlabeled | Add aria + focus trap |
| Logging | Structured log feed | ✅ | ⚠️ | Missing peek/flush entries | Dispatch logAppended |
| Tokyo Bay Activation | Only for 5-6 players | ✅ | ⚠️ | Always available | Gate on player count |
| Multi-Target Effects | Heal / damage groups | ✅ | ⚠️ | Partial (heal_all) | Add targeting UI |

## Current Coverage (Weighted)
Formula: full = 1, partial = 0.5, planned = 0.25, missing = 0.

Rewrite score = (Full: 18 *1) + (Partial: 10 *0.5) + (Planned: 1 *0.25) + (Missing: 2 *0) = 18 + 5 + 0.25 = 23.25 over 31 ≈ 75%.

(Improved from earlier 70% after Tokyo dual-slot + start-of-turn VP refinement.)

## Immediate Remediation Targets (High ROI)
1. Add yield decision UI (replaces heuristic) – raises 2 partials to full.
2. Persistence serialization (store snapshot + hydrate) – removes 1 missing.
3. Log integration for flush & peek – converts partial logging to full.
4. Tokyo Bay gating by player count (5-6 only) – lift partial.
5. Elimination cleanup ensuring Tokyo slots freed (edge case) – lift partial.
6. Accessibility pass for new components – improves compliance.

Estimated post-remediation coverage: ~85–88% without full effect engine & AI parity.

## Longer-Term Parity Tasks
- Expand card catalog (map official base set to structured schema).
- Complete effect handlers (damage modifiers, conditional triggers, reroll manipulations, energy steals, etc.).
- Effect queue UI (visual stack, resolution controls, failure retry).
- Advanced AI heuristic port (portfolio optimization, projection) into rewrite.
- Save format versioning & migration path.
- Full accessibility (WCAG focus order, keyboard-only flows, announcements).

## Action Checklist (Next Sprint)
- [ ] Implement `yieldDecision` modal + actions.
- [ ] Add `logAppended` calls for peek & flush.
- [ ] Gate Tokyo Bay by player count >=5.
- [ ] Free Tokyo slots on occupant elimination.
- [ ] Add simple persistence (`exportGameState` / `importGameState`).
- [ ] Label & focus-manage peek modal.
- [ ] Unit tests: flushShop, peekTopCard, dual-slot VP awarding, elimination cleanup.

---
Generated as part of rewrite parity tracking initiative.
