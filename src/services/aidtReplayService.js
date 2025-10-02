/** aidtReplayService.js
 * Service for replaying AI Decision Tree (AIDT) logs alongside game logs
 * Shows AI thought processes, decision trees, and reasoning during replay
 */

import { eventBus } from '../core/eventBus.js';

let activeAIDTReplay = null;
let aidtData = null;
let currentRoundIndex = 0;
let currentTurnIndex = 0;
let currentRollIndex = 0;

/**
 * Initialize AIDT replay with decision tree data
 * @param {Object} aidtSnapshot - AIDT snapshot with rounds/turns/rolls
 */
export function initializeAIDTReplay(aidtSnapshot) {
  if (!aidtSnapshot || !aidtSnapshot.data || !aidtSnapshot.data.rounds) {
    console.warn('[aidtReplayService] Invalid AIDT snapshot');
    return false;
  }
  
  aidtData = aidtSnapshot.data;
  currentRoundIndex = 0;
  currentTurnIndex = 0;
  currentRollIndex = 0;
  
  console.log('[aidtReplayService] Initialized with', aidtData.rounds.length, 'rounds');
  return true;
}

/**
 * Start AIDT replay synchronized with game replay
 * @param {Object} options - Replay options
 */
export function startAIDTReplay(options = {}) {
  if (!aidtData) {
    console.warn('[aidtReplayService] No AIDT data available');
    return null;
  }
  
  activeAIDTReplay = {
    isActive: true,
    isPaused: false,
    currentEntry: 0,
    totalEntries: calculateTotalEntries(),
    syncWithGameLog: options.syncWithGameLog || false
  };
  
  // Emit AIDT replay started event
  try {
    window.dispatchEvent(new CustomEvent('aidt.replay.started', {
      detail: { 
        totalRounds: aidtData.rounds.length,
        totalEntries: activeAIDTReplay.totalEntries
      }
    }));
  } catch(e) {}
  
  console.log('[aidtReplayService] AIDT replay started');
  return activeAIDTReplay;
}

/**
 * Process game log entry and find corresponding AIDT decisions
 * @param {Object} logEntry - Game log entry
 * @param {number} entryIndex - Index of the entry in game log
 */
export function processGameLogEntry(logEntry, entryIndex) {
  if (!activeAIDTReplay || !aidtData) return;
  
  // Look for AI-related log entries (dice rolls, decisions)
  if (logEntry.type === 'dice' || logEntry.message?.includes('rolled')) {
    const aidtEntry = findCorrespondingAIDTEntry(logEntry);
    if (aidtEntry) {
      displayAIDecision(aidtEntry, logEntry);
    }
  }
  
  // Update progress
  activeAIDTReplay.currentEntry = entryIndex;
  
  try {
    window.dispatchEvent(new CustomEvent('aidt.replay.progress', {
      detail: { 
        current: entryIndex,
        total: activeAIDTReplay.totalEntries,
        entry: logEntry,
        aidtEntry: findCorrespondingAIDTEntry(logEntry)
      }
    }));
  } catch(e) {}
}

/**
 * Find AIDT entry that corresponds to a game log entry
 * @param {Object} logEntry - Game log entry
 * @returns {Object|null} - Corresponding AIDT roll data
 */
function findCorrespondingAIDTEntry(logEntry) {
  if (!aidtData || !aidtData.rounds) return null;
  
  // Extract player name and dice faces from log message
  const playerMatch = logEntry.message?.match(/Player (\w+)/);
  const facesMatch = logEntry.message?.match(/rolls? ([0-9,a-z,heart,claw,energy]+)/i);
  
  if (!playerMatch || !facesMatch) return null;
  
  const playerName = playerMatch[1];
  const faces = facesMatch[1];
  
  // Search through AIDT data for matching entry
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      for (const roll of turn.rolls) {
        if (roll.playerName === playerName && 
            normalizeFaces(roll.faces) === normalizeFaces(faces)) {
          return {
            ...roll,
            roundNumber: round.round,
            turnNumber: turn.turn,
            context: {
              round: round,
              turn: turn
            }
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Normalize dice faces string for comparison
 * @param {string} faces - Dice faces string
 * @returns {string} - Normalized faces string
 */
function normalizeFaces(faces) {
  if (!faces) return '';
  return faces.toString()
    .toLowerCase()
    .replace(/\s/g, '')
    .split(',')
    .sort()
    .join(',');
}

/**
 * Display AI decision for a specific roll
 * @param {Object} aidtEntry - AIDT entry with AI decision data
 * @param {Object} logEntry - Corresponding game log entry
 */
function displayAIDecision(aidtEntry, logEntry) {
  console.log('[aidtReplayService] Displaying AI decision:', aidtEntry);
  
  try {
    window.dispatchEvent(new CustomEvent('aidt.decision.display', {
      detail: {
        decision: aidtEntry,
        logEntry: logEntry,
        timestamp: Date.now()
      }
    }));
  } catch(e) {}
}

/**
 * Pause AIDT replay
 */
export function pauseAIDTReplay() {
  if (!activeAIDTReplay) return;
  activeAIDTReplay.isPaused = true;
  
  try {
    window.dispatchEvent(new CustomEvent('aidt.replay.paused'));
  } catch(e) {}
}

/**
 * Resume AIDT replay
 */
export function resumeAIDTReplay() {
  if (!activeAIDTReplay) return;
  activeAIDTReplay.isPaused = false;
  
  try {
    window.dispatchEvent(new CustomEvent('aidt.replay.resumed'));
  } catch(e) {}
}

/**
 * Stop AIDT replay
 */
export function stopAIDTReplay() {
  if (!activeAIDTReplay) return;
  
  activeAIDTReplay = null;
  currentRoundIndex = 0;
  currentTurnIndex = 0;
  currentRollIndex = 0;
  
  try {
    window.dispatchEvent(new CustomEvent('aidt.replay.stopped'));
  } catch(e) {}
  
  console.log('[aidtReplayService] AIDT replay stopped');
}

/**
 * Check if AIDT replay is currently active
 * @returns {boolean}
 */
export function isAIDTReplaying() {
  return activeAIDTReplay && activeAIDTReplay.isActive;
}

/**
 * Get current AIDT replay status
 * @returns {Object|null}
 */
export function getAIDTReplayStatus() {
  return activeAIDTReplay;
}

/**
 * Calculate total number of entries in AIDT data
 * @returns {number}
 */
function calculateTotalEntries() {
  if (!aidtData || !aidtData.rounds) return 0;
  
  let total = 0;
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      total += turn.rolls ? turn.rolls.length : 0;
    }
  }
  return total;
}

/**
 * Get AI decision summary for current replay state
 * @returns {Object}
 */
export function getAIDecisionSummary() {
  if (!aidtData) return null;
  
  const totalRounds = aidtData.rounds.length;
  const totalTurns = aidtData.rounds.reduce((sum, round) => sum + round.turns.length, 0);
  const totalRolls = calculateTotalEntries();
  
  // Calculate decision type distribution
  const decisionTypes = {};
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      for (const roll of turn.rolls) {
        const action = roll.action || 'unknown';
        decisionTypes[action] = (decisionTypes[action] || 0) + 1;
      }
    }
  }
  
  return {
    totalRounds,
    totalTurns,
    totalRolls,
    decisionTypes,
    averageScore: calculateAverageScore(),
    topDecisions: getTopDecisions(5)
  };
}

/**
 * Calculate average AI decision score
 * @returns {number}
 */
function calculateAverageScore() {
  if (!aidtData) return 0;
  
  let totalScore = 0;
  let count = 0;
  
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      for (const roll of turn.rolls) {
        if (typeof roll.score === 'number') {
          totalScore += roll.score;
          count++;
        }
      }
    }
  }
  
  return count > 0 ? totalScore / count : 0;
}

/**
 * Get top N AI decisions by score
 * @param {number} limit - Number of top decisions to return
 * @returns {Array}
 */
function getTopDecisions(limit = 5) {
  if (!aidtData) return [];
  
  const decisions = [];
  
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      for (const roll of turn.rolls) {
        if (typeof roll.score === 'number') {
          decisions.push({
            ...roll,
            roundNumber: round.round,
            turnNumber: turn.turn
          });
        }
      }
    }
  }
  
  return decisions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search AIDT data for specific criteria
 * @param {Object} criteria - Search criteria
 * @returns {Array} - Matching AIDT entries
 */
export function searchAIDTData(criteria = {}) {
  if (!aidtData) return [];
  
  const results = [];
  const { playerName, action, minScore, maxScore, faces, rationale } = criteria;
  
  for (const round of aidtData.rounds) {
    for (const turn of round.turns) {
      for (const roll of turn.rolls) {
        let matches = true;
        
        if (playerName && roll.playerName !== playerName) matches = false;
        if (action && roll.action !== action) matches = false;
        if (minScore && (typeof roll.score !== 'number' || roll.score < minScore)) matches = false;
        if (maxScore && (typeof roll.score !== 'number' || roll.score > maxScore)) matches = false;
        if (faces && !roll.faces?.includes(faces)) matches = false;
        if (rationale && !roll.rationale?.toLowerCase().includes(rationale.toLowerCase())) matches = false;
        
        if (matches) {
          results.push({
            ...roll,
            roundNumber: round.round,
            turnNumber: turn.turn
          });
        }
      }
    }
  }
  
  return results;
}