/** power-card-generator.js
 * Reusable generator for power card markup so the same structure can be used
 * in the shop panel, card detail modal, or any other location.
 */
import { getCardInsight } from '../../utils/card-insights.js';

export function generatePowerCard(card, options = {}) {
  if (!card) return '';
  const { playerEnergy = 0, showBuy = true, showFooter = true, infoButton = true } = options;
  const canAfford = playerEnergy >= (card.cost || 0);
  const rarity = getRarity(card);
  const isDarkEdition = !!card.darkEdition; // will be filtered out unless dark mode enabled
  const desc = getCardDescription(card);

  return `
    <div class="pc-card" data-card-id="${card.id}" data-rarity="${rarity}" ${isDarkEdition ? 'data-dark-edition="true"' : ''}>
      <div class="pc-card-header">
        <h4 class="pc-card-name">
          ${card.name}
          ${infoButton ? `<button class=\"pc-card-info-btn\" data-info data-card-id=\"${card.id}\" title=\"View card details\"><span class=\"info-icon\">i</span></button>` : ''}
        </h4>
        <div class="pc-card-cost pc-card-cost--header">${card.cost}⚡</div>
      </div>
      <div class="pc-card-description">${desc}</div>
      <div class="pc-card-cost pc-card-cost--footer">${card.cost}⚡</div>
      ${showFooter ? `<div class=\"pc-card-footer\">${showBuy ? `<button class=\"k-btn k-btn--xs k-btn--primary\" data-buy data-card-id=\"${card.id}\" ${!canAfford ? 'disabled' : ''}>Buy</button>` : ''}</div>` : ''}
    </div>`;
}

function getRarity(card) {
  const cost = card.cost || 0;
  if (cost >= 7) return 'epic';
  if (cost >= 5) return 'rare';
  return 'common';
}

function getCardDescription(card) {
  if (card.description) return card.description;
  const effect = card.effect;
  if (!effect) return 'Special power card';
  switch(effect.kind) {
    case 'vp_gain': return `Gain ${effect.value} Victory Points`;
    case 'energy_gain': return `Gain ${effect.value} Energy`;
    case 'dice_slot': return `Add ${effect.value} extra die`;
    case 'reroll_bonus': return `+${effect.value} reroll per turn`;
    case 'heal_all': return `All monsters heal ${effect.value} damage`;
    case 'heal_self': return `Heal ${effect.value} damage`;
    case 'energy_steal': return `Steal ${effect.value} energy from all players`;
    case 'vp_steal': return `Steal ${effect.value} VP from all players`;
    case 'damage_all': return `Deal ${effect.value} damage to all monsters`;
    case 'damage_tokyo_only': return `Deal ${effect.value} damage to monsters in Tokyo`;
    default: return 'Special effect';
  }
}
