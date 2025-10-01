// Game Storage System - Persistent logging and game state management
// Uses IndexedDB for large data with localStorage fallback

class GameStorageManager {
    constructor() {
        this.dbName = 'KingOfTokyoDB';
        this.dbVersion = 1;
        this.db = null;
        this.maxMemoryEntries = 100; // Keep only last 100 entries in memory
        this.maxStoredGames = 10; // Keep only last 10 games in storage
        this.compressionEnabled = true;
        this.initialized = false;
    }

    // Initialize the storage system
    async initialize() {
        if (this.initialized) return true;

        try {
            // Try to initialize IndexedDB
            await this.initIndexedDB();
            window.UI && window.UI._debug && window.UI._debug('✅ IndexedDB initialized successfully');
            this.initialized = true;
            return true;
        } catch (error) {
            console.warn('⚠️ IndexedDB failed, falling back to localStorage:', error);
            // IndexedDB failed, use localStorage
            this.initialized = true;
            return true;
        }
    }

    // Initialize IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create game sessions store
                if (!db.objectStoreNames.contains('gameSessions')) {
                    const gameStore = db.createObjectStore('gameSessions', { keyPath: 'id' });
                    gameStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create game logs store  
                if (!db.objectStoreNames.contains('gameLogs')) {
                    const logStore = db.createObjectStore('gameLogs', { keyPath: 'id' });
                    logStore.createIndex('gameId', 'gameId', { unique: false });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create compressed chunks store for large logs
                if (!db.objectStoreNames.contains('logChunks')) {
                    const chunkStore = db.createObjectStore('logChunks', { keyPath: 'id' });
                    chunkStore.createIndex('gameId', 'gameId', { unique: false });
                }
            };
        });
    }

    // Generate unique game session ID
    generateGameId() {
        return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Compress data using simple string compression
    compress(data) {
        if (!this.compressionEnabled) return data;
        
        try {
            // Simple compression by removing redundant whitespace and common patterns
            let compressed = JSON.stringify(data);
            
            // Replace common patterns
            compressed = compressed.replace(/"timestamp"/g, '"t"');
            compressed = compressed.replace(/"message"/g, '"m"');
            compressed = compressed.replace(/"category"/g, '"c"');
            compressed = compressed.replace(/"playerName"/g, '"p"');
            compressed = compressed.replace(/"monster"/g, '"mo"');
            compressed = compressed.replace(/"action"/g, '"a"');
            
            return compressed;
        } catch (error) {
            console.warn('Compression failed:', error);
            return JSON.stringify(data);
        }
    }

    // Decompress data
    decompress(compressedData) {
        if (!this.compressionEnabled) return compressedData;
        
        try {
            // Reverse the compression
            let decompressed = compressedData;
            decompressed = decompressed.replace(/"t"/g, '"timestamp"');
            decompressed = decompressed.replace(/"m"/g, '"message"');
            decompressed = decompressed.replace(/"c"/g, '"category"');
            decompressed = decompressed.replace(/"p"/g, '"playerName"');
            decompressed = decompressed.replace(/"mo"/g, '"monster"');
            decompressed = decompressed.replace(/"a"/g, '"action"');
            
            return JSON.parse(decompressed);
        } catch (error) {
            console.warn('Decompression failed:', error);
            return JSON.parse(compressedData);
        }
    }

    // Save game session
    async saveGameSession(gameData) {
        const sessionData = {
            id: gameData.gameId || this.generateGameId(),
            timestamp: Date.now(),
            playerCount: gameData.playerCount,
            players: gameData.players,
            round: gameData.round,
            currentPlayerIndex: gameData.currentPlayerIndex,
            gamePhase: gameData.gamePhase,
            victoryCondition: gameData.victoryCondition,
            gameSettings: gameData.gameSettings,
            metadata: {
                version: '1.0',
                created: new Date().toISOString(),
                compressed: this.compressionEnabled
            }
        };

        try {
            if (this.db) {
                // Use IndexedDB
                const transaction = this.db.transaction(['gameSessions'], 'readwrite');
                const store = transaction.objectStore('gameSessions');
                await new Promise((resolve, reject) => {
                    const request = store.put(sessionData);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Use localStorage fallback
                localStorage.setItem(`gameSession_${sessionData.id}`, JSON.stringify(sessionData));
            }

            // Clean up old sessions
            await this.cleanupOldSessions();
            
            window.UI && window.UI._debug && window.UI._debug(`💾 Game session saved: ${sessionData.id}`);
            return sessionData.id;
        } catch (error) {
            console.error('Failed to save game session:', error);
            return null;
        }
    }

    // Save log chunk (for large logs)
    async saveLogChunk(gameId, logData, chunkIndex = 0) {
        const chunkData = {
            id: `${gameId}_chunk_${chunkIndex}`,
            gameId: gameId,
            chunkIndex: chunkIndex,
            timestamp: Date.now(),
            data: this.compress(logData),
            compressed: this.compressionEnabled,
            size: JSON.stringify(logData).length
        };

        try {
            if (this.db) {
                const transaction = this.db.transaction(['logChunks'], 'readwrite');
                const store = transaction.objectStore('logChunks');
                await new Promise((resolve, reject) => {
                    const request = store.put(chunkData);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Use localStorage with size limits
                const dataStr = JSON.stringify(chunkData);
                if (dataStr.length < 500000) { // 500KB limit for localStorage
                    localStorage.setItem(`logChunk_${chunkData.id}`, dataStr);
                } else {
                    console.warn('Log chunk too large for localStorage, skipping:', dataStr.length);
                }
            }

            window.UI && window.UI._debug && window.UI._debug(`📝 Log chunk saved: ${chunkData.id} (${chunkData.size} bytes)`);
            return chunkData.id;
        } catch (error) {
            console.error('Failed to save log chunk:', error);
            return null;
        }
    }

    // Load log chunks for a game
    async loadLogChunks(gameId) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['logChunks'], 'readonly');
                const store = transaction.objectStore('logChunks');
                const index = store.index('gameId');
                
                return new Promise((resolve, reject) => {
                    const chunks = [];
                    const request = index.openCursor(gameId);
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const chunkData = cursor.value;
                            chunks.push({
                                index: chunkData.chunkIndex,
                                data: chunkData.compressed ? 
                                    this.decompress(chunkData.data) : 
                                    JSON.parse(chunkData.data)
                            });
                            cursor.continue();
                        } else {
                            // Sort chunks by index and combine
                            chunks.sort((a, b) => a.index - b.index);
                            resolve(chunks.map(c => c.data));
                        }
                    };
                    
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Use localStorage fallback
                const chunks = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(`logChunk_${gameId}_`)) {
                        const chunkData = JSON.parse(localStorage.getItem(key));
                        chunks.push({
                            index: chunkData.chunkIndex,
                            data: chunkData.compressed ? 
                                this.decompress(chunkData.data) : 
                                JSON.parse(chunkData.data)
                        });
                    }
                }
                chunks.sort((a, b) => a.index - b.index);
                return chunks.map(c => c.data);
            }
        } catch (error) {
            console.error('Failed to load log chunks:', error);
            return [];
        }
    }

    // Clean up old sessions to prevent storage bloat
    async cleanupOldSessions() {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['gameSessions'], 'readwrite');
                const store = transaction.objectStore('gameSessions');
                const index = store.index('timestamp');
                
                // Get all sessions sorted by timestamp
                const sessions = [];
                await new Promise((resolve, reject) => {
                    const request = index.openCursor(null, 'prev'); // Newest first
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            sessions.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
                
                // Delete old sessions beyond the limit
                if (sessions.length > this.maxStoredGames) {
                    const sessionsToDelete = sessions.slice(this.maxStoredGames);
                    for (const session of sessionsToDelete) {
                        await new Promise((resolve, reject) => {
                            const deleteRequest = store.delete(session.id);
                            deleteRequest.onsuccess = () => resolve();
                            deleteRequest.onerror = () => reject(deleteRequest.error);
                        });
                        
                        // Also delete associated log chunks
                        await this.deleteLogChunks(session.id);
                    }
                    window.UI && window.UI._debug && window.UI._debug(`🧹 Cleaned up ${sessionsToDelete.length} old game sessions`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old sessions:', error);
        }
    }

    // Delete log chunks for a game
    async deleteLogChunks(gameId) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['logChunks'], 'readwrite');
                const store = transaction.objectStore('logChunks');
                const index = store.index('gameId');
                
                await new Promise((resolve, reject) => {
                    const request = index.openCursor(gameId);
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Delete from localStorage
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(`logChunk_${gameId}_`)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            }
        } catch (error) {
            console.error('Failed to delete log chunks:', error);
        }
    }

    // Get storage statistics
    async getStorageStats() {
        try {
            const stats = {
                totalGames: 0,
                totalLogEntries: 0,
                storageUsed: '0 bytes',
                storageType: this.db ? 'IndexedDB' : 'localStorage',
                initialized: this.initialized
            };

            if (this.db) {
                // Count IndexedDB entries
                const sessionTransaction = this.db.transaction(['gameSessions'], 'readonly');
                const sessionStore = sessionTransaction.objectStore('gameSessions');
                stats.totalGames = await new Promise((resolve) => {
                    const request = sessionStore.count();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(0);
                });

                const chunkTransaction = this.db.transaction(['logChunks'], 'readonly');
                const chunkStore = chunkTransaction.objectStore('logChunks');
                stats.totalLogEntries = await new Promise((resolve) => {
                    const request = chunkStore.count();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(0);
                });

                // Estimate storage usage
                stats.storageUsed = `~${stats.totalGames + stats.totalLogEntries} records`;
            } else {
                // Count localStorage entries
                let totalSize = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        if (key.startsWith('gameSession_')) stats.totalGames++;
                        if (key.startsWith('logChunk_')) stats.totalLogEntries++;
                        
                        try {
                            const value = localStorage.getItem(key);
                            totalSize += (key.length + (value ? value.length : 0)) * 2; // Rough UTF-16 estimate
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }
                
                // Format storage size
                if (totalSize < 1024) {
                    stats.storageUsed = `${totalSize} bytes`;
                } else if (totalSize < 1024 * 1024) {
                    stats.storageUsed = `${(totalSize / 1024).toFixed(1)} KB`;
                } else {
                    stats.storageUsed = `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
                }
            }

            return stats;
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return { 
                error: error.message,
                totalGames: 0,
                totalLogEntries: 0,
                storageUsed: 'Error',
                storageType: 'Unknown'
            };
        }
    }

    // Save individual log entry
    async saveLogEntry(gameId, logEntry) {
        try {
            const key = `logEntry_${gameId}_${logEntry.id}`;
            
            if (this.db) {
                const transaction = this.db.transaction(['gameLogs'], 'readwrite');
                const store = transaction.objectStore('gameLogs');
                await store.put({ id: key, gameId, entry: logEntry, timestamp: new Date() });
            } else {
                localStorage.setItem(key, JSON.stringify(logEntry));
            }
        } catch (error) {
            console.error('Failed to save log entry:', error);
        }
    }

    // Save game state
    async saveGameState(gameId, gameState) {
        try {
            await this.saveGameSession({
                gameId,
                gameState,
                timestamp: new Date(),
                type: 'gameState'
            });
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    // Load game state
    async loadGameState(gameId) {
        try {
            const key = `gameSession_${gameId}`;
            
            if (this.db) {
                const transaction = this.db.transaction(['gameSessions'], 'readonly');
                const store = transaction.objectStore('gameSessions');
                const result = await store.get(key);
                return result?.gameState || null;
            } else {
                const data = localStorage.getItem(key);
                if (data) {
                    const session = JSON.parse(data);
                    return session.gameState || null;
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to load game state:', error);
            return null;
        }
    }

    // Load game logs
    async loadGameLogs(gameId) {
        try {
            const logs = [];
            
            if (this.db) {
                const transaction = this.db.transaction(['gameLogs'], 'readonly');
                const store = transaction.objectStore('gameLogs');
                const index = store.index('gameId');
                const request = index.getAll(gameId);
                
                const results = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                return results.map(r => r.entry).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            } else {
                // Load from localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(`logEntry_${gameId}_`)) {
                        const data = localStorage.getItem(key);
                        if (data) {
                            logs.push(JSON.parse(data));
                        }
                    }
                }
                return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            }
        } catch (error) {
            console.error('Failed to load game logs:', error);
            return [];
        }
    }

    // Delete a game session
    async deleteGameSession(gameId) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['gameSessions', 'gameLogs', 'logChunks'], 'readwrite');
                
                // Delete game session
                const sessionStore = transaction.objectStore('gameSessions');
                await sessionStore.delete(`gameSession_${gameId}`);
                
                // Delete logs
                const logStore = transaction.objectStore('gameLogs');
                const logIndex = logStore.index('gameId');
                const logRequest = logIndex.getAll(gameId);
                logRequest.onsuccess = () => {
                    logRequest.result.forEach(log => logStore.delete(log.id));
                };
                
                // Delete log chunks
                await this.deleteLogChunks(gameId);
            } else {
                // Delete from localStorage
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.startsWith(`gameSession_${gameId}`) ||
                        key.startsWith(`logEntry_${gameId}_`) ||
                        key.startsWith(`logChunk_${gameId}_`)
                    )) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            }
        } catch (error) {
            console.error('Failed to delete game session:', error);
        }
    }

    // Clear all data
    async clearAllData() {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['gameSessions', 'gameLogs', 'logChunks'], 'readwrite');
                
                await Promise.all([
                    transaction.objectStore('gameSessions').clear(),
                    transaction.objectStore('gameLogs').clear(),
                    transaction.objectStore('logChunks').clear()
                ]);
            } else {
                // Clear localStorage entries related to the game
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.startsWith('gameSession_') ||
                        key.startsWith('logEntry_') ||
                        key.startsWith('logChunk_')
                    )) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            }
        } catch (error) {
            console.error('Failed to clear all data:', error);
        }
    }

    // Export game data for backup
    async exportGameData(gameId) {
        try {
            const logChunks = await this.loadLogChunks(gameId);
            return {
                gameId: gameId,
                exportDate: new Date().toISOString(),
                logData: logChunks,
                version: '1.0'
            };
        } catch (error) {
            console.error('Failed to export game data:', error);
            return null;
        }
    }
}

// Create global instance
window.gameStorage = new GameStorageManager();
