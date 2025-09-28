/** uiTimings.js
 * Centralized UI/AI timing constants to keep animations and logic in sync.
 * Note: Keep DICE_ANIM_MS in sync with css/components.dice-tray.css (.die.rolling animation duration).
 */

// Dice shake animation duration (matches CSS: .cmp-dice-tray .die.rolling { animation: koShakeSide 0.6s ... })
export const DICE_ANIM_MS = 600;

// Additional delay requested after dice animation ends before AI selects keeps
export const AI_POST_ANIM_DELAY_MS = 2000;
