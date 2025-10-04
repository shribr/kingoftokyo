/** Lightweight test harness for player-profile-card component (Step 5)
 * Not a full framework; simple assertions via console.
 */
import { build as buildCard, update as updateCard } from '../components/player-profile-card/player-profile-card.component.js';
import { store } from '../bootstrap/index.js';
import { playerJoined, playerGainEnergy, healPlayerAction, playerVPGained, playerEnteredTokyo } from '../core/actions.js';

function assert(desc, cond) {
  console.log((cond ? '✅' : '❌') + ' ' + desc);
  if(!cond) throw new Error('Assertion failed: ' + desc);
}

export function runPlayerProfileCardTest() {
  // Seed player
  const player = { id: 'P1', name: 'Gigazaur', health: 10, energy: 0, victoryPoints: 0, inTokyo: false, status: { alive: true, active: true }, cards: [] };
  store.dispatch(playerJoined(player));

  const { root } = buildCard({ selector: '.cmp-player-profile-card', playerId: 'P1' });
  document.body.appendChild(root);
  updateCard(root, { playerId: 'P1' });

  assert('Name rendered', root.querySelector('[data-name]').textContent === 'Gigazaur');
  assert('HP rendered', root.querySelector('[data-hp-value]').textContent === '10');
  store.dispatch(playerGainEnergy('P1', 3));
  updateCard(root, { playerId: 'P1' });
  assert('Energy updated to 3', root.querySelector('[data-energy-value]').textContent === '3');
  store.dispatch(healPlayerAction('P1', 2));
  updateCard(root, { playerId: 'P1' });
  assert('HP healed to 12', root.querySelector('[data-hp-value]').textContent === '12');
  store.dispatch(playerVPGained('P1', 5));
  updateCard(root, { playerId: 'P1' });
  assert('VP updated to 5', root.querySelector('[data-vp-value]').textContent === '5');
  store.dispatch(playerEnteredTokyo('P1'));
  updateCard(root, { playerId: 'P1' });
  assert('Tokyo indicator shown', /in tokyo (city|bay)/.test(root.querySelector('[data-tokyo-badge]').textContent));
  console.log('Player Profile Card component tests complete');
}
