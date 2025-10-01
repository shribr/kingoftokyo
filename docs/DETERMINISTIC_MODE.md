# Deterministic Mode

Reproducible game + AI behavior for CI snapshots, regression tests, and scenario playback.

## Activation

Two equivalent activation paths (checked early at load time by `isDeterministicMode()` in `src/core/rng.js`):

1. Browser / UI: set a global flag before game bootstrap
```js
window.__KOT_TEST_MODE__ = true;
```
2. Node / Build tooling: environment variable
```bash
KOT_TEST_MODE=1 node your-script.js
```

When NOT active the deterministic code paths add only minimal branching and never override `Math.random` globally.

## Scope (Current)
- Dice rolls: Seeded per turn + per roll index (see below) to guarantee the same sequence for identical turn metadata.
- AI decisions: Each roll decision seeded independently and simulation trials fixed.

## Seed Derivation Strategy
Central utilities live in `src/core/rng.js`.

Primitive hash/mix: FNV-1a (32‑bit) + additional avalanche mixing.
RNG core: Mulberry32 (fast, adequate statistical quality for gameplay decisions).

### Dice Rolls
```
seed = combineSeed('KOT_DICE', turnCycleId, rollIndex, activePlayerId)
```
- `turnCycleId`: Monotonically increasing id guarding async turn transitions.
- `rollIndex`: 0 for the first roll of a turn, incremented after each `performRoll()`.
- `activePlayerId`: Disambiguates simultaneous seeds across different players / future concurrency.

### AI Decisions
```
seed = combineSeed('KOT_AI', turnCycleId, decisionIndex, playerId)
```
- `decisionIndex`: Counter reset when a new `turnCycleId` is observed, incremented for each AI roll decision query within the turn.
- Trials count forced to 64 (fixed) when deterministic mode is active to ensure bit‑for‑bit identical Monte Carlo style sampling.

## Guarantees
| Aspect | Guarantee |
| ------ | --------- |
| Dice sequence | Identical given same (turnCycleId, roll order, playerId) |
| AI decision object | Identical JSON (aside from time-based fields which are avoided) for same state & seeds |
| Simulation trials | Constant 64 when deterministic mode on (adaptive otherwise) |

## Metadata Exposure
AI decision objects now include (when active):
```json
{
  "deterministic": {
    "seed": <number>,
    "trials": 64,
    "turnCycleId": <number>,
    "decisionIndex": <number>
  }
}
```
Dice module (turn service) can optionally log the composed seed for debugging (future enhancement).

## Non-Deterministic Fallback Behavior
- When the flag is off, code paths use adaptive trial counts & `Math.random` exactly as before.
- No global RNG state is mutated; deterministic RNG instances are local closures.

## Limitations / Future Work
- Power card shop generation not yet seeded (would require adding a lifecycle hook and seed derivation similar to dice).
- Event ordering influenced by real-time user input remains inherently non-reproducible unless we queue and timestamp inputs.
- Replay export/import scaffold not yet added (planned: capture seeds + serialized game state diff stream).
- Potential future: Deterministic seeding for power card purchases / deck shuffle for expansions.

## Test Harness (Planned)
`tools/deterministicSmoke.js` will assert that two sequential full game initializations with the flag produce identical first N dice + AI decisions.

## Safety Notes
- Deterministic mode should not be left enabled for live multiplayer sessions (could leak predictive info).
- Seed values are integers; avoid treating them as cryptographic randomness.

## Quick Usage Example
```html
<script>
  window.__KOT_TEST_MODE__ = true;
</script>
<script src="./dist/bundle.js"></script>
```

Or with Node integration:
```bash
KOT_TEST_MODE=1 node tools/deterministicSmoke.js
```

---
Maintainer: Deterministic layer introduced to support CI reproducibility and regression diff tooling.
