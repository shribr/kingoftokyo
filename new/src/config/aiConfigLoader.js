/** 
 * AI Configuration Loader
 * Centralized loading and caching for AI configuration files
 */

// Cached config objects
let aiConfig = null;
let aiPhrases = null;

// Loading promises to prevent duplicate requests
let configPromise = null;
let phrasesPromise = null;

/**
 * Load AI configuration from local config directory
 * @returns {Promise<Object>} AI configuration object
 */
export async function getAIConfig() {
  if (aiConfig) return aiConfig;
  
  if (!configPromise) {
    configPromise = fetch('/new/config/ai-config.json')
      .then(response => response.json())
      .then(config => {
        aiConfig = config;
        return config;
      })
      .catch(e => {
        console.warn('[aiConfig] Failed to load new/config/ai-config.json, using fallback', e);
        aiConfig = { 
          diceEvaluation: {
            attack: { baseValue: 3 },
            energy: { baseValue: 2 },
            heal: { baseValue: 2 },
            setCollection: {
              priorities: {
                threeOfAKind: {
                  "1": { baseValue: 15 },
                  "2": { baseValue: 18 },
                  "3": { baseValue: 22 }
                },
                pairValue: {
                  "1": { keepValue: 8 },
                  "2": { keepValue: 12 },
                  "3": { keepValue: 16 }
                }
              }
            }
          },
          monsterSpecificAdjustments: {},
          timing: { speeds: {} }
        };
        return aiConfig;
      });
  }
  
  return configPromise;
}

/**
 * Load AI phrases from local config directory
 * @returns {Promise<Object>} AI phrases object
 */
export async function getAIPhrases() {
  if (aiPhrases) return aiPhrases;
  
  if (!phrasesPromise) {
    phrasesPromise = fetch('/new/config/ai-phrases.json')
      .then(response => response.json())
      .then(phrases => {
        aiPhrases = phrases;
        return phrases;
      })
      .catch(e => {
        console.warn('[aiConfig] Failed to load new/config/ai-phrases.json, using fallback', e);
        aiPhrases = { 
          analyzing: ['Cross-referencing outcomes...', 'Pattern matching dice...'],
          motivational: ['Stay focused...', 'Every roll counts...'],
          aggressive: ['Dominate the skyline!', 'Show them real power!']
        };
        return aiPhrases;
      });
  }
  
  return phrasesPromise;
}

/**
 * Get monster-specific configuration
 * @param {string} playerName - Player/monster name
 * @returns {Promise<Object>} Monster configuration
 */
export async function getMonsterConfig(playerName) {
  const config = await getAIConfig();
  const playerKey = playerName.toLowerCase().replace(/\s+/g, '');
  return config.monsterSpecificAdjustments?.[playerKey] || null;
}

/**
 * Reset cached configurations (useful for testing)
 */
export function resetConfigCache() {
  aiConfig = null;
  aiPhrases = null;
  configPromise = null;
  phrasesPromise = null;
}