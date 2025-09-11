// Monster definitions for King of Tokyo
const MONSTERS = {
    gigazaur: {
        id: 'gigazaur',
        name: 'Gigazaur',
        emoji: '🦕',
        image: 'images/characters/king_of_tokyo_gigazaur.png',
        color: '#228B22', // Forest Green
        description: 'The mighty dinosaur monster',
        symbol: '🌿' // Alternative nature symbol
    },
    cyberbunny: {
        id: 'cyberbunny',
        name: 'Cyber Bunny',
        emoji: '🤖',
        image: 'images/characters/king_of_tokyo_cyber_bunny.png',
        color: '#FF1493', // Deep Pink
        description: 'The cybernetic rabbit',
        symbol: '⚡' // Electric symbol
    },
    kraken: {
        id: 'kraken',
        name: 'Kraken',
        emoji: '🐙',
        image: 'images/characters/king_of_tokyo_kraken.png',
        color: '#4169E1', // Royal Blue
        description: 'The sea monster from the depths',
        symbol: '🌊' // Wave symbol
    },
    kinghull: {
        id: 'kinghull',
        name: 'The King',
        emoji: '🦍',
        image: 'images/characters/king_of_tokyo_the_king.png',
        color: '#8B4513', // Saddle Brown
        description: 'The giant ape',
        symbol: '👑' // Crown symbol
    },
    megalodon: {
        id: 'megalodon',
        name: 'Meka Dragon',
        emoji: '🐲',
        image: 'images/characters/king_of_tokyo_meka_dragon.png',
        color: '#DC143C', // Crimson
        description: 'The mechanical dragon',
        symbol: '⚙️' // Gear symbol
    },
    alienoid: {
        id: 'alienoid',
        name: 'Alienoid',
        emoji: '👽',
        image: 'images/characters/king_of_tokyo_alienoid.png',
        color: '#9932CC', // Dark Orchid
        description: 'The extraterrestrial being',
        symbol: '🛸' // UFO symbol
    }
};

// Player class to represent each monster/player
class Player {
    constructor(monster, playerNumber) {
        this.id = `player-${playerNumber}`;
        this.playerNumber = playerNumber;
        this.monster = monster;
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
    }

    // Take damage
    takeDamage(amount) {
        console.log(`💀 ${this.monster.name} taking ${amount} damage (health before: ${this.health})`);
        console.log(`💀 DEBUG - Stack trace for takeDamage:`, new Error().stack);
        this.health = Math.max(0, this.health - amount);
        console.log(`💀 ${this.monster.name} health after damage: ${this.health}`);
        
        let eliminationInfo = null;
        if (this.health === 0) {
            console.log(`💀 ${this.monster.name} health reached 0 - eliminating player`);
            console.log(`💀 ELIMINATION STACK TRACE:`, new Error().stack);
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
    enterTokyo(location = 'city') {
        this.isInTokyo = true;
        this.tokyoLocation = location;
        this.addVictoryPoints(1); // Bonus for entering Tokyo
    }

    // Leave Tokyo
    leaveTokyo() {
        this.isInTokyo = false;
        this.tokyoLocation = null;
    }

    // Eliminate player
    eliminate() {
        console.log(`💀 ELIMINATING PLAYER: ${this.monster.name}`);
        this.isEliminated = true;
        
        // Store Tokyo location before leaving for attacker replacement
        const wasInTokyo = this.isInTokyo;
        const tokyoLocation = this.tokyoLocation;
        
        // Note: Tokyo state will be cleared by the game logic, not here
        // We just clear the player's internal state
        this.leaveTokyo();
        console.log(`💀 Player ${this.monster.name} eliminated status: ${this.isEliminated}`);
        
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
