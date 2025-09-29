/** player-profile-cards.component.js
 * Multi-instance manager for Player Profile Card components.
 * Responsibilities:
 *  - Observe players slice; create/remove individual card instances.
 *  - Delegate updates only for changed players (simple naive pass for now; can diff later).
 *  - Provide container wrapper for future layout rail integration.
 *  - Does NOT touch legacy UI.
 */
import { store } from '../../bootstrap/index.js';
import { selectPlayerOrder, selectUIAttackPulse, selectUIVPFlash, selectUIEnergyFlash, selectUIHealthFlash } from '../../core/selectors.js';
import { build as buildCard, update as updateCard } from '../player-profile-card/player-profile-card.component.js';
import { createPositioningService } from '../../services/positioningService.js';

export function build({ selector }) {
  const root = document.createElement('div');
  root.className = selector.slice(1) + ' layout-rail--players';
  root.innerHTML = `<div class="ppc-cards-wrapper" data-cards-wrapper></div>`;
  const instances = new Map(); // playerId -> { root, update }
  const positioning = createPositioningService(store);
  positioning.hydrate();
  return { root, update: () => update(root, instances, positioning), destroy: () => destroy(root, instances) };
}

function destroy(root, instances) {
  instances.forEach(inst => inst.root.remove());
  instances.clear();
  root.remove();
}

export function update(root, instances, positioning) {
  const state = store.getState();
  const order = selectPlayerOrder(state);
  const pulse = selectUIAttackPulse(state);
  const vpFlash = selectUIVPFlash(state);
  const energyFlash = selectUIEnergyFlash(state);
  const healthFlash = selectUIHealthFlash(state);
  const wrapper = root.querySelector('[data-cards-wrapper]');
  if (!wrapper) return;

  // Remove cards no longer present
  [...instances.keys()].forEach(id => { if (!order.includes(id)) { instances.get(id).root.remove(); instances.delete(id); } });

  // Ensure ordering & create missing
  order.forEach((playerId, idx) => {
    let inst = instances.get(playerId);
    if (!inst) {
      inst = buildCard({ selector: '.cmp-player-profile-card', playerId });
      wrapper.appendChild(inst.root);
      instances.set(playerId, inst);
      positioning.makeDraggable(inst.root, `playerProfileCard:${playerId}`);
    }
    // Order enforcement (naive)
    if (wrapper.children[idx] !== inst.root) {
      wrapper.insertBefore(inst.root, wrapper.children[idx] || null);
    }
    inst.update({ playerId });
    // Attack pulse application
    if (pulse && pulse.playerIds && pulse.playerIds.includes(playerId)) {
      inst.root.classList.add('attack-pulse');
      // Remove after animation duration (~2s) to allow re-trigger
      setTimeout(() => inst.root.classList.remove('attack-pulse'), 2000);
    }
    // VP flash animation
    if (vpFlash && vpFlash.playerId === playerId && vpFlash.ts > 0) {
      if (!inst._lastVPFlash || inst._lastVPFlash !== vpFlash.ts) {
        inst._lastVPFlash = vpFlash.ts;
        const vpStat = inst.root.querySelector('.ppc-stat.vp');
        if (vpStat) {
          vpStat.classList.add('vp-flash');
          setTimeout(() => vpStat.classList.remove('vp-flash'), 1500);
        }
      }
    }
    // Energy flash animation
    if (energyFlash && energyFlash.playerId === playerId && energyFlash.ts > 0) {
      if (!inst._lastEnergyFlash || inst._lastEnergyFlash !== energyFlash.ts) {
        inst._lastEnergyFlash = energyFlash.ts;
        const energyStat = inst.root.querySelector('.ppc-stat.energy');
        if (energyStat) {
          energyStat.classList.add('energy-flash');
          setTimeout(() => energyStat.classList.remove('energy-flash'), 1500);
        }
      }
    }
    // Health flash animation
    if (healthFlash && healthFlash.playerId === playerId && healthFlash.ts > 0) {
      if (!inst._lastHealthFlash || inst._lastHealthFlash !== healthFlash.ts) {
        inst._lastHealthFlash = healthFlash.ts;
        const healthBar = inst.root.querySelector('.ppc-health-bar');
        if (healthBar) {
          healthBar.classList.add('health-flash');
          setTimeout(() => healthBar.classList.remove('health-flash'), 1500);
        }
      }
    }
  });
}
