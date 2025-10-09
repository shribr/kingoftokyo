# King of Tokyo - Async vs Sync Architecture Audit

**Date**: October 8, 2025  
**Purpose**: Identify and document unnecessary async operations and excessive logging causing background noise

---

## 🔴 CRITICAL ISSUES - Background Noise Sources

### 1. **Global Store Subscription in mountRoot.js** (MAJOR PERFORMANCE ISSUE)
**Location**: `src/ui/mountRoot.js:95`

**Problem**: Every component's update function is called on EVERY store change, regardless of whether relevant state changed.

```javascript
store.subscribe((state) => {
  for (const { entry, inst, modFns } of registry.values()) {
    // This loop runs for ALL components on EVERY state change!
    inst.update({ state: sliceState(entry.stateKeys, state) });
  }
});
```

**Impact**:
- 20+ components updating on every Redux action
- Causes cascading re-renders
- Excessive DOM manipulation
- Console spam from component update logs

**Solution**: Implement selective updates based on `stateKeys` comparison
```javascript
store.subscribe((state, action) => {
  for (const { entry, inst, modFns } of registry.values()) {
    // Only update if relevant state keys changed
    if (hasRelevantStateChange(entry.stateKeys, action)) {
      inst.update({ state: sliceState(entry.stateKeys, state) });
    }
  }
});
```

---

### 2. **Excessive Component Logging**

#### High-Frequency Loggers (fire on every state update):
- **monsters-panel.component.js:219** - Logs stats flash on every update
- **cpuTurnController.js** - 20+ console.log statements during CPU turns
- **mini-power-cards-collection.component.js** - Verbose show/hide logging

**Solution**: Move to DEBUG mode only or remove entirely

---

### 3. **Multiple Store Subscriptions Creating Redundant Work**

Current subscriptions (22 total):
1. ✅ mountRoot.js (component updates) - **KEEP but optimize**
2. ✅ effectEngine.js (effect processing) - **KEEP**
3. ❓ positioningService.js:42 - **AUDIT: May be redundant**
4. ❓ audioService.js:12 - **AUDIT: May batch updates**
5. ✅ settingsService.js:31 - **KEEP**
6. ✅ turnService.js:140 - **KEEP**
7. ❓ tokyoEntryAnimationService.js:38 - **AUDIT: May trigger unnecessarily**
8. ✅ aiDecisionService.js:43 - **KEEP**
9. ❓ settings-modal.component.js:103,223 - **AUDIT: 2 subscriptions, consolidate?**
10. ✅ mini-power-cards.component.js:50 - **KEEP**
11. ✅ mini-player-card.component.js:32 - **KEEP**
12. ✅ mini-deck.component.js:45 - **KEEP**
13. ❓ enhanced-integration.js:155 - **AUDIT: Legacy?**
14. ❓ new-modals.js:1120,1272 - **AUDIT: Dev tools, disable in prod**
15. ✅ bootstrap/index.js:321 - **KEEP**
16. ✅ mini-power-cards-collection.component.js:348 - **KEEP**

---

## ⚠️ ASYNC PATTERNS AUDIT

### Necessary Async Operations (KEEP)
✅ **Component Loading** (`mountRoot.js`)
- Dynamic imports for code splitting
- **Status**: GOOD - Only runs on app init

✅ **CPU Turn Delays** (`cpuTurnController.js`)
- Artificial delays for UX (simulate thinking)
- **Status**: GOOD - Enhances user experience

✅ **Animation Delays** (various)
- `setTimeout` for visual transitions
- **Status**: GOOD - Cosmetic only

✅ **LocalStorage Operations** (`archiveManagementService.js`)
- I/O operations must be async
- **Status**: GOOD - Proper use of async

---

### Unnecessary Async Patterns (REMOVE/SIMPLIFY)

❌ **Effect Engine** (`effectEngine.js`)
**Problem**: Uses `store.subscribe()` to watch for effects, but effects are processed synchronously
**Impact**: Creates callback hell and makes debugging harder
**Solution**: Process effects synchronously in reducers or as middleware

❌ **Positioning Service** (`positioningService.js:42`)
```javascript
store.subscribe(() => {
  // Reposition elements on every state change?
  // This seems excessive
});
```
**Problem**: May reposition on every state change
**Solution**: Only reposition on specific actions (window resize, active player change)

---

## 📊 STORE UPDATE FREQUENCY

### Actions That Trigger Store Updates:
1. **High Frequency** (multiple per second during CPU turns):
   - DICE_ROLLED
   - DICE_KEPT
   - DICE_RELEASED
   - PLAYER_VP_GAINED
   - PLAYER_ENERGY_CHANGED
   - CARD_EFFECT_* (various)

2. **Medium Frequency** (once per turn):
   - TURN_STARTED
   - TURN_ENDED
   - ACTIVE_PLAYER_CHANGED

3. **Low Frequency** (rare):
   - GAME_STARTED
   - MONSTER_SELECTION_*
   - SETTINGS_*

---

## 🎯 RECOMMENDED OPTIMIZATIONS

### Priority 1: Fix Global Component Update Loop
```javascript
// Current (BAD):
store.subscribe((state) => {
  for (const { entry, inst } of registry.values()) {
    inst.update({ state: sliceState(entry.stateKeys, state) }); // ALL components
  }
});

// Proposed (GOOD):
let previousState = store.getState();
store.subscribe((state, action) => {
  for (const { entry, inst } of registry.values()) {
    if (!entry.stateKeys || entry.stateKeys.length === 0) continue;
    
    // Check if any relevant state slice changed
    const hasChange = entry.stateKeys.some(key => 
      previousState[key] !== state[key]
    );
    
    if (hasChange) {
      inst.update({ state: sliceState(entry.stateKeys, state) });
    }
  }
  previousState = state;
});
```

### Priority 2: Remove Excessive Logging
- Remove all `console.log` from component update functions
- Add `DEBUG` flag for development-only logging
- Keep only `console.warn` and `console.error` for actual issues

### Priority 3: Batch Store Updates
Instead of multiple dispatches, use batch actions:
```javascript
// Bad:
store.dispatch(playerVPGained(id, 2));
store.dispatch(playerGainEnergy(id, 1));
store.dispatch(healPlayerAction(id, 3));

// Good:
store.dispatch(playerStatsChanged(id, { vp: +2, energy: +1, health: +3 }));
```

### Priority 4: Debounce UI Updates
For non-critical UI updates (positioning, animations), use debouncing:
```javascript
const debouncedReposition = debounce(() => {
  repositionElements();
}, 100);

store.subscribe((state, action) => {
  if (action.type === 'WINDOW_RESIZED') {
    debouncedReposition();
  }
});
```

---

## 🔍 DEBUGGING TOOLS

### Enable Debug Mode
```javascript
// Add to bootstrap/index.js
window.__KOT_DEBUG__ = {
  logStoreUpdates: false,
  logComponentUpdates: false,
  logSubscriptions: false
};

// Then in code:
if (window.__KOT_DEBUG__?.logComponentUpdates) {
  console.log('[Component] Updating...', data);
}
```

### Monitor Store Update Frequency
```javascript
let updateCount = 0;
let lastLog = Date.now();

store.subscribe(() => {
  updateCount++;
  const now = Date.now();
  if (now - lastLog > 1000) {
    console.log(`Store updates/sec: ${updateCount}`);
    updateCount = 0;
    lastLog = now;
  }
});
```

---

## 📝 ASYNC vs SYNC DECISION MATRIX

| Operation | Current | Should Be | Reason |
|-----------|---------|-----------|--------|
| Component loading | Async | Async ✅ | Dynamic imports required |
| Store updates | Sync | Sync ✅ | State changes are immediate |
| Effect processing | Mixed | Sync ⚠️ | Game logic should be deterministic |
| CPU turn delays | Async | Async ✅ | UX enhancement |
| Dice resolution | Sync | Sync ✅ | Immediate calculation |
| Animation triggers | Async | Async ✅ | Visual only |
| LocalStorage | Async | Async ✅ | I/O operation |
| Positioning | Sync | Sync ⚠️ | Only on specific events |
| Audio playback | Async | Async ✅ | Browser API requirement |

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Stop the Bleeding (Immediate)
1. Comment out all non-critical `console.log` statements
2. Add early returns to update functions if state hasn't changed
3. Document current behavior

### Phase 2: Optimize Store Subscriptions (Week 1)
1. Implement selective component updates in mountRoot.js
2. Add state change detection
3. Remove redundant subscriptions

### Phase 3: Batch Operations (Week 2)
1. Create batch action creators
2. Refactor effect engine to batch updates
3. Add Redux middleware for batching

### Phase 4: Polish (Week 3)
1. Add debug mode flag
2. Create performance monitoring tools
3. Document optimal patterns

---

## 📈 EXPECTED IMPROVEMENTS

After implementing these changes:
- **90% reduction** in console log spam
- **50-70% reduction** in component update calls
- **30-50% improvement** in frame rate during CPU turns
- **Easier debugging** with cleaner console output
- **Better performance** on slower devices

---

## 🔗 RELATED DOCUMENTS
- [IMPLEMENTATION_TODO.md](./IMPLEMENTATION_TODO.md)
- [INTEGRATION_FIX_SUMMARY.md](./INTEGRATION_FIX_SUMMARY.md)
- [GAME_FLOW_PARITY_AUDIT.md](./GAME_FLOW_PARITY_AUDIT.md)
