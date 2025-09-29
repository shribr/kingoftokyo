# King of Tokyo - Implementation TODO List
*Original Baseline: December 30, 2024*  
*Revised & Reprioritized: September 29, 2025 (Parity Audit)*

This revision: (1) Marks items completed since baseline, (2) Introduces flow/timing parity tasks, (3) Re-sequences roadmap around Phase FSM, unified yield, AI depth, and persistence.

## ✅ Completed Since Baseline (Dec 2024 → Sept 2025)
- [x] Tokyo dual-slot support (City + Bay) + start-of-turn VP logic
- [x] Shop flush mechanic (2⚡) – functional (logging/tests pending)
- [x] Peek (clairvoyance) card + transient modal
- [x] Dynamic dice slot rendering & expansion animation
- [x] Attack pulse visual feedback layer
- [x] Pause / resume slice & overlay
- [x] Yield prompt scaffold (CPU timeout + heuristic) – to be unified

## 🚨 **CRITICAL FEATURES - MUST IMPLEMENT (Revised)**

### Power Cards System (HIGH PRIORITY – Breadth & Engine)
- [ ] **Expand card catalog** - Currently ~10 cards, need 50+ base game cards
- [ ] **Complex effect engine** - Only basic effects work (VP gain, energy gain)
- [ ] **Card interaction system** - Cards that modify other cards
- [ ] **Effect timing and stacking** - When multiple cards interact
- [ ] **Discard vs Keep mechanics** - Full implementation of both types
- [ ] **Targeted effects** - Cards that target specific players
- [ ] **Conditional effects** - Cards with "if" conditions

### AI Decision System (HIGH PRIORITY – Strategic Depth)  
- [ ] **Strategic decision making** - Multi-turn planning
- [ ] **Personality-based behavior** - Different monster personalities
- [ ] **Card purchase intelligence** - Smart card buying decisions
- [ ] **Risk assessment** - Tokyo stay/leave decisions
- [ ] **Dice keep strategy** - Optimal dice keeping logic
- [ ] **Win condition awareness** - Adapting strategy based on game state

### Game Flow & Timing Integrity (ELEVATED TO HIGH)
- [ ] Phase finite state machine (legal transition table)
- [ ] `turnCycleId` concurrency guard (invalidate stale async tasks)
- [ ] Event-based dice completion (`DICE_ROLL_RESOLVED`) – remove polling loops
- [ ] Minimum phase duration enforcement (ROLL / RESOLVE / BUY_WAIT)
- [ ] Unified yield decision modal (human) + deterministic AI decision promise
- [ ] BUY_WAIT explicit phase (user ends or timeout)
- [ ] Timing span instrumentation + dev overlay (phase durations, reroll latency)
- [ ] Structured takeover sequence tests (attacks → yield → takeover)
- [ ] **Animation system** - Smooth transitions and feedback
- [ ] **Sound effects** - Audio feedback for actions
- [ ] **Error handling** - Graceful error recovery
- [ ] **Edge case handling** - Unusual game state management
- [ ] **Performance optimization** - Smooth gameplay
- [ ] **Mobile responsiveness** - Touch-friendly interface

## 🔧 **TECHNICAL DEBT - FOUNDATION (Updated)**

### Testing & Quality (HIGH PRIORITY – Expanded)
- [ ] Phase FSM transition tests
- [ ] Yield pipeline end-to-end tests (multi-occupant scenarios)
- [ ] Shop flush test (cost & uniqueness)
- [ ] Peek duration / secrecy test (hidden from non-active)
- [ ] Start-of-turn VP dual-slot snapshot test
- [ ] Elimination cleanup (Tokyo slot vacated) tests
- [ ] Dice slot stacking & max cap (8) test
- [ ] AI decision rationale node presence test
- [ ] Timing span integrity (no overlap/negative) test
- [ ] Core legacy parity regression harness (subset)
- [ ] **Unit tests for game logic** - Core rules testing
- [ ] **Integration tests** - Full game flow testing  
- [ ] **Component tests** - UI component behavior
- [ ] **AI decision tests** - AI behavior validation
- [ ] **Performance tests** - Load and stress testing
- [ ] **Accessibility tests** - Screen reader compatibility

### Data & Persistence (PROMOTED TO HIGH)
- [ ] Store snapshot serializer (versioned) – core slices: players, dice, tokyo, cards, meta
- [ ] Snapshot hydrator with validation & migration
- [ ] Autosave cadence (turn end) with debounce
- [ ] Manual export/import UI
- [ ] Corruption detection (state hash) logging
- [ ] **Complete save/load system** - Full game state persistence
- [ ] **Game statistics tracking** - Win rates, preferences
- [ ] **Settings persistence** - User preference storage
- [ ] **Migration system** - Handle data format changes
- [ ] **Export/import games** - Share game states
- [ ] **Cloud save support** - Optional cloud storage

### Developer Experience (LOW PRIORITY)
- [ ] **Development tools** - Debug panels and helpers
- [ ] **Hot reload support** - Faster development cycles
- [ ] **Build optimization** - Faster build times
- [ ] **Code documentation** - Comprehensive API docs
- [ ] **Style guide** - Consistent coding standards

## 🎮 **GAMEPLAY FEATURES - ENHANCEMENT (Adjusted)**

### Advanced Features (MEDIUM PRIORITY)
- [ ] **Game variants** - Dark Edition support
- [ ] **Custom rules** - House rules implementation
- [ ] **Tournament mode** - Multi-game tournaments
- [ ] **Player statistics** - Individual player tracking
- [ ] **Achievement system** - Unlock system
- [ ] **Replay system** - Watch previous games

### User Experience (MEDIUM PRIORITY)
- [ ] **Tutorial system** - New player onboarding
- [ ] **Help system** - In-game help and tips
- [ ] **Accessibility features** - Full WCAG compliance
- [ ] **Internationalization** - Multi-language support
- [ ] **Themes & customization** - Visual customization
- [ ] **Keyboard shortcuts** - Power user features

## 🎨 **UI/UX IMPROVEMENTS (Augmented)**
- [ ] Yield modal parity (legacy styling cues + clarity copy)
- [ ] BUY_WAIT phase visual timer / hint
- [ ] AI turn pacing indicator (“Thinking…”) with adaptive duration
- [ ] Timing diagnostics panel (dev only) toggle

### Visual Polish (MEDIUM PRIORITY)
- [ ] **Complete theming system** - Consistent visual design
- [ ] **Advanced animations** - Smooth, engaging transitions
- [ ] **Visual feedback** - Clear action confirmation
- [ ] **Loading states** - Better user feedback
- [ ] **Empty states** - Helpful empty state designs
- [ ] **Icon system** - Consistent iconography

### Interaction Design (LOW PRIORITY)
- [ ] **Drag and drop** - Intuitive card/dice interaction
- [ ] **Gesture support** - Touch gestures on mobile
- [ ] **Contextual menus** - Right-click functionality
- [ ] **Hover states** - Desktop interaction feedback
- [ ] **Focus management** - Keyboard navigation
- [ ] **Screen reader support** - Full accessibility

## 📱 **PLATFORM SUPPORT**

### Mobile & Responsive (MEDIUM PRIORITY)
- [ ] **Touch optimization** - Mobile-first interactions
- [ ] **Responsive layouts** - All screen sizes
- [ ] **Performance on mobile** - Smooth mobile experience
- [ ] **PWA features** - App-like mobile experience
- [ ] **Offline support** - Play without internet
- [ ] **App store deployment** - Native app versions

### Browser Support (LOW PRIORITY)
- [ ] **Cross-browser testing** - All major browsers
- [ ] **Polyfill management** - Older browser support
- [ ] **Performance optimization** - Fast loading
- [ ] **Memory management** - Efficient resource use
- [ ] **Error tracking** - Production error monitoring

## 🔍 **IMPLEMENTATION PRIORITIES (New Sequencing)**
### Phase Alpha (Flow Parity)
1. FSM + `turnCycleId`
2. Dice roll resolved event & CPU loop refactor
3. Unified yield & takeover sequence
4. BUY_WAIT phase + timing spans

### Phase Beta (Strategic Depth & Persistence)
1. AI heuristic modules (survival, VP delta, economy, Tokyo risk)
2. Snapshot persistence + export/import UI
3. Expanded card catalog (+10–15 cards)
4. Effect processor MVP (sequential resolution)

### Phase Gamma (UX & Observability)
1. Timing diagnostics overlay
2. Rationale tree enrichment (factor weights)
3. Yield & buy UX polish (copy, accessibility)
4. Accessibility pass (landmarks, live regions, focus loops)

### Phase Delta (Polish & Extension)
1. Advanced card interactions (conditional triggers, steals)
2. Multi-target selection finalized
3. AI personality weighting layer
4. Performance profiling & micro-optimizations

## 📊 **SUCCESS METRICS (Expanded)**

- [ ] **Feature Parity**: 90%+ of legacy features implemented
- [ ] **Performance**: <2s initial load, <100ms interactions
- [ ] **Accessibility**: WCAG AA compliance
- [ ] **Testing**: 80%+ code coverage
- [ ] **User Experience**: Smooth, responsive gameplay
- [ ] **Stability**: <1% error rate in production
- [ ] **Turn Timing Consistency**: CPU turn σ/μ < 0.25 (100-turn sample)
- [ ] **Yield Decision Latency**: <300ms AI, immediate modal human
- [ ] **Phase Transition Violations**: 0 in automated suite
- [ ] **Stale Async Actions**: 0 after FSM integration
- [ ] **AI Rationale Coverage**: >85% major actions annotated with factor weights

---

**Note**: Revisions incorporate parity audit findings (Sept 29, 2025). Legacy remains the reference standard until Flow Parity (Phase Alpha) is achieved.