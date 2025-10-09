# Bug Fixes Summary - October 6, 2025

## Issues Fixed

### 1. ✅ Removed Duplicate Yield Tokyo Modal
**Problem:** Two yield Tokyo modals were appearing - one main modal in center and a tiny one in bottom-right corner.

**Solution:** 
- Disabled the deprecated `tokyo-yield-modal.component.js` in `components.config.json`
- Set `enabled: false` and added deprecation note
- The modern unified `YieldModal.js` in `src/ui/components/` is now the only yield modal

**Files Changed:**
- `components.config.json` - Line 342: Set `enabled: false` for `tokyoYieldModal`

---

### 2. ✅ Added Power Card Purchase Confirmation Modal
**Problem:** No confirmation modal when buying power cards from the side panel.

**Solution:**
- Added confirmation modal system to `power-cards-panel.component.js`
- Uses same pattern as `card-shop.component.js` with `uiConfirmOpen` action
- Shows card name, cost, and effect description before purchase
- User must click "Buy Card" or "Cancel" to proceed

**Files Changed:**
- `src/components/power-cards-panel/power-cards-panel.component.js`:
  - Added import for `uiConfirmOpen`
  - Added `pendingPurchase` tracking variable
  - Added confirmation event listener
  - Modified `addShopEventListeners()` to show confirmation modal before purchase
  - Added effect description formatting for common card types

**Implementation:**
```javascript
// Confirmation modal with card details
const message = `Purchase "${card.name}" for ${card.cost}⚡?\n\n${effectDesc}`;
store.dispatch(uiConfirmOpen('purchase-card-panel', message, 'Buy Card', 'Cancel'));

// Purchase only happens after user confirms
window.addEventListener('ui.confirm.accepted', (e) => {
  if (e.detail.confirmId === 'purchase-card-panel' && pendingPurchase) {
    purchaseCard(store, logger, playerId, cardId);
  }
});
```

---

### 3. ✅ Fixed Attack Dice Timing (Resolved Too Early)
**Problem:** Attack dice effects were being applied while the CPU's turn was still visually active, making it feel like attacks happened "before the CPU ended its turn".

**Root Cause:**
- Attack resolution happens in the RESOLVE phase (correct game logic)
- However, the dice animation completed and attacks applied instantly
- No visual pause to show "turn is ending, effects incoming"
- User perceived attacks as premature because CPU was still the active player

**Solution:**
- Added CPU-specific resolution delay in `turnService.js` `resolve()` function
- Delay duration based on CPU speed setting:
  - Slow: ~1600ms pause before attack resolution
  - Normal: ~800ms pause before attack resolution  
  - Fast: ~400ms pause before attack resolution
- This gives visual feedback that the turn is completing before attacks are applied
- Human turns are unaffected (no additional delay)

**Files Changed:**
- `src/services/turnService.js`:
  - Added check for CPU/AI player after dice animation completes
  - Calculates resolution delay based on `cpuSpeed` setting
  - Adds visual pause before calling `resolveDice()`
  - Logs delay duration for debugging

**Implementation:**
```javascript
// After dice animation completes (700ms wait)
const stateForDelay = store.getState();
const currentActiveId = selectActivePlayerId(stateForDelay);
const currentActivePlayer = currentActiveId ? stateForDelay.players.byId[currentActiveId] : null;

if (currentActivePlayer && (currentActivePlayer.isCPU || currentActivePlayer.isAI)) {
  const cpuSpeed = stateForDelay.settings?.cpuSpeed || 'normal';
  const baseDelay = computeDelay(stateForDelay.settings);
  const resolutionDelay = Math.max(400, baseDelay * 2); // 400-1600ms
  console.log(`⏱️ CPU turn resolution pause: ${resolutionDelay}ms before applying attack effects`);
  await waitUnlessPaused(store, resolutionDelay);
}

// Now resolve attacks with proper visual timing
resolveDice(store, logger);
```

**User Experience:**
- CPU rolls dice → animation plays (700ms)
- Brief pause showing final dice result (400-1600ms based on speed)
- Attack effects apply (damage, yield prompts)
- Turn advances to next phase
- Feels more natural and gives time to see what the CPU rolled

---

### 4. 🔍 AI Modals Auto-Showing Investigation
**Problem:** AI Decision Tree and AI Reasoning modals briefly flash during CPU turns when dice resolve and yield prompts appear.

**Investigation:**
- Added extensive debug logging to track when modals are created/shown
- Stack traces will identify the exact code path triggering modals
- No obvious auto-show code found in modal system or AI services

**Files Changed:**
- `src/utils/new-modal-system.js`:
  - Added debug logging with stack traces to `showModal()` for AI modals
  
- `src/utils/new-modals.js`:
  - Added debug logging with stack traces to `createAIDecisionModal()`
  
- `src/components/ai-decision-tree/ai-decision-tree-reasoning.js`:
  - Added debug logging with stack traces to `showReasoningInfoModal()`

**Debug Markers:**
- `🚨 [MODAL-DEBUG]` - When modals are shown
- `🔍 [MODAL-DEBUG]` - When modals are created

**Next Steps:**
User should play game, watch for modal flashing, then check browser console for debug logs with stack traces showing where modals are being triggered.

---

## Previous Fixes (From Earlier Session)

### 5. ✅ CPU Speed Control
- Implemented dynamic CPU speed based on `settings.cpuSpeed` setting
- Three speeds: slow (800ms base), normal (400ms base), fast (150ms base)
- Applied to roll delays, thinking time, and decision timing

### 6. ✅ CPU Rolling Only Once Bug
- Added `NEXT_TURN` handler in dice.reducer to reset dice state
- Fixes issue where CPU could only roll once per turn

### 7. ✅ Thought Bubble Z-Index
- Set thought bubble z-index to 99999 when visible
- Ensures thought bubbles appear above all other UI elements

---

## Testing Recommendations

1. **Yield Modal:** 
   - Start game, let CPU attack you in Tokyo
   - Verify only ONE yield modal appears (centered)
   - No tiny modal in bottom-right corner

2. **Power Card Purchase:**
   - Gain energy during your turn
   - Click "Buy" on a power card in left panel
   - Confirm modal appears with card details
   - Verify purchase only happens after clicking "Buy Card"

3. **Attack Timing:**
   - Set CPU speed to "Normal" or "Slow"
   - Let CPU roll attack dice (claws)
   - Observe brief pause after dice stop rolling
   - Attack effects should apply AFTER the pause
   - Should feel like "turn ending → attacks resolving" not "attacks during turn"

4. **AI Modal Flashing:**
   - Let CPU take their turn and attack you
   - Watch for any brief modal flashes
   - Open browser console (F12)
   - Look for `🚨 [MODAL-DEBUG]` or `🔍 [MODAL-DEBUG]` logs
   - Share stack traces with developer

---

## Code Quality Notes

- All changes follow existing patterns (card-shop confirmation pattern)
- No system dialogs used - all custom modals
- Proper event-driven architecture maintained
- Debug logging can be removed after issue is resolved
- CPU-specific timing respects user's speed preference
- Human player experience unchanged
