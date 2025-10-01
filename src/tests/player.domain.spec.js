import { createPlayer, applyDamage, healPlayer, addEnergy, spendEnergy, addVictoryPoints, enterTokyo, leaveTokyo } from '../domain/player.js';

(function testCreatePlayerDefaults() {
  const p = createPlayer({ id: 'p1', name: 'Player1', monsterId: 'm1' });
  if (p.health !== 10 || p.energy !== 0) throw new Error('Player defaults incorrect');
})();

(function testDamageAndDeath() {
  let p = createPlayer({ id: 'p2', name: 'P2', monsterId: 'm2' });
  p = applyDamage(p, 11);
  if (p.health !== 0 || p.status.alive) throw new Error('Player should be dead');
})();

(function testHealNotInTokyo() {
  let p = createPlayer({ id: 'p3', name: 'P3', monsterId: 'm3' });
  p = applyDamage(p, 5); // health 5
  p = healPlayer(p, 3);
  if (p.health !== 8) throw new Error('Heal failed');
})();

(function testNoHealInTokyo() {
  let p = createPlayer({ id: 'p4', name: 'P4', monsterId: 'm4' });
  p = enterTokyo(p);
  p = applyDamage(p, 2); // 8
  const healed = healPlayer(p, 2);
  if (healed.health !== 8) throw new Error('Should not heal in Tokyo');
})();

(function testEnergyAndVP() {
  let p = createPlayer({ id: 'p5', name: 'P5', monsterId: 'm5' });
  p = addEnergy(p, 3);
  p = spendEnergy(p, 2);
  p = addVictoryPoints(p, 4);
  if (p.energy !== 1 || p.victoryPoints !== 4) throw new Error('Energy/VP operations incorrect');
})();

console.log('[test] player.domain.spec OK');
