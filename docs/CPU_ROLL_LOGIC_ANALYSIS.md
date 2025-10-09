# CPU Turn Roll Logic - Critical Issues Found

**Date:** October 9, 2025  
**Issue:** CPU doesn't understand it has exactly 3 rolls and doesn't select dice to keep

## 🔴 ROOT CAUSE IDENTIFIED

### The Core Problem

The CPU's roll logic has a **critical misunderstanding of how roll counting works**:

**Expected behavior:** 3 total rolls (1 initial + 2 rerolls)  
**Actual behavior:** CPU treats the initial roll differently and ends early

### The Confusion

The code has **TWO** conflicting mental models:

#### Model A: "3 Total Rolls" (what user expects)
- Roll 1: Initial roll
- Roll 2: First reroll  
- Roll 3: Second reroll
- Total: 3 rolls

#### Model B: "2 Rerolls + 1 Initial" (what code implements)
- `baseRerolls = 2` in dice.reducer.js
- `rerollsRemaining` starts at 2
- `maxRolls = 3` in cpuTurnController.js
- **CONFLICT:** The counter logic doesn't align!

## 🐛 Specific Issues Found

### Issue #1: `rerollsRemaining` Initialization
**Location:** `src/core/reducers/dice.reducer.js:3`

```javascript
const initial = { faces: [], rerollsRemaining: 0, baseRerolls: 2, ... };
```

**Problem:** 
- `baseRerolls: 2` means "2 rerolls allowed"
- But `rerollsRemaining` is set to 2 at the START of dice rolling
- This means the AI thinks it has Roll 1 (initial) + 2 rerolls = 3 total
- **BUT** the logic is decrementing BEFORE checking, not AFTER

### Issue #2: Roll Completion Decrement Timing
**Location:** `src/services/cpuTurnController.js:274-277`

```javascript
// Decrement reroll counter now for next iteration 
if (window.__KOT_DEBUG__?.logCPUDecisions) {
  console.log(`[cpuController] Decrementing reroll counter after roll ${rollNumber}`);
}
store.dispatch(diceRollCompleted());
```

**Problem:**
- This happens AFTER every roll, including the initial roll
- So after Roll 1: `rerollsRemaining` goes from 2 → 1
- After Roll 2: `rerollsRemaining` goes from 1 → 0
- Then the stop check sees `rerollsRemaining = 0` and stops!

### Issue #3: Stop Condition Check
**Location:** `src/services/cpuTurnController.js:254-257`

```javascript
const noRerollsLeft = currentRerolls <= 0 && !initial;
const stop = normalizedAction === 'endRoll' || noRerollsLeft || !hasUnkeptDice;
if (stop || rollNumber >= settings.maxRolls) {
```

**Problem:**
- After Roll 2, `currentRerolls = 0` (was decremented from 1)
- `!initial` is true (not the first roll)
- So `noRerollsLeft = true`
- Loop STOPS even though `rollNumber = 2` and `maxRolls = 3`!

### Issue #4: Dice Selection Not Happening
**Why:** The AI IS making decisions and selecting dice to keep, BUT the async timing causes issues:

1. Roll happens
2. Wait for animation (DICE_ANIM_MS + AI_POST_ANIM_DELAY_MS)
3. AI makes decision
4. AI applies keeps
5. **THEN** immediately decrements rerolls
6. **THEN** checks if should stop
7. Stops early because `rerollsRemaining = 0`

The dice selection IS happening, but the turn ends before you see it matter because the counter logic is wrong!

## 📊 Flow Analysis

### Current Flow (BROKEN):
```
Turn Start
├─ DICE_ROLL_STARTED → rerollsRemaining = 2
├─ Roll 1 (initial)
│  ├─ Animation
│  ├─ AI Decision (select dice to keep)
│  ├─ Apply keeps ✓
│  ├─ DICE_ROLL_COMPLETED → rerollsRemaining = 1
│  └─ Check: rerollsRemaining > 0? YES, continue
├─ Roll 2
│  ├─ Animation
│  ├─ AI Decision (select more dice)
│  ├─ Apply keeps ✓
│  ├─ DICE_ROLL_COMPLETED → rerollsRemaining = 0
│  └─ Check: rerollsRemaining > 0? NO, STOP! ❌
└─ MISSING Roll 3!
```

### Expected Flow:
```
Turn Start
├─ DICE_ROLL_STARTED → rerollsRemaining = 2
├─ Roll 1 (initial) - DON'T decrement yet!
│  ├─ Animation
│  ├─ AI Decision
│  ├─ Apply keeps ✓
│  └─ Check: want to reroll? YES
├─ DICE_ROLL_COMPLETED → rerollsRemaining = 1
├─ Roll 2 (reroll 1)
│  ├─ Animation  
│  ├─ AI Decision
│  ├─ Apply keeps ✓
│  └─ Check: want to reroll? YES
├─ DICE_ROLL_COMPLETED → rerollsRemaining = 0
├─ Roll 3 (reroll 2)
│  ├─ Animation
│  ├─ AI Decision
│  ├─ Apply keeps ✓
│  └─ Check: want to reroll? NO (can't, rerollsRemaining = 0)
└─ DICE_ROLL_RESOLVED → End turn
```

## 🔧 The Fix

### Option 1: Don't Decrement on Initial Roll

**Location:** `src/services/cpuTurnController.js:274`

```javascript
// BEFORE:
store.dispatch(diceRollCompleted());

// AFTER:
if (!initial) {  // Only decrement after rerolls, not initial roll
  store.dispatch(diceRollCompleted());
}
```

**Rationale:** The initial roll shouldn't consume a reroll!

### Option 2: Change Stop Condition Logic

**Location:** `src/services/cpuTurnController.js:254`

```javascript
// BEFORE:
const noRerollsLeft = currentRerolls <= 0 && !initial;

// AFTER:
const noRerollsLeft = currentRerolls < 0; // Less than 0, not <= 0
```

**Rationale:** After Roll 2, we've used 1 reroll. We should get Roll 3 using the last reroll.

### Option 3: Decrement BEFORE Next Roll, Not After Current

**Location:** Restructure the loop to decrement at the START of iteration (for non-initial)

```javascript
while (!cancelled && rollNumber < settings.maxRolls) {
  rollNumber++;
  const initial = rollNumber === 1;
  
  // Decrement BEFORE roll (for non-initial)
  if (!initial && rollNumber > 1) {
    store.dispatch(diceRollCompleted());
  }
  
  // ... perform roll ...
  // ... AI decision ...
  // ... apply keeps ...
  // ... check stop conditions ...
}
```

## 🎯 Recommended Solution

**Use Option 1** - Don't decrement on initial roll.

This is the cleanest fix because:
1. Aligns with game rules (initial roll is FREE)
2. Minimal code change
3. Clear logic: `rerollsRemaining` truly means "rerolls left after this"
4. Matches player mental model

### Implementation

**File:** `src/services/cpuTurnController.js`  
**Line:** ~274

```javascript
// Before stop check, only decrement if not initial roll
if (!initial) {
  if (window.__KOT_DEBUG__?.logCPUDecisions) {
    console.log(`[cpuController] Decrementing reroll counter after roll ${rollNumber}`);
  }
  store.dispatch(diceRollCompleted());
} else {
  if (window.__KOT_DEBUG__?.logCPUDecisions) {
    console.log(`[cpuController] Initial roll - NOT decrementing reroll counter`);
  }
}
```

## 🧪 Testing Checklist

After fix:
- [ ] CPU gets exactly 3 rolls (can see all 3 in logs)
- [ ] CPU selects dice to keep after each roll
- [ ] Dice selection is visible (not instant)
- [ ] `rerollsRemaining` shows: 2 → 1 → 0 (not 2 → 1 → END)
- [ ] Turn ends after Roll 3 (or earlier if AI decides to stop)
- [ ] Human players still get 3 rolls

## 📝 Additional Notes

### Why This Was Hard to Debug

1. **Async timing** - Everything happens fast, hard to see the sequence
2. **Multiple counters** - `rollNumber`, `rerollsRemaining`, both counting
3. **Conflicting semantics** - "3 rolls" vs "2 rerolls" terminology
4. **Early stops** - AI CAN decide to stop early, making it hard to tell if bug or strategy

### Async Timing Issues (Secondary)

The async nature isn't the ROOT cause, but it makes debugging harder:
- Fast execution hides the sequence
- Can't see dice keeps being applied
- Looks like AI isn't thinking when it actually is

**Suggestion:** Add delay visualization in dev mode to slow down and show each step.

## 🔗 Related Files

- `src/services/cpuTurnController.js` - Main roll loop (FIX HERE)
- `src/core/reducers/dice.reducer.js` - Reroll counter management
- `src/services/aiDecisionService.js` - AI decision making (working correctly)
- `src/ai/engine/AIDecisionEngine.js` - AI logic (working correctly)

The AI is actually making good decisions! The problem is the turn controller stops before using them all.
