// Main game engine for King of Tokyo

// Hierarchical Game Log Tree Structure
class GameLogTree {
    constructor() {
        this.rounds = [];
        this.currentRound = null;
        this.currentPlayerTurn = null;
    }

    // Start a new round
    startRound(roundNumber) {
        // Check if a round with this number already exists
        const existingRound = this.rounds.find(round => round.roundNumber === roundNumber);
        if (existingRound) {
            // Round already exists, just set it as current
            this.currentRound = existingRound;
            this.currentPlayerTurn = null;
            return;
        }

        // Create new round only if it doesn't exist
        this.currentRound = {
            id: `round-${roundNumber}`,
            roundNumber,
            timestamp: new Date(),
            playerTurns: [],
            expanded: true // Rounds start expanded
        };
        this.rounds.push(this.currentRound);
        this.currentPlayerTurn = null;
    }

    // Start a new player turn within the current round
    startPlayerTurn(playerName, playerMonster) {
        if (!this.currentRound) {
            this.startRound(1);
        }

        this.currentPlayerTurn = {
            id: `turn-${this.currentRound.roundNumber}-${this.currentRound.playerTurns.length + 1}`,
            playerName,
            playerMonster,
            timestamp: new Date(),
            actions: [],
            expanded: true // Turns start expanded so players can see actions
        };
        this.currentRound.playerTurns.push(this.currentPlayerTurn);
    }

    // Add an action to the current player turn
    addAction(message, category = 'general', emoji = null, area = null) {
        if (!this.currentPlayerTurn) {
            // If no turn is active, start one with "System"
            this.startPlayerTurn('System', null);
        }

        const action = {
            id: `action-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            message,
            category,
            emoji,
            area: area || 'game', // Track which area/screen this happened in
            playerName: this.currentPlayerTurn.playerName,
            playerMonster: this.currentPlayerTurn.playerMonster
        };

        this.currentPlayerTurn.actions.push(action);
        return action;
    }

    // Get the complete tree structure for rendering
    getTree() {
        return this.rounds;
    }

    // Get all actions as a flat list (for backward compatibility)
    getFlatLog() {
        const flatLog = [];
        this.rounds.forEach(round => {
            round.playerTurns.forEach(turn => {
                turn.actions.forEach(action => {
                    flatLog.push({
                        ...action,
                        roundNumber: round.roundNumber,
                        turnId: turn.id
                    });
                });
            });
        });
        return flatLog;
    }

    // Expand/collapse a round
    toggleRound(roundId) {
        const round = this.rounds.find(r => r.id === roundId);
        if (round) {
            round.expanded = !round.expanded;
        }
    }

    // Expand/collapse a player turn
    togglePlayerTurn(roundId, turnId) {
        const round = this.rounds.find(r => r.id === roundId);
        if (round) {
            const turn = round.playerTurns.find(t => t.id === turnId);
            if (turn) {
                turn.expanded = !turn.expanded;
            }
        }
    }

    // Get summary for a player turn (for collapsed view)
    getTurnSummary(turn) {
        const actionCounts = {};
        let significantActions = [];

        turn.actions.forEach(action => {
            actionCounts[action.category] = (actionCounts[action.category] || 0) + 1;
            
            // Collect significant actions for summary
            if (['attack', 'victory-points', 'power-card', 'dice-roll'].includes(action.category)) {
                significantActions.push(action);
            }
        });

        // Create a concise summary
        const summaryParts = [];
        if (actionCounts['dice-roll']) summaryParts.push(`🎲 Rolled dice`);
        if (actionCounts['attack']) summaryParts.push(`⚔️ Attacked`);
        if (actionCounts['victory-points']) summaryParts.push(`⭐ Scored points`);
        if (actionCounts['power-card']) summaryParts.push(`🃏 Used card`);
        if (actionCounts['energy-gain']) summaryParts.push(`⚡ Gained energy`);

        return summaryParts.length > 0 ? summaryParts.join(', ') : `${turn.actions.length} actions`;
    }
}

class KingOfTokyoGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gamePhase = 'setup'; // 'setup', 'playing', 'ended'
        this.round = 1;
        this.tokyoCity = null; // Player ID in Tokyo City
        this.tokyoBay = null;  // Player ID in Tokyo Bay (for 5-6 players)
        this.availableCards = [];
        this.gameSettings = {
            playerCount: 4,
            maxVictoryPoints: 20,
            startingHealth: 10,
            startingEnergy: 0,
            diceCount: 6,
            maxRolls: 3
        };
        this.gameLog = [];
        this.detailedLog = []; // Detailed log with timestamps and categories (kept small)
        this.maxMemoryLogs = 50; // Reduced memory footprint
        
        // Track total allowed rolls for current turn (base 3 + any bonus rolls)
        this.currentTurnTotalRolls = 3;
        
        // New hierarchical log structure
        this.gameLogTree = new GameLogTree();
        this.gameplayStarted = false; // Track if actual gameplay (dice rolling) has begun
        
        // Storage system integration
        this.gameId = null; // Will be set when game starts
        this.storageManager = window.gameStorage; // Reference to storage system
        this.logChunkSize = 25; // Save logs in chunks of 25 entries
        this.lastSavedLogIndex = 0;
        
        this.endingTurn = false; // Flag to prevent double turn ending
        this.switchingPlayers = false; // Flag to prevent concurrent player switching
        this.turnEffectsApplied = new Map(); // Track which turn effects have been applied this turn
        
        // Debug: Check if classes are available
        console.log('Game.js initializing, checking class availability:');
        console.log('typeof DiceCollection:', typeof DiceCollection);
        console.log('typeof window.DiceCollection:', typeof window.DiceCollection);
        console.log('typeof DiceRoller:', typeof DiceRoller);
        console.log('typeof window.DiceRoller:', typeof window.DiceRoller);
        
        // Use window classes explicitly to ensure availability
        const DiceCollectionClass = window.DiceCollection || DiceCollection;
        const DiceRollerClass = window.DiceRoller || DiceRoller;
        console.log('Using DiceCollectionClass:', typeof DiceCollectionClass);
        console.log('Using DiceRollerClass:', typeof DiceRollerClass);
        
        this.diceCollection = new DiceCollectionClass(this.gameSettings.diceCount);
        this.diceRoller = new DiceRollerClass(this.diceCollection);
        this.currentTurnPhase = 'rolling'; // 'rolling', 'resolving', 'buying', 'ended'
        this.pendingDecisions = []; // For yes/no decisions like "stay in Tokyo?"
        this.diceEffectsResolved = false; // Track if dice effects have been resolved this turn
    }

    // Roll off to determine first player - each player rolls 6 dice, highest attack dice goes first
    async rollForFirstPlayer(selectedMonsters, playerTypes = null) {
        console.log('🎲 Starting roll-off to determine first player');
        console.log('📊 selectedMonsters received:', selectedMonsters);
        console.log('📊 playerTypes received:', playerTypes);
        
        // Create temporary players for the roll-off
        const tempPlayers = [];
        for (let i = 0; i < selectedMonsters.length; i++) {
            const monster = selectedMonsters[i];
            const playerType = playerTypes ? playerTypes[i] : 'human';
            
            console.log(`📊 Creating temp player ${i}:`, {
                monster: monster,
                playerType: playerType
            });
            
            tempPlayers.push({
                index: i,
                monster: monster,
                playerType: playerType,
                playerNumber: i + 1,
                attackDice: 0
            });
        }

        console.log('📊 Created tempPlayers:', tempPlayers);
        
        let playersToRoll = [...tempPlayers];
        let rollRound = 1;

        while (playersToRoll.length > 1) {
            console.log(`🎲 Roll-off round ${rollRound} - ${playersToRoll.length} players rolling`);
            
            // Trigger event to show notification
            this.triggerEvent('rollOffRound', {
                round: rollRound,
                players: playersToRoll,
                message: rollRound === 1 
                    ? "Before we start the game, each player must roll the dice to see who gets the most attack dice. The one with the most goes first."
                    : `Round ${rollRound}: Rolling again to break the tie!`
            });

            // Wait for UI to set up
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Each player rolls 6 dice - humans roll interactively, AI rolls automatically
            for (let player of playersToRoll) {
                // Trigger event for player about to roll
                this.triggerEvent('playerAboutToRoll', {
                    player: player,
                    isHuman: player.playerType === 'human'
                });

                let attackCount = 0;
                let rolls = [];

                if (player.playerType === 'human') {
                    // Human player - wait for them to click roll button
                    const rollResult = await this.waitForHumanRoll(player);
                    rolls = rollResult.rolls;
                    attackCount = rollResult.attackCount;
                } else {
                    // AI player - automatic roll with suspense using same dice system
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Suspense delay
                    
                    // Use the same dice system as human players
                    if (!this.rollOffDiceCollection) {
                        const DiceCollectionClass = window.DiceCollection || DiceCollection;
                        this.rollOffDiceCollection = new DiceCollectionClass(6);
                    }

                    // Reset and roll all 6 dice using the same system
                    this.rollOffDiceCollection.reset();
                    this.rollOffDiceCollection.rollAll();

                    // Immediately trigger dice update to show rolling animation (like regular gameplay)
                    this.triggerEvent('diceUpdated', this.rollOffDiceCollection.getAllDiceData());

                    // Wait for dice animation to complete before getting results
                    await new Promise(resolve => {
                        setTimeout(() => {
                            // Get the dice data and convert to roll-off format
                            const diceData = this.rollOffDiceCollection.getAllDiceData();

                            // Process only the first 6 dice (enabled dice)
                            for (let i = 0; i < 6; i++) {
                                const die = diceData[i];
                                if (die && !die.isDisabled) {
                                    // Convert dice face to roll-off format using logical 1-6 mapping
                                    let rollValue;
                                    if (die.face === '1') {
                                        rollValue = 1;
                                    } else if (die.face === '2') {
                                        rollValue = 2;
                                    } else if (die.face === '3') {
                                        rollValue = 3;
                                    } else if (die.face === 'heal') {
                                        rollValue = 4; // Heal represented as 4
                                    } else if (die.face === 'energy') {
                                        rollValue = 5; // Energy represented as 5
                                    } else if (die.face === 'attack') {
                                        rollValue = 6; // Attack represented as 6
                                        attackCount++;
                                    } else {
                                        rollValue = 6; // Fallback
                                    }
                                    rolls.push(rollValue);
                                }
                            }

                            console.log(`🎲 AI Roll-off using DiceCollection: [${rolls.join(', ')}], attacks: ${attackCount}`);
                            resolve();
                        }, 600); // Wait for dice animation
                    });
                }
                
                player.attackDice = attackCount;
                player.lastRolls = rolls;
                
                console.log(`🎲 ${player.monster.name} rolled ${attackCount} attacks: [${rolls.join(', ')}]`);
                
                // Get dice data for event (if available)
                const diceData = this.rollOffDiceCollection ? this.rollOffDiceCollection.getAllDiceData() : null;
                
                // Trigger event for individual player roll
                this.triggerEvent('playerRollOff', {
                    player: player,
                    attackDice: attackCount,
                    rolls: rolls,
                    diceData: diceData
                });

                // Brief pause between players for drama
                // Add extra delay for CPU players so human can see the dice outcome
                const pauseDuration = player.playerType === 'cpu' ? 4000 : 1000; // 4 seconds for CPU (3 extra), 1 second for human
                await new Promise(resolve => setTimeout(resolve, pauseDuration));
            }

            // Find the highest attack count
            const maxAttacks = Math.max(...playersToRoll.map(p => p.attackDice));
            const winners = playersToRoll.filter(p => p.attackDice === maxAttacks);

            console.log(`🎲 Highest attack count: ${maxAttacks}, achieved by: ${winners.map(w => w.monster.name).join(', ')}`);

            if (winners.length === 1) {
                // We have a winner!
                const winner = winners[0];
                console.log(`🏆 ${winner.monster.name} wins the roll-off and goes first!`);
                
                // Trigger event to announce winner
                this.triggerEvent('rollOffWinner', {
                    winner: winner,
                    finalAttackCount: maxAttacks
                });

                // Wait a moment for the winner announcement to be seen
                await new Promise(resolve => setTimeout(resolve, 2000));

                return winner;
            } else {
                // Tie - continue with tied players
                playersToRoll = winners;
                rollRound++;
                
                // Trigger event for tie
                this.triggerEvent('rollOffTie', {
                    tiedPlayers: winners,
                    attackCount: maxAttacks,
                    round: rollRound
                });

                // Wait a moment before next round
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        // Fallback (should never reach here)
        return playersToRoll[0];
    }

    // Wait for human player to roll dice in roll-off
    async waitForHumanRoll(player) {
        console.log('🎲 waitForHumanRoll: Setting up promise for', player?.monster?.name);
        return new Promise((resolve) => {
            // Store the resolve function for the UI to call
            this.pendingHumanRoll = {
                player: player,
                resolve: resolve
            };
            console.log('🎲 waitForHumanRoll: Promise created, pendingHumanRoll set');
        });
    }

    // Called by UI when human player clicks roll button
    executeHumanRoll(player) {
        if (!this.pendingHumanRoll) {
            console.warn('🎲 executeHumanRoll: No pendingHumanRoll exists');
            return;
        }
        
        if (this.pendingHumanRoll.player !== player) {
            console.warn('🎲 executeHumanRoll: Player mismatch - expected:', this.pendingHumanRoll.player?.monster?.name, 'got:', player?.monster?.name);
            return;
        }

        console.log('🎲 executeHumanRoll: Starting roll for', player?.monster?.name);

        // Store a reference to the resolve function to prevent race conditions
        const pendingResolve = this.pendingHumanRoll.resolve;
        const pendingPlayer = this.pendingHumanRoll.player;

        // Use the same dice system as regular gameplay
        if (!this.rollOffDiceCollection) {
            const DiceCollectionClass = window.DiceCollection || DiceCollection;
            this.rollOffDiceCollection = new DiceCollectionClass(6);
        }

        // Reset and roll all 6 dice using the same system
        this.rollOffDiceCollection.reset();
        this.rollOffDiceCollection.rollAll();

        // Immediately trigger dice update to show rolling animation (like regular gameplay)
        this.triggerEvent('diceUpdated', this.rollOffDiceCollection.getAllDiceData());

        // Wait for dice animation to complete before getting results
        setTimeout(() => {
            console.log('🎲 executeHumanRoll: Processing dice results after animation');
            // Get the dice data and convert to roll-off format
            const diceData = this.rollOffDiceCollection.getAllDiceData();
            const rolls = [];
            let attackCount = 0;

            // Process only the first 6 dice (enabled dice)
            for (let i = 0; i < 6; i++) {
                const die = diceData[i];
                if (die && !die.isDisabled) {
                    // Convert dice face to roll-off format using logical 1-6 mapping
                    let rollValue;
                    if (die.face === '1') {
                        rollValue = 1;
                    } else if (die.face === '2') {
                        rollValue = 2;
                    } else if (die.face === '3') {
                        rollValue = 3;
                    } else if (die.face === 'heal') {
                        rollValue = 4; // Heal represented as 4
                    } else if (die.face === 'energy') {
                        rollValue = 5; // Energy represented as 5
                    } else if (die.face === 'attack') {
                        rollValue = 6; // Attack represented as 6
                        attackCount++;
                    } else {
                        rollValue = 6; // Fallback
                    }
                    rolls.push(rollValue);
                }
            }

            console.log(`🎲 Roll-off using DiceCollection: [${rolls.join(', ')}], attacks: ${attackCount}`);

            // Resolve the promise using stored reference to prevent race conditions
            if (pendingResolve && typeof pendingResolve === 'function') {
                console.log('🎲 executeHumanRoll: Resolving promise for', pendingPlayer?.monster?.name);
                pendingResolve({
                    rolls: rolls,
                    attackCount: attackCount,
                    diceData: diceData // Include dice data for UI display
                });
                
                // Clear pending roll if it still exists and matches our player
                if (this.pendingHumanRoll && this.pendingHumanRoll.player === pendingPlayer) {
                    this.pendingHumanRoll = null;
                }
            } else {
                console.warn('🎲 Roll-off: No valid resolve function available');
            }
        }, 600); // Wait slightly longer than the die animation
    }

    // Reorder players so the winner of the roll-off becomes Player 1
    reorderPlayersForFirstPlayer(selectedMonsters, playerTypes, firstPlayerIndex) {
        console.log(`🔄 Reordering players to make index ${firstPlayerIndex} become Player 1`);
        
        if (firstPlayerIndex === 0) {
            console.log('✅ Winner is already in position 1, no reordering needed');
            return { selectedMonsters, playerTypes };
        }

        // Create new arrays with the winner first
        const reorderedMonsters = [...selectedMonsters];
        const reorderedPlayerTypes = playerTypes ? [...playerTypes] : null;

        // Move winner to position 0, shift others
        const winnerMonster = reorderedMonsters[firstPlayerIndex];
        const winnerPlayerType = reorderedPlayerTypes ? reorderedPlayerTypes[firstPlayerIndex] : null;

        // Remove winner from current position
        reorderedMonsters.splice(firstPlayerIndex, 1);
        if (reorderedPlayerTypes) {
            reorderedPlayerTypes.splice(firstPlayerIndex, 1);
        }

        // Insert winner at the beginning
        reorderedMonsters.unshift(winnerMonster);
        if (reorderedPlayerTypes) {
            reorderedPlayerTypes.unshift(winnerPlayerType);
        }

        console.log('✅ Players reordered:');
        reorderedMonsters.forEach((monster, i) => {
            const type = reorderedPlayerTypes ? reorderedPlayerTypes[i] : 'human';
            console.log(`   Player ${i + 1}: ${monster.name} (${type})`);
        });

        return { 
            selectedMonsters: reorderedMonsters, 
            playerTypes: reorderedPlayerTypes 
        };
    }

    // Initialize game with selected monsters
    async initializeGame(selectedMonsters, playerCount, playerTypes = null, firstPlayerIndex = null) {
        this.gameSettings.playerCount = playerCount;
        this.players = [];
        this.round = 1;
        this.gamePhase = 'playing';
        this.tokyoCity = null;
        this.tokyoBay = null;

        // Initialize storage system
        if (this.storageManager && !this.storageManager.initialized) {
            await this.storageManager.initialize();
        }
        
        // Generate unique game ID
        this.gameId = this.storageManager ? this.storageManager.generateGameId() : `game_${Date.now()}`;
        console.log(`🎮 Starting new game with ID: ${this.gameId}`);

        // Create players
        for (let i = 0; i < playerCount; i++) {
            const monster = selectedMonsters[i];
            const playerType = playerTypes ? playerTypes[i] : 'human'; // Default to human if no types provided
            const player = new Player(monster, i + 1, playerType);
            this.players.push(player);
        }

        // Set starting player (either from roll-off or fallback to Player 1)
        if (firstPlayerIndex !== null) {
            console.log(`🎲 Using roll-off winner as starting player (was index ${firstPlayerIndex}, now Player 1)`);
            this.currentPlayerIndex = 0; // Winner is now always Player 1 due to reordering
        } else {
            console.log('⚠️ No roll-off performed, defaulting to Player 1');
            this.currentPlayerIndex = 0; // Default to Player 1
        }
        console.log(`� Starting player: ${this.getCurrentPlayer().monster.name} (Player ${this.currentPlayerIndex + 1})`);

        // Initialize card market
        this.refreshCardMarket();
        
        // Set up dice roller callbacks
        this.setupDiceCallbacks();

        // Don't start rounds yet - wait for first dice roll
        // this.startNewRound(); // Removed - will be called on first dice roll
        // this.startPlayerTurnInLog(this.getCurrentPlayer()); // Removed - will be called on first dice roll

        // Don't log here - setup logging happens before this function is called
        // this.logAction(`Game started with ${playerCount} players!`);
        // this.logAction(`${this.getCurrentPlayer().monster.name} goes first!`);

        // Trigger turn started event for the first player
        this.triggerEvent('turnStarted', { currentPlayer: this.getCurrentPlayer() });

        // Save initial game state
        await this.saveGameState();

        return {
            success: true,
            currentPlayer: this.getCurrentPlayer(),
            gameState: this.getGameState(),
            gameId: this.gameId
        };
    }

    // Get current player
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // Get current game state
    getGameState() {
        return {
            gamePhase: this.gamePhase,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayer: this.getCurrentPlayer()?.getStatus(),
            round: this.round,
            turnPhase: this.currentTurnPhase,
            players: this.players.map(p => p.getStatus()),
            tokyoCity: this.tokyoCity,
            tokyoBay: this.tokyoBay,
            availableCards: this.availableCards,
            diceState: this.diceRoller.getState(),
            pendingDecisions: this.pendingDecisions,
            gameLog: this.gameLog.slice(-10), // Last 10 actions
            winner: this.getWinner()
        };
    }

    // Turn-based effect tracking methods
    clearTurnEffects() {
        this.turnEffectsApplied.clear();
    }

    hasTurnEffectBeenApplied(playerId, effectType) {
        const key = `${playerId}-${effectType}`;
        return this.turnEffectsApplied.has(key);
    }

    markTurnEffectApplied(playerId, effectType) {
        const key = `${playerId}-${effectType}`;
        this.turnEffectsApplied.set(key, true);
    }

    // Disable extra dice that were enabled for a specific player
    disablePlayerExtraDice(player) {
        if (player.extraDiceEnabled && player.extraDiceEnabled > 0) {
            let disabledCount = 0;
            for (let i = 0; i < player.extraDiceEnabled; i++) {
                const dieIndex = this.diceCollection.maxDice + i;
                if (this.diceCollection.disableExtraDie(dieIndex)) {
                    disabledCount++;
                }
            }
            player.extraDiceEnabled = 0;
            
            // Trigger dice update to refresh UI after disabling extra dice
            if (disabledCount > 0) {
                this.triggerEvent('diceUpdated', this.diceCollection.getAllDiceData());
            }
        }
    }

    // Debug method to test Friend of Children card
    debugGiveFriendOfChildren() {
        const currentPlayer = this.getCurrentPlayer();
        const friendOfChildrenCard = POWER_CARDS.find(card => card.id === 'friend_of_children');
        if (friendOfChildrenCard && !currentPlayer.powerCards.some(card => card.id === 'friend_of_children')) {
            currentPlayer.powerCards.push(friendOfChildrenCard);
            this.logAction(`DEBUG: Gave ${currentPlayer.monster.name} the Friend of Children card!`, 'debug');
            console.log(`🐛 DEBUG: Gave ${currentPlayer.monster.name} Friend of Children card`);
            // Trigger UI update
            this.triggerEvent('playerUpdated', { player: currentPlayer });
        }
    }

    // Debug method to test Extra Head card
    debugGiveExtraHead() {
        const currentPlayer = this.getCurrentPlayer();
        const extraHeadCard = POWER_CARDS.find(card => card.id === 'extra_head');
        if (extraHeadCard && !currentPlayer.powerCards.some(card => card.id === 'extra_head')) {
            currentPlayer.powerCards.push(extraHeadCard);
            this.logAction(`DEBUG: Gave ${currentPlayer.monster.name} the Extra Head card!`, 'debug');
            console.log(`🐛 DEBUG: Gave ${currentPlayer.monster.name} Extra Head card`);
            // Trigger UI update
            this.triggerEvent('playerUpdated', { player: currentPlayer });
        }
    }

    // Setup dice roller callbacks
    setupDiceCallbacks() {
        this.diceRoller.setCallbacks({
            onRollStart: (rollsLeft) => {
                // Removed the "rolls the dice..." message
            },
            onRollComplete: (data) => {
                // Log the dice roll result for non-final rolls
                if (data.rollsRemaining > 0) {
                    // Calculate current roll number
                    const currentRoll = this.currentTurnTotalRolls - data.rollsRemaining;
                    
                    // Create visual dice representation for intermediate rolls
                    const diceStates = this.diceCollection.dice
                        .filter(die => die.face !== null && !die.isDisabled)
                        .map(die => die.face);
                    
                    const createDiceBox = (face) => {
                        if (['1', '2', '3'].includes(face)) {
                            return `<span class="dice-box dice-number">${face}</span>`;
                        }
                        if (face === 'energy') return '<span class="dice-box dice-energy">⚡</span>';
                        if (face === 'attack') return '<span class="dice-box dice-attack">⚔️</span>';
                        if (face === 'heal') return '<span class="dice-box dice-heal">❤️</span>';
                        return `<span class="dice-box">${face}</span>`;
                    };
                    
                    const visualDice = diceStates.map(face => createDiceBox(face)).join(' ');
                    this.logDetailedAction(`${this.getCurrentPlayer().monster.name} rolled: ${visualDice} (roll ${currentRoll}/${this.currentTurnTotalRolls})`, 'dice-faces');
                }
                
                this.handleDiceResults(data.results, data.rollsRemaining);
            },
            onDiceUpdate: (diceData) => {
                // Update UI through event system
                this.triggerEvent('diceUpdated', diceData);
            }
        });
    }

    // Handle dice roll results
    handleDiceResults(results, rollsLeft) {
        const player = this.getCurrentPlayer();
        
        console.log('handleDiceResults called with rollsLeft:', rollsLeft);
        console.log('Current turn phase:', this.currentTurnPhase);
        
        // Add defensive check for results structure
        if (!results) {
            console.error('handleDiceResults called with null/undefined results');
            return;
        }
        
        if (!results.numbers) {
            console.error('handleDiceResults called with results missing numbers property:', results);
            return;
        }
        
        // Show CPU thought bubble when analyzing dice results
        if (player.playerType === 'cpu' && rollsLeft > 0) {
            // Determine context based on dice results
            let context = 'uncertain';
            if (player.health <= 3 && results.heal > 0) {
                context = 'needHearts';
            } else if (player.energy <= 2 && results.energy > 0) {
                context = 'needEnergy';
            } else if (results.attack > 0) {
                context = 'aggressive';
            } else if (Object.values(results.numbers).some(count => count >= 2)) {
                context = 'needNumbers';
            } else if (rollsLeft === 1) {
                context = 'confident';
            }
            
            // Show thought bubble through UI
            this.triggerEvent('showCPUThought', { 
                player: player, 
                context: context,
                results: results 
            });
        }
        
        // Log what was rolled with specific emojis
        let rollSummary = [];
        if (results.energy > 0) rollSummary.push(`⚡${results.energy} energy`);
        if (results.attack > 0) rollSummary.push(`⚔️${results.attack} attack`);
        if (results.heal > 0) rollSummary.push(`❤️${results.heal} heal`);
        
        Object.keys(results.numbers).forEach(num => {
            if (results.numbers[num] > 0) {
                rollSummary.push(`🎲${results.numbers[num]}x ${num}`);
            }
        });

        // Check if turn is complete (no rolls left or player chooses to stop)
        if (rollsLeft === 0) {
            console.log('No rolls left, transitioning to resolving phase');
            this.currentTurnPhase = 'resolving';
            this.resolveDiceEffects(results);
            this.triggerEvent('turnPhaseChanged', { phase: 'resolving' });
        } else {
            console.log('Rolls remaining:', rollsLeft, 'staying in rolling phase');
        }

        this.triggerEvent('diceRollComplete', { results, rollsLeft });
    }

    // Resolve dice effects
    resolveDiceEffects(results, skipDiceLog = false) {
        // Prevent multiple resolution of dice effects in the same turn
        if (this.diceEffectsResolved) {
            console.log('🐛 DEBUG - Dice effects already resolved this turn, skipping');
            console.trace('🐛 DUPLICATE CALL - Stack trace for duplicate resolveDiceEffects call:');
            return;
        }
        
        const player = this.getCurrentPlayer();
        
        console.log('🔍 resolveDiceEffects called with results:', results);
        console.log('🔍 Dice collection internal state at time of resolution:');
        this.diceCollection.dice.forEach((die, index) => {
            console.log(`🔍 Die ${index}: id=${die.id}, face=${die.face}, isDisabled=${die.isDisabled}, symbol=${die.getSymbol()}`);
        });
        
        console.log('Current player before effects:', {
            name: player.monster.name,
            energy: player.energy,
            health: player.health,
            victoryPoints: player.victoryPoints
        });
        
        // Debug: Log dice faces that were rolled (only enabled dice)
        const diceStates = this.diceCollection.dice
            .filter(die => !die.isDisabled) // Only include enabled dice
            .map(die => ({
                id: die.id,
                face: die.face,
                symbol: die.getSymbol(),
                faceData: die.getFaceData()
            }));
        console.log('Individual dice faces (enabled only):', diceStates);
        
        // Create visual dice representation using HTML spans for better styling
        const createDiceBox = (face) => {
            // For numbers, create styled box elements
            if (['1', '2', '3'].includes(face)) {
                return `<span class="dice-box dice-number">${face}</span>`;
            }
            
            // For special symbols, use styled spans
            if (face === 'energy') return '<span class="dice-box dice-energy">⚡</span>';
            if (face === 'attack') return '<span class="dice-box dice-attack">⚔️</span>';
            if (face === 'heal') return '<span class="dice-box dice-heal">❤️</span>';
            
            // Fallback
            return `<span class="dice-box">${face}</span>`;
        };
        
        // Create visual dice representation (only enabled dice)
        const visualDice = diceStates.map(die => createDiceBox(die.face)).join(' ');
        
        // Only log the dice roll if not skipping (to avoid duplicate logs when keeping dice)
        if (!skipDiceLog) {
            // Calculate current roll number (when final roll is logged, rollsRemaining = 0)
            const rollNumber = this.currentTurnTotalRolls - this.diceRoller.rollsRemaining;
            this.logDetailedAction(`${this.getCurrentPlayer().monster.name} rolled: ${visualDice} (roll ${rollNumber}/${this.currentTurnTotalRolls})`, 'dice-faces');
        }
        
        // Mark dice effects as resolved for this turn
        this.diceEffectsResolved = true;
        
        let totalVictoryPoints = 0;
        let totalEnergy = 0;
        let totalAttack = 0;
        let totalHeal = 0;

        // Calculate victory points from number sets
        const numberPoints = this.diceCollection.getVictoryPoints();
        console.log('Victory points calculation:');
        console.log('- Number counts:', results.numbers);
        console.log('- Calculated victory points:', numberPoints);
        
        if (numberPoints > 0) {
            totalVictoryPoints += numberPoints;
            // More detailed logging for number sets
            const diceResults = this.diceCollection.getResults();
            let setsInfo = [];
            Object.keys(diceResults.numbers).forEach(number => {
                const count = diceResults.numbers[number];
                if (count >= 3) {
                    const basePoints = parseInt(number);
                    const bonusPoints = count - 3;
                    const totalForThisSet = basePoints + bonusPoints;
                    setsInfo.push(`${count}x ${number}s = ${totalForThisSet} points`);
                }
            });
            this.logAction(`${player.monster.name} scores ${numberPoints} victory points from sets: ${setsInfo.join(', ')}`, 'victory-points');
        }

        // Energy
        totalEnergy = results.energy;
        console.log('Energy calculation:');
        console.log('- Energy from dice:', totalEnergy);
        
        if (totalEnergy > 0) {
            player.addEnergy(totalEnergy);
            this.logAction(`${player.monster.name} gains ${totalEnergy} energy`, 'energy');
        }

        // Healing (only if not in Tokyo)
        totalHeal = results.heal;
        if (totalHeal > 0) {
            if (player.isInTokyo) {
                this.logAction(`${player.monster.name} cannot heal while in Tokyo!`, 'healing');
            } else {
                const healed = player.heal(totalHeal);
                if (healed > 0) {
                    this.logAction(`${player.monster.name} heals ${totalHeal} health`, 'healing');
                    // Trigger healing animation
                    this.triggerEvent('playerHealed', { playerId: player.id, healAmount: healed });
                }
            }
        }

        // Attacks
        totalAttack = results.attack;
        console.log(`🐛 DEBUG - Attack calculation:`, {
            diceAttackValue: results.attack,
            playerName: player.monster.name,
            totalAttack: totalAttack,
            playerPowerCards: player.powerCards.map(card => card.name),
            individualDiceResults: this.diceCollection.dice.map(die => ({
                face: die.face,
                faceData: die.getFaceData(),
                isDisabled: die.isDisabled
            }))
        });
        
        // Check if there are actual attack dice (claws/swords) rolled (only enabled dice)
        const hasAttackDice = this.diceCollection.dice.some(die => !die.isDisabled && die.face === 'attack');
        
        // 🚨 DEBUG: Log potential bug when attack animation might trigger inappropriately
        if (totalAttack > 0 && !hasAttackDice) {
            console.error(`🚨 BUG DETECTED: totalAttack is ${totalAttack} but hasAttackDice is false!`);
            console.error(`🚨 This should never happen - attack power without attack dice!`);
            console.error(`🚨 Individual dice states:`, this.diceCollection.dice.map(die => ({
                id: die.id,
                face: die.face,
                isDisabled: die.isDisabled,
                faceData: die.getFaceData()
            })));
        }
        
        if (totalAttack === 0 && hasAttackDice) {
            console.error(`🚨 WEIRD: hasAttackDice is true but totalAttack is 0!`);
            console.error(`🚨 Individual dice states:`, this.diceCollection.dice.map(die => ({
                id: die.id,
                face: die.face,
                isDisabled: die.isDisabled,
                faceData: die.getFaceData()
            })));
        }
        
        console.log(`🎯 ATTACK DECISION: totalAttack=${totalAttack}, hasAttackDice=${hasAttackDice}`);
        
        // Enhanced dice state debugging with DOM verification
        const diceStateDetails = this.diceCollection.dice.map(die => {
            const domElement = document.querySelector(`[data-die-id="${die.id}"]`);
            const visualText = domElement ? domElement.textContent.trim() : 'not-found';
            const visualSymbol = die.getSymbol ? die.getSymbol() : 'no-getSymbol';
            
            return {
                id: die.id,
                face: die.face,
                isDisabled: die.isDisabled,
                faceData: die.getFaceData(),
                visualSymbol: visualSymbol,
                domText: visualText,
                mismatch: (visualText !== visualSymbol && visualText !== 'not-found')
            };
        });
        
        console.log(`🎯 DICE STATE CHECK:`, diceStateDetails);
        
        // Check for visual/internal mismatches
        const attackDice = diceStateDetails.filter(die => !die.isDisabled && die.face === 'attack');
        if (attackDice.length > 0) {
            console.log(`🎯 ATTACK DICE FOUND:`, attackDice);
            attackDice.forEach(die => {
                console.log(`🚨 Die ${die.id}: internal='${die.face}', visual='${die.domText}', expectedSymbol='${die.visualSymbol}', mismatch=${die.mismatch}`);
                if (die.mismatch) {
                    console.error(`🚨 CRITICAL MISMATCH: Die ${die.id} shows '${die.domText}' but internal state is '${die.face}'!`);
                }
            });
        }
        
        // Check for any mismatches (not just attack dice)
        const mismatches = diceStateDetails.filter(die => !die.isDisabled && die.mismatch);
        if (mismatches.length > 0) {
            console.error(`🚨 VISUAL/INTERNAL MISMATCHES DETECTED:`, mismatches);
        }
        
        if (totalAttack > 0 && hasAttackDice) {
            console.log(`🚨 ATTACK WARNING - ${player.monster.name} is about to attack with ${totalAttack} power from rolled attack dice`);
            if (totalAttack > 3) {
                console.log(`🚨 SUSPICIOUS - Attack power ${totalAttack} is greater than maximum possible (3)!`);
                console.log(`🚨 Individual dice states (enabled only):`, this.diceCollection.dice.filter(die => !die.isDisabled).map(die => `${die.id}: ${die.face}`));
            }
            this.resolveAttacks(player, totalAttack);
            
            // Apply attack healing effects
            player.powerCards.forEach(card => {
                const effect = this.applyCardEffectWithAnimation(card, player, this);
                if (effect.type === 'passive' && effect.effect === 'attackHealing') {
                    const healed = player.heal(1);
                    if (healed > 0) {
                        this.logAction(`${player.monster.name} heals 1 health from attacking!`, 'healing');
                        // Trigger healing animation for attack healing
                        this.triggerEvent('playerHealed', { playerId: player.id, healAmount: healed });
                    }
                }
            });
        }

        // Add victory points
        if (totalVictoryPoints > 0) {
            console.log(`🎲 Adding ${totalVictoryPoints} dice victory points to ${player.monster.name}`);
            console.log(`⭐ Player's victory points before dice: ${player.victoryPoints}`);
            player.addVictoryPoints(totalVictoryPoints);
            console.log(`⭐ Player's victory points after dice: ${player.victoryPoints}`);
            // Trigger victory points animation
            this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: totalVictoryPoints });
        }

        console.log('Current player after effects:', {
            name: player.monster.name,
            energy: player.energy,
            health: player.health,
            victoryPoints: player.victoryPoints
        });

        // Apply power card effects
        this.applyPassiveCardEffects(player, results);

        // Apply turn-based power card effects immediately after dice resolution
        // This ensures effects like "gain 1 energy per turn" happen right after dice, not at start of next turn
        this.applyTurnBasedEffects(player);

        // Check for Tokyo entry
        this.checkTokyoEntry(player);

        // Check victory conditions
        if (this.checkVictoryConditions()) {
            return;
        }

        // Stay in resolving phase - turn can be ended when ready
        console.log('Dice effects resolved, ready to end turn');
        this.triggerEvent('turnPhaseChanged', { phase: 'resolving' });
        
        // Trigger UI update to reflect stat changes
        this.triggerEvent('statsUpdated', { player });
        
        // Also trigger a general game state update to ensure all UI elements are current
        this.triggerEvent('gameStateChanged', this.getGameState());
    }

        // Resolve attack effects
    resolveAttacks(attacker, attackPower) {
        console.log(`🐛 DEBUG - resolveAttacks called:`, {
            attackerName: attacker.monster.name,
            attackPower: attackPower,
            attackerInTokyo: attacker.isInTokyo,
            attackerTokyoLocation: attacker.tokyoLocation
        });
        
        console.log(`${attacker.monster.name} attacks with power ${attackPower}`);
        console.log(`Attacker location - isInTokyo: ${attacker.isInTokyo}, tokyoLocation: ${attacker.tokyoLocation}`);
        
        if (attacker.isInTokyo) {
            if (attacker.tokyoLocation === 'city') {
                // Player in Tokyo City attacks only players outside Tokyo (NOT Tokyo Bay)
                const attackTargets = [];
                this.players.forEach(player => {
                    if (player.id !== attacker.id && !player.isEliminated && !player.isInTokyo) {
                        console.log(`Attacking ${player.monster.name} (from Tokyo City, targeting outside Tokyo) - target location: isInTokyo: ${player.isInTokyo}, tokyoLocation: ${player.tokyoLocation}`);
                        this.dealDamage(player, attackPower, attacker);
                        attackTargets.push(player.monster.name);
                    }
                });
                
                // Count how many players were actually attacked
                const targetsOutsideTokyo = this.players.filter(p => p.id !== attacker.id && !p.isEliminated && !p.isInTokyo);
                if (targetsOutsideTokyo.length > 0) {
                    this.logDetailedAction(`${attacker.monster.name} attacks from Tokyo City: ${attackTargets.join(', ')} each take ${attackPower} damage`, 'attack-detail');
                } else {
                    this.logDetailedAction(`${attacker.monster.name} attacks from Tokyo City: no valid targets outside Tokyo`, 'attack-detail');
                }
            } else if (attacker.tokyoLocation === 'bay') {
                // Player in Tokyo Bay attacks only players outside Tokyo (NOT Tokyo City)
                const attackTargets = [];
                this.players.forEach(player => {
                    if (player.id !== attacker.id && !player.isEliminated && !player.isInTokyo) {
                        console.log(`Attacking ${player.monster.name} (from Tokyo Bay, targeting outside Tokyo) - target location: isInTokyo: ${player.isInTokyo}, tokyoLocation: ${player.tokyoLocation}`);
                        this.dealDamage(player, attackPower, attacker);
                        attackTargets.push(player.monster.name);
                    }
                });
                
                // Count how many players were actually attacked
                const targetsOutsideTokyo = this.players.filter(p => p.id !== attacker.id && !p.isEliminated && !p.isInTokyo);
                if (targetsOutsideTokyo.length > 0) {
                    this.logDetailedAction(`${attacker.monster.name} attacks from Tokyo Bay: ${attackTargets.join(', ')} each take ${attackPower} damage`, 'attack-detail');
                } else {
                    this.logDetailedAction(`${attacker.monster.name} attacks from Tokyo Bay: no valid targets outside Tokyo`, 'attack-detail');
                }
            }
            
            // Gain extra victory points for being in Tokyo and attacking
            attacker.addVictoryPoints(1);
            // Trigger victory points animation for Tokyo bonus
            this.triggerEvent('playerGainedPoints', { playerId: attacker.id, pointsGained: 1 });
        } else {
            // Player outside Tokyo attacks players in Tokyo
            const tokyoPlayers = this.players.filter(p => p.isInTokyo && !p.isEliminated);
            
            if (tokyoPlayers.length > 0) {
                const attackTargets = [];
                const playersWhoTookDamage = []; // Track who actually took damage for Tokyo exit decisions
                
                tokyoPlayers.forEach(player => {
                    console.log(`Attacking ${player.monster.name} (in Tokyo ${player.tokyoLocation}) - attacker from outside Tokyo`);
                    const damageDealt = this.dealDamage(player, attackPower, attacker);
                    attackTargets.push(`${player.monster.name} (Tokyo ${player.tokyoLocation})`);
                    
                    // Track players who took damage and are still in Tokyo for exit decisions
                    if (damageDealt > 0 && player.isInTokyo && !player.isEliminated) {
                        playersWhoTookDamage.push(player);
                    }
                });
                
                // Create appropriate attack message based on number of targets
                if (attackTargets.length === 1) {
                    this.logAction(`${attacker.monster.name} attacks monsters inside Tokyo: ${attackTargets[0]} takes ${attackPower} damage`);
                } else {
                    this.logAction(`${attacker.monster.name} attacks monsters inside Tokyo: ${attackTargets.join(', ')}, each take ${attackPower} damage`);
                }
                
                // After all damage is dealt, offer Tokyo exit decisions to all players who took damage
                // But only if the attacker has no rolls remaining (final roll)
                const attackerRollsRemaining = this.diceRoller.getState().rollsRemaining;
                if (attackerRollsRemaining === 0 && playersWhoTookDamage.length > 0) {
                    playersWhoTookDamage.forEach(player => {
                        // Check if player has Background Dweller (can always stay)
                        const hasStayInTokyoPower = player.powerCards.some(card => {
                            const effect = applyCardEffect(card, player, this);
                            return effect.type === 'passive' && effect.effect === 'forcedStay';
                        });
                        
                        if (hasStayInTokyoPower) {
                            this.logAction(`${player.monster.name} has the power to stay in Tokyo despite taking damage!`);
                        }
                        
                        this.offerTokyoExit(player, attacker);
                    });
                }
                
                // NOTE: Tokyo entry is handled at end of turn via handleEndOfTurnTokyoEntry(), not during attack resolution
            } else {
                this.logAction(`${attacker.monster.name} attacks but no one is in Tokyo!`, 'attack-empty');
            }
        }
    }

        // Deal damage to a player
    dealDamage(player, damage, attacker) {
        console.log(`🐛 DEBUG - dealDamage called:`, {
            targetPlayer: player.monster.name,
            attackerPlayer: attacker.monster.name,
            damageAmount: damage,
            targetCurrentHealth: player.health
        });
        
        // Check if target has camouflage protection
        const hasCamouflage = player.powerCards.some(card => {
            const effect = applyCardEffect(card, player, this);
            return effect.type === 'passive' && effect.effect === 'protection';
        });
        
        if (hasCamouflage) {
            this.logAction(`${player.monster.name} is protected by camouflage and cannot be attacked directly!`);
            return 0;
        }
        
        const damageResult = player.takeDamage(damage);
        const actualDamage = damageResult.actualDamage;
        const eliminationInfo = damageResult.eliminationInfo;
        
        // Handle elimination
        if (eliminationInfo) {
            console.log(`💀 Player ${player.monster.name} has been eliminated!`);
            
            // Clear Tokyo state immediately if player was in Tokyo
            if (eliminationInfo.wasInTokyo) {
                console.log(`💀 ELIMINATION: Clearing ${player.monster.name} from Tokyo ${eliminationInfo.tokyoLocation}`);
                console.log(`💀 ELIMINATION: Tokyo state before - City: ${this.tokyoCity}, Bay: ${this.tokyoBay}`);
                
                if (eliminationInfo.tokyoLocation === 'city') {
                    this.tokyoCity = null;
                } else if (eliminationInfo.tokyoLocation === 'bay') {
                    this.tokyoBay = null;
                }
                
                console.log(`💀 ELIMINATION: Tokyo state after clearing - City: ${this.tokyoCity}, Bay: ${this.tokyoBay}`);
                
                // Trigger Tokyo display update to clear the eliminated player
                this.triggerEvent('tokyoChanged', this.getGameState());
                
                // Attacker takes their place immediately if not already in Tokyo and not eliminated
                if (!attacker.isInTokyo && !attacker.isEliminated) {
                    console.log(`💀 ELIMINATION: ${attacker.monster.name} takes ${player.monster.name}'s place in Tokyo ${eliminationInfo.tokyoLocation}`);
                    
                    if (eliminationInfo.tokyoLocation === 'city') {
                        this.tokyoCity = attacker.id;
                    } else if (eliminationInfo.tokyoLocation === 'bay') {
                        this.tokyoBay = attacker.id;
                    }
                    
                    console.log(`💀 ELIMINATION: Tokyo state after attacker entry - City: ${this.tokyoCity}, Bay: ${this.tokyoBay}`);
                    
                    attacker.enterTokyo(eliminationInfo.tokyoLocation);
                    this.logAction(`${attacker.monster.name} immediately enters Tokyo ${eliminationInfo.tokyoLocation} after eliminating ${player.monster.name}! (+1 victory point)`, 'tokyo');
                    
                    // Trigger events for UI updates
                    this.triggerEvent('playerEntersTokyo', { 
                        playerId: attacker.id, 
                        location: eliminationInfo.tokyoLocation,
                        reason: 'elimination',
                        monster: attacker.monster
                    });
                    this.triggerEvent('tokyoChanged', this.getGameState());
                    
                    // Trigger victory points animation for Tokyo entry bonus
                    this.triggerEvent('playerGainedPoints', { 
                        playerId: attacker.id, 
                        pointsGained: 1 
                    });
                } else if (attacker.isInTokyo) {
                    console.log(`💀 ELIMINATION: ${attacker.monster.name} is already in Tokyo, not moving`);
                } else if (attacker.isEliminated) {
                    console.log(`💀 ELIMINATION: ${attacker.monster.name} is eliminated, cannot enter Tokyo`);
                }
            }
            
            // Show elimination dialog after Tokyo handling
            this.triggerEvent('playerEliminated', { 
                eliminatedPlayer: player, 
                attacker: attacker,
                eliminationInfo: eliminationInfo 
            });
        }
        
        // Trigger attack animation if damage was dealt
        if (actualDamage > 0) {
            console.log('🔥 Triggering playerAttacked event for:', player.monster.name, 'playerId:', player.id, 'damage:', actualDamage);
            console.trace('🔥 Stack trace for playerAttacked event:');
            this.triggerEvent('playerAttacked', { playerId: player.id });
        }
        
        // Return actual damage for compatibility with existing code
        const returnDamage = actualDamage;
        
        // If player was in Tokyo and took damage, they can choose to leave ONLY after attacker's final roll
        // NOTE: Tokyo exit decisions are now handled centrally in resolveAttacks for outside-Tokyo attackers
        // This section only handles Tokyo-vs-Tokyo attacks or other special cases
        if (player.isInTokyo && actualDamage > 0 && !player.isEliminated) {
            // Check if the attacker has no rolls remaining (final roll)
            const attackerRollsRemaining = this.diceRoller.getState().rollsRemaining;
            
            // Only offer individual Tokyo exit if this is NOT a standard outside-Tokyo attack
            // (those are handled centrally in resolveAttacks)
            const isStandardOutsideTokyoAttack = !attacker.isInTokyo;
            
            if (attackerRollsRemaining === 0 && !isStandardOutsideTokyoAttack) {
                // Check if player has Background Dweller (can always stay)
                const hasStayInTokyoPower = player.powerCards.some(card => {
                    const effect = applyCardEffect(card, player, this);
                    return effect.type === 'passive' && effect.effect === 'forcedStay';
                });
                
                if (hasStayInTokyoPower) {
                    this.logAction(`${player.monster.name} has the power to stay in Tokyo despite taking damage!`);
                    // Still offer the choice, but player can always choose to stay
                }
                
                this.offerTokyoExit(player, attacker);
            }
        }
        
        // Elimination is now handled directly in takeDamage method
        
        return returnDamage;
    }

    // Offer player in Tokyo the choice to leave
    offerTokyoExit(player, attacker) {
        console.log(`🏙️ offerTokyoExit called for ${player.monster.name} (playerType: ${player.playerType})`);
        
        // Handle CPU players automatically without showing modal
        if (player.playerType === 'cpu') {
            console.log(`🤖 CPU ${player.monster.name} automatically deciding Tokyo exit...`);
            let context = 'uncertain';
            let stayInTokyo = false;
            
            // CPU decision logic based on health, points, and personality
            if (player.health <= 2) {
                // Very low health - usually leave unless close to winning
                stayInTokyo = player.victoryPoints >= 18;
                context = 'lowHealth';
            } else if (player.health <= 4) {
                // Low health - risky to stay
                stayInTokyo = player.victoryPoints >= 16 || (player.monster.profile && player.monster.profile.risk >= 4);
                context = 'needHearts';
            } else if (player.victoryPoints >= 18) {
                // Very close to winning - stay if reasonable health
                stayInTokyo = true;
                context = 'closeToWinning';
            } else if (player.victoryPoints >= 15) {
                // Close to winning - moderate risk taking
                stayInTokyo = player.health >= 5 || (player.monster.profile && player.monster.profile.risk >= 3);
                context = 'closeToWinning';
            } else if (player.monster.profile && player.monster.profile.risk >= 4) {
                // High risk tolerance
                stayInTokyo = player.health >= 3;
                context = 'confident';
            } else if (player.monster.profile && player.monster.profile.aggression >= 4) {
                // Aggressive players tend to stay
                stayInTokyo = player.health >= 4;
                context = 'aggressive';
            } else {
                // Conservative default
                stayInTokyo = player.health >= 6;
                context = 'uncertain';
            }
            
            // Show CPU thought bubble for Tokyo decision
            this.triggerEvent('showCPUThought', { 
                player: player, 
                context: context,
                situation: 'tokyo-decision'
            });
            
            // Show notification about CPU decision
            const actionText = stayInTokyo ? 'chooses to stay in Tokyo' : 'chooses to leave Tokyo';
            this.triggerEvent('cpuNotification', {
                message: `${player.monster.name} is attacked in Tokyo and ${actionText}`,
                player: player,
                attacker: attacker,
                action: stayInTokyo ? 'stay' : 'leave'
            });
            
            // Auto-execute the decision after a brief delay for readability
            setTimeout(() => {
                this.handleTokyoExitDecision(player.id, stayInTokyo);
            }, 1500);
            
            return; // Don't create pending decision for CPU
        }
        
        const decision = {
            type: 'tokyoExit',
            playerId: player.id,
            attackerId: attacker.id,
            message: `${player.monster.name}, you were attacked! Do you want to leave Tokyo?`,
            options: [
                { text: 'Stay in Tokyo', value: 'stay' },
                { text: 'Leave Tokyo', value: 'leave' }
            ]
        };
        
        this.pendingDecisions.push(decision);
        
        // Only trigger the UI event if this is the only pending decision
        // This prevents multiple modals from overriding each other
        if (this.pendingDecisions.length === 1) {
            this.triggerEvent('pendingDecision', decision);
        } else {
            console.log(`🔄 Added Tokyo exit decision for ${player.monster.name} to queue (position ${this.pendingDecisions.length})`);
        }
    }

    // Handle player decisions
    handlePlayerDecision(decisionId, choice) {
        const decisionIndex = this.pendingDecisions.findIndex(d => d.type === decisionId || d.playerId === decisionId);
        if (decisionIndex === -1) return;
        
        const decision = this.pendingDecisions[decisionIndex];
        this.pendingDecisions.splice(decisionIndex, 1);
        
        if (decision.type === 'tokyoExit') {
            const player = this.players.find(p => p.id === decision.playerId);
            const attacker = this.players.find(p => p.id === decision.attackerId);
            
            if (choice === 'leave') {
                this.removePlayerFromTokyo(player);
                this.logAction(`${player.monster.name} leaves Tokyo!`);
                
                // Attacker enters Tokyo if they're not in Tokyo
                if (!attacker.isInTokyo) {
                    this.checkTokyoEntry(attacker);
                }
            } else {
                this.logAction(`${player.monster.name} stays in Tokyo!`, 'tokyo');
            }
            
            // Trigger UI update
            this.triggerEvent('tokyoChanged', this.getGameState());
        }
        
        // After handling a decision, check if there are more pending decisions to process
        if (this.pendingDecisions.length > 0) {
            console.log(`🔄 Processing next pending decision (${this.pendingDecisions.length} remaining)`);
            const nextDecision = this.pendingDecisions[0];
            this.triggerEvent('pendingDecision', nextDecision);
        }
    }

    // Calculate final damage after power card effects
    calculateFinalDamage(victim, baseDamage, attacker) {
        let finalDamage = baseDamage;
        
        // Apply victim's defensive effects
        victim.powerCards.forEach(card => {
            const effect = applyCardEffect(card, victim, this);
            if (effect.type === 'passive' && effect.effect === 'damageReduction') {
                // Armor plating - ignore damage on dice roll 1-2
                const roll = Math.floor(Math.random() * 6) + 1;
                if (roll <= 2) {
                    finalDamage = 0;
                    this.logAction(`${victim.monster.name}'s armor deflects the attack!`);
                }
            }
        });

        // Apply attacker's offensive effects
        attacker.powerCards.forEach(card => {
            const effect = applyCardEffect(card, attacker, this);
            if (effect.type === 'modifier' && effect.target === 'damage') {
                finalDamage += effect.value;
                this.logAction(`${attacker.monster.name}'s power increases the damage by ${effect.value}!`);
            }
        });

        // Apply counter-attack effects if damage was dealt
        if (finalDamage > 0) {
            victim.powerCards.forEach(card => {
                const effect = applyCardEffect(card, victim, this);
                if (effect.type === 'passive' && effect.effect === 'retaliation') {
                    const counterResult = attacker.takeDamage(1);
                    if (counterResult.actualDamage > 0) {
                        this.logAction(`${victim.monster.name} retaliates, dealing 1 damage to ${attacker.monster.name}!`);
                        
                        // Handle elimination from retaliation
                        if (counterResult.eliminationInfo) {
                            console.log(`💀 ${attacker.monster.name} eliminated by retaliation!`);
                            this.triggerEvent('playerEliminated', { 
                                eliminatedPlayer: attacker, 
                                attacker: victim,
                                eliminationInfo: counterResult.eliminationInfo 
                            });
                        }
                    }
                }
            });
        }

        return Math.max(0, finalDamage);
    }

    // Handle Tokyo exit decision
    handleTokyoExitDecision(playerId, stayInTokyo) {
        const player = this.players.find(p => p.id === playerId);
        const decision = this.pendingDecisions.find(d => d.playerId === playerId && d.type === 'tokyoExit');
        
        if (!player || !decision) return;

        if (stayInTokyo) {
            this.logAction(`${player.monster.name} chooses to stay in Tokyo!`);
        } else {
            // Check if player has Wings (safe flight)
            const hasSafeFlight = player.powerCards.some(card => {
                const effect = applyCardEffect(card, player, this);
                return effect.type === 'passive' && effect.effect === 'safeFlight';
            });
            
            if (hasSafeFlight) {
                this.logAction(`${player.monster.name} uses wings to safely flee Tokyo without taking damage!`);
            } else {
                this.logAction(`${player.monster.name} flees Tokyo!`);
            }
            
            this.removePlayerFromTokyo(player);
            
            // Attacker may enter Tokyo
            const attacker = this.players.find(p => p.id === decision.attackerId);
            if (attacker && !attacker.isInTokyo) {
                this.enterTokyo(attacker);
            }
        }

        // Remove decision from pending
        this.pendingDecisions = this.pendingDecisions.filter(d => d !== decision);
    }

    // Get players currently in Tokyo
    getPlayersInTokyo() {
        return this.players.filter(p => p.isInTokyo && !p.isEliminated);
    }

    // Check if player should enter Tokyo
    checkTokyoEntry(player) {
        // Eliminated players cannot enter Tokyo
        if (player.isEliminated) {
            console.log(`💀 ${player.monster.name} is eliminated and cannot enter Tokyo`);
            return;
        }
        
        // Players only enter Tokyo during dice resolution if they attack and force someone out
        // Regular Tokyo entry (when Tokyo is empty) happens at END of turn
        console.log(`🎯 Tokyo entry during dice resolution only happens when attacking forces someone out`);
        
        // Only enter Tokyo if there are no current occupants AND the player attacked (forced entry)
        if (!player.isInTokyo && this.tokyoCity === null) {
            this.enterTokyo(player);
        } else if (!player.isInTokyo && this.tokyoBay === null && this.gameSettings.playerCount >= 5 && this.tokyoCity !== null) {
            this.enterTokyo(player);
        }
    }

    // Enter Tokyo
    enterTokyo(player, automatic = false) {
        console.log(`🏯 enterTokyo called for ${player.monster.name}, automatic=${automatic}`);
        
        let location = null;
        
        if (this.tokyoCity === null) {
            this.tokyoCity = player.id;
            location = 'city';
            if (automatic) {
                this.logAction(`${player.monster.name} enters Tokyo City!`, 'tokyo');
            } else {
                this.logAction(`${player.monster.name} enters Tokyo City! (+1 victory point)`, 'tokyo');
            }
        } else if (this.tokyoBay === null && this.gameSettings.playerCount >= 5) {
            this.tokyoBay = player.id;
            location = 'bay';
            if (automatic) {
                this.logAction(`${player.monster.name} enters Tokyo Bay!`, 'tokyo');
            } else {
                this.logAction(`${player.monster.name} enters Tokyo Bay! (+1 victory point)`, 'tokyo');
            }
        }
        
        if (location) {
            console.log(`🏯 Player ${player.monster.name} entering Tokyo ${location}`);
            player.enterTokyo(location, automatic);
            
            console.log(`🏯 After enterTokyo: player.isInTokyo=${player.isInTokyo}, player.tokyoLocation=${player.tokyoLocation}`);
            
            // Award 1 victory point for entering Tokyo (only if not automatic entry)
            if (!automatic) {
                console.log(`🎊 Awarding 1 victory point to ${player.monster.name} for entering Tokyo`);
                player.addVictoryPoints(1);
                this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: 1 });
                this.triggerEvent('statsUpdated', { player: player });
            }
            
            // Trigger animation event
            this.triggerEvent('playerEntersTokyo', {
                playerId: player.id,
                location: location,
                monster: player.monster
            });
            
            // Trigger general Tokyo state change
            this.triggerEvent('tokyoChanged', this.getGameState());
            
            console.log(`🏯 Tokyo events triggered for ${player.monster.name}`);
        } else {
            console.log(`🏯 No Tokyo location available for ${player.monster.name}`);
        }
    }

    // Remove player from Tokyo
    removePlayerFromTokyo(player) {
        if (player.tokyoLocation === 'city') {
            this.tokyoCity = null;
        } else if (player.tokyoLocation === 'bay') {
            this.tokyoBay = null;
        }
        
        const previousLocation = player.tokyoLocation;
        player.leaveTokyo();
        
        this.logAction(`${player.monster.name} leaves Tokyo ${previousLocation === 'city' ? 'City' : 'Bay'}`);
        
        // Trigger animation event
        this.triggerEvent('playerLeavesTokyo', {
            playerId: player.id,
            location: previousLocation,
            monster: player.monster
        });
        
        // Trigger general Tokyo state change
        this.triggerEvent('tokyoChanged', this.getGameState());
    }

    // Handle Tokyo entry at the end of any turn
    handleEndOfTurnTokyoEntry(currentPlayer) {
        // Only handle for non-eliminated players
        if (currentPlayer.isEliminated) {
            return;
        }

        // CRITICAL: Only handle Tokyo entry if dice have been resolved (i.e., a turn was actually completed)
        // AND the player has explicitly ended their turn (not during dice resolution)
        if (!this.diceEffectsResolved) {
            console.log(`🚫 No Tokyo entry - dice effects not resolved yet (no actual turn taken)`);
            return;
        }

        console.log(`🏯 End-of-turn Tokyo entry check for ${currentPlayer.monster.name}:`);
        console.log(`🏯 Tokyo City occupied: ${this.tokyoCity ? 'Yes' : 'No'}`);
        console.log(`🏯 Tokyo Bay occupied: ${this.tokyoBay ? 'Yes' : 'No'}`);
        console.log(`🏯 Player count: ${this.gameSettings.playerCount}`);
        console.log(`🏯 Current player in Tokyo: ${currentPlayer.isInTokyo ? 'Yes' : 'No'}`);

        // RULE: If Tokyo City is empty at end of turn, current player MUST enter it
        if (this.tokyoCity === null && !currentPlayer.isInTokyo) {
            console.log(`🏯 ${currentPlayer.monster.name} MUST enter Tokyo City at end of turn`);
            this.enterTokyo(currentPlayer, true); // Mark as automatic
        } 
        // RULE: If Tokyo Bay is empty (5+ players), current player MUST enter it
        else if (this.tokyoBay === null && this.gameSettings.playerCount >= 5 && this.tokyoCity !== null && !currentPlayer.isInTokyo) {
            console.log(`🏯 ${currentPlayer.monster.name} MUST enter Tokyo Bay at end of turn`);
            this.enterTokyo(currentPlayer, true); // Mark as automatic
        }
    }

    // Apply passive power card effects
    applyPassiveCardEffects(player, diceResults) {
        player.powerCards.forEach(card => {
            const effect = this.applyCardEffectWithAnimation(card, player, this);
            
            switch (effect.type) {
                case 'passive':
                    // Apply passive effects based on dice results
                    if (effect.effect === 'healBonus' && diceResults.heal > 0) {
                        player.addVictoryPoints(diceResults.heal);
                        this.logAction(`${player.monster.name} gains ${diceResults.heal} victory points from healing!`);
                        // Trigger victory points animation for heal bonus
                        this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: diceResults.heal });
                    }
                    
                    // Apply attack bonus points
                    if (effect.effect === 'attackPoints' && diceResults.attack > 0) {
                        player.addVictoryPoints(effect.value);
                        this.logAction(`${player.monster.name} gains ${effect.value} extra victory point(s) from attacking!`);
                        // Trigger victory points animation for attack bonus
                        this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: effect.value });
                    }
                    
                    // Apply even victory points bonus
                    if (effect.effect === 'evenBonus' && effect.value > 0) {
                        player.addVictoryPoints(effect.value);
                        this.logAction(`${player.monster.name} gains ${effect.value} bonus point(s) for having even victory points!`);
                        // Trigger victory points animation for even bonus
                        this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: effect.value });
                    }
                    
                    // Apply energy-based victory points
                    if (effect.effect === 'energyBonus' && effect.value > 0) {
                        player.addVictoryPoints(effect.value);
                        this.logAction(`${player.monster.name} gains ${effect.value} bonus point(s) from stored energy!`);
                        // Trigger victory points animation for energy bonus
                        this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: effect.value });
                    }
                    
                    // Apply energy healing (activated manually)
                    if (effect.effect === 'energyHealing') {
                        // This would be triggered by a button/action, not automatically
                        // For now, we'll note that the ability is available
                        // TODO: Implement manual energy healing activation
                    }
                    break;
            }
        });
    }

    // Refresh card market
    refreshCardMarket() {
        this.availableCards = getRandomCards(3);
    }

    // Add a new card to replace a purchased one
    addNewCardToMarket() {
        // Get all cards that aren't currently in the market
        const availableCardIds = this.availableCards.map(c => c.id);
        const allCards = getAllCards();
        const unusedCards = allCards.filter(card => !availableCardIds.includes(card.id));
        
        if (unusedCards.length > 0) {
            // Pick a random unused card
            const randomIndex = Math.floor(Math.random() * unusedCards.length);
            const newCard = unusedCards[randomIndex];
            this.availableCards.push(newCard);
        }
    }

    // Calculate the actual cost of a card including discounts
    calculateCardCost(playerId, cardId) {
        const player = this.players.find(p => p.id === playerId);
        const card = this.availableCards.find(c => c.id === cardId);
        
        if (!player || !card) return 0;
        
        let cost = card.cost;
        
        // Apply card cost reductions
        player.powerCards.forEach(powerCard => {
            const effect = applyCardEffect(powerCard, player, this);
            if (effect.type === 'passive' && effect.effect === 'cardDiscount') {
                cost = Math.max(1, cost - effect.value);
            }
        });
        
        return cost;
    }

    // Get valid targets for targeted cards
    getValidTargets(playerId, card) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];
        
        switch (card.effect) {
            case 'shrink':
                // Can target any other living player
                return this.players
                    .filter(p => p.id !== playerId && !p.isEliminated)
                    .map(p => ({
                        id: p.id,
                        name: p.monster.name,
                        health: p.health,
                        maxHealth: p.maxHealth
                    }));
            default:
                return [];
        }
    }

    // Buy a power card
    buyCard(playerId, cardId, targetId = null) {
        console.log(`🛒 buyCard called: playerId=${playerId}, cardId=${cardId}, targetId=${targetId}`);
        const player = this.players.find(p => p.id === playerId);
        const card = this.availableCards.find(c => c.id === cardId);
        
        console.log(`🛒 Player found:`, player ? player.monster.name : 'null');
        console.log(`🛒 Card found:`, card ? card.name : 'null');
        
        if (!player || !card) {
            console.log(`🛒 Purchase failed: missing player or card`);
            return false;
        }
        
        // Check if card requires a target
        if (card.effect === 'shrink' && !targetId) {
            console.log(`🛒 Card requires target selection`);
            // Return special response indicating target selection needed
            return { needsTarget: true, card: card, availableTargets: this.getValidTargets(playerId, card) };
        }
        
        const cost = this.calculateCardCost(playerId, cardId);
        console.log(`🛒 Card cost: ${cost}, Player energy: ${player.energy}`);

        if (player.spendEnergy(cost)) {
            console.log(`🛒 Energy spent successfully, adding card to player`);
            player.powerCards.push(card);
            this.availableCards = this.availableCards.filter(c => c.id !== cardId);
            this.logAction(`${player.monster.name} buys ${card.name} for ${cost} energy!`, 'power-card');
            console.log(`🛒 Card purchased successfully: ${card.name}`);
            
            // Apply immediate card effects
            if (card.type === 'discard') {
                console.log(`🛒 Applying discard card effect`);
                applyCardEffect(card, player, this, targetId);
                // Remove from player's cards since it's a discard card
                player.powerCards = player.powerCards.filter(c => c.id !== cardId);
                this.logDetailedAction(`${player.monster.name} activates discard card: ${card.name}`, 'power-card-effect');
            }
            
            // Add a new card to replace the purchased one
            this.addNewCardToMarket();
            
            // Trigger events to update UI
            this.triggerEvent('cardPurchased', { player: player, card: card });
            this.triggerEvent('statsUpdated', { player: player });
            
            return { success: true };
        }
        
        return { success: false, reason: 'Not enough energy' };
    }

    // Allow player to spend energy for healing (Rapid Healing card)
    spendEnergyToHeal(playerId, energyCost = 2, healAmount = 1) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;
        
        // Check if player has energy healing power
        const hasEnergyHealing = player.powerCards.some(card => {
            const effect = applyCardEffect(card, player, this);
            return effect.type === 'passive' && effect.effect === 'energyHealing';
        });
        
        if (!hasEnergyHealing) {
            this.logAction(`${player.monster.name} doesn't have the power to heal with energy!`);
            return false;
        }
        
        if (player.energy < energyCost) {
            this.logAction(`${player.monster.name} doesn't have enough energy to heal!`);
            return false;
        }
        
        if (player.isInTokyo) {
            this.logAction(`${player.monster.name} cannot heal while in Tokyo!`);
            return false;
        }
        
        if (player.spendEnergy(energyCost)) {
            const healed = player.heal(healAmount);
            if (healed > 0) {
                this.logAction(`${player.monster.name} spends ${energyCost} energy to heal ${healAmount} health!`);
                // Trigger healing animation for energy healing
                this.triggerEvent('playerHealed', { playerId: player.id, healAmount: healed });
                return true;
            }
        }
        
        return false;
    }

    // End current turn
    endTurn() {
        // Add stack trace to debug what's calling endTurn
        console.log('endTurn called!');
        console.trace('Stack trace for endTurn call:');
        
        // Prevent double execution
        if (this.endingTurn) {
            console.log('endTurn already in progress, ignoring duplicate call');
            return;
        }
        
        this.endingTurn = true;
        
        const currentPlayer = this.getCurrentPlayer();
        
        console.log('endTurn called - current phase:', this.currentTurnPhase);
        console.log('Dice effects resolved:', this.diceEffectsResolved);
        console.log('Pending decisions:', this.pendingDecisions.length);
        console.log('Current player before ending turn:', currentPlayer.monster.name, 'Index:', this.currentPlayerIndex);
        console.log('🐛 ENDTURN DEBUG:', {
            players: this.players.length,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerName: currentPlayer.monster.name,
            currentPlayerEliminated: currentPlayer.isEliminated,
            endingTurnFlag: this.endingTurn,
            gamePhase: this.gamePhase,
            turnPhase: this.currentTurnPhase
        });
        
        // Extra debugging for 6-player games - check all player statuses
        if (this.players.length === 6) {
            console.log('🐛 6-PLAYER ELIMINATION DEBUG:');
            this.players.forEach((player, index) => {
                console.log(`🐛 Player ${index}: ${player.monster.name} - Health: ${player.health}/${player.maxHealth} - Eliminated: ${player.isEliminated}`);
            });
        }
        
        try {
            // Check if there are pending decisions that need to be resolved first
            if (this.pendingDecisions.length > 0) {
                console.log('Cannot end turn - there are pending decisions:', this.pendingDecisions);
                this.showMessage('Please resolve all pending decisions before ending turn.');
                return;
            }

            // Check victory conditions
            if (this.checkVictoryConditions()) {
                return;
            }

            console.log('Ending turn for:', currentPlayer.monster.name);

            // Log turn summary before ending
            this.logTurnSummary(currentPlayer);

            // Disable any extra dice that were enabled for the current player
            this.disablePlayerExtraDice(currentPlayer);

            // Move to next player FIRST, before any Tokyo handling
            this.switchToNextPlayer();
            
            // Clear dice results and reset dice count to base amount for next turn
            this.diceCollection.resetToBaseDiceCount(this.gameSettings.diceCount);
            this.diceRoller.startNewTurn();
            this.currentTurnPhase = 'rolling';

            // Trigger turn ended event to update UI with new active player
            this.triggerEvent('turnEnded', this.getGameState());

            // RULE: Handle mandatory Tokyo entry at end of any turn - AFTER new player is active
            this.handleEndOfTurnTokyoEntry(currentPlayer);
            
            console.log('Turn ended. New current player:', this.getCurrentPlayer().monster.name, 'Index:', this.currentPlayerIndex);
        } finally {
            // Always reset the flag
            this.endingTurn = false;
        }
    }

    // Apply start of turn effects (including Tokyo bonuses)
    // These are effects that happen at the very start of a turn (like Tokyo bonus points, extra dice, extra rolls)
    // Power card effects that trigger "once per turn" are handled in applyTurnBasedEffects() after dice resolution
    applyStartOfTurnEffects() {
        const currentPlayer = this.getCurrentPlayer();
        
        // Track start-of-turn values for summary logging
        currentPlayer.startOfTurnVictoryPoints = currentPlayer.victoryPoints;
        currentPlayer.startOfTurnEnergy = currentPlayer.energy;
        currentPlayer.startOfTurnHealth = currentPlayer.health;
        
        console.log(`🎯 Applying start of turn effects for ${currentPlayer.monster.name}`);
        console.log(`🏙️ Player is in Tokyo: ${currentPlayer.isInTokyo}`);
        console.log(`🎮 Current Round: ${this.round}`);
        console.log(`👥 Current Player Index: ${this.currentPlayerIndex}`);
        console.log(`⭐ Player's current victory points: ${currentPlayer.victoryPoints}`);
        
        // Apply start-of-turn effects for Tokyo occupants
        if (currentPlayer.isInTokyo) {
            console.log(`🎊 Awarding 2 Tokyo points to ${currentPlayer.monster.name} at start of Round ${this.round}`);
            currentPlayer.addVictoryPoints(2);
            this.logDetailedAction(`${currentPlayer.monster.name} gains 2 victory points for starting turn in Tokyo!`, 'victory-points');
            // Trigger victory points animation for Tokyo bonus
            this.triggerEvent('playerGainedPoints', { playerId: currentPlayer.id, pointsGained: 2 });
            // Trigger UI update to show new victory points immediately
            this.triggerEvent('statsUpdated', { player: currentPlayer });
            console.log(`⭐ Player's victory points after Tokyo bonus: ${currentPlayer.victoryPoints}`);
        } else {
            console.log(`❌ ${currentPlayer.monster.name} is NOT in Tokyo, no points awarded`);
        }

        // Apply bonus rolls from power cards at start of turn
        let bonusRolls = 0;
        let extraDice = 0;
        
        // Reset total rolls for this turn to base amount
        this.currentTurnTotalRolls = 3;
        
        currentPlayer.powerCards.forEach(card => {
            const effect = applyCardEffect(card, currentPlayer, this);
            if (effect.type === 'passive') {
                if (effect.effect === 'bonusRolls') {
                    bonusRolls += effect.value;
                }
                if (effect.effect === 'extraDice') {
                    extraDice += effect.value;
                }
            }
        });
        
        // Add bonus rolls to dice roller
        if (bonusRolls > 0) {
            this.diceRoller.rollsRemaining += bonusRolls;
            this.currentTurnTotalRolls += bonusRolls;
            this.logAction(`${currentPlayer.monster.name} gets ${bonusRolls} extra reroll(s) from power cards!`, 'power-card');
        }
        
        // Enable extra dice for this player's turn
        if (extraDice > 0) {
            let enabledCount = 0;
            for (let i = 0; i < extraDice; i++) {
                const dieIndex = this.diceCollection.maxDice + i; // Start from first disabled die
                if (this.diceCollection.enableExtraDie(dieIndex)) {
                    enabledCount++;
                    this.logAction(`${currentPlayer.monster.name} gets an extra die from power cards!`, 'power-card');
                } else {
                    this.logAction(`${currentPlayer.monster.name} is already at maximum dice limit!`, 'power-card');
                    break;
                }
            }
            
            // Store how many extra dice this player enabled for cleanup later
            currentPlayer.extraDiceEnabled = enabledCount;
            
            // Trigger dice update to refresh UI with the extra dice
            if (enabledCount > 0) {
                this.triggerEvent('diceUpdated', this.diceCollection.getAllDiceData());
            }
        } else {
            currentPlayer.extraDiceEnabled = 0;
        }

        // Note: applyTurnBasedEffects() is now called after dice resolution, 
        // not at start of turn, to ensure immediate effect application
    }

    // Apply turn-based power card effects
    // These are effects that trigger once per turn after dice resolution (like "gain 1 energy per turn")
    // NOT effects that trigger at start of turn (those should be in applyStartOfTurnEffects)
    applyTurnBasedEffects(player) {
        player.powerCards.forEach(card => {
            const effect = this.applyCardEffectWithAnimation(card, player, this);
            
            if (effect.effect === 'turnPoints') {
                // Check if this effect has already been applied this turn
                const effectKey = `${card.name}-turnPoints`;
                if (!this.hasTurnEffectBeenApplied(player.id, effectKey)) {
                    player.addVictoryPoints(effect.value);
                    this.logAction(`${player.monster.name} gains ${effect.value} victory point from ${card.name}!`, 'power-card');
                    // Trigger victory points animation for card bonus
                    this.triggerEvent('playerGainedPoints', { playerId: player.id, pointsGained: effect.value });
                    // Mark this effect as applied
                    this.markTurnEffectApplied(player.id, effectKey);
                }
            } else if (effect.effect === 'turnHealing') {
                // Check if this effect has already been applied this turn
                const effectKey = `${card.name}-turnHealing`;
                if (!this.hasTurnEffectBeenApplied(player.id, effectKey) && !player.isInTokyo) {
                    const healed = player.heal(effect.value);
                    if (healed > 0) {
                        this.logAction(`${player.monster.name} heals ${effect.value} from ${card.name}!`, 'power-card');
                        // Trigger healing animation for card healing
                        this.triggerEvent('playerHealed', { playerId: player.id, healAmount: healed });
                    }
                    // Mark this effect as applied
                    this.markTurnEffectApplied(player.id, effectKey);
                }
            } else if (effect.effect === 'turnEnergy') {
                // Check if this effect has already been applied this turn
                const effectKey = `${card.name}-turnEnergy`;
                if (!this.hasTurnEffectBeenApplied(player.id, effectKey)) {
                    player.addEnergy(effect.value);
                    this.logAction(`${player.monster.name} gains ${effect.value} energy from ${card.name}!`, 'power-card');
                    // Mark this effect as applied
                    this.markTurnEffectApplied(player.id, effectKey);
                }
            }
        });
    }

    // Move to next player without applying start-of-turn effects
    switchToNextPlayer() {
        // Prevent concurrent execution of this method
        if (this.switchingPlayers) {
            console.log('🚫 switchToNextPlayer() already in progress, ignoring duplicate call');
            return;
        }
        
        this.switchingPlayers = true;
        
        try {
            let attempts = 0;
            const maxAttempts = this.players.length;
            
            // Enhanced debugging for turn order issues
            console.log(`🐛 TURN ORDER DEBUG: Starting switchToNextPlayer()`);
            console.log(`🐛 Before switch - currentPlayerIndex: ${this.currentPlayerIndex}`);
            console.log(`🐛 Before switch - current player: ${this.getCurrentPlayer().monster.name}`);
            console.log(`🐛 Before switch - Tokyo status:`, this.players.map(p => `${p.monster.name}:${p.isInTokyo ? 'Tokyo' : 'Outside'}`));
            
            do {
                const previousPlayerIndex = this.currentPlayerIndex;
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                attempts++;
                
                console.log(`🔄 Switching from player ${previousPlayerIndex} to ${this.currentPlayerIndex} (attempt ${attempts})`);
                console.log(`🔄 Current player: ${this.getCurrentPlayer().monster.name}, eliminated: ${this.getCurrentPlayer().isEliminated}`);
                
                // Safety check to prevent infinite loop
                if (attempts >= maxAttempts) {
                    console.log(`🔄 Completed full cycle, checking alive players`);
                    const alivePlayers = this.players.filter(p => !p.isEliminated);
                    if (alivePlayers.length <= 1) {
                        console.log(`🔄 Only ${alivePlayers.length} alive players left, game should end`);
                        // Let the game continue to trigger win condition check
                        break;
                    }
                }
                
                // If we've gone full circle, increment round
                if (this.currentPlayerIndex === 0) {
                    const previousRound = this.round;
                    this.round++;
                    console.log(`🔄 Round transition: ${previousRound} → ${this.round} (Player index: ${previousPlayerIndex} → ${this.currentPlayerIndex})`);
                    
                    // Only start new round in log if gameplay has begun
                    if (this.gameplayStarted) {
                        this.startNewRound();
                    }
                }
            } while (this.getCurrentPlayer().isEliminated && attempts < maxAttempts);

            // Extra debugging for 6-player games
            if (this.players.length === 6) {
                console.log('🐛 6-PLAYER SWITCH DEBUG: Final result');
                console.log(`🐛 Final current player: ${this.getCurrentPlayer().monster.name} (index ${this.currentPlayerIndex})`);
                console.log(`🐛 Is current player eliminated: ${this.getCurrentPlayer().isEliminated}`);
                console.log(`🐛 Attempts used: ${attempts}/${maxAttempts}`);
            }

            // Enhanced debugging for ALL games
            console.log(`🐛 TURN ORDER DEBUG: Final switchToNextPlayer() result`);
            console.log(`🐛 After switch - currentPlayerIndex: ${this.currentPlayerIndex}`);
            console.log(`🐛 After switch - current player: ${this.getCurrentPlayer().monster.name}`);
            console.log(`🐛 After switch - Tokyo status:`, this.players.map(p => `${p.monster.name}:${p.isInTokyo ? 'Tokyo' : 'Outside'}`));
            console.log(`🐛 After switch - is new current player in Tokyo: ${this.getCurrentPlayer().isInTokyo}`);

            // Only start player turn in log if gameplay has begun
            if (this.gameplayStarted) {
                this.startPlayerTurnInLog(this.getCurrentPlayer());
            }
            
            // Reset dice effects resolved flag for the new turn
            this.diceEffectsResolved = false;
            
            // Clear turn-based effects tracking for the new turn
            this.clearTurnEffects();
            
            // Apply start-of-turn effects for the NEW current player BEFORE UI updates
            this.applyStartOfTurnEffects();
            
            // Trigger turn started event for UI (now with all effects already applied)
            this.triggerEvent('turnStarted', { currentPlayer: this.getCurrentPlayer() });
        } finally {
            // Always reset the flag, even if an error occurs
            this.switchingPlayers = false;
        }
    }

    // Move to next player (legacy method - applies start-of-turn effects immediately)
    nextPlayer() {
        this.switchToNextPlayer();
        this.applyStartOfTurnEffects();
    }

    // Check victory conditions
    checkVictoryConditions() {
        // Check for victory points win
        const pointWinner = this.players.find(p => p.hasWon());
        if (pointWinner) {
            this.endGame(pointWinner, 'victory_points');
            return true;
        }

        // Check for last monster standing
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        if (alivePlayers.length === 1) {
            this.endGame(alivePlayers[0], 'last_standing');
            return true;
        }

        return false;
    }

    // End game
    endGame(winner, winCondition) {
        // If game ends before any dice were rolled, start gameplay logging now
        if (!this.gameplayStarted) {
            this.gameplayStarted = true;
            this.startNewRound(); // Start Round 1
            this.startPlayerTurnInLog(this.getCurrentPlayer()); // Start current player's turn
        }
        
        this.gamePhase = 'ended';
        this.winner = winner;
        this.winCondition = winCondition;
        
        let winMessage = '';
        if (winCondition === 'victory_points') {
            winMessage = `${winner.monster.name} wins with ${winner.victoryPoints} victory points!`;
        } else {
            winMessage = `${winner.monster.name} wins by being the last monster standing!`;
        }
        
        this.logAction(winMessage);
        this.triggerEvent('gameEnded', { winner, winCondition, message: winMessage });
    }

    // Get winner
    getWinner() {
        if (this.gamePhase === 'ended') {
            return {
                player: this.winner,
                condition: this.winCondition
            };
        }
        return null;
    }

    // Log game action
    logAction(message) {
        // Check if this should start gameplay logging (exclude initial setup messages)
        const setupMessages = [
            'Game started with',
            'goes first!'
        ];
        const isSetupMessage = setupMessages.some(setupMsg => message.includes(setupMsg));
        
        if (!isSetupMessage && !this.gameplayStarted) {
            this.gameplayStarted = true;
            console.log(`🎯 Starting gameplay logging triggered by logAction: "${message}"`);
            this.startNewRound(); // Start Round 1
            this.startPlayerTurnInLog(this.getCurrentPlayer()); // Start current player's turn
        }
        
        this.gameLog.push({
            timestamp: Date.now(),
            message: message,
            round: this.round,
            turn: this.currentPlayerIndex + 1
        });
        
        // Also add to detailed log for UI
        this.logDetailedAction(message);
    }

    // Simple logging method (wrapper for logDetailedAction)
    logAction(message, category = 'general', playerName = null, area = null) {
        this.logDetailedAction(message, category, playerName, area);
    }

    // Enhanced logging for detailed play log
    logDetailedAction(message, category = 'general', playerName = null, area = null) {
        const timestamp = new Date().toLocaleTimeString();
        const currentPlayer = this.getCurrentPlayer();
        const actualPlayerName = playerName || (currentPlayer ? currentPlayer.monster.name : 'System');
        
        // Check if this is a gameplay action (not setup) and start rounds if needed
        const setupCategories = [
            'setup', 
            'player-count-change', 
            'monster-selection', 
            'monster-deselection', 
            'game-start', 
            'ready-to-start',
            'roll-off'  // Add roll-off as a setup category
        ];
        const isGameplayAction = !setupCategories.includes(category);
        
        if (isGameplayAction && !this.gameplayStarted) {
            this.gameplayStarted = true;
            console.log(`🎯 Starting gameplay logging triggered by action: "${message}" (category: ${category})`);
            this.startNewRound(); // Start Round 1
            this.startPlayerTurnInLog(this.getCurrentPlayer()); // Start current player's turn
        }
        
        // Add to legacy detailed log for backward compatibility
        const entry = {
            id: Date.now() + Math.random(), // Unique ID
            timestamp,
            message,
            category,
            playerName: actualPlayerName,
            area: area || this.getCurrentGameArea(),
            round: this.round,
            turnPhase: this.currentTurnPhase
        };
        
        this.detailedLog.push(entry);
        
        // Add to new tree structure with emoji mapping
        const emoji = this.getCategoryEmoji(category);
        this.gameLogTree.addAction(message, category, emoji, area);
        
        // Trigger event for UI update (include tree data)
        this.triggerEvent('logUpdated', { 
            entry, 
            allLogs: this.detailedLog,
            logTree: this.gameLogTree.getTree()
        });
        
        // Trigger CPU action notification if this is a CPU player action
        if (currentPlayer && currentPlayer.playerType === 'cpu' && isGameplayAction) {
            // Only show notifications for significant actions (not setup or debug)
            const notifiableCategories = [
                'dice-roll', 'energy', 'healing', 'victory-points', 'attack', 'tokyo', 
                'card-purchase', 'elimination', 'general'
            ];
            
            if (notifiableCategories.includes(category)) {
                this.triggerEvent('cpuNotification', {
                    message: message,
                    player: currentPlayer,
                    category: category,
                    action: 'game-action'
                });
            }
        }
        
        // Keep only last 200 detailed entries
        if (this.detailedLog.length > 200) {
            this.detailedLog.shift();
        }
    }

    // Get current game area/screen
    getCurrentGameArea() {
        if (this.gamePhase === 'setup') return 'setup';
        if (this.gamePhase === 'ended') return 'victory';
        if (this.currentTurnPhase === 'rolling') return 'dice';
        if (this.currentTurnPhase === 'buying') return 'cards';
        return 'game';
    }

    // Map categories to emojis
    getCategoryEmoji(category) {
        const emojiMap = {
            'dice-roll': '🎲',
            'dice-roll-result': '🎯',
            'dice-result': '🎯',
            'dice-faces': '🎲',
            'dice-faces-detail': '📋',
            'attack': '⚔️',
            'attack-detail': '⚔️',
            'damage': '💥',
            'damage-detail': '🩹',
            'energy-gain': '⚡',
            'energy': '⚡',
            'health-change': '❤️',
            'heal': '❤️',
            'healing': '❤️',
            'victory-points': '⭐',
            'power-card': '🃏',
            'power-card-detail': '💳',
            'power-card-effect': '✨',
            'card-purchase': '🃏',
            'tokyo-enter': '🏙️',
            'tokyo-leave': '🏃',
            'turn-start': '🔄',
            'turn-end': '✅',
            'turn-summary': '📊',
            'round-start': '🆕',
            'setup': '⚙️',
            'player-count-change': '👥',
            'monster-selection': '👺',
            'monster-deselection': '❌',
            'game-start': '🎯',
            'ready-to-start': '🎲',
            'system': 'ℹ️',
            'tokyo': '🏙️',
            'general': '📝',
            'attack-empty': '🤷‍♂️'
        };
        return emojiMap[category] || '📝';
    }

    // Start a new round in the log tree
    startNewRound() {
        const existingRound = this.gameLogTree.rounds.find(round => round.roundNumber === this.round);
        const isNewRound = !existingRound;
        
        this.gameLogTree.startRound(this.round);
        
        // Only log "Round begins" message if this is actually a new round
        if (isNewRound) {
            // Removed round begins message to reduce log clutter
            // this.logDetailedAction(`Round ${this.round} begins!`, 'round-start', 'System');
        }
    }

    // Start a new player turn in the log tree
    startPlayerTurnInLog(player) {
        this.gameLogTree.startPlayerTurn(player.monster.name, player.monster);
        this.logDetailedAction(`${player.monster.name}'s turn begins`, 'turn-start', player.monster.name);
    }

    // Log comprehensive turn summary
    logTurnSummary(player) {
        const summary = [];
        const startVP = player.startOfTurnVictoryPoints || player.victoryPoints;
        const startEnergy = player.startOfTurnEnergy || player.energy;
        const startHealth = player.startOfTurnHealth || player.health;
        
        // Calculate gains during turn
        const vpGained = player.victoryPoints - startVP;
        const energyGained = player.energy - startEnergy;
        const healthChange = player.health - startHealth;
        
        // Victory points summary
        if (vpGained > 0) {
            summary.push(`+${vpGained} VP`);
        }
        
        // Energy summary
        if (energyGained > 0) {
            summary.push(`+${energyGained} energy`);
        } else if (energyGained < 0) {
            summary.push(`${energyGained} energy`);
        }
        
        // Health summary
        if (healthChange > 0) {
            summary.push(`+${healthChange} health`);
        } else if (healthChange < 0) {
            summary.push(`${healthChange} health`);
        }
        
        // Current status
        const status = [];
        status.push(`${player.victoryPoints} VP total`);
        status.push(`${player.energy} energy`);
        status.push(`${player.health}/${player.maxHealth} health`);
        if (player.isInTokyo) {
            status.push(`in Tokyo ${player.tokyoLocation}`);
        }
        
        const summaryText = summary.length > 0 
            ? `Turn Summary: ${player.monster.name} gained ${summary.join(', ')}. Status: ${status.join(', ')}`
            : `Turn Summary: ${player.monster.name} - no gains this turn. Status: ${status.join(', ')}`;
            
        this.logDetailedAction(summaryText, 'turn-summary', player.monster.name);
        
        // Reset start-of-turn tracking for next turn
        player.startOfTurnVictoryPoints = player.victoryPoints;
        player.startOfTurnEnergy = player.energy;
        player.startOfTurnHealth = player.health;
    }

    // Log setup phase events (before game starts)
    logSetupAction(message, category = 'setup', area = 'setup') {
        // For setup phase, we don't have rounds/turns yet, so create a special setup "round"
        if (!this.gameLogTree.currentRound || this.gameLogTree.currentRound.id !== 'game-setup') {
            // Check if setup round already exists
            let existingSetupRound = this.gameLogTree.rounds.find(r => r.id === 'game-setup');
            
            if (existingSetupRound) {
                // Use existing setup round
                this.gameLogTree.currentRound = existingSetupRound;
            } else {
                // Create new setup round
                this.gameLogTree.currentRound = {
                    id: 'game-setup',
                    roundNumber: 'Setup', // Use "Setup" instead of 0
                    timestamp: new Date(),
                    playerTurns: [],
                    expanded: true
                };
                
                // Insert at the beginning
                this.gameLogTree.rounds.unshift(this.gameLogTree.currentRound);
            }
        }

        // Create/use setup turn
        if (!this.gameLogTree.currentPlayerTurn || this.gameLogTree.currentPlayerTurn.id !== 'setup-turn') {
            // Check if setup turn already exists in current round
            let existingSetupTurn = this.gameLogTree.currentRound.playerTurns.find(t => t.id === 'setup-turn');
            
            if (existingSetupTurn) {
                // Use existing setup turn
                this.gameLogTree.currentPlayerTurn = existingSetupTurn;
            } else {
                // Create new setup turn
                this.gameLogTree.currentPlayerTurn = {
                    id: 'setup-turn',
                    playerName: 'Monster Selection',
                    playerMonster: null,
                    timestamp: new Date(),
                    actions: [],
                    expanded: true // Setup actions start expanded
                };
                this.gameLogTree.currentRound.playerTurns.push(this.gameLogTree.currentPlayerTurn);
            }
        }

        // For setup actions, don't add emoji if message already contains one
        let emoji = null;
        if (!/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message)) {
            emoji = this.getCategoryEmoji(category);
        }
        
        this.gameLogTree.addAction(message, category, emoji, area);
        
        // Also add to legacy log
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            message,
            category,
            playerName: 'Game Setup',
            area,
            round: 'Setup', // Use "Setup" instead of 0
            turnPhase: 'setup'
        };
        
        this.detailedLog.push(entry);
        
        // Trigger UI update
        this.triggerEvent('logUpdated', { 
            entry, 
            allLogs: this.detailedLog,
            logTree: this.gameLogTree.getTree()
        });
    }

    // Event system for UI updates
    triggerEvent(eventType, data) {
        // This will be connected to the UI system
        if (this.eventCallback) {
            this.eventCallback(eventType, data);
        }
    }

    // Set event callback
    setEventCallback(callback) {
        this.eventCallback = callback;
    }

    // Start first roll of turn
    async startRoll() {
        if (this.currentTurnPhase === 'rolling' && this.diceRoller.rollsRemaining === 3) {
            // First roll of the turn
            console.log(`🎲 ${this.getCurrentPlayer().monster.name} is making their first dice roll`);
            return await this.diceRoller.firstRoll();
        } else if (this.currentTurnPhase === 'rolling' && this.diceRoller.canRoll()) {
            // Subsequent rolls
            const rollNumber = 4 - this.diceRoller.rollsRemaining;
            console.log(`🎲 ${this.getCurrentPlayer().monster.name} is making roll #${rollNumber}`);
            return await this.diceRoller.rollDice();
        }
        return false;
    }

    // Keep dice and end rolling phase
    keepDiceAndResolve() {
        if (this.currentTurnPhase === 'rolling') {
            const rollsRemaining = this.diceRoller.rollsRemaining;
            const playerName = this.getCurrentPlayer().monster.name;
            
            // Log that player is keeping dice and skipping remaining rolls
            if (rollsRemaining > 0) {
                const rollText = rollsRemaining === 1 ? 'roll' : 'rolls';
                this.logAction(`${playerName} keeps the current dice and will skip their remaining ${rollsRemaining} ${rollText}`);
            }
            
            const results = this.diceCollection.getResults();
            this.currentTurnPhase = 'resolving';
            this.resolveDiceEffects(results, true); // Skip dice log since we're keeping, not rolling
            return true;
        }
        return false;
    }

    // Storage and logging methods with persistence
    
    // Log a game action with persistent storage and memory management
    async logActionWithStorage(action, category = 'game', playerId = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            action,
            category,
            playerId,
            round: this.round,
            phase: this.gamePhase
        };

        // Add to log tree (existing UI functionality)
        const emoji = this.getCategoryEmoji(category);
        const area = this.getCurrentGameArea();
        this.gameLogTree.addAction(action, category, emoji, area);

        // Save to persistent storage if available
        if (this.storageManager) {
            try {
                await this.storageManager.saveLogEntry(this.gameId, logEntry);
                this.logChunkSize++;

                // Check if we need to chunk the logs
                if (this.logChunkSize >= this.maxMemoryEntries) {
                    await this.chunkAndCompressLogs();
                }
            } catch (error) {
                console.warn('Failed to save log entry to storage:', error);
            }
        }

        // Trigger UI update
        this.triggerEvent('logUpdated', { logTree: this.gameLogTree });
    }

    // Log a setup action with persistence
    async logSetupActionWithStorage(action, category = 'setup') {
        // Use the existing logSetupAction for UI
        this.logSetupAction(action, category);
        
        // Also save to persistent storage
        if (this.storageManager) {
            const logEntry = {
                id: `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                action,
                category,
                playerId: null,
                round: 'Setup',
                phase: 'setup'
            };

            try {
                await this.storageManager.saveLogEntry(this.gameId, logEntry);
            } catch (error) {
                console.warn('Failed to save setup log entry to storage:', error);
            }
        }
    }

    // Chunk and compress logs to manage memory
    async chunkAndCompressLogs() {
        if (!this.storageManager) return;

        try {
            const currentLogs = this.gameLogTree.getAllEntries();
            await this.storageManager.saveLogChunk(this.gameId, currentLogs);
            
            // Clear old entries from memory, keep only recent ones
            const recentEntries = currentLogs.slice(-this.maxMemoryEntries);
            this.gameLogTree.clearAndReload(recentEntries);
            this.logChunkSize = recentEntries.length;

            console.log(`📦 Chunked logs - saved ${currentLogs.length} entries, kept ${recentEntries.length} in memory`);
        } catch (error) {
            console.error('Failed to chunk logs:', error);
        }
    }

    // Save current game state
    async saveGameState() {
        if (!this.storageManager) return;

        console.log(`🐛 SAVE DEBUG: Saving game state with currentPlayerIndex: ${this.currentPlayerIndex}`);
        console.log(`🐛 SAVE DEBUG: Current player: ${this.getCurrentPlayer().monster.name}`);

        const gameState = {
            gameId: this.gameId,
            timestamp: new Date().toISOString(),
            round: this.round,
            currentPlayerIndex: this.currentPlayerIndex,
            gamePhase: this.gamePhase,
            players: this.players.map(player => ({
                id: player.id,
                monster: player.monster,
                health: player.health,
                energy: player.energy,
                victoryPoints: player.victoryPoints,
                isInTokyo: player.isInTokyo,
                tokyoLocation: player.tokyoLocation,
                cards: player.cards
            })),
            tokyoCity: this.tokyoCity,
            tokyoBay: this.tokyoBay,
            cardMarket: this.cardMarket,
            gameSettings: this.gameSettings
        };

        try {
            await this.storageManager.saveGameState(this.gameId, gameState);
            console.log(`💾 Game state saved for game ${this.gameId}`);
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    // Load game state from storage
    async loadGameState(gameId) {
        if (!this.storageManager) return null;

        try {
            const gameState = await this.storageManager.loadGameState(gameId);
            if (gameState) {
                console.log(`🐛 LOAD DEBUG: Loading game state with currentPlayerIndex: ${gameState.currentPlayerIndex}`);
                
                // Restore game state
                this.gameId = gameState.gameId;
                this.round = gameState.round;
                this.currentPlayerIndex = gameState.currentPlayerIndex;
                this.gamePhase = gameState.gamePhase;
                
                console.log(`🐛 LOAD DEBUG: After loading - currentPlayerIndex set to: ${this.currentPlayerIndex}`);
                this.tokyoCity = gameState.tokyoCity;
                this.tokyoBay = gameState.tokyoBay;
                this.cardMarket = gameState.cardMarket;
                this.gameSettings = gameState.gameSettings;

                // Restore players
                this.players = gameState.players.map(playerData => {
                    const player = new Player(playerData.monster, playerData.id, playerData.playerType || 'human');
                    player.health = playerData.health;
                    player.energy = playerData.energy;
                    player.victoryPoints = playerData.victoryPoints;
                    player.isInTokyo = playerData.isInTokyo;
                    player.tokyoLocation = playerData.tokyoLocation;
                    player.cards = playerData.cards;
                    return player;
                });

                // Load logs
                const logs = await this.storageManager.loadGameLogs(gameId);
                if (logs && logs.length > 0) {
                    this.gameLogTree.clearAndReload(logs.slice(-this.maxMemoryEntries));
                    this.logChunkSize = this.gameLogTree.getAllEntries().length;
                }

                console.log(`🔄 Game state loaded for game ${gameId}`);
                return gameState;
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
        
        return null;
    }

    // Get storage statistics
    async getStorageStats() {
        if (!this.storageManager) return null;
        return await this.storageManager.getStorageStats();
    }

    // Clear storage for cleanup
    async clearGameStorage(gameId = null) {
        if (!this.storageManager) return;
        
        try {
            if (gameId) {
                await this.storageManager.deleteGameSession(gameId);
                console.log(`🗑️ Cleared storage for game ${gameId}`);
            } else {
                await this.storageManager.clearAllData();
                console.log('🗑️ Cleared all game storage');
            }
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }

    // Helper method to apply card effect with animation
    applyCardEffectWithAnimation(card, player, game, targetId = null) {
        const effect = applyCardEffect(card, player, game, targetId);
        
        return effect;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KingOfTokyoGame };
} else {
    window.KingOfTokyoGame = KingOfTokyoGame;
}
