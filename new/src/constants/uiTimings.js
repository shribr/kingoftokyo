/** uiTimings.js
 * Centralized UI/AI timing constants to keep animations and logic in sync.
 * Note: Keep DICE_ANIM_MS in sync with css/components.dice-tray.css (.die.rolling animation duration).
 */

// Dice shake animation duration (matches CSS: .cmp-dice-tray .die.rolling { animation: koShakeSide 0.6s ... })
export const DICE_ANIM_MS = 600;

// Additional delay requested after dice animation ends before AI selects keeps (more natural pacing)
export const AI_POST_ANIM_DELAY_MS = 3000;

// CPU turn start delay to clearly indicate new turn (must be > card animation time ~500ms)
export const CPU_TURN_START_MS = 800;

// CPU decision thinking time between rolls
export const CPU_DECISION_DELAY_MS = 2500;
