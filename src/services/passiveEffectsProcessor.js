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
    
    logger?.info(`${player.name} Starts Turn`);
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        // NOTE: Most turn start effects from official cards are not passive
        // They require player interaction or specific conditions
        // These handlers are placeholders until full implementation
        
        case 'heal_bonus':
          // Regeneration: When you heal, heal 1 extra damage
          // This is actually triggered during healing, not at turn start
          // Placeholder for now - needs integration with heal action
          break;
          
        case 'energy_when_zero':
          // Solar Powered: At end of turn gain 1 Energy if you have no Energy
          // This is end-of-turn, not start-of-turn
          // Will be handled in end-of-turn processor
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
    
    logger?.info(`Processing buy phase start for ${player.name}`);
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        // NOTE: No official buy phase passive effects in base game
        // Most buy-related effects are triggered by purchasing specific cards
        default:
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
    
    logger?.info(`Processing dice results for ${player.name}`);
    
    // Count symbols from dice results
    const faces = diceResults.map(d => d.face);
    const hearts = faces.filter(f => f === 'heart').length;
    const skulls = faces.filter(f => f === 'attack').length;
    const energy = faces.filter(f => f === 'energy').length;
    const ones = faces.filter(f => f === '1').length;
    const twos = faces.filter(f => f === '2').length;
    const threes = faces.filter(f => f === '3').length;
    
    // Check for specific combinations
    const hasOneTwoThree = faces.includes('1') && faces.includes('2') && faces.includes('3');
    const hasPerfectRoll = faces.includes('1') && faces.includes('2') && faces.includes('3') && 
                           faces.includes('heart') && faces.includes('energy') && faces.includes('attack');
    const hasThreeOnes = ones >= 3;
    const hasThreeTwos = twos >= 3;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'perfect_roll_bonus':
          // Complete Destruction: If you roll ①②③❤⚡☠ gain 9★ in addition to regular results
          if (hasPerfectRoll) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (perfect roll!)`);
            store.dispatch(playerVPGained(playerId, card.effect.value, 'perfect_roll'));
          }
          break;
          
        case 'bonus_vp_on_111':
          // Gourmet: When scoring ①①① gain 2 extra ★
          if (hasThreeOnes) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (three 1s)`);
            store.dispatch(playerVPGained(playerId, card.effect.value, 'gourmet'));
          }
          break;
          
        case 'damage_on_222':
          // Poison Quills: When you score ②②② also deal 2 damage
          if (hasThreeTwos) {
            logger?.info(`[PassiveEffects] ${card.name}: dealing ${card.effect.value} damage (three 2s)`);
            // Deal damage to all other monsters
            const targets = state.players.order.filter(pid => pid !== playerId);
            for (const targetId of targets) {
              store.dispatch({ type: 'PLAYER_TAKE_DAMAGE', payload: { playerId: targetId, amount: card.effect.value } });
            }
          }
          break;
          
        case 'extra_turn_on_111':
          // Freeze Time: On a turn where you score ①①①, you can take another turn with one less die
          // This requires UI interaction - flag it for the turn service to handle
          if (hasThreeOnes) {
            logger?.info(`[PassiveEffects] ${card.name}: extra turn available (three 1s)`);
            store.dispatch({ type: 'EXTRA_TURN_AVAILABLE', payload: { playerId, cardId: card.id, dicePenalty: 1 } });
          }
          break;
      }
    }
  }
  
  /**
   * Check if player can reroll specific dice
   * Called during reroll phase to allow special reroll rules
   */
  function canRerollDice(playerId, diceIndex, diceValue) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return true; // Default: can reroll anything
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'reroll_3s') {
        // Background Dweller: You can always reroll any 3 you have
        if (diceValue === '3') {
          logger?.info(`[PassiveEffects] ${card.name}: can reroll 3`);
          return true;
        }
      }
    }
    
    return true; // Default: allow reroll
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
        // NOTE: Dedicated News Team effect (vp_on_card_buy) triggers on card purchase
        // not on generic VP gain - handled in processCardPurchaseEffects instead
        default:
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
        case 'energy_on_damage':
          // We're Only Making It Stronger: Gain energy when you lose threshold+ health
          const threshold = card.effect.threshold || 2;
          if (amount >= threshold) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy (took ${amount} damage)`);
            store.dispatch(playerGainEnergy(playerId, card.effect.value));
          }
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
        case 'vp_on_card_buy':
          // Dedicated News Team: Gain 1★ whenever you buy a card
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (bought card)`);
          store.dispatch(playerGainVP(playerId, card.effect.value));
          break;
        
        // NOTE: Other purchase-triggered effects not yet implemented:
        // - extra_turn (Frenzy): Take another turn immediately
        // - peek_and_buy_top (Made in a Lab): Peek at and purchase top card
        // - discard_for_energy (Metamorph): Discard keep cards for energy refund
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
  
  /**
   * Process attack/damage dealt effects
   * Called when a player deals damage to others
   */
  function processAttackEffects(playerId, didDamage) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'vp_on_attack':
          // Alpha Monster: Gain 1★ when you attack
          if (didDamage) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (attacked)`);
            store.dispatch(playerVPGained(playerId, card.effect.value, 'attack'));
          }
          break;
          
        case 'vp_no_damage':
          // Herbivore: Gain 1★ if you don't damage anyone
          if (!didDamage) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (no damage dealt)`);
            store.dispatch(playerVPGained(playerId, card.effect.value, 'herbivore'));
          }
          break;
      }
    }
  }
  
  /**
   * Process elimination effects
   * Called when a monster is eliminated (health goes to 0)
   */
  function processEliminationEffects(eliminatedPlayerId) {
    const state = store.getState();
    
    // Check all players for elimination-triggered effects
    for (const pid of state.players.order) {
      if (pid === eliminatedPlayerId) continue; // Skip the eliminated player
      
      const player = state.players.byId[pid];
      if (!player || !player.powerCards) continue;
      
      for (const card of player.powerCards) {
        if (!card.effect) continue;
        
        if (card.effect.kind === 'vp_on_elimination') {
          // Eater of the Dead: Gain 3★ when a monster is eliminated
          logger?.info(`[PassiveEffects] ${card.name}: ${player.name} gains +${card.effect.value}★ (${eliminatedPlayerId} eliminated)`);
          store.dispatch(playerVPGained(pid, card.effect.value, 'elimination'));
        }
      }
    }
  }
  
  /**
   * Process energy gain effects
   * Called when a player gains energy (to trigger bonus effects)
   */
  function processEnergyGainEffects(playerId, amount) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'energy_on_energy') {
        // Friend of Children: When you gain any Energy gain 1 extra Energy
        logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} bonus energy (gained ${amount} energy)`);
        store.dispatch(playerGainEnergy(playerId, card.effect.value));
      }
    }
  }
  
  /**
   * Process heal bonus effects
   * Called when a player heals
   * Returns the bonus healing amount
   */
  function getHealBonus(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    let bonus = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'heal_bonus') {
        // Regeneration: When you heal, heal 1 extra damage
        bonus += card.effect.value || 0;
        logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} bonus healing`);
      }
    }
    return bonus;
  }
  
  // Helper function to check for 1-2-3 sequence in dice
  function checkForOneTwoThree(diceResults) {
    const faces = diceResults.map(d => d.face);
    return faces.includes('1') && faces.includes('2') && faces.includes('3');
  }
  
  /**
   * Process turn end effects
   * Called at the end of a turn before switching to next player
   */
  function processTurnEndEffects(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'energy_when_zero':
          // Solar Powered: At end of turn gain 1 Energy if you have no Energy
          if (player.energy === 0) {
            logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} energy (had 0 energy)`);
            store.dispatch(playerGainEnergy(playerId, card.effect.value));
          }
          break;
          
        case 'energy_to_vp':
          // Energy Hoarder: Gain 1★ for every X energy at end of turn
          const vpGain = Math.floor(player.energy / card.effect.value);
          if (vpGain > 0) {
            logger?.info(`[PassiveEffects] ${card.name}: +${vpGain}★ (${player.energy} energy / ${card.effect.value})`);
            store.dispatch(playerVPGained(playerId, vpGain, 'energy_hoarder'));
          }
          break;
      }
    }
  }
  
  /**
   * Get armor reduction value
   * Called when a player is about to take damage
   * Returns the amount of damage that should be negated
   */
  function getArmorReduction(playerId, damageAmount) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    let reduction = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'armor') {
        // Armor Plating: Ignore damage of 1
        if (damageAmount <= card.effect.value) {
          reduction = damageAmount; // Negate all damage if it's <= armor value
          logger?.info(`[PassiveEffects] ${card.name}: negates ${reduction} damage`);
        }
      }
    }
    return reduction;
  }
  
  /**
   * Get extra damage bonus for Tokyo attacks
   * Called when calculating damage dealt from Tokyo
   */
  function getTokyoAttackBonus(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    const inTokyo = state.tokyo.city === playerId || state.tokyo.bay === playerId;
    if (!inTokyo) return 0;
    
    let bonus = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      switch (card.effect.kind) {
        case 'tokyo_attack_bonus':
          // Burrowing: +1 damage when in Tokyo
          bonus += card.effect.value || 0;
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} damage (in Tokyo)`);
          break;
          
        case 'tokyo_bonuses':
          // Urbavore: +1 damage when dealing any damage from Tokyo
          bonus += card.effect.value || 0;
          logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value} damage (in Tokyo)`);
          break;
      }
    }
    return bonus;
  }
  
  /**
   * Get neighbor damage bonus
   * Called when dealing damage - neighbors take extra damage
   * Returns the extra damage neighbors should take
   */
  function getNeighborDamageBonus(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return 0;
    
    let bonus = 0;
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'neighbor_damage') {
        // Fire Breathing: Neighbors take +1 damage
        bonus += card.effect.value || 0;
        logger?.info(`[PassiveEffects] ${card.name}: neighbors take +${card.effect.value} damage`);
      }
    }
    return bonus;
  }
  
  /**
   * Check if player is immune to yield damage
   * Called when yielding Tokyo
   */
  function hasNoYieldDamage(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return false;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      if (card.effect.kind === 'no_yield_damage') {
        // Jets: No damage when yielding Tokyo
        logger?.info(`[PassiveEffects] ${card.name}: no damage when yielding Tokyo`);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Process Tokyo start-of-turn bonuses
   * Called at the start of turn if player is in Tokyo
   */
  function processTokyoStartBonuses(playerId) {
    const state = store.getState();
    const player = state.players.byId[playerId];
    if (!player || !player.powerCards) return;
    
    const inTokyo = state.tokyo.city === playerId || state.tokyo.bay === playerId;
    if (!inTokyo) return;
    
    for (const card of player.powerCards) {
      if (!card.effect) continue;
      
      if (card.effect.kind === 'tokyo_bonuses') {
        // Urbavore: Gain 1 extra ★ when beginning turn in Tokyo
        logger?.info(`[PassiveEffects] ${card.name}: +${card.effect.value}★ (started turn in Tokyo)`);
        store.dispatch(playerVPGained(playerId, card.effect.value, 'tokyo_start'));
      }
    }
  }
  
  return {
    processTurnStartEffects,
    processBuyPhaseEffects,
    processDiceResultEffects,
    canRerollDice,
    processVPGainEffects,
    processDamageTakenEffects,
    processTurnEndEffects,
    processTokyoStartBonuses,
    processAttackEffects,
    processEliminationEffects,
    processEnergyGainEffects,
    getAttackBonus,
    getTokyoAttackBonus,
    getNeighborDamageBonus,
    getArmorReduction,
    getHealBonus,
    hasNoYieldDamage,
    processCardPurchaseEffects,
    getCardCostReduction
  };
}
