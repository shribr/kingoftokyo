// Monster definitions for King of Tokyo
let MONSTERS = {
    gigazaur: {
        id: 'gigazaur',
        name: 'Gigazaur',
        emoji: '🦕',
        image: 'images/characters/king_of_tokyo_gigazaur.png',
        color: '#1e3a1e', // Dark forest green (matches game dashboard)
        description: 'The mighty dinosaur monster',
        symbol: '🌿', // Alternative nature symbol
        personality: {
            aggression: 4, // High aggression - ancient predator instincts
            strategy: 2,   // Low strategy - relies on brute force
            risk: 3        // Medium risk - cautious but territorial
        }
    },
    cyberbunny: {
        id: 'cyberbunny',
        name: 'Cyber Bunny',
        emoji: '🤖',
        image: 'images/characters/king_of_tokyo_cyber_bunny.png',
        color: '#dda0dd', // Plum (matches game dashboard)
        description: 'The cybernetic rabbit',
        symbol: '⚡', // Electric symbol
        personality: {
            aggression: 2, // Low aggression - calculated and precise
            strategy: 5,   // High strategy - advanced AI planning
            risk: 2        // Low risk - logical risk assessment
        }
    },
    kraken: {
        id: 'kraken',
        name: 'Kraken',
        emoji: '🐙',
        image: 'images/characters/king_of_tokyo_kraken.png',
        color: '#1e3a37', // Dark greenish blue (matches game dashboard)
        description: 'The sea monster from the depths',
        symbol: '🌊', // Wave symbol
        personality: {
            aggression: 3, // Medium aggression - patient hunter
            strategy: 4,   // High strategy - ancient wisdom
            risk: 4        // High risk - deep sea adventurer
        }
    },
    kinghull: {
        id: 'kinghull',
        name: 'The King',
        emoji: '🦍',
        image: 'images/characters/king_of_tokyo_the_king.png',
        color: '#4a3c1f', // Dark brown (matches game dashboard)
        description: 'The giant ape',
        symbol: '👑', // Crown symbol
        personality: {
            aggression: 5, // Maximum aggression - alpha predator
            strategy: 2,   // Low strategy - direct approach
            risk: 3        // Medium risk - confident but not reckless
        }
    },
    megalodon: {
        id: 'megalodon',
        name: 'Meka Dragon',
        emoji: '🐲',
        image: 'images/characters/king_of_tokyo_meka_dragon.png',
        color: '#cd5c5c', // Indian red (matches game dashboard)
        description: 'The mechanical dragon',
        symbol: '⚙️', // Gear symbol
        personality: {
            aggression: 4, // High aggression - fire-breathing destroyer
            strategy: 3,   // Medium strategy - tactical combat
            risk: 5        // Maximum risk - fearless mechanical beast
        }
    },
    alienoid: {
        id: 'alienoid',
        name: 'Alienoid',
        emoji: '👽',
        image: 'images/characters/king_of_tokyo_alienoid.png',
        color: '#8fbc8f', // Dark sea green (matches game dashboard)
        description: 'The extraterrestrial being',
        symbol: '🛸', // UFO symbol
        personality: {
            aggression: 2, // Low aggression - prefers observation
            strategy: 5,   // Maximum strategy - advanced alien intelligence
            risk: 4        // High risk - explores unknown dangers
        }
    }
};

// Load monster configuration from config.json
async function loadMonsterConfiguration() {
    try {
        const response = await fetch('config.json');
        if (response.ok) {
            const config = await response.json();
            if (config.monsters) {
                // Replace MONSTERS with config data
                MONSTERS = config.monsters;
                window.UI && window.UI._debug && window.UI._debug('✅ Monster configuration loaded from config.json');
                
                // Trigger event for UI to reload monsters if already initialized
                if (typeof window !== 'undefined' && window.kingOfTokyoUI) {
                    window.dispatchEvent(new CustomEvent('monstersConfigLoaded'));
                    window.UI && window.UI._debug && window.UI._debug('🎭 Monster configuration loaded! Available monsters:', Object.keys(MONSTERS));
                    window.UI && window.UI._debug && window.UI._debug('🎭 Total monster count:', Object.keys(MONSTERS).length);
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to load monster configuration, using defaults:', error);
    }
}

// Initialize monster configuration on load
if (typeof window !== 'undefined') {
    loadMonsterConfiguration();
}

// Player class to represent each monster/player
class Player {
    constructor(monster, playerNumber, playerType = 'human') {
        this.id = `player-${playerNumber}`;
        this.playerNumber = playerNumber;
        this.displayName = `Player ${playerNumber}`; // Display name for UI
        this.monster = monster;
        this.playerType = playerType; // 'human' or 'cpu'
        this.health = 10;
        this.maxHealth = 10;
        this.energy = 0;
        this.victoryPoints = 0;
        this.isInTokyo = false;
        this.tokyoLocation = null; // 'city' or 'bay'
        this.isEliminated = false;
        this.powerCards = [];
        this.rollsLeft = 3;
        this.currentDice = [];
        this.extraDiceEnabled = 0; // Track how many extra dice are enabled for this player
    }

    // Take damage
    takeDamage(amount) {
        window.UI && window.UI._debug && window.UI._debug(`💀 ${this.monster.name} taking ${amount} damage (health before: ${this.health})`);
        if (window.UI && window.UI.debugMode) {
            window.UI._debug(`DEBUG - Stack trace for takeDamage:`, new Error().stack);
        }
        this.health = Math.max(0, this.health - amount);
        window.UI && window.UI._debug && window.UI._debug(`💀 ${this.monster.name} health after damage: ${this.health}`);
        
        let eliminationInfo = null;
        if (this.health === 0) {
            window.UI && window.UI._debug && window.UI._debug(`💀 ${this.monster.name} health reached 0 - eliminating player`);
            if (window.UI && window.UI.debugMode) {
                window.UI._debug(`ELIMINATION STACK TRACE:`, new Error().stack);
            }
            eliminationInfo = this.eliminate();
        }
        
        return {
            currentHealth: this.health,
            actualDamage: amount,
            eliminationInfo: eliminationInfo
        };
    }

    // Heal
    heal(amount) {
        if (!this.isInTokyo) {
            this.health = Math.min(this.maxHealth, this.health + amount);
        }
        return this.health;
    }

    // Add energy
    addEnergy(amount) {
        this.energy += amount;
        return this.energy;
    }

    // Spend energy
    spendEnergy(amount) {
        if (this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }

    // Add victory points
    addVictoryPoints(amount) {
        this.victoryPoints += amount;
        return this.victoryPoints;
    }

    // Enter Tokyo
    enterTokyo(location = 'city', automatic = false) {
        this.isInTokyo = true;
        this.tokyoLocation = location;
        // Note: Victory points for Tokyo entry are awarded by the game engine, not here
    }

    // Leave Tokyo
    leaveTokyo() {
        this.isInTokyo = false;
        this.tokyoLocation = null;
    }

    // Eliminate player
    eliminate() {
        window.UI && window.UI._debug && window.UI._debug(`💀 ELIMINATING PLAYER: ${this.monster.name}`);
        this.isEliminated = true;
        
        // Store Tokyo location before leaving for attacker replacement
        const wasInTokyo = this.isInTokyo;
        const tokyoLocation = this.tokyoLocation;
        
        // Note: Tokyo state will be cleared by the game logic, not here
        // We just clear the player's internal state
        this.leaveTokyo();
        window.UI && window.UI._debug && window.UI._debug(`💀 Player ${this.monster.name} eliminated status: ${this.isEliminated}`);
        
        // Return elimination info for further processing
        return {
            wasInTokyo,
            tokyoLocation,
            eliminatedPlayer: this
        };
    }

    // Check if player has won
    hasWon() {
        return this.victoryPoints >= 20 && !this.isEliminated;
    }

    // Buy a power card
    buyCard(card) {
        if (this.spendEnergy(card.cost)) {
            this.powerCards.push(card);
            return true;
        }
        return false;
    }

    // Get player's current status for display
    getStatus() {
        return {
            id: this.id,
            playerNumber: this.playerNumber,
            monster: this.monster,
            playerType: this.playerType,
            health: this.health,
            maxHealth: this.maxHealth,
            energy: this.energy,
            victoryPoints: this.victoryPoints,
            isInTokyo: this.isInTokyo,
            tokyoLocation: this.tokyoLocation,
            isEliminated: this.isEliminated,
            powerCards: this.powerCards,
            hasWon: this.hasWon()
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MONSTERS, Player };
} else {
    window.MONSTERS = MONSTERS;
    window.Player = Player;
}
