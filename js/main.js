// Main UI controller for King of Tokyo

// Initialize splash screen
document.addEventListener('DOMContentLoaded', function() {
    const splashScreen = document.getElementById('splash-screen');
    const gameContainer = document.getElementById('game-container');
    const enterBattleBtn = document.getElementById('enter-battle-btn');
    
    enterBattleBtn.addEventListener('click', function() {
        window.UI && window.UI._debug && window.UI._debug('Splash screen subtitle clicked!');
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            gameContainer.classList.add('show');
            
            // Wait for required objects with timeout and fallback
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const waitForGameAssets = () => {
                attempts++;
                window.UI && window.UI._debug && window.UI._debug(`🔍 Checking for required game assets (attempt ${attempts}/${maxAttempts})...`);
                
                const monstersAvailable = typeof MONSTERS !== 'undefined';
                const cardsAvailable = typeof POWER_CARDS !== 'undefined'; // Fixed: should be POWER_CARDS not CARDS
                const gameAvailable = typeof KingOfTokyoGame !== 'undefined'; // Fixed: should be KingOfTokyoGame not Game
                
                window.UI && window.UI._debug && window.UI._debug('🔍 Asset status:', {
                    MONSTERS: monstersAvailable,
                    POWER_CARDS: cardsAvailable,
                    KingOfTokyoGame: gameAvailable
                });
                
                // Check what globals are actually available
                const gameGlobals = Object.keys(window).filter(key => 
                    key === 'MONSTERS' || key === 'POWER_CARDS' || key === 'KingOfTokyoGame' || 
                    key.startsWith('King') || key.startsWith('Player') || key.startsWith('CARD')
                );
                window.UI && window.UI._debug && window.UI._debug('🔍 Available game-related globals:', gameGlobals);
                
                if (monstersAvailable && cardsAvailable && gameAvailable) {
                    window.UI && window.UI._debug && window.UI._debug('✅ All game assets loaded, initializing UI...');
                    window.gameUI = new KingOfTokyoUI();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout waiting for game assets. Trying to initialize with available assets...');
                    console.error('❌ Missing:', {
                        MONSTERS: !monstersAvailable,
                        POWER_CARDS: !cardsAvailable,
                        KingOfTokyoGame: !gameAvailable
                    });
                    
                    // Try to initialize anyway - maybe only MONSTERS is needed for the monster selection
                    if (monstersAvailable) {
                        window.UI && window.UI._debug && window.UI._debug('🔧 MONSTERS is available, attempting partial initialization...');
                        window.gameUI = new KingOfTokyoUI();
                    } else {
                        alert('Failed to load game assets. Please refresh the page.');
                    }
                } else {
                    window.UI && window.UI._debug && window.UI._debug(`⏳ Waiting for game assets to load, retrying in 100ms... (${attempts}/${maxAttempts})`);
                    setTimeout(waitForGameAssets, 100);
                }
            };
            
            waitForGameAssets();
        }, 500);
    });
});

class KingOfTokyoUI {
    constructor() {
        // Verify critical objects are available (MONSTERS is essential for monster selection)
        if (typeof MONSTERS === 'undefined') {
            console.error('❌ MONSTERS not available during UI construction!');
            throw new Error('MONSTERS object is required but not available');
        }
        
        // Warn about missing objects but continue
        if (typeof POWER_CARDS === 'undefined') {
            console.warn('⚠️ POWER_CARDS object not available - power cards may not work');
        }
        if (typeof KingOfTokyoGame === 'undefined') {
            console.warn('⚠️ KingOfTokyoGame class not available - game functionality may be limited');
        }
        
    this.game = null;
    this.elements = {};
    this.selectedMonsters = [];
    this.currentPlayerCount = 4; // Default to 4 players (will be updated from config)
    this.gameConfig = null; // Will be loaded from config.json
    // Thought bubble control
    this._lastGlobalThought = 0; // timestamp of last bubble shown (any CPU)
    this._lastPlayerThought = {}; // per-player timestamps
    // Thought bubble context state
    this._lastDiceSummary = {}; // per-player last stable dice faces for context-aware chatter
    this._recentThoughts = {}; // per-player queue of recent phrases to reduce repetition
    this._activeThoughtBubble = null; // current DOM element
    this._activeThoughtPlayerId = null;
    this._pendingRepositionRaf = null;
    this.tempSetupLog = []; // Store setup actions before game is created
    this.endingTurnInProgress = false; // Flag to prevent multiple endTurn calls
    this.previousRound = 1; // Track previous round for animation
    this.playerTiles = []; // Track player tile assignments
    this.draggedMonster = null; // Track currently dragged monster

    // Caches for dynamic DOM elements
    this.playerDashboards = new Map(); // playerId -> dashboard element
    this.diceElements = new Map(); // diceId -> dice element
    this.monsterCards = new Map(); // monsterId -> monster card element
    
    // Debug system - can be enabled via URL param or localStorage
    this.debugMode = this._initializeDebugMode();
    
    // Add keyboard shortcut for debug mode (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            this.toggleDebugMode();
        }
    });
    
    window.UI && window.UI._debug && window.UI._debug('🎮 King of Tokyo UI initialized', { debugMode: this.debugMode });
        
        // Sportscast commentary arrays
        this.sportscastCommentary = {
            intro: [
                "Ladies and gentlemen, welcome to the King of Tokyo Roll-Off!",
                "It's time to see who will claim the first turn in this epic battle!",
                "The monsters are ready... let's see who has the dice on their side!",
                "Who will emerge as the first to terrorize Tokyo? Let's find out!"
            ],
            beforeRoll: [
                "Here comes {name}, looking confident and ready to roll!",
                "{name} steps up to the dice table with determination!",
                "All eyes are on {name} as they prepare for their moment of truth!",
                "{name} takes a deep breath... this could be the roll that matters!"
            ],
            humanRoll: [
                "{name}, it's your turn! Click that roll button and show us what you've got!",
                "The spotlight is on you, {name}! Time to roll those dice!",
                "{name}, the crowd is waiting! Give those dice a shake!",
                "It's all up to you now, {name}! Click to roll and claim your destiny!"
            ],
            aiRolling: [
                "{name} is calculating the perfect roll...",
                "Watch as {name} demonstrates their rolling technique!",
                "{name} focuses their energy... here comes the roll!",
                "The mechanical precision of {name} is about to be revealed!"
            ],
            results: {
                high: [
                    "INCREDIBLE! {name} just rolled {count} attacks! What a phenomenal performance!",
                    "Outstanding! {name} comes out swinging with {count} attack dice!",
                    "Magnificent! {name} shows everyone how it's done with {count} attacks!",
                    "Spectacular! {name} dominates the roll with {count} attack dice!"
                ],
                medium: [
                    "Solid performance! {name} rolls {count} attacks - a respectable showing!",
                    "Not bad! {name} puts up {count} attacks on the board!",
                    "Decent roll! {name} manages {count} attacks - still in the game!",
                    "A fair effort! {name} scores {count} attacks in this round!"
                ],
                low: [
                    "Oh no! {name} only managed {count} attacks - that's going to be tough to beat the competition with!",
                    "Unlucky! {name} rolls just {count} attacks - the dice weren't kind today!",
                    "Rough luck! {name} ends up with only {count} attacks - better luck next time!",
                    "The dice have spoken! {name} gets {count} attacks - not quite the roll they were hoping for!"
                ]
            },
            tie: [
                "We have a TIE! This is what we live for, folks!",
                "Incredible! A deadlock! These monsters are evenly matched!",
                "Unbelievable! Lady Luck has given us a tie - time for a tiebreaker!",
                "What drama! A perfect tie! Tokyo will have to wait a little longer!"
            ],
            winner: [
                "AND WE HAVE A WINNER! {name} takes the crown with {count} attacks!",
                "VICTORY! {name} emerges triumphant and will lead the charge into Tokyo!",
                "CHAMPION! {name} has proven their worth and earned the right to go first!",
                "PHENOMENAL! {name} rises above the competition and claims first turn!"
            ]
        };
        
        // Initialize SetupManager for handling setup screen
        this.setupManager = new SetupManager(UIUtilities);
        
        // Primary global reference
        window.gameUI = this;
        // Backward compatibility alias with deprecation warning (getter defined once)
        if (!Object.getOwnPropertyDescriptor(window, 'kingOfTokyoUI')) {
            Object.defineProperty(window, 'kingOfTokyoUI', {
                configurable: true,
                get() {
                    if (!window.__kingAliasWarned) {
                        console.warn('kingOfTokyoUI is deprecated. Use window.gameUI instead.');
                        window.__kingAliasWarned = true;
                    }
                    return window.gameUI;
                },
                set(v) { window.gameUI = v; }
            });
        }
        
        // Expose showSettings globally for setup manager
        window.showSettingsModal = () => this.showSettings();
        
        // Expose setupManager globally for cross-component communication
        window.setupManager = this.setupManager;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeGamePause(); // Initialize pause system
        this.initializeDragAndDrop();
        this.initializeDarkMode();
        this._initializeDOMCaches(); // Initialize DOM element caches
    this.setupManager.initializeMonsterProfiles(); // Now window.gameUI is available
        this.initializeResponsivePanels();
        this.initializeDiceArea(); // Initialize dice area with 6 dice
        this.initializeAI(); // Initialize AI decision engine
        this.setupManager.showSetupModal(); // Delegate to SetupManager
        
        // End turn button functionality now handled in dice controls
        // No need to add duplicate button
        
        // Load configuration first, then initialize settings
        this.loadConfiguration().then(() => {
            this.initializeSettings(); // Initialize settings after config is loaded
        });
        
        // Listen for monster configuration updates
        window.addEventListener('monstersConfigLoaded', () => {
            window.UI && window.UI._debug && window.UI._debug('🎭 Received monstersConfigLoaded event in main.js');
            if (this.setupManager) {
                window.UI && window.UI._debug && window.UI._debug('🎭 Refreshing monster profiles and selection grid...');
                this.setupManager.initializeMonsterProfiles();
                this.setupManager.updateMonsterSelection(); // Refresh the monster grid display
            }
        });
    }

    // Load UI configuration from config.json
    async loadConfiguration() {
        try {
            const response = await fetch('config.json');
            if (response.ok) {
                this.gameConfig = await response.json();
                
                // Update default player count if specified in config
                if (this.gameConfig.gameRules && this.gameConfig.gameRules.player) {
                    this.currentPlayerCount = this.gameConfig.gameRules.player.defaultPlayerCount;
                }
                
                window.UI && window.UI._debug && window.UI._debug('✅ UI configuration loaded successfully');
                
                // Reload settings now that config is available
                if (this.loadSettings) {
                    this.loadSettings();
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load UI configuration, using defaults:', error);
        }
    }

    // Initialize DOM element references
    initializeElements() {
        window.UI && window.UI._debug && window.UI._debug('initializeElements called');
        this.elements = {
            // Screen elements
            splashScreen: document.getElementById('splash-screen'),
            gameContainer: document.getElementById('game-container'),
            
            // Modals
            setupModal: document.getElementById('setup-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            decisionModal: document.getElementById('decision-modal'),
            
            // Decision modal elements
            decisionTitle: document.getElementById('decision-title'),
            decisionContext: document.getElementById('decision-context'),
            decisionMessage: document.getElementById('decision-message'),
            decisionMonster: document.getElementById('decision-monster'),
            decisionOption1: document.getElementById('decision-option-1'),
            decisionOption2: document.getElementById('decision-option-2'),
            
            // Setup elements
            playerCount: document.getElementById('player-count-dropdown'),
            dropdownSelected: document.getElementById('dropdown-selected'),
            dropdownOptions: document.getElementById('dropdown-options'),
            monsterGrid: document.getElementById('monster-grid'),
            playerTilesGrid: document.getElementById('player-tiles-grid'),
            resetMonstersBtn: document.getElementById('reset-monsters'),
            randomSelectionBtn: document.getElementById('random-selection-btn'),
            monsterProfilesBtn: document.getElementById('monster-profiles-btn'),
            startGameBtn: document.getElementById('start-game'),
            
            // Monster Profiles Modal
            monsterProfilesModal: document.getElementById('monster-profiles-modal'),
            monsterProfilesGrid: document.getElementById('monster-profiles-grid'),
            closeMonsterProfiles: document.getElementById('close-monster-profiles'),
            resetProfilesBtn: document.getElementById('reset-profiles-btn'),
            saveProfilesBtn: document.getElementById('save-profiles-btn'),
            
            // Game elements
            roundCounter: document.getElementById('round-counter'),
            activePlayerName: document.getElementById('active-player-name'),
            playersContainer: document.getElementById('players-container'),
            tokyoCitySlot: document.getElementById('tokyo-city-monster'),
            tokyoBaySlot: document.getElementById('tokyo-bay-monster'),
            
            // Dice elements
            diceArea: document.getElementById('dice-area'),
            diceContainer: document.getElementById('dice-container'),
            actionMenu: document.getElementById('action-menu'),
            rollDiceBtn: document.getElementById('roll-dice'),
            keepDiceBtn: document.getElementById('keep-dice'),
            endTurnBtn: document.getElementById('end-turn'),
            // buyCardsBtn: document.getElementById('buy-cards'),
            rollsLeft: document.getElementById('rolls-left'),
            
            // Cards elements
            // currentEnergy: document.getElementById('current-energy'),
            availableCards: document.getElementById('available-cards'),
            // Note: active player uses .player-dashboard.active class
            
            // Game over elements
            winnerAnnouncement: document.getElementById('winner-announcement'),
            newGameBtn: document.getElementById('new-game'),
            
            // Toolbar elements
            exitGameBtn: document.getElementById('exit-game-btn'),
            
            // Roll-off elements
            rollOffModal: document.getElementById('roll-off-modal'),
            rolloffScoreboardContainer: document.getElementById('roll-off-modal'), // For backward compatibility
            rolloffTable: document.getElementById('rolloff-table'),
            rolloffTableBody: document.getElementById('rolloff-table-body'),
            rolloffCommentary: document.getElementById('rolloff-commentary'),
            rolloffRollBtn: document.getElementById('rolloff-roll-btn'),
            pauseGameBtn: document.getElementById('pause-game-btn'),
            resetPositionsBtn: document.getElementById('reset-positions-btn'),
            gameLogBtn: document.getElementById('game-log-btn'),
            storageMgmtBtn: document.getElementById('storage-mgmt-btn'),
            saveGameToolbarBtn: document.getElementById('save-game-toolbar-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            instructionsBtn: document.getElementById('instructions-btn'),
            gameLogModal: document.getElementById('game-log-modal'),
            storageMgmtModal: document.getElementById('storage-mgmt-modal'),
            settingsModal: document.getElementById('settings-modal'),
            instructionsModal: document.getElementById('instructions-modal'),
            exitConfirmationModal: document.getElementById('exit-confirmation-modal'),
            exitCancelBtn: document.getElementById('exit-cancel-btn'),
            exitConfirmBtn: document.getElementById('exit-confirm-btn'),
            closeExitConfirmation: document.getElementById('close-exit-confirmation'),
            gameLogContent: document.getElementById('game-log-content'),
            clearLogBtn: document.getElementById('clear-log-btn'),
            scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
            scrollToBottomBtn: document.getElementById('scroll-to-bottom-btn'),
            saveGameBtn: document.getElementById('save-game-btn'),
            exportGameBtn: document.getElementById('export-game-btn'),
            clearStorageBtn: document.getElementById('clear-storage-btn'),
            storageStats: document.getElementById('storage-stats'),
            storageInfoBtn: document.getElementById('storage-info-btn'),
            storageAboutPanel: document.getElementById('storage-about-panel'),
            closeStorageAboutBtn: document.getElementById('close-storage-about'),
            closeGameLogBtn: document.getElementById('close-game-log'),
            exportLogsBtn: document.getElementById('export-logs-btn'),
            // Tab elements
            gameFlowTab: document.getElementById('game-flow-tab'),
            aiLogicTab: document.getElementById('ai-logic-tab'),
            aiLogContent: document.getElementById('ai-log-content'),
            closeStorageMgmtBtn: document.getElementById('close-storage-mgmt'),
            closeSettingsBtn: document.getElementById('close-settings'),
            saveSettingsBtn: document.getElementById('save-settings'),
            resetSettingsBtn: document.getElementById('reset-settings'),
            cpuSpeedRadios: document.querySelectorAll('input[name="cpu-speed"]'),
            thoughtBubblesToggle: document.getElementById('thought-bubbles-toggle'),
            monsterCheckboxes: document.getElementById('monster-checkboxes'),
            closeInstructionsBtn: document.getElementById('close-instructions'),
            closeGameOverBtn: document.getElementById('close-game-over'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            gamePauseOverlay: document.getElementById('game-pause-overlay')
        };
        
        // Specific debug for AI Log Content
        console.log('🔍 DEBUG: aiLogContent element check:', {
            element: this.elements.aiLogContent,
            exists: !!this.elements.aiLogContent,
            id: this.elements.aiLogContent?.id,
            tagName: this.elements.aiLogContent?.tagName
        });
        
        // Manual test to see if we can find it via querySelector
        // Debug: Check which elements are null - categorize as critical vs optional
        const nullElements = [];
        const criticalElements = [
            'splashScreen', 'gameContainer', 'setupModal', 'playerCount', 
            'dropdownSelected', 'dropdownOptions', 'startGameBtn', 'diceContainer',
            'rollDiceBtn', 'keepDiceBtn', 'endTurnBtn', 'playersContainer'
        ];
        
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                nullElements.push(key);
            }
        }
        
        if (nullElements.length > 0) {
            const criticalMissing = nullElements.filter(el => criticalElements.includes(el));
            const optionalMissing = nullElements.filter(el => !criticalElements.includes(el));
            
            if (criticalMissing.length > 0) {
                console.error('CRITICAL: Missing required elements:', criticalMissing);
            }
            if (optionalMissing.length > 0) {
                console.warn('Optional elements not found:', optionalMissing);
            }
        } else {
            window.UI && window.UI._debug && window.UI._debug('✅ All DOM elements found successfully');
        }
    }

    // Attach event listeners
    attachEventListeners() {
        // Use UIUtilities to validate required elements
        const requiredElements = [
            'dropdownSelected', 'playerCount', 'dropdownOptions', 'startGameBtn',
            'rollDiceBtn', 'keepDiceBtn', 'endTurnBtn'
        ];
        
        if (!UIUtilities.validateRequiredElements(this.elements, requiredElements)) {
            return; // Exit early if required elements are missing
        }
        
        // Monster profiles modal events
        this.elements.closeMonsterProfiles.addEventListener('click', () => {
            this.setupManager.hideMonsterProfilesModal();
        });

        this.elements.resetProfilesBtn.addEventListener('click', () => {
            this.setupManager.resetMonsterProfiles();
        });

        this.elements.saveProfilesBtn.addEventListener('click', () => {
            this.setupManager.saveMonsterProfiles();
            UIUtilities.showMessage('Monster profiles saved!', 3000, this.elements);
            this.setupManager.hideMonsterProfilesModal();
        });

        // Close modal when clicking outside
        this.elements.monsterProfilesModal.addEventListener('click', (e) => {
            if (e.target === this.elements.monsterProfilesModal) {
                this.setupManager.hideMonsterProfilesModal();
            }
        });

        // Game control events
        this.elements.rollDiceBtn.addEventListener('click', () => {
            this.rollDice();
        });

        this.elements.keepDiceBtn.addEventListener('click', () => {
            this.keepDiceAndEndRolling();
        });

        this.elements.endTurnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.elements.endTurnBtn.disabled) {
                window.UI && window.UI._debug && window.UI._debug('End turn button clicked but is disabled');
                this._debug('FORCED DEBUG: Checking if we can force turn end...');
                
                // Debug check for stuck turns
                const gameState = this.game.getGameState();
                const diceState = this.game.diceRoller.getState();
                
                if (gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0) {
                    this._debug('FORCED: Turn seems stuck - dice finished but phase not changed to resolving');
                    this._debug('FORCED: Attempting to force dice resolution...');
                    
                    // Force dice resolution if stuck
                    try {
                        this.game.currentTurnPhase = 'resolving';
                        const results = this.game.diceCollection.getResults();
                        this.game.resolveDiceEffects(results, true); // Skip dice log for forced resolution
                        this.game.triggerEvent('turnPhaseChanged', { phase: 'resolving' });
                        this._debug('FORCED: Dice resolution forced, try end turn again');
                        this.updateDiceControls();
                        return;
                    } catch (error) {
                        console.error('🐛 FORCED: Error forcing dice resolution:', error);
                    }
                }
                return;
            }
            
            this.endTurnFromUI();
        });

        // Rolloff roll button event
        if (this.elements.rolloffRollBtn) {
            this.elements.rolloffRollBtn.addEventListener('click', () => {
                this.handleRolloffRoll();
            });
        }

        // this.elements.buyCardsBtn.addEventListener('click', () => {
        //     this.showCardBuyingInterface();
        // });

                // Game over modal events
        this.elements.newGameBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.gameOverModal);
            
            // Perform comprehensive game reset before starting new game
            this.performFullGameReset();
            
            // Show setup modal for new game
            this.setupManager.showSetupModal();
        });

        // Decision modal keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.elements.decisionModal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    // Default to "Leave Tokyo" on escape (safer choice)
                    this.elements.decisionOption2.click();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Default to "Stay in Tokyo" on enter/space (aggressive choice)
                    e.preventDefault();
                    this.elements.decisionOption1.click();
                }
            }
        });

        // Card purchase events (will be attached dynamically)
        
        // Toolbar events
        this.elements.exitGameBtn.addEventListener('click', () => {
            this.exitToSplashScreen();
        });

        this.elements.pauseGameBtn.addEventListener('click', () => {
            this.toggleGamePause();
        });

        this.elements.resetPositionsBtn.addEventListener('click', () => {
            this.resetDraggablePositions();
        });

        this.elements.gameLogBtn.addEventListener('click', async () => {
            await this.showGameLog();
        });

        this.elements.storageMgmtBtn.addEventListener('click', async () => {
            await this.showStorageManagement();
        });

        this.elements.saveGameToolbarBtn.addEventListener('click', async () => {
            await this.saveGameManually();
        });

        this.elements.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });

        this.elements.instructionsBtn.addEventListener('click', () => {
            this.showInstructions();
        });

        this.elements.closeGameLogBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.gameLogModal);
        });

        // AI Reasoning Info Modal close button
        const closeAIReasoningInfoBtn = document.getElementById('close-ai-reasoning-info');
        if (closeAIReasoningInfoBtn) {
            closeAIReasoningInfoBtn.addEventListener('click', () => {
                const modal = document.getElementById('ai-reasoning-info-modal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        // Close AI reasoning modal when clicking outside
        const aiReasoningModal = document.getElementById('ai-reasoning-info-modal');
        if (aiReasoningModal) {
            UIUtilities.safeAddEventListener(aiReasoningModal, 'click', 
                UIUtilities.createModalClickOutsideHandler(aiReasoningModal));
        }

        // Check if export button exists before adding event listener
        if (this.elements.exportLogsBtn) {
            window.UI && window.UI._debug && window.UI._debug('✅ Export logs button found, adding event listener');
            this.elements.exportLogsBtn.addEventListener('click', () => {
                window.UI && window.UI._debug && window.UI._debug('Export logs button clicked!');
                this.exportGameLogs();
            });
        } else {
            console.error('❌ Export logs button not found!');
        }

        // Tab switching functionality
        this.initializeLogTabs();

        this.elements.closeStorageMgmtBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.storageMgmtModal);
            // Also hide the about panel when closing the main modal
            if (this.elements.storageAboutPanel) {
                this.elements.storageAboutPanel.classList.remove('visible');
                this.elements.storageAboutPanel.classList.add('hidden');
            }
        });

        this.elements.closeInstructionsBtn.addEventListener('click', () => {
            UIUtilities.hideModal(this.elements.instructionsModal);
        });

        // Storage info button event listener using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.storageInfoBtn, 'click', 
            () => this.toggleStorageAboutPanel(), 'Storage info button not found');

        // Close storage about panel button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeStorageAboutBtn, 'click', 
            () => this.hideStorageAboutPanel(), 'Close storage about button not found');

        // Settings modal close button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeSettingsBtn, 'click', 
            () => {
                UIUtilities.hideModal(this.elements.settingsModal);
                document.body.classList.remove('settings-modal-open');
                // Resume only if we auto-paused
                if (this._wasAutoPausedForSettings) {
                    this._wasAutoPausedForSettings = false;
                    if (this.gamePaused) {
                        this.gamePaused = false; // ensure flag sync
                        this.unpauseGame();
                    }
                }
            }, 
            'Close settings button not found');

        // Settings save button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.saveSettingsBtn, 'click', 
            () => this.saveSettings(), 
            'Save settings button not found');

        // Settings reset button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.resetSettingsBtn, 'click', 
            () => this.resetSettings(), 
            'Reset settings button not found');

        // Exit confirmation modal listeners
        UIUtilities.safeAddEventListener(this.elements.exitCancelBtn, 'click',
            () => this.hideExitConfirmationModal(),
            'Exit cancel button not found');
            
        UIUtilities.safeAddEventListener(this.elements.exitConfirmBtn, 'click',
            () => this.confirmExitToSplashScreen(),
            'Exit confirm button not found');
            
        UIUtilities.safeAddEventListener(this.elements.closeExitConfirmation, 'click',
            () => this.hideExitConfirmationModal(),
            'Close exit confirmation button not found');

        // Game over modal close button using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.closeGameOverBtn, 'click', 
            () => this.closeGameOverModal(), 
            'Close game over button not found');

        this.elements.clearLogBtn.addEventListener('click', () => {
            this.clearGameLog();
        });

        // Game log scroll buttons
        this.elements.scrollToTopBtn.addEventListener('click', () => {
            this.scrollGameLogToTop();
        });

        this.elements.scrollToBottomBtn.addEventListener('click', () => {
            this.scrollGameLogToBottom();
        });

        // Export logs button
        if (this.elements.exportLogsBtn) {
            window.UI && window.UI._debug && window.UI._debug('✅ Export logs button found in main setup, adding event listener');
            this.elements.exportLogsBtn.addEventListener('click', (e) => {
                window.UI && window.UI._debug && window.UI._debug('🎯 Export logs button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.exportGameLogs();
            });
        } else {
            console.error('❌ Export logs button not found in main setup!');
        }

        // Storage management controls
        if (this.elements.saveGameBtn) {
            this.elements.saveGameBtn.addEventListener('click', async () => {
                await this.saveGameManually();
            });
        }

        if (this.elements.exportGameBtn) {
            this.elements.exportGameBtn.addEventListener('click', async () => {
                await this.exportGameData();
            });
        }

        if (this.elements.clearStorageBtn) {
            this.elements.clearStorageBtn.addEventListener('click', async () => {
                await this.clearAllStorage();
            });
        }

        // Dark mode toggle using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.darkModeToggle, 'change', 
            () => this.toggleDarkMode(), 'Dark mode toggle not found');

        // AI mode toggle button removed; AI is always enabled.

        // AI mode toggle using UIUtilities
        // AI is the single default mode; toggle removed.

        // Monster avatar click handler for profile modal
        if (this.elements.playersContainer) {
            this.elements.playersContainer.addEventListener('click', (e) => {
                try {
                    // Prevent clicks on monster avatars from bubbling up and
                    // triggering other global handlers that may move/remove cards.
                    if (e.target && e.target.classList && e.target.classList.contains('monster-avatar-image')) {
                        e.preventDefault();
                        e.stopPropagation();

                        const playerDashboard = e.target.closest('.player-dashboard');
                        if (!playerDashboard) {
                            console.warn('Clicked avatar not inside a player-dashboard element');
                            return;
                        }

                        const playerId = playerDashboard.dataset.playerId;
                        // Defensive: ensure game and players exist
                        if (!this.game || !Array.isArray(this.game.players)) {
                            console.error('Game or players array not available when opening monster profile');
                            return;
                        }

                        // Find player by ID in the players array
                        const player = this.game.players.find(p => p.id === playerId);
                        if (player) {
                            console.log('Opening monster profile modal for player:', player.monster?.name || playerId);
                            this.openMonsterProfileModal(player);
                        } else {
                            console.warn('No matching player found for id:', playerId);
                        }
                    }
                    // Diagnostic: detect clicks on player card body that might precede disappearance
                    const dashboard = e.target.closest('.player-dashboard');
                    if (dashboard && !e.target.classList.contains('monster-avatar-image')) {
                        const pid = dashboard.dataset.playerId;
                        // Schedule a microtask to verify card still exists
                        setTimeout(() => {
                            const stillThere = this._getCachedPlayerDashboard ? this._getCachedPlayerDashboard(pid) : document.querySelector(`.player-dashboard[data-player-id="${pid}"]`);
                            if (!stillThere) {
                                console.warn('⚠️ Player dashboard disappeared unexpectedly, attempting recovery for player', pid);
                                try {
                                    // Force a full players panel re-render
                                    if (this.game && Array.isArray(this.game.players)) {
                                        this.renderPlayersPanel(this.game.players);
                                    }
                                } catch (re) {
                                    console.error('Failed to recover missing player dashboard:', re);
                                }
                            } else {
                                // If still present, check if it became invisible via CSS
                                const cs = window.getComputedStyle(stillThere);
                                if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) {
                                    console.warn('⚠️ Player dashboard became visually hidden (style change) for player', pid, { display: cs.display, visibility: cs.visibility, opacity: cs.opacity });
                                }
                            }
                        }, 0);
                    }
                } catch (err) {
                    console.error('Error handling playersContainer click:', err);
                }
            });
            // Install a one-time mutation observer for disappearance diagnostics
            if (!this._playerCardObserverInstalled) {
                this._playerCardObserverInstalled = true;
                // Debounced reconcile to avoid cascading duplicate inserts
                const scheduleReconcile = (() => {
                    let rafId = null;
                    // Persist last checksum to skip redundant rebuilds
                    this._playerDashChecksum = this._playerDashChecksum || null;
                    const computeChecksum = (players, activeId) => {
                        // Simple stable string: id|activeFlag joined by ';'
                        return players.map(p => `${p.id}${p.id===activeId?'*':''}`).join(';');
                    };
                    const reconcile = () => {
                        rafId = null;
                        try {
                            if (!this.game || !Array.isArray(this.game.players)) return;
                            const container = this.elements.playersContainer;
                            if (!container) return;
                            const players = this.game.players.filter(p => !p.isEliminated);
                            const current = this.game.getCurrentPlayer();
                            const activeId = current ? current.id : null;
                            const checksum = computeChecksum(players, activeId);
                            if (checksum === this._playerDashChecksum) {
                                window.UI && window.UI._debug && window.UI._debug('♻️ Reconcile skipped (checksum match)', checksum);
                                return; // Nothing changed logically
                            }
                            const domIds = Array.from(container.querySelectorAll('.player-dashboard')).map(el => el.getAttribute('data-player-id'));
                            const modelIds = players.map(p => p.id);
                            if (domIds.length === modelIds.length && domIds.every((id, idx) => id === modelIds[idx]) && checksum === this._playerDashChecksum) {
                                return; // Already aligned with same checksum
                            }
                            console.warn('🔧 Reconciling player dashboards. DOM:', domIds, 'MODEL:', modelIds, 'checksum:', checksum);
                            const frag = document.createDocumentFragment();
                            players.forEach(p => {
                                const wrap = document.createElement('div');
                                wrap.innerHTML = this._generatePlayerHTML(p, p.id === activeId);
                                const card = wrap.firstElementChild;
                                if (card) frag.appendChild(card);
                            });
                            container.innerHTML = '';
                            container.appendChild(frag);
                            this._cachePlayerDashboards && this._cachePlayerDashboards();
                            this._playerDashChecksum = checksum;
                        } catch (reErr) {
                            console.error('Player dashboard reconcile error:', reErr);
                        }
                    };
                    return () => {
                        if (rafId) cancelAnimationFrame(rafId);
                        rafId = requestAnimationFrame(reconcile);
                    };
                })();

                const observer = new MutationObserver((mutations) => {
                    let needsReconcile = false;
                    mutations.forEach(m => {
                        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
                            // Any structural change triggers reconcile debounce
                            needsReconcile = true;
                        } else if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('player-dashboard')) {
                            // Attribute changes don’t force rebuild
                        }
                    });
                    if (needsReconcile) scheduleReconcile();
                });
                observer.observe(this.elements.playersContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
                this._playerCardObserver = observer;
                console.log('🧪 Player dashboard mutation observer installed');
            }
        }

        // Close modals when clicking outside using UIUtilities
        UIUtilities.safeAddEventListener(this.elements.gameLogModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.gameLogModal));

        UIUtilities.safeAddEventListener(this.elements.storageMgmtModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.storageMgmtModal));

        UIUtilities.safeAddEventListener(this.elements.settingsModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.settingsModal));

        UIUtilities.safeAddEventListener(this.elements.instructionsModal, 'click', 
            UIUtilities.createModalClickOutsideHandler(this.elements.instructionsModal));

        // Close setup modal when clicking outside and return to splash screen
        UIUtilities.safeAddEventListener(this.elements.setupModal, 'click', (e) => {
            if (e.target === this.elements.setupModal) {
                this.setupManager.hideSetupModal();
                UIUtilities.showSplashScreen(this.elements, this.setupManager);
            }
        });

        // Panel toggle event listeners
        const monstersHeader = document.getElementById('monsters-header');
        const powerCardsHeader = document.getElementById('power-cards-header');

        if (monstersHeader) {
            monstersHeader.addEventListener('click', () => {
                this.togglePanel('monsters');
            });
        }

        if (powerCardsHeader) {
            powerCardsHeader.addEventListener('click', () => {
                this.togglePanel('power-cards');
            });
        }
    }

    // Initialize drag and drop functionality for moveable components
    initializeDragAndDrop() {
        const bindAll = () => {
            const draggableElements = document.querySelectorAll('.draggable');
            draggableElements.forEach(el => {
                if (!el.dataset.draggableBound) {
                    this.makeDraggable(el);
                    el.dataset.draggableBound = '1';
                }
            });
        };
        bindAll();

        // Observe DOM for dynamically added draggable elements (e.g., active player card)
        if (!this._dragObserver) {
            const observer = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.type === 'childList' && (m.addedNodes?.length || 0) > 0) {
                        m.addedNodes.forEach(node => {
                            if (!(node instanceof HTMLElement)) return;
                            if (node.classList?.contains('draggable') && !node.dataset.draggableBound) {
                                this.makeDraggable(node);
                                node.dataset.draggableBound = '1';
                            }
                            // Also scan descendants once
                            const inner = node.querySelectorAll?.('.draggable');
                            inner && inner.forEach(desc => {
                                if (!desc.dataset.draggableBound) {
                                    this.makeDraggable(desc);
                                    desc.dataset.draggableBound = '1';
                                }
                            });
                        });
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            this._dragObserver = observer;
        }
    }

    // Helper method to make a single element draggable
    makeDraggable(element) {
        // Pointer Events unified implementation
        // Rationale:
        //  - Replaces separate mouse/touch listeners
        //  - Allows fine-grained control via pointerType ("mouse","touch","pen")
        //  - Eliminates passive event warning while minimizing preventDefault calls
        // Ensure native HTML5 drag doesn't interfere
        try {
            element.setAttribute('draggable', 'false');
            element.ondragstart = (e) => { e.preventDefault(); return false; };
        } catch(_) {}
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;
        let activePointerId = null;
        let saveDebounceTimer = null;
        const SAVE_KEY = element.id ? `${element.id}-position` : null;

        // Generic addListener helper with defaults; allows override
        const addL = (target, type, handler, opts = {}) => {
            // We pass passive:false because we may call preventDefault during drag to block scrolling for touch
            const finalOpts = { passive: false, ...opts };
            target.addEventListener(type, handler, finalOpts);
        };

        const persistPosition = () => {
            if (!SAVE_KEY) return;
            localStorage.setItem(SAVE_KEY, JSON.stringify({ x: currentX, y: currentY }));
        };

        const debouncedPersist = () => {
            if (!SAVE_KEY) return;
            if (saveDebounceTimer) cancelAnimationFrame(saveDebounceTimer);
            // Use rAF instead of setTimeout for smoother batching while dragging
            saveDebounceTimer = requestAnimationFrame(persistPosition);
        };

        const applyPositionStyles = () => {
            element.style.setProperty('position', 'fixed', 'important');
            element.style.setProperty('left', `${currentX}px`, 'important');
            element.style.setProperty('top', `${currentY}px`, 'important');
            element.style.setProperty('bottom', 'auto', 'important');
            element.style.setProperty('transform', 'none', 'important');
        };

        let suppressClick = false; // used to cancel click if a drag occurred
        // Cancel click if it followed a drag gesture
        element.addEventListener('click', (ce) => {
            if (suppressClick) {
                ce.stopPropagation();
                ce.preventDefault();
                suppressClick = false; // reset
            }
        }, true);

        const pointerDown = (e) => {
            // Ignore if already tracking another pointer (prevents multi-touch conflicts)
            if (activePointerId !== null && activePointerId !== e.pointerId) return;

            // Only exclusion: actual dice elements (retain ability to click/select dice without moving container)
            const diceContainer = this.elements && this.elements.diceContainer;
            if (diceContainer && diceContainer.contains(e.target)) {
                // Identify die elements by common classes
                const isDie = e.target.classList?.contains('die') || e.target.classList?.contains('single-die') || e.target.closest?.('.die');
                if (isDie) {
                    return; // Allow normal die click / selection without initiating drag
                }
            }

            activePointerId = e.pointerId;
            // Delay pointer capture until we confirm user intent to drag (movement threshold)

            // Prevent scroll only for touch/pen (mouse doesn't need it)
            if ((e.pointerType === 'touch' || e.pointerType === 'pen') && e.cancelable) {
                e.preventDefault();
            }

            // Record the element's starting position in the viewport each drag start
            const rect = element.getBoundingClientRect();
            xOffset = rect.left; // base (starting) left
            yOffset = rect.top;  // base (starting) top

            // Store the raw pointer down coordinates so we can compute deltas directly
            initialX = e.clientX;
            initialY = e.clientY;
            isDragging = false; // Will become true after threshold exceeded
            if (window.UI && window.UI._debug) {
                window.UI._debug('🧲 Drag start', { id: element.id, xOffset, yOffset, pointerType: e.pointerType });
            }
        };

        const DRAG_THRESHOLD = 6; // pixels
        const pointerMove = (e) => {
            if (e.pointerId !== activePointerId) return;

            // Raw deltas from pointer-down position
            const deltaX = e.clientX - initialX;
            const deltaY = e.clientY - initialY;

            if (!isDragging) {
                const dist = Math.hypot(deltaX, deltaY);
                if (dist < DRAG_THRESHOLD) {
                    return; // Not yet a drag; allow click/tap events to go through
                }
                // Commit to drag
                isDragging = true;
                element.classList.add('dragging');
                try { element.setPointerCapture(e.pointerId); } catch(_) {}
                suppressClick = true; // prevent the ensuing click event firing button actions after drag
            }

            if ((e.pointerType === 'touch' || e.pointerType === 'pen') && e.cancelable) {
                e.preventDefault();
            }

            // New target position is starting element position + pointer delta
            currentX = xOffset + deltaX;
            currentY = yOffset + deltaY;

            // Constrain to viewport (use element's current dimensions)
            const rectNow = element.getBoundingClientRect();
            const maxX = window.innerWidth - rectNow.width;
            const maxY = window.innerHeight - rectNow.height;
            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            applyPositionStyles();
            debouncedPersist();
        };

        const pointerUpOrCancel = (e) => {
            if (e.pointerId !== activePointerId) return;
            // If we never transitioned to dragging, treat as a simple click/tap; no cleanup needed beyond resetting state
            if (!isDragging) {
                activePointerId = null;
                return;
            }
            isDragging = false;
            element.classList.remove('dragging');
            persistPosition();
            activePointerId = null;
        };

        // Register unified pointer event listeners
        addL(element, 'pointerdown', pointerDown);
        addL(window, 'pointermove', pointerMove);
        addL(window, 'pointerup', pointerUpOrCancel);
        addL(window, 'pointercancel', pointerUpOrCancel);

        // Restore saved position on load
        if (SAVE_KEY) {
            const saved = localStorage.getItem(SAVE_KEY);
            if (saved) {
                try {
                    const pos = JSON.parse(saved);
                    currentX = pos.x;
                    currentY = pos.y;
                    if (currentX > 10 && currentY > 10) {
                        xOffset = currentX;
                        yOffset = currentY;
                        applyPositionStyles();
                    } else {
                        localStorage.removeItem(SAVE_KEY);
                    }
                } catch (err) {
                    console.warn('Failed to restore position for', SAVE_KEY, err);
                }
            }
        }
        }

    // Reset all draggable elements to their default positions
    resetDraggablePositions() {
        const draggableElements = document.querySelectorAll('.draggable');
        
        draggableElements.forEach(element => {
            // Remove all custom positioning properties to return to CSS default
            element.style.removeProperty('position');
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('bottom');
            element.style.removeProperty('transform');
            
            // Remove saved position from localStorage
            const elementId = element.id;
            if (elementId) {
                localStorage.removeItem(`${elementId}-position`);
            }
        });
        
        // Show confirmation message
        UIUtilities.showMessage('Layout positions reset to default!', 2000, this.elements);
    }



    
    async startGame() {
        window.UI && window.UI._debug && window.UI._debug('startGame called');
        window.UI && window.UI._debug && window.UI._debug('Selected monsters count:', this.selectedMonsters.length);
        window.UI && window.UI._debug && window.UI._debug('Current player count:', this.currentPlayerCount);
        window.UI && window.UI._debug && window.UI._debug('Selected monsters:', this.selectedMonsters);
        
        window.UI && window.UI._debug && window.UI._debug('Creating new game...');
        try {
            // Initialize storage system
            window.UI && window.UI._debug && window.UI._debug('🔧 Initializing game storage system...');
            const storageManager = new GameStorageManager();
            await storageManager.initialize();
            window.UI && window.UI._debug && window.UI._debug('✅ Storage system initialized');

            // Create new game with storage
            console.log('About to create KingOfTokyoGame instance');
            this.game = new KingOfTokyoGame(storageManager);
            console.log('Game instance created successfully:', !!this.game);

            // Initialize first-player intro thought bubble phase flags
            try {
                const fp = this.game.getCurrentPlayer && this.game.getCurrentPlayer();
                this._firstPlayerId = fp ? fp.id : null;
                this._firstPlayerIntroActive = !!fp; // active until first roll occurs
                this._firstPlayerFirstRollOccurred = false;
                this._firstPlayerRumbleUsed = false; // ensure rumble animation only once
            } catch(e){ console.warn('Failed to init first player intro flags', e); }
            
            // Set up event callback
            this.game.setEventCallback((eventType, data) => {
                this.handleGameEvent(eventType, data);
            });

            // Log setup actions in proper sequence using storage-enabled logging
            // 1. Log player selection with monster details as a main entry
            const monsterNames = this.selectedMonsters.map(monster => monster.name).join(', ');
            await this.game.logSetupAction(`👥 ${this.currentPlayerCount} players selected`, 'setup');
            
            // 1a. Log individual monster selections as follow-up entries with player types
            for (let i = 0; i < this.selectedMonsters.length; i++) {
                const monster = this.selectedMonsters[i];
                const playerTile = this.playerTiles[i];
                const playerTypeIcon = playerTile.type === 'human' ? '👤' : '🤖';
                await this.game.logSetupAction(`    ├─ Player ${i + 1}: ${monster.name} (${playerTypeIcon} ${playerTile.type.toUpperCase()})`, 'monster-selection');
            }
            
            // 2. Log game start
            await this.game.logSetupAction('🎯 Starting new King of Tokyo game!', 'game-start');
            
            // Prepare player types array
            const playerTypes = this.playerTiles.map(tile => tile.type);
            console.log('Player types:', playerTypes);
            
            // Perform roll-off to determine first player
            window.UI && window.UI._debug && window.UI._debug('🎲 Starting roll-off for first player...');
            window.UI && window.UI._debug && window.UI._debug('Passing selectedMonsters to rollForFirstPlayer:', this.selectedMonsters);
            console.log('🔍 Debug - selectedMonsters:', this.selectedMonsters);
            console.log('🔍 Debug - playerTypes:', playerTypes);
            console.log('🔍 Debug - selectedMonsters length:', this.selectedMonsters?.length);
            
            // Hide the setup modal so users can see the roll-off scoreboard
            this.setupManager.hideSetupModal();
            
            const rollOffWinner = await this.game.rollForFirstPlayer(this.selectedMonsters, playerTypes);
            window.UI && window.UI._debug && window.UI._debug('🔍 Debug - rollOffWinner returned:', rollOffWinner);
            window.UI && window.UI._debug && window.UI._debug(`🏆 Roll-off winner:`, rollOffWinner);
            
            // Check if rollOffWinner is valid
            if (!rollOffWinner || rollOffWinner.index === undefined) {
                console.error('❌ Error: rollOffWinner is invalid:', rollOffWinner);
                throw new Error('Roll-off failed to determine a winner');
            }
            
            // Use the same continuation logic as skip
            await this.continueGameAfterRolloff(rollOffWinner);
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Error starting game: ' + error.message);
        }
    }

    // Method called by SetupManager to start the game
    async startGameFromSetup(selectedMonsters, currentPlayerCount, playerTiles) {
        window.UI && window.UI._debug && window.UI._debug('startGameFromSetup called from SetupManager');
        window.UI && window.UI._debug && window.UI._debug('Selected monsters:', selectedMonsters);
        window.UI && window.UI._debug && window.UI._debug('Player count:', currentPlayerCount);
        window.UI && window.UI._debug && window.UI._debug('Player tiles:', playerTiles);
        
        // Store the setup data from SetupManager
        this.selectedMonsters = selectedMonsters;
        this.currentPlayerCount = currentPlayerCount;
        this.playerTiles = playerTiles;
        
        // Call the existing startGame method
        await this.startGame();
    }

    // Method called by SetupManager to regenerate player tiles
    regeneratePlayerTilesFromSetup(playerCount) {
        console.log('regeneratePlayerTilesFromSetup called from SetupManager with playerCount:', playerCount);
        // This would regenerate player tiles based on the new player count
        // For now, just delegate to the SetupManager's internal generation
        if (this.setupManager && typeof this.setupManager.generatePlayerTilesInternal === 'function') {
            this.setupManager.generatePlayerTilesInternal();
        }
    }

    // Handle game events
    handleGameEvent(eventType, data) {
        switch (eventType) {
            case 'diceUpdated':
                this.updateDiceDisplay(data);
                this.updateDiceControls(); // Also update dice controls when dice are updated
                break;
            case 'diceRollComplete':
                this.handleDiceRollComplete(data);
                break;
            case 'turnPhaseChanged':
                this.updateTurnPhase(data);
                break;
            case 'statsUpdated':
                console.log('Stats updated event received');
                this.updateGameDisplay(); // Refresh entire game display when stats change
                break;
            case 'cardPurchased':
                console.log('Card purchased event received:', data);
                this.updateGameDisplay(); // Refresh to show new card and updated energy
                this.updateCardsDisplay(); // Refresh available cards
                break;
            case 'pendingDecision':
                this.showDecisionModal(data);
                break;
            case 'showCPUThought':
                this.showCPUThoughtBubble(data.player, data.context);
                break;
            case 'cpuNotification':
                this.showCPUActionNotification(data);
                break;
            case 'turnEnded':
                this._debug('TURN ENDED EVENT - Critical debugging point!');
                window.UI && window.UI._debug && window.UI._debug('🏁 Current player before cleanup:', this.game?.getCurrentPlayer()?.monster?.name);
                console.log('🏁 Game state before cleanup:', {
                    phase: this.game?.gamePhase,
                    turnPhase: this.game?.currentTurnPhase,
                    currentPlayerIndex: this.game?.currentPlayerIndex
                });
                
                // DISABLED: Handle Tokyo entry at END of turn 
                // This logic was causing premature Tokyo entry before players finished their actions
                // Tokyo entry is now handled properly in game.js when players explicitly end their turn
                // this.handleEndOfTurnTokyoEntry(data);
                
                this.cleanupAllThoughtBubbles();
                window.UI && window.UI._debug && window.UI._debug('🏁 About to call updateGameDisplay...');
                this.updateGameDisplay();
                window.UI && window.UI._debug && window.UI._debug('🏁 updateGameDisplay completed');
                window.UI && window.UI._debug && window.UI._debug('🏁 Current player after updateGameDisplay:', this.game?.getCurrentPlayer()?.monster?.name);
                break;
            case 'gameEnded':
                this.showGameOverModal(data);
                break;
            case 'playerEntersTokyo':
                this.animatePlayerToTokyo(data);
                break;
            case 'playerLeavesTokyo':
                this.animatePlayerFromTokyo(data);
                break;
            case 'tokyoChanged':
                this.updateTokyoDisplay(data);
                break;
            case 'playerAttacked':
                this.animatePlayerAttacked(data.playerId);
                break;
            case 'playerHealed':
                this.animatePlayerHealing(data.playerId, data.healAmount);
                break;
            case 'playerGainedPoints':
                this.animateVictoryPoints(data.playerId, data.pointsGained);
                break;
            case 'turnStarted':
                window.UI && window.UI._debug && window.UI._debug('🎯 turnStarted event received:', data);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: Turn started for player:', data.currentPlayer?.monster?.name);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: Player type:', data.currentPlayer?.playerType);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: Is eliminated:', data.currentPlayer?.isEliminated);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: Current game phase:', this.game?.gamePhase);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: Current turn phase:', this.game?.currentTurnPhase);
                window.UI && window.UI._debug && window.UI._debug('🎯 TURN DEBUG: CPU turn state exists:', !!this.cpuTurnState);
                
                this._debug('TURN DEBUG: Player should be able to take actions now!');
                
                this.clearAllAttackAnimations(); // Clear any stuck attack animations
                this.updateGameDisplay(); // Update UI to show new current player
                
                // Check if new current player is CPU and auto-start their turn
                const currentPlayer = this.game.getCurrentPlayer();
                window.UI && window.UI._debug && window.UI._debug('🎯 Current player from game:', currentPlayer);
                this._debug('CRITICAL TURN FLOW DEBUG:', {
                    playerName: currentPlayer?.monster?.name,
                    playerType: currentPlayer?.playerType,
                    isEliminated: currentPlayer?.isEliminated,
                    gamePhase: this.game?.gamePhase,
                    turnPhase: this.game?.currentTurnPhase,
                    canPlayerAct: !currentPlayer?.isEliminated,
                    shouldStartCPU: currentPlayer?.playerType === 'cpu' && !currentPlayer?.isEliminated,
                    shouldAllowHuman: currentPlayer?.playerType === 'human' && !currentPlayer?.isEliminated
                });
                
                // CRITICAL FIX: Only start CPU turn if player is actually CPU and not eliminated
                if (currentPlayer && 
                    currentPlayer.playerType === 'cpu' && 
                    !currentPlayer.isEliminated && 
                    !this.cpuTurnState) { // Don't start if CPU turn already in progress
                    
                    window.UI && window.UI._debug && window.UI._debug('🤖 Current player is CPU, starting automatic turn in 2 seconds...');
                    setTimeout(() => {
                        // Triple-check that it's still the same CPU player's turn and no other CPU turn is active
                        const stillCurrentPlayer = this.game.getCurrentPlayer();
                        if (stillCurrentPlayer && 
                            stillCurrentPlayer.id === currentPlayer.id && 
                            stillCurrentPlayer.playerType === 'cpu' &&
                            !stillCurrentPlayer.isEliminated &&
                            !this.cpuTurnState &&
                            !this.game.switchingPlayers) { // Ensure no player switching in progress
                            window.UI && window.UI._debug && window.UI._debug('🤖 Executing startAutomaticCPUTurn for:', currentPlayer.monster.name);
                            this.startAutomaticCPUTurn(currentPlayer);
                        } else {
                            console.log('🤖 CPU turn cancelled - conditions changed:', {
                                stillExists: !!stillCurrentPlayer,
                                samePlayer: stillCurrentPlayer?.id === currentPlayer.id,
                                stillCPU: stillCurrentPlayer?.playerType === 'cpu',
                                notEliminated: !stillCurrentPlayer?.isEliminated,
                                noCPUState: !this.cpuTurnState,
                                notSwitching: !this.game.switchingPlayers
                            });
                        }
                    }, 2000);
                } else if (currentPlayer && currentPlayer.playerType === 'human') {
                    window.UI && window.UI._debug && window.UI._debug('👤 HUMAN TURN STARTING: Player should be able to roll dice!');
                    // Immediately enable controls for human players - no delay needed
                    this.updateDiceControls();
                    console.log('👤 Human player details:', {
                        name: currentPlayer.monster.name,
                        id: currentPlayer.id,
                        eliminated: currentPlayer.isEliminated,
                        canPlay: !currentPlayer.isEliminated
                    });
                    // Ensure no CPU state interferes with human turns
                    if (this.cpuTurnState) {
                        console.log('🧹 Clearing stale CPU turn state for human player');
                        this.cpuTurnState = null;
                    }
                } else if (this.cpuTurnState) {
                    console.log('🤖 CPU turn already in progress, not starting new one');
                } else if (currentPlayer) {
                    console.log('👤 Current player is human:', currentPlayer.monster.name);
                    console.log('👤 Human player should be able to take their turn now');
                    // Extra safety: clear any stale CPU state
                    this.cpuTurnState = null;
                } else {
                    window.UI && window.UI._debug && window.UI._debug('❌ No current player found');
                }
                break;
            case 'logUpdated':
                this.updateGameLogDisplay(); // Update game log when new entries are added
                break;
            case 'playerEliminated':
                this.showPlayerEliminationDialog(data.eliminatedPlayer, data.attacker);
                // Force immediate UI update to reflect elimination and Tokyo changes
                this.updateGameDisplay();
                break;
            case 'rollOffRound':
                this.showRollOffNotification(data);
                break;
            case 'playerAboutToRoll':
                this.showPlayerAboutToRoll(data);
                break;
            case 'playerRollOff':
                this.showPlayerRollOffResult(data);
                break;
            case 'rollOffTie':
                this.showRollOffTie(data);
                break;
            case 'rollOffWinner':
                this.showRollOffWinner(data);
                break;
        }
    }

    // Animate round indicator when round changes
    animateRoundChange(newRound) {
        const roundIndicator = document.getElementById('round-indicator');
        
        // Add spinning class to start animation
        roundIndicator.classList.add('spinning');
        
        // After animation completes, update the number and remove class
        setTimeout(() => {
            this.elements.roundCounter.textContent = newRound;
            roundIndicator.classList.remove('spinning');
        }, 750); // Update number halfway through the 1.5s animation
    }

    // Update complete game display with debouncing to prevent flickering
    updateGameDisplay() {
        window.UI && window.UI._debug && window.UI._debug('🔄 updateGameDisplay called, game exists:', !!this.game);
        
        if (this.game) {
            const gameState = this.game.getGameState();
            const currentPlayer = gameState.currentPlayer;
            window.UI && window.UI._debug && window.UI._debug('🔄 Current player in updateGameDisplay:', currentPlayer?.monster?.name, 'isInTokyo:', currentPlayer?.isInTokyo);
        }
        
        // Debouncing: Clear any pending update and schedule a new one
        if (this.updateGameDisplayTimeout) {
            clearTimeout(this.updateGameDisplayTimeout);
        }
        
        this.updateGameDisplayTimeout = setTimeout(() => {
            this._performGameDisplayUpdate();
            this.updateGameDisplayTimeout = null;
        }, 16); // ~60fps debouncing
    }
    
    // Internal method that performs the actual update
    _performGameDisplayUpdate() {
        if (!this.game) {
            console.log('No game instance in updateGameDisplay, returning');
            return;
        }

        const gameState = this.game.getGameState();
        
        // Check if round has changed and animate if so
        if (gameState.round > this.previousRound) {
            this.animateRoundChange(gameState.round);
            this.previousRound = gameState.round;
        } else {
            // Normal update without animation
            this.elements.roundCounter.textContent = gameState.round;
        }
        
        // Update active player name
        if (this.elements.activePlayerName && gameState.currentPlayer) {
            this.elements.activePlayerName.textContent = gameState.currentPlayer.monster.name;
        }
        
        // Update players
        this.updatePlayersDisplay(gameState.players);
        
        // Update Tokyo
        this.updateTokyoDisplay(gameState);
        
        // Update dice controls
        this.updateDiceControls();
        
        // Update dice display appropriately based on game state
        // Don't overwrite rolled dice during gameplay
        const diceData = this.game.diceCollection.getAllDiceData();
        const allDiceEmpty = diceData.every(d => d.face === null || d.isDisabled);
        const anyDiceRolling = diceData.some(d => d.isRolling);
        const currentTurnPhase = this.game.currentTurnPhase;
        const diceState = this.game.diceRoller.getState();
        
        window.UI && window.UI._debug && window.UI._debug(`🎲 Dice update check - Turn phase: ${currentTurnPhase}, All dice empty: ${allDiceEmpty}, Any rolling: ${anyDiceRolling}, Rolls remaining: ${diceState.rollsRemaining}`);
        
        // Always update the dice display to show current state, but only use "initial" display for truly initial states
        // Don't update during rolling animation to prevent flicker
        if (!anyDiceRolling) {
            if (allDiceEmpty && currentTurnPhase === 'rolling' && diceState.rollsRemaining === 3) {
                window.UI && window.UI._debug && window.UI._debug(`🎲 Showing initial empty dice - start of turn`);
                this.updateInitialDiceDisplay();
            } else {
                window.UI && window.UI._debug && window.UI._debug(`🎲 Showing current dice state - mid-game`);
                this.updateDiceDisplay(diceData);
            }
        } else {
            window.UI && window.UI._debug && window.UI._debug(`🎲 Skipping dice update - dice are currently rolling`);
        }
        
        // Update cards
        this.updateCardsDisplay();
        
        // Update current player energy
        // this.elements.currentEnergy.textContent = gameState.currentPlayer.energy;
    }

    // Update display for a single player (calls updatePlayersDisplay with all players)
    updatePlayerDisplay(player) {
        // Update the display for all players to keep everything in sync
        this.updatePlayersDisplay(this.game.players);
    }

    // Update players display - separate active player from stack with optimized updates
    updatePlayersDisplay(players) {
        const currentPlayer = this.game.getCurrentPlayer();
        
        window.UI && window.UI._debug && window.UI._debug('👥 UPDATE PLAYERS DISPLAY called');
        window.UI && window.UI._debug && window.UI._debug('👥 Current player from game:', currentPlayer?.monster?.name, 'ID:', currentPlayer?.id);
        window.UI && window.UI._debug && window.UI._debug('👥 Last current player ID stored:', this.lastCurrentPlayerId);
        
        // SAFETY CHECK: Ensure current player exists
        if (!currentPlayer) {
            console.error('🚨 ERROR: No current player available in updatePlayersDisplay!');
            return;
        }
        
        // Check if player cards exist in the DOM - if not, we need initial creation
        const existingPlayerCards = document.querySelectorAll('.player-dashboard');
        window.UI && window.UI._debug && window.UI._debug('👥 Existing player cards found:', existingPlayerCards.length);
        
        if (existingPlayerCards.length === 0) {
            window.UI && window.UI._debug && window.UI._debug('👥 No player cards exist - performing initial creation');
            this._createInitialPlayerCards(players, currentPlayer);
            return;
        }
        
        // Check if current player has changed to determine if we need to reposition
        const currentPlayerChanged = this.lastCurrentPlayerId !== currentPlayer.id;
        window.UI && window.UI._debug && window.UI._debug('👥 Current player changed?', currentPlayerChanged, 'from', this.lastCurrentPlayerId, 'to', currentPlayer.id);
        this.lastCurrentPlayerId = currentPlayer.id;
        
        if (currentPlayerChanged) {
            window.UI && window.UI._debug && window.UI._debug('👥 CALLING _repositionActivePlayer due to player change');
            // Use DOM manipulation approach instead of rebuilding
            this._repositionActivePlayer(players, currentPlayer);
        } else {
            window.UI && window.UI._debug && window.UI._debug('👥 CALLING _updatePlayerStats (no repositioning needed)');
            // Otherwise, just update the stats of existing cards
            this._updatePlayerStats(players);
        }
    }
    
    // Initial creation of player cards (only called once at game start)
    _createInitialPlayerCards(players, currentPlayer) {
        console.log('🏗️ Creating initial player cards');
        
        // Use the old method for initial creation
        console.log('📝 [DEBUG] Setting playersContainer.innerHTML for initial creation with players:', players.map(p=>p.id));
        // Print stack trace to help locate callers that might rebuild the container unexpectedly
        console.trace('TRACE: _createInitialPlayerCards called');
        this.elements.playersContainer.innerHTML = players.map(player => 
            this._generatePlayerHTML(player, player.id === currentPlayer.id)
        ).join('');
        // Update player dashboard cache
        this._cachePlayerDashboards();
        
        window.UI && window.UI._debug && window.UI._debug('📄 Generated initial HTML for players container');
        
        // Store the current player ID so subsequent calls use DOM manipulation
        this.lastCurrentPlayerId = currentPlayer.id;
        
        // Set up initial positioning with the newly created cards
        this._setupInitialPlayerPositioning(players, currentPlayer);
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Attach event listeners
        this.attachPowerCardTabListeners();
        
        // Refresh player dashboard cache after rebuilding
        this._refreshPlayerDashboardCache();
    }
    
    // Initial positioning setup (similar to _setupPlayerPositioning but for fresh cards)
    _setupInitialPlayerPositioning(players, currentPlayer) {
        window.UI && window.UI._debug && window.UI._debug('🎯 Setting up initial player positioning');
        
        players.forEach((player, index) => {
            const dashboard = this._getCachedPlayerDashboard(player.id);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`;
                const strongGlowColor = `${monsterColor}aa`;

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
            }
            
            if (player.id === currentPlayer.id) {
                // Active player - move out of container and use fixed positioning
                console.log('📍 Setting up initial active player:', player.id);
                this._moveToActivePosition(dashboard, index);
            }
            // Non-active players stay in the container with CSS positioning
        });
    }
    
    // DOM manipulation approach - move existing cards without rebuilding
    _repositionActivePlayer(players, currentPlayer) {
        window.UI && window.UI._debug && window.UI._debug('🎯 Repositioning active player using DOM manipulation');
        
    // STEP 1: First restore the previously active player (if any) to proper position
    const previouslyActiveCard = this._getActivePlayerDashboard();
        if (previouslyActiveCard) {
            const previousPlayerId = previouslyActiveCard.dataset.playerId;
            window.UI && window.UI._debug && window.UI._debug('↩️ Restoring previously active player first:', previousPlayerId);
            this._restoreToCorrectPosition(previouslyActiveCard, players);
        }
        
        // STEP 2: Then activate the new current player
    const newActiveCard = this.playerDashboards.get(currentPlayer.id);
        this._debug('TOKYO DEBUG: Looking for player card:', currentPlayer.id, 'Player:', currentPlayer.monster.name, 'In Tokyo:', currentPlayer.isInTokyo);
        this._debug('TOKYO DEBUG: Found card:', !!newActiveCard);
        
        if (newActiveCard) {
            window.UI && window.UI._debug && window.UI._debug('🚀 Activating new current player:', currentPlayer.monster.name);
            const playerIndex = players.findIndex(p => p.id === currentPlayer.id);
            this._moveToActivePosition(newActiveCard, playerIndex);
        } else {
            console.error('🚨 TOKYO BUG: Could not find player card for', currentPlayer.monster.name, 'ID:', currentPlayer.id);
            console.error('🚨 Available player cards:', Array.from(document.querySelectorAll('[data-player-id]')).map(el => el.dataset.playerId));
        }
        
        // STEP 3: Update monster colors and stats for all players
        players.forEach((player, index) => {
            const dashboard = this.playerDashboards.get(player.id);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`;
                const strongGlowColor = `${monsterColor}aa`;

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
            }
        });
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Update player stats
        this._updatePlayerStats(players);
        
        // Attach event listeners (in case any were lost)
        this.attachPowerCardTabListeners();
    }

    _cachePlayerDashboards() {
        this.playerDashboards.clear();
        const dashboards = document.querySelectorAll('.player-dashboard');
        dashboards.forEach(dashboard => {
            const playerId = dashboard.dataset.playerId;
            if (playerId) {
                this.playerDashboards.set(playerId, dashboard);
            }
        });
    }

    // Helper to get active player dashboard
    _getActivePlayerDashboard() {
        for (const dashboard of this.playerDashboards.values()) {
            if (dashboard.classList.contains('active')) return dashboard;
        }
        return null;
    }
    
    // Store original position and move card to active position
    _moveToActivePosition(dashboard, originalIndex) {
        window.UI && window.UI._debug && window.UI._debug('📍 Moving player to active position:', dashboard.dataset.playerId);
        
        // Remove hover events for active player
        this._removeHoverEvents(dashboard);
        
        // Add active class and move to body
        dashboard.classList.add('active');
        
        if (dashboard.parentNode && dashboard.parentNode.id === 'players-container') {
            console.log(`🛫 [DEBUG] Moving dashboard ${dashboard.dataset.playerId} from players-container to body`);
            console.trace('TRACE: _moveToActivePosition appendChild');
            document.body.appendChild(dashboard);
        }
        
        // Make draggable
        dashboard.draggable = true;
        dashboard.classList.add('draggable');
        
        window.UI && window.UI._debug && window.UI._debug('✅ Player moved to active position');
    }
    
    // Restore card to its correct position in the container based on player order
    _restoreToCorrectPosition(dashboard, players) {
        window.UI && window.UI._debug && window.UI._debug('↩️ Restoring player to correct position:', dashboard.dataset.playerId);
        
        // Remove active classes first
        dashboard.classList.remove('active');
        dashboard.classList.remove('draggable');
        dashboard.draggable = false;
        
        // Only restore if it's currently in body (was moved out)
        if (dashboard.parentNode === document.body) {
            console.log(`🛬 [DEBUG] Restoring dashboard ${dashboard.dataset.playerId} from body back to players-container`);
            console.trace('TRACE: _restoreToCorrectPosition insertBefore');
            const playersContainer = document.getElementById('players-container');
            const playerId = dashboard.dataset.playerId;
            
            // Find this player's index in the players array
            const playerIndex = players.findIndex(p => p.id === playerId);
            
            if (playerIndex !== -1) {
                // Get all player cards currently in the container (sorted by their current order)
                const cardsInContainer = Array.from(playersContainer.children);
                
                if (playerIndex === 0) {
                    // Insert at the beginning
                    playersContainer.insertBefore(dashboard, playersContainer.firstChild);
                } else {
                    // Find the card that should come before this one
                    let insertAfter = null;
                    for (let i = playerIndex - 1; i >= 0; i--) {
                        const previousPlayerId = players[i].id;
                        insertAfter = playersContainer.querySelector(`[data-player-id="${previousPlayerId}"]`);
                        if (insertAfter) break;
                    }
                    
                    if (insertAfter) {
                        // Insert after the found card
                        playersContainer.insertBefore(dashboard, insertAfter.nextSibling);
                    } else {
                        // Fallback: insert at beginning
                        playersContainer.insertBefore(dashboard, playersContainer.firstChild);
                    }
                }
            } else {
                // Fallback: just append to container
                playersContainer.appendChild(dashboard);
            }
        }
        
        // Remove ALL inline styles that were applied when becoming active
        dashboard.style.position = '';
        dashboard.style.top = '';
        dashboard.style.left = '';
        dashboard.style.right = '';
        dashboard.style.bottom = '';
        dashboard.style.transform = '';
        dashboard.style.zIndex = '';
        dashboard.style.margin = '';
        dashboard.style.marginTop = '';
        dashboard.style.marginLeft = '';
        dashboard.style.marginRight = '';
        dashboard.style.marginBottom = '';
        dashboard.style.width = '';
        dashboard.style.height = '';
        dashboard.style.minHeight = '';
        dashboard.style.padding = '';
        dashboard.style.background = '';
        dashboard.style.border = '';
        dashboard.style.borderRadius = '';
        dashboard.style.boxShadow = '';
        dashboard.style.opacity = '';
        dashboard.style.visibility = '';
        dashboard.style.pointerEvents = '';
        
        // Restore hover events
        this._restoreHoverEvents(dashboard);
        
        window.UI && window.UI._debug && window.UI._debug('✅ Player restored to correct position at index', players.findIndex(p => p.id === dashboard.dataset.playerId));
    }

    // Restore card to its original position in the container (legacy method - kept for compatibility)
    _restoreToOriginalPosition(dashboard, currentIndex) {
        // Only restore if this card was previously active
        if (!dashboard.classList.contains('active')) {
            return; // Card was never active, nothing to restore
        }
        
        console.log('↩️ Restoring player to original position:', dashboard.dataset.playerId);
        
        // Remove active classes
        dashboard.classList.remove('active');
        dashboard.classList.remove('draggable');
        dashboard.draggable = false;
        
        // Move back to players-container if it's currently in body
        if (dashboard.parentNode === document.body) {
            const playersContainer = document.getElementById('players-container');
            playersContainer.appendChild(dashboard);
        }
        
        // Remove ALL inline styles that were applied when becoming active
        dashboard.style.position = '';
        dashboard.style.top = '';
        dashboard.style.left = '';
        dashboard.style.right = '';
        dashboard.style.bottom = '';
        dashboard.style.transform = '';
        dashboard.style.zIndex = '';
        dashboard.style.margin = '';
        dashboard.style.marginTop = '';
        dashboard.style.marginLeft = '';
        dashboard.style.marginRight = '';
        dashboard.style.marginBottom = '';
        dashboard.style.width = '';
        dashboard.style.height = '';
        dashboard.style.minHeight = '';
        dashboard.style.padding = '';
        dashboard.style.background = '';
        dashboard.style.border = '';
        dashboard.style.borderRadius = '';
        dashboard.style.boxShadow = '';
        dashboard.style.opacity = '';
        dashboard.style.visibility = '';
        dashboard.style.pointerEvents = '';
        
        // Restore hover events
        this._restoreHoverEvents(dashboard);
        
        window.UI && window.UI._debug && window.UI._debug('✅ Player restored to original position');
    }
    
    // Remove hover events from active player
    _removeHoverEvents(dashboard) {
        // Add CSS class to disable hover effects while keeping dragging enabled
        dashboard.classList.add('no-hover');
        window.UI && window.UI._debug && window.UI._debug('🚫 Removed hover events for active player');
    }
    
    // Restore hover events for non-active player
    _restoreHoverEvents(dashboard) {
        // Remove the no-hover class to re-enable hover effects
        dashboard.classList.remove('no-hover');
        window.UI && window.UI._debug && window.UI._debug('✅ Restored hover events for player');
    }
    
    // Rebuild the entire player layout (called only when current player changes)
    _rebuildPlayerLayout(players, currentPlayer) {
        this._debug('REBUILDING PLAYER LAYOUT - CRITICAL DEBUGGING');
        console.log('🏗️ Current player passed in:', currentPlayer?.monster?.name, 'ID:', currentPlayer?.id);
        console.log('🏗️ Total players:', players.length);
        console.log('🏗️ All players:', players.map(p => `${p.monster.name} (${p.playerType})`));
        
        // SAFETY CHECK: Ensure current player is valid
        if (!currentPlayer) {
            console.error('🚨 ERROR: No current player passed to _rebuildPlayerLayout!');
            return;
        }
        
        // CRITICAL FIX: Restore any active player cards back to container before rebuilding
        const activePlayerCards = document.querySelectorAll('.player-dashboard.active');
        const playersContainer = document.getElementById('players-container');
        
        activePlayerCards.forEach(card => {
            if (card.parentNode === document.body) {
                console.log('🔄 RESTORING active player card back to container before rebuild:', card.dataset.playerId);
                card.classList.remove('active');
                // Reset inline styles
                card.style.position = '';
                card.style.top = '';
                card.style.left = '';
                card.style.right = '';
                card.style.bottom = '';
                card.style.transform = '';
                card.style.zIndex = '';
                card.style.margin = '';
                playersContainer.appendChild(card);
            }
        });
        
        // Store original positioning data before any changes
        const existingCards = document.querySelectorAll('.player-dashboard');
        const originalPositions = new Map();
        
        existingCards.forEach(card => {
            const playerId = card.dataset.playerId;
            if (playerId) {
                const styles = getComputedStyle(card);
                originalPositions.set(playerId, {
                    position: styles.position,
                    top: styles.top,
                    left: styles.left,
                    right: styles.right,
                    transform: styles.transform,
                    zIndex: styles.zIndex,
                    margin: styles.margin,
                    background: styles.background,
                    borderColor: styles.borderColor
                });
            }
        });
        
        // Render all players in the main container
        console.log('📝 [DEBUG] Rebuilding playersContainer.innerHTML for full render with players:', players.map(p=>p.id));
        console.trace('TRACE: full playersContainer render');
        this.elements.playersContainer.innerHTML = players.map(player => 
            this._generatePlayerHTML(player, player.id === currentPlayer.id)
        ).join('');
        
        window.UI && window.UI._debug && window.UI._debug('📄 Generated HTML for players container');
        
        // Restore original positioning for non-active players and set up active player
        this._setupPlayerPositioning(players, currentPlayer, originalPositions);
        
        // Make only the active player draggable
        this._setupActivePlayerDragging(currentPlayer.id);
        
        // Attach event listeners
        this.attachPowerCardTabListeners();
        
        // Verify the active player is visible
        setTimeout(() => {
            const activePlayerDashboard = document.querySelector('.player-dashboard.active');
            if (activePlayerDashboard) {
                const rect = activePlayerDashboard.getBoundingClientRect();
                console.log('📍 Active player position:', 
                    `top: ${rect.top}px, left: ${rect.left}px, right: ${window.innerWidth - rect.right}px, width: ${rect.width}px, height: ${rect.height}px`);
                
                const styles = getComputedStyle(activePlayerDashboard);
                console.log('🎨 Active player computed styles:', 
                    `position: ${styles.position}, top: ${styles.top}, right: ${styles.right}, display: ${styles.display}, visibility: ${styles.visibility}, opacity: ${styles.opacity}`);
                
                // Check if it's visible in viewport
                const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                 rect.bottom <= window.innerHeight && 
                                 rect.right <= window.innerWidth;
                console.log('👀 Is visible in viewport:', isVisible);
                
                if (!isVisible) {
                    console.warn('⚠️ Active player card is outside viewport bounds!');
                    console.log('🖥️ Viewport size:', `${window.innerWidth}x${window.innerHeight}`);
                }
            } else {
                console.error('❌ No active player dashboard found after layout rebuild');
            }
        }, 100);
    }
    
    // Setup player positioning - restore non-active players to stack, position active player
    _setupPlayerPositioning(players, currentPlayer, originalPositions) {
        window.UI && window.UI._debug && window.UI._debug('🎯 Setting up player positioning');
        
        players.forEach((player, index) => {
            const dashboard = this._getCachedPlayerDashboard(player.id);
            if (!dashboard) return;
            
            // Set monster color properties for all players
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = this._lightenColor(monsterColor, 20);
                const glowColor = `${monsterColor}66`; // Add alpha transparency
                const strongGlowColor = `${monsterColor}aa`; // Stronger alpha transparency

                dashboard.style.setProperty('--monster-color', monsterColor);
                dashboard.style.setProperty('--monster-color-light', lighterColor);
                dashboard.style.setProperty('--monster-glow-color', glowColor);
                dashboard.style.setProperty('--monster-glow-strong', strongGlowColor);
                
                console.log(`🎨 Set monster colors for ${player.monster.name}: ${monsterColor} -> ${lighterColor}`);
            }
            
            if (player.id === currentPlayer.id) {
                // Active player - move out of container and use fixed positioning
                console.log('📍 Setting up active player:', player.id);
                dashboard.classList.add('active');
                
                // Move the active player card out of the players container and append to body
                if (dashboard.parentNode && dashboard.parentNode.id === 'players-container') {
                    console.log('🚀 Moving active player out of container to body');
                    document.body.appendChild(dashboard);
                }
                
                // Store reference to original parent for restoration later
                dashboard.dataset.originalParent = 'players-container';
                dashboard.dataset.originalIndex = index.toString();
                
            } else {
                // Non-active player - restore to stack position
                console.log('📋 Restoring non-active player to stack:', player.id);
                console.log('📋 Dashboard parent:', dashboard.parentNode);
                console.log('📋 Dashboard originalParent:', dashboard.dataset.originalParent);
                window.UI && window.UI._debug && window.UI._debug('📋 Dashboard classes:', dashboard.classList.toString());
                
                dashboard.classList.remove('active');
                
                // If this card was previously active and moved to body, move it back to players container
                if (dashboard.parentNode === document.body && dashboard.dataset.originalParent === 'players-container') {
                    console.log('↩️ Moving inactive player back to container');
                    const playersContainer = document.getElementById('players-container');
                    const originalIndex = parseInt(dashboard.dataset.originalIndex || '0');
                    
                    // Insert at the correct position based on original index
                    const existingCards = Array.from(playersContainer.querySelectorAll('.player-dashboard'));
                    if (originalIndex < existingCards.length) {
                        playersContainer.insertBefore(dashboard, existingCards[originalIndex]);
                    } else {
                        playersContainer.appendChild(dashboard);
                    }
                    
                    // Clean up data attributes
                    delete dashboard.dataset.originalParent;
                    delete dashboard.dataset.originalIndex;
                    console.log('✅ Player moved back to container');
                } else {
                    console.log('❌ Player not moved - parent:', dashboard.parentNode, 'originalParent:', dashboard.dataset.originalParent);
                }
                
                // Remove any inline styles that might override CSS positioning
                dashboard.style.position = '';
                dashboard.style.top = '';
                dashboard.style.left = '';
                dashboard.style.right = '';
                dashboard.style.bottom = '';
                dashboard.style.transform = '';
                dashboard.style.zIndex = '';
                dashboard.style.margin = '';
                
                // Let CSS handle the stack positioning based on nth-child rules
            }
        });
    }
    
    // Helper method to lighten a hex color
    _lightenColor(color, percent) {
        const f = parseInt(color.slice(1), 16);
        const t = percent < 0 ? 0 : 255;
        const p = percent < 0 ? percent * -1 : percent;
        const R = f >> 16;
        const G = f >> 8 & 0x00FF;
        const B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p / 100) + R) * 0x10000 + 
                      (Math.round((t - G) * p / 100) + G) * 0x100 + 
                      (Math.round((t - B) * p / 100) + B)).toString(16).slice(1);
    }

    // Setup dragging for the active player only
    _setupActivePlayerDragging(activePlayerId) {
        // Remove draggable from all players first
        const allPlayerDashboards = document.querySelectorAll('.player-dashboard');
        allPlayerDashboards.forEach(dashboard => {
            dashboard.classList.remove('draggable');
            dashboard.removeAttribute('draggable');
        });
        
        // Add draggable to active player
        const activePlayerDashboard = document.querySelector(`.player-dashboard[data-player-id="${activePlayerId}"]`);
        window.UI && window.UI._debug && window.UI._debug('🎯 Setting up active player dragging for:', activePlayerId);
        
        if (activePlayerDashboard) {
            window.UI && window.UI._debug && window.UI._debug('📋 Classes before:', activePlayerDashboard.className);
            activePlayerDashboard.classList.add('draggable');
            activePlayerDashboard.setAttribute('draggable', 'true');
            window.UI && window.UI._debug && window.UI._debug('📋 Classes after:', activePlayerDashboard.className);
            
            // Check if it has the active class
            window.UI && window.UI._debug && window.UI._debug('✅ Has active class:', activePlayerDashboard.classList.contains('active'));
            
            this.makeDraggable(activePlayerDashboard);
        } else {
            console.error('❌ Could not find active player dashboard for ID:', activePlayerId);
        }
    }
    
    // Update only the stats of existing player cards (no flickering)
    _updatePlayerStats(players) {
        players.forEach(player => {
            const playerElement = this._getCachedPlayerDashboard(player.id);
            if (playerElement) {
                // Update individual stat values without rebuilding the entire card
                const energyStat = playerElement.querySelector('.stat.energy .stat-value');
                const pointsStat = playerElement.querySelector('.stat.points .stat-value');
                const cardsStat = playerElement.querySelector('.stat.power-cards .stat-value');
                const healthLabel = playerElement.querySelector('.health-bar-label');
                const healthFill = playerElement.querySelector('.health-bar-fill');
                
                if (energyStat) energyStat.textContent = player.energy;
                if (pointsStat) pointsStat.textContent = player.victoryPoints;
                if (cardsStat) cardsStat.textContent = player.powerCards.length;
                if (healthLabel) healthLabel.textContent = `Health ${player.health}/${player.maxHealth}`;
                if (healthFill) {
                    healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
                    healthFill.className = `health-bar-fill ${this.getHealthBarClass(player.health, player.maxHealth)}`;
                }
                
                // Update elimination status
                playerElement.classList.toggle('eliminated', player.isEliminated);
                
                // Update Tokyo status in name container
                const nameContainer = playerElement.querySelector('.player-name-container');
                if (nameContainer) {
                    const existingTokyoIndicator = nameContainer.querySelector('.tokyo-indicator-inline');
                    if (player.isInTokyo) {
                        if (!existingTokyoIndicator) {
                            const tokyoIndicator = document.createElement('div');
                            tokyoIndicator.className = 'tokyo-indicator-inline';
                            tokyoIndicator.textContent = `In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}`;
                            nameContainer.appendChild(tokyoIndicator);
                        } else {
                            existingTokyoIndicator.textContent = `In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}`;
                        }
                    } else if (existingTokyoIndicator) {
                        existingTokyoIndicator.remove();
                    }
                }
            }
        });
    }
    
    // Generate HTML for a single player card
    _generatePlayerHTML(player, isActive) {
        window.UI && window.UI._debug && window.UI._debug(`🃏 Generating HTML for ${player.monster.name}: isActive=${isActive}, isInTokyo=${player.isInTokyo}, tokyoLocation=${player.tokyoLocation}`);
        
        return `
            <div class="player-dashboard ${isActive ? 'active' : ''} ${player.isEliminated ? 'eliminated' : ''}" 
                 data-player-id="${player.id}" data-monster="${player.monster.id}">
                <div class="player-info">
                    <div class="player-name-container">
                        <div class="player-name">
                            ${player.monster.name}${player.playerType === 'cpu' ? ' <span class="player-subtitle">(CPU)</span>' : ''}
                        </div>
                        ${player.isInTokyo ? `<div class="tokyo-indicator-inline">In Tokyo ${player.tokyoLocation === 'city' ? 'City' : 'Bay'}</div>` : ''}
                    </div>
                    <div class="monster-avatar" data-monster="${player.monster.id}">
                        <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                    </div>
                </div>
                <div class="player-stats">
                    <div class="stat power-cards" data-player-id="${player.id}">
                        <span class="stat-label">Cards</span>
                        <span class="stat-value">${player.powerCards.length}</span>
                    </div>
                    <div class="stat energy">
                        <span class="stat-label">Energy</span>
                        <span class="stat-value">${player.energy}</span>
                    </div>
                    <div class="stat points">
                        <span class="stat-label">Points</span>
                        <span class="stat-value">${player.victoryPoints}</span>
                    </div>
                </div>
                <div class="health-bar-container">
                    <div class="health-bar-label">Health ${player.health}/${player.maxHealth}</div>
                    <div class="health-bar">
                        <div class="health-bar-fill ${this.getHealthBarClass(player.health, player.maxHealth)}" style="width: ${(player.health / player.maxHealth) * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Handle Tokyo entry at END of turn (proper game rules)
    handleEndOfTurnTokyoEntry(gameState) {
        // DISABLED: This method was duplicating and conflicting with the proper Tokyo entry logic in game.js
        // The game.js version properly checks that dice have been resolved before allowing Tokyo entry
        // This main.js version was causing premature Tokyo entry before players could even roll dice
        window.UI && window.UI._debug && window.UI._debug('🏰 main.js Tokyo entry handler DISABLED - proper logic is in game.js');
        return;
        
        /*
        const endingPlayer = this.game.getCurrentPlayer();
        const endingPlayerIndex = this.game.currentPlayerIndex;
        const roundNumber = this.game.round;
        
        console.log('🏰 END-OF-TURN TOKYO ENTRY CHECK:', {
            endingPlayer: endingPlayer.monster.name,
            endingPlayerIndex,
            roundNumber,
            tokyoCityOccupied: this.game.tokyoCity !== null,
            tokyoBayOccupied: this.game.tokyoBay !== null,
            playerCount: this.game.players.length
        });
        
        // First turn (any player count): First player enters Tokyo City at end of their turn
        if (roundNumber === 1 && endingPlayerIndex === 0 && this.game.tokyoCity === null) {
            console.log(`🏰 FIRST TURN: ${endingPlayer.monster.name} enters Tokyo City at turn end!`);
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo City!`, 3000, this.elements);
            return;
        }
        
        // Second turn (5+ players only): Second player enters Tokyo Bay at end of their turn
        if (roundNumber === 1 && endingPlayerIndex === 1 && this.game.players.length >= 5 && this.game.tokyoBay === null && this.game.tokyoCity !== null) {
            console.log(`🏰 SECOND TURN (5+ players): ${endingPlayer.monster.name} enters Tokyo Bay at turn end!`);
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo Bay!`, 3000, this.elements);
            return;
        }
        
        console.log('🏰 No automatic Tokyo entry needed this turn');
        */
    }

    // Handle automatic Tokyo Bay entry for 5+ player games
    handleTokyoBayAutoEntry(gameState) {
        // DISABLED: This method was also duplicating Tokyo entry logic and causing premature entry
        // The proper Tokyo entry logic is handled in game.js after dice are resolved
        window.UI && window.UI._debug && window.UI._debug('🏖️ main.js Tokyo Bay auto-entry handler DISABLED - proper logic is in game.js');
        return;
        
        /*
        // Only for games with 5+ players
        if (this.game.players.length < 5) {
            return;
        }
        
        // Only if Tokyo Bay is empty and someone is in Tokyo City
        if (this.game.tokyoBay !== null || this.game.tokyoCity === null) {
            return;
        }
        
        // Get the player who just ended their turn
        const endingPlayer = this.game.getCurrentPlayer();
        const endingPlayerIndex = this.game.currentPlayerIndex;
        
        console.log('🏖️ TOKYO BAY AUTO-ENTRY CHECK (at turn END):', {
            endingPlayer: endingPlayer.monster.name,
            endingPlayerIndex,
            isSecondPlayer: endingPlayerIndex === 1,
            tokyoCityOccupied: this.game.tokyoCity !== null,
            tokyoBayEmpty: this.game.tokyoBay === null,
            currentPlayerType: endingPlayer.playerType,
            gamePhase: this.game.gamePhase,
            turnPhase: this.game.currentTurnPhase
        });
        
        // If the second player (index 1) is ending their turn, put them in Tokyo Bay
        if (endingPlayerIndex === 1 && this.game.tokyoBay === null) {
            console.log(`🏖️ EXECUTING AUTO-ENTRY: ${endingPlayer.monster.name} automatically enters Tokyo Bay at turn end!`);
            console.log('🏖️ BEFORE AUTO-ENTRY:', {
                tokyoCity: this.game.tokyoCity,
                tokyoBay: this.game.tokyoBay,
                endingPlayerVP: endingPlayer.victoryPoints,
                gamePhase: this.game.gamePhase,
                turnPhase: this.game.currentTurnPhase
            });
            
            this.game.enterTokyo(endingPlayer, true); // true = automatic entry, no points
            
            console.log('🏖️ AFTER AUTO-ENTRY:', {
                tokyoCity: this.game.tokyoCity,
                tokyoBay: this.game.tokyoBay,
                endingPlayerVP: endingPlayer.victoryPoints,
                gamePhase: this.game.gamePhase,
                turnPhase: this.game.currentTurnPhase
            });
            
            UIUtilities.showMessage(`${endingPlayer.monster.name} enters Tokyo Bay!`, 3000, this.elements);
        }
        */
    }

    // Attach click listeners to power card stat tiles
    attachPowerCardTabListeners() {
        // Add click listeners for power cards stat tiles
        const powerCardStats = document.querySelectorAll('.stat.power-cards');
        powerCardStats.forEach(stat => {
            stat.addEventListener('click', (e) => {
                e.stopPropagation();
                const playerId = stat.dataset.playerId;
                this.showPlayerPowerCardsModal(playerId);
            });
        });
    }

    // Show all power cards for a player in a modal
    showPlayerPowerCardsModal(playerId) {
        if (!this.game) return;

        // Close any existing modal first
        this.closePowerCardsModal();

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        // Handle empty power cards case
        if (player.powerCards.length === 0) {
            // Create modal HTML for empty power cards using proper structure
            const modalHtml = `
                <div class="power-cards-collection-modal" id="power-cards-modal">
                    <div class="power-cards-modal-content">
                        <div class="power-cards-modal-header">
                            <div>
                                <h2 class="power-cards-modal-title">${player.monster.name}'s Power Cards</h2>
                                <div class="power-cards-subtitle">No active power cards</div>
                            </div>
                            <button class="power-cards-close-btn">&times;</button>
                        </div>
                        <div class="power-cards-grid">
                            <div class="no-active-power-cards">No active power cards</div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.querySelector('.power-cards-collection-modal');
            const closeBtn = modal.querySelector('.power-cards-close-btn');
            
            if (closeBtn && modal) {
                window.UI && window.UI._debug && window.UI._debug('🔄 Setting up event listeners for empty power cards modal');
                window.UI && window.UI._debug && window.UI._debug('🔄 Close button found:', closeBtn);
                window.UI && window.UI._debug && window.UI._debug('🔄 Modal found:', modal);
                
                UIUtilities.safeAddEventListener(closeBtn, 'click', 
                    UIUtilities.createSafeEventHandler(() => {
                        window.UI && window.UI._debug && window.UI._debug('🔄 Empty power cards modal close button clicked!');
                        this.closePowerCardsModal();
                    }));
                
                UIUtilities.safeAddEventListener(modal, 'click', 
                    UIUtilities.createSafeEventHandler((e) => {
                        if (e.target === modal) {
                            window.UI && window.UI._debug && window.UI._debug('🔄 Empty power cards modal backdrop clicked!');
                            this.closePowerCardsModal();
                        }
                    }));
                
                // Close on Escape key
                const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
                    if (e.key === 'Escape') {
                        console.log('🔄 Empty power cards modal escape key pressed!');
                        this.closePowerCardsModal();
                        document.removeEventListener('keydown', closeOnEscape);
                    }
                });
                document.addEventListener('keydown', closeOnEscape);
            } else {
                console.error('🚨 Failed to find close button or modal for empty power cards!');
                console.log('🔄 closeBtn:', closeBtn);
                console.log('🔄 modal:', modal);
            }
            
            return;
        }

        // Create modal HTML with all power cards using the new CSS classes
        const cardsHtml = player.powerCards.map(card => `
            <div class="power-card-item" data-card-id="${card.id}" data-player-id="${playerId}">
                <div class="power-card-cost">⚡${card.cost}</div>
                <div class="power-card-name">${card.name}</div>
                <div class="power-card-effect">${card.description}</div>
            </div>
        `).join('');

        const modalHtml = `
            <div class="power-cards-collection-modal" id="power-cards-modal">
                <div class="power-cards-modal-content">
                    <div class="power-cards-modal-header">
                        <div>
                            <h2 class="power-cards-modal-title">${player.monster.name}'s Power Cards</h2>
                            <div class="power-cards-subtitle">Click any card to view details</div>
                        </div>
                        <button class="power-cards-close-btn">&times;</button>
                    </div>
                    ${player.powerCards.length > 0 ? `
                        <div class="power-cards-grid">
                            ${cardsHtml}
                        </div>
                    ` : `
                        <div class="no-power-cards">
                            No Power Cards Owned
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add close listeners
        const modal = document.getElementById('power-cards-modal');
        const closeBtn = modal.querySelector('.power-cards-close-btn');
        
        if (closeBtn && modal) {
            window.UI && window.UI._debug && window.UI._debug('🔄 Setting up event listeners for power cards modal with cards');
            window.UI && window.UI._debug && window.UI._debug('🔄 Close button found:', closeBtn);
            window.UI && window.UI._debug && window.UI._debug('🔄 Modal found:', modal);
            
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => {
                    window.UI && window.UI._debug && window.UI._debug('🔄 Power cards modal close button clicked! (with cards)');
                    this.closePowerCardsModal();
                }));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    if (e.target === modal) {
                        window.UI && window.UI._debug && window.UI._debug('🔄 Power cards modal backdrop clicked! (with cards)');
                        this.closePowerCardsModal();
                    }
                }));
        } else {
            console.error('🚨 Failed to find close button or modal for power cards with cards!');
            console.log('🔄 closeBtn:', closeBtn);
            console.log('🔄 modal:', modal);
        }

        // Add click listeners to individual cards for detailed view
        const cardItems = modal.querySelectorAll('.power-card-item');
        cardItems.forEach(cardItem => {
            UIUtilities.safeAddEventListener(cardItem, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    e.stopPropagation();
                    const cardId = cardItem.dataset.cardId;
                    const playerIdFromCard = cardItem.dataset.playerId;
                    this.showPowerCardDetailModal(cardId, playerIdFromCard);
                }));
        });

        // Close on Escape key
        const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
            if (e.key === 'Escape') {
                this.closePowerCardsModal();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
        document.addEventListener('keydown', closeOnEscape);
    }

    // Close power cards collection modal
    closePowerCardsModal() {
        console.log('🔄 closePowerCardsModal called!');
        const modal = document.getElementById('power-cards-modal');
        if (modal) {
            console.log('🔄 Modal found, removing it');
            // Clean up any event listeners by removing the modal
            modal.remove();
        } else {
            console.log('🔄 Modal not found!');
        }
        
        // Also try to clean up any modals with the class selector in case of ID conflicts
        const modalsByClass = document.querySelectorAll('.power-cards-collection-modal');
        modalsByClass.forEach((modalEl, index) => {
            window.UI && window.UI._debug && window.UI._debug(`🔄 Cleaning up modal found by class selector #${index}`);
            modalEl.remove();
        });
    }

    // Show detailed power card information in a separate modal
    showPowerCardDetailModal(cardId, playerId) {
        if (!this.game) return;

        // Close any existing modal first
        this.closePowerCardDetailModal();

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        const card = player.powerCards.find(c => c.id === cardId);
        if (!card) return;

        // Create detailed card modal HTML
        const modalHtml = `
            <div class="power-card-detail-modal" id="power-card-detail-modal">
                <div class="power-card-detail-content">
                    <div class="power-card-detail-header">
                        <h2 class="power-card-detail-title">${card.name}</h2>
                        <button class="power-cards-close-btn">&times;</button>
                    </div>
                    <div class="power-card-detail-body">
                        <div class="power-card-detail-cost">Energy Cost: ⚡${card.cost}</div>
                        <div class="power-card-detail-type">Type: ${card.type.toUpperCase()}</div>
                        <div class="power-card-detail-description">${card.description}</div>
                        <div class="power-card-detail-owner">Owned by: ${player.monster.name}</div>
                    </div>
                    <div class="power-card-detail-footer">
                        <button class="back-to-wallet-btn">← Back to Power Cards</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page and set up event handling using UIUtilities
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('power-card-detail-modal');
        
        if (modal) {
            // Use UIUtilities for cleaner event handling
            const closeBtn = modal.querySelector('.power-cards-close-btn');
            const backBtn = modal.querySelector('.back-to-wallet-btn');
            
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => this.closePowerCardDetailModal()));
            
            UIUtilities.safeAddEventListener(backBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => this.closePowerCardDetailModal()));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createModalClickOutsideHandler(modal));

            // Close on Escape key
            const closeOnEscape = (e) => {
                if (e.key === 'Escape') {
                    this.closePowerCardDetailModal();
                    document.removeEventListener('keydown', closeOnEscape);
                }
            };
            document.addEventListener('keydown', closeOnEscape);
        }
    }

    // Close power card detail modal
    closePowerCardDetailModal() {
        const modal = document.getElementById('power-card-detail-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show player elimination dialog
    showPlayerEliminationDialog(eliminatedPlayer, attacker) {
        // Close any existing elimination dialog first
        this.closePlayerEliminationDialog();
        
        const modalHtml = `
            <div class="player-elimination-modal" id="player-elimination-modal">
                <div class="player-elimination-content">
                    <div class="elimination-header">
                        <h1 class="elimination-title">ELIMINATED!</h1>
                        <button class="elimination-close-btn">&times;</button>
                    </div>
                    <div class="elimination-body">
                        <div class="elimination-message">
                            <div class="elimination-player-name">${eliminatedPlayer.monster.name}</div>
                            has been officially eliminated from the game!
                        </div>
                        <div class="elimination-message">
                            Eliminated by: <strong>${attacker ? attacker.monster.name : 'Unknown'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('player-elimination-modal');
        const closeBtn = modal.querySelector('.elimination-close-btn');
        
        if (closeBtn && modal) {
            UIUtilities.safeAddEventListener(closeBtn, 'click', 
                UIUtilities.createSafeEventHandler(() => {
                    window.UI && window.UI._debug && window.UI._debug('🔄 Elimination modal close button clicked!');
                    this.closePlayerEliminationDialog();
                }));
            
            UIUtilities.safeAddEventListener(modal, 'click', 
                UIUtilities.createSafeEventHandler((e) => {
                    if (e.target === modal) {
                        this.closePlayerEliminationDialog();
                    }
                }));
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                this.closePlayerEliminationDialog();
            }, 5000);
            
            // Close on Escape key
            const closeOnEscape = UIUtilities.createSafeEventHandler((e) => {
                if (e.key === 'Escape') {
                    this.closePlayerEliminationDialog();
                    document.removeEventListener('keydown', closeOnEscape);
                }
            });
            document.addEventListener('keydown', closeOnEscape);
        }
        
        // Update the game display to reflect the elimination
        this.updateGameDisplay();
    }

    // Close player elimination dialog
    closePlayerEliminationDialog() {
        const modal = document.getElementById('player-elimination-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show power card details in a modal
    showPowerCardModal(cardId, playerId) {
        if (!this.game) return;

        const player = this.game.players.find(p => p.id === playerId);
        if (!player) return;

        const card = player.powerCards.find(c => c.id === cardId);
        if (!card) return;

        // Create modal HTML
        const modalHtml = `
            <div class="power-card-modal-overlay" id="power-card-modal">
                <div class="power-card-modal">
                    <div class="power-card-display" data-effect="${card.effect}">
                        <button class="modal-close-btn">&times;</button>
                        <div class="card-cost">⚡${card.cost}</div>
                        <div class="card-name">${card.name}</div>
                        <div class="card-type">${card.type.toUpperCase()}</div>
                        <div class="card-description">${card.description}</div>
                        <div class="card-owner">Owned by: ${player.monster.name}</div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page and use UIUtilities for event handling
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('power-card-modal');
        const closeBtn = modal.querySelector('.modal-close-btn');
        
        UIUtilities.safeAddEventListener(closeBtn, 'click', () => this.closePowerCardModal());
        UIUtilities.safeAddEventListener(modal, 'click', UIUtilities.createModalClickOutsideHandler(modal));

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePowerCardModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // Close power card modal
    closePowerCardModal() {
        const modal = document.getElementById('power-card-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Utility function to find player element accounting for active player positioning
    findPlayerElement(playerId) {
        // Try cache first for better performance
        let playerElement = this._getCachedPlayerDashboard(playerId);
        if (!playerElement) {
            // Fallback to manual queries if not in cache
            playerElement = document.querySelector(`#players-container [data-player-id="${playerId}"]`);
            if (!playerElement) {
                // If not found, check if it's moved to body (active player)
                playerElement = document.querySelector(`body > .player-dashboard[data-player-id="${playerId}"]`);
            }
            // Cache the found element
            if (playerElement) {
                this.playerDashboards.set(playerId, playerElement);
            }
        }
        return playerElement;
    }

    // Animate player entering Tokyo
    animatePlayerToTokyo(data) {
        console.log('Animating player to Tokyo:', data);
        
        // Find the player card using utility function
        const playerCard = this.findPlayerElement(data.playerId);
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        
        if (!playerCard || !tokyoSlot) {
            console.error('Could not find player card or Tokyo slot for animation', {
                playerId: data.playerId,
                location: data.location,
                playerCardFound: !!playerCard,
                tokyoSlotFound: !!tokyoSlot,
                playerCardParent: playerCard?.parentNode?.id || playerCard?.parentNode?.tagName
            });
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        // Create a clone of the monster avatar for animation
        const monsterAvatar = playerCard.querySelector('.monster-avatar');
        if (!monsterAvatar) {
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        const clone = monsterAvatar.cloneNode(true);
        clone.classList.add('tokyo-animation');
        
        // Get positions
        const playerRect = monsterAvatar.getBoundingClientRect();
        const tokyoRect = tokyoSlot.getBoundingClientRect();
        
        // Position clone at player position
        clone.style.position = 'fixed';
        clone.style.left = playerRect.left + 'px';
        clone.style.top = playerRect.top + 'px';
        clone.style.width = playerRect.width + 'px';
        clone.style.height = playerRect.height + 'px';
        clone.style.zIndex = '9999';
        clone.style.transition = 'all 1s ease-in-out';
        clone.style.transform = 'scale(1.2)';
        
        document.body.appendChild(clone);
        
        // Animate to Tokyo position
        setTimeout(() => {
            clone.style.left = tokyoRect.left + (tokyoRect.width - playerRect.width) / 2 + 'px';
            clone.style.top = tokyoRect.top + (tokyoRect.height - playerRect.height) / 2 + 'px';
            clone.style.transform = 'scale(1.5) rotate(360deg)';
        }, 50);
        
        // Clean up and update display
        setTimeout(() => {
            clone.remove();
            this.updateTokyoDisplay(this.game.getGameState());
            UIUtilities.showMessage(`${data.monster.name} enters Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`, 3000, this.elements);
        }, 1050);
    }

    // Animate player leaving Tokyo
    animatePlayerFromTokyo(data) {
        console.log('Animating player from Tokyo:', data);
        
        // Find the Tokyo slot and player card using utility function
        const tokyoSlot = data.location === 'city' 
            ? document.getElementById('tokyo-city-monster')
            : document.getElementById('tokyo-bay-monster');
        const playerCard = this.findPlayerElement(data.playerId);
        
        if (!tokyoSlot || !playerCard) {
            console.error('Could not find Tokyo slot or player card for leave animation', {
                playerId: data.playerId,
                location: data.location,
                tokyoSlotFound: !!tokyoSlot,
                playerCardFound: !!playerCard
            });
            this.updateTokyoDisplay(this.game.getGameState());
            return;
        }
        
        // Create animation effect
        const currentMonster = tokyoSlot.querySelector('.tokyo-monster');
        if (currentMonster) {
            currentMonster.style.transition = 'all 0.8s ease-out';
            currentMonster.style.transform = 'scale(0.8) translateY(-20px)';
            currentMonster.style.opacity = '0';
        }
        
        // Clean up and update display
        setTimeout(() => {
            this.updateTokyoDisplay(this.game.getGameState());
            UIUtilities.showMessage(`${data.monster.name} leaves Tokyo ${data.location === 'city' ? 'City' : 'Bay'}!`, 3000, this.elements);
        }, 800);
    }

    // Update Tokyo display
    updateTokyoDisplay(gameState) {
        // Tokyo City
        if (gameState.tokyoCity) {
            const player = gameState.players.find(p => p.id === gameState.tokyoCity);
            
            this.elements.tokyoCitySlot.innerHTML = `
                <div class="tokyo-monster">
                    <div class="monster-avatar" data-monster="${player.monster.id}">
                        <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                    </div>
                    <div class="monster-name">${player.monster.name}</div>
                </div>
            `;
            this.elements.tokyoCitySlot.classList.add('occupied');
            this.elements.tokyoCitySlot.setAttribute('data-monster', player.monster.id);
            this.elements.tokyoCitySlot.setAttribute('data-player-id', player.id); // Add player ID for hover logic
            
            // Set CSS custom properties for monster-specific colors
            if (player.monster.color) {
                const monsterColor = player.monster.color;
                const lighterColor = UIUtilities.lightenColor(monsterColor, 20);
                const glowColor = UIUtilities.hexToRgba(monsterColor, 0.4);
                const strongGlowColor = UIUtilities.hexToRgba(monsterColor, 0.7);
                
                const tokyoMonster = this.elements.tokyoCitySlot.querySelector('.tokyo-monster');
                if (tokyoMonster) {
                    tokyoMonster.style.setProperty('--monster-color', monsterColor);
                    tokyoMonster.style.setProperty('--monster-color-light', lighterColor);
                    tokyoMonster.style.setProperty('--monster-glow-color', glowColor);
                    tokyoMonster.style.setProperty('--monster-glow-strong', strongGlowColor);
                }
            }
        } else {
            this.elements.tokyoCitySlot.innerHTML = '<div class="empty-slot">Empty</div>';
            this.elements.tokyoCitySlot.classList.remove('occupied');
            this.elements.tokyoCitySlot.removeAttribute('data-monster'); // Remove monster data when empty
        }

        // Tokyo Bay (for 5-6 players)
        if (gameState.players.length >= 5) {
            if (gameState.tokyoBay) {
                const player = gameState.players.find(p => p.id === gameState.tokyoBay);
                
                this.elements.tokyoBaySlot.innerHTML = `
                    <div class="tokyo-monster">
                        <div class="monster-avatar" data-monster="${player.monster.id}">
                            <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                        </div>
                        <div class="monster-name">${player.monster.name}</div>
                    </div>
                `;
                this.elements.tokyoBaySlot.classList.add('occupied');
                this.elements.tokyoBaySlot.setAttribute('data-monster', player.monster.id);
                this.elements.tokyoBaySlot.setAttribute('data-player-id', player.id); // Add player ID for hover logic
                
                // Set CSS custom properties for monster-specific colors
                if (player.monster.color) {
                    const monsterColor = player.monster.color;
                    const lighterColor = UIUtilities.lightenColor(monsterColor, 20);
                    const glowColor = UIUtilities.hexToRgba(monsterColor, 0.4);
                    const strongGlowColor = UIUtilities.hexToRgba(monsterColor, 0.7);
                    
                    const tokyoMonster = this.elements.tokyoBaySlot.querySelector('.tokyo-monster');
                    if (tokyoMonster) {
                        tokyoMonster.style.setProperty('--monster-color', monsterColor);
                        tokyoMonster.style.setProperty('--monster-color-light', lighterColor);
                        tokyoMonster.style.setProperty('--monster-glow-color', glowColor);
                        tokyoMonster.style.setProperty('--monster-glow-strong', strongGlowColor);
                    }
                }
            } else {
                this.elements.tokyoBaySlot.innerHTML = '<div class="empty-slot">Empty</div>';
                this.elements.tokyoBaySlot.classList.remove('occupied');
                this.elements.tokyoBaySlot.removeAttribute('data-monster'); // Remove monster data when empty
                this.elements.tokyoBaySlot.removeAttribute('data-player-id'); // Remove player ID when empty
            }
        }
        
        // Remove any existing hover event listeners to prevent duplicates
        this.removeTokyoHoverListeners();
        
        // Add hover event listeners for Tokyo hover effects
        this.setupTokyoHoverEffects(gameState);
    }
    
    // Remove existing Tokyo hover listeners
    removeTokyoHoverListeners() {
        // Clone and replace elements to remove all event listeners
        const tokyoCitySlot = this.elements.tokyoCitySlot;
        const tokyoBaySlot = this.elements.tokyoBaySlot;
        
        if (tokyoCitySlot) {
            const newTokyoCitySlot = tokyoCitySlot.cloneNode(true);
            tokyoCitySlot.parentNode.replaceChild(newTokyoCitySlot, tokyoCitySlot);
            this.elements.tokyoCitySlot = newTokyoCitySlot;
        }
        
        if (tokyoBaySlot) {
            const newTokyoBaySlot = tokyoBaySlot.cloneNode(true);
            tokyoBaySlot.parentNode.replaceChild(newTokyoBaySlot, tokyoBaySlot);
            this.elements.tokyoBaySlot = newTokyoBaySlot;
        }
    }
    
    // Setup hover effects for Tokyo areas
    setupTokyoHoverEffects(gameState) {
        const currentPlayerId = gameState.currentPlayer;
        
        // Setup Tokyo City hover
        const tokyoCitySlot = this.elements.tokyoCitySlot;
        if (tokyoCitySlot.classList.contains('occupied')) {
            const tokyoPlayerId = tokyoCitySlot.getAttribute('data-player-id');
            
            tokyoCitySlot.addEventListener('mouseenter', () => {
                this.handleTokyoHover(tokyoPlayerId, currentPlayerId);
            });
            
            tokyoCitySlot.addEventListener('mouseleave', () => {
                this.handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId);
            });
        }
        
        // Setup Tokyo Bay hover
        const tokyoBaySlot = this.elements.tokyoBaySlot;
        if (tokyoBaySlot.classList.contains('occupied')) {
            const tokyoPlayerId = tokyoBaySlot.getAttribute('data-player-id');
            
            tokyoBaySlot.addEventListener('mouseenter', () => {
                this.handleTokyoHover(tokyoPlayerId, currentPlayerId);
            });
            
            tokyoBaySlot.addEventListener('mouseleave', () => {
                this.handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId);
            });
        }
    }
    
    // Handle Tokyo hover effect
    handleTokyoHover(tokyoPlayerId, currentPlayerId) {
        if (tokyoPlayerId === currentPlayerId) {
            // If the active player is in Tokyo, wiggle their active card
            const activePlayerCard = document.querySelector('.player-dashboard.active');
            if (activePlayerCard) {
                activePlayerCard.classList.add('tokyo-active-wiggle');
            }
        } else {
            // If a different player is in Tokyo, highlight their card and vertically collapse surrounding cards
            const playerCard = document.querySelector(`.player-dashboard[data-player-id="${tokyoPlayerId}"]`);
            if (playerCard) {
                this.verticallyCollapseSurroundingCards(playerCard);
                playerCard.classList.add('tokyo-highlight');
            }
        }
    }
    
    // Handle Tokyo hover end effect with proper z-index management
    handleTokyoHoverEnd(tokyoPlayerId, currentPlayerId) {
        if (tokyoPlayerId === currentPlayerId) {
            // Remove wiggle from active player card
            const activePlayerCard = document.querySelector('.player-dashboard.active');
            if (activePlayerCard) {
                activePlayerCard.classList.remove('tokyo-active-wiggle');
            }
        } else {
            // Smooth return with proper z-index and vertical collapse for the player card in stack
            const playerCard = document.querySelector(`.player-dashboard[data-player-id="${tokyoPlayerId}"]`);
            if (playerCard) {
                this.smoothReturnWithVerticalCollapse(playerCard);
            }
        }
    }
    
    // Vertically collapse surrounding cards to create empty space
    verticallyCollapseSurroundingCards(targetCard) {
        const allNonActiveCards = document.querySelectorAll('.player-dashboard:not(.active)');
        const cards = Array.from(allNonActiveCards);
        const targetIndex = cards.indexOf(targetCard);
        
        if (targetIndex === -1) return;
        
        // Collapse cards before the target upward (they get pushed up and out of the way)
        for (let i = 0; i < targetIndex; i++) {
            cards[i].classList.add('collapse-up');
            cards[i].classList.remove('expand-back-normal');
        }
        
        // Collapse cards after the target downward (they get pushed down and out of the way)
        for (let i = targetIndex + 1; i < cards.length; i++) {
            cards[i].classList.add('collapse-down');
            cards[i].classList.remove('expand-back-normal');
        }
    }
    
    // Smooth return with vertical collapse and z-index management
    smoothReturnWithVerticalCollapse(targetCard) {
        const allNonActiveCards = document.querySelectorAll('.player-dashboard:not(.active)');
        const cards = Array.from(allNonActiveCards);
        const targetIndex = cards.indexOf(targetCard);
        
        if (targetIndex === -1) return;
        
        // Find the card that will be in front of this one after it returns
        let cardInFront = null;
        if (targetIndex > 0) {
            cardInFront = cards[targetIndex - 1];
        }
        
        // Set the z-index to be 1 less than the card in front, or a low value if it's the first card
        let newZIndex = 1;
        if (cardInFront) {
            const frontCardZIndex = parseInt(window.getComputedStyle(cardInFront).zIndex) || 10;
            newZIndex = frontCardZIndex - 1;
        }
        
        // Apply the new z-index immediately before starting the return animation
        targetCard.style.zIndex = newZIndex;
        
        // Remove the highlight class and add return transition
        targetCard.classList.remove('tokyo-highlight');
        targetCard.classList.add('tokyo-return-behind');
        
        // After the target card has returned to the empty space, expand surrounding cards back to normal
        setTimeout(() => {
            // Expand back cards that were collapsed upward
            for (let i = 0; i < targetIndex; i++) {
                cards[i].classList.remove('collapse-up');
                cards[i].classList.add('expand-back-normal');
            }
            
            // Expand back cards that were collapsed downward
            for (let i = targetIndex + 1; i < cards.length; i++) {
                cards[i].classList.remove('collapse-down');
                cards[i].classList.add('expand-back-normal');
            }
        }, 250); // Wait for the target card to settle into the empty space
        
        // Clean up all classes after animations complete
        setTimeout(() => {
            targetCard.classList.remove('tokyo-return-behind');
            targetCard.style.zIndex = ''; // Reset to default
            
            // Clean up collapse classes
            allNonActiveCards.forEach(card => {
                card.classList.remove('collapse-up', 'collapse-down', 'expand-back-normal');
            });
        }, 900);
    }

    // Initialize dice container with the maximum number of dice elements
    initializeDiceContainer(maxDice = 8) {
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) return;

        // Clear and create dice elements once
        diceContainer.innerHTML = '';
        
        for (let i = 0; i < maxDice; i++) {
            const die = document.createElement('div');
            die.className = 'die'; // Apply the proper CSS class
            die.id = `die-${i}`;
            die.dataset.dieId = `die-${i}`;
            die.textContent = '?';
            die.style.display = 'none'; // Hidden by default
            
            // Apply any additional styling that might be needed
            die.setAttribute('data-value', '?');
            
            diceContainer.appendChild(die);
        }

        // Add event listener once to the container (event delegation)
        diceContainer.addEventListener('click', (event) => {
            const dieElement = event.target.closest('.die');
            if (dieElement && !dieElement.classList.contains('disabled') && !dieElement.classList.contains('roll-off-mode')) {
                const dieId = dieElement.dataset.dieId;
                window.UI && window.UI._debug && window.UI._debug('Dice clicked:', dieId);
                
                if (this.game && this.game.diceCollection) {
                    const isSelected = this.game.diceCollection.toggleDiceSelection(dieId);
                    
                    if (isSelected) {
                        dieElement.classList.add('selected');
                    } else {
                        dieElement.classList.remove('selected');
                    }
                    
                    this.updateDiceControls();
                }
            }
        });

        window.UI && window.UI._debug && window.UI._debug(`🎲 Initialized dice container with ${maxDice} dice elements`);
    }

    // Update dice display by modifying existing elements
    updateDiceDisplay(diceData, isRollOffMode = false) {
        if (this.debugMode) {
            this._debug('updateDiceDisplay called with data:', diceData.map(d => ({ id: d.id, face: d.face, symbol: d.symbol })));
        }
        
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) return;

        // The dice data passed in should already be filtered to the correct number
        // No need to filter here - that's the responsibility of the caller
        const dicesToDisplay = diceData;

        // Get all dice elements
        const diceElements = diceContainer.querySelectorAll('.die');
        
        // Hide all dice elements first
        diceElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // Track whether any dice still rolling for context logic
        let anyRolling = false;
        // Update and show only the dice elements we need
        dicesToDisplay.forEach((dieData, index) => {
            const dieElement = diceElements[index];
            if (dieElement) {
                // Update content - show previous dice values during animation
                let displaySymbol;
                if (dieData.isRolling) {
                    anyRolling = true;
                    // During animation: show previous face (or ? if first roll ever)
                    if (dieData.previousFace === null || dieData.previousFace === undefined) {
                        displaySymbol = '?'; // First roll ever - no previous face
                    } else {
                        try {
                            displaySymbol = this.getDieFaceSymbol(dieData.previousFace); // Show previous face during animation
                        } catch (error) {
                            console.warn('Error getting previous face symbol:', dieData.previousFace, error);
                            displaySymbol = '?'; // Fallback to question mark
                        }
                    }
                } else {
                    // Not rolling: show current face (or ? if never rolled)
                    displaySymbol = dieData.symbol || '?';
                }
                dieElement.textContent = displaySymbol;
                
                // Update classes - build the class string exactly like the old createDiceHTML
                dieElement.className = `die${dieData.isSelected ? ' selected' : ''}${dieData.isRolling ? ' rolling' : ''}${dieData.isDisabled ? ' disabled' : ''}`;
                if (isRollOffMode) dieElement.classList.add('roll-off-mode');
                
                // Update data attributes
                dieElement.dataset.dieId = dieData.id;
                dieElement.setAttribute('data-value', dieData.symbol || '?');
                
                // Show the element AFTER updating all its properties
                dieElement.style.display = 'inline-flex'; // Use inline-flex to match CSS
            }
        });

        if (this.debugMode) {
            this._debug(`🎲 Updated ${dicesToDisplay.length} dice elements`);
        }
    }

    // Update initial dice display (empty dice)
    updateInitialDiceDisplay() {
        if (!this.game) {
            if (this.debugMode) {
                this._debug('No game instance for dice display');
            }
            return;
        }
        
        if (this.debugMode) {
            this._debug('🎲 updateInitialDiceDisplay called');
        }
        const diceData = this.game.diceCollection.getAllDiceData();
        if (this.debugMode) {
            this._debug('🎲 Dice data retrieved:', diceData.map(d => ({ id: d.id, face: d.face, symbol: d.symbol })));
        }
        
        // Check if any dice have null faces
        const hasNullFaces = diceData.some(d => d.face === null && !d.isDisabled);
        if (hasNullFaces && this.debugMode) {
            this._debug('🎲 INFO: Some dice have null faces (unrolled state) - showing question marks');
            this._debug('🎲 Turn phase:', this.game.currentTurnPhase);
            this._debug('🎲 Dice roller state:', this.game.diceRoller.getState());
        }
        
        this.updateDiceDisplay(diceData);
        
        // Refresh dice cache after display update
        this._refreshDiceElementCache();
    }

    // Update dice controls
    updateDiceControls() {
        if (this.debugMode) {
            this._debug('updateDiceControls called, game exists:', !!this.game);
        }
        if (!this.game) {
            if (this.debugMode) {
                this._debug('No game instance in updateDiceControls, returning');
            }
            return;
        }

        const diceState = this.game.diceRoller.getState();
        const gameState = this.game.getGameState();
        
        if (this.debugMode) {
            this._debug('updateDiceControls - rollsRemaining:', diceState.rollsRemaining);
        }
        
        // Update rolls left
        this.elements.rollsLeft.textContent = `Rolls left: ${diceState.rollsRemaining}`;
        
        // Check if CPU is currently rolling
        const isCPURolling = gameState.currentPlayer && 
                           gameState.currentPlayer.playerType === 'cpu' && 
                           gameState.turnPhase === 'rolling' && 
                           !gameState.currentPlayer.isEliminated;
        
        // Update action menu state based on CPU rolling
        this.updateActionMenuState(isCPURolling);
        
        // Update button states
        const isCurrentPlayerEliminated = gameState.currentPlayer && gameState.currentPlayer.isEliminated;
        const isHumanPlayerTurn = gameState.currentPlayer && gameState.currentPlayer.playerType === 'human' && !isCurrentPlayerEliminated;
        
        // Only enable buttons if it's a human player's turn
        const canRoll = isHumanPlayerTurn && diceState.canRoll && gameState.turnPhase === 'rolling';
        const canKeep = isHumanPlayerTurn && gameState.turnPhase === 'rolling' && diceState.rollsRemaining < 3 && diceState.rollsRemaining > 0;
        const canEndTurn = isHumanPlayerTurn && (gameState.turnPhase === 'resolving' || 
                          (gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0));
        
        // Debug logging for 5+ player game issues
        if (gameState.players && gameState.players.length >= 5) {
            this._debug('MULTI-PLAYER BUTTON DEBUG:', {
                currentPlayerIndex: gameState.currentPlayerIndex,
                currentPlayerName: gameState.currentPlayer ? gameState.currentPlayer.monster.name : 'none',
                currentPlayerType: gameState.currentPlayer ? gameState.currentPlayer.playerType : 'none',
                turnPhase: gameState.turnPhase,
                rollsRemaining: diceState.rollsRemaining,
                diceCanRoll: diceState.canRoll,
                isEliminated: isCurrentPlayerEliminated,
                canRoll: canRoll,
                canKeep: canKeep,
                canEndTurn: canEndTurn,
                rollButtonDisabled: this.elements.rollDiceBtn.disabled,
                aboutToSetRollButtonTo: !canRoll
            });
        }
        
        // Debug logging for 6-player game issues
        if (gameState.players && gameState.players.length === 6) {
            this._debug('6-PLAYER DEBUG:', {
                currentPlayerIndex: gameState.currentPlayerIndex,
                currentPlayerName: gameState.currentPlayer ? gameState.currentPlayer.monster.name : 'none',
                turnPhase: gameState.turnPhase,
                rollsRemaining: diceState.rollsRemaining,
                canEndTurn: canEndTurn,
                isCurrentPlayerEliminated: isCurrentPlayerEliminated,
                pendingDecisions: gameState.pendingDecisions ? gameState.pendingDecisions.length : 'undefined',
                diceEffectsResolved: gameState.diceEffectsResolved
            });
        }
        
        // Players can buy cards when dice are resolved and they have energy (local game)
        const diceResolved = gameState.turnPhase === 'resolving';
        const hasEnergy = gameState.currentPlayer && gameState.currentPlayer.energy > 0;
        const canBuyCards = isHumanPlayerTurn && diceResolved && hasEnergy;
        
        window.UI && window.UI._debug && window.UI._debug('Button states:', {
            turnPhase: gameState.turnPhase,
            rollsRemaining: diceState.rollsRemaining,
            currentPlayerEliminated: isCurrentPlayerEliminated,
            isHumanPlayerTurn: isHumanPlayerTurn,
            currentPlayerType: gameState.currentPlayer ? gameState.currentPlayer.playerType : 'none',
            canRoll,
            canKeep,
            canEndTurn,
            canBuyCards,
            currentPlayerEnergy: gameState.currentPlayer ? gameState.currentPlayer.energy : 0,
            endTurnBtnExists: !!this.elements.endTurnBtn
        });
        
        this.elements.rollDiceBtn.disabled = !canRoll;
        this.elements.keepDiceBtn.disabled = !canKeep;
        // this.elements.buyCardsBtn.disabled = !canBuyCards;
        
        // Extra safety: If it's not a human player's turn, force all buttons disabled
        if (!isHumanPlayerTurn) {
            this.elements.rollDiceBtn.disabled = true;
            this.elements.keepDiceBtn.disabled = true;
            if (this.elements.endTurnBtn) {
                this.elements.endTurnBtn.disabled = true;
            }
        }
        
        // Update End Turn button
        if (this.elements.endTurnBtn) {
            window.UI && window.UI._debug && window.UI._debug('Setting endTurnBtn disabled to:', !canEndTurn);
            // Extra debugging for 6-player games
            if (gameState.players && gameState.players.length === 6) {
                this._debug('END TURN BUTTON DEBUG:', {
                    buttonExists: true,
                    buttonDisabled: this.elements.endTurnBtn.disabled,
                    newDisabledState: !canEndTurn,
                    canEndTurnCalculation: canEndTurn,
                    isHumanPlayerTurn: isHumanPlayerTurn,
                    turnPhaseCheck: gameState.turnPhase === 'resolving',
                    rollsCheck: gameState.turnPhase === 'rolling' && diceState.rollsRemaining === 0,
                    eliminatedCheck: !isCurrentPlayerEliminated
                });
            }
            this.elements.endTurnBtn.disabled = !canEndTurn;
            this.elements.endTurnBtn.textContent = 'End Turn';
        } else {
            console.error('endTurnBtn element not found!');
        }
        
        // Update button text
        if (diceState.rollsRemaining === 3) {
            this.elements.rollDiceBtn.textContent = 'Roll Dice';
        } else {
            this.elements.rollDiceBtn.textContent = 'Re-roll Unselected';
        }
    }

    // Update action menu state based on game conditions
    updateActionMenuState(isCPURolling) {
        if (!this.elements.actionMenu) return;
        
        if (isCPURolling) {
            // Visual feedback during CPU rolling but keep menu draggable
            this.elements.actionMenu.classList.add('cpu-rolling');
            this.elements.actionMenu.style.opacity = '0.6';
            window.UI && window.UI._debug && window.UI._debug('🎮 Action menu dimmed for CPU turn - still draggable');
        } else {
            // Re-enable action menu when CPU is not rolling
            this.elements.actionMenu.classList.remove('cpu-rolling');
            this.elements.actionMenu.style.opacity = '';
            window.UI && window.UI._debug && window.UI._debug('🎮 Action menu restored - human turn');
        }
    }

    // Initialize DOM element caches for frequently accessed elements
    _initializeDOMCaches() {
        // Clear existing caches
        this.playerDashboards.clear();
        this.diceElements.clear();
        this.monsterCards.clear();
        
        // Cache initial player dashboards
        this._refreshPlayerDashboardCache();
        
        // Cache dice elements
        this._refreshDiceElementCache();
        
        console.log('🔧 DOM caches initialized');
    }
    
    // Initialize debug mode based on URL params or localStorage
    _initializeDebugMode() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            localStorage.setItem('kot-debug', 'true');
            return true;
        }
        if (urlParams.get('debug') === 'false') {
            localStorage.setItem('kot-debug', 'false');
            return false;
        }
        
        // Check localStorage
        const stored = localStorage.getItem('kot-debug');
        if (stored !== null) {
            return stored === 'true';
        }
        
        // Default to false in production
        return false;
    }
    
    // Debug logging methods with different levels
    _debug(message, ...args) {
        if (this.debugMode) {
            console.log(`🐛 ${message}`, ...args);
        }
    }
    
    _debugVerbose(message, ...args) {
        if (this.debugMode) {
            console.log(`🔍 ${message}`, ...args);
        }
    }
    
    _debugPerformance(message, ...args) {
        if (this.debugMode) {
            console.log(`⚡ ${message}`, ...args);
        }
    }
    
    _debugCache(message, ...args) {
        if (this.debugMode) {
            console.log(`🔧 ${message}`, ...args);
        }
    }
    
    // Public method to toggle debug mode
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        localStorage.setItem('kot-debug', this.debugMode.toString());
        window.UI && window.UI._debug && window.UI._debug(`🎮 Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        return this.debugMode;
    }
    
    // Test function for ailment token system
    testAilmentTokens() {
        if (!this.game || !this.game.players) {
            console.warn('⚠️ Game not initialized - cannot test ailment tokens');
            return;
        }
        
        console.log('🧪 Testing ailment token system...');
        
        // Get first two players for testing
        const player1 = this.game.players[0];
        const player2 = this.game.players[1];
        
        if (!player1 || !player2) {
            console.warn('⚠️ Need at least 2 players for ailment testing');
            return;
        }
        
        // Test Shrink Ray effect
        console.log(`🔬 Applying Shrink Ray to ${player1.monster.name}...`);
        if (!player1.ailmentTokens) player1.ailmentTokens = {};
        player1.ailmentTokens.shrink = (player1.ailmentTokens.shrink || 0) + 1;
        player1.maxHealth = Math.max(1, player1.maxHealth - 2);
        if (player1.health > player1.maxHealth) {
            player1.health = player1.maxHealth;
        }
        
        // Test Poison Spit effect
        console.log(`🔬 Applying Poison Spit to ${player2.monster.name}...`);
        if (!player2.ailmentTokens) player2.ailmentTokens = {};
        player2.ailmentTokens.poison = (player2.ailmentTokens.poison || 0) + 1;
        
        // Update visual bookmarks
        this.updateAilmentBookmarks(player1);
        this.updateAilmentBookmarks(player2);
        
        // Show evil animations
        this.showEvilAnimation(player1.id, 'shrink');
        setTimeout(() => {
            this.showEvilAnimation(player2.id, 'poison');
        }, 1000);
        
        // Update player dashboards to reflect changes
        this.updatePlayerDisplay(player1);
        this.updatePlayerDisplay(player2);
        
        console.log('🧪 Ailment token test complete!');
        console.log(`Player states:`, {
            [player1.monster.name]: {
                health: player1.health,
                maxHealth: player1.maxHealth,
                ailmentTokens: player1.ailmentTokens
            },
            [player2.monster.name]: {
                health: player2.health,
                maxHealth: player2.maxHealth,
                ailmentTokens: player2.ailmentTokens,
                effectiveDiceCount: player2.getEffectiveDiceCount ? player2.getEffectiveDiceCount() : 'N/A'
            }
        });
        
        // Test healing after 3 seconds
        setTimeout(() => {
            console.log('🔬 Testing healing recovery...');
            player1.heal(1); // This should clear shrink tokens
            player2.heal(1); // This should clear poison tokens
            this.updateAilmentBookmarks(player1);
            this.updateAilmentBookmarks(player2);
            this.updatePlayerDisplay(player1);
            this.updatePlayerDisplay(player2);
            console.log('🧪 Healing test complete!');
        }, 3000);
    }
    
    // Refresh player dashboard cache
    _refreshPlayerDashboardCache() {
        this.playerDashboards.clear();
        const dashboards = document.querySelectorAll('.player-dashboard[data-player-id]');
        dashboards.forEach(dashboard => {
            const playerId = dashboard.dataset.playerId;
            if (playerId) {
                this.playerDashboards.set(playerId, dashboard);
            }
        });
        console.log(`🔧 Cached ${this.playerDashboards.size} player dashboards`);
    }
    
    // Refresh dice element cache
    _refreshDiceElementCache() {
        this.diceElements.clear();
        const diceElements = document.querySelectorAll('.die[data-die-id]');
        diceElements.forEach(die => {
            const dieId = die.dataset.dieId;
            if (dieId) {
                this.diceElements.set(dieId, die);
            }
        });
        window.UI && window.UI._debug && window.UI._debug(`🔧 Cached ${this.diceElements.size} dice elements`);
    }
    
    // Get cached player dashboard
    _getCachedPlayerDashboard(playerId) {
        let dashboard = this.playerDashboards.get(playerId);
        if (!dashboard) {
            // Cache miss - query and cache it
            dashboard = document.querySelector(`[data-player-id="${playerId}"]`);
            if (dashboard) {
                this.playerDashboards.set(playerId, dashboard);
                console.log(`🔧 Cache miss - cached dashboard for player ${playerId}`);
            }
        }
        return dashboard;
    }
    
    // Get cached dice element
    _getCachedDiceElement(dieId) {
        let die = this.diceElements.get(dieId);
        if (!die) {
            // Cache miss - query and cache it
            die = document.querySelector(`[data-die-id="${dieId}"]`);
            if (die) {
                this.diceElements.set(dieId, die);
                window.UI && window.UI._debug && window.UI._debug(`🔧 Cache miss - cached dice element ${dieId}`);
            }
        }
        return die;
    }
    
    // Public method for game.js to access cached dice elements
    getDiceElement(dieId) {
        return this._getCachedDiceElement(dieId);
    }

    // Handle dice roll complete
    handleDiceRollComplete(data) {
        this.updateDiceControls();
        
        if (data.rollsLeft === 0) {
            UIUtilities.showMessage('No more rolls! Resolving dice effects...', 1400, this.elements);
            // Show next message after first one is almost done
            setTimeout(() => {
                UIUtilities.showMessage('Dice effects resolved! You can buy cards or end turn.', 3000, this.elements);
            }, 1500);
        }

        // Continue CPU turn if current player is CPU AND we have an active CPU turn state
        // NOTE: Disabled legacy CPU processing - new AI system handles CPU turns directly
        const currentPlayer = this.game.getCurrentPlayer();
        if (false && currentPlayer && 
            currentPlayer.playerType === 'cpu' && 
            this.cpuTurnState && 
            this.cpuTurnState.player && 
            this.cpuTurnState.player.id === currentPlayer.id) {
            setTimeout(() => {
                if (this.cpuTurnState) { // Double check state still exists
                    this.cpuTurnState.isProcessing = false;
                    this.processCPUTurn();
                }
            }, 1000);
        }
    }

    // Update turn phase
    updateTurnPhase(data) {
        window.UI && window.UI._debug && window.UI._debug('updateTurnPhase called with data:', data);
        const phase = data.phase || data; // Handle both object and string formats
        console.log('Updating to phase:', phase);
        
        switch (phase) {
            case 'resolving':
                UIUtilities.showMessage('Dice effects resolved! You can buy cards or end turn.', 3000, this.elements);
                break;
            case 'buying':
                UIUtilities.showMessage('Buy power cards or end turn', 3000, this.elements);
                this.updateCardsDisplay();
                break;
        }
    }

    // Update cards display
    updateCardsDisplay() {
        if (!this.game) return;

        const gameState = this.game.getGameState();
        const currentPlayer = gameState.currentPlayer;
        
        this.elements.availableCards.innerHTML = gameState.availableCards.map(card => {
            // Calculate the actual cost including discounts
            let actualCost = this.game.calculateCardCost(currentPlayer.id, card.id);
            
            // Create cost display with styled "was" text
            let costDisplay = `⚡${actualCost}`;
            if (actualCost < card.cost) {
                costDisplay += `<span class="was-price">(was ${card.cost})</span>`;
            }
            
            return `
                <div class="power-card ${currentPlayer.energy >= actualCost ? 'affordable' : ''}" 
                     data-card-id="${card.id}" data-effect="${card.effect}">
                    <div class="card-cost">${costDisplay}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-description">${card.description}</div>
                </div>
            `;
        }).join('');

        // Attach card detail listeners (allow all players to view card details)
        this.elements.availableCards.querySelectorAll('.power-card').forEach(cardElement => {
            cardElement.addEventListener('click', () => {
                this.showCardDetails(cardElement.dataset.cardId);
            });
        });
    }

    // Show card details modal (for both viewing and purchasing)
    showCardDetails(cardId, cardsList = null, allowPurchase = true) {
        if (!this.game) return;

        const gameState = this.game.getGameState();
        const currentPlayer = gameState.currentPlayer; // currentPlayer is already the player object
        
        // Find card in the specified list or available cards
        const cardsToSearch = cardsList || gameState.availableCards;
        const card = cardsToSearch.find(c => c.id === cardId);
        
        if (!card) return;

        // Calculate actual cost for available cards, use original cost for owned cards
        let actualCost = card.cost;
        let costDisplay = `⚡${card.cost}`;
        
        if (!cardsList && currentPlayer) { // Only calculate discounts for available cards
            actualCost = this.game.calculateCardCost(currentPlayer.id, card.id);
            costDisplay = `⚡${actualCost}`;
            if (actualCost < card.cost) {
                costDisplay += `<span class="was-price">(was ${card.cost})</span>`;
            }
        }

        // Check if purchase is allowed based on game state (local game)
        const diceResolved = gameState.turnPhase === 'resolving';
        const hasEnergy = currentPlayer && currentPlayer.energy >= actualCost;
        const canPurchase = allowPurchase && diceResolved && hasEnergy;
        
        const showPurchaseButton = allowPurchase && !cardsList; // Only show for available cards, not player cards
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'card-purchase-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="card-purchase-modal">
                <div class="purchase-card-display power-card" data-effect="${card.effect}">
                    <div class="card-cost">${costDisplay}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-description">${card.description || card.effect}</div>
                </div>
                <div class="purchase-buttons">
                    ${showPurchaseButton ? `
                        <button class="purchase-btn" ${!canPurchase ? 'disabled' : ''} data-card-id="${card.id}">
                            ${!diceResolved ? 'Resolve Dice First' :
                              !hasEnergy ? 'Not Enough Energy' : 'Buy Card'}
                        </button>
                    ` : ''}
                    <button class="decline-btn">Close</button>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modalOverlay);

        // Add event listeners
        const purchaseBtn = modalOverlay.querySelector('.purchase-btn');
        const declineBtn = modalOverlay.querySelector('.decline-btn');

        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => {
                if (canPurchase && !purchaseBtn.disabled) {
                    // Disable button to prevent double-clicking
                    purchaseBtn.disabled = true;
                    purchaseBtn.textContent = 'Purchasing...';
                    
                    console.log(`🛍️ Purchase button clicked for card ${cardId}`);
                    this.buyCard(cardId);
                }
                document.body.removeChild(modalOverlay);
            });
        }

        declineBtn.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });

        // Close on backdrop click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });

        // Close on Escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modalOverlay);
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }

    // Backward compatibility - redirect old function name
    showCardPurchasePreview(cardId) {
        this.showCardDetails(cardId);
    }

    // Roll dice
    async rollDice() {
        window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: rollDice() called in main.js');
        window.UI && window.UI._debug && window.UI._debug('🎲 ROLL DICE BUTTON CLICKED - rollDice called, game exists:', !!this.game);
        if (!this.game) {
            window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: No game instance, returning');
            window.UI && window.UI._debug && window.UI._debug('🎲 No game instance, returning');
            return;
        }
        
        // Check if current player is eliminated
        const currentPlayer = this.game.getCurrentPlayer();
        window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: Current player for dice roll:', {
            name: currentPlayer?.monster?.name,
            playerType: currentPlayer?.playerType,
            isEliminated: currentPlayer?.isEliminated,
            gamePhase: this.game.gamePhase,
            turnPhase: this.game.currentTurnPhase
        });
        
        window.UI && window.UI._debug && window.UI._debug('🎲 Current player for dice roll:', {
            name: currentPlayer?.monster?.name,
            playerType: currentPlayer?.playerType,
            isEliminated: currentPlayer?.isEliminated,
            gamePhase: this.game.gamePhase,
            turnPhase: this.game.currentTurnPhase
        });
        
        if (currentPlayer && currentPlayer.isEliminated) {
            window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: Current player is eliminated, cannot roll dice');
            window.UI && window.UI._debug && window.UI._debug('⚠️ Current player is eliminated, cannot roll dice');
            UIUtilities.showMessage('Eliminated players cannot roll dice!', 3000, this.elements);
            return;
        }
        
        window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: About to disable roll button and call game.startRoll()');
        window.UI && window.UI._debug && window.UI._debug('🎲 Disabling roll dice button and calling game.startRoll()');
        this.elements.rollDiceBtn.disabled = true;
        await this.game.startRoll();
        // Mark first player's first roll occurrence
        if (this._firstPlayerIntroActive && !this._firstPlayerFirstRollOccurred) {
            const cp = this.game.getCurrentPlayer && this.game.getCurrentPlayer();
            if (cp && cp.id === this._firstPlayerId) {
                this._firstPlayerFirstRollOccurred = true;
                // Disable intro gating after first roll completes
                this._firstPlayerIntroActive = false;
            }
        }
        window.UI && window.UI._debug && window.UI._debug('🎯 ROLL DEBUG: game.startRoll() completed');
        // Button state will be updated by event callback
    }

    // Keep dice and end rolling
    keepDiceAndEndRolling() {
        if (!this.game) return;
        
        this.game.keepDiceAndResolve();
    }

    // End turn from UI - handles button state and calls game logic
    endTurnFromUI() {
        if (!this.game) return;
        
        // Prevent multiple UI endTurn calls (button management only)
        if (this.endingTurnInProgress) {
            return;
        }
        
        this.endingTurnInProgress = true;
        
        // Temporarily disable the button to prevent rapid clicking
        if (this.elements.endTurnBtn) {
            this.elements.endTurnBtn.disabled = true;
        }
        
        try {
            // Call game endTurn directly - all validation happens there
            this.game.endTurn();
        } finally {
            // Re-enable button after a short delay to prevent rapid clicking
            setTimeout(() => {
                if (this.elements.endTurnBtn) {
                    this.updateDiceControls(); // This will set the correct disabled state
                }
                this.endingTurnInProgress = false;
            }, 100);
        }
    }

    // Show card buying interface
    showCardBuyingInterface() {
        // TODO: Implement card buying interface
        console.log('Card buying interface not yet implemented');
    }

    // Buy a card
    buyCard(cardId, targetId = null) {
        console.log(`🛍️ main.js buyCard called: cardId=${cardId}, targetId=${targetId}`);
        if (!this.game) return;
        
        const currentPlayer = this.game.getCurrentPlayer();
        console.log(`🛍️ Current player: ${currentPlayer ? currentPlayer.monster.name : 'null'}`);
        
        const result = this.game.buyCard(currentPlayer.id, cardId, targetId);
        console.log(`🛍️ Purchase result:`, result);
        
        if (result.needsTarget) {
            console.log(`🛍️ Showing target selection modal`);
            // Show target selection modal
            this.showTargetSelectionModal(result.card, result.availableTargets);
        } else if (result.success) {
            console.log(`🛍️ Purchase successful, updating displays`);
            this.updateCardsDisplay();
            this.updateGameDisplay();
        } else {
            console.log(`🛍️ Purchase failed: ${result.reason || 'Not enough energy!'}`);
            UIUtilities.showMessage(result.reason || 'Not enough energy!', 3000, this.elements);
        }
    }

    // Show target selection modal
    showTargetSelectionModal(card, availableTargets) {
        const modalHtml = `
            <div class="target-selection-modal" id="target-selection-modal">
                <div class="target-selection-content">
                    <div class="target-selection-header">
                        <h2>Select Target for ${card.name}</h2>
                        <button class="target-selection-close-btn">&times;</button>
                    </div>
                    <div class="target-selection-description">
                        ${card.description}
                    </div>
                    <div class="target-selection-targets">
                        ${availableTargets.map(target => `
                            <div class="target-option" data-target-id="${target.id}">
                                <div class="target-name">${target.name}</div>
                                <div class="target-health">Health: ${target.health}/${target.maxHealth}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="target-selection-actions">
                        <button class="cancel-target-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        const modal = document.getElementById('target-selection-modal');
        const closeBtn = modal.querySelector('.target-selection-close-btn');
        const cancelBtn = modal.querySelector('.cancel-target-btn');
        const targetOptions = modal.querySelectorAll('.target-option');

        closeBtn.addEventListener('click', () => this.closeTargetSelectionModal());
        cancelBtn.addEventListener('click', () => this.closeTargetSelectionModal());
        
        targetOptions.forEach(option => {
            option.addEventListener('click', () => {
                const targetId = option.dataset.targetId;
                this.buyCard(card.id, targetId);
                this.closeTargetSelectionModal();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeTargetSelectionModal();
            }
        });

        // If all dice are stable (not rolling), capture summary for contextual thought bubbles
        if (!anyRolling && this.game && this.game.diceCollection) {
            try {
                const currentPlayer = this.game.getCurrentPlayer && this.game.getCurrentPlayer();
                if (currentPlayer && currentPlayer.id) {
                    const faces = this.game.diceCollection.dice
                        .filter(d => !d.isDisabled)
                        .map(d => d.face)
                        .filter(Boolean);
                    if (faces.length) {
                        const counts = faces.reduce((acc, f) => { acc[f] = (acc[f]||0)+1; return acc; }, {});
                        this._lastDiceSummary[currentPlayer.id] = { faces, counts, ts: Date.now() };
                    }
                }
            } catch(e) {
                console.warn('Dice summary update failed', e);
            }
        }
    }

    // Close target selection modal
    closeTargetSelectionModal() {
        const modal = document.getElementById('target-selection-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Show decision modal
    showDecisionModal(decision) {
        if (decision.type === 'tokyoExit') {
            // Get the player data
            const player = this.game.players.find(p => p.id === decision.playerId);
            const attacker = this.game.players.find(p => p.id === decision.attackerId);
            
            // Set modal content
            this.elements.decisionTitle.textContent = 'Tokyo Under Attack!';
            this.elements.decisionContext.textContent = `Attacked by ${attacker.monster.name}`;
            this.elements.decisionMessage.textContent = decision.message;
            
            // Set monster display
            this.elements.decisionMonster.innerHTML = `
                <div class="monster-avatar" style="background-color: ${player.monster.color}">
                    <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                </div>
                <div class="monster-name">${player.monster.name}</div>
            `;
            
            // Set button text
            this.elements.decisionOption1.textContent = 'Stay in Tokyo';
            this.elements.decisionOption2.textContent = 'Leave Tokyo';
            
            // Remove any existing event listeners
            this.elements.decisionOption1.onclick = null;
            this.elements.decisionOption2.onclick = null;
            
            // Remove old event listeners if they exist
            const oldHandlers = this.elements.decisionOption1.getAttribute('data-handlers-attached');
            if (oldHandlers) {
                // Clone and replace to remove all event listeners
                const newBtn1 = this.elements.decisionOption1.cloneNode(true);
                const newBtn2 = this.elements.decisionOption2.cloneNode(true);
                this.elements.decisionOption1.parentNode.replaceChild(newBtn1, this.elements.decisionOption1);
                this.elements.decisionOption2.parentNode.replaceChild(newBtn2, this.elements.decisionOption2);
                this.elements.decisionOption1 = newBtn1;
                this.elements.decisionOption2 = newBtn2;
            }
            
            // Add event listeners with debug logging using addEventListener
            this.elements.decisionOption1.addEventListener('click', (e) => {
                console.log('🔄 Stay button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'stay');
            });
            
            this.elements.decisionOption2.addEventListener('click', (e) => {
                console.log('🔄 Leave button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'leave');
            });
            
            // Mark handlers as attached
            this.elements.decisionOption1.setAttribute('data-handlers-attached', 'true');
            this.elements.decisionOption2.setAttribute('data-handlers-attached', 'true');
            
        } else if (decision.type === 'wingsDecision') {
            // Get the player data
            const player = this.game.players.find(p => p.id === decision.playerId);
            const attacker = this.game.players.find(p => p.id === decision.attackerId);
            
            // Set modal content
            this.elements.decisionTitle.textContent = 'Wings Power Card!';
            this.elements.decisionContext.textContent = `Being attacked by ${attacker.monster.name}`;
            this.elements.decisionMessage.textContent = decision.message;
            
            // Set monster display
            this.elements.decisionMonster.innerHTML = `
                <div class="monster-avatar" style="background-color: ${player.monster.color}">
                    <img src="${player.monster.image}" alt="${player.monster.name}" class="monster-avatar-image" />
                </div>
                <div class="monster-name">${player.monster.name}</div>
            `;
            
            // Set button text for Wings decision
            this.elements.decisionOption1.textContent = 'Use Wings (Flee Tokyo)';
            this.elements.decisionOption2.textContent = 'Stay and Take Damage';
            
            // Remove any existing event listeners
            this.elements.decisionOption1.onclick = null;
            this.elements.decisionOption2.onclick = null;
            
            // Remove old event listeners if they exist
            const oldHandlers = this.elements.decisionOption1.getAttribute('data-handlers-attached');
            if (oldHandlers) {
                // Clone and replace to remove all event listeners
                const newBtn1 = this.elements.decisionOption1.cloneNode(true);
                const newBtn2 = this.elements.decisionOption2.cloneNode(true);
                this.elements.decisionOption1.parentNode.replaceChild(newBtn1, this.elements.decisionOption1);
                this.elements.decisionOption2.parentNode.replaceChild(newBtn2, this.elements.decisionOption2);
                this.elements.decisionOption1 = newBtn1;
                this.elements.decisionOption2 = newBtn2;
            }
            
            // Add event listeners for Wings decision
            this.elements.decisionOption1.addEventListener('click', (e) => {
                console.log('🔄 Use Wings button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'flee');
            });
            
            this.elements.decisionOption2.addEventListener('click', (e) => {
                console.log('🔄 Stay and take damage button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.hideDecisionModal();
                this.game.handlePlayerDecision(decision.playerId, 'stay');
            });
            
            // Mark handlers as attached
            this.elements.decisionOption1.setAttribute('data-handlers-attached', 'true');
            this.elements.decisionOption2.setAttribute('data-handlers-attached', 'true');
        }
        
        // Show modal
        this.elements.decisionModal.classList.remove('hidden');
        
        // Force active player dashboard to have lower z-index to prevent interference
        const activePlayerDashboard = document.querySelector('.player-dashboard.active');
        if (activePlayerDashboard) {
            activePlayerDashboard.style.zIndex = '1';
            
            // Force all player cards to have lower z-index
            const allPlayerCards = document.querySelectorAll('.player-dashboard');
            allPlayerCards.forEach(card => {
                card.style.zIndex = '1';
            });
        }
    }

    // Hide decision modal
    hideDecisionModal() {
        console.log('🔄 hideDecisionModal called!');
        this.elements.decisionModal.classList.add('hidden');
        
        // Restore original z-index values
        const activePlayerDashboard = document.querySelector('.player-dashboard.active');
        if (activePlayerDashboard) {
            activePlayerDashboard.style.zIndex = ''; // Reset to CSS default
        }
        
        // Reset all player cards z-index
        const allPlayerCards = document.querySelectorAll('.player-dashboard');
        allPlayerCards.forEach(card => {
            card.style.zIndex = ''; // Reset to CSS default
        });
    }

    // Show game over modal
    showGameOverModal(data) {
        const winCondition = data.winCondition === 'victory_points' ? 'Victory Points' : 'Survival';
        
        this.elements.winnerAnnouncement.innerHTML = `
            <div class="victory-celebration">
                <div class="winner-monster-display">
                    <div class="monster-nameplate">
                        <h2>${data.winner.monster.name}</h2>
                        <div class="victory-badge">KING OF TOKYO!</div>
                    </div>
                </div>
                <div class="victory-stats">
                    <div class="win-condition">Victory by ${winCondition}</div>
                    <div class="final-stats">
                        <div class="stat-item">
                            <span class="stat-icon">🏆</span>
                            <span class="stat-value">${data.winner.victoryPoints}</span>
                            <span class="stat-label">Victory Points</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-value">${data.winner.health}</span>
                            <span class="stat-label">Health Remaining</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">⚡</span>
                            <span class="stat-value">${data.winner.energy}</span>
                            <span class="stat-label">Energy</span>
                        </div>
                    </div>
                </div>
                <div class="victory-message">${data.message}</div>
                <button id="new-game" class="btn primary">New Game</button>
            </div>
        `;
        this.elements.gameOverModal.classList.remove('hidden');
    }

    // Close game over modal and return to splash screen
    closeGameOverModal() {
        this.elements.gameOverModal.classList.add('hidden');
        
        // Perform comprehensive game reset
        this.performFullGameReset();
        
        // Return to splash screen
        UIUtilities.showSplashScreen(this.elements, this.setupManager);
    }

    // Perform comprehensive reset of all game state and UI
    performFullGameReset() {
        // Reset core game state
        this.game = null;
        this.selectedMonsters = [];
        this.currentPlayerCount = 4; // Reset to default
        this.tempSetupLog = [];
        this.previousRound = 1;
        this.playerTiles = [];
        this.draggedMonster = null;
        
        // Clear cached DOM element maps
        this.playerDashboards.clear();
        this.diceElements.clear();
        this.monsterCards.clear();
        
        // Reset UI elements to default state
        this.resetUIElements();
        
        // Reset setup manager state
        if (this.setupManager) {
            this.setupManager.currentPlayerCount = 2; // Reset to setup default
            this.setupManager.selectedMonsters = [];
            this.setupManager.playerTiles = [];
        }
        
        // Clear any active player container from previous game
        const existingActivePlayerContainer = document.getElementById('active-player-container');
        if (existingActivePlayerContainer) {
            console.log('🗑️ [DEBUG] Removing existingActivePlayerContainer during full reset');
            console.trace('TRACE: performFullGameReset removing active-player-container');
            existingActivePlayerContainer.remove();
        }
        
        // Reset game board classes
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            gameBoard.className = 'game-board'; // Reset to base class
        }
        
        // Hide game toolbar
        const gameToolbar = document.getElementById('game-toolbar');
        if (gameToolbar) {
            gameToolbar.classList.remove('show');
        }
        
        // Clear any notification messages
        const notification = document.getElementById('header-notification');
        if (notification) {
            notification.classList.remove('visible');
            notification.textContent = '';
        }
    }

    // Reset UI elements to their default state
    resetUIElements() {
        // Reset round counter
        if (this.elements.roundCounter) {
            this.elements.roundCounter.textContent = '1';
        }
        
        // Clear dice container
        if (this.elements.diceContainer) {
            const diceElements = this.elements.diceContainer.querySelectorAll('.die');
            diceElements.forEach(element => {
                element.style.display = 'none';
                element.className = 'die';
                element.textContent = '?';
            });
        }
        
        // Clear player dashboards container
        const playerDashboardsContainer = document.getElementById('player-dashboards');
        if (playerDashboardsContainer) {
            playerDashboardsContainer.innerHTML = '';
        }
        
        // Clear power cards area
        const powerCardsArea = document.getElementById('power-cards-area');
        if (powerCardsArea) {
            powerCardsArea.innerHTML = '';
        }
        
        // Clear game log
        const gameLogContent = document.getElementById('game-log-content');
        if (gameLogContent) {
            gameLogContent.innerHTML = '';
        }
        
        // Reset Tokyo areas
        const tokyoCityArea = document.getElementById('tokyo-city');
        if (tokyoCityArea) {
            tokyoCityArea.innerHTML = '<h3>Tokyo City</h3><div class="tokyo-placeholder">Empty</div>';
        }
        
        const tokyoBayArea = document.getElementById('tokyo-bay');
        if (tokyoBayArea) {
            tokyoBayArea.innerHTML = '<h3>Tokyo Bay</h3><div class="tokyo-placeholder">Empty</div>';
        }
        
        // Reset market cards
        const marketCardsContainer = document.querySelector('.market-cards');
        if (marketCardsContainer) {
            marketCardsContainer.innerHTML = '';
        }
        
        // Hide any modals that might be open
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
        
        // Reset any animation states
        const animatedElements = document.querySelectorAll('.rolling, .highlight, .selected');
        animatedElements.forEach(element => {
            element.classList.remove('rolling', 'highlight', 'selected');
        });
    }

    // Reset game
    resetGame() {
        this.elements.gameOverModal.classList.add('hidden');
        
        // Perform comprehensive game reset
        this.performFullGameReset();
        
        // Show setup modal for new game
        this.setupManager.showSetupModal();
    }

    // Exit to splash screen with confirmation
    exitToSplashScreen() {
        // Show the custom exit confirmation modal instead of system dialog
        this.showExitConfirmationModal();
    }

    // Show exit confirmation modal
    showExitConfirmationModal() {
        UIUtilities.showModal(this.elements.exitConfirmationModal);
    }

    // Hide exit confirmation modal
    hideExitConfirmationModal() {
        UIUtilities.hideModal(this.elements.exitConfirmationModal);
    }

    // Confirm exit to splash screen (called when user clicks "Exit to Menu")
    confirmExitToSplashScreen() {
        // Hide the confirmation modal first
        this.hideExitConfirmationModal();

        // Hide any open modals
        const modals = [
            this.elements.gameOverModal,
            this.elements.decisionModal,
            this.elements.gameLogModal,
            this.elements.storageMgmtModal,
            this.elements.settingsModal,
            this.elements.instructionsModal,
            this.elements.exitConfirmationModal
        ];
        
        modals.forEach(modal => {
            if (modal) {
                modal.classList.add('hidden');
            }
        });
        
        // Clean up game state
        this.game = null;
        this.selectedMonsters = [];
        
        // Return to splash screen
        UIUtilities.showSplashScreen(this.elements, this.setupManager);
    }

    // Show CPU action notification (more subtle than regular messages)
    showCPUActionNotification(data) {
        console.log(`CPU Action: ${data.message}`);
        
        // Clear any existing CPU notification timeout
        if (this.cpuNotificationTimeout) {
            clearTimeout(this.cpuNotificationTimeout);
        }
        
        // Get the notification row container instead of dice container
        const notificationRow = document.querySelector('.notification-row');
        
        // Create or update CPU notification
        let notification = document.getElementById('cpu-action-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cpu-action-notification';
            notification.className = 'cpu-action-notification';
            
            // Append to the notification row instead of dice area
            if (notificationRow) {
                notificationRow.appendChild(notification);
            } else {
                // Fallback to dice container if notification row not found
                const diceContainer = this.elements.diceContainer;
                diceContainer.parentNode.insertBefore(notification, diceContainer);
            }
        }
        
        // Set notification content with monster avatar
        const playerAvatar = data.player.monster ? 
            `<img src="${data.player.monster.image}" alt="${data.player.monster.name}" class="notification-avatar" />` : 
            '🤖';
            
        notification.innerHTML = `
            ${playerAvatar}
            <span class="notification-text">${data.message}</span>
        `;
        notification.classList.add('visible');
        
        // Auto-dismiss after 3 seconds
        this.cpuNotificationTimeout = setTimeout(() => {
            notification.classList.remove('visible');
            this.cpuNotificationTimeout = null;
        }, 3000);
        
        // Allow clicking to dismiss
        notification.onclick = () => {
            notification.classList.remove('visible');
            if (this.cpuNotificationTimeout) {
                clearTimeout(this.cpuNotificationTimeout);
                this.cpuNotificationTimeout = null;
            }
        };
    }

    // Add end turn button functionality - REMOVED
    // Button functionality moved to dice controls area
    addEndTurnButton() {
        // No longer creating duplicate end-turn button
        // End turn functionality is handled by the button in action-menu
    }

    // Animation helper functions
    animatePlayerAttacked(playerId) {
        window.UI && window.UI._debug && window.UI._debug('🔥 animatePlayerAttacked called for player:', playerId);
        window.UI && window.UI._debugVerbose && console.trace('🔥 Stack trace for animatePlayerAttacked:');
        
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
        
        if (playerElement) {
            window.UI && window.UI._debug && window.UI._debug('🔥 Found player element:', playerElement);
            window.UI && window.UI._debug && window.UI._debug('🔥 Element classes before animation:', Array.from(playerElement.classList));
            
            // Clear any existing attack animation first to prevent conflicts
            playerElement.classList.remove('player-attacked');
            
            // Clear any existing timeout for this player
            const timeoutKey = `attackTimeout_${playerId}`;
            if (this[timeoutKey]) {
                console.log('🔥 Clearing existing timeout for player:', playerId);
                clearTimeout(this[timeoutKey]);
                delete this[timeoutKey];
            }
            
            // Force a style recalculation to ensure class removal takes effect
            void playerElement.offsetHeight;
            
            window.UI && window.UI._debug && window.UI._debug('🔥 Adding player-attacked class to element:', playerElement);
            playerElement.classList.add('player-attacked');
            window.UI && window.UI._debug && window.UI._debug('🔥 Element classes after adding attack class:', Array.from(playerElement.classList));
            
            // Store the timeout reference so we can clear it if needed
            this[timeoutKey] = setTimeout(() => {
                window.UI && window.UI._debug && window.UI._debug('🔥 Timeout fired - attempting to remove player-attacked class from element:', playerElement);
                window.UI && window.UI._debug && window.UI._debug('🔥 Element classList before removal:', Array.from(playerElement.classList));
                console.log('🔥 Element computed style before removal - border:', getComputedStyle(playerElement).border);
                window.UI && window.UI._debug && window.UI._debug('🔥 Element computed style before removal - box-shadow:', getComputedStyle(playerElement).boxShadow);
                
                if (playerElement && playerElement.classList.contains('player-attacked')) {
                    playerElement.classList.remove('player-attacked');
                    window.UI && window.UI._debug && window.UI._debug('🔥 Successfully removed player-attacked class');
                    
                    // Force a style recalculation
                    void playerElement.offsetHeight;
                    
                    window.UI && window.UI._debug && window.UI._debug('🔥 Element classList after removal:', Array.from(playerElement.classList));
                    window.UI && window.UI._debug && window.UI._debug('🔥 Element computed style after removal - border:', getComputedStyle(playerElement).border);
                    window.UI && window.UI._debug && window.UI._debug('🔥 Element computed style after removal - box-shadow:', getComputedStyle(playerElement).boxShadow);
                } else {
                    window.UI && window.UI._debug && window.UI._debug('🔥 Class already removed, element changed, or element no longer exists');
                    if (playerElement) {
                        window.UI && window.UI._debug && window.UI._debug('🔥 Current classes on element:', Array.from(playerElement.classList));
                    }
                }
                delete this[timeoutKey];
            }, 1000);
            
            console.log('🔥 Set timeout with key:', timeoutKey);
        } else {
            console.log('🔥 Player element not found for playerId:', playerId);
        }
    }

    // Force cleanup of any stuck attack animations
    clearAllAttackAnimations() {
        window.UI && window.UI._debug && window.UI._debug('🔥 Clearing all attack animations...');
        const allPlayerElements = document.querySelectorAll('[data-player-id]');
        allPlayerElements.forEach(element => {
            if (element.classList.contains('player-attacked')) {
                console.log('🔥 Found stuck attack animation on element:', element);
                element.classList.remove('player-attacked');
            }
        });
        
        // Clear all attack timeouts
        Object.keys(this).forEach(key => {
            if (key.startsWith('attackTimeout_')) {
                console.log('🔥 Clearing timeout:', key);
                clearTimeout(this[key]);
                delete this[key];
            }
        });
    }

    animatePlayerHealing(playerId, healAmount) {
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
        if (!playerElement) return;

        // Create heart icon
        const heart = document.createElement('div');
        heart.className = 'healing-heart';
        heart.innerHTML = '💖';
        
        // Position relative to the health stat
        const healthStat = playerElement.querySelector('.stat.health');
        if (healthStat) {
            const rect = healthStat.getBoundingClientRect();
            heart.style.position = 'fixed';
            heart.style.left = (rect.left + rect.width / 2 - 20) + 'px';
            heart.style.top = (rect.top + 10) + 'px';
            heart.style.zIndex = '1000';
            
            document.body.appendChild(heart);
            
            // Remove after animation
            setTimeout(() => {
                if (heart.parentNode) {
                    heart.parentNode.removeChild(heart);
                }
            }, 1500);
            
            // Animate the health stat
            const healthValue = healthStat.querySelector('.stat-value');
            if (healthValue) {
                healthValue.classList.add('health-stat-increase');
                setTimeout(() => {
                    healthValue.classList.remove('health-stat-increase');
                }, 800);
            }
        }
    }

    animateVictoryPoints(playerId, pointsGained) {
        // Find player element using utility function
        const playerElement = this.findPlayerElement(playerId);
        if (!playerElement) return;

        // Create coin icon
        const coin = document.createElement('div');
        coin.className = 'victory-coin bouncing';
        coin.innerHTML = '🪙';
        
        // Position relative to the points stat
        const pointsStat = playerElement.querySelector('.stat.points');
        if (pointsStat) {
            const rect = pointsStat.getBoundingClientRect();
            coin.style.position = 'fixed';
            coin.style.left = (rect.left + rect.width / 2 - 25) + 'px';
            coin.style.top = (rect.top + 10) + 'px';
            coin.style.zIndex = '1000';
            
            document.body.appendChild(coin);
            
            // Remove after animation
            setTimeout(() => {
                if (coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            }, 2200);
            
            // Animate the points stat
            const pointsValue = pointsStat.querySelector('.stat-value');
            if (pointsValue) {
                pointsValue.classList.add('points-stat-increase');
                setTimeout(() => {
                    pointsValue.classList.remove('points-stat-increase');
                }, 800);
            }
        }
    }

    // Toolbar methods
    async showGameLog() {
        this.updateGameLogDisplay();
        this.elements.gameLogModal.classList.remove('hidden');
    }

    // Initialize tab switching functionality for game log
    initializeLogTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                this.switchLogTab(targetTab);
            });
        });

        // Initialize AI sub-tabs
        const aiSubTabButtons = document.querySelectorAll('.ai-sub-tab-btn');
        
        aiSubTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-ai-tab');
                this.switchAISubTab(targetTab);
            });
        });
    }

    // Switch between AI Decision and Reasoning sub-tabs
    switchAISubTab(targetTab) {
        // Update AI sub-tab buttons
        document.querySelectorAll('.ai-sub-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-ai-tab="${targetTab}"]`).classList.add('active');

        // Update AI sub-tab content
        document.querySelectorAll('.ai-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`ai-${targetTab}-tab`).classList.add('active');
    }

    // Switch between Game Flow and AI Logic tabs
    switchLogTab(targetTab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    }

    // Add AI logic entry to the AI Logic Flow tab
    addAILogicEntry(playerName, decision, analysis) {
        console.log('� AI LOGIC ENTRY CALLED!!!'); // Very obvious debug
        console.log('�🔍 DEBUG: addAILogicEntry called with:', {
            playerName: playerName,
            decision: decision,
            analysis: analysis,
            hasAiLogContent: !!this.elements.aiLogContent
        });
        
        if (!this.elements.aiLogContent) {
            console.error('No aiLogContent element found for AI logging');
            return;
        }

        try {
            const timestamp = new Date().toLocaleTimeString();
            const gameState = this.game.getGameState();
            const currentPlayer = this.game.getCurrentPlayer();
            
            // Parse the analysis to extract detailed information
            const analysisData = this.parseAIAnalysis(analysis);
            
            // Get or create turn container for this player's current turn
            const turnId = `turn-${gameState.round}-${currentPlayer.id}`;
            let turnContainer = document.getElementById(turnId);
            
            if (!turnContainer) {
                turnContainer = this.createTurnContainer(playerName, gameState, currentPlayer, turnId);
                this.elements.aiLogContent.appendChild(turnContainer);
            }
            
            // Add this roll as a child entry to the turn container
            const rollNumber = this.getRollNumberFromContainer(turnContainer) + 1;
            const rollEntry = this.createRollEntry(decision, analysisData, rollNumber, timestamp);
            
            const rollsContainer = turnContainer.querySelector('.ai-turn-rolls');
            rollsContainer.appendChild(rollEntry);

            // Update turn stats
            this.updateTurnStats(turnContainer, decision, analysisData);
        } catch (error) {
            console.error('Error in AI Logic Flow logging:', error);
        }
        
        // Auto-scroll to bottom if tab is active
        if (document.getElementById('ai-logic-tab').classList.contains('active')) {
            this.elements.aiLogContent.scrollTop = this.elements.aiLogContent.scrollHeight;
        }
    }

    createTurnContainer(playerName, gameState, currentPlayer, turnId) {
        const turnContainer = document.createElement('div');
        turnContainer.className = 'ai-turn-container';
        turnContainer.id = turnId;
        
        // Get player personality from AI config
        const playerPersonality = this.getPlayerPersonality(currentPlayer);
        
        turnContainer.innerHTML = `
            <div class="ai-turn-header">
                <div class="ai-turn-title">
                    <h3>Round ${gameState.round}</h3>
                    <div class="ai-turn-monster-name">${playerName}</div>
                </div>
                <div class="ai-turn-player-info">
                    <div class="ai-player-stats">
                        ${this.formatPlayerStatusWithEmojis(this.extractPlayerStatus(currentPlayer))}
                    </div>
                    <div class="ai-turn-position">
                        ${currentPlayer.isInTokyo ? '🏙️ In Tokyo' : '🏠 Outside Tokyo'}
                    </div>
                </div>
            </div>
            
            <div class="ai-turn-rolls">
                <!-- Roll entries will be added here -->
            </div>
            <div class="ai-turn-stats">
                <div class="stat roll-count">0</div>
                <div class="stat final-decision">Rolling...</div>
                <div class="stat avg-confidence">0%</div>
            </div>
        `;
        
        return turnContainer;
    }

    createRollEntry(decision, analysisData, rollNumber, timestamp) {
        const entryId = `roll-entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const rollEntry = document.createElement('div');
        rollEntry.className = 'ai-roll-entry';
        
        // Extract dice from analysis
        const diceArray = this.extractDiceFromAnalysis(analysisData);
        
        // Check if this is the first roll
        if (rollNumber === 1) {
            rollEntry.innerHTML = `
                <div class="ai-roll-header">
                    <div class="ai-roll-title">
                        Initial Dice Results
                    </div>
                </div>

                <div class="ai-roll-dice">
                    <div class="dice-outcome">
                        <strong>Initial Dice:</strong>
                        <div class="dice-outcome-container" id="ai-dice-${Date.now()}"></div>
                    </div>
                </div>
            `;

            // Add dice to the inner outcome container so they render horizontally
            const diceContainer = rollEntry.querySelector('.dice-outcome-container');
            if (diceContainer) {
                this.createMiniDice(diceArray, diceContainer);
            }
        } else {
            rollEntry.innerHTML = `
                <div class="ai-roll-header">
                    <div class="ai-roll-title">
                        <span class="roll-number">Roll ${rollNumber}</span>
                        <span class="roll-timestamp">${timestamp}</span>
                    </div>
                    <div class="ai-roll-action">
                        <span class="decision-badge ${decision.action}">
                            ${this.formatDecisionAction(decision.action)}
                        </span>
                    </div>
                </div>
                
                <div class="ai-roll-dice">
                    <div class="dice-outcome">
                        <strong>Dice Results:</strong>
                        <div class="dice-outcome-container"></div>
                    </div>
                    ${decision.keepDice && decision.keepDice.length > 0 ? `
                        <div class="dice-kept">
                            <strong>Keeping:</strong> 
                            <div class="dice-kept-container"></div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Add dice to containers after setting innerHTML
            const diceOutcomeContainer = rollEntry.querySelector('.dice-outcome-container');
            if (diceOutcomeContainer) {
                this.createMiniDice(diceArray, diceOutcomeContainer);
            }
            
            if (decision.keepDice && decision.keepDice.length > 0) {
                const diceKeptContainer = rollEntry.querySelector('.dice-kept-container');
                if (diceKeptContainer) {
                    this.createMiniDice(this.filterKeptDice(diceArray, decision.keepDice), diceKeptContainer);
                }
            }
            
            rollEntry.innerHTML += `
                
                <div class="ai-roll-analysis">
                    <div class="ai-reasoning">
                        <span class="ai-section-title">AI Reasoning: </span>
                        <span class="ai-reasoning-text">${decision.reason}</span>
                    </div>
                    
                    <div class="ai-probability-analysis">
                        <span class="ai-section-title">Probability Analysis:</span>
                        ${this.generateProbabilityAnalysis(diceArray, decision)}
                    </div>
                    
                    <div class="ai-strategic-analysis">
                        <span class="ai-section-title">Strategic Assessment:</span>
                        ${this.generateStrategicAnalysis(diceArray, decision, analysisData)}
                    </div>
                    
                    <div class="ai-confidence-meter">
                        <span class="ai-section-title">Confidence: </span>
                        <span class="ai-metric-value">${Math.round((decision.confidence || 0) * 100)}%</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill confidence-${this.getConfidenceLevel(decision.confidence || 0)}" style="width: ${Math.round((decision.confidence || 0) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return rollEntry;
    }

    getProbabilityLevel(percentage) {
        if (percentage < 30) return 'low';
        if (percentage < 70) return 'medium';
        return 'high';
    }

    getConfidenceLevel(confidence) {
        // Handle NaN, undefined, or null values
        if (confidence == null || isNaN(confidence)) {
            return 'low';
        }
        
        if (confidence < 0.4) return 'low';
        if (confidence < 0.7) return 'medium';
        return 'high';
    }

    parseAIAnalysis(analysis) {
        // Split the analysis string and separate dice results from player status
        const parts = analysis.split('|');
        const diceResults = parts[0] ? parts[0].trim() : '';
        const playerStatus = parts[1] ? parts[1].trim() : '';
        
        return {
            diceBreakdown: diceResults || 'No significant dice combinations',
            playerStatus: playerStatus || 'Status unknown'
        };
    }

    getPlayerPersonality(currentPlayer) {
        if (!this.aiConfig) return null;
        
        // Get personality from monsterSpecificAdjustments based on monster name
        const monsterName = currentPlayer.monster?.name?.toLowerCase();
        
        if (monsterName && this.aiConfig.monsterSpecificAdjustments && this.aiConfig.monsterSpecificAdjustments[monsterName]) {
            const monsterData = this.aiConfig.monsterSpecificAdjustments[monsterName];
            const personalityLevels = monsterData.personality;
            
            if (personalityLevels) {
                // Convert aggression/strategy/risk levels to descriptive personality
                const aggression = personalityLevels.aggression || 3;
                const strategy = personalityLevels.strategy || 3;
                const risk = personalityLevels.risk || 3;
                
                // Create descriptive name based on levels
                const aggressionName = this.getAggressionName(aggression);
                const strategyName = this.getStrategyName(strategy);
                const riskName = this.getRiskName(risk);
                
                return {
                    name: `${aggressionName} ${strategyName}`,
                    aggression: aggression / 5.0,
                    caution: (6 - risk) / 5.0,
                    riskTaking: risk / 5.0,
                    strategy: strategy / 5.0,
                    description: monsterData.specialRules?.description || 'Mysterious kaiju with unknown motivations'
                };
            }
        }
        
        // Default personality for unknown monsters
        return {
            name: 'Balanced Fighter',
            aggression: 0.6,
            caution: 0.5,
            riskTaking: 0.5,
            strategy: 0.5,
            description: 'Standard kaiju with balanced approach to combat'
        };
    }

    getAggressionName(level) {
        const names = ['Pacifist', 'Defensive', 'Balanced', 'Aggressive', 'Berserker'];
        return names[level - 1] || 'Balanced';
    }

    getStrategyName(level) {
        const names = ['Impulsive', 'Short-sighted', 'Tactical', 'Strategic', 'Mastermind'];
        return names[level - 1] || 'Tactical';
    }

    getRiskName(level) {
        const names = ['Ultra-conservative', 'Conservative', 'Moderate', 'Bold', 'Reckless'];
        return names[level - 1] || 'Moderate';
    }

    formatPersonalityDisplay(personality) {
        if (!personality) return '<span class="personality-unknown">Unknown Personality</span>';
        
        return `
            <div class="personality-traits">
                <span class="personality-name">${personality.name || 'Unknown'}</span>
                <div class="personality-stats">
                    <span class="trait-item">🎯 Aggression: ${Math.round((personality.aggression || 0.5) * 100)}%</span>
                    <span class="trait-item">🛡️ Caution: ${Math.round((personality.caution || 0.5) * 100)}%</span>
                    <span class="trait-item">🎲 Risk: ${Math.round((personality.riskTaking || 0.5) * 100)}%</span>
                </div>
            </div>
        `;
    }

    extractPlayerStatus(currentPlayer) {
        return `Health: ${currentPlayer.health}/${currentPlayer.maxHealth} | Energy: ${currentPlayer.energy} | VP: ${currentPlayer.points}`;
    }

    getRollNumberFromContainer(turnContainer) {
        const rollEntries = turnContainer.querySelectorAll('.ai-roll-entry');
        return rollEntries.length;
    }

    extractDiceFromAnalysis(analysisData) {
        const diceMatch = analysisData.diceBreakdown.match(/Rolled:\s*\[([^\]]+)\]/);
        if (!diceMatch) return [];
        
        return diceMatch[1].split(',').map(d => d.trim()).filter(d => d && d !== '');
    }

    formatDecisionAction(action) {
        switch(action) {
            case 'reroll': return 'Continue Rolling';
            case 'keep': return '✅ Keep Dice';
            case 'endRoll': return '🛑 End Turn';
            default: return '❓ Unknown';
        }
    }

    formatKeptDice(keepDice, diceArray) {
        if (!keepDice || keepDice.length === 0) return 'None';
        
        return keepDice.map(index => {
            const diceValue = diceArray[index] || '?';
            const symbol = this.getDiceFaceDisplay(diceValue);
            return `<span class="kept-die">${symbol}</span>`;
        }).join(' ');
    }

    filterKeptDice(diceArray, keepDiceIndices) {
        if (!keepDiceIndices || keepDiceIndices.length === 0) return [];
        
        return keepDiceIndices.map(index => diceArray[index]).filter(die => die !== undefined);
    }

    generateProbabilityAnalysis(diceArray, decision) {
        if (!diceArray || diceArray.length === 0) {
            return '<p>No dice data available for probability analysis.</p>';
        }
        
        // Count current dice faces
        const faceCounts = {};
        diceArray.forEach(face => {
            faceCounts[face] = (faceCounts[face] || 0) + 1;
        });
        
        // Calculate probability for potential improvements
        const improvements = this.calculateImprovementProbabilities(faceCounts, decision);
        
        return `
            <div class="probability-breakdown">
                <div class="current-value">
                    <span class="ai-section-title">Current Value:</span> <span class="ai-metric-value">${this.calculateCurrentScore(faceCounts)}</span>
                </div>
                <div class="improvement-chances">
                    ${improvements.map(imp => `
                        <div class="improvement-item">
                            <span class="improvement-type ai-text-secondary">${imp.type}:</span>
                            <span class="improvement-probability ai-metric-value">${imp.probability}%</span>
                            <div class="probability-bar">
                                <div class="probability-fill probability-${this.getProbabilityLevel(imp.probability)}" style="width: ${imp.probability}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateStrategicAnalysis(diceArray, decision, analysisData) {
        const strategic = [];
        
        // Analyze current situation
        const faceCounts = {};
        diceArray.forEach(face => {
            faceCounts[face] = (faceCounts[face] || 0) + 1;
        });
        
        // Check for strong combinations
        if (faceCounts['energy'] >= 2) {
            strategic.push('💰 Strong energy income potential');
        }
        if (faceCounts['attack'] >= 2) {
            strategic.push('⚔️ High attack potential');
        }
        if (faceCounts['1'] >= 2 || faceCounts['2'] >= 2 || faceCounts['3'] >= 2) {
            strategic.push('⭐ Victory point combination building');
        }
        if (faceCounts['heal']) {
            strategic.push('❤️ Healing available');
        }
        
        // Add risk assessment
        if (decision.confidence > 0.8) {
            strategic.push('🎯 High confidence decision');
        } else if (decision.confidence < 0.4) {
            strategic.push('🤔 Uncertain situation, gambling');
        }
        
        // Add position-based advice
        if (analysisData.playerStatus.includes('Tokyo')) {
            strategic.push('🏙️ Tokyo position influences risk assessment');
        }
        
        return strategic.length > 0 ? `
            <ul class="strategic-points">
                ${strategic.map(point => `<li>${point}</li>`).join('')}
            </ul>
        ` : '<p>No significant strategic factors identified.</p>';
    }

    calculateCurrentScore(faceCounts) {
        let score = 0;
        let description = [];
        
        // Energy
        if (faceCounts['energy']) {
            score += faceCounts['energy'];
            description.push(`${faceCounts['energy']} Energy`);
        }
        
        // Attacks
        if (faceCounts['attack']) {
            score += faceCounts['attack'] * 2; // Weight attacks higher
            description.push(`${faceCounts['attack']} Attacks`);
        }
        
        // Victory points from 3+ of a kind
        ['1', '2', '3'].forEach(num => {
            if (faceCounts[num] >= 3) {
                const vp = parseInt(num) + (faceCounts[num] - 3);
                score += vp * 3; // Weight VP very high
                description.push(`${vp} ⭐ from ${num}s`);
            }
        });
        
        // Individual number dice (show even if not scoring)
        ['1', '2', '3'].forEach(num => {
            if (faceCounts[num] && faceCounts[num] < 3) {
                description.push(`${faceCounts[num]} ${num}${faceCounts[num] > 1 ? 's' : ''}`);
            }
        });
        
        // Healing
        if (faceCounts['heal']) {
            score += faceCounts['heal'];
            description.push(`${faceCounts['heal']} ❤️`);
        }
        
        return description.length > 0 ? description.join(', ') : 'No significant value';
    }

    calculateImprovementProbabilities(faceCounts, decision) {
        const improvements = [];
        
        // Calculate probability of getting needed faces on reroll
        const diceToReroll = 6 - (decision.keepDice ? decision.keepDice.length : 0);
        if (diceToReroll === 0) return improvements;
        
        // Probability of getting at least one energy (if needed)
        if (!faceCounts['energy'] || faceCounts['energy'] < 2) {
            const energyProb = Math.round((1 - Math.pow(5/6, diceToReroll)) * 100);
            improvements.push({ type: 'Getting Energy', probability: energyProb });
        }
        
        // Probability of getting attacks
        if (!faceCounts['attack'] || faceCounts['attack'] < 2) {
            const attackProb = Math.round((1 - Math.pow(5/6, diceToReroll)) * 100);
            improvements.push({ type: 'Getting Attacks', probability: attackProb });
        }
        
        // Probability of completing number sets for VP
        ['1', '2', '3'].forEach(num => {
            const current = faceCounts[num] || 0;
            if (current >= 1 && current < 3) {
                const needed = 3 - current;
                const setProb = Math.round((1 - Math.pow(5/6, Math.min(diceToReroll, needed))) * 100);
                improvements.push({ type: `Completing ${num}s for VP`, probability: setProb });
            }
        });
        
        return improvements.slice(0, 3); // Limit to top 3 most relevant
    }

    updateTurnStats(turnContainer, decision, analysisData) {
        // Add null safety checks for all DOM elements
        const rollCountElement = turnContainer.querySelector('.roll-count');
        const finalDecisionElement = turnContainer.querySelector('.final-decision');
        const avgConfidenceElement = turnContainer.querySelector('.avg-confidence');
        
        // Safety check: if any required elements are missing, log warning and return
        if (!rollCountElement || !finalDecisionElement || !avgConfidenceElement) {
            console.warn('⚠️ AI Logic Flow: Turn stats elements not found in DOM, skipping update', {
                rollCountElement: !!rollCountElement,
                finalDecisionElement: !!finalDecisionElement,
                avgConfidenceElement: !!avgConfidenceElement,
                turnContainer: !!turnContainer
            });
            return;
        }
        
        // Update roll count
        try {
            const currentCount = parseInt(rollCountElement.textContent) + 1;
            rollCountElement.textContent = currentCount;
        } catch (error) {
            console.warn('⚠️ AI Logic Flow: Error updating roll count:', error);
        }
        
        // Update final decision if turn is ending
        try {
            if (decision.action === 'keep' || decision.action === 'endRoll') {
                finalDecisionElement.textContent = 'Keep Dice';
                finalDecisionElement.className = 'final-decision complete';
            } else {
                finalDecisionElement.textContent = 'Rolling...';
                finalDecisionElement.className = 'final-decision rolling';
            }
        } catch (error) {
            console.warn('⚠️ AI Logic Flow: Error updating final decision:', error);
        }
        
        // Calculate and update average confidence
        try {
            const rollEntries = turnContainer.querySelectorAll('.ai-roll-entry');
            let totalConfidence = 0;
            rollEntries.forEach(entry => {
                const confidenceText = entry.querySelector('.confidence-text')?.textContent;
                if (confidenceText) {
                    totalConfidence += parseInt(confidenceText.replace('%', ''));
                }
            });
            
            if (rollEntries.length > 0) {
                const avgConfidence = Math.round(totalConfidence / rollEntries.length);
                avgConfidenceElement.textContent = `${avgConfidence}%`;
            }
        } catch (error) {
            console.warn('⚠️ AI Logic Flow: Error updating average confidence:', error);
        }
    }

    // Format player status with emojis for visual display
    formatPlayerStatusWithEmojis(statusText) {
        if (!statusText) return 'Status Unknown';
        
        // Get max health from config, fallback to 10
        const maxHealth = this.gameConfig?.gameRules?.player?.startingHealth || 10;
        
        // Extract health, energy, VP from status text (exclude rolls)
        const healthMatch = statusText.match(/Health:\s*(\d+)\/(\d+)/);
        const energyMatch = statusText.match(/Energy:\s*(\d+)/);
        const vpMatch = statusText.match(/VP:\s*(\d+)/);
        
        const health = healthMatch ? parseInt(healthMatch[1]) : 0;
        const energy = energyMatch ? parseInt(energyMatch[1]) : 0;
        const vp = vpMatch ? parseInt(vpMatch[1]) : 0;
        
        // Use consistent game icons with better spacing - no VP text since star represents it
        const statusParts = [
            `❤️ ${health}/${maxHealth}`,
            `⚡ ${energy}`,
            `⭐ ${vp}`
        ];
        
        return statusParts.join(' • ');
    }

    // Get rolls remaining from status text
    getRollsRemaining(statusText) {
        const rollsMatch = statusText.match(/Rolls Left:\s*(\d+)/);
        return rollsMatch ? parseInt(rollsMatch[1]) : 0;
    }

    // Generate enhanced dice analysis with images and probability charts
    generateEnhancedDiceAnalysis(analysisData, decision) {
        // Extract dice information from the analysis
        const diceMatch = analysisData.diceBreakdown.match(/Rolled:\s*\[([^\]]+)\]/);
        if (!diceMatch) {
            return '<p>No dice data available for analysis.</p>';
        }
        
        const diceArray = diceMatch[1].split(',').map(d => d.trim());
        
        // Generate dice images HTML with standard styling
        const diceImagesHtml = this.generateDiceImagesHtml(diceArray);
        
        // Generate conversational analysis
        const conversationalAnalysis = this.generateConversationalDiceAnalysis(diceArray, decision);
        
        // Generate probability charts for numbers
        const probabilityCharts = this.generateProbabilityCharts(diceArray, decision);
        
        return `
            <div class="dice-images-section">
                <h4>Current Roll:</h4>
                ${diceImagesHtml}
            </div>
            <div class="dice-explanation-section">
                <h4>Analysis:</h4>
                ${conversationalAnalysis}
            </div>
            <div class="probability-section">
                <h4>Reroll Probability:</h4>
                ${probabilityCharts}
            </div>
        `;
    }

    // Generate dice images HTML using the standard createDiceHTML function
    generateDiceImagesHtml(diceArray) {
        // Filter out empty/unused dice (empty strings or undefined values)
        const activeDice = diceArray.filter(face => face && face.trim() !== '');
        
        // Create a temporary container to use with our generic createMiniDice function
        const tempContainer = document.createElement('div');
        
        // Convert faces to the numerical format expected by createMiniDice
        const rollValues = activeDice.map(face => {
            // Convert symbolic faces to numerical values
            if (face === 'attack' || face === '⚔️') return 6;
            if (face === 'energy' || face === '⚡') return 5;
            if (face === 'heal' || face === '❤️') return 4;
            // For numbered faces, try to parse as number, otherwise default
            const num = parseInt(face);
            return !isNaN(num) && num >= 1 && num <= 3 ? num : 1;
        });
        
        // Use our generic createMiniDice function
        this.createMiniDice(rollValues, tempContainer);
        
        // Add AI-specific class to each die for styling
        const diceElements = tempContainer.querySelectorAll('.mini-die');
        diceElements.forEach(die => {
            die.classList.add('ai-logic-die');
        });
        
        return tempContainer.innerHTML;
    }

    // Get CSS class for dice face
    getDiceFaceClass(face) {
        // Use config if available, otherwise fallback to hardcoded
        if (this.gameConfig && this.gameConfig.diceSystem && this.gameConfig.diceSystem.faces) {
            const faces = this.gameConfig.diceSystem.faces;
            
            // Check each face type in config
            for (const [faceKey, faceConfig] of Object.entries(faces)) {
                if (face === faceKey || face === faceConfig.symbol) {
                    return `face-${faceKey}`;
                }
            }
        }
        
        // Fallback for backwards compatibility
        const faceMap = {
            '1': 'face-1',
            '2': 'face-2',
            '3': 'face-3',
            '⚔️': 'face-attack',
            'attack': 'face-attack',
            '⚡': 'face-energy',
            'energy': 'face-energy',
            '❤️': 'face-heal',
            'heal': 'face-heal'
        };
        return faceMap[face] || 'face-unknown';
    }

    // Get display value for dice face (use symbols for special faces)
    getDiceFaceDisplay(face) {
        // Use config if available
        if (this.gameConfig && this.gameConfig.diceSystem && this.gameConfig.diceSystem.faces) {
            const faces = this.gameConfig.diceSystem.faces;
            
            // Check each face type in config
            for (const [faceKey, faceConfig] of Object.entries(faces)) {
                if (face === faceKey || face === faceConfig.symbol) {
                    return faceConfig.symbol;
                }
            }
        }
        
        // Fallback for backwards compatibility
        const displayMap = {
            '1': '1',
            '2': '2',
            '3': '3',
            '⚔️': '⚔️',
            'attack': '⚔️',
            '⚡': '⚡',
            'energy': '⚡',
            '❤️': '❤️',
            'heal': '❤️'
        };
        return displayMap[face] || face;
    }

    // Generate conversational dice analysis
    generateConversationalDiceAnalysis(diceArray, decision) {
        const counts = {};
        diceArray.forEach(face => {
            counts[face] = (counts[face] || 0) + 1;
        });

        const analysis = [];
        
        // Get dice faces from config
        const faces = this.gameConfig?.diceSystem?.faces || {};
        
        // Analyze numbers for victory points (1, 2, 3)
        Object.entries(faces).forEach(([faceKey, faceConfig]) => {
            if (faceConfig.type === 'number') {
                const symbol = faceConfig.symbol;
                const value = faceConfig.value;
                const count = counts[symbol] || counts[faceKey] || 0;
                
                if (count >= 3) {
                    const extraPoints = (count - 3) * 1;
                    const totalPoints = value + extraPoints;
                    analysis.push(`Looking good! ${count} ${symbol}s give you ${totalPoints} victory points.`);
                } else if (count === 2) {
                    analysis.push(`You're close with ${count} ${symbol}s - just need one more for victory points.`);
                } else if (count === 1) {
                    analysis.push(`Single ${symbol} - might be worth keeping if you need ${symbol}s for points.`);
                }
            }
        });

        // Analyze special dice (attack, energy, heal)
        Object.entries(faces).forEach(([faceKey, faceConfig]) => {
            if (faceConfig.type !== 'number') {
                const symbol = faceConfig.symbol;
                const count = counts[symbol] || counts[faceKey] || 0;
                
                if (count > 0) {
                    let description = faceConfig.description || '';
                    analysis.push(`${count} ${symbol} dice - ${description}`);
                }
            }
        });

        return analysis.length > 0 ? analysis.join(' ') : 'This roll doesn\'t show any strong patterns - might want to reroll for better combinations.';
    }

    // Generate probability charts for getting specific numbers in future rolls
    generateProbabilityCharts(diceArray, decision) {
        const counts = {};
        diceArray.forEach(face => {
            counts[face] = (counts[face] || 0) + 1;
        });

        const totalDice = diceArray.length;
        const remainingRolls = decision.rollsRemaining || 2;
        
        let charts = '';
        
        // Get number faces from config
        const faces = this.gameConfig?.diceSystem?.faces || {};
        const numberFaces = Object.entries(faces).filter(([_, config]) => config.type === 'number');
        
        // Generate charts for number faces
        numberFaces.forEach(([faceKey, faceConfig]) => {
            const symbol = faceConfig.symbol;
            const value = faceConfig.value;
            const currentCount = counts[symbol] || counts[faceKey] || 0;
            const neededForPoints = Math.max(0, 3 - currentCount);
            
            if (currentCount > 0 || neededForPoints <= 3) {
                // Calculate probability for next roll(s)
                const diceToReroll = totalDice - currentCount; // Assuming player keeps their current numbers
                const probabilityPerRoll = 1/6; // Each die has 1/6 chance of rolling the target number
                
                // Simplified probability calculation for getting at least the needed dice
                let probability = 0;
                if (neededForPoints === 0) {
                    probability = 100; // Already have enough
                } else if (neededForPoints <= diceToReroll && remainingRolls > 0) {
                    // Approximate probability (simplified calculation)
                    probability = Math.min(95, (1 - Math.pow(5/6, diceToReroll * remainingRolls)) * 100);
                }
                
                charts += this.generateSingleProbabilityChart(symbol, currentCount, neededForPoints, probability, value);
            }
        });
        
        return charts || '<p>No significant number patterns to analyze for probability.</p>';
    }

    // Generate a single probability chart bar
    generateSingleProbabilityChart(symbol, current, needed, probability, points = null) {
        // Use points from parameter if provided, otherwise derive from symbol
        const victoryPoints = points !== null ? points : (symbol === '1' ? 1 : parseInt(symbol));
        const status = needed === 0 ? 'Complete!' : `Need ${needed} more`;
        
        return `
            <div class="probability-chart">
                <div class="prob-label">${symbol}s (${victoryPoints}VP): ${current} rolled, ${status}</div>
                <div class="prob-bar-container">
                    <div class="prob-bar" style="width: ${probability}%"></div>
                    <span class="prob-text">${Math.round(probability)}%</span>
                </div>
            </div>
        `;
    }

    // Setup event listeners for AI logic entry interactions
    setupAILogicEntryEvents(logEntry) {
        // Dice analysis toggle
        const toggleHeader = logEntry.querySelector('.ai-dice-analysis-header');
        const toggleContent = logEntry.querySelector('.ai-dice-analysis-content');
        const toggleArrow = logEntry.querySelector('.ai-toggle-arrow');
        
        if (toggleHeader && toggleContent && toggleArrow) {
            toggleHeader.addEventListener('click', () => {
                const isVisible = toggleContent.style.display === 'block';
                toggleContent.style.display = isVisible ? 'none' : 'block';
                // Fixed: ▲ means collapsed (up arrow), ▼ means expanded (down arrow)
                toggleArrow.textContent = isVisible ? '▲' : '▼';
            });
            
            // Start with dice analysis collapsed
            toggleContent.style.display = 'none';
            toggleArrow.textContent = '▲';
        }
        
        // Info icon for reasoning details
        const infoIcon = logEntry.querySelector('.ai-info-icon');
        if (infoIcon) {
            infoIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.showReasoningInfoModal(logEntry);
            });
        }

        // Legacy support for old info button
        const infoBtn = logEntry.querySelector('.ai-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showReasoningInfoModal(logEntry);
            });
        }
    }

    // Show detailed reasoning info modal
    showReasoningInfoModal(logEntry) {
        const detailedData = JSON.parse(logEntry.getAttribute('data-detailed-reasoning'));
        const modal = document.getElementById('ai-reasoning-info-modal');
        const modalBody = document.getElementById('ai-reasoning-info-body');
        
        if (!modal || !modalBody || !detailedData) return;
        
        // Generate detailed reasoning content
        const content = this.generateDetailedReasoning(detailedData);
        modalBody.innerHTML = content;
        
        // Show modal
        modal.classList.remove('hidden');
    }

    // Generate detailed reasoning content with personality analysis
    generateDetailedReasoning(data) {
        const { playerName, decision, analysisData, timestamp } = data;
        
        // Extract dice information
        const diceMatch = analysisData.diceBreakdown.match(/Rolled:\s*\[([^\]]+)\]/);
        const diceArray = diceMatch ? diceMatch[1].split(',').map(d => d.trim()) : [];
        
        // Extract player status
        const statusText = analysisData.playerStatus;
        const maxHealth = this.gameConfig?.gameRules?.player?.startingHealth || 10;
        const healthMatch = statusText.match(/Health:\s*(\d+)\/(\d+)/);
        const energyMatch = statusText.match(/Energy:\s*(\d+)/);
        const vpMatch = statusText.match(/VP:\s*(\d+)/);
        
        const health = healthMatch ? parseInt(healthMatch[1]) : 0;
        const energy = energyMatch ? parseInt(energyMatch[1]) : 0;
        const vp = vpMatch ? parseInt(vpMatch[1]) : 0;
        
        // Use config to get proper dice symbols
        const diceSymbols = diceArray.map(face => this.getDiceFaceDisplay(face));

        // Get icons from config for status display
        const healthIcon = '❤️';
        const energyIcon = this.gameConfig?.diceSystem?.faces?.energy?.symbol || '⚡';
        const vpIcon = '⭐';

        // Determine personality type based on decision pattern (simplified analysis)
        let personality = 'balanced';
        if (health <= 2 && decision.action === 'reroll') {
            personality = 'risk-taking';
        } else if (health <= 5 && decision.action === 'keep') {
            personality = 'low-risk';
        } else if (vp >= 15) {
            personality = 'aggressive';
        }
        
        return `
            <div class="detailed-reasoning-content">
                <div class="reasoning-header">
                    <h4>${playerName} - ${timestamp}</h4>
                    <p><strong>Decision:</strong> ${decision.action === 'reroll' ? 'Continue Rolling' : 'Stop and Keep Dice'}</p>
                    <p><strong>Personality Type:</strong> ${personality.charAt(0).toUpperCase() + personality.slice(1)}</p>
                </div>
                
                <div class="reasoning-situation">
                    <h4>Situation Analysis:</h4>
                    <p><strong>Current Roll:</strong> ${diceSymbols.join(' ')}</p>
                    <p><strong>Health:</strong> ${healthIcon} ${health}/${maxHealth} ${health <= 2 ? '(Critical!)' : health <= 5 ? '(Low)' : '(Good)'}</p>
                    <p><strong>Victory Points:</strong> ${vpIcon} ${vp} ${vp >= 15 ? '(Close to winning!)' : vp >= 10 ? '(Good progress)' : '(Early game)'}</p>
                    <p><strong>Energy:</strong> ${energyIcon} ${energy} ${energy >= 10 ? '(Rich!)' : energy >= 5 ? '(Decent)' : '(Poor)'}</p>
                </div>
                
                <div class="reasoning-logic">
                    <h4>Decision Logic:</h4>
                    ${this.generatePersonalityBasedReasoning(personality, health, vp, energy, diceArray, decision)}
                </div>
                
                <div class="reasoning-summary">
                    <h4>Summary:</h4>
                    <p>${decision.reason}</p>
                </div>
            </div>
        `;
    }

    // Generate personality-based reasoning explanation
    generatePersonalityBasedReasoning(personality, health, vp, energy, diceArray, decision) {
        const counts = {};
        diceArray.forEach(face => {
            counts[face] = (counts[face] || 0) + 1;
        });

        // Get icons from config with fallbacks
        const healIcon = this.gameConfig?.diceSystem?.faces?.heal?.symbol || '❤️';
        const attackIcon = this.gameConfig?.diceSystem?.faces?.attack?.symbol || '⚔️';
        const oneIcon = this.gameConfig?.diceSystem?.faces?.[1]?.symbol || '1️⃣';
        const twoIcon = this.gameConfig?.diceSystem?.faces?.[2]?.symbol || '2️⃣';
        const threeIcon = this.gameConfig?.diceSystem?.faces?.[3]?.symbol || '3️⃣';

        let reasoning = '';
        
        if (personality === 'low-risk') {
            reasoning = `<p>This AI follows a <strong>low-risk strategy</strong>, prioritizing survival and steady progress over aggressive plays.</p>`;
            
            if (health <= 5) {
                reasoning += `<p>With only ${health} health remaining, the AI is being extra cautious. `;
                if (counts['heal']) {
                    reasoning += `It values the ${counts['heal']} ${healIcon} heart dice highly for healing.`;
                } else {
                    reasoning += `It's looking for ${healIcon} heart dice to heal up before taking more risks.`;
                }
                reasoning += `</p>`;
            }
            
            if (counts['attack'] && decision.action === 'reroll') {
                reasoning += `<p>Even with ${counts['attack']} ${attackIcon} attack dice, the AI chose to reroll because it doesn't want to risk entering Tokyo with low health.</p>`;
            }
            
        } else if (personality === 'aggressive') {
            reasoning = `<p>This AI uses an <strong>aggressive strategy</strong>, focusing on quick victories and high-risk, high-reward plays.</p>`;
            
            if (vp >= 15) {
                reasoning += `<p>With ${vp} victory points, the AI is pushing hard for a quick win. Every point counts now!</p>`;
            }
            
            if (counts['attack']) {
                reasoning += `<p>The ${counts['attack']} ${attackIcon} attack dice are valuable for forcing other players out of Tokyo and potentially dealing massive damage.</p>`;
            }
            
        } else if (personality === 'risk-taking') {
            reasoning = `<p>This AI has a <strong>risk-taking personality</strong>, willing to gamble for better outcomes even in dangerous situations.</p>`;
            
            if (health <= 2) {
                reasoning += `<p>Despite having only ${health} health (critical danger!), the AI is still willing to reroll for potentially better combinations. This is a high-risk gamble.</p>`;
            }
            
        } else {
            reasoning = `<p>This AI follows a <strong>balanced strategy</strong>, weighing risks and rewards carefully.</p>`;
        }

        // Add dice-specific reasoning
        const numberCounts = ['1', '2', '3'].map(num => ({ num, count: counts[num] || 0 }));
        const bestNumbers = numberCounts.filter(n => n.count >= 2).sort((a, b) => b.count - a.count);
        
        if (bestNumbers.length > 0) {
            const best = bestNumbers[0];
            const diceIcon = best.num === '1' ? oneIcon : best.num === '2' ? twoIcon : threeIcon;
            reasoning += `<p>The AI has ${best.count} ${diceIcon} dice. `;
            if (best.count >= 3) {
                const points = best.num === '1' ? 1 : parseInt(best.num);
                reasoning += `This is already worth ${points} victory points, making it a solid foundation to build on.</p>`;
            } else {
                reasoning += `Just one more ${diceIcon} would secure victory points.</p>`;
            }
        }

        return reasoning;
    }

    // Create dice analysis summary for AI logic logging
    createDiceAnalysis(diceResults, player, gameState) {
        const diceFaces = diceResults.map(d => d.face);
        const counts = {};
        diceFaces.forEach(face => {
            counts[face] = (counts[face] || 0) + 1;
        });

        const diceAnalysis = [];
        
        // Show the actual dice rolled
        diceAnalysis.push(`Rolled: [${diceFaces.join(', ')}]`);
        
        // Smart victory points analysis - understand sets vs individual dice
        const numberCounts = Object.entries(counts).filter(([face]) => 
            ['1', '2', '3'].includes(face));
        
        let hasCompletedSets = false;
        let hasPairs = false;
        let bestSetStrategy = null;
        
        numberCounts.forEach(([number, count]) => {
            if (count >= 3) {
                hasCompletedSets = true;
                const points = number === '1' ? 1 : parseInt(number);
                const extraPoints = (count - 3) * 1;
                const totalPoints = points + extraPoints;
                diceAnalysis.push(`🎯 ${count}x ${number}s → ${totalPoints} VP (COMPLETED SET)`);
            } else if (count === 2) {
                hasPairs = true;
                const potentialPoints = number === '1' ? 1 : parseInt(number);
                diceAnalysis.push(`🎲 Pair of ${number}s (need 1 more for ${potentialPoints} VP)`);
                if (!bestSetStrategy || potentialPoints > bestSetStrategy.points) {
                    bestSetStrategy = { number, count, points: potentialPoints };
                }
            } else if (count === 1) {
                diceAnalysis.push(`${number} (single - low priority unless building set)`);
            }
        });

        // Strategic recommendations based on game state
        const health = player.health;
        const vp = player.victoryPoints;
        const rollsLeft = gameState && gameState.diceState ? gameState.diceState.rollsRemaining : 0;
        
        // Context-aware strategic analysis
        if (vp >= 15 && health <= 3 && hasPairs) {
            diceAnalysis.push(`⚠️ CRITICAL DECISION: Near win (${vp} VP) but low health (${health}). Pair strategy vs safety!`);
            if (rollsLeft >= 2) {
                diceAnalysis.push(`📈 RECOMMEND: Try for set completion (${rollsLeft} rolls left)`);
            } else {
                diceAnalysis.push(`🛡️ RECOMMEND: Consider hearts for safety (${rollsLeft} roll left)`);
            }
        } else if (hasPairs && !hasCompletedSets) {
            diceAnalysis.push(`🎯 STRATEGY: Keep pair of ${bestSetStrategy?.number}s, reroll others for set completion`);
        } else if (vp >= 15) {
            diceAnalysis.push(`🏆 NEAR WIN: Priority on VP completion or attack prevention`);
        } else if (health <= 3) {
            diceAnalysis.push(`💔 LOW HEALTH: Hearts critical for survival`);
        }

        // Resource analysis with strategic context
        if (counts['⚡']) {
            const energyValue = counts['⚡'];
            diceAnalysis.push(`⚡ ${energyValue} Energy (can buy power cards)`);
        }
        if (counts['❤️']) {
            const healValue = counts['❤️'];
            const maxHealing = Math.min(healValue, 10 - health);
            diceAnalysis.push(`❤️ ${healValue} Hearts (would heal ${maxHealing} → ${health + maxHealing}/10)`);
        }
        if (counts['⚔️']) {
            const attackValue = counts['⚔️'];
            const inTokyo = gameState && gameState.tokyoCity === player.index;
            diceAnalysis.push(`⚔️ ${attackValue} Attacks ${inTokyo ? '(hit ALL players!)' : '(hit Tokyo player)'}`);
        }

        // Game state summary
        const statusInfo = `Status: ${health}♥ ${player.energy}⚡ ${vp}🏆 | ${rollsLeft} rolls left`;

        return `${diceAnalysis.join(' • ')} | ${statusInfo}`;
    }

    // Programmatically select dice for CPU (same as human click)
    async cpuSelectDice(diceIndices) {
        console.log('🔍 DEBUG: cpuSelectDice called with indices:', diceIndices);

        if (!this.game || !this.game.diceCollection || !Array.isArray(diceIndices)) {
            console.log('🔍 DEBUG: cpuSelectDice early return - missing game/diceCollection or invalid indices');
            return;
        }

        const dc = this.game.diceCollection;

        // Clear any existing selections first (model + DOM)
        dc.dice.forEach(die => { die.isSelected = false; });
        document.querySelectorAll('.die').forEach(dieElement => { dieElement.classList.remove('selected'); });

        console.log('🔍 DEBUG: Cleared existing selections');

        // Helper: wait until dice have settled (not rolling) with timeout
        const waitForDiceSettle = (collection, timeout = 2000, interval = 25) => new Promise(resolve => {
            const start = Date.now();
            const check = () => {
                try {
                    if (!collection.isAnyRolling()) return resolve(true);
                } catch (e) {
                    return resolve(false);
                }
                if (Date.now() - start >= timeout) return resolve(false);
                setTimeout(check, interval);
            };
            check();
        });

        // Wait for rolling to finish before applying selection (defensive)
        const settled = await waitForDiceSettle(dc, 2500, 30);
        if (!settled) {
            console.warn('🔍 cpuSelectDice: dice did not settle within timeout, proceeding anyway');
        }

        // Apply keep selections by index, ignoring disabled dice and out-of-range indices
        diceIndices.forEach(idx => {
            const modelDie = dc.dice[idx];
            if (!modelDie) {
                console.log('🔍 DEBUG: cpuSelectDice index out of range:', idx);
                return; // out of range
            }
            if (modelDie.isDisabled) {
                console.log('🔍 DEBUG: cpuSelectDice skipping disabled die:', modelDie.id);
                return; // ignore disabled placeholders
            }
            if (modelDie.isRolling) {
                console.log('🔍 DEBUG: cpuSelectDice skipping still-rolling die:', modelDie.id);
                return; // skip dice still marked rolling
            }

            // Mark model selected
            modelDie.isSelected = true;

            // Update DOM selection class using data attribute selector
            const el = document.querySelector(`[data-die-id="${modelDie.id}"]`);
            if (el) {
                el.classList.add('selected');
                if (window.UI && window.UI.debugMode) {
                    window.UI._debugVerbose('cpuSelectDice added selected class to element:', modelDie.id);
                }
            } else {
                console.log('🔍 DEBUG: cpuSelectDice DOM element not found for', modelDie.id);
            }
        });

        console.log('🔍 DEBUG: cpuSelectDice completed');

        // Update dice controls to reflect the selection
        try { this.updateDiceControls(); } catch (e) { /* ignore */ }
        // Re-render dice to ensure className includes selected state
        try {
            const refreshedData = this.game.diceCollection.getAllDiceData();
            this.updateDiceDisplay(refreshedData);
        } catch (e) { /* ignore */ }
        // Animate selected dice to mimic human click feedback
        try { this.animateCPUSelectedDice(); } catch (e) { /* ignore */ }
    }

    animateCPUSelectedDice() {
        const selected = document.querySelectorAll('.die.selected');
        selected.forEach(el => {
            el.classList.remove('cpu-auto-select'); // restart animation if present
            // Force reflow to allow re-adding animation class
            void el.offsetWidth; 
            el.classList.add('cpu-auto-select');
        });
    }

    exportGameLogs() {
        console.log('🔍 exportGameLogs method called');
        console.log('🔍 Game exists:', !!this.game);
        console.log('🔍 Game log exists:', !!this.game?.gameLog);
        console.log('🔍 Game log length:', this.game?.gameLog?.length);
        
        if (!this.game || !this.game.gameLog || this.game.gameLog.length === 0) {
            console.log('❌ No game logs to export');
            UIUtilities.showMessage('No game logs to export!', 3000, this.elements);
            return;
        }

        try {
            console.log('✅ Starting export process...');
            // Get current date and time for filename
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `king-of-tokyo-game-log-${timestamp}.txt`;

            console.log('📁 Filename will be:', filename);

            // Prepare log content with game metadata
            let logContent = 'KING OF TOKYO - GAME LOG\n';
            logContent += '================================\n\n';
            logContent += `Exported: ${now.toLocaleString()}\n`;
            
            if (this.game.gameSettings) {
                logContent += `Players: ${this.game.gameSettings.playerCount}\n`;
                logContent += `Game Mode: ${this.game.gameSettings.gameMode || 'Standard'}\n`;
            }
            
            if (this.game.players && this.game.players.length > 0) {
                logContent += '\nPlayers:\n';
                this.game.players.forEach((player, index) => {
                    logContent += `  ${index + 1}. ${player.monster.name} (${player.playerType})\n`;
                });
            }
            
            logContent += '\n================================\n';
            logContent += 'GAME EVENTS:\n';
            logContent += '================================\n\n';

            // Convert game log entries to text format
            this.game.gameLog.forEach((entry, index) => {
                const entryNumber = (index + 1).toString().padStart(3, '0');
                logContent += `[${entryNumber}] ${entry.message}\n`;
                
                if (entry.timestamp) {
                    const entryTime = new Date(entry.timestamp).toLocaleTimeString();
                    logContent += `      Time: ${entryTime}\n`;
                }
                
                if (entry.type && entry.type !== 'general') {
                    logContent += `      Type: ${entry.type}\n`;
                }
                
                logContent += '\n';
            });

            logContent += '\n================================\n';
            logContent += 'END OF LOG\n';
            logContent += '================================\n';

            console.log('📄 Log content prepared, length:', logContent.length);

            // Create and download the file
            console.log('🔧 Creating blob...');
            const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
            console.log('🔧 Blob created, size:', blob.size);
            
            const url = URL.createObjectURL(blob);
            console.log('🔧 Object URL created:', url);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.style.display = 'none';
            
            console.log('🔧 Adding download link to document...');
            document.body.appendChild(downloadLink);
            console.log('🔧 Triggering download click...');
            downloadLink.click();
            console.log('🔧 Removing download link...');
            document.body.removeChild(downloadLink);
            
            // Clean up the object URL
            URL.revokeObjectURL(url);
            console.log('✅ Export process completed');

            UIUtilities.showMessage(`✅ Game logs exported as ${filename}`, 4000, this.elements);

        } catch (error) {
            console.error('Failed to export game logs:', error);
            UIUtilities.showMessage('❌ Failed to export game logs. Please try again.', 4000, this.elements);
        }
    }

    async showStorageManagement() {
        await this.updateStorageStats();
        this.elements.storageMgmtModal.classList.remove('hidden');
    }

    toggleStorageAboutPanel() {
        if (!this.elements.storageAboutPanel) return;
        
        if (this.elements.storageAboutPanel.classList.contains('visible')) {
            this.hideStorageAboutPanel();
        } else {
            this.showStorageAboutPanel();
        }
    }

    showStorageAboutPanel() {
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'hidden', false);
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'visible', true);
    }

    hideStorageAboutPanel() {
        if (!this.elements.storageAboutPanel) return;
        
        UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'visible', false);
        // Add a small delay before hiding to allow animation
        setTimeout(() => {
            UIUtilities.safeToggleClass(this.elements.storageAboutPanel, 'hidden', true);
        }, 300);
    }

    // Initialize dice area with reusable dice elements
    initializeDiceArea() {
        const diceContainer = this.elements.diceContainer;
        if (!diceContainer) {
            console.warn('⚠️ Dice container not found, skipping dice initialization');
            return;
        }

        // Initialize the dice container with reusable elements
        this.initializeDiceContainer(8); // Support up to 8 dice (6 regular + 2 power card dice)
        
        // Immediately show 6 empty dice to prepare for the game
        this.showInitialEmptyDice();
        
        window.UI && window.UI._debug && window.UI._debug('🎲 Dice area initialized with reusable elements and initial display');
    }

    // Show initial empty dice (called during UI initialization)
    showInitialEmptyDice() {
        const initialDiceData = [];
        for (let i = 0; i < 6; i++) {
            initialDiceData.push({
                id: `die-${i}`,
                face: null,
                symbol: '?',
                isSelected: false,
                isRolling: false,
                isDisabled: false,
                faceData: null
            });
        }
        
        // Display the initial empty dice
        this.updateDiceDisplay(initialDiceData, false);
        window.UI && window.UI._debug && window.UI._debug('🎲 Initial empty dice displayed');
    }

    // Initialize settings system
    initializeSettings() {
        // Load initial settings when the UI starts
        this.loadSettings();
    }

    // Initialize AI decision engine
    initializeAI() {
        console.log('🤖 Initializing AI Decision Engine...');
        console.log('🤖 AIDecisionEngine available:', typeof AIDecisionEngine !== 'undefined');
        
        if (typeof AIDecisionEngine !== 'undefined') {
            this.aiEngine = new AIDecisionEngine();
            console.log('✅ AI Decision Engine initialized successfully');
            
            // Store AI config reference for UI components
            this.aiConfig = this.aiEngine.config;
            
            // Test if config loads properly
            setTimeout(() => {
                console.log('🤖 AI Config loaded:', !!this.aiEngine.config);
                if (this.aiEngine.config) {
                    console.log('🤖 AI Config sample:', {
                        hasPersonalities: !!this.aiEngine.config.personalities,
                        hasTiming: !!this.aiEngine.config.timing,
                        version: this.aiEngine.config.version
                    });
                }
            }, 1000);
        } else {
            console.warn('⚠️ AIDecisionEngine not available - CPU will use fallback logic');
            this.aiEngine = null;
            this.aiConfig = null;
        }
    }

    showSettings() {
        UIUtilities.showModal(this.elements.settingsModal);
        // Add body class for global styling (freeze animations, etc.)
        document.body.classList.add('settings-modal-open');
        // Auto-pause if game running and not already paused
        if (this.game && !this.gamePaused) {
            this._wasAutoPausedForSettings = true;
            if (!this.gamePaused) {
                this.gamePaused = true;
                this.pauseGame();
            }
        } else {
            this._wasAutoPausedForSettings = false;
        }
        this.loadSettings();
    }

    loadSettings() {
        // Load CPU speed setting
        const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
        const speedRadio = document.querySelector(`input[name="cpu-speed"][value="${cpuSpeed}"]`);
        if (speedRadio) {
            speedRadio.checked = true;
        }

        // Load thought bubbles setting
        const thoughtBubblesEnabled = localStorage.getItem('thoughtBubblesEnabled') !== 'false';
        if (this.elements.thoughtBubblesToggle) {
            this.elements.thoughtBubblesToggle.checked = thoughtBubblesEnabled;
        }

        // AI is the single mode now; legacy settings removed.
        
    // Clean up legacy localStorage keys related to previous AI toggle implementations (none remain)
        
    // Initialize and load monster configuration
        this.initializeMonsterCheckboxes();
    }

    saveSettings() {
        // Save CPU speed setting
        const selectedSpeed = document.querySelector('input[name="cpu-speed"]:checked');
        if (selectedSpeed) {
            localStorage.setItem('cpuSpeed', selectedSpeed.value);
        }

        // Save thought bubbles setting
        if (this.elements.thoughtBubblesToggle) {
            localStorage.setItem('thoughtBubblesEnabled', this.elements.thoughtBubblesToggle.checked.toString());
        }

    // Note: AI mode is the single mode — no toggle available.
        // The toggle in UI allows temporary override during gameplay

        // Save monster active states
        this.saveMonsterConfiguration();

        // Close the modal
        UIUtilities.hideModal(this.elements.settingsModal);
        
        // Show confirmation
        UIUtilities.showMessage('Settings saved successfully!', 3000, this.elements);
    }

    initializeMonsterCheckboxes() {
        if (!this.elements.monsterCheckboxes || typeof MONSTERS === 'undefined') {
            return;
        }

        // Clear existing checkboxes
        this.elements.monsterCheckboxes.innerHTML = '';

        // Get saved monster states or use config defaults
        const savedMonsterStates = this.getMonsterActiveStates();

        // Create checkbox for each monster
        Object.values(MONSTERS).forEach(monster => {
            const isActive = savedMonsterStates.hasOwnProperty(monster.id) 
                ? savedMonsterStates[monster.id] 
                : (monster.active !== false); // Default to true unless explicitly false

            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'monster-checkbox-item';
            if (isActive) {
                checkboxItem.classList.add('checked');
            }

            checkboxItem.innerHTML = `
                <input type="checkbox" id="monster-${monster.id}" ${isActive ? 'checked' : ''}>
                <span class="monster-emoji">${monster.emoji}</span>
                <span>${monster.name}</span>
            `;

            // Add change event listener
            const checkbox = checkboxItem.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    checkboxItem.classList.add('checked');
                } else {
                    checkboxItem.classList.remove('checked');
                }
            });

            this.elements.monsterCheckboxes.appendChild(checkboxItem);
        });
    }

    getMonsterActiveStates() {
        const saved = localStorage.getItem('monsterActiveStates');
        return saved ? JSON.parse(saved) : {};
    }

    saveMonsterConfiguration() {
        if (!this.elements.monsterCheckboxes) {
            return;
        }

        const monsterStates = {};
        const checkboxes = this.elements.monsterCheckboxes.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const monsterId = checkbox.id.replace('monster-', '');
            monsterStates[monsterId] = checkbox.checked;
        });

        localStorage.setItem('monsterActiveStates', JSON.stringify(monsterStates));
        
        // Update MONSTERS object with new active states
        Object.keys(monsterStates).forEach(monsterId => {
            if (MONSTERS[monsterId]) {
                MONSTERS[monsterId].active = monsterStates[monsterId];
            }
        });

        // Trigger monster list refresh if setup manager exists
        if (window.setupManager && window.setupManager.updateMonsterSelection) {
            window.setupManager.updateMonsterSelection();
        }
    }

    // AI is always enabled; no mode toggles required.

    resetSettings() {
        // Reset to default values
    localStorage.removeItem('cpuSpeed');
    localStorage.removeItem('thoughtBubblesEnabled');
        
        // Reload the settings to show defaults
        this.loadSettings();
        
        // Show confirmation
        UIUtilities.showMessage('Settings reset to defaults', 3000, this.elements);
    }

    showInstructions() {
        UIUtilities.showModal(this.elements.instructionsModal);
    }

    updateGameLogDisplay() {
        const content = this.elements.gameLogContent;
        if (!content) return;

        // Get the hierarchical log tree from the game
        const logTree = this.game?.gameLogTree?.getTree() || [];

        if (logTree.length === 0) {
            content.innerHTML = '<div class="game-log-empty">🎮 No game events recorded yet</div>';
            return;
        }

        // Render the hierarchical tree
        const treeHTML = this.renderLogTree(logTree);
        content.innerHTML = treeHTML;
        
        // Auto-scroll to bottom to show latest content
        setTimeout(() => {
            const gameLogContainer = document.querySelector('.game-log-container');
            if (gameLogContainer) {
                gameLogContainer.scrollTop = gameLogContainer.scrollHeight;
            }
        }, 100);
    }

    renderLogTree(rounds) {
        return rounds.map(round => this.renderRound(round)).join('');
    }

    renderRound(round) {
        const roundTimestamp = round.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expandedClass = round.expanded ? 'expanded' : 'collapsed';
        const expandIcon = round.expanded ? '⬇️' : '➡️'; // Changed from book emojis to arrows
        
        // Handle setup round vs numbered rounds
        const isSetup = round.roundNumber === 'Setup';
        const roundTitle = isSetup ? 
            '⚙️ Game Setup' : // Reverted back to original 'Game Setup'
            `🆕 Round ${round.roundNumber}`;
        
        const dataAttribute = isSetup ? 'data-round-type="setup"' : '';
        
        const turnsHTML = round.expanded ? 
            round.playerTurns.map(turn => this.renderPlayerTurn(turn, round.id)).join('') : '';

        return `
            <div class="log-round ${expandedClass}" ${dataAttribute}>
                <div class="log-round-header" onclick="window.gameUI.toggleLogRound('${round.id}')">
                    <span class="log-expand-icon">${expandIcon}</span>
                    <span class="log-round-title">${roundTitle}</span>
                    <span class="log-round-time">${roundTimestamp}</span>
                    <span class="log-round-summary">${round.playerTurns.length} ${isSetup ? 'actions' : 'turns'}</span>
                </div>
                <div class="log-round-content">
                    ${turnsHTML}
                </div>
            </div>
        `;
    }

    renderPlayerTurn(turn, roundId) {
        const turnTimestamp = turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const expandedClass = turn.expanded ? 'expanded' : 'collapsed';
        const expandIcon = turn.expanded ? '🔽' : '▶️';
        
        // Get turn summary for collapsed view
        const summary = this.game.gameLogTree.getTurnSummary(turn);
        
        // Get player avatar
        const playerAvatar = this.getPlayerAvatarForTurn(turn);
        
        const actionsHTML = turn.expanded ? 
            turn.actions.map(action => this.renderAction(action)).join('') : '';

        return `
            <div class="log-turn ${expandedClass}">
                <div class="log-turn-header" onclick="window.gameUI.toggleLogTurn('${roundId}', '${turn.id}')">
                    <span class="log-expand-icon">${expandIcon}</span>
                    ${playerAvatar}
                    <span class="log-turn-player">${turn.playerName}</span>
                    <span class="log-turn-time">${turnTimestamp}</span>
                    <span class="log-turn-summary">${summary}</span>
                </div>
                <div class="log-turn-content">
                    ${actionsHTML}
                </div>
            </div>
        `;
    }

    renderAction(action) {
        const actionTimestamp = action.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Don't show emoji during setup phase
        const isSetupPhase = action.area === 'setup' || action.category === 'setup' || 
                           action.category === 'player-count-change' || 
                           action.category === 'monster-selection' || 
                           action.category === 'monster-deselection' ||
                           action.category === 'game-start' ||
                           action.category === 'ready-to-start';
        
        const emoji = isSetupPhase ? '' : (action.emoji || '📝');
        const categoryClass = `log-action-${action.category}`;
        
        // Add area information if available
        const areaTag = action.area && action.area !== 'game' ? 
            `<span class="log-action-area">[${action.area}]</span>` : '';
        
        return `
            <div class="log-action ${categoryClass}">
                ${emoji ? `<span class="log-action-emoji">${emoji}</span>` : ''}
                <span class="log-action-message">${action.message}</span>
                ${areaTag}
                <span class="log-action-time">${actionTimestamp}</span>
            </div>
        `;
    }

    getPlayerAvatarForTurn(turn) {
        // Check if this is a system event (like "Game Setup" or "Monster Selection")
        const systemEventNames = ['Game Setup', 'Monster Selection', 'System'];
        if (systemEventNames.includes(turn.playerName)) {
            return ''; // No avatar for system events
        }
        
        if (!turn.playerMonster || !this.game || !this.game.players) {
            return '<span class="log-player-avatar-missing">👤</span>';
        }
        
        // Find the player
        const player = this.game.players.find(p => 
            p.monster?.name === turn.playerName
        );
        
        if (!player || !player.monster) {
            return '<span class="log-player-avatar-missing">👤</span>';
        }
        
        return `<img src="${player.monster.image}" alt="${player.monster.name}" class="log-player-avatar" />`;
    }

    // Toggle round expansion
    toggleLogRound(roundId) {
        if (this.game && this.game.gameLogTree) {
            this.game.gameLogTree.toggleRound(roundId);
            this.updateGameLogDisplay();
        }
    }

    // Toggle turn expansion
    toggleLogTurn(roundId, turnId) {
        if (this.game && this.game.gameLogTree) {
            this.game.gameLogTree.togglePlayerTurn(roundId, turnId);
            this.updateGameLogDisplay();
        }
    }

    formatLogEntry(log) {
        const timestamp = new Date(log.timestamp);
        const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Get message text
        let message = '';
        if (typeof log.message === 'string') {
            message = log.message;
        } else if (typeof log.message === 'object' && log.message !== null) {
            message = JSON.stringify(log.message);
        } else {
            message = String(log.message || 'Unknown action');
        }

        // Add emojis and formatting based on content
        const formattedMessage = this.addEmojiToLogMessage(message, log);
        
        // Get player info with mini monster image
        const playerInfo = this.getPlayerInfoForLog(log.player);
        
        const categoryClass = log.category ? `log-category-${log.category}` : 'log-category-general';
        const roundInfo = log.round ? `R${log.round}` : '';
        
        return `
            <div class="log-entry ${categoryClass}">
                <div class="log-header">
                    <span class="log-time">🕐 ${timeStr}</span>
                    ${roundInfo ? `<span class="log-round">${roundInfo}</span>` : ''}
                    ${playerInfo}
                </div>
                <div class="log-message">${formattedMessage}</div>
            </div>
        `;
    }

    addEmojiToLogMessage(message, log) {
        // Add emojis based on message content
        let formatted = message;
        
        // Dice related
        formatted = formatted.replace(/roll|rolled|dice/gi, '🎲 $&');
        formatted = formatted.replace(/reroll/gi, '🔄 $&');
        
        // Energy related
        formatted = formatted.replace(/energy|⚡/gi, '⚡ $&');
        
        // Health/Hearts related
        formatted = formatted.replace(/health|heart|heal|damage/gi, '❤️ $&');
        formatted = formatted.replace(/lost|loses/gi, '💔 $&');
        
        // Victory points
        formatted = formatted.replace(/victory point|points/gi, '🏆 $&');
        
        // Tokyo related
        formatted = formatted.replace(/tokyo|enters tokyo|leaves tokyo/gi, '🏙️ $&');
        
        // Combat related
        formatted = formatted.replace(/attack|attacks|claws/gi, '⚔️ $&');
        formatted = formatted.replace(/eliminated|defeated/gi, '💀 $&');
        
        // Power cards
        formatted = formatted.replace(/power card|bought|purchased/gi, '🃏 $&');
        
        // Game start/end
        formatted = formatted.replace(/game start|started/gi, '🎯 $&');
        formatted = formatted.replace(/wins|victory|won/gi, '🎉 $&');
        
        // Turn related
        formatted = formatted.replace(/turn/gi, '🔄 $&');
        
        return formatted;
    }

    getPlayerInfoForLog(playerName) {
        if (!playerName || !this.game || !this.game.players) return '';
        
        // Find the player
        const player = this.game.players.find(p => 
            p.monster?.name === playerName || 
            p.playerNumber === playerName ||
            `Player ${p.playerNumber}` === playerName
        );
        
        if (!player || !player.monster) return `<span class="log-player">👤 ${playerName}</span>`;
        
        return `
            <span class="log-player">
                <img src="${player.monster.image}" alt="${player.monster.name}" class="log-player-avatar" />
                <span class="log-player-name">${player.monster.name}</span>
            </span>
        `;
    }

    clearGameLog() {
        // Add confirmation dialog for destructive action
        const confirmed = confirm(
            '⚠️ WARNING: Clear Game Log\n\n' +
            'This will permanently delete all game log entries and cannot be undone.\n\n' +
            'Are you sure you want to clear the entire game log?'
        );
        
        if (!confirmed) {
            return; // User cancelled, don't clear the log
        }
        
        if (this.game) {
            this.game.gameLog = [];
            this.game.detailedLog = [];
            // Clear the tree structure as well
            if (this.game.gameLogTree) {
                this.game.gameLogTree = new GameLogTree();
            }
            this.updateGameLogDisplay();
            
            // Save the cleared state to storage
            if (this.storageManager) {
                this.storageManager.saveGameState(this.game).catch(error => {
                    console.error('Failed to save cleared log state:', error);
                });
            }
        }
    }

    // Game log scroll methods
    scrollGameLogToTop() {
        const gameLogContainer = document.querySelector('.game-log-container');
        if (gameLogContainer) {
            gameLogContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    scrollGameLogToBottom() {
        const gameLogContainer = document.querySelector('.game-log-container');
        if (gameLogContainer) {
            gameLogContainer.scrollTo({
                top: gameLogContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    // Storage management methods
    async saveGameManually() {
        if (!this.game) {
            alert('No active game to save!');
            return;
        }

        try {
            await this.game.saveGameState();
            UIUtilities.showMessage('Game saved successfully!', 3000, this.elements);
            await this.updateStorageStats();
        } catch (error) {
            console.error('Failed to save game:', error);
            alert('Failed to save game: ' + error.message);
        }
    }

    async clearAllStorage() {
        // Enhanced confirmation dialog for destructive action
        const confirmed = confirm(
            '🚨 DANGER: Clear All Storage\n\n' +
            'This will permanently delete ALL stored data including:\n' +
            '• All saved game states\n' +
            '• Complete game log history\n' +
            '• All player progress and settings\n\n' +
            '⚠️ THIS CANNOT BE UNDONE! ⚠️\n\n' +
            'Are you absolutely sure you want to clear all storage?'
        );
        
        if (!confirmed) {
            return; // User cancelled
        }

        try {
            if (this.game) {
                await this.game.clearGameStorage();
            } else {
                // If no active game, create temporary storage manager
                const storageManager = new GameStorageManager();
                await storageManager.initialize();
                await storageManager.clearAllData();
            }
            
            UIUtilities.showMessage('All storage cleared successfully!', 3000, this.elements);
            await this.updateStorageStats();
        } catch (error) {
            console.error('Failed to clear storage:', error);
            alert('Failed to clear storage: ' + error.message);
        }
    }

    async exportGameData() {
        if (!this.game) {
            alert('No active game to export!');
            return;
        }

        try {
            if (this.game.storageManager && this.game.storageManager.exportGameData) {
                const gameData = await this.game.storageManager.exportGameData(this.game.gameId);
                
                // Create and download file
                const dataStr = JSON.stringify(gameData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `king-of-tokyo-${this.game.gameId}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                UIUtilities.showMessage('Game data exported successfully!', 3000, this.elements);
            } else {
                alert('Export functionality not available');
            }
        } catch (error) {
            console.error('Failed to export game data:', error);
            alert('Failed to export game data: ' + error.message);
        }
    }

    async updateStorageStats() {
        if (!this.elements.storageStats) return;

        try {
            const stats = this.game ? await this.game.getStorageStats() : null;
            
            if (stats) {
                const statsText = `📊 Storage Statistics:
📦 Total Games: ${stats.totalGames}
📝 Total Log Entries: ${stats.totalLogEntries}
💾 Storage Used: ${stats.storageUsed}
🔧 Storage Type: ${stats.storageType}
🎮 Current Game: ${this.game.gameId || 'None'}
📈 Memory Entries: ${this.game.logChunkSize || 0}/${this.game.maxMemoryEntries || 0}`;

                this.elements.storageStats.textContent = statsText;
            } else {
                this.elements.storageStats.textContent = '❌ No storage system active';
            }
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            this.elements.storageStats.textContent = '⚠️ Error getting storage statistics';
        }
    }

    getHealthBarClass(health, maxHealth) {
        return UIUtilities.getHealthBarClass(health, maxHealth);
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        
        // Save preference to localStorage
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }

    // AI mode is always enabled; removed toggle helpers.

    // Initialize dark mode from saved preference
    initializeDarkMode() {
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            document.body.classList.add('dark-mode');
            if (this.elements.darkModeToggle) {
                this.elements.darkModeToggle.checked = true;
            }
        }
        // Initialize thought bubble UI controls if present
        this.initializeThoughtBubbleSettingsUI();
    }

    initializeThoughtBubbleSettingsUI() {
        try {
            const toggle = document.getElementById('thought-bubbles-toggle');
            // Legacy select replaced by custom dropdown; still keep hidden native for accessibility
            const posSelect = document.getElementById('thought-bubble-position-select');
            const customDropdown = document.getElementById('thought-bubble-position-dropdown');
            const customSelected = document.getElementById('thought-bubble-position-selected');
            const customOptions = document.getElementById('thought-bubble-position-options');
            const durationRange = document.getElementById('thought-bubble-duration');
            const durationValue = document.getElementById('thought-bubble-duration-value');
            const dimToggle = document.getElementById('thought-bubble-dim');
            if (!toggle) return; // settings not rendered yet

            // Load stored values
            const enabled = localStorage.getItem('thoughtBubblesEnabled');
            if (enabled !== null) toggle.checked = enabled !== 'false';
            const positionMode = this.getThoughtBubbleSetting('positionMode', 'player');
            if (posSelect) posSelect.value = positionMode;
            if (customSelected) {
                const label = positionMode === 'center' ? 'Centered' : 'From Player';
                customSelected.firstChild.textContent = label + ' ';
            }
            const durationMultiplier = this.getThoughtBubbleSetting('durationMultiplier', '1');
            if (durationRange) {
                durationRange.value = durationMultiplier;
                if (durationValue) durationValue.textContent = `${parseFloat(durationMultiplier).toFixed(1)}x`;
            }
            const dimBackground = this.getThoughtBubbleSetting('dimBackground', 'true');
            if (dimToggle) dimToggle.checked = dimBackground === 'true';

            // Event listeners (lightweight; saving immediate feedback)
            toggle.addEventListener('change', () => {
                localStorage.setItem('thoughtBubblesEnabled', toggle.checked);
            });
            // Custom dropdown behavior
            if (customDropdown && customSelected && customOptions) {
                customSelected.addEventListener('click', () => {
                    customDropdown.classList.toggle('open');
                });
                customOptions.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const value = opt.dataset.value;
                        const label = opt.textContent.trim();
                        localStorage.setItem('thoughtBubble.positionMode', value);
                        if (posSelect) posSelect.value = value; // mirror hidden select
                        if (customSelected.firstChild) {
                            customSelected.firstChild.textContent = label + ' ';
                        }
                        customDropdown.classList.remove('open');
                    });
                });
                // Close on outside click
                document.addEventListener('click', (e) => {
                    if (!customDropdown.contains(e.target)) {
                        customDropdown.classList.remove('open');
                    }
                });
            }
            durationRange && durationRange.addEventListener('input', () => {
                const val = durationRange.value;
                localStorage.setItem('thoughtBubble.durationMultiplier', val);
                if (durationValue) durationValue.textContent = `${parseFloat(val).toFixed(1)}x`;
            });
            dimToggle && dimToggle.addEventListener('change', () => {
                localStorage.setItem('thoughtBubble.dimBackground', dimToggle.checked);
            });
        } catch (e) {
            console.warn('Failed to initialize thought bubble settings UI:', e);
        }
    }

    // CPU Thinking System
    showCPUThoughtBubble(player, context = 'general', options = {}) {
        console.log('🔍 DEBUG: showCPUThoughtBubble called:', player.monster.name, context);
        
        if (player.playerType !== 'cpu') {
            console.log('🔍 DEBUG: Player is not CPU type:', player.playerType);
            return;
        }

        // Enforce one bubble per turn per player: reset when turn changes
        try {
            const current = this.game && this.game.getCurrentPlayer ? this.game.getCurrentPlayer() : null;
            if (current && current.id !== this._lastBubbleTurnPlayerId) {
                this._shownBubbleThisTurn = false;
                this._lastBubbleTurnPlayerId = current.id;
            }
            if (player.id === (current && current.id)) {
                if (this._shownBubbleThisTurn && !options.force && !options.highPriority) {
                    console.log('🔍 DEBUG: Skipping thought bubble (already shown one this turn)');
                    return;
                }
            }
        } catch (turnErr) {
            console.warn('Thought bubble turn tracking error:', turnErr);
        }
        
        // Check if thought bubbles are enabled
        const thoughtBubblesEnabled = localStorage.getItem('thoughtBubblesEnabled') !== 'false';
        if (!thoughtBubblesEnabled) {
            console.log('🔍 DEBUG: Thought bubbles disabled in localStorage');
            return;
        }
        
        const { highPriority = false, force = false } = options || {};
        // Throttle frequency (global and per-player) unless highPriority/force
        const now = Date.now();
        const minGlobalInterval = 1200; // ms
        const minPlayerInterval = 1500; // ms
        if (!force && !highPriority && now - this._lastGlobalThought < minGlobalInterval) {
            console.log('🔍 DEBUG: Skipping thought bubble (global throttle)');
            return;
        }
        if (!force && !highPriority && this._lastPlayerThought[player.id] && now - this._lastPlayerThought[player.id] < minPlayerInterval) {
            console.log('🔍 DEBUG: Skipping thought bubble (player throttle)');
            return;
        }
        this._lastGlobalThought = now;
        this._lastPlayerThought[player.id] = now;

        // Clear all existing bubbles (single active policy)
        document.querySelectorAll('.cpu-thought-bubble').forEach(b => {
            if (b.thoughtOverlay && b.thoughtOverlay.parentNode) b.thoughtOverlay.parentNode.removeChild(b.thoughtOverlay);
            b.remove();
        });
        this._activeThoughtBubble = null;
        this._activeThoughtPlayerId = null;

        console.log('🔍 DEBUG: Creating new thought bubble...');
        
        // Get context-appropriate phrase
        const phrase = this.getCPUThoughtPhrase(player, context);
        if (!phrase) {
            console.log('🔍 DEBUG: No phrase found for context:', context);
            return;
        }
        
        console.log('🔍 DEBUG: Using phrase:', phrase);

        // Intro phrase special effect handling (only before first roll and first player)
        if (this._firstPlayerIntroActive && !this._firstPlayerFirstRollOccurred && player.id === this._firstPlayerId && !options.skipIntroEffect) {
            const lower = phrase.toLowerCase();
            if (lower.includes("let's get this party started")) {
                return this.triggerIntroEffect('party', () => this.showCPUThoughtBubble(player, context, { ...options, skipIntroEffect: true }), player.id);
            } else if (lower.includes('showtime!') || lower === 'showtime!') {
                return this.triggerIntroEffect('showtime', () => this.showCPUThoughtBubble(player, context, { ...options, skipIntroEffect: true }), player.id);
            } else if (lower.includes('time to wake this city up')) {
                return this.triggerIntroEffect('dawn', () => this.showCPUThoughtBubble(player, context, { ...options, skipIntroEffect: true }), player.id);
            }
        }

        // If rumble intro phrase is used for first player before first roll, trigger rumble animation
        if (this._firstPlayerIntroActive && !this._firstPlayerFirstRollOccurred && player.id === this._firstPlayerId) {
            if (/let's get ready to rumble!/i.test(phrase) && !this._firstPlayerRumbleUsed) {
                const playerElement = this.findPlayerElement ? this.findPlayerElement(player.id) : null;
                if (playerElement) {
                    // Use existing attackShake keyframes without glow by temporarily adding a lightweight class
                    playerElement.classList.remove('player-rumble');
                    void playerElement.offsetHeight; // force reflow
                    playerElement.classList.add('player-rumble');
                    setTimeout(()=>{ playerElement.classList.remove('player-rumble'); }, 700);
                }
                this._firstPlayerRumbleUsed = true;
            }
        }
        
        // Create thought bubble
        const thoughtBubble = document.createElement('div');
        thoughtBubble.className = 'cpu-thought-bubble floating';
        if (player.inTokyo) {
            thoughtBubble.classList.add('tokyo-occupant','tokyo-anchor');
        } else {
            thoughtBubble.classList.add('anchor-mode');
        }
        thoughtBubble.setAttribute('data-player-id', player.id);
        
        const bubbleContent = document.createElement('div');
        bubbleContent.className = 'thought-bubble-content';
        
        // Add context-specific styling
        if (context === 'uncertain' || context === 'confused') {
            bubbleContent.classList.add('thought-bubble-uncertain');
        } else if (context === 'confident' || context === 'planning') {
            bubbleContent.classList.add('thought-bubble-confident');
        } else if (context === 'aggressive' || context === 'attacking') {
            bubbleContent.classList.add('thought-bubble-aggressive');
        } else if (context === 'strategic' || context === 'analyzing') {
            bubbleContent.classList.add('thought-bubble-strategic');
        } else if (context === 'defensive') {
            bubbleContent.classList.add('thought-bubble-defensive');
        } else if (context === 'targetTokyo') {
            bubbleContent.classList.add('thought-bubble-aggressive');
        } else if (context === 'underAttack') {
            bubbleContent.classList.add('thought-bubble-defensive');
        }
        
        bubbleContent.textContent = phrase;
        // Apply accent color from monster definition if available
        let accentColor = (player.monster && player.monster.color) ? player.monster.color : null;
        if (!accentColor && player.monster && player.monster.id) {
            // Fallback: attempt lookup via global MONSTERS (if replaced at runtime)
            if (typeof MONSTERS !== 'undefined' && MONSTERS[player.monster.id] && MONSTERS[player.monster.id].color) {
                accentColor = MONSTERS[player.monster.id].color;
            }
        }
        if (accentColor) {
            thoughtBubble.style.setProperty('--bubble-accent', accentColor);
        }
        thoughtBubble.appendChild(bubbleContent);
        
        // Decide positioning mode based on settings
        const tbMode = this.getThoughtBubbleSetting('positionMode', 'player'); // 'player' | 'center'
        document.body.appendChild(thoughtBubble);
    if (tbMode === 'player') {
            this.positionThoughtBubbleAtPlayer(thoughtBubble, player);
        } else {
            this.ensureThoughtBubbleModal(thoughtBubble); // legacy center modal
        }

        // Track active bubble for repositioning
        this._activeThoughtBubble = thoughtBubble;
        this._activeThoughtPlayerId = player.id;
        this._installThoughtBubbleRepositionHandlers();
        
        window.UI && window.UI._debug && window.UI._debug(`💭 ${player.monster.name} thinks: "${phrase}"`);
        
    // Auto-hide after configurable time based on AI config
    const baseHideDelay = 3200 + Math.random() * 1600; // Extended base: 3.2 - 4.8s
        let configuredDelay = baseHideDelay;
        
        // Use AI config timing if available
        if (this.aiEngine && this.aiEngine.config && this.aiEngine.config.timing && this.aiEngine.config.timing.speeds) {
            const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
            const speedConfig = this.aiEngine.config.timing.speeds[cpuSpeed];
            if (speedConfig && speedConfig.thoughtBubbleMultiplier) {
                configuredDelay = baseHideDelay * speedConfig.thoughtBubbleMultiplier;
            }
        } else {
            // Fallback to current system
            const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
            let speedMultiplier = 1;
            switch (cpuSpeed) {
                case 'fast': speedMultiplier = 0.6; break;
                case 'medium': speedMultiplier = 1; break;
                case 'slow': speedMultiplier = 1.5; break;
            }
            configuredDelay = baseHideDelay * speedMultiplier;
        }
        
        // Apply user-defined duration multiplier
        const userDurationMultiplier = parseFloat(this.getThoughtBubbleSetting('durationMultiplier', '1')) || 1;
        configuredDelay = configuredDelay * userDurationMultiplier;
        setTimeout(() => this.hideCPUThoughtBubble(player), configuredDelay);

        // Mark bubble shown for this turn (only if current player's turn)
        try {
            const current = this.game && this.game.getCurrentPlayer ? this.game.getCurrentPlayer() : null;
            if (current && current.id === player.id) {
                this._shownBubbleThisTurn = true;
            }
        } catch (markErr) {
            console.warn('Failed marking bubble turn state:', markErr);
        }
    }

    // Trigger intro visual effects for specific first-player phrases
    triggerIntroEffect(type, onComplete, playerId) {
        try {
            const container = document.querySelector('.game-board') || document.body;
            const overlay = document.createElement('div');
            overlay.className = `intro-effect intro-effect-${type}`;
            overlay.setAttribute('data-effect-type', type);
            container.appendChild(overlay);

            const cleanup = () => {
                if (!overlay.parentNode) return;
                overlay.classList.add('intro-effect-fade');
                setTimeout(() => { overlay.parentNode && overlay.parentNode.removeChild(overlay); }, 800);
            };

            if (type === 'party') {
                // Generate balloons & confetti
                for (let i = 0; i < 18; i++) {
                    const b = document.createElement('div');
                    b.className = 'balloon';
                    b.style.left = (Math.random()*100) + '%';
                    b.style.animationDelay = (Math.random()*0.8)+'s';
                    b.style.animationDuration = (5 + Math.random()*3)+'s';
                    overlay.appendChild(b);
                }
                for (let i = 0; i < 80; i++) {
                    const c = document.createElement('div');
                    c.className = 'confetti';
                    c.style.left = (Math.random()*100) + '%';
                    c.style.animationDelay = (Math.random()*1.2)+'s';
                    c.style.backgroundColor = ['#FF4757','#1E90FF','#2ED573','#FFA502','#FF6B81'][i%5];
                    overlay.appendChild(c);
                }
                setTimeout(() => { cleanup(); onComplete && onComplete(); }, 2200);
            } else if (type === 'showtime') {
                // Spotlights sweep quickly then reveal
                const left = document.createElement('div');
                const right = document.createElement('div');
                left.className = 'spotlight spotlight-left';
                right.className = 'spotlight spotlight-right';
                overlay.appendChild(left); overlay.appendChild(right);
                setTimeout(() => { overlay.classList.add('lights-on'); }, 400);
                setTimeout(() => { cleanup(); onComplete && onComplete(); }, 1200);
            } else if (type === 'dawn') {
                // Multi-stage gradient transition controlled by CSS animation length
                setTimeout(() => { cleanup(); onComplete && onComplete(); }, 3000);
            } else {
                // Fallback just execute
                setTimeout(() => { cleanup(); onComplete && onComplete(); }, 800);
            }
        } catch(e) {
            console.warn('Intro effect error:', e);
            onComplete && onComplete();
        }
    }
    
    /**
     * Ensure thought bubble is properly positioned as a modal
     */
    ensureThoughtBubbleModal(thoughtBubble) {
        // Force modal positioning
        thoughtBubble.style.position = 'fixed';
        thoughtBubble.style.top = '30%';
        thoughtBubble.style.left = '50%';
        thoughtBubble.style.transform = 'translateX(-50%)';
        thoughtBubble.style.zIndex = '3999'; // Just below action-menu (4000)
        thoughtBubble.style.pointerEvents = 'none';
        
        // Ensure it's above other content by temporarily hiding elements that might interfere
        const gameBoard = document.querySelector('.game-board');
        const monstersPanel = document.querySelector('#monsters-panel');
        const powerCardsPanel = document.querySelector('#power-cards-panel');
        
        // Add a modal overlay effect
        const thoughtOverlay = document.createElement('div');
        thoughtOverlay.className = 'thought-bubble-overlay';
        thoughtOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.1);
            z-index: 3998;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(thoughtOverlay);
        
        // Fade in the overlay
        setTimeout(() => {
            thoughtOverlay.style.opacity = '1';
        }, 50);
        
        // Store reference to overlay for cleanup
        thoughtBubble.thoughtOverlay = thoughtOverlay;
    }

    // Position bubble near player's card element (with viewport bounds safety)
    positionThoughtBubbleAtPlayer(thoughtBubble, player) {
        try {
            // Special handling: if player is in Tokyo, anchor above Tokyo City tile
            if (player.inTokyo) {
                const tokyoCity = document.querySelector('.tokyo-city');
                if (tokyoCity) {
                    const tRect = tokyoCity.getBoundingClientRect();
                    thoughtBubble.style.position = 'fixed';
                    thoughtBubble.style.top = `${Math.max(10, tRect.top - 20)}px`;
                    thoughtBubble.style.left = `${tRect.left + tRect.width / 2}px`;
                    thoughtBubble.style.transform = 'translate(-50%, -100%)';
                    thoughtBubble.style.zIndex = '3999';
                    thoughtBubble.style.pointerEvents = 'none';
                    return; // No overlay for Tokyo anchor to keep board clear
                }
            }

            // Otherwise anchor near the active player's profile picture (avatar) if available
            let anchor = document.querySelector(`.player-card[data-player-id="${player.id}"] .monster-avatar, .player-card[data-player-id="${player.id}"] .monster-headshot, .player-card[data-player-id="${player.id}"] img`);
            if (!anchor) {
                // Fallback to entire card
                anchor = document.querySelector(`.player-card[data-player-id="${player.id}"]`);
            }
            if (!anchor) return this.ensureThoughtBubbleModal(thoughtBubble); // fallback modal
            const rect = anchor.getBoundingClientRect();
            const offsetY = -12; // just above avatar
            const offsetX = rect.width / 2;
            thoughtBubble.style.position = 'fixed';
            thoughtBubble.style.top = `${Math.max(10, rect.top + offsetY)}px`;
            thoughtBubble.style.left = `${rect.left + offsetX}px`;
            thoughtBubble.style.transform = 'translate(-50%, -100%)';
            thoughtBubble.style.zIndex = '3999';
            thoughtBubble.style.pointerEvents = 'none';
            // No dim overlay for inline player bubbles (less intrusive)
        } catch (e) {
            console.warn('Failed positioning thought bubble at player, fallback to modal:', e);
            this.ensureThoughtBubbleModal(thoughtBubble);
        }
    }

    // Retrieve thought bubble setting with defaults
    getThoughtBubbleSetting(key, defaultValue) {
        const fullKey = `thoughtBubble.${key}`;
        const stored = localStorage.getItem(fullKey);
        return stored === null ? defaultValue : stored;
    }
    
    hideCPUThoughtBubble(player) {
        const existingBubble = document.querySelector(`.cpu-thought-bubble[data-player-id="${player.id}"]`);
        if (existingBubble) {
            // Clean up overlay if it exists
            if (existingBubble.thoughtOverlay) {
                existingBubble.thoughtOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (existingBubble.thoughtOverlay.parentNode) {
                        existingBubble.thoughtOverlay.parentNode.removeChild(existingBubble.thoughtOverlay);
                    }
                }, 300);
            }
            
            existingBubble.classList.add('disappearing');
            setTimeout(() => {
                if (existingBubble.parentNode) {
                    existingBubble.parentNode.removeChild(existingBubble);
                }
            }, 500);
        }
    }

    // Clean up all thought bubbles (called when turn ends)
    cleanupAllThoughtBubbles() {
        const allBubbles = document.querySelectorAll('.cpu-thought-bubble');
        allBubbles.forEach(bubble => {
            // Clean up overlay if it exists
            if (bubble.thoughtOverlay) {
                bubble.thoughtOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (bubble.thoughtOverlay.parentNode) {
                        bubble.thoughtOverlay.parentNode.removeChild(bubble.thoughtOverlay);
                    }
                }, 300);
            }
            
            bubble.classList.add('disappearing');
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            }, 500);
        });
        
        if (allBubbles.length > 0) {
            window.UI && window.UI._debug && window.UI._debug(`💭 Cleaned up ${allBubbles.length} thought bubble(s) at turn end`);
        }
    }
    
    getCPUThoughtPhrase(player, context) {
        if (!player.monster) return null;
        // Some code paths store personality directly on monster without a separate profile object
        const profile = player.monster.profile || player.monster.personality;
        if (!profile) return null;
        const gameState = this.game?.getCurrentGameState ? this.game.getCurrentGameState() : {};
        const isInTokyo = !!player.inTokyo;
        const tokyoPlayer = this.game?.getPlayerInTokyo ? this.game.getPlayerInTokyo() : null;
        const currentPlayer = this.game?.getCurrentPlayer ? this.game.getCurrentPlayer() : null;
        const diceSummary = currentPlayer && this._lastDiceSummary[currentPlayer.id];
        const outsidePlayers = this.game?.players ? this.game.players.filter(p => !p.inTokyo) : [];

        // --- New dynamic phrase banks ---
        const dynamicBanks = {
            tokyoLowHealthDefensive: [
                "Please don't kill me!",
                "Mercy! I'm almost done!",
                "I can't take much more!",
                "Don't finish me off!",
                "Just one more turn... please!"
            ],
            tokyoDefiant: [
                "If you attack me you'll regret it!",
                "Come on then! I dare you!",
                "Hit me and I'll hit back harder!",
                "Tokyo is MINE. Back off!",
                "You'll pay for every scratch!"
            ],
            tokyoTauntHighHP: [
                "You can't push me out!",
                "Still plenty of roar left!",
                "Come at me, lightweights!",
                "Is that all you've got?",
                "Tokyo loves a real champion!"
            ],
            outsideChasingSet: [
                "One more {face}... come on!",
                "Please roll another {face}!",
                "YES, just need one more {face}!",
                "Set it up... now finish it!",
                "Need that last {face} for big points!"
            ],
            outsideHopingNoSet: [
                "Don't roll another {face}...",
                "Please miss that {face}!",
                "No more {face}, no more!",
                "Break that streak!",
                "C'mon dice, betray them!"
            ],
            tokyoHopingNoAttack: [
                "Don't roll claws... don't roll claws...",
                "Please no attacks this time...",
                "Let them go for numbers, not me!",
                "Stay peaceful... stay peaceful...",
                "Maybe they'll chase points instead"
            ],
            tokyoWelcomingAttacksForExit: [
                "Hit me so I can LEAVE!",
                "Please knock me out so I can heal!",
                "One more hit and I bail!",
                "Almost time to abandon Tokyo...",
                "Just push me out already!"
            ]
        };
        
    // Context-specific phrase collections (static legacy sets)
        const phrases = {
            general: [
                "Let me think about this...",
                "What's the best move here?",
                "Hmm, interesting situation...",
                "Time to strategize!",
                "What would a monster do?",
                "Let me calculate the odds..."
            ],
            
            uncertain: [
                "I'm not really sure what to do here",
                "This is a tough decision...",
                "Maybe I should play it safe?",
                "What would my mother monster do?",
                "Eenie, meenie, miney, moe...",
                "When in doubt, ROAR!"
            ],
            
            needHearts: [
                "I really need hearts!",
                "Health is getting low...",
                "Time to heal up!",
                "One heart would be nice...",
                "My monster needs a snack!",
                "Getting a bit worried here..."
            ],
            
            needEnergy: [
                "I could use some energy",
                "Power cards look tempting...",
                "More lightning please!",
                "Energy equals opportunity!",
                "Time to charge up!",
                "I need to power up!"
            ],
            
            needNumbers: [
                "I could really use a 3",
                "Come on, give me some points!",
                "Numbers, numbers everywhere...",
                "Victory points would be nice!",
                "I need to score big!",
                "Time for some counting!"
            ],
            
            aggressive: [
                "Time to SMASH!",
                "Who needs to be punched?",
                "RAWR! Attack mode!",
                "Let's cause some chaos!",
                "Violence is the answer!",
                "Somebody's going down!"
            ],
            
            strategic: [
                "Let me analyze this carefully...",
                "Calculating probability matrices...",
                "The optimal path is...",
                "According to my calculations...",
                "Strategy over brute force!",
                "Time for big brain moves!"
            ],
            
            confident: [
                "I've got this!",
                "Easy choice!",
                "This is my moment!",
                "Watch and learn!",
                "I know exactly what to do!",
                "Victory is inevitable!"
            ],
            
            lowHealth: [
                "Getting a bit scary here...",
                "Maybe I should hide?",
                "Health is not looking good...",
                "Time to play defensively!",
                "Survival mode activated!",
                "I don't feel so good..."
            ],
            
            highEnergy: [
                "So many options!",
                "Power card shopping time!",
                "Energy is power!",
                "Let's spend some lightning!",
                "Time to go crazy!",
                "Rich monster problems!"
            ],
            
            closeToWinning: [
                "Victory is within reach!",
                "Almost there!",
                "Just a few more points...",
                "I can taste victory!",
                "Don't mess this up now!",
                "Focus on the prize!"
            ],
            
            tokyoDecision: [
                "Should I stay or should I go?",
                "Tokyo is dangerous but rewarding...",
                "Risk vs. reward time!",
                "Maybe I should play it safe?",
                "Fortune favors the bold!",
                "What would a true monster do?"
            ],
            
            defensive: [
                "I should block their strategy...",
                "They can't have that card!",
                "Denial is the best defense!",
                "Time to cut off their supply!",
                "Prevention is better than cure!",
                "I'll take this away from them!"
            ],
            // New attacker context when outside targeting Tokyo occupant
            targetTokyo: [
                "Knocking on Tokyo's door!",
                "Time to evict them!",
                "Tokyo will be MINE!",
                "I'm coming for that skyline!",
                "Get out of my city!",
                "Prepare to yield Tokyo!"
            ],
            // Defender in Tokyo when attacked
            underAttack: [
                "Under siege!",
                "They're hammering the walls...",
                "Hold Tokyo!",
                "I can take a few hits!",
                "They want my city...",
                "I won't give up Tokyo!"
            ]
        };
        
        // First-player pre-first-roll intro gating
        if (this._firstPlayerIntroActive && !this._firstPlayerFirstRollOccurred && this._firstPlayerId === player.id) {
            const introPhrases = [
                "Let's get ready to rumble!",
                "Let's get this party started!",
                "Time to wake this city up!",
                "Cue the chaos!",
                "Showtime!",
                "Here we go!",
                "Let the smashing commence!"
            ];
            const chosen = introPhrases[Math.floor(Math.random()*introPhrases.length)];
            return chosen; // bypass other logic until first roll
        }

        // Determine appropriate context based on game state
        // 1. High-priority contextual overrides
        // a) Tokyo occupant special logic
        if (isInTokyo) {
            if (player.health <= 2) {
                return this.personalizePhrase(randomFrom(dynamicBanks.tokyoLowHealthDefensive), profile);
            }
            // If healthy and being threatened (any outside player has >=2 attack icons locked in current summary)
            if (currentPlayer && currentPlayer !== player && !currentPlayer.inTokyo && diceSummary && diceSummary.counts['attack'] >= 2) {
                // Lower health -> defensive, higher health -> defiant/taunt
                if (player.health <= 5) {
                    return this.personalizePhrase(randomFrom(dynamicBanks.tokyoDefiant), profile);
                } else {
                    return this.personalizePhrase(randomFrom(dynamicBanks.tokyoTauntHighHP), profile);
                }
            }
            // If it's the Tokyo player's own turn and they are low-ish and might want to leave after an attack
            if (currentPlayer === player && player.health <= 3) {
                return this.personalizePhrase(randomFrom(dynamicBanks.tokyoHopingNoAttack), profile);
            }
        } else { // Outside Tokyo logic
            if (tokyoPlayer) {
                // If current outside player is chasing a set (two of same number)
                if (currentPlayer === player && diceSummary) {
                    const targetSetFace = Object.entries(diceSummary.counts).find(([face, c]) => ['1','2','3'].includes(face) && c === 2);
                    if (targetSetFace) {
                        return this.personalizePhrase(randomFrom(dynamicBanks.outsideChasingSet).replace('{face}', targetSetFace[0]), profile);
                    }
                }
                // If Tokyo player's turn and they have two of a number, outside player may hope they miss third
                if (currentPlayer === tokyoPlayer && diceSummary) {
                    const nearSet = Object.entries(diceSummary.counts).find(([face, c]) => ['1','2','3'].includes(face) && c === 2);
                    if (nearSet) {
                        return this.personalizePhrase(randomFrom(dynamicBanks.outsideHopingNoSet).replace('{face}', nearSet[0]), profile);
                    }
                }
            }
        }

        // b) Reaction when another player (outside) is building attacks against Tokyo occupant
        if (tokyoPlayer && currentPlayer && currentPlayer !== tokyoPlayer && !currentPlayer.inTokyo && tokyoPlayer.health <= 4 && diceSummary && diceSummary.counts['attack'] >= 3) {
            return this.personalizePhrase(randomFrom(dynamicBanks.tokyoDefiant), profile);
        }

        let selectedPhrases = phrases.general;
        
        if (context === 'tokyo-decision') {
            selectedPhrases = phrases.tokyoDecision;
        } else if (context === 'targetTokyo') {
            selectedPhrases = phrases.targetTokyo;
        } else if (context === 'underAttack') {
            selectedPhrases = phrases.underAttack;
        } else if (player.health <= 3) {
            selectedPhrases = phrases.lowHealth;
        } else if (player.health <= 5) {
            selectedPhrases = phrases.needHearts;
        } else if (player.energy >= 8) {
            selectedPhrases = phrases.highEnergy;
        } else if (player.energy <= 2) {
            selectedPhrases = phrases.needEnergy;
        } else if (player.victoryPoints >= 15) {
            selectedPhrases = phrases.closeToWinning;
        } else if (context === 'needNumbers') {
            selectedPhrases = phrases.needNumbers;
        } else if (profile.aggression >= 4) {
            selectedPhrases = phrases.aggressive;
        } else if (profile.strategy >= 4) {
            selectedPhrases = phrases.strategic;
        } else if (profile.risk >= 4) {
            selectedPhrases = phrases.confident;
        } else if (phrases[context]) {
            selectedPhrases = phrases[context];
        }
        
        // Add personality-based phrase modifications
        let basePhrase = selectedPhrases[Math.floor(Math.random() * selectedPhrases.length)];
        // Anti-repetition: keep last 3 phrases per player
        const pid = player.id;
        this._recentThoughts[pid] = this._recentThoughts[pid] || [];
        let guard = 0;
        while (this._recentThoughts[pid].includes(basePhrase) && guard < 5) {
            basePhrase = selectedPhrases[Math.floor(Math.random() * selectedPhrases.length)];
            guard++;
        }
        this._recentThoughts[pid].push(basePhrase);
        if (this._recentThoughts[pid].length > 3) this._recentThoughts[pid].shift();
        return this.personalizePhrase(basePhrase, profile);

        // Helper used above
        function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    }
    
    personalizePhrase(phrase, profile) {
        // Add personality-based modifications
        if (profile.aggression >= 4 && Math.random() < 0.3) {
            const aggressiveModifiers = ['RAWR! ', '💪 ', 'SMASH! '];
            phrase = aggressiveModifiers[Math.floor(Math.random() * aggressiveModifiers.length)] + phrase;
        }
        
        if (profile.strategy >= 4 && Math.random() < 0.3) {
            const strategicModifiers = ['🤔 ', '📊 ', '🧠 '];
            phrase = strategicModifiers[Math.floor(Math.random() * strategicModifiers.length)] + phrase;
        }
        
        if (profile.risk >= 4 && Math.random() < 0.3) {
            const riskModifiers = ['🎲 ', '⚡ ', '🔥 '];
            phrase = riskModifiers[Math.floor(Math.random() * riskModifiers.length)] + phrase;
        }
        
        return phrase;
    }

    // CPU Timing Configuration - reads from AI config and user settings
    getCPUThinkingTime(context = 'general') {
        const cpuSpeed = localStorage.getItem('cpuSpeed') || 'medium';
        
        // Get timing from AI configuration if available
        if (this.aiEngine && this.aiEngine.config && this.aiEngine.config.timing && this.aiEngine.config.timing.speeds) {
            const speedConfig = this.aiEngine.config.timing.speeds[cpuSpeed];
            if (speedConfig) {
                switch (context) {
                    case 'turnStart': return speedConfig.turnStart || 1500;
                    case 'diceAnimation': return speedConfig.diceAnimation || 2000;
                    case 'decisionThinking': return speedConfig.decisionThinking || 3000;
                    case 'endTurn': return speedConfig.endTurn || 1500;
                    case 'nextRoll': return speedConfig.nextRoll || 1000;
                    case 'powerCardThinking': return speedConfig.powerCardThinking || 2000;
                    case 'cardDecision': return speedConfig.cardDecision || 1500;
                    case 'purchaseDecision': return speedConfig.purchaseDecision || 2000;
                    case 'purchaseDelay': return speedConfig.purchaseDelay || 1000;
                    case 'general':
                    default: return speedConfig.decisionThinking || 3000;
                }
            }
        }
        
        // Fallback to hardcoded values based on speed setting
        let baseTime;
        switch (context) {
            case 'turnStart': baseTime = 1500; break;
            case 'diceAnimation': baseTime = 2000; break;
            case 'decisionThinking': baseTime = 3000; break;
            case 'endTurn': baseTime = 1500; break;
            case 'nextRoll': baseTime = 1000; break;
            case 'powerCardThinking': baseTime = 2000; break;
            case 'cardDecision': baseTime = 1500; break;
            case 'purchaseDecision': baseTime = 2000; break;
            case 'purchaseDelay': baseTime = 1000; break;
            case 'general':
            default: baseTime = 3000; break;
        }
        
        // Apply speed multiplier
        switch (cpuSpeed) {
            case 'fast': return Math.round(baseTime * 0.6);
            case 'medium': return baseTime;
            case 'slow': return Math.round(baseTime * 1.5);
            default: return baseTime;
        }
    }

    // CPU Turn Management - restored functions that are actively used
    startAutomaticCPUTurn(player) {
        // Entry point for CPU turns - delegates to the main CPU handler
        this.handleCPUTurn(player);
    }

    processCPUTurn() {
        // Processes CPU turn for the current player - delegates to the main CPU handler
        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer && currentPlayer.playerType === 'cpu') {
            this.handleCPUTurn(currentPlayer);
        }
    }

    // Initialize responsive panel behavior
    initializeResponsivePanels() {
        // Create toggle overlays for very narrow screens
        this.createPanelToggleOverlays();
        
        // Listen for window resize to handle responsive behavior
        window.addEventListener('resize', () => {
            this.handleResponsivePanels();
        });
        
        // Initial check
        this.handleResponsivePanels();
    }
    
    createPanelToggleOverlays() {
        // Create left toggle overlay for monsters
        const leftOverlay = document.createElement('div');
        leftOverlay.className = 'panel-toggle-overlay left';
        leftOverlay.id = 'monsters-toggle-overlay';
        leftOverlay.textContent = 'Monsters';
        leftOverlay.addEventListener('click', () => this.togglePanelOverlay('monsters'));
        document.body.appendChild(leftOverlay);
        
        // Create right toggle overlay for power cards
        const rightOverlay = document.createElement('div');
        rightOverlay.className = 'panel-toggle-overlay right';
        rightOverlay.id = 'power-cards-toggle-overlay';
        rightOverlay.textContent = 'Cards';
        rightOverlay.addEventListener('click', () => this.togglePanelOverlay('power-cards'));
        document.body.appendChild(rightOverlay);
    }
    
    handleResponsivePanels() {
        const isVeryNarrow = window.innerWidth <= 480;
        const leftOverlay = document.getElementById('monsters-toggle-overlay');
        const rightOverlay = document.getElementById('power-cards-toggle-overlay');
        
        if (isVeryNarrow) {
            // Show overlays on very narrow screens
            if (leftOverlay) leftOverlay.style.display = 'block';
            if (rightOverlay) rightOverlay.style.display = 'block';
        } else {
            // Hide overlays on wider screens
            if (leftOverlay) leftOverlay.style.display = 'none';
            if (rightOverlay) rightOverlay.style.display = 'none';
            
            // Remove force-show class if present
            const monstersPanel = document.getElementById('monsters-panel');
            const cardsPanel = document.getElementById('power-cards-panel');
            if (monstersPanel) monstersPanel.classList.remove('force-show');
            if (cardsPanel) cardsPanel.classList.remove('force-show');
        }
    }
    
    togglePanelOverlay(panelType) {
        const panelId = panelType === 'monsters' ? 'monsters-panel' : 'power-cards-panel';
        const panel = document.getElementById(panelId);
        
        if (!panel) return;
        
        const isForceShown = panel.classList.contains('force-show');
        
        if (isForceShown) {
            // Hide the panel
            panel.classList.remove('force-show');
        } else {
            // Show the panel
            panel.classList.add('force-show');
            
            // Hide the other panel if it's shown
            const otherPanelId = panelType === 'monsters' ? 'power-cards-panel' : 'monsters-panel';
            const otherPanel = document.getElementById(otherPanelId);
            if (otherPanel) otherPanel.classList.remove('force-show');
        }
    }

    // Panel toggle functionality
    togglePanel(panelType) {
        const panelId = panelType === 'monsters' ? 'monsters-panel' : 'power-cards-panel';
        const panel = document.getElementById(panelId);
        
        if (!panel) return;

        const isCollapsed = panel.classList.contains('collapsed');
        const collapsedClass = panelType === 'monsters' ? 'monsters-collapsed' : 'cards-collapsed';
        
        if (isCollapsed) {
            // Expand the panel
            panel.classList.remove('collapsed');
            panel.classList.remove(collapsedClass);
        } else {
            // Collapse the panel
            panel.classList.add('collapsed');
            panel.classList.add(collapsedClass);
        }

        // Update arrow direction based on panel type and state
        const arrow = panel.querySelector('.toggle-arrow');
        if (arrow) {
            if (panelType === 'monsters') {
                // Right panel: > when expanded (collapse right), < when collapsed (expand left)
                arrow.textContent = isCollapsed ? '<' : '>';
            } else {
                // Left panel: < when expanded (collapse left), > when collapsed (expand right)  
                arrow.textContent = isCollapsed ? '>' : '<';
            }
        }
    }

    // Game Pause Functionality
    initializeGamePause() {
        this.gamePaused = false;
        this.pausedTimeouts = new Set(); // Track active timeouts
        this.originalSetTimeout = window.setTimeout.bind(window); // Store original setTimeout with proper binding
        this.originalClearTimeout = window.clearTimeout.bind(window); // Store original clearTimeout with proper binding
        
        // Override setTimeout to track CPU timers
        window.setTimeout = (callback, delay, ...args) => {
            if (this.gamePaused) {
                // If game is paused, don't start new timeouts
                return null;
            }
            
            const timeoutId = this.originalSetTimeout(() => {
                // Remove from tracked timeouts when executed
                this.pausedTimeouts.delete(timeoutId);
                callback(...args);
            }, delay);
            
            // Track this timeout
            this.pausedTimeouts.add(timeoutId);
            return timeoutId;
        };
        
        // Override clearTimeout to handle tracked timeouts
        window.clearTimeout = (timeoutId) => {
            this.pausedTimeouts.delete(timeoutId);
            return this.originalClearTimeout(timeoutId);
        };
    }

    toggleGamePause() {
        if (!this.game) {
            console.log('No active game to pause');
            return;
        }

        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            this.pauseGame();
        } else {
            this.unpauseGame();
        }
    }

    pauseGame() {
        console.log('🛑 Game paused');
        
        // Clear all active CPU timeouts
        this.pausedTimeouts.forEach(timeoutId => {
            this.originalClearTimeout(timeoutId);
        });
        this.pausedTimeouts.clear();
        
        // Stop CPU processing
        if (this.cpuTurnState) {
            this.cpuTurnState.isPaused = true;
            console.log('🛑 CPU turn paused');
        }
        
        // Update button appearance
        this.updatePauseButton(true);
        
        // Show pause notification
        UIUtilities.showMessage('⏸️ Game Paused', 2000, this.elements);
        
        // Show the pause overlay
        if (this.elements.gamePauseOverlay) {
            this.elements.gamePauseOverlay.classList.remove('hidden');
        }
        
        // Add visual indication to game container only
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.add('game-paused');
        }
    }

    unpauseGame() {
        console.log('▶️ Game unpaused');
        
        // Resume CPU processing if needed
        if (this.cpuTurnState) {
            this.cpuTurnState.isPaused = false;
            console.log('▶️ CPU turn resumed');
            
            // Resume CPU turn using new AI system
            const currentPlayer = this.game.getCurrentPlayer();
            if (currentPlayer && currentPlayer.playerType === 'cpu' && !currentPlayer.isEliminated) {
                this.originalSetTimeout(() => {
                    if (this.cpuTurnState && !this.cpuTurnState.isPaused) {
                        console.log('▶️ Resuming CPU turn for:', currentPlayer.monster.name);
                        this.handleCPUTurn(currentPlayer);
                    }
                }, 500);
            }
        }
        
        // Update button appearance
        this.updatePauseButton(false);
        
        // Show resume notification
        UIUtilities.showMessage('▶️ Game Resumed', 2000, this.elements);
        
        // Hide the pause overlay
        if (this.elements.gamePauseOverlay) {
            this.elements.gamePauseOverlay.classList.add('hidden');
        }
        
        // Remove visual indication from game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.remove('game-paused');
        }
    }

    updatePauseButton(isPaused) {
        const pauseBtn = this.elements.pauseGameBtn;
        if (!pauseBtn) return;
        
        const icon = pauseBtn.querySelector('.toolbar-icon svg path');
        const button = pauseBtn;
        
        if (isPaused) {
            // Change to play icon
            icon.setAttribute('d', 'M8,5.14V19.14L19,12.14L8,5.14Z');
            button.title = 'Resume Game';
            button.classList.add('paused');
        } else {
            // Change to pause icon
            icon.setAttribute('d', 'M14,19H18V5H14M6,19H10V5H6V19Z');
            button.title = 'Pause Game';
            button.classList.remove('paused');
        }
    }

    // ============================================================================
    // NEW SIMPLE CPU SYSTEM
    // ============================================================================
    // Generic CPU notification helper (replaces old simple-specific notification)
    showCPUNotification(player, message) {
        // If a more advanced notification system exists, use it; otherwise fallback to console
        try {
            const diceContainer = document.querySelector('.dice-container') || document.querySelector('#dice-area');
            if (!diceContainer) {
                console.log(`CPU: ${player.monster.name} - ${message}`);
                return;
            }

            // Remove any existing CPU notification
            const existingNotification = document.querySelector('.cpu-action-notification');
            if (existingNotification) existingNotification.remove();

            const notification = document.createElement('div');
            notification.className = 'cpu-action-notification';
            notification.innerHTML = `
                <div class="notification-avatar">
                    <img src="${player.monster.image}" alt="${player.monster.name}">
                </div>
                <div class="notification-text">${message}</div>
            `;

            diceContainer.style.position = 'relative';
            diceContainer.appendChild(notification);
            setTimeout(() => notification.classList.add('visible'), 100);
            setTimeout(() => {
                notification.classList.remove('visible');
                setTimeout(() => notification.remove(), 500);
            }, 3000);
        } catch (e) {
            console.log(`CPU: ${player.monster.name} - ${message}`);
        }
    }

    // Main CPU turn handler - new simple system
    handleCPUTurn(player) {
        if (!player || player.playerType !== 'cpu' || player.isEliminated) {
            return;
        }

        console.log(`🤖 NEW CPU: ${player.monster.name} starting turn`);
        
        // Initialize CPU turn state if not exists
        if (!this.cpuTurnState) {
            this.cpuTurnState = {
                player: player,
                isProcessing: true,
                isPaused: false,
                rollNumber: 1
            };
        }
        
        // Show thinking bubble at start of turn
        this.showCPUThoughtBubble(player, 'planning');
        
        // Update controls immediately when CPU turn starts
        this.updateDiceControls();
        
        // Start with proper notification that turn begins
    this.showCPUNotification(player, `🎲 ${player.monster.name}'s turn begins...`);
        
        setTimeout(() => {
            // Check for pause before proceeding
            if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
                console.log('⏸️ CPU turn paused during initial delay');
                return;
            }
            this.cpuRollDice(player, 1);
        }, this.getCPUThinkingTime('turnStart'));
    }

    // CPU rolls dice with AI decision making
    cpuRollDice(player, rollNumber) {
        // AI is the single CPU mode; always use AI decision logic
        this.cpuRollDiceAI(player, rollNumber);
    }

    // AI-powered CPU rolling (new logic with decision making)
    cpuRollDiceAI(player, rollNumber) {
        console.log('🔍 DEBUG: cpuRollDiceAI called with rollNumber:', rollNumber);
        window.UI && window.UI._debug && window.UI._debug(`🎲 AI CPU: Starting roll ${rollNumber}/3`);
        
        // Check for pause before rolling
        if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
            console.log('⏸️ CPU turn paused during AI roll');
            return;
        }
        
        // Always roll, regardless of dice state
        if (rollNumber <= 3) {
            console.log('🔍 DEBUG: rollNumber <= 3, proceeding with roll');
            window.UI && window.UI._debug && window.UI._debug(`🎲 AI CPU: Executing roll ${rollNumber}/3`);
            this.showCPUNotification(player, `🎲 ${player.monster.name} rolling... (${rollNumber}/3)`);
            
            // Show thinking bubble during rolling
            if (rollNumber === 1) {
                this.showCPUThoughtBubble(player, 'general');
            } else if (rollNumber === 2) {
                this.showCPUThoughtBubble(player, 'strategic');
            } else {
                this.showCPUThoughtBubble(player, 'aggressive');
            }
            
            // Execute the roll
            this.rollDice();
            
            // Wait for dice animation to complete (400ms + buffer)
            setTimeout(() => {
                // Check for pause after roll
                if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
                    console.log('⏸️ CPU turn paused after AI roll');
                    return;
                }
                
                const diceState = this.game.diceRoller.getState();
                
                window.UI && window.UI._debug && window.UI._debug(`🎲 AI CPU: After roll ${rollNumber}, rolls remaining: ${diceState.rollsRemaining}`);
                
                // Add 3-second delay AFTER showing dice outcome for human player to see results
                setTimeout(() => {
                    // Check for pause before decision
                    if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
                        console.log('⏸️ CPU turn paused during AI decision delay');
                        return;
                    }
                    
                    console.log('🔍 DEBUG: Roll decision logic:', {
                        rollNumber: rollNumber,
                        rollsRemaining: diceState.rollsRemaining,
                        condition1: rollNumber < 3,
                        condition2: diceState.rollsRemaining > 0,
                        shouldContinue: rollNumber < 3 && diceState.rollsRemaining > 0
                    });
                    
                    // NEW AI LOGIC: Use AI decision engine to decide whether to keep rolling
                    if (rollNumber < 3 && diceState.rollsRemaining > 0) {
                        console.log('🔍 DEBUG: Making AI roll decision for roll', rollNumber);
                        this.makeAIRollDecision(player, rollNumber, diceState);
                    } else {
                        // After 3rd roll, CPU is done - resolve dice and consider power cards before ending turn
                        console.log('🔍 DEBUG: Ending turn - rollNumber:', rollNumber, 'rollsRemaining:', diceState.rollsRemaining);
                        window.UI && window.UI._debug && window.UI._debug(`🤖 AI CPU: ${player.monster.name} finished rolling, considering power cards and ending turn`);
                        this.showCPUNotification(player, `✅ ${player.monster.name} considering power cards...`);
                        
                        setTimeout(() => {
                            // Check for pause before ending
                            if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
                                console.log('⏸️ CPU turn paused before ending turn');
                                return;
                            }
                            
                            // Update controls before ending turn to re-enable action menu
                            this.updateDiceControls();
                            
                            // Consider power card purchases before ending turn
                            this.handleCPUPowerCardPhase(player);
                        }, this.getCPUThinkingTime('endTurn'));
                    }
                }, this.getCPUThinkingTime('decisionThinking')); // Configurable delay for human to see dice outcome
            }, 600); // Fixed: Match actual dice animation time (400ms + 200ms buffer)
        } else {
            // If somehow rollNumber > 3, force end turn
            console.log('🔍 DEBUG: rollNumber > 3, force ending turn. rollNumber:', rollNumber);
            this.showCPUNotification(player, `✅ ${player.monster.name} considering power cards...`);
            setTimeout(() => {
                // Check for pause before ending
                if (this.gamePaused || (this.cpuTurnState && this.cpuTurnState.isPaused)) {
                    console.log('⏸️ CPU turn paused before force ending turn');
                    return;
                }
                
                this.updateDiceControls();
                this.handleCPUPowerCardPhase(player);
            }, this.getCPUThinkingTime('endTurn'));
        }
    }

    // AI decision logic for CPU dice rolling
    async makeAIRollDecision(player, rollNumber, diceState) {
        try {
            // Show thinking bubble during decision making
            this.showCPUThoughtBubble(player, 'analyzing');
            
            // Get current dice results
            const diceResults = this.game.diceCollection.getAllDiceData();
            const rollsRemaining = diceState.rollsRemaining;
            const gameState = this.game.getGameState();
            
            window.UI && window.UI._debug && window.UI._debug(`🧠 AI making decision for ${player.monster.name}:`, {
                roll: rollNumber,
                rollsLeft: rollsRemaining,
                dice: diceResults.map(d => d.face)
            });
            
            // Use AI decision engine if available
            if (this.aiEngine) {
                console.log('🔍 DEBUG: Calling AI decision with:', {
                    diceResults: diceResults.map(d => d.face),
                    rollsRemaining: rollsRemaining,
                    rollNumber: rollNumber
                });
                
                const decision = await this.aiEngine.makeRollDecision(
                    diceResults.map(d => d.face), // Just the face values
                    rollsRemaining,
                    player,
                    gameState
                );
                
                console.log('🔍 DEBUG: AI decision received:', decision);
                
                console.log(`🧠 AI decision:`, decision);
                this.showCPUNotification(player, `🧠 ${player.monster.name} ${decision.reason}`);
                
                // Show thought bubble based on decision confidence
                if (decision.confidence > 0.8) {
                    this.showCPUThoughtBubble(player, 'confident');
                } else if (decision.confidence > 0.5) {
                    this.showCPUThoughtBubble(player, 'strategic');
                } else {
                    this.showCPUThoughtBubble(player, 'uncertain');
                }
                
                // Log to AI Logic Flow tab (only for CPU players)
                if (player.playerType === 'cpu') {
                    console.log('🔍 DEBUG: diceResults from getAllDiceData():', diceResults);
                    const diceAnalysis = this.createDiceAnalysis(diceResults, player, gameState);
                    console.log('🔍 DEBUG: createDiceAnalysis returned:', diceAnalysis);
                    console.log('🔍 DEBUG: About to call addAILogicEntry with:', {
                        playerName: player.monster.name,
                        decision: decision,
                        diceAnalysis: diceAnalysis
                    });
                    this.addAILogicEntry(player.monster.name, decision, diceAnalysis);
                }
                
                // Visually select the dice the CPU wants to keep
                if (decision.keepDice && decision.keepDice.length > 0) {
                    console.log('🔍 DEBUG: CPU wants to keep dice:', decision.keepDice);
                    this.cpuSelectDice(decision.keepDice);
                } else {
                    console.log('🔍 DEBUG: CPU not keeping any dice');
                }
                
                if (decision.action === 'reroll') {
                    // Show aggressive thought bubble if continuing to roll
                    this.showCPUThoughtBubble(player, 'aggressive');
                    // Continue to next roll
                    setTimeout(() => {
                        this.cpuRollDice(player, rollNumber + 1);
                    }, this.getCPUThinkingTime('nextRoll'));
                } else if (decision.action === 'keep' || decision.action === 'endRoll') {
                    // AI decided to stop rolling - resolve dice (if not already) and end turn
                    window.UI && window.UI._debug && window.UI._debug(`🤖 AI CPU: ${player.monster.name} stopping at roll ${rollNumber}, resolving dice and ending turn`);
                    this.showCPUNotification(player, `✅ ${player.monster.name} ending turn...`);

                    // Ensure dice effects are resolved so end-of-turn logic (like Tokyo entry) runs correctly
                    try {
                        const results = this.game.diceCollection.getResults();
                        if (!this.game.diceEffectsResolved) {
                            if (window.UI && window.UI.debugMode) {
                                window.UI._debug('AI stopping early: resolving dice effects now with results:', results);
                            }
                            this.game.resolveDiceEffects(results, true); // skipDiceLog true for AI convenience
                            this.triggerEvent && this.triggerEvent('turnPhaseChanged') && this.triggerEvent('turnPhaseChanged', { phase: 'resolving' });
                        }
                    } catch (e) {
                        console.error('Error resolving dice effects for AI stop:', e);
                    }

                    setTimeout(() => {
                        this.updateDiceControls();
                        // CPU players call handleCPUPowerCardPhase() then game.endTurn()
                        this.handleCPUPowerCardPhase(player);
                    }, this.getCPUThinkingTime('endTurn'));
                } else {
                    // Unknown action, fallback to ending turn
                    console.warn(`🤖 Unknown AI action: ${decision.action}, ending turn`);
                    this.showCPUNotification(player, `✅ ${player.monster.name} ending turn...`);
                    
                    setTimeout(() => {
                        this.updateDiceControls();
                        this.handleCPUPowerCardPhase(player);
                    }, this.getCPUThinkingTime('endTurn'));
                }
                // After applying decision, show targeted attack/defense bubbles if relevant
                try {
                    this._maybeShowAttackContextBubbles(player);
                } catch (e) {
                    console.warn('Attack context bubble logic failed:', e);
                }
            } else {
                // Fallback to simple behavior if AI engine not available
                console.warn('🤖 AI Engine not available, using fallback logic');
                this.showCPUThoughtBubble(player, 'uncertain');
                this.cpuRollDice(player, rollNumber + 1);
            }
        } catch (error) {
            console.error('🚨 AI Decision error:', error);
            // Fallback to simple behavior on error
            this.showCPUThoughtBubble(player, 'confused');
            this.cpuRollDice(player, rollNumber + 1);
        }
    }

    // Determine if current CPU outside Tokyo is rolling attacks toward a Tokyo occupant
    _maybeShowAttackContextBubbles(actingPlayer) {
        if (!this.game || !actingPlayer || actingPlayer.playerType !== 'cpu') return;
        const diceResults = this.game.diceCollection?.getResults?.();
        if (!diceResults) return;
        const attackCount = diceResults.attack || 0;
        if (attackCount === 0) return; // no attack intent
        const players = this.game.players || [];
        const tokyoOccupant = players.find(p => p.isInTokyo && !p.isEliminated);
        if (!tokyoOccupant) return;
        // Attacker: outside Tokyo, has attack dice, occupant is someone else
        if (!actingPlayer.isInTokyo && tokyoOccupant.id !== actingPlayer.id) {
            this.showCPUThoughtBubble(actingPlayer, 'targetTokyo', { highPriority: true });
            // Defender bubble (only for CPU defenders to avoid spamming humans)
            if (tokyoOccupant.playerType === 'cpu') {
                this.showCPUThoughtBubble(tokyoOccupant, 'underAttack', { highPriority: true });
            }
        }
    }

    // Handle CPU power card purchasing phase with defensive strategies
    handleCPUPowerCardPhase(player) {
        console.log(`🛍️ CPU ${player.monster.name} considering power card purchases`);
        
        // Get available power cards and player's current energy
        const availableCards = this.game.getAvailablePowerCards();
        const playerEnergy = player.energy;
        
        if (!availableCards || availableCards.length === 0) {
            console.log(`🛍️ No power cards available for ${player.monster.name}`);
            this.endCPUTurn(player);
            return;
        }
        
        if (playerEnergy <= 0) {
            console.log(`🛍️ ${player.monster.name} has no energy to buy cards`);
            this.endCPUTurn(player);
            return;
        }
        
        this.showCPUThoughtBubble(player, 'strategic');
    this.showCPUNotification(player, `🛍️ ${player.monster.name} evaluating power cards...`);
        
        setTimeout(() => {
            this.makeCPUPowerCardDecisions(player, availableCards);
        }, this.getCPUThinkingTime('powerCardThinking'));
    }

    // Make CPU power card purchasing decisions using defensive analysis
    makeCPUPowerCardDecisions(player, availableCards) {
        if (!this.aiEngine) {
            console.log(`🛍️ No AI engine available for ${player.monster.name}, ending turn`);
            this.endCPUTurn(player);
            return;
        }
        
        // Use new portfolio optimization system
        const portfolioOptimization = this.aiEngine.optimizePowerCardPortfolio(availableCards, player);
        
        if (portfolioOptimization.cards.length === 0) {
            console.log(`🛍️ ${player.monster.name} decided not to buy any cards (no profitable combinations)`);
            this.showCPUNotification(player, `🛍️ ${player.monster.name} chooses not to buy cards`);
            setTimeout(() => this.endCPUTurn(player), this.getCPUThinkingTime('cardDecision'));
            return;
        }
        
        // Also check for defensive purchasing opportunities
        const defensivePurchases = [];
        let remainingEnergy = player.energy;
        
        // After optimal portfolio, check if remaining energy can be used defensively
        const portfolioCost = portfolioOptimization.totalCost;
        const leftoverEnergy = remainingEnergy - portfolioCost;
        
        if (leftoverEnergy > 0) {
            const remainingCards = availableCards.filter(card => 
                !portfolioOptimization.cards.includes(card) && card.cost <= leftoverEnergy
            );
            
            for (const card of remainingCards) {
                const defensiveEval = this.aiEngine.evaluateDefensiveCardPurchase(card, player, availableCards);
                if (defensiveEval.shouldBuyDefensively) {
                    defensivePurchases.push({
                        card,
                        priority: defensiveEval.defensiveValue,
                        reason: defensiveEval.denialReason,
                        type: 'defensive',
                        cost: card.cost
                    });
                }
            }
        }
        
        // Combine portfolio purchases with defensive purchases
        const portfolioPurchases = portfolioOptimization.cards.map(card => ({
            card,
            priority: 100, // Portfolio purchases get highest priority
            reason: `Part of ${portfolioOptimization.strategy} strategy (efficiency: ${portfolioOptimization.efficiency.toFixed(1)})`,
            type: 'portfolio',
            cost: card.cost
        }));
        
        const allPurchases = [...portfolioPurchases, ...defensivePurchases.slice(0, 1)]; // Max 1 defensive purchase
        
        console.log(`🛍️ ${player.monster.name} planned purchases:`, 
                   allPurchases.map(p => `${p.card.name} (${p.type})`));
        
        // Execute purchases in order
        this.executeCPUPowerCardPurchases(player, allPurchases, 0);
    }

    // Execute CPU power card purchases one by one
    executeCPUPowerCardPurchases(player, purchaseDecisions, currentIndex) {
        if (currentIndex >= purchaseDecisions.length) {
            console.log(`🛍️ ${player.monster.name} finished all power card purchases`);
            this.endCPUTurn(player);
            return;
        }
        
        const decision = purchaseDecisions[currentIndex];
        const card = decision.card;
        
        // Check if player still has enough energy
        if (player.energy < card.cost) {
            console.log(`🛍️ ${player.monster.name} no longer has enough energy for ${card.name} (need ${card.cost}, have ${player.energy})`);
            this.endCPUTurn(player);
            return;
        }
        
        // Show strategic thought about this purchase
        const thoughtType = decision.type === 'defensive' ? 'defensive' : 'strategic';
        this.showCPUThoughtBubble(player, thoughtType, decision.reason);
        
        console.log(`🛍️ ${player.monster.name} buying ${card.name} for ${decision.type} reasons: ${decision.reason}`);
    this.showCPUNotification(player, `🛍️ ${player.monster.name} buying ${card.name} (${decision.type})`);
        
        setTimeout(() => {
            // Execute the purchase
            const result = this.game.buyCard(player.id, card.id);
            
            if (result.success) {
                console.log(`✅ ${player.monster.name} successfully bought ${card.name}`);
                // Update UI to reflect the purchase
                this.updateCardsDisplay();
                this.updatePlayerDisplay(player);
                
                // Wait a moment then continue to next purchase
                setTimeout(() => {
                    this.executeCPUPowerCardPurchases(player, purchaseDecisions, currentIndex + 1);
                }, this.getCPUThinkingTime('purchaseDelay'));
            } else {
                console.log(`❌ ${player.monster.name} failed to buy ${card.name}: ${result.error}`);
                this.endCPUTurn(player);
            }
        }, this.getCPUThinkingTime('purchaseDecision'));
    }

    // End CPU turn after power card phase
    endCPUTurn(player) {
        console.log(`🔄 ${player.monster.name} ending turn after power card phase`);
    this.showCPUNotification(player, `✅ ${player.monster.name} ending turn...`);
        
        // Clear CPU turn state
        if (this.cpuTurnState && this.cpuTurnState.player && this.cpuTurnState.player.id === player.id) {
            this.cpuTurnState = null;
        }
        
        setTimeout(() => {
            this.game.endTurn();
        }, this.getCPUThinkingTime('endTurn'));
    }

    // ===== AILMENT TOKEN SYSTEM =====
    
    // Update ailment bookmarks for a player
    updateAilmentBookmarks(player) {
        const playerCard = document.querySelector(`[data-player-id="${player.id}"]`);
        if (!playerCard) return;

        // Remove existing bookmarks
        const existingBookmarks = playerCard.querySelector('.ailment-bookmarks');
        if (existingBookmarks) {
            existingBookmarks.remove();
        }

        // Check if player has any ailment tokens
        if (!player.hasAilmentTokens()) {
            return;
        }

        // Create bookmarks container
        const bookmarksContainer = document.createElement('div');
        bookmarksContainer.className = 'ailment-bookmarks';

        // Add shrink ray bookmark
        if (player.ailmentTokens.shrink > 0) {
            const shrinkBookmark = this.createAilmentBookmark(
                'shrink',
                player.ailmentTokens.shrink,
                `Shrink Ray: -${player.ailmentTokens.shrink * 2} max health until healed`
            );
            bookmarksContainer.appendChild(shrinkBookmark);
        }

        // Add poison spit bookmark
        if (player.ailmentTokens.poison > 0) {
            const poisonBookmark = this.createAilmentBookmark(
                'poison',
                player.ailmentTokens.poison,
                `Poison Spit: -${player.ailmentTokens.poison} dice until healed`
            );
            bookmarksContainer.appendChild(poisonBookmark);
        }

        // Add bookmarks to player card
        playerCard.appendChild(bookmarksContainer);
    }

    // Create individual ailment bookmark
    createAilmentBookmark(type, count, tooltipText) {
        const bookmark = document.createElement('div');
        bookmark.className = `ailment-bookmark ${type}`;
        bookmark.textContent = count;

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'ailment-tooltip';
        tooltip.textContent = tooltipText;
        bookmark.appendChild(tooltip);

        return bookmark;
    }

    // Show evil animation when ailment is applied
    showEvilAnimation(targetPlayer, ailmentType) {
        const playerCard = document.querySelector(`[data-player-id="${targetPlayer.id}"]`);
        if (!playerCard) return;

        // Create evil overlay
        const evilOverlay = document.createElement('div');
        evilOverlay.className = 'evil-animation-overlay';
        playerCard.appendChild(evilOverlay);

        // Show notification
    this.showCPUNotification(
            targetPlayer, 
            `💀 ${targetPlayer.monster.name} is affected by ${ailmentType}!`
        );

        // Remove overlay after animation
        setTimeout(() => {
            if (evilOverlay.parentNode) {
                evilOverlay.parentNode.removeChild(evilOverlay);
            }
        }, 1500);

        // Update bookmarks after a brief delay
        setTimeout(() => {
            this.updateAilmentBookmarks(targetPlayer);
            // Add "new" class to the latest bookmark for animation
            const latestBookmark = playerCard.querySelector('.ailment-bookmarks .ailment-bookmark:last-child');
            if (latestBookmark) {
                latestBookmark.classList.add('new');
                setTimeout(() => {
                    latestBookmark.classList.remove('new');
                }, 600);
            }
        }, 300);
    }

    // Update all player ailment displays
    updateAllAilmentBookmarks() {
        if (this.game && this.game.players) {
            Object.values(this.game.players).forEach(player => {
                if (!player.isEliminated) {
                    this.updateAilmentBookmarks(player);
                }
            });
        }
    }

    // Roll-off UI methods with sportscast commentary
    showRollOffNotification(data) {
        const message = data.message;
        
        // Defensive programming: check if players have monster property
        const players = data.players.map(p => {
            if (p && p.monster && p.monster.name) {
                return p.monster.name;
            } else {
                console.warn('Player missing monster property in notification:', p);
                return `Player ${p.playerNumber || 'Unknown'}`;
            }
        }).join(', ');
        
        window.UI && window.UI._debug && window.UI._debug(`🎲 Roll-off Round ${data.round}: ${message}`);
        window.UI && window.UI._debug && window.UI._debug(`🎲 Players rolling: ${players}`);
        
        // Show/initialize the scoreboard
        this.initializeRollOffScoreboard(data.players, data.round);
        
        // Add sportscast commentary
        const commentary = data.round === 1 
            ? this.getRandomComment(this.sportscastCommentary.intro)
            : this.getRandomComment(this.sportscastCommentary.tie);
        
        this.updateCommentary(commentary);
        
        // Show notification to user
        UIUtilities.showMessage(message, 4000, this.elements);
        
        // Also log in the game log if available
        if (this.game && this.game.logAction) {
            this.game.logAction(`🎲 Roll-off Round ${data.round}: ${players}`, 'roll-off');
        }
    }

    // New method to handle when a player is about to roll
    showPlayerAboutToRoll(data) {
        const player = data.player;
        const isHuman = data.isHuman;
        
        const playerName = player && player.monster && player.monster.name 
            ? player.monster.name 
            : `Player ${player.playerNumber || 'Unknown'}`;
        
        if (isHuman) {
            // Human player - show commentary and enable roll button in action menu
            const commentary = this.getRandomComment(this.sportscastCommentary.humanRoll)
                .replace('{name}', playerName);
            this.updateCommentary(commentary);
            
            // Show 6 dice in the dice area using the unified system
            this.showInitialEmptyDice();
            
            // Enable only the roll dice button in action menu
            this.enableRollOffActions(player);
        } else {
            // AI player - show rolling commentary
            const commentary = this.getRandomComment(this.sportscastCommentary.aiRolling)
                .replace('{name}', playerName);
            this.updateCommentary(commentary);
            
            // Show 6 dice in the dice area - AI will handle rolling
            this.showInitialEmptyDice();
            
            // Disable all action menu buttons during AI roll
            this.disableAllActions();
        }
        
        window.UI && window.UI._debug && window.UI._debug(`🎯 ${playerName} is about to roll (${isHuman ? 'HUMAN' : 'AI'})`);
    }

    // Helper methods for sportscast commentary
    getRandomComment(commentArray) {
        return commentArray[Math.floor(Math.random() * commentArray.length)];
    }

    updateCommentary(text) {
        const commentaryElement = this.elements.rolloffCommentary;
        if (commentaryElement) {
            commentaryElement.textContent = text;
            commentaryElement.style.opacity = '0';
            setTimeout(() => {
                commentaryElement.style.opacity = '1';
            }, 100);
        }
    }

    enableRollOffActions(player) {
        if (!player) return;
        
        this.elements.actionMenu.classList.add('hidden-for-rolloff');
        this.elements.rolloffRollBtn.style.display = 'block';
        this.elements.rolloffRollBtn.disabled = false;
        this.elements.rolloffRollBtn.textContent = '🎲 Roll Dice';
        this.currentRolloffPlayer = player;
    }

    disableAllActions() {
        // Disable all action buttons during AI turn or between rolls
        const actionButtons = this.elements.actionMenu.querySelectorAll('button');
        actionButtons.forEach(button => {
            button.disabled = true;
        });
        
        // Also disable rolloff button if it exists
        if (this.elements.rolloffRollBtn) {
            this.elements.rolloffRollBtn.disabled = true;
        }
    }

    restoreNormalActionStates() {
        // Restore normal game button states after roll-off
        window.UI && window.UI._debug && window.UI._debug('🔧 Restoring normal action button states after roll-off');
        
        // Hide the action menu temporarily to prevent flash of enabled buttons
        const originalVisibility = this.elements.actionMenu.style.visibility;
        this.elements.actionMenu.style.visibility = 'hidden';
        
        // Show the action menu and mark game as active
        this.elements.actionMenu.classList.remove('hidden-for-rolloff');
        this.elements.actionMenu.classList.add('game-active');
        
        // Hide the rolloff button
        this.elements.rolloffRollBtn.style.display = 'none';
        this.elements.rolloffRollBtn.disabled = true;
        
        // Reset action buttons to normal game states
        const actionButtons = this.elements.actionMenu.querySelectorAll('button');
        actionButtons.forEach(button => {
            button.onclick = null; // Clear roll-off specific handlers
            
            // Reset to normal game states
            if (button.id === 'roll-dice') {
                button.disabled = false; // Will be managed by normal game logic
                button.textContent = 'Roll Dice';
            } else if (button.id === 'keep-dice') {
                button.disabled = true; // Normally disabled until dice are rolled
            } else if (button.id === 'end-turn') {
                button.disabled = false; // Usually available
            }
        });
        
        // Restore the initial dice display for regular gameplay
        this.showInitialEmptyDice();
        
        // Show the action menu after all updates are complete
        this.elements.actionMenu.style.visibility = originalVisibility || 'visible';
        
        console.log('✅ Normal action button states restored');
    }

    handleRolloffRoll() {
        if (this.currentRolloffPlayer) {
            this.elements.rolloffRollBtn.disabled = true;
            this.elements.rolloffRollBtn.textContent = 'Rolling...';
            this.handleRollOffDiceRoll(this.currentRolloffPlayer);
        }
    }

    // Skip the rolloff and randomly assign player order
    skipRolloff() {
        console.log('⏩ Skipping rolloff - randomly assigning player order');
        
        // Get player data from the rolloff table DOM
        const tableBody = document.getElementById('rolloff-table-body');
        const rows = tableBody.querySelectorAll('tr[id^="rolloff-row-"]');
        
        if (rows.length === 0) {
            console.error('❌ No rolloff players found in DOM');
            UIUtilities.showMessage('Error: No players found for rolloff skip', 3000, this.elements);
            return;
        }
        
        // Extract monsters and player types from DOM and original data
        const selectedMonsters = [];
        const playerTypes = [];
        
        rows.forEach((row, index) => {
            const monsterImg = row.querySelector('.monster-avatar img');
            const monsterName = monsterImg ? monsterImg.alt : `Player ${index + 1}`;
            
            // Find the monster from original data or create a basic one
            let monster = null;
            if (this.selectedMonsters && this.selectedMonsters.length > index) {
                monster = this.selectedMonsters[index];
            } else {
                // Fallback: create basic monster object from DOM data
                monster = {
                    name: monsterName,
                    image: monsterImg ? monsterImg.src : 'images/characters/king_of_tokyo_the_king.png'
                };
            }
            
            selectedMonsters.push(monster);
            
            // Get player type from playerTiles (same as normal rolloff flow)
            const playerType = (this.playerTiles && this.playerTiles[index] && this.playerTiles[index].type) || 'human';
            playerTypes.push(playerType);
        });
        
        console.log('🎲 Extracted rolloff data:', { selectedMonsters, playerTypes });
        
        // Hide the rolloff modal
        UIUtilities.hideModal(this.elements.rollOffModal);
        
        // Create a random winner from the extracted players
        const playerCount = selectedMonsters.length;
        const randomWinnerIndex = Math.floor(Math.random() * playerCount);
        
        const fakeRollOffWinner = {
            index: randomWinnerIndex,
            player: {
                monster: selectedMonsters[randomWinnerIndex],
                playerType: playerTypes[randomWinnerIndex]
            },
            attacks: Math.floor(Math.random() * 6), // Random result for display
            isSkipped: true
        };
        
        console.log('🎲 Random winner assigned:', fakeRollOffWinner);
        
        // Store the data for the continuation function
        this.selectedMonsters = selectedMonsters;
        this.playerTypes = playerTypes;
        
        // Continue with the same flow as if rolloff completed
        this.continueGameAfterRolloff(fakeRollOffWinner);
    }
    
    // Extract the continuation logic to be reusable
    async continueGameAfterRolloff(rollOffWinner) {
        // Reorder players based on the winner
        const reorderedData = this.game.reorderPlayersForFirstPlayer(this.selectedMonsters, this.playerTypes, rollOffWinner.index);
        
        // Initialize the game with the reordered data
        const playerCount = reorderedData.selectedMonsters.length;
        const result = await this.game.initializeGame(reorderedData.selectedMonsters, playerCount, reorderedData.playerTypes, 0);
        
        if (result.success) {
            // Show the game toolbar now that the game has started
            const gameToolbar = document.getElementById('game-toolbar');
            if (gameToolbar) {
                gameToolbar.classList.add('show');
            }
            
            // Add player count class to game board for CSS styling
            const gameBoard = document.querySelector('.game-board');
            if (gameBoard) {
                gameBoard.className = 'game-board'; // Reset classes
                if (this.currentPlayerCount === 5) {
                    gameBoard.classList.add('five-players');
                } else if (this.currentPlayerCount === 6) {
                    gameBoard.classList.add('six-players');
                }
            }
            
            // Update the UI
            this.updateDiceControls();
            this.updateGameDisplay();
            
            // Show the dice area and restore action menu now that the game is starting
            const diceArea = this.elements.diceArea;
            if (diceArea && diceArea.classList.contains('hidden-until-game-start')) {
                diceArea.classList.remove('hidden-until-game-start');
            }
            
            // Restore action menu from rolloff state
            this.restoreNormalActionStates();
            
            // Log who goes first (after game initialization so we know the starting player)
            const currentPlayer = this.game.getCurrentPlayer();
            if (currentPlayer) {
                UIUtilities.showMessage(rollOffWinner.isSkipped 
                    ? `Random order! ${currentPlayer.monster.name} goes first!` 
                    : `${currentPlayer.monster.name} goes first!`, 3000, this.elements);
            }
            
            // Start CPU turn if first player is CPU
            setTimeout(() => {
                const firstPlayer = this.game.getCurrentPlayer();
                console.log('🔄 Post-initialization check - First player:', firstPlayer);
                if (firstPlayer && firstPlayer.playerType === 'cpu') {
                    console.log('🤖 First player is CPU, starting turn immediately');
                    this.startAutomaticCPUTurn(firstPlayer);
                } else if (firstPlayer) {
                    console.log('👤 First player is human:', firstPlayer.monster.name);
                }
            }, 1000);
            
            // Log storage statistics
            const stats = await this.game.getStorageStats();
            if (stats) {
                console.log('📊 Storage Statistics:', stats);
            }
            
            console.log('Game started successfully!');
        } else {
            console.error('❌ Failed to initialize game after rolloff:', result.error);
            UIUtilities.showMessage('Failed to start game. Please try again.', 3000, this.elements);
        }
    }

    handleRollOffDiceRoll(player) {
        window.UI && window.UI._debug && window.UI._debug(`🎲 Human player ${player.index} clicked roll dice button`);
        
        // Disable the roll button
        const rollButton = document.getElementById('roll-dice');
        if (rollButton) {
            rollButton.disabled = true;
            rollButton.textContent = 'Rolling...';
        }
        
        // Execute the roll directly - let the unified system handle animation
        this.game.executeHumanRoll(player);
    }

    initializeRollOffScoreboard(players, round) {
        const modal = this.elements.rollOffModal;
        const tableBody = document.getElementById('rolloff-table-body');
        const title = modal.querySelector('.rolloff-title');
        
        // Update title for round
        title.textContent = round === 1 ? '🎲 Roll for First Player' : `🎲 Roll-off Round ${round}`;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add a row for each player
        players.forEach(player => {
            const row = document.createElement('tr');
            row.id = `rolloff-row-${player.index}`;
            
            // Defensive programming: handle missing monster property
            const monsterName = player && player.monster && player.monster.name 
                ? player.monster.name 
                : `Player ${player.playerNumber || player.index + 1}`;
            
            const monsterImage = player && player.monster && player.monster.image 
                ? player.monster.image 
                : 'images/characters/king_of_tokyo_the_king.png'; // fallback image
            
            row.innerHTML = `
                <td>
                    <div class="rolloff-player-info">
                        <img src="${monsterImage}" alt="${monsterName}" class="rolloff-monster-pic">
                        <span class="rolloff-player-name">${monsterName}</span>
                    </div>
                </td>
                <td>
                    <div class="rolloff-dice-display" id="rolloff-dice-${player.index}">
                        <!-- Empty until roll is complete -->
                    </div>
                </td>
                <td>
                    <div class="rolloff-attack-count" id="rolloff-attacks-${player.index}">-</div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Show the modal
        modal.classList.remove('hidden');
        
        // Show the rolloff button (but keep it disabled until a human player's turn)
        this.elements.rolloffRollBtn.style.display = 'block';
        this.elements.rolloffRollBtn.disabled = true;
        this.elements.rolloffRollBtn.textContent = '🎲 Roll Dice';
    }

    showPlayerRollOffResult(data) {
        const player = data.player;
        const attackDice = data.attackDice;
        const rolls = data.rolls;
        const diceData = data.diceData; // New unified dice data
        
        // Defensive programming
        const playerName = player && player.monster && player.monster.name 
            ? player.monster.name 
            : `Player ${player.playerNumber || 'Unknown'}`;
        
        window.UI && window.UI._debug && window.UI._debug(`🎲 ${playerName} rolled ${attackDice} attacks: [${rolls.join(', ')}]`);
        
        // Update the scoreboard with this player's results
        this.updateRollOffScoreboard(player, rolls, attackDice);
        
        // Update attack count with highlighting
        const attackContainer = document.getElementById(`rolloff-attacks-${player.index}`);
        if (attackContainer) {
            attackContainer.textContent = attackDice;
            attackContainer.classList.add('highlight');
            setTimeout(() => attackContainer.classList.remove('highlight'), 2000);
        }
        
        // Show dice results in main dice area using unified display system
        if (diceData) {
            // Pre-filter dice data to only show 6 dice for roll-off (no disabled dice)
            const rollOffDiceData = diceData.filter(die => !die.isDisabled).slice(0, 6);
            this.updateDiceDisplay(rollOffDiceData, true);
        } else {
            console.warn('No diceData provided for roll-off results - this should not happen with unified system');
        }
        
        // Add sportscast commentary based on result quality
        let commentary;
        if (attackDice >= 4) {
            commentary = this.getRandomComment(this.sportscastCommentary.results.high);
        } else if (attackDice >= 2) {
            commentary = this.getRandomComment(this.sportscastCommentary.results.medium);
        } else {
            commentary = this.getRandomComment(this.sportscastCommentary.results.low);
        }
        
        commentary = commentary.replace('{name}', playerName).replace('{count}', attackDice);
        this.updateCommentary(commentary);
        
        // Show individual roll result
        const message = `${playerName} rolled ${attackDice} attack${attackDice !== 1 ? 's' : ''}`;
        UIUtilities.showMessage(message, 1500, this.elements); // Balanced timing - long enough to read
        
        // Log in game log
        if (this.game && this.game.logAction) {
            // Convert numeric roll values to symbols for display
            const rollSymbols = rolls.map(roll => this.getDieFaceSymbol(roll));
            this.game.logAction(`   ${playerName}: ${attackDice} attacks [${rollSymbols.join(', ')}]`, 'roll-off');
        }
    }

    // Generic function to create mini dice displays in any container
    createMiniDice(rolls, diceContainer, animationClass = null) {
        if (!diceContainer) {
            console.warn('createMiniDice: No dice container provided');
            return;
        }
        
        // Clear existing content
        diceContainer.innerHTML = '';
        
        // Create mini dice displays like in game log
        rolls.forEach(roll => {
            const die = document.createElement('div');
            die.className = roll === 6 ? 'mini-die attack' : 'mini-die';
            if (animationClass) {
                die.classList.add(animationClass);
            }
            die.textContent = this.getDieFaceSymbol(roll);
            diceContainer.appendChild(die);
        });
    }

    updateRollOffScoreboard(player, rolls, attackCount) {
        const diceContainer = document.getElementById(`rolloff-dice-${player.index}`);
        
        if (diceContainer) {
            // Use the generic mini dice function with rolling animation
            this.createMiniDice(rolls, diceContainer, 'rolling');
        }
    }

    // Helper method to get dice face symbols (same as used in game log)
    getDieFaceSymbol(value) {
        // Handle null, undefined, or invalid values
        if (value === null || value === undefined) {
            return '?';
        }
        
        const symbols = {
            1: '1',  // 1 point
            2: '2',  // 2 points
            3: '3',  // 3 points
            4: '❤️', // Heal
            5: '⚡', // Energy
            6: '⚔️', // Attack
            'attack': '⚔️',
            'smash': '💥', 
            'energy': '⚡',
            'heal': '❤️',
            '1': '1',
            '2': '2',
            '3': '3'
        };
        
        return symbols[value] || (value ? value.toString() : '?');
    }

    showRollOffTie(data) {
        // Defensive programming: check if players have monster property
        const tiedPlayers = data.tiedPlayers.map(p => {
            if (p && p.monster && p.monster.name) {
                return p.monster.name;
            } else {
                console.warn('Player missing monster property:', p);
                return `Player ${p.playerNumber || 'Unknown'}`;
            }
        }).join(' and ');
        const attackCount = data.attackCount;
        const nextRound = data.round;
        
        window.UI && window.UI._debug && window.UI._debug(`🎲 Tie! ${tiedPlayers} both rolled ${attackCount} attacks`);
        
        // Add dramatic tie commentary
        const tieCommentary = this.getRandomComment(this.sportscastCommentary.tie);
        this.updateCommentary(tieCommentary);
        
        // Show tie notification
        const message = `Tie! ${tiedPlayers} both rolled ${attackCount} attack${attackCount !== 1 ? 's' : ''}. Rolling again...`;
        UIUtilities.showMessage(message, 3000, this.elements);
        
        // Log in game log
        if (this.game && this.game.logAction) {
            this.game.logAction(`🤝 Tie at ${attackCount} attacks! Rolling again...`, 'roll-off');
        }
    }

    showRollOffWinner(data) {
        const winner = data.winner;
        const attackCount = data.finalAttackCount;
        
        // Defensive programming: check if winner has monster property
        const winnerName = winner && winner.monster && winner.monster.name 
            ? winner.monster.name 
            : `Player ${winner.playerNumber || 'Unknown'}`;
        
        console.log(`🏆 ${winnerName} wins with ${attackCount} attacks and goes first!`);
        
        // Hide the modal immediately when winner is announced
        const modal = this.elements.rollOffModal;
        if (modal) {
            modal.classList.add('hidden');
            
            // Show the dice area now that the game is starting
            const diceArea = this.elements.diceArea;
            if (diceArea && diceArea.classList.contains('hidden-until-game-start')) {
                diceArea.classList.remove('hidden-until-game-start');
            }
        }
        
        // Add victory commentary
        const victoryCommentary = this.getRandomComment(this.sportscastCommentary.winner)
            .replace('{name}', winnerName)
            .replace('{count}', attackCount);
        this.updateCommentary(victoryCommentary);
    }

    // Open monster profile modal for a specific player
    openMonsterProfileModal(player) {
        console.log('🐾 Opening individual monster profile modal for:', player.monster.name);
        
        // Create a unique modal for this specific monster by cloning the template
        const individualModal = this.createIndividualMonsterProfileModal(player);
        
        // Append to body (as a proper modal)
        document.body.appendChild(individualModal);
        
        // Show the modal
        individualModal.classList.remove('hidden');
        
        // Set up event listeners for this modal
        this.setupIndividualModalEventListeners(individualModal, player);
    }
    
    // Create an individual monster profile modal by cloning the template
    createIndividualMonsterProfileModal(player) {
        const template = document.getElementById('individual-monster-profile-template');
        const modal = template.cloneNode(true);
        
        // Give it a unique ID
        modal.id = `monster-profile-${player.monster.id}-${Date.now()}`;
        modal.classList.add('individual-monster-modal');
        
        // Update the modal title
        const title = modal.querySelector('.monster-profile-title');
        if (title) {
            title.textContent = `👹 ${player.monster.name} Profile`;
        }
        
        // Generate the profile card content using existing logic
        const container = modal.querySelector('.individual-monster-profile-container');
        if (container) {
            const currentProfile = this.setupManager.monsterProfiles[player.monster.id] || player.monster.personality;
            
            // Use the existing profile card generation logic
            container.innerHTML = this.generateSingleMonsterProfileCard(player.monster, currentProfile);
            
            // Set up sliders for this specific profile
            this.setupProfileSliders(player.monster.id, currentProfile, player, modal);
        }
        
        return modal;
    }
    
    // Set up event listeners for an individual monster profile modal
    setupIndividualModalEventListeners(modal, player) {
        // Close button
        const closeBtn = modal.querySelector('.monster-profile-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeIndividualMonsterProfileModal(modal);
            });
        }
        
        // Save button (for live editing)
        const saveBtn = modal.querySelector('.monster-profile-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log(`💾 Saving profile changes for ${player.monster.name}`);
                // Profile changes are already applied via slider events
                this.closeIndividualMonsterProfileModal(modal);
            });
        }
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeIndividualMonsterProfileModal(modal);
            }
        });
        
        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeIndividualMonsterProfileModal(modal);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // Close and clean up an individual monster profile modal
    closeIndividualMonsterProfileModal(modal) {
        console.log('🐾 Closing individual monster profile modal');
        
        // Hide with animation
        modal.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            try {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            } catch (err) {
                console.warn('Tried to remove modal but it was already removed or inaccessible', err);
            }
        }, 300); // Match modal transition duration
    }
    
    // Generate a single monster profile card
    generateSingleMonsterProfileCard(monster, profile) {
        return `
            <div class="monster-profile-card" data-monster-id="${monster.id}" style="border-color: ${monster.color}">
                <div class="monster-profile-header">
                    <div class="monster-profile-avatar">
                        <img src="${monster.image}" alt="${monster.name}" />
                    </div>
                    <div class="monster-profile-info">
                        <h3>${monster.name}</h3>
                        <p>${monster.description}</p>
                    </div>
                </div>
                <div class="personality-traits">
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🔥 Aggression</span>
                            <span class="trait-value" data-trait-value="aggression">${profile.aggression}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.aggression}" step="0.1"
                                   class="trait-slider" data-monster="${monster.id}" data-trait="aggression">
                            <div class="trait-bar">
                                <span>Passive</span>
                                <span>Aggressive</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🧠 Strategy</span>
                            <span class="trait-value" data-trait-value="strategy">${profile.strategy}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.strategy}" step="0.1"
                                   class="trait-slider" data-monster="${monster.id}" data-trait="strategy">
                            <div class="trait-bar">
                                <span>Simple</span>
                                <span>Strategic</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">🎲 Risk Taking</span>
                            <span class="trait-value" data-trait-value="risk">${profile.risk}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.risk}" step="0.1"
                                   class="trait-slider" data-monster="${monster.id}" data-trait="risk">
                            <div class="trait-bar">
                                <span>Cautious</span>
                                <span>Risky</span>
                            </div>
                        </div>
                    </div>
                    <div class="trait-container">
                        <div class="trait-header">
                            <span class="trait-label">💰 Economic Focus</span>
                            <span class="trait-value" data-trait-value="economic">${profile.economic}</span>
                        </div>
                        <div class="trait-slider-container">
                            <input type="range" min="1" max="5" value="${profile.economic}" step="0.1"
                                   class="trait-slider" data-monster="${monster.id}" data-trait="economic">
                            <div class="trait-bar">
                                <span>Ignores</span>
                                <span>Focused</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Setup sliders for a specific monster profile with live updates
    setupProfileSliders(monsterId, currentProfile, player, modalContainer = null) {
        // Use provided modal container or fallback to the main modal
        const container = modalContainer || this.elements.monsterProfilesModal;
        const profileCard = container.querySelector(`[data-monster-id="${monsterId}"]`);
        if (!profileCard) return;
        
        const sliders = profileCard.querySelectorAll('.trait-slider');
        sliders.forEach(slider => {
            const trait = slider.dataset.trait;
            const valueDisplay = profileCard.querySelector(`[data-trait-value="${trait}"]`);
            
            slider.addEventListener('input', () => {
                const value = parseFloat(slider.value);
                if (valueDisplay) {
                    valueDisplay.textContent = value.toFixed(1);
                }
                
                // Update the monster's personality in real-time
                if (!player.monster.personality) {
                    player.monster.personality = {};
                }
                player.monster.personality[trait] = value;
                
                // Also update the setupManager's profiles for persistence
                if (!this.setupManager.monsterProfiles[monsterId]) {
                    this.setupManager.monsterProfiles[monsterId] = {};
                }
                this.setupManager.monsterProfiles[monsterId][trait] = value;
                this.setupManager.saveMonsterProfiles();
                
                console.log(`🔧 Updated ${player.monster.name}'s ${trait} to ${value}`);
            });
        });
    }

    _installThoughtBubbleRepositionHandlers() {
        if (this._thoughtBubbleHandlersInstalled) return;
        const handler = () => {
            if (!this._activeThoughtBubble || !this._activeThoughtPlayerId) return;
            if (this._pendingRepositionRaf) cancelAnimationFrame(this._pendingRepositionRaf);
            this._pendingRepositionRaf = requestAnimationFrame(() => {
                const player = (this.game && this.game.players) ? this.game.players.find(p => p.id === this._activeThoughtPlayerId) : null;
                if (!player || !this._activeThoughtBubble) return;
                this.positionThoughtBubbleAtPlayer(this._activeThoughtBubble, player);
            });
        };
        window.addEventListener('resize', handler);
        window.addEventListener('scroll', handler, true);
        this._thoughtBubbleHandlersInstalled = true;
    }

}
// Note: Game initialization is now handled by the splash screen
