/** uiTimings.js
 * Centralized UI/AI timing constants to keep animations and logic in sync.
 * Note: Keep DICE_ANIM_MS in sync with css/components.dice-tray.css (.die.rolling animation duration).
 */

// Dice shake animation duration (matches CSS: .cmp-dice-tray .die.rolling { animation: koShakeSide 0.6s ... })
export const DICE_ANIM_MS = 600;

// Additional delay requested after dice animation ends before AI selects keeps (more natural pacing)
// Reduced from 3000 to 600 to prevent sluggish AI pacing / reroll stalls
export const AI_POST_ANIM_DELAY_MS = 600;

// CPU turn start delay to clearly indicate new turn (must be > card animation time ~1650ms)
export const CPU_TURN_START_MS = 1800;

// CPU decision thinking time between rolls
// Reduced from 2500 to 900 to accelerate CPU multi-reroll loops
export const CPU_DECISION_DELAY_MS = 900;
