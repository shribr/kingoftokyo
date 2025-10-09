/**
 * domain/player.js
 * Player model operations (pure functions).
 */
import { clamp } from '../utils/math.js';

export function createPlayer({ id, name, monsterId }) {
  return {
    id,
    name,
    monsterId,
    health: 10,
    energy: 0,
    victoryPoints: 0,
    inTokyo: false,
    powerCards: [],
    modifiers: { diceSlots: 6, rerollBonus: 0 },
    status: { alive: true }
  };
}

export function applyDamage(player, amount) {
  if (amount <= 0) return player;
  const health = clamp(player.health - amount, 0, 10);
  return { ...player, health, status: { ...player.status, alive: health > 0 } };
}

export function healPlayer(player, amount) {
  if (amount <= 0) return player;
  if (player.inTokyo) return player; // cannot heal in Tokyo (core rule)
  const health = clamp(player.health + amount, 0, 10);
  return { ...player, health };
}

export function addEnergy(player, amount) {
  if (!amount) return player;
  return { ...player, energy: Math.max(0, player.energy + amount) };
}

export function spendEnergy(player, amount) {
  if (amount <= 0) return player;
  if (player.energy < amount) return player; // insufficient – caller should validate
  return { ...player, energy: player.energy - amount };
}

export function addVictoryPoints(player, amount) {
  if (!amount) return player;
  return { ...player, victoryPoints: Math.max(0, player.victoryPoints + amount) };
}

export function enterTokyo(player) {
  return { ...player, inTokyo: true };
}

export function leaveTokyo(player) {
  return { ...player, inTokyo: false };
}

export function recalcModifiers(player) {
  // Base defaults
  let diceSlots = 6; // standard
  let rerollBonus = 0;
  for (const c of (player.powerCards || [])) {
    if (!c.effect) continue;
    switch (c.effect.kind) {
      case 'dice_slot':
        diceSlots += c.effect.value || 0; break;
      case 'reroll_bonus':
        rerollBonus += c.effect.value || 0; break;
      default:
        break;
    }
  }
  return { ...player, modifiers: { diceSlots, rerollBonus } };
}
