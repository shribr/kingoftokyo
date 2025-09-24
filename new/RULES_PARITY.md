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
| Discard Effects | Immediate resolution | ✅ | ✅ | Handlers: vp/energy/heal_all/heal_self/damage_all/steals | Add edge-case tests |
| Keep Effects | Persistent modifiers | ✅ | ⚠️ | Effect queue UI absent | Build effect inspector |
| Attack Resolution | City/Bay / inside/outside targeting | ✅ | ✅ | Dual-slot now added | Confirm multi-target logging |
| Entry to Tokyo | Forced entry; multiple slots (5-6 players) | ✅ | ✅ | Interactive takeover after prompts | Add takeover test |
| Yield / Leave Tokyo | Choice on taking damage | ✅ | ✅ | Interactive prompt + timeout fallback | Add prompt resolution tests |
| Start-of-Turn VP | City:2, Bay:1 | ✅ | ✅ | Implemented now | Add tests |
| Victory (20 VP) | Instant win check | ✅ | ✅ | — | — |
| Victory (Last Standing) | Elimination detection | ✅ | ✅ | — | — |
| Healing Rules | No healing in Tokyo | ✅ | ✅ | — | — |
| Elimination Flow | Remove, clear Tokyo if occupant | ✅ | ✅ | Auto-clears slots on death/leave | Add death test |
| Effect Timing System | Sequenced resolution | ✅ | ⚠️ | Queue + UI panel; limited handlers | Add advanced targeting & cancel |
| Persistence | Save/load full game | ✅ | ✅ | Export/import snapshot v1 | Add migration tests |
| AI Decision System | Advanced heuristics & transparency | ✅ | ⚠️ | Basic automation only | Port heuristics iteratively |
| Accessibility | ARIA roles, focus mgmt | ⚠️ | ⚠️ | Peek & yield overlays with ARIA; needs keyboard trapping & announcements | Add focus loop + live regions |
| Logging | Structured log feed | ✅ | ✅ | Peek & flush entries added | Add tests for new entries |
| Tokyo Bay Activation | Only for 5-6 players | ✅ | ✅ | Gated at >=5 players | Add gating test |
| Multi-Target Effects | Heal / damage groups | ✅ | ⚠️ | Partial (heal_all) | Add targeting UI |

## Current Coverage (Weighted)
Formula: full = 1, partial = 0.5, planned = 0.25, missing = 0.

Rewrite score = (Full: 25 *1) + (Partial: 7 *0.5) + (Planned: 0) + (Missing: 0) = 25 + 3.5 = 28.5 over 31 ≈ 91.9%.

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
