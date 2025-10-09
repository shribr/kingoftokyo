# CPU Roll Delay Dev Tools Setting

**Date:** October 9, 2025  
**Feature:** Configurable delay between CPU rolls for testing and observation

## 🎯 Purpose

Added a Dev Tools setting to control the delay between CPU dice rolls, making it easier to observe and debug CPU behavior during testing.

## 📍 Location

**Settings Modal → Dev Tools Tab → "CPU Roll Testing" section**

## 🎛️ Controls

### Slider Input
- **Range:** 0ms to 5000ms
- **Step:** 100ms increments
- **Default:** 1200ms
- **Live Preview:** Value updates as you drag the slider

### Visual Feedback
- Min label: "0ms (instant)"
- Current value: Displayed in blue, updates live
- Max label: "5000ms (slow)"

## ⚙️ How It Works

### Priority System
1. **Dev Tools Override** (highest priority)
   - If `cpuRollDelay` is set in settings, it takes precedence
   - Applies directly to `nextRollDelayMs` in CPU controller
   
2. **CPU Speed Setting** (fallback)
   - If no dev override, uses normal cpuSpeed calculation
   - `nextRollDelayMs = baseDelay * 3`

### Implementation Flow

```
User adjusts slider
    ↓
Value saved to settings.cpuRollDelay
    ↓
turnService.playCpuTurn() checks for override
    ↓
If cpuRollDelay exists → use it directly
If not → calculate from cpuSpeed (normal behavior)
    ↓
Pass to createCpuTurnController(options)
    ↓
CPU uses this delay between rolls
```

## 📝 Code Changes

### 1. Settings Modal (settings-modal.component.js)

**HTML Added:**
```html
<div class="field">
  <label class="field-label">🎲 CPU Roll Testing</label>
  <div style="display:flex;gap:24px;align-items:center;margin-top:8px;">
    <div style="flex:1;">
      <label>Delay Between CPU Rolls (ms)</label>
      <input type="range" name="cpuRollDelay" min="0" max="5000" step="100" value="1200" />
      <div style="display:flex;justify-content:space-between;">
        <span>0ms (instant)</span>
        <span id="cpu-roll-delay-value">1200ms</span>
        <span>5000ms (slow)</span>
      </div>
    </div>
  </div>
  <div class="field-help">Control delay for easier observation during testing...</div>
</div>
```

**JavaScript Added:**
- `attachCPUDelaySlider()` - Updates display as slider moves
- Added to `collectSettingsFromForm()` - Saves value
- Added to `applySettingsToForm()` - Restores value on modal open
- Added to save handler - Applies to `window.__KOT_NEW__.cpuController.settings` if available

### 2. Turn Service (turnService.js)

**Modified `playCpuTurn()`:**
```javascript
// Check for Dev Tools override (cpuRollDelay takes precedence if set)
const devToolsDelay = stPre.settings?.cpuRollDelay;
const useDevDelay = typeof devToolsDelay === 'number' && devToolsDelay >= 0;

const timingOptions = {
  nextRollDelayMs: useDevDelay ? devToolsDelay : baseDelay * 3,
  // ... other timing options
};

if (useDevDelay) {
  console.log(`[turnService] CPU timing using Dev Tools override: ${devToolsDelay}ms between rolls`);
}
```

## 🧪 Usage Examples

### Testing CPU Behavior
1. Open Settings → Dev Tools
2. Set delay to 3000ms (3 seconds)
3. Enable "CPU/AI Decisions" debug logging
4. Start game with CPU players
5. Watch console logs for each roll with 3-second pauses

### Debugging Roll Logic
1. Set delay to 0ms for instant rolls
2. Enable debug logging
3. Observe CPU completing all 3 rolls rapidly
4. Check logs to verify roll counting works correctly

### Demonstrating to Users
1. Set delay to 2000ms (2 seconds)
2. Start game
3. CPU turns are slow and easy to follow
4. Can see dice selection happening between rolls

## 🔍 Console Output

When dev override is active:
```
[turnService] CPU timing using Dev Tools override: 2000ms between rolls
[turnService] CPU timing for speed 'normal': { 
  nextRollDelayMs: 2000,
  decisionThinkingMs: 800,
  initialRollDelayMs: 1500
}
```

When setting is changed:
```
[Settings] CPU roll delay updated to 2000ms
```

## 💡 Benefits

1. **Easier Testing**
   - Slow down CPU to observe behavior
   - Speed up for rapid iteration
   - No code changes needed

2. **Better Debugging**
   - See each roll clearly
   - Watch dice keeps being applied
   - Verify 3-roll logic

3. **User Demos**
   - Show off AI thinking process
   - Make CPU turns educational
   - Adjust pacing for audience

4. **Development Workflow**
   - Quick toggle between fast/slow
   - Persists across sessions
   - Combines with debug logging

## 🔧 Technical Notes

- Setting is stored in Redux state (`settings.cpuRollDelay`)
- Persists with game state saves/loads
- Only affects `nextRollDelayMs` (delay between rolls)
- Does not affect `decisionThinkingMs` or `initialRollDelayMs`
- Can be combined with cpuSpeed setting for fine control

## 🎨 UI Design

- Matches existing Dev Tools styling
- Clear min/max labels
- Live value feedback in blue
- Helpful description text
- Positioned logically before debug logging section
