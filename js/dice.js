// Dice system for King of Tokyo
const DICE_FACES = {
    '1': { symbol: '1', value: 1, type: 'number' },
    '2': { symbol: '2', value: 2, type: 'number' },
    '3': { symbol: '3', value: 3, type: 'number' },
    'energy': { symbol: '⚡', value: 1, type: 'energy' },
    'attack': { symbol: '⚔️', value: 1, type: 'attack' }, // Sword/claw weapon
    'heal': { symbol: '❤️', value: 1, type: 'heal' }
};

const DICE_FACE_NAMES = Object.keys(DICE_FACES);

// Dice class
class Die {
    constructor(id) {
        this.id = id;
        this.face = null;
        this.isSelected = false;
        this.isRolling = false;
    }

    // Roll the die
    roll() {
        this.isRolling = true;
        const randomIndex = Math.floor(Math.random() * DICE_FACE_NAMES.length);
        this.face = DICE_FACE_NAMES[randomIndex];
        console.log(`Die ${this.id} rolled:`, this.face, 'symbol:', this.getSymbol());
        
        // Simulate rolling animation delay
        setTimeout(() => {
            this.isRolling = false;
            console.log(`Die ${this.id} finished rolling, final face:`, this.face);
        }, 500);
    }

    // Toggle selection for keeping dice
    toggleSelection() {
        console.log(`Die ${this.id} toggle called - isRolling: ${this.isRolling}, current isSelected: ${this.isSelected}`);
        if (!this.isRolling) {
            this.isSelected = !this.isSelected;
            console.log(`Die ${this.id} selection toggled to: ${this.isSelected}`);
        } else {
            console.log(`Die ${this.id} cannot be selected - still rolling`);
        }
        return this.isSelected;
    }

    // Get dice face data
    getFaceData() {
        return this.face ? DICE_FACES[this.face] : null;
    }

    // Get display symbol
    getSymbol() {
        const faceData = this.getFaceData();
        return faceData ? faceData.symbol : '?';
    }

    // Reset die
    reset() {
        console.log(`🎲 Resetting die ${this.id} (face was: ${this.face})`);
        this.face = null;
        this.isSelected = false;
        this.isRolling = false;
    }
}

// Immediately expose Die to window for browser use
if (typeof window !== 'undefined') {
    window.Die = Die;
    console.log('Die immediately assigned to window:', typeof window.Die);
}

// Dice collection class
class DiceCollection {
    constructor(count = 6) {
        this.dice = [];
        this.maxDice = count;
        
        // Create initial dice
        for (let i = 0; i < count; i++) {
            this.dice.push(new Die(`die-${i}`));
        }
    }

    // Roll all non-selected dice
    rollAll() {
        this.dice.forEach(die => {
            if (!die.isSelected) {
                die.roll();
            }
        });
    }

    // Get selected dice
    getSelectedDice() {
        return this.dice.filter(die => die.isSelected);
    }

    // Get unselected dice
    getUnselectedDice() {
        return this.dice.filter(die => !die.isSelected);
    }

    // Toggle dice selection by ID
    toggleDiceSelection(dieId) {
        console.log(`DiceCollection: Looking for die with id: ${dieId}`);
        console.log(`Available dice:`, this.dice.map(d => ({ id: d.id, isSelected: d.isSelected })));
        const die = this.dice.find(d => d.id === dieId);
        if (die) {
            console.log(`Found die ${dieId}, calling toggleSelection`);
            return die.toggleSelection();
        } else {
            console.log(`Die ${dieId} not found!`);
        }
        return false;
    }

    // Get results summary
    getResults() {
        const results = {
            numbers: { '1': 0, '2': 0, '3': 0 },
            energy: 0,
            attack: 0,
            heal: 0
        };

        this.dice.forEach(die => {
            const faceData = die.getFaceData();
            if (faceData) {
                if (faceData.type === 'number') {
                    results.numbers[faceData.symbol]++;
                } else {
                    results[faceData.type] += faceData.value;
                }
            }
        });

        return results;
    }

    // Calculate victory points from numbers
    getVictoryPoints() {
        const results = this.getResults();
        let points = 0;

        // Count sets of numbers (3+ of same number = points)
        Object.entries(results.numbers).forEach(([number, count]) => {
            if (count >= 3) {
                const basePoints = parseInt(number);
                const extraDice = count - 3;
                points += basePoints + extraDice;
            }
        });

        return points;
    }

    // Get dice that are currently rolling
    getRollingDice() {
        return this.dice.filter(die => die.isRolling);
    }

    // Check if any dice are rolling
    isAnyRolling() {
        return this.dice.some(die => die.isRolling);
    }

    // Reset all dice
    reset() {
        console.log(`🎲 Resetting all dice in collection`);
        this.dice.forEach(die => die.reset());
    }

    // Reset dice count to base amount (removes extra dice)
    resetToBaseDiceCount(baseCount = 6) {
        // Reset all dice states first
        this.reset();
        
        // Adjust dice count to base amount
        while (this.dice.length > baseCount) {
            this.dice.pop();
        }
        
        // Add dice if we have less than base count
        while (this.dice.length < baseCount) {
            this.dice.push(new Die(`die-${this.dice.length}`));
        }
        
        this.maxDice = baseCount;
    }

    // Add extra dice (from power cards)
    addExtraDie() {
        if (this.dice.length < 8) { // Maximum 8 dice
            const newDie = new Die(`die-${this.dice.length}`);
            this.dice.push(newDie);
            return newDie;
        }
        return null;
    }

    // Remove dice (for certain effects)
    removeDie() {
        if (this.dice.length > 1) { // Minimum 1 die
            return this.dice.pop();
        }
        return null;
    }

    // Get all dice data for display
    getAllDiceData() {
        return this.dice.map(die => ({
            id: die.id,
            face: die.face,
            symbol: die.getSymbol(),
            isSelected: die.isSelected,
            isRolling: die.isRolling,
            faceData: die.getFaceData()
        }));
    }
}

// Immediately expose DiceCollection to window for browser use
if (typeof window !== 'undefined') {
    window.DiceCollection = DiceCollection;
    console.log('DiceCollection immediately assigned to window:', typeof window.DiceCollection);
}

// Dice rolling logic with animation
class DiceRoller {
    constructor(diceCollection) {
        this.diceCollection = diceCollection;
        this.rollsRemaining = 3;
        this.isRolling = false;
        this.callbacks = {};
    }

    // Set callbacks for events
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Start a new turn
    startNewTurn() {
        console.log(`🎲 DiceRoller starting new turn - resetting dice`);
        this.rollsRemaining = 3;
        this.isRolling = false;
        this.diceCollection.reset();
        
        if (this.callbacks.onTurnStart) {
            this.callbacks.onTurnStart();
        }
    }

    // Roll dice with animation
    rollDice() {
        if (!this.canRoll()) {
            console.warn('Cannot roll: no rolls remaining or already rolling');
            return false;
        }

        this.isRolling = true;

        // Trigger start callback
        if (this.callbacks.onRollStart) {
            this.callbacks.onRollStart(this.rollsRemaining);
        }

        // Roll all dice
        this.diceCollection.rollAll();
        this.rollsRemaining--;
        console.log('DiceRoller: rollsRemaining after decrement:', this.rollsRemaining);

        // Trigger dice update immediately after rolling
        if (this.callbacks.onDiceUpdate) {
            this.callbacks.onDiceUpdate(this.diceCollection.getAllDiceData());
        }

        // Wait for rolling animation to complete
        setTimeout(() => {
            this.isRolling = false;
            
            // Trigger dice update again after animation
            if (this.callbacks.onDiceUpdate) {
                this.callbacks.onDiceUpdate(this.diceCollection.getAllDiceData());
            }
            
            // Trigger complete callback
            if (this.callbacks.onRollComplete) {
                this.callbacks.onRollComplete({
                    rollsRemaining: this.rollsRemaining,
                    results: this.diceCollection.getResults(),
                    diceData: this.diceCollection.getAllDiceData()
                });
            }
        }, 600); // Slightly longer than die roll animation

        return true;
    }

    // First roll of a turn (same as rollDice but explicitly named)
    async firstRoll() {
        return this.rollDice();
    }

    // Check if rolling is allowed
    canRoll() {
        return this.rollsRemaining > 0 && !this.isRolling;
    }

    // Get current state
    getState() {
        return {
            rollsRemaining: this.rollsRemaining,
            isRolling: this.isRolling,
            canRoll: this.canRoll(),
            diceData: this.diceCollection.getAllDiceData(),
            results: this.diceCollection.getResults()
        };
    }
}

// Immediately expose DiceRoller to window for browser use
if (typeof window !== 'undefined') {
    window.DiceRoller = DiceRoller;
    console.log('DiceRoller immediately assigned to window:', typeof window.DiceRoller);
}

// Utility functions
function createDiceHTML(diceData) {
    return diceData.map(die => `
        <div class="die ${die.isSelected ? 'selected' : ''} ${die.isRolling ? 'rolling' : ''}" 
             data-die-id="${die.id}">
            ${die.symbol}
        </div>
    `).join('');
}

function attachDiceEventListeners(diceCollection, container, updateCallback) {
    // Remove any existing listeners by cloning and replacing
    const clone = container.cloneNode(false);
    clone.innerHTML = container.innerHTML;
    container.parentNode.replaceChild(clone, container);
    
    // Add single click listener
    clone.addEventListener('click', (event) => {
        const dieElement = event.target.closest('.die');
        if (dieElement) {
            const dieId = dieElement.dataset.dieId;
            console.log('Dice clicked:', dieId);
            console.log('Dice collection before toggle:', diceCollection.getAllDiceData().map(d => ({ id: d.id, isSelected: d.isSelected })));
            
            const isSelected = diceCollection.toggleDiceSelection(dieId);
            console.log('After toggle, isSelected:', isSelected);
            console.log('Dice collection after toggle:', diceCollection.getAllDiceData().map(d => ({ id: d.id, isSelected: d.isSelected })));
            
            if (isSelected) {
                dieElement.classList.add('selected');
            } else {
                dieElement.classList.remove('selected');
            }
            
            // Call update callback if provided
            if (updateCallback) {
                updateCallback();
            }
        }
    });
    
    return clone;
}

// Export for use in other files
console.log('Dice.js loading, typeof module:', typeof module);

// Force assignment to window object in browser
if (typeof window !== 'undefined') {
    window.DICE_FACES = DICE_FACES;
    window.DICE_FACE_NAMES = DICE_FACE_NAMES;
    window.Die = Die;
    window.DiceCollection = DiceCollection;
    window.DiceRoller = DiceRoller;
    window.createDiceHTML = createDiceHTML;
    window.attachDiceEventListeners = attachDiceEventListeners;
    console.log('All dice classes assigned to window - DiceCollection:', typeof window.DiceCollection);
}

// Also handle Node.js modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        DICE_FACES, 
        DICE_FACE_NAMES, 
        Die, 
        DiceCollection, 
        DiceRoller,
        createDiceHTML,
        attachDiceEventListeners
    };
}
