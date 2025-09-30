/**
 * AI Decision Tree - Interactive Reasoning Modals
 * Ported from legacy main.js lines 5436-5735
 * Provides detailed, conversational explanations of AI decisions
 */

import { newModalSystem } from '../../utils/new-modal-system.js';

/**
 * renderMiniDiceHTML - Creates visual dice representation
 * Returns HTML string with styled mini dice
 */
function renderMiniDiceHTML(faces, keptIndices = []) {
  if (!faces || !Array.isArray(faces)) return '<em>No dice</em>';
  
  const mapWord = f => {
    const l = (''+f).toLowerCase();
    if (l==='one') return '1'; if (l==='two') return '2'; if (l==='three') return '3';
    if (l==='heal') return 'heart';
    if (l==='claw') return 'attack';
    return f;
  };
  
  return faces.map((face, index) => {
    const norm = mapWord(face);
    const display = ({'attack':'🗡️','energy':'⚡','heart':'❤'}[norm]) || (''+norm).toUpperCase();
    const isKept = keptIndices.includes(index);
    const keptClass = isKept ? ' kept' : '';
    
    return `<span class="adt-std-die face-${norm}${keptClass}" data-face="${norm}" data-index="${index}">${display}</span>`;
  }).join('');
}

/**
 * renderSingleMiniDie - Creates a single inline mini die
 * Returns HTML string for a single die face
 */
function renderSingleMiniDie(face) {
  const mapWord = f => {
    const l = (''+f).toLowerCase();
    if (l==='one') return '1'; if (l==='two') return '2'; if (l==='three') return '3';
    if (l==='heal' || l==='heart') return 'heart';
    if (l==='claw' || l==='attack') return 'attack';
    return f;
  };
  
  const norm = mapWord(face);
  const display = ({'attack':'🗡️','energy':'⚡','heart':'❤'}[norm]) || (''+norm).toUpperCase();
  
  return `<span class="adt-std-die face-${norm}" data-face="${norm}" style="display:inline-flex; margin:0 2px;">${display}</span>`;
}

/**
 * generateConversationalDiceAnalysis - Creates friendly dice analysis text
 * Explains what the current roll means in plain language
 */
export function generateConversationalDiceAnalysis(diceArray, decision, gameConfig = null) {
  const counts = {};
  diceArray.forEach(face => {
    counts[face] = (counts[face] || 0) + 1;
  });

  const analysis = [];
  
  // Get dice faces from config (with fallback)
  const faces = gameConfig?.diceSystem?.faces || {
    '1': { type: 'number', symbol: '1', value: 1, description: 'Victory points' },
    '2': { type: 'number', symbol: '2', value: 2, description: 'Victory points' },
    '3': { type: 'number', symbol: '3', value: 3, description: 'Victory points' },
    'attack': { type: 'special', symbol: '⚔️', description: 'Attack opponents' },
    'energy': { type: 'special', symbol: '⚡', description: 'Buy power cards' },
    'heal': { type: 'special', symbol: '❤️', description: 'Restore health' }
  };
  
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

  return analysis.length > 0 
    ? analysis.join(' ') 
    : 'This roll doesn\'t show any strong patterns - might want to reroll for better combinations.';
}

/**
 * generatePersonalityBasedReasoning - Generates detailed personality-driven explanations
 * Shows how AI personality traits influence decision-making
 */
export function generatePersonalityBasedReasoning(personality, health, vp, energy, diceArray, decision, gameConfig = null) {
  const counts = {};
  diceArray.forEach(face => {
    counts[face] = (counts[face] || 0) + 1;
  });

  // Create mini dice for inline display
  const healDie = renderSingleMiniDie('heart');
  const attackDie = renderSingleMiniDie('attack');
  const oneDie = renderSingleMiniDie('1');
  const twoDie = renderSingleMiniDie('2');
  const threeDie = renderSingleMiniDie('3');

  let reasoning = '';
  
  if (personality === 'low-risk') {
    reasoning = `<p>This AI follows a <strong>low-risk strategy</strong>, prioritizing survival and steady progress over aggressive plays.</p>`;
    
    if (health <= 5) {
      reasoning += `<p>With only ${health} health remaining, the AI is being extra cautious. `;
      if (counts['heal'] || counts['heart']) {
        reasoning += `It values the ${counts['heal'] || counts['heart']} ${healDie} heart dice highly for healing.`;
      } else {
        reasoning += `It's looking for ${healDie} heart dice to heal up before taking more risks.`;
      }
      reasoning += `</p>`;
    }
    
    if ((counts['attack'] || counts['claw']) && decision.action === 'reroll') {
      reasoning += `<p>Even with ${counts['attack'] || counts['claw']} ${attackDie} attack dice, the AI chose to reroll because it doesn't want to risk entering Tokyo with low health.</p>`;
    }
    
  } else if (personality === 'aggressive') {
    reasoning = `<p>This AI uses an <strong>aggressive strategy</strong>, focusing on quick victories and high-risk, high-reward plays.</p>`;
    
    if (vp >= 15) {
      reasoning += `<p>With ${vp} victory points, the AI is pushing hard for a quick win. Every point counts now!</p>`;
    }
    
    if (counts['attack'] || counts['claw']) {
      reasoning += `<p>The ${counts['attack'] || counts['claw']} ${attackDie} attack dice are valuable for forcing other players out of Tokyo and potentially dealing massive damage.</p>`;
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
    const diceIcon = best.num === '1' ? oneDie : best.num === '2' ? twoDie : threeDie;
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

/**
 * generateDetailedReasoning - Creates comprehensive reasoning content
 * Combines situation analysis, decision logic, and personality explanations
 */
export function generateDetailedReasoning(data, gameConfig = null) {
  const { playerName, decision, analysisData, timestamp, roll } = data;
  
  // Extract dice information from roll data
  const diceArray = roll?.faces ? (typeof roll.faces === 'string' ? JSON.parse(roll.faces) : roll.faces) : [];
  const keptIndices = roll?.keptIndices ? (typeof roll.keptIndices === 'string' ? JSON.parse(roll.keptIndices) : roll.keptIndices) : [];
  
  // Extract player status from roll or analysisData
  const health = roll?.health || analysisData?.health || 10;
  const maxHealth = gameConfig?.gameRules?.player?.startingHealth || 10;
  const energy = roll?.energy || analysisData?.energy || 0;
  const vp = roll?.vp || analysisData?.vp || 0;
  
  // Create visual dice display
  const diceHTML = renderMiniDiceHTML(diceArray, keptIndices);

  // Get icons from config for status display
  const healthIcon = '❤️';
  const energyIcon = gameConfig?.diceSystem?.faces?.energy?.symbol || '⚡';
  const vpIcon = '⭐';

  // Determine personality type based on roll analysis or decision pattern
  let personality = roll?.personality || 'balanced';
  if (typeof personality !== 'string') {
    // Infer personality from behavior
    if (health <= 2 && decision.action === 'reroll') {
      personality = 'risk-taking';
    } else if (health <= 5 && decision.action === 'keep') {
      personality = 'low-risk';
    } else if (vp >= 15) {
      personality = 'aggressive';
    } else {
      personality = 'balanced';
    }
  }
  
  return `
    <div class="detailed-reasoning-content">
      <div class="reasoning-header">
        <h4>${playerName} - ${timestamp || 'Just now'}</h4>
        <p><strong>Decision:</strong> ${decision.action === 'reroll' ? 'Continue Rolling' : 'Stop and Keep Dice'}</p>
        <p><strong>Personality Type:</strong> ${personality.charAt(0).toUpperCase() + personality.slice(1).replace('-', ' ')}</p>
      </div>
      
      <div class="reasoning-situation">
        <h4>Situation Analysis:</h4>
        <p><strong>Current Roll:</strong></p>
        <div class="reasoning-dice-display">${diceHTML}</div>
        <p><strong>Health:</strong> ${healthIcon} ${health}/${maxHealth} ${health <= 2 ? '(Critical!)' : health <= 5 ? '(Low)' : '(Good)'}</p>
        <p><strong>Victory Points:</strong> ${vpIcon} ${vp} ${vp >= 15 ? '(Close to winning!)' : vp >= 10 ? '(Good progress)' : '(Early game)'}</p>
        <p><strong>Energy:</strong> ${energyIcon} ${energy} ${energy >= 10 ? '(Rich!)' : energy >= 5 ? '(Decent)' : '(Poor)'}</p>
      </div>
      
      <div class="reasoning-logic">
        <h4>Decision Logic:</h4>
        ${generatePersonalityBasedReasoning(personality, health, vp, energy, diceArray, decision, gameConfig)}
      </div>
      
      <div class="reasoning-summary">
        <h4>Summary:</h4>
        <p>${decision.reason || decision.rationale || decision.english || 'Standard AI decision-making strategy applied.'}</p>
      </div>
    </div>
  `;
}

/**
 * showReasoningInfoModal - Opens interactive reasoning modal
 * Displays detailed AI reasoning when user clicks on a roll entry
 */
export function showReasoningInfoModal(rollData, playerName, gameConfig = null) {
  if (!rollData) {
    console.warn('[AI Reasoning] No roll data provided');
    return;
  }

  // Build detailed reasoning data
  const detailedData = {
    playerName: playerName || rollData.playerName || 'AI Player',
    decision: {
      action: rollData.action || 'reroll',
      reason: rollData.rationale || rollData.english || rollData.reason || 'No reasoning provided'
    },
    analysisData: {
      health: rollData.health,
      energy: rollData.energy,
      vp: rollData.vp
    },
    timestamp: rollData.timestamp || new Date().toLocaleTimeString(),
    roll: rollData
  };
  
  // Generate detailed reasoning content
  const content = generateDetailedReasoning(detailedData, gameConfig);
  
  // Create and show modal
  newModalSystem.createModal(
    'aiReasoningDetail',
    `🧠 AI Reasoning: ${detailedData.playerName}`,
    content,
    { width: '600px', maxWidth: '90vw' }
  );
  
  newModalSystem.showModal('aiReasoningDetail');
}

/**
 * attachReasoningHandlers - Attach click handlers to reasoning links
 * Makes "(AI Reasoning)" links clickable to show detailed reasoning
 */
export function attachReasoningHandlers(container, gameConfig = null) {
  if (!container) return;
  
  // Find all reasoning links in standard view
  const reasoningLinks = container.querySelectorAll('.adt-reasoning-link');
  
  reasoningLinks.forEach(link => {
    // Add click handler to the link
    link.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      
      try {
        // Find parent roll element
        const rollEl = link.closest('.adt-std-roll');
        if (!rollEl) return;
        
        // Extract roll data from DOM
        const diceContainer = rollEl.querySelector('[data-dice]');
        const rollData = {
          faces: diceContainer?.getAttribute('data-dice'),
          keptIndices: diceContainer?.getAttribute('data-kept'),
          action: rollEl.textContent.includes('REROLL') ? 'reroll' : 'keep',
          rationale: rollEl.querySelector('.adt-std-just-text')?.textContent,
          confidence: rollEl.querySelector('.adt-std-confidence-pill')?.textContent,
          goal: rollEl.querySelector('.adt-std-line-value')?.textContent,
          timestamp: new Date().toLocaleTimeString()
        };
        
        // Get player name from parent turn
        const turnEl = rollEl.closest('.adt-std-turn');
        const playerName = turnEl?.querySelector('.adt-std-turn-header')?.textContent?.split(' ')[1] || 'AI Player';
        
        showReasoningInfoModal(rollData, playerName, gameConfig);
      } catch (err) {
        console.warn('[AI Reasoning] Error showing modal:', err);
      }
    });
    
    // Add hover effect to the link
    link.addEventListener('mouseenter', () => {
      link.style.color = '#ffd700';
      link.style.textDecoration = 'underline';
    });
    
    link.addEventListener('mouseleave', () => {
      link.style.color = '#aaa';
      link.style.textDecoration = 'underline';
    });
  });
}
