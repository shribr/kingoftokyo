# King of Tokyo - Development Summary

**Development Period**: Last week and this week (September 8-17, 2025)  
**Project Type**: Browser-based implementation of the King of Tokyo board game  
**Tech Stack**: Vanilla HTML, CSS, JavaScript (ES6+)

> NOTE (Rewrite Track – `new/`): A parallel incremental rewrite is in progress introducing a modular store + component architecture (services, reducers, effect queue) to replace monolithic legacy scripts. Sections below now distinguish Legacy Implementation vs. Rewrite Progress where relevant.

## Project Overview

We've built a fully-featured digital version of the King of Tokyo board game with comprehensive gameplay mechanics, AI opponents, and a polished user interface. The game supports 2-6 players with a mix of human and CPU players.

## Core Game Features Implemented

### 🎮 **Game Setup & Player Management**
- **Monster Selection**: 6 unique monsters (Gigazaur, Cyber Bunny, Kraken, Meka Dragon, The King, Alienoid) with normal and dark variants
- **Player Count**: Flexible 2-6 player games
- **Player Types**: Mix of human and CPU players
- **Monster Profiles**: Customizable AI personality system for CPU players
- **Random Selection**: Auto-assign random monsters feature

### 🎲 **Dice System**
- **6-Die Rolling**: Standard King of Tokyo dice with faces: 1, 2, 3, Attack, Energy, Heal
- **3-Roll System**: Players get up to 3 rolls per turn with selective dice keeping
- **Animated Rolling**: Smooth CSS animations for dice rolls
- **Dice Selection**: Click to keep/release individual dice between rolls
- **Extra Dice**: Power card effects can grant additional dice
- **Visual Feedback**: Color-coded dice faces with emoji representations

### 🏙️ **Tokyo Mechanics**
- **Tokyo City & Tokyo Bay**: Dual Tokyo locations for 5-6 player games
- **Mandatory Entry**: Players must enter Tokyo when dealing damage if empty
- **Tokyo Bonuses**: 
  - +2 Victory Points for starting turn in Tokyo City
  - +1 Victory Point for starting turn in Tokyo Bay
  - +1 Energy for starting turn in Tokyo (any location)
- **Leaving Tokyo**: Players can choose to leave when taking damage

### ⚔️ **Combat System**
- **Attack Resolution**: Attack dice damage all other players or those outside Tokyo
- **Damage Calculation**: Multiple attack dice stack for higher damage
- **Health Management**: Players start with 10 health, can heal with heal dice
- **Elimination**: Players eliminated at 0 health
- **Tokyo Targeting**: Players in Tokyo take damage from outside players

### 🏆 **Victory Conditions**
- **20 Victory Points**: Primary win condition
- **Last Monster Standing**: Alternative win condition via elimination
- **Victory Point Sources**:
  - Number sets (3+ of 1,2,3 gives points)
  - Tokyo bonuses
  - Power card effects
  - Elimination bonuses

### 🔮 **Power Cards System**
- **Energy Economy**: Earn energy from dice, spend on power cards
- **Card Types**: Keep cards (permanent effects) and Discard cards (one-time use)
- **Diverse Effects**: 
  - Extra dice and rerolls
  - Defensive abilities
  - Victory point bonuses
  - Special attack powers
  - Energy manipulation
- **Smart AI**: CPU players make strategic card purchases

### 🤖 **AI System**
- **Dual CPU Architecture**: 
  - New streamlined system for responsive AI turns
  - Defensive fallback system for edge cases
- **Strategic Decision Making**:
  - Risk assessment for Tokyo entry/exit
  - Power card evaluation and purchasing
  - Dice selection optimization
- **Personality Profiles**: Customizable AI behavior patterns
- **Natural Timing**: Realistic thinking delays and turn pacing

### 🎯 **Turn Management**
- **Phase-Based Turns**: Rolling → Resolving → Card Buying → End
- **Turn Validation**: Comprehensive checks prevent invalid actions
- **Defensive Programming**: Multiple safeguards against turn-skipping bugs
- **State Persistence**: Automatic game state saving and recovery

### 📊 **User Interface**
- **Responsive Design**: Adapts to different screen sizes
- **Game Board Layout**: 
  - Central Tokyo area
  - Player profile cards (formerly player dashboards) with stats
  - Dice area with controls
  - Card marketplace
- **Visual Polish**:
  - Comic book aesthetic with halftone patterns
  - 3D transforms and animations
  - Color-coded game elements
  - Accessibility considerations
- **Header Information**:
  - Active player name display
  - Rolls remaining counter
  - Round indicator

### 🔄 **Game Flow & State Management**
- **Roll-Off System**: Determines first player through dice competition
- **Round Tracking**: Automatic round progression
- **Turn Transitions**: Smooth player switching with proper cleanup
- **Game Persistence**: Save/load functionality for long games
- **Error Recovery**: Robust error handling and state validation

## Technical Architecture

### 📁 **File Structure**
```
├── index.html              # Main game page
├── css/                    # Modular CSS architecture
│   ├── base.css           # Core styles and variables
│   ├── layout.css         # Game board layout
│   ├── dice.css           # Dice styling and animations
│   ├── monsters.css       # Player/monster styling
│   ├── cards.css          # Power card styling
│   ├── modals.css         # Modal dialogs
│   ├── animations.css     # Animation definitions
│   └── responsive.css     # Mobile/tablet adaptations
├── js/                    # Modular JavaScript architecture
│   ├── main.js           # UI controller and game orchestration
│   ├── game.js           # Core game logic and rules
│   ├── dice.js           # Dice system and animations
│   ├── monsters.js       # Player/monster classes
│   ├── cards.js          # Power card definitions and logic
│   ├── gameStorage.js    # Save/load system
│   ├── ui-utilities.js   # UI helper functions
│   └── ui/               # UI component modules
└── images/               # Game assets
    ├── characters/       # Monster artwork
    └── backgrounds/      # Game board backgrounds
```

### 🏗️ **Core Classes**
- **`KingOfTokyoUI`**: Main UI controller, event handling, visual updates
- **`KingOfTokyoGame`**: Core game logic, rules enforcement, state management
- **`Player`**: Individual player/monster representation
- **`DiceCollection`**: Manages 6-dice system with selection
- **`DiceRoller`**: Handles rolling mechanics and callbacks
- **`PowerCard`**: Card definitions and effect implementations
- **`GameStorage`**: Persistence and save/load functionality

### 🔧 **Key Technical Features**
- **Event-Driven Architecture**: Decoupled UI and game logic communication
- **State Machine**: Clear turn phases with validation
- **Defensive Programming**: Multiple validation layers prevent edge cases
- **Modular CSS**: Component-based styling for maintainability
- **Performance Optimization**: Debounced updates, efficient DOM manipulation
- **Cross-Browser Compatibility**: Modern JavaScript with fallbacks

## Major Development Challenges Solved

### 🐛 **Turn-Skipping Bug Investigation**
**Problem**: Human player 2's turn was being skipped when CPU went first  
**Root Cause**: Dual `endTurn()` methods causing naming conflicts and calling confusion  
**Solution**: 
- Renamed UI method to `endTurnFromUI()` for clarity
- Added comprehensive defensive turn protection
- Implemented turn ownership validation
- Added minimum turn duration requirements

### ⚡ **CPU Turn Management**
**Problem**: Complex AI turn handling with multiple systems causing conflicts  
**Solution**: 
- Streamlined to single CPU system with clear state management
- Disabled old legacy CPU system
- Added proper timing and visual feedback
- Implemented intelligent decision-making algorithms

### 🎲 **Dice Animation & State Sync**
**Problem**: Keeping dice visual state synchronized with game logic during animations  
**Solution**: 
- Event-driven dice updates
- Proper animation timing with callbacks
- State validation at each step
- Visual feedback for all dice operations

### 🃏 **Power Card Integration**
**Problem**: Complex card effects interacting with core game mechanics  
**Solution**: 
- Modular card effect system
- Proper timing for card activation
- State restoration for persistent effects
- AI evaluation algorithms for card values

### 📱 **Responsive Design**
**Problem**: Complex game board layout working across device sizes  
**Solution**: 
- Flexible CSS Grid and Flexbox layouts
- Adaptive component sizing
- Touch-friendly controls for mobile
- Collapsible panels for space optimization

## Game Balance & Polish

### ⚖️ **Balancing Elements**
- **Tokyo Risk/Reward**: Balanced victory point gains vs. vulnerability
- **Power Card Economy**: Reasonable energy costs and effect values
- **Dice Probability**: Maintained official game probabilities
- **AI Difficulty**: Competitive but not overwhelming CPU opponents

### ✨ **Polish Features**
- **Visual Effects**: Smooth animations and transitions
- **Audio Feedback**: (Ready for implementation)
- **Accessibility**: Keyboard navigation, color contrast
- **User Experience**: Clear feedback, intuitive controls
- **Performance**: Optimized for smooth gameplay

## Code Quality & Maintenance

### 📋 **Development Practices**
- **Comprehensive Debugging**: Extensive logging and error tracking
- **Defensive Programming**: Input validation and edge case handling
- **Modular Architecture**: Clean separation of concerns
- **Documentation**: Inline comments and clear naming conventions
- **Version Control**: Systematic development with clear commit history

### 🧪 **Testing & Validation**
- **Manual Testing**: Extensive gameplay testing across scenarios
- **Edge Case Testing**: Unusual game states and player actions
- **Cross-Browser Testing**: Multiple browser compatibility
- **Performance Testing**: Smooth operation under various conditions

## Current Status

### ✅ **Completed Features**
- Full game mechanics implementation
- 2-6 player support with CPU opponents
- Complete power card system
- Responsive UI with animations
- Save/load functionality
- Comprehensive error handling

### 🔧 **Recent Improvements**
- Enhanced active player visibility in header
- Streamlined CPU turn management
- Eliminated method naming conflicts
- Improved turn transition reliability
- Added defensive turn protection systems
- AI heuristic expansion: Added branch EV simulation comparing alternative keep sets (pairs/special mixes) to refine reroll vs end decisions (Phase 10).

### 🎯 **Future Enhancement Opportunities**
- Sound effects and music
- Online multiplayer capability
- Tournament modes
- Additional power card expansions
- Mobile app packaging
- Localization support
- Accessibility pass (focus traps, aria-live for phase & AI reasoning, keyboard-only flow)
- Deeper multi-roll lookahead (Monte Carlo / iterative EV refinement)

## Development Stats

**Total Development Time**: ~40-50 hours over one week  
**Lines of Code**: ~6,500+ lines  
**Files Created**: 15+ modular files  
**Game Rules Implemented (Legacy Path)**: ≈95% of official King of Tokyo base rules  
**Rewrite Path Coverage (Current)**: ≈70% of those same base rules (see Rewrite Parity table below)  
**Supported Browsers**: Chrome, Firefox, Safari, Edge  
**Player Capacity**: 2-6 players (human/CPU mix)

---

This King of Tokyo implementation represents a complete, polished digital board game with professional-quality code architecture, comprehensive game mechanics, and excellent user experience. The modular design makes it easily extensible for future features while maintaining high performance and reliability.

---

## Rewrite Path (`/new`) Progress Summary (Revised Sept 29, 2025)

### Objective
Establish a maintainable, testable architecture with: pure domain modules, reducer-driven state, explicit services (turn, cards, resolution, effect engine), and declarative UI components registered via `components.config.json`, while preserving near-term visual & rules parity with the legacy implementation.

### Newly Added (Past Hour)
| Feature | Description | Parity Impact |
|---------|-------------|---------------|
| Shop Flush Action | Pay 2⚡ to discard and replace all shop cards (`flushShop`) with UI button (disabled when insufficient energy) | Brings rewrite to rule parity for market cycling |
| Peek Power Card | Added `Clairvoyance` keep card (`effect.kind: 'peek'`); spend 1⚡ to view top deck card for 3s via `peekTopCard` | Extends card system; foundation for hidden/deck intel effects |
| Peek Modal | New component `peekModal` (auto-mount) displaying transient top card | UX clarity for peek action |
| Attack Pulse Visual | Damaged players’ profile cards pulse red (`uiAttackPulse`) + existing shake effect | Improved feedback for damage events |
| Extra Dice Dynamic Rendering | Dice tray now reads `player.modifiers.diceSlots` and renders placeholders & count badge | Correctly visualizes modified dice capacity |
| Mid-Turn Dice Expansion Animation | New dice slots animate (`new-die`, glow & grow) + badge bump | Immediate visual reinforcement of card acquisition |
| Peek & Flush Buttons Integration | Card shop adds contextual `PEEK (1⚡)` + `FLUSH SHOP (2⚡)` with enable/disable logic | Ensures energy gating & phase compliance |

### Architectural Enhancements
1. **Effect Engine Integration**: Previously scaffolded queue now leveraged indirectly via card purchase flow (still pending UI inspector in rewrite path).
2. **State Extensions**: `ui.peek`, `ui.attackPulse` slices with corresponding selectors for clean separation of ephemeral UI states.
3. **Cards Service Expansion**: Added `peekTopCard` + refined `flushShop` semantics (discard old market to discard pile and rebuild shop deterministically).
4. **Visual Layer**: Component-specific CSS modules introduced for peek modal & dice animation (progress toward style tokenization).

### Updated Parity Assessment (See `RULES_PARITY.md` & `GAME_FLOW_PARITY_AUDIT.md`)
Earlier snapshot (Sept 24) overstated parity by focusing solely on mechanical presence. Revised multidimensional evaluation (mechanics + timing + AI + UX + persistence) places rewrite experiential parity at ≈ 50%.

Key mechanical improvements since initial rewrite phase:
- Dual-slot Tokyo (City + Bay) logic and start-of-turn VP differentiation
- Shop flush (2⚡) and peek (clairvoyance) card introduction
- Dynamic dice slot expansion with animation
- Attack pulse visual feedback
- Pause / resume system

Outstanding experiential gaps:
- No finite state machine for phases (timing fragility)
- Mixed yield decision paths (heuristic + timeouts)
- Simplistic AI heuristic (single-layer scoring, no multi-turn EV)
- Effect queue scaffold not operational for complex chains
- Persistence not yet implemented

Remediation roadmap phases (summary):
1. Flow parity: FSM, unified yield, BUY_WAIT phase, dice resolved events
2. Strategic depth & persistence: AI heuristic layers, snapshot system, effect processor MVP
3. UX & observability: timing spans overlay, rationale weighting, accessibility pass
4. Advanced polish: complex card interactions, AI personalities, performance profiling

Re-evaluation will occur after Phase Alpha completion (target mid-October 2025).

### Technical Debt / Open Tasks
- Implement visual effect queue inspector & manual retry / abort controls.
- Add tests for `flushShop`, `peekTopCard`, and modifier recalculation stacking.
- Distinguish Tokyo City vs Bay (separate occupancy + VP awarding logic).
- Integrate log entries for peek (obscured to non-active players if secrecy needed) & shop flush.
- Migrate persistence & settings flows from legacy path into modular store (serialize slices).
- Formalize animation timing tokens & extract repeated color values.
- Accessibility pass for newly added modal (aria roles, focus management).

### Testing Priorities (Next Cycle)
1. Unit: `cardsService.peekTopCard` (energy deduct, deck not mutated, hide timeout).
2. Unit: `cardsService.flushShop` (energy cost, discard accumulation, shop replacement uniqueness).
3. Integration: Dice tray expansion after purchasing extra die card mid-turn.
4. Visual (snapshot / DOM assertions): Attack pulse class toggling & removal after delay.

### Changelog (Rewrite Increment)
```
feat(cards): add clairvoyance peek keep card
feat(ui): peek modal component & ui.peek slice
feat(cards): shop flush (2 energy) action, reducer, service, UI button
feat(ui): attackPulse state + red pulse animation on damage
feat(dice): dynamic diceSlots rendering with placeholders & header count
feat(dice): mid-turn dice slot expansion animation (grow + glow)
chore(css): component styles for peek modal & dice tray animations
refactor(cardsService): modularize peek and flush flows
```

---

## Combined Feature Parity Snapshot (Legacy + Rewrite)
| Dimension | Legacy Path | Rewrite Path | Notes |
|-----------|-------------|--------------|-------|
| Base Rules Coverage | ~95% | ~70% | Remaining: Tokyo Bay distinction, effect UI, persistence |
| Power Card Catalog | Broad (production subset) | Minimal sample + new peek | Will expand gradually; focus on engine correctness first |
| Visual Polish | Mature | Functional + incremental animations | Rewrite prioritizes architecture first |
| Accessibility | Partial (modals labeled recently) | Minimal (peek modal pending aria) | Carry over improvements incrementally |
| Testing | Manual-heavy | Emerging (test specs scaffolded) | Add targeted unit tests next iteration |
| Extensibility | Moderate (monolithic coupling) | High (services + reducers + components) | Rewrite enabling future expansions |

---

End of update (September 24, 2025 Increment).

---

## Increment Update (September 29, 2025)

### Scope of This Increment
Focus on architectural foundations that will allow rapid port / reuse of advanced scenario + deterministic debugging work currently stabilized in the legacy path. This update documents: event intent pipeline design (planned for rewrite integration), forthcoming scenario system shape, and concrete next action items scoped strictly to `new/`.

### Architectural Direction Alignment
| Pillar | Legacy Implementation (Current) | Rewrite Target (Planned Adaptation) | Status |
|--------|----------------------------------|--------------------------------------|--------|
| Phase Transitions | Direct service + scattered UI triggers | Unified UI intent → adapter → phase event → FSM | Design finalized (implementation pending) |
| Scenario Engine | Mature (assignments, params, seeding) | Modular slice + service injection for reproducible setup states | Interface spec drafted |
| Deterministic Tools | Per-scenario seeded card grant | Global RNG facade (dice + cards + AI) | RNG abstraction spec queued |
| Snapshot Persistence | Last scenario snapshot in localStorage | Generalized state serializer (pluggable filters) | Serializer strategy outlined |

### Planned Rewrite Integrations (Derived from Legacy Enhancements)
1. UI Intents Layer: Introduce `eventBus.emit('ui/intent/...')` endpoints for game start, finish roll, yield decision, buy window close, next turn start.
2. Phase Event Service: Thin translation to FSM events (ensures test harness can inject events without DOM coupling).
3. Scenario Slice (Prototype):
  - Shape: `{ assignments: [], activeParams: {}, lastAppliedHash: null, schemaVersion: 1 }`
  - Actions: `queueAssignment`, `applyAssignments`, `clearAssignments`.
4. RNG Facade: `rng.js` exporting deterministic-seedable PRNG with pluggable algorithm (Mulberry32 baseline) + method mapping: `nextFloat()`, `shuffle(array)`, `int(max)`.
5. Deterministic Mode Toggle: Settings slice flag `settings.debug.deterministicSeed` → seeds RNG at bootstrap + logs seed banner.
6. Test Harness Expansion: Add adapter spec mirroring legacy test to validate `GAME_START` → `ROLL` mapping once FSM stub lands.

### New Documentation Artifacts (To Be Added Next Increment)
| Doc | Purpose | Location |
|-----|---------|----------|
| `EVENT_ARCHITECTURE.md` | Formal contract for intents → events → FSM flow | `new/docs/` |
| `SCENARIO_SYSTEM_SPEC.md` | Data model + parameter schema + seeding rules | `new/docs/` |
| `RNG_DESIGN.md` | Deterministic RNG abstraction + extension points | `new/docs/` |

### Immediate Action Checklist (Rewrite Path Only)
- [ ] Introduce `ui/intents.js` skeleton with exported emit helpers.
- [ ] Create `services/phaseEventsService.js` placeholder referencing planned FSM.
- [ ] Draft minimal `core/phaseFSM.js` (SETUP → ROLL → RESOLVE → BUY → CLEANUP cycle) without advanced branching.
- [ ] Add test: `event_adapters.rewrite.spec.js` validating `GAME_START` progression.
- [ ] Add `rng.js` with seed injection (no consumers yet).

### Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Divergence grows between legacy & rewrite event semantics | Higher port friction later | Land intents + FSM skeleton early (this coming cycle) |
| Scenario system port delayed | Reduced ability to fast-forward test states | Implement minimal stub that logs unimplemented apply operations |
| Deterministic mode introduces hidden coupling | Non-reproducible fallback states | Centralize all randomness through facade; CI test asserts identical run hashes |

### Metrics Goals for Next Increment
| Metric | Target |
|--------|--------|
| Event-driven transition coverage | ≥ 60% of phase changes via intents in rewrite |
| RNG centralization | 100% of dice rolls routed through facade |
| Test additions | ≥ 2 new specs (event adapter + RNG determinism) |

### Forward-Looking Notes
Once intents & RNG land, scenario engine port becomes mostly a matter of mapping existing assignment + param schema logic, enabling rapid parity leaps without reintroducing coupling. The rewrite will then support deterministic integration tests to validate parity against legacy snapshots.

End of update (September 29, 2025 Increment).