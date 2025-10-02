/** archiveAnalyticsService.js
 * Advanced analytics service for game logs and AIDT data
 * Provides comprehensive statistics, performance metrics, and trend analysis
 */

import { archiveManager } from './archiveManagementService.js';

export class ArchiveAnalyticsService {
  constructor() {
    this.analytics = null;
    this.lastCalculated = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Calculate comprehensive analytics for all archives
   * @returns {Object} Complete analytics data
   */
  async calculateCompleteAnalytics() {
    // Check cache
    if (this.analytics && this.lastCalculated && 
        (Date.now() - this.lastCalculated) < this.cacheTimeout) {
      return this.analytics;
    }

    console.log('[ArchiveAnalytics] Calculating comprehensive analytics...');
    
    const archives = archiveManager.getAllArchives();
    const gameArchives = archives.filter(a => a.type === 'game' || a.category === 'Game Log');
    const aidtArchives = archives.filter(a => a.type === 'aidt' || a.category === 'AI Decisions');
    
    // Load detailed data for analysis
    const gameData = await this.loadGameAnalyticsData(gameArchives);
    const aidtData = await this.loadAIDTAnalyticsData(aidtArchives);
    
    this.analytics = {
      overview: this.calculateOverviewStats(archives, gameData, aidtData),
      gamePerformance: this.calculateGamePerformanceStats(gameData),
      aiAnalysis: this.calculateAIAnalysisStats(aidtData),
      trends: this.calculateTrendAnalysis(archives, gameData),
      insights: this.generateInsights(gameData, aidtData),
      storage: archiveManager.getStorageStats(),
      timestamp: new Date().toISOString()
    };
    
    this.lastCalculated = Date.now();
    console.log('[ArchiveAnalytics] Analytics calculation complete');
    
    return this.analytics;
  }

  /**
   * Load detailed game data for analytics
   * @param {Array} gameArchives - Game archive metadata
   * @returns {Array} Loaded game data
   */
  async loadGameAnalyticsData(gameArchives) {
    const gameData = [];
    
    for (const archive of gameArchives.slice(0, 50)) { // Limit to recent 50 games
      try {
        const content = await archiveManager.loadArchive(archive);
        if (content && content.data) {
          gameData.push({
            ...archive,
            content: content,
            gameLog: content.data,
            metadata: content.meta,
            stateSnapshot: content.stateSnapshot
          });
        }
      } catch (error) {
        console.warn('Failed to load game archive:', archive.id, error);
      }
    }
    
    return gameData;
  }

  /**
   * Load detailed AIDT data for analytics
   * @param {Array} aidtArchives - AIDT archive metadata
   * @returns {Array} Loaded AIDT data
   */
  async loadAIDTAnalyticsData(aidtArchives) {
    const aidtData = [];
    
    for (const archive of aidtArchives.slice(0, 30)) { // Limit to recent 30 AIDT logs
      try {
        const content = await archiveManager.loadArchive(archive);
        if (content && content.data) {
          aidtData.push({
            ...archive,
            content: content,
            decisionTree: content.data,
            metadata: content.meta
          });
        }
      } catch (error) {
        console.warn('Failed to load AIDT archive:', archive.id, error);
      }
    }
    
    return aidtData;
  }

  /**
   * Calculate overview statistics
   * @param {Array} archives - All archives
   * @param {Array} gameData - Game data
   * @param {Array} aidtData - AIDT data
   * @returns {Object} Overview stats
   */
  calculateOverviewStats(archives, gameData, aidtData) {
    const totalGames = gameData.length;
    const totalAIDecisions = aidtData.reduce((sum, data) => {
      return sum + (data.decisionTree?.rounds?.length || 0);
    }, 0);
    
    // Calculate average game duration
    const gameDurations = gameData.map(game => this.calculateGameDuration(game.gameLog));
    const avgDuration = gameDurations.length > 0 ? 
      gameDurations.reduce((sum, dur) => sum + dur, 0) / gameDurations.length : 0;
    
    // Calculate player participation
    const allPlayers = new Set();
    gameData.forEach(game => {
      const players = this.extractPlayersFromGame(game.gameLog);
      players.forEach(player => allPlayers.add(player));
    });
    
    return {
      totalArchives: archives.length,
      totalGames,
      totalAIDecisions,
      uniquePlayers: allPlayers.size,
      averageGameDuration: Math.round(avgDuration),
      dateRange: this.calculateDateRange(archives),
      storageEfficiency: this.calculateStorageEfficiency(archives)
    };
  }

  /**
   * Calculate game performance statistics
   * @param {Array} gameData - Game data
   * @returns {Object} Game performance stats
   */
  calculateGamePerformanceStats(gameData) {
    const stats = {
      winRates: {},
      averageScores: {},
      gameLength: {
        distribution: {},
        average: 0,
        median: 0
      },
      victorConditions: {},
      playerPerformance: {},
      difficultyAnalysis: {}
    };

    // Analyze each game
    gameData.forEach(game => {
      const gameAnalysis = this.analyzeIndividualGame(game);
      
      // Win rates
      if (gameAnalysis.winner) {
        stats.winRates[gameAnalysis.winner] = (stats.winRates[gameAnalysis.winner] || 0) + 1;
      }
      
      // Victory conditions
      if (gameAnalysis.victoryCondition) {
        stats.victorConditions[gameAnalysis.victoryCondition] = 
          (stats.victorConditions[gameAnalysis.victoryCondition] || 0) + 1;
      }
      
      // Game length
      const duration = gameAnalysis.duration;
      const lengthCategory = this.categorizeGameLength(duration);
      stats.gameLength.distribution[lengthCategory] = 
        (stats.gameLength.distribution[lengthCategory] || 0) + 1;
      
      // Player performance
      gameAnalysis.players.forEach(player => {
        if (!stats.playerPerformance[player.name]) {
          stats.playerPerformance[player.name] = {
            gamesPlayed: 0,
            wins: 0,
            averageScore: 0,
            averageHealth: 0,
            totalScore: 0
          };
        }
        
        const playerStats = stats.playerPerformance[player.name];
        playerStats.gamesPlayed++;
        if (player.isWinner) playerStats.wins++;
        playerStats.totalScore += player.finalScore || 0;
        playerStats.averageScore = playerStats.totalScore / playerStats.gamesPlayed;
      });
    });

    // Calculate win percentages
    const totalGames = gameData.length;
    Object.keys(stats.winRates).forEach(player => {
      stats.winRates[player] = {
        wins: stats.winRates[player],
        percentage: (stats.winRates[player] / totalGames * 100).toFixed(1)
      };
    });

    // Calculate win percentages for player performance
    Object.keys(stats.playerPerformance).forEach(player => {
      const playerStats = stats.playerPerformance[player];
      playerStats.winPercentage = (playerStats.wins / playerStats.gamesPlayed * 100).toFixed(1);
    });

    return stats;
  }

  /**
   * Calculate AI analysis statistics
   * @param {Array} aidtData - AIDT data
   * @returns {Object} AI analysis stats
   */
  calculateAIAnalysisStats(aidtData) {
    const stats = {
      decisionPatterns: {},
      confidenceAnalysis: {
        average: 0,
        distribution: {},
        trends: []
      },
      strategyAnalysis: {
        aggressive: 0,
        conservative: 0,
        balanced: 0
      },
      rollAnalysis: {
        keepPatterns: {},
        rerollPatterns: {},
        situationalDecisions: {}
      },
      performanceMetrics: {
        avgDecisionTime: 0,
        successRate: 0,
        adaptability: 0
      }
    };

    let totalDecisions = 0;
    let totalConfidence = 0;
    const confidenceScores = [];

    // Analyze each AIDT log
    aidtData.forEach(aidtLog => {
      if (!aidtLog.decisionTree?.rounds) return;

      aidtLog.decisionTree.rounds.forEach(round => {
        round.turns?.forEach(turn => {
          turn.rolls?.forEach(roll => {
            totalDecisions++;
            
            // Decision patterns
            const action = roll.action || 'unknown';
            stats.decisionPatterns[action] = (stats.decisionPatterns[action] || 0) + 1;
            
            // Confidence analysis
            if (typeof roll.score === 'number') {
              totalConfidence += roll.score;
              confidenceScores.push(roll.score);
              
              const confidenceCategory = this.categorizeConfidence(roll.score);
              stats.confidenceAnalysis.distribution[confidenceCategory] = 
                (stats.confidenceAnalysis.distribution[confidenceCategory] || 0) + 1;
            }
            
            // Strategy analysis
            const strategy = this.analyzeDecisionStrategy(roll);
            if (strategy) {
              stats.strategyAnalysis[strategy]++;
            }
            
            // Roll analysis
            this.analyzeRollDecision(roll, stats.rollAnalysis);
          });
        });
      });
    });

    // Calculate averages and distributions
    if (totalDecisions > 0) {
      stats.confidenceAnalysis.average = (totalConfidence / totalDecisions).toFixed(2);
    }

    // Sort decision patterns by frequency
    const sortedPatterns = Object.entries(stats.decisionPatterns)
      .sort(([,a], [,b]) => b - a)
      .reduce((obj, [key, value]) => {
        obj[key] = {
          count: value,
          percentage: ((value / totalDecisions) * 100).toFixed(1)
        };
        return obj;
      }, {});
    
    stats.decisionPatterns = sortedPatterns;

    return stats;
  }

  /**
   * Calculate trend analysis
   * @param {Array} archives - All archives
   * @param {Array} gameData - Game data
   * @returns {Object} Trend analysis
   */
  calculateTrendAnalysis(archives, gameData) {
    const trends = {
      archiveFrequency: this.calculateArchiveFrequency(archives),
      gamePerformanceTrends: this.calculateGamePerformanceTrends(gameData),
      playerActivityTrends: this.calculatePlayerActivityTrends(gameData),
      difficultyProgression: this.calculateDifficultyProgression(gameData)
    };

    return trends;
  }

  /**
   * Generate insights based on analytics
   * @param {Array} gameData - Game data
   * @param {Array} aidtData - AIDT data
   * @returns {Array} Generated insights
   */
  generateInsights(gameData, aidtData) {
    const insights = [];

    // Game performance insights
    if (gameData.length >= 5) {
      const recentGames = gameData.slice(-5);
      const avgDuration = recentGames.reduce((sum, game) => 
        sum + this.calculateGameDuration(game.gameLog), 0) / recentGames.length;
      
      if (avgDuration > 30) {
        insights.push({
          type: 'performance',
          level: 'info',
          title: 'Longer Games Detected',
          message: `Recent games average ${Math.round(avgDuration)} minutes. Consider adjusting difficulty or rules.`,
          icon: '⏱️'
        });
      }
    }

    // AI behavior insights
    if (aidtData.length >= 3) {
      const totalDecisions = aidtData.reduce((sum, data) => {
        return sum + (data.decisionTree?.rounds?.reduce((roundSum, round) => {
          return roundSum + (round.turns?.reduce((turnSum, turn) => {
            return turnSum + (turn.rolls?.length || 0);
          }, 0) || 0);
        }, 0) || 0);
      }, 0);

      if (totalDecisions > 100) {
        insights.push({
          type: 'ai',
          level: 'success',
          title: 'Rich AI Data Available',
          message: `${totalDecisions} AI decisions analyzed. Comprehensive behavioral patterns detected.`,
          icon: '🤖'
        });
      }
    }

    // Storage insights
    const storageStats = archiveManager.getStorageStats();
    if (storageStats.estimatedMB > 10) {
      insights.push({
        type: 'storage',
        level: 'warning',
        title: 'Storage Usage High',
        message: `${storageStats.estimatedMB.toFixed(1)} MB used. Consider archiving older games.`,
        icon: '💾'
      });
    }

    // Player performance insights
    if (gameData.length >= 3) {
      const playerStats = this.calculatePlayerWinRates(gameData);
      const topPlayer = Object.entries(playerStats)
        .sort(([,a], [,b]) => b.winRate - a.winRate)[0];
      
      if (topPlayer && topPlayer[1].winRate > 60) {
        insights.push({
          type: 'performance',
          level: 'info',
          title: 'Dominant Player Detected',
          message: `${topPlayer[0]} has a ${topPlayer[1].winRate.toFixed(1)}% win rate. Consider balancing.`,
          icon: '🏆'
        });
      }
    }

    return insights;
  }

  /**
   * Helper methods for specific analyses
   */
  
  analyzeIndividualGame(game) {
    const log = game.gameLog;
    if (!log || !Array.isArray(log)) return {};

    const analysis = {
      duration: this.calculateGameDuration(log),
      players: this.extractPlayersFromGame(log),
      winner: null,
      victoryCondition: null,
      totalRounds: 0,
      significantEvents: []
    };

    // Find winner and victory condition
    const gameEndEntries = log.filter(entry => 
      entry.message?.includes('wins') || 
      entry.message?.includes('victory') ||
      entry.message?.includes('eliminated')
    );

    if (gameEndEntries.length > 0) {
      const lastEntry = gameEndEntries[gameEndEntries.length - 1];
      analysis.winner = this.extractWinnerFromEntry(lastEntry);
      analysis.victoryCondition = this.extractVictoryCondition(lastEntry);
    }

    // Extract final scores if available from state snapshot
    if (game.stateSnapshot?.players) {
      analysis.players = analysis.players.map(player => {
        const statePlayer = game.stateSnapshot.players.find(p => p.name === player.name);
        return {
          ...player,
          finalScore: statePlayer?.victoryPoints || 0,
          finalHealth: statePlayer?.health || 0,
          isWinner: player.name === analysis.winner
        };
      });
    }

    return analysis;
  }

  calculateGameDuration(log) {
    if (!log || log.length < 2) return 0;
    
    const startTime = new Date(log[0].timestamp);
    const endTime = new Date(log[log.length - 1].timestamp);
    
    return (endTime - startTime) / (1000 * 60); // Duration in minutes
  }

  extractPlayersFromGame(log) {
    const players = new Set();
    
    log.forEach(entry => {
      if (entry.player && entry.player !== 'System') {
        players.add(entry.player);
      }
      
      // Extract from message patterns
      const playerMatches = entry.message?.match(/Player (\w+)/g);
      if (playerMatches) {
        playerMatches.forEach(match => {
          const playerName = match.replace('Player ', '');
          players.add(playerName);
        });
      }
    });
    
    return Array.from(players).map(name => ({ name }));
  }

  categorizeGameLength(duration) {
    if (duration < 10) return 'Quick (< 10min)';
    if (duration < 20) return 'Short (10-20min)';
    if (duration < 40) return 'Medium (20-40min)';
    return 'Long (40+ min)';
  }

  categorizeConfidence(score) {
    if (score >= 8) return 'Very High';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low';
    return 'Very Low';
  }

  analyzeDecisionStrategy(roll) {
    if (!roll.rationale) return null;
    
    const rationale = roll.rationale.toLowerCase();
    
    if (rationale.includes('attack') || rationale.includes('aggressive') || rationale.includes('damage')) {
      return 'aggressive';
    }
    if (rationale.includes('safe') || rationale.includes('conservative') || rationale.includes('careful')) {
      return 'conservative';
    }
    return 'balanced';
  }

  analyzeRollDecision(roll, rollAnalysis) {
    const action = roll.action;
    const faces = roll.faces;
    
    if (action === 'keep' && faces) {
      const faceKey = Array.isArray(faces) ? faces.join(',') : faces.toString();
      rollAnalysis.keepPatterns[faceKey] = (rollAnalysis.keepPatterns[faceKey] || 0) + 1;
    }
    
    if (action === 'reroll' && faces) {
      const faceKey = Array.isArray(faces) ? faces.join(',') : faces.toString();
      rollAnalysis.rerollPatterns[faceKey] = (rollAnalysis.rerollPatterns[faceKey] || 0) + 1;
    }
  }

  calculateArchiveFrequency(archives) {
    const frequency = {};
    
    archives.forEach(archive => {
      const date = new Date(archive.ts || archive.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      frequency[dateKey] = (frequency[dateKey] || 0) + 1;
    });
    
    return frequency;
  }

  calculateGamePerformanceTrends(gameData) {
    return gameData.map((game, index) => ({
      gameIndex: index + 1,
      duration: this.calculateGameDuration(game.gameLog),
      playerCount: this.extractPlayersFromGame(game.gameLog).length,
      date: new Date(game.ts || game.timestamp)
    }));
  }

  calculatePlayerActivityTrends(gameData) {
    const activity = {};
    
    gameData.forEach(game => {
      const date = new Date(game.ts || game.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!activity[month]) {
        activity[month] = { games: 0, players: new Set() };
      }
      
      activity[month].games++;
      this.extractPlayersFromGame(game.gameLog).forEach(player => {
        activity[month].players.add(player.name);
      });
    });
    
    // Convert sets to counts
    Object.keys(activity).forEach(month => {
      activity[month].uniquePlayers = activity[month].players.size;
      delete activity[month].players;
    });
    
    return activity;
  }

  calculateDifficultyProgression(gameData) {
    // Analyze if games are getting easier/harder over time
    const progression = [];
    
    gameData.forEach((game, index) => {
      const duration = this.calculateGameDuration(game.gameLog);
      const players = this.extractPlayersFromGame(game.gameLog);
      
      progression.push({
        gameNumber: index + 1,
        duration,
        playerCount: players.length,
        difficulty: this.estimateGameDifficulty(game)
      });
    });
    
    return progression;
  }

  estimateGameDifficulty(game) {
    // Simple heuristic based on game duration and events
    const duration = this.calculateGameDuration(game.gameLog);
    const logLength = game.gameLog?.length || 0;
    
    if (duration < 15 && logLength < 50) return 'Easy';
    if (duration > 40 || logLength > 200) return 'Hard';
    return 'Medium';
  }

  calculatePlayerWinRates(gameData) {
    const playerStats = {};
    
    gameData.forEach(game => {
      const analysis = this.analyzeIndividualGame(game);
      
      analysis.players.forEach(player => {
        if (!playerStats[player.name]) {
          playerStats[player.name] = { games: 0, wins: 0, winRate: 0 };
        }
        
        playerStats[player.name].games++;
        if (player.name === analysis.winner) {
          playerStats[player.name].wins++;
        }
      });
    });
    
    // Calculate win rates
    Object.keys(playerStats).forEach(player => {
      const stats = playerStats[player];
      stats.winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;
    });
    
    return playerStats;
  }

  extractWinnerFromEntry(entry) {
    const message = entry.message || '';
    const winPattern = /(\w+)\s+wins/i;
    const match = message.match(winPattern);
    return match ? match[1] : null;
  }

  extractVictoryCondition(entry) {
    const message = entry.message || '';
    
    if (message.toLowerCase().includes('victory points')) return 'Victory Points';
    if (message.toLowerCase().includes('elimination')) return 'Elimination';
    if (message.toLowerCase().includes('tokyo')) return 'Tokyo Control';
    
    return 'Unknown';
  }

  calculateDateRange(archives) {
    if (archives.length === 0) return null;
    
    const dates = archives.map(a => new Date(a.ts || a.timestamp)).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
      span: dates[dates.length - 1] - dates[0]
    };
  }

  calculateStorageEfficiency(archives) {
    const totalSize = archives.reduce((sum, archive) => sum + (archive.size || 0), 0);
    const averageSize = archives.length > 0 ? totalSize / archives.length : 0;
    
    return {
      totalSize,
      averageSize,
      compressionRatio: 1.0, // TODO: Calculate actual compression ratio
      efficiency: averageSize > 0 ? Math.min(100, (10000 / averageSize) * 100) : 100
    };
  }

  /**
   * Get cached analytics or trigger recalculation
   * @returns {Object} Analytics data
   */
  getAnalytics() {
    return this.analytics;
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.analytics = null;
    this.lastCalculated = null;
  }

  /**
   * Export analytics as JSON
   * @returns {string} JSON string
   */
  exportAnalytics() {
    if (!this.analytics) return null;
    return JSON.stringify(this.analytics, null, 2);
  }
}

// Export singleton instance
export const archiveAnalytics = new ArchiveAnalyticsService();