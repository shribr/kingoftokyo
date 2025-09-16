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
    constructor(id, isDisabled = false) {
        this.id = id;
        this.face = null;
        this.previousFace = null; // Track previous face for display during rolling
        this.isSelected = false;
        this.isDisabled = isDisabled;
        this.isRolling = false;
    }

    // Roll the die
    roll() {
        // Store previous face before rolling
        this.previousFace = this.face;
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
        // If die is disabled, show lock symbol
        if (this.isDisabled) {
            return '🔒';
        }
        // If die is rolling and has a previous face, show the previous face during animation
        if (this.isRolling && this.previousFace) {
            const previousFaceData = DICE_FACES[this.previousFace];
            return previousFaceData ? previousFaceData.symbol : '?';
        }
        // If die has no face (initial state), show question mark
        // If die has a face, show the symbol for that face
        return faceData ? faceData.symbol : '?';
    }

    // Reset die
    reset() {
        if (this.face !== null) {
            console.log(`🎲 ⚠️  Resetting die ${this.id} that had face: ${this.face} (this might be unexpected during gameplay)`);
        }
        this.face = null;
        this.previousFace = null;
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
        this.totalDice = count + 2; // Create 2 extra dice for power cards
        
        // Create initial dice (6 enabled)
        for (let i = 0; i < count; i++) {
            this.dice.push(new Die(`die-${i}`, false)); // enabled dice
        }
        
        // Create 2 additional disabled dice for power cards
        for (let i = count; i < this.totalDice; i++) {
            this.dice.push(new Die(`die-${i}`, true)); // disabled dice
        }
    }

    // Roll all non-selected and enabled dice
    rollAll() {
        this.dice.forEach(die => {
            if (!die.isSelected && !die.isDisabled) {
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
            // Only count enabled dice (skip disabled placeholders)
            if (!die.isDisabled) {
                const faceData = die.getFaceData();
                if (faceData) {
                    if (faceData.type === 'number') {
                        results.numbers[faceData.symbol]++;
                    } else {
                        results[faceData.type] += faceData.value;
                    }
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
        const hasRolledDice = this.dice.some(die => die.face !== null && !die.isDisabled);
        if (hasRolledDice) {
            console.warn(`🎲 ⚠️  Resetting dice collection that has rolled dice - this might be unexpected during gameplay!`);
            console.log('🎲 Dice being reset:', this.dice.filter(d => d.face !== null).map(d => ({ id: d.id, face: d.face })));
        }
        this.dice.forEach(die => die.reset());
    }

    // Reset dice count to base amount (removes extra dice)
    resetToBaseDiceCount(baseCount = 6) {
        // Don't reset all dice - just adjust the counts and states without clearing faces
        // Only reset selections and rolling states, preserve face values
        
        const hasRolledDice = this.dice.some(die => die.face !== null && !die.isDisabled);
        if (hasRolledDice) {
            console.warn(`🎲 ⚠️  Resetting dice collection that has rolled dice - preserving face values during reset`);
        }

        // Reset only selection and rolling states, preserve faces
        this.dice.forEach(die => {
            die.isSelected = false;
            die.isRolling = false;
            // Don't reset die.face here - preserve the values
        });
        
        // Only remove dice above the total dice count (enabled + disabled placeholders)
        // Keep the disabled placeholders but ensure they stay disabled
        while (this.dice.length > this.totalDice) {
            this.dice.pop();
        }
        
        // Ensure we have the right number of enabled dice
        for (let i = 0; i < baseCount; i++) {
            if (i < this.dice.length) {
                this.dice[i].isDisabled = false;
            } else {
                this.dice.push(new Die(`die-${i}`, false));
            }
        }
        
        // Ensure disabled dice placeholders exist and are disabled
        for (let i = baseCount; i < this.totalDice; i++) {
            if (i < this.dice.length) {
                this.dice[i].isDisabled = true;
                this.dice[i].isSelected = false;
                // Don't reset face - this was causing the question mark flashing
            } else {
                this.dice.push(new Die(`die-${i}`, true));
            }
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

    // Enable a specific extra die (for power cards)
    enableExtraDie(dieIndex) {
        if (dieIndex >= this.maxDice && dieIndex < this.totalDice) {
            const die = this.dice[dieIndex];
            if (die && die.isDisabled) {
                die.isDisabled = false;
                // Don't reset face - preserve any existing value
                return true;
            }
        }
        return false;
    }

    // Disable a specific extra die
    disableExtraDie(dieIndex) {
        if (dieIndex >= this.maxDice && dieIndex < this.totalDice) {
            const die = this.dice[dieIndex];
            if (die && !die.isDisabled) {
                die.isDisabled = true;
                die.isSelected = false; // Unselect if selected
                // Don't reset face - preserve any existing value
                return true;
            }
        }
        return false;
    }

    // Get all dice data for display
    getAllDiceData() {
        return this.dice.map(die => ({
            id: die.id,
            face: die.face,
            symbol: die.getSymbol(),
            isSelected: die.isSelected,
            isRolling: die.isRolling,
            isDisabled: die.isDisabled,
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
function createDiceHTML(diceData, maxDiceToShow = null) {
    // If maxDiceToShow is specified, only show that many enabled dice
    let dicesToDisplay = diceData;
    if (maxDiceToShow !== null) {
        const enabledDice = diceData.filter(die => !die.isDisabled);
        dicesToDisplay = enabledDice.slice(0, maxDiceToShow);
    }
    
    return dicesToDisplay.map(die => `
        <div class="die ${die.isSelected ? 'selected' : ''} ${die.isRolling ? 'rolling' : ''} ${die.isDisabled ? 'disabled' : ''}" 
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
        if (dieElement && !dieElement.classList.contains('disabled')) {
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
