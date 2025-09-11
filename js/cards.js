// Power cards for King of Tokyo
const POWER_CARDS = [
    {
        id: 'acid_attack',
        name: 'Acid Attack',
        cost: 6,
        type: 'discard',
        description: 'Deal 1 extra damage to all other monsters',
        effect: 'extraDamage'
    },
    {
        id: 'alien_metabolism',
        name: 'Alien Metabolism',
        cost: 3,
        type: 'keep',
        description: 'Buying cards costs 1 less energy (minimum 1)',
        effect: 'cheaperCards'
    },
    {
        id: 'armor_plating',
        name: 'Armor Plating',
        cost: 4,
        type: 'keep',
        description: 'Ignore damage on a roll of 1-2',
        effect: 'armor'
    },
    {
        id: 'background_dweller',
        name: 'Background Dweller',
        cost: 4,
        type: 'keep',
        description: 'You can always stay in Tokyo when taking damage',
        effect: 'stayInTokyo'
    },
    {
        id: 'camouflage',
        name: 'Camouflage',
        cost: 3,
        type: 'keep',
        description: 'Other monsters cannot attack you directly',
        effect: 'camouflage'
    },
    {
        id: 'complete_destruction',
        name: 'Complete Destruction',
        cost: 3,
        type: 'discard',
        description: 'If you roll at least 3 attack symbols, gain 3 victory points',
        effect: 'bonusPoints'
    },
    {
        id: 'corner_store',
        name: 'Corner Store',
        cost: 3,
        type: 'keep',
        description: 'Once per turn, gain 1 energy',
        effect: 'bonusEnergy'
    },
    {
        id: 'dedicated_news_team',
        name: 'Dedicated News Team',
        cost: 3,
        type: 'keep',
        description: 'Gain 1 victory point whenever you attack',
        effect: 'attackBonus'
    },
    {
        id: 'energy_hoarder',
        name: 'Energy Hoarder',
        cost: 3,
        type: 'keep',
        description: 'Gain 1 victory point for every 6 energy you have',
        effect: 'energyPoints'
    },
    {
        id: 'even_bigger',
        name: 'Even Bigger',
        cost: 4,
        type: 'keep',
        description: 'Gain 1 extra victory point when you attack',
        effect: 'extraAttackPoints'
    },
    {
        id: 'extra_head',
        name: 'Extra Head',
        cost: 7,
        type: 'keep',
        description: 'You get 1 extra die (7 dice total)',
        effect: 'extraDie'
    },
    {
        id: 'fire_breathing',
        name: 'Fire Breathing',
        cost: 3,
        type: 'discard',
        description: 'Deal 1 damage to all other monsters',
        effect: 'allDamage'
    },
    {
        id: 'friend_of_children',
        name: 'Friend of Children',
        cost: 3,
        type: 'keep',
        description: 'Gain 1 victory point at the start of your turn',
        effect: 'turnBonus'
    },
    {
        id: 'giant_brain',
        name: 'Giant Brain',
        cost: 5,
        type: 'keep',
        description: 'You have an extra re-roll each turn',
        effect: 'extraReroll'
    },
    {
        id: 'healing_ray',
        name: 'Healing Ray',
        cost: 3,
        type: 'discard',
        description: 'Heal 2 health and gain 2 energy',
        effect: 'healAndEnergy'
    },
    {
        id: 'herbivore',
        name: 'Herbivore',
        cost: 3,
        type: 'keep',
        description: 'Gain 1 victory point for each heal symbol rolled',
        effect: 'healPoints'
    },
    {
        id: 'made_in_a_lab',
        name: 'Made in a Lab',
        cost: 2,
        type: 'keep',
        description: 'If you have an even number of victory points, gain 1 extra',
        effect: 'evenPoints'
    },
    {
        id: 'nova_breath',
        name: 'Nova Breath',
        cost: 7,
        type: 'discard',
        description: 'Deal 2 damage to all other monsters',
        effect: 'massiveDamage'
    },
    {
        id: 'parasitic_tentacles',
        name: 'Parasitic Tentacles',
        cost: 3,
        type: 'keep',
        description: 'When you attack, heal 1 health',
        effect: 'attackHeal'
    },
    {
        id: 'rapid_healing',
        name: 'Rapid Healing',
        cost: 3,
        type: 'keep',
        description: 'Spend 2 energy to heal 1 health',
        effect: 'energyHeal'
    },
    {
        id: 'regeneration',
        name: 'Regeneration',
        cost: 4,
        type: 'keep',
        description: 'Heal 1 health at the start of your turn',
        effect: 'autoHeal'
    },
    {
        id: 'shrink_ray',
        name: 'Shrink Ray',
        cost: 6,
        type: 'discard',
        description: 'Give -2 health to target monster until healed',
        effect: 'shrink'
    },
    {
        id: 'spiked_tail',
        name: 'Spiked Tail',
        cost: 3,
        type: 'keep',
        description: 'When you take damage, deal 1 damage back',
        effect: 'counterAttack'
    },
    {
        id: 'wings',
        name: 'Wings',
        cost: 3,
        type: 'keep',
        description: 'You can leave Tokyo without taking damage',
        effect: 'flyAway'
    }
];

// Get a random selection of cards for the market
function getRandomCards(count = 3) {
    const shuffled = [...POWER_CARDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Get all available cards
function getAllCards() {
    return [...POWER_CARDS];
}

// Find card by ID
function getCardById(id) {
    return POWER_CARDS.find(card => card.id === id);
}

// Card effects system
const CARD_EFFECTS = {
    // Immediate effects (discard cards)
    extraDamage: (player, game) => {
        // Applied during attack resolution
        return { type: 'modifier', value: 1, target: 'damage' };
    },
    
    allDamage: (player, game) => {
        game.players.forEach(p => {
            if (p.id !== player.id && !p.isEliminated) {
                const damageResult = p.takeDamage(1);
                
                // Handle elimination from card effect
                if (damageResult.eliminationInfo) {
                    console.log(`💀 ${p.monster.name} eliminated by ${player.monster.name}'s power card!`);
                    game.triggerEvent('playerEliminated', { 
                        eliminatedPlayer: p, 
                        attacker: player,
                        eliminationInfo: damageResult.eliminationInfo 
                    });
                }
            }
        });
        return { type: 'immediate' };
    },
    
    bonusPoints: (player, game) => {
        // Check if player rolled 3+ attack symbols
        const attackCount = player.currentDice.filter(die => die.face === 'attack').length;
        if (attackCount >= 3) {
            player.addVictoryPoints(3);
        }
        return { type: 'immediate' };
    },
    
    healAndEnergy: (player, game) => {
        player.heal(2);
        player.addEnergy(2);
        return { type: 'immediate' };
    },
    
    massiveDamage: (player, game) => {
        game.players.forEach(p => {
            if (p.id !== player.id && !p.isEliminated) {
                const damageResult = p.takeDamage(2);
                
                // Handle elimination from card effect
                if (damageResult.eliminationInfo) {
                    console.log(`💀 ${p.monster.name} eliminated by ${player.monster.name}'s power card!`);
                    game.triggerEvent('playerEliminated', { 
                        eliminatedPlayer: p, 
                        attacker: player,
                        eliminationInfo: damageResult.eliminationInfo 
                    });
                }
            }
        });
        return { type: 'immediate' };
    },
    
    shrink: (player, game, targetId) => {
        const target = game.players.find(p => p.id === targetId);
        if (target) {
            target.maxHealth -= 2;
            target.health = Math.min(target.health, target.maxHealth);
        }
        return { type: 'immediate' };
    },
    
    // Passive effects (keep cards)
    cheaperCards: (player, game) => {
        return { type: 'passive', effect: 'cardDiscount', value: 1 };
    },
    
    armor: (player, game) => {
        return { type: 'passive', effect: 'damageReduction' };
    },
    
    stayInTokyo: (player, game) => {
        return { type: 'passive', effect: 'forcedStay' };
    },
    
    camouflage: (player, game) => {
        return { type: 'passive', effect: 'protection' };
    },
    
    bonusEnergy: (player, game) => {
        return { type: 'passive', effect: 'turnEnergy', value: 1 };
    },
    
    attackBonus: (player, game) => {
        return { type: 'passive', effect: 'attackPoints', value: 1 };
    },
    
    energyPoints: (player, game) => {
        const bonusPoints = Math.floor(player.energy / 6);
        return { type: 'passive', effect: 'energyBonus', value: bonusPoints };
    },
    
    extraAttackPoints: (player, game) => {
        return { type: 'passive', effect: 'attackPoints', value: 1 };
    },
    
    extraDie: (player, game) => {
        return { type: 'passive', effect: 'extraDice', value: 1 };
    },
    
    turnBonus: (player, game) => {
        return { type: 'passive', effect: 'turnPoints', value: 1 };
    },
    
    extraReroll: (player, game) => {
        return { type: 'passive', effect: 'bonusRolls', value: 1 };
    },
    
    healPoints: (player, game) => {
        return { type: 'passive', effect: 'healBonus' };
    },
    
    evenPoints: (player, game) => {
        if (player.victoryPoints % 2 === 0 && player.victoryPoints > 0) {
            return { type: 'passive', effect: 'evenBonus', value: 1 };
        }
        return { type: 'passive', effect: 'none' };
    },
    
    attackHeal: (player, game) => {
        return { type: 'passive', effect: 'attackHealing' };
    },
    
    energyHeal: (player, game) => {
        return { type: 'passive', effect: 'energyHealing' };
    },
    
    autoHeal: (player, game) => {
        return { type: 'passive', effect: 'turnHealing', value: 1 };
    },
    
    counterAttack: (player, game) => {
        return { type: 'passive', effect: 'retaliation' };
    },
    
    flyAway: (player, game) => {
        return { type: 'passive', effect: 'safeFlight' };
    }
};

// Apply card effect
function applyCardEffect(card, player, game, targetId = null) {
    const effectFunction = CARD_EFFECTS[card.effect];
    if (effectFunction) {
        return effectFunction(player, game, targetId);
    }
    return { type: 'none' };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        POWER_CARDS, 
        CARD_EFFECTS, 
        getRandomCards, 
        getAllCards, 
        getCardById, 
        applyCardEffect 
    };
} else {
    window.POWER_CARDS = POWER_CARDS;
    window.CARD_EFFECTS = CARD_EFFECTS;
    window.getRandomCards = getRandomCards;
    window.getAllCards = getAllCards;
    window.getCardById = getCardById;
    window.applyCardEffect = applyCardEffect;
}
