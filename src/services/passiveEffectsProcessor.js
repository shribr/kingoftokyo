/** services/passiveEffectsProcessor.js
 * Processes passive power card effects that trigger at specific game phases.
 * This handles effects like "gain energy at turn start", "heal when buying cards", etc.
 */

import { playerGainEnergy, playerVPGained, healPlayerAction } from '../core/actions.js';

export function createPassiveEffectsProcessor(store, logger) {
  
  /**
   * Process turn start effects for the active player
   * Called at the beginning of each turn before dice rolling
   */
  function processTurnStartEffects(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    logger?.info(`[PassiveEffects] Processing turn start for ${player.name}`);
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'turn_start_energy':
          // Gas Refinery: Gain X energy at start of turn
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy`);
          store.dispatch(playerGainEnergy(playerId, card.effect.value));
          break;
          
        case 'heal_turn_start':
          // Regeneration: Heal X health at start of turn (if not at max)
          if (player.health < (player.maxHealth || 10)) {
            logger?.info(`[PassiveEffects] ${card.name}: heal ${card.effect.value}`);
            store.dispatch(healPlayerAction(playerId, card.effect.value));
          }
          break;
          
        case 'low_health_bonus':
          // Rooting for the Underdog: Gain energy if health <= 5
          if (player.health <= 5) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy (low health)`);
            store.dispatch(playerGainEnergy(playerId, card.effect.value));
          }
          break;
          
        case 'outside_tokyo_energy':
          // Solar Powered: Gain energy if outside Tokyo
          if (!player.inTokyo) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy (outside Tokyo)`);
            store.dispatch(playerGainEnergy(playerId, card.effect.value));
          }
          break;
          
        case 'heart_vp':
          // Friend of Children: Gain 1 VP if rolled hearts last turn
          // Check if player has rolled hearts flag (set during dice resolution)
          if (player._rolledHearts) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} VP (rolled hearts)`);
            store.dispatch(playerVPGained(playerId, card.effect.value, 'friend_of_children'));
          }
          break;
      }
    }
  }
  
  /**
   * Process buy phase start effects
   * Called when entering BUY phase
   */
  function processBuyPhaseEffects(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    logger?.info(`[PassiveEffects] Processing buy phase start for ${player.name}`);
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'buy_phase_energy':
          // Corner Store: Gain X energy at start of buy phase
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy`);
          store.dispatch(playerGainEnergy(playerId, card.effect.value));
          break;
      }
    }
  }
  
  /**
   * Process dice result effects
   * Called after dice are finalized and before resolving (to trigger symbol-based effects)
   */
  function processDiceResultEffects(playerId, diceResults) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    logger?.info(`[PassiveEffects] Processing dice results for ${player.name}`);
    
    // Count symbols from dice results
    const hearts = diceResults.filter(d => d.face === 'heart').length;
    const skulls = diceResults.filter(d => d.face === 'attack').length;
    const hasOneTwoThree = checkForOneTwoThree(diceResults);
    
    // Set flag for heart_vp to check next turn
    if (hearts > 0) {
      // This would need to be stored in player state (simplified for now)
      logger?.info(`[PassiveEffects] Player rolled ${hearts} hearts - setting flag for Friend of Children`);
    }
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'three_hearts_bonus':
          // Herbivore: Gain energy when rolling 3+ hearts
          if (hearts >= 3) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy (${hearts} hearts)`);
            store.dispatch(playerGainEnergy(playerId, card.effect.value));
          }
          break;
          
        case 'skull_energy':
          // Nuclear Power Plant: Gain energy for each skull
          if (skulls > 0) {
            const bonus = skulls * card.effect.value;
            logger?.info(`[PassiveEffects] ${card.name}: +${bonus} energy (${skulls} skulls)`);
            store.dispatch(playerGainEnergy(playerId, bonus));
          }
          break;
          
        case 'science_bonus':
          // Made in a Lab: Gain VP for rolling 1-2-3
          if (hasOneTwoThree) {
            logger?.info(`[PassiveEffects] ${card.name}: +2 VP (1-2-3 sequence)`);
            store.dispatch(playerVPGained(playerId, 2, 'made_in_a_lab'));
          }
          break;
      }
    }
  }
  
  /**
   * Process VP gain effects
   * Called whenever a player gains VP (to trigger bonus effects)
   */
  function processVPGainEffects(playerId, amount) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'tokyo_bonus_vp':
          // Dedicated News Team: Gain extra VP whenever scoring
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} VP (bonus on scoring)`);
          store.dispatch(playerVPGained(playerId, card.effect.value, 'dedicated_news_team'));
          break;
      }
    }
  }
  
  /**
   * Process damage taken effects
   * Called when a player takes damage
   */
  function processDamageTakenEffects(playerId, amount) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'damage_energy':
          // We're Only Making It Stronger: Gain energy when taking damage
          const bonus = amount * card.effect.value;
          logger?.info(`[PassiveEffects] ${card.name}: +${bonus} energy (took ${amount} damage)`);
          store.dispatch(playerGainEnergy(playerId, bonus));
          break;
      }
    }
  }
  
  /**
   * Process attack bonus effects
   * Called during combat to calculate total damage
   * Returns the bonus damage to add
   */
  function getAttackBonus(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    let bonus = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'attack_bonus') {
        bonus += card.effect.value || 0;
        logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} attack damage`);
      }
    }
    return bonus;
  }
  
  /**
   * Process card purchase effects
   * Called when a player buys a power card
   */
  function processCardPurchaseEffects(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'heal_energy':
          // Rapid Healing: Heal when buying cards
          logger?.info(`[PassiveEffects] ${card.name}: heal ${card.effect.value} (bought card)`);
          store.dispatch(healPlayerAction(playerId, card.effect.value));
          break;
      }
    }
  }
  
  /**
   * Calculate card cost reduction
   * Returns the discount amount for a card purchase
   */
  function getCardCostReduction(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    let reduction = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'cheaper_cards') {
        reduction += card.effect.value || 0;
        logger?.info(`[PassiveEffects] ${card.name}: -${card.effect.value} card cost`);
      }
    }
    return reduction;
  }
  
  // Helper function to check for 1-2-3 sequence in dice
  function checkForOneTwoThree(diceResults) {
    const faces = diceResults.map(d => d.face);
    return faces.includes('1') && faces.includes('2') && faces.includes('3');
  }
  
  return {
    processTurnStartEffects,
    processBuyPhaseEffects,
    processDiceResultEffects,
    processVPGainEffects,
    processDamageTakenEffects,
    getAttackBonus,
    processCardPurchaseEffects,
    getCardCostReduction
  };
}
