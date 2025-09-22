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
    cards: [],
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
