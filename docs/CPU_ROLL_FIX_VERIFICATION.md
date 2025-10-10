# CPU Roll Fix Verification Test

## Test Scenario

Test that CPU performs exactly 3 rolls before entering Tokyo Bay.

## Setup

1. Start a game with 5+ players (to enable Tokyo Bay)
2. Ensure at least one player is CPU
3. Ensure Tokyo City is occupied by a different player
4. Let CPU take its turn

## Enable Debug Logging

```javascript
window.__KOT_DEBUG__ = { logCPUDecisions: true };
```

## Expected Console Output

```
[cpuController] Waiting 1500ms before starting rolls...
[cpuController] Starting roll 1/3, initial=true
[cpuController] Pre-roll state: rerolls=2, faces=0
... (dice roll animation) ...
[cpuController] AI decision: {"action":"keep","keepDice":[...]}
[cpuController] Dice state after keeps: kept=[...], unkept=[...]
[cpuController] Stop check: action=keep, rerollsRemaining=2, hasUnkeptDice=true, rollNumber=1
[cpuController] Continuing to next roll...
[cpuController] NOT decrementing - roll 1 was the initial roll  ← CRITICAL
[cpuController] Starting roll 2/3, initial=false
[cpuController] Pre-roll state: rerolls=2, faces=6
... (dice roll animation) ...
[cpuController] AI decision: {"action":"keep","keepDice":[...]}
[cpuController] Dice state after keeps: kept=[...], unkept=[...]
[cpuController] Stop check: action=keep, rerollsRemaining=2, hasUnkeptDice=true, rollNumber=2
[cpuController] Continuing to next roll...
[cpuController] Decrementing reroll counter after roll 2 (was a reroll)  ← CRITICAL
[cpuController] Starting roll 3/3, initial=false
[cpuController] Pre-roll state: rerolls=1, faces=6
... (dice roll animation) ...
[cpuController] AI decision: {"action":"keep","keepDice":[...]}
[cpuController] Dice state after keeps: kept=[...], unkept=[...]
[cpuController] Stop check: action=keep, rerollsRemaining=1, hasUnkeptDice=false, rollNumber=3
[cpuController] Stopping after roll 3: {stop: true, maxRolls: 3, ...}
```

## Check Dice State After Each Roll

```javascript
// After roll 1:
window.__KOT_NEW__.store.getState().dice.rerollsRemaining
// Expected: 2

// After roll 2:
window.__KOT_NEW__.store.getState().dice.rerollsRemaining
// Expected: 1

// After roll 3:
window.__KOT_NEW__.store.getState().dice.rerollsRemaining
// Expected: 0
```

## Tokyo Bay Entry Timing

**BEFORE FIX:**
- ❌ CPU rolls once
- ❌ Turn ends early
- ❌ cleanup() runs
- ❌ Tokyo Bay auto-entry triggers immediately

**AFTER FIX:**
- ✅ CPU rolls 3 times
- ✅ All rolls complete
- ✅ Turn ends normally
- ✅ cleanup() runs
- ✅ Tokyo Bay auto-entry happens at END of turn (correct!)

## Visual Verification

Watch the dice tray during CPU turn:
1. **Roll 1**: Dice appear (initial roll)
2. **Pause** (AI thinking)
3. **Roll 2**: Some dice reroll
4. **Pause** (AI thinking)
5. **Roll 3**: Remaining dice reroll
6. **Resolution**: Dice effects applied
7. **Tokyo Bay Entry**: CPU enters Bay (if conditions met)

## Common Issues

### Issue: CPU still only rolls once

**Possible causes:**
1. AI returning `action: 'endRoll'` on first roll
2. All dice kept after first roll (`!hasUnkeptDice = true`)
3. Some other code dispatching `diceRollCompleted()` early

**Debug steps:**
1. Check AI decision: Look for `"action":"endRoll"` in logs
2. Check dice state: Look for all dice being kept
3. Search for rogue `diceRollCompleted()` calls

### Issue: CPU rolls 2 times instead of 3

**Possible cause:**
The decrement is still happening on the initial roll.

**Verify:**
Look for this log line after roll 1:
```
[cpuController] NOT decrementing - roll 1 was the initial roll
```

If you see:
```
[cpuController] Decrementing reroll counter after roll 1
```

Then the `initial` flag is not working correctly.

### Issue: CPU rolls 4+ times

**Possible cause:**
Decrement not happening at all.

**Verify:**
Check that you see decrement messages after rolls 2 and 3.

## Test with Custom Delay

Slow down CPU for easier observation:

1. Open Settings → Dev Tools
2. Set "CPU Roll Delay" slider to 3000ms (3 seconds)
3. Save Settings
4. Start game with CPU
5. Watch CPU turn in slow motion

You should clearly see 3 separate rolls with pauses between them.

## Success Criteria

✅ CPU performs exactly 3 rolls (or stops early only if AI decides to end)
✅ `rerollsRemaining` decrements correctly: 2 → 1 → 0
✅ Initial roll does NOT decrement counter
✅ Tokyo Bay entry happens AFTER all rolls complete
✅ No premature turn ending

## File Modified

- `src/services/cpuTurnController.js` lines 276-288
  - Added conditional: `if (!initial)` around `store.dispatch(diceRollCompleted());`
  - Added debug logging for initial vs reroll
