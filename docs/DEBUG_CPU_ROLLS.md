# CPU Roll Debugging Guide

## Issue
CPU entering Tokyo Bay after first roll instead of after last roll.

## Root Cause Analysis
If CPU is only rolling once, the turn ends early → cleanup phase runs → Tokyo Bay auto-entry triggers.

## Debug Steps

### 1. Enable Debug Logging

In browser console:
```javascript
window.__KOT_DEBUG__ = { logCPUDecisions: true };
```

### 2. Watch Console During CPU Turn

Look for these log messages:

```
[cpuController] Starting roll 1/3, initial=true
[cpuController] Pre-roll state: rerolls=2, faces=0
[cpuController] NOT decrementing - roll 1 was the initial roll  ← Should see this
[cpuController] Starting roll 2/3, initial=false
[cpuController] Decrementing reroll counter after roll 2 (was a reroll)  ← Should see this
[cpuController] Starting roll 3/3, initial=false
[cpuController] Decrementing reroll counter after roll 3 (was a reroll)  ← Should see this
```

### 3. Check Dice State

After each roll, check:
```javascript
window.__KOT_NEW__.store.getState().dice.rerollsRemaining
```

**Expected values:**
- After roll 1: `2` (not decremented)
- After roll 2: `1` (decremented once)
- After roll 3: `0` (decremented twice)

### 4. If Still Only 1 Roll

Check for stop conditions being triggered early:

```
[cpuController] Stop condition met: action=... rerollsLeft=... stop=true
```

Possible causes:
- `normalizedAction === 'endRoll'` - AI decided to stop
- `noRerollsLeft = true` - Should be false until after roll 3
- `!hasUnkeptDice` - All dice were kept
- `rollNumber >= settings.maxRolls` - Shouldn't trigger until 3

### 5. Check Stop Condition Logic

The stop check at line 256:
```javascript
const noRerollsLeft = currentRerolls <= 0 && !initial;
```

**This should evaluate to:**
- Roll 1: `currentRerolls=2, initial=true` → `2 <= 0 && !true` → `false && false` → **false** ✓
- Roll 2: `currentRerolls=1, initial=false` → `1 <= 0 && !false` → `false && true` → **false** ✓
- Roll 3: `currentRerolls=0, initial=false` → `0 <= 0 && !false` → `true && true` → **true** ✓

## Possible Issues

### Issue 1: State Race Condition
If `diceRollCompleted()` is dispatched elsewhere (not in cpuTurnController), it could decrement early.

**Check:** Search for other `diceRollCompleted` dispatches:
```bash
grep -r "diceRollCompleted" src/
```

### Issue 2: AI Deciding to End Early
AI might be returning `action: 'endRoll'` after first roll.

**Check:** Look for AI decision in logs:
```
[cpuController] AI decision: {"action":"endRoll",...}
```

### Issue 3: Dice All Kept
If AI keeps all dice after first roll, `!hasUnkeptDice` would be true.

**Check:** Look for:
```
[cpuController] Dice state after keeps: kept=[...], unkept=[]
```

## Quick Fix Test

Force CPU to always do 3 rolls (bypass AI decision):

```javascript
// In browser console during CPU turn:
window.__FORCE_3_ROLLS__ = true;

// Then in cpuTurnController.js, add before stop check:
if (window.__FORCE_3_ROLLS__) {
  normalizedAction = 'keep';
}
```

## Tokyo Bay Entry

Tokyo Bay auto-entry happens in `turnService.js cleanup()`:
- Only triggers with 5+ players
- Only if City occupied, Bay empty
- Only if active player not already in Tokyo
- Happens at END of turn (after cleanup phase)

**If CPU only rolls once → turn ends early → cleanup runs → Bay entry happens!**
