/**
 * AI Decision Engine (Clean Rewrite)
 * Pipeline: state -> goal -> scoring -> set EV -> decision -> invariants.
 * Exposed UI hooks: AIDecisionEngine, instance._lastPerFaceProbabilities, player._aiTurnGoal.
 * No legacy intermix. Focus: stable set pursuit, power card awareness, minimal heuristics.
 */

(function(){
	const CFG = {
		goalAlignmentMultiplier: 1.55,
		pairScoreBase: 60,
		singleThree: 15,
		singleTwo: 10,
		singleOne: 6,
		formedSetBase: 200,
		fourKindEVFocus: 0.55,
		earlyStopMinKept: 4,
		earlyStopImprovementThreshold: 0.55,
		healingCriticalHP: 4,
		keepThresholdBase: 6
	};

	// Tag groups (names compared case-insensitively)
	const CARD_TAGS = {
		extraDie: ['Extra Head','extra_head'],
		extraReroll: ['Giant Brain','giant_brain'],
		attackBoost: ['Acid Attack','acid_attack','Fire Breathing','fire_breathing','Spiked Tail','spiked_tail'],
		vpBoost: ['Friend of Children','friend_of_children','Dedicated News Team','dedicated_news_team','Even Bigger','even_bigger'],
		energyEngine: ['Alien Metabolism','alien_metabolism','Corner Store','corner_store','Energy Hoarder','energy_hoarder'],
		healEngine: ['Regeneration','regeneration','Rapid Healing','rapid_healing','Healing Ray','healing_ray']
	};

	class AIDecisionEngine {
		constructor(){
			if (typeof window !== 'undefined') {
				window.AIOverrideStats = window.AIOverrideStats || { decisions:0, invariants:0, pairProtect:0 };
			}
		}

		makeRollDecision(currentDice, rollsRemaining, player, gameState){
			try { return this._core(currentDice, rollsRemaining, player, gameState); }
			catch(err){ console.error('AI error, fallback reroll', err); return { action:'reroll', keepDice:[], reason:'AI error fallback', confidence:0.3 }; }
		}

		_core(diceRaw, rollsRemaining, player, gameState){
			const dice = diceRaw.map(f=>this._canon(f));
			const state = this._extractState(dice, rollsRemaining, player, gameState);
			// Personality snapshot (default mid values if absent)
			state.personality = {
				aggression: player.monster?.personality?.aggression ?? 3,
				risk: player.monster?.personality?.risk ?? 3,
				strategy: player.monster?.personality?.strategy ?? 3
			};
			const goal = this._selectOrMaintainGoal(state, player);
			const scored = this._scoreDice(state, goal, player);
			const ev = this._computeSetEV(state, goal);
			let decision = this._assembleDecision(state, goal, scored, ev, rollsRemaining, player);
			decision = this._enforceInvariants(decision, state, rollsRemaining);
			// UI probabilities mirror previous expectation
			this._lastPerFaceProbabilities = scored.map(s=>({ index:s.index, face:s.face, keepProbability:Number((s.normScore||0).toFixed(3)) }));
			if (typeof window !== 'undefined') window.AIOverrideStats.decisions++;
			return decision;
		}

		// ---------- State Extraction ----------
		_extractState(dice, rollsRemaining, player, gameState){
			const counts = { one:0,two:0,three:0,attack:0,energy:0,heart:0 };
			dice.forEach(f=>{ if(counts.hasOwnProperty(f)) counts[f]++; });
			const numbers = ['one','two','three'].map(face=>({ face, count:counts[face], faceValue: face==='one'?1: face==='two'?2:3, pair:counts[face]===2, formed:counts[face]>=3 }));
			const maxVP = Math.max(...gameState.players.map(p=>p.victoryPoints));
			const alive = gameState.players.filter(p=>!p.isEliminated).length;
			const phase = maxVP>=15 || alive<=2 ? 'end' : (maxVP>=10 ? 'mid':'early');
			const tokyoOccupant = gameState.players.find(p=>p.isInTokyo && !p.isEliminated) || null;
			const criticalThreat = gameState.players.some(p=>p.id!==player.id && !p.isEliminated && p.victoryPoints>=18);
			const cardSummary = this._summarizeCards(player.powerCards||[]);
			const effectiveRollsRemaining = rollsRemaining + (cardSummary.extraReroll>0 ? 1:0); // treat extra reroll as future improvement window
			// Represent extra die as virtual available slot for EV modeling (not altering current dice array contents directly)
			return { dice, counts, numbers, phase, tokyoOccupant, criticalThreat, cardSummary, player, rollsRemaining:effectiveRollsRemaining, origRolls:rollsRemaining };
		}

		_summarizeCards(cards){
			const flags = { extraDie:0, extraReroll:0, attackBoost:0, vpBoost:0, energyEngine:0, healEngine:0, bonusVP:0, bonusEnergyFlat:0, healPoints:0 };
			cards.forEach(c=>{
				const name = (c.name||c.id||'').toLowerCase();
				// Name-based tags fallback
				for (const k of Object.keys(CARD_TAGS)) {
					if (CARD_TAGS[k].some(tag=> tag.toLowerCase()===name)) flags[k]++;
				}
				// Structured effects parsing if exists
				if (Array.isArray(c.effects)){
					c.effects.forEach(e=>{
						const type = (e.type||'').toLowerCase();
						const val = Number(e.value||e.amount||1) || 1;
						switch(type){
							case 'extradie': flags.extraDie += val; break;
							case 'extrareroll': flags.extraReroll += val; break;
							case 'attackbonus': flags.attackBoost += val; break;
							case 'bonusenergy': flags.energyEngine += val; flags.bonusEnergyFlat += val; break;
							case 'healpoints': flags.healEngine += Math.ceil(val/2); flags.healPoints += val; break;
							case 'victorypoints': flags.vpBoost += Math.ceil(val/2); flags.bonusVP += val; break;
							default: break; // ignore unknown
						}
					});
				}
			});
			return flags;
		}

		// ---------- Goal Selection ----------
		_selectOrMaintainGoal(state, player){
			if (player._aiTurnGoal){
				const face = player._aiTurnGoal.face;
				// Goal fostering: if current goal is a low-value formed or near-formed set of ones while a higher face has emerging potential
				if (state.counts[face]>0){
					if (face==='one'){
						const twoCount = state.counts.two;
						const threeCount = state.counts.three;
						// Switch if we only have exactly a triple of ones but there is at least a pair of threes or twos with more rolls remaining
						if (state.counts.one===3 && state.rollsRemaining>=2 && (threeCount>=2 || twoCount>=2)){
							const targetFace = threeCount>=2? 'three': 'two';
							player._aiTurnGoal = { type:'numberSet', face:targetFace, at:Date.now(), fosteredFrom:'one' };
							return player._aiTurnGoal;
						}
					}
					return player._aiTurnGoal; // keep existing goal
				}
			}
			// pick pair with highest count then value
			const candidates = state.numbers.filter(n=>n.count>=2);
			if (candidates.length){
				candidates.sort((a,b)=> b.count - a.count || b.faceValue - a.faceValue);
				const chosen = candidates[0];
				player._aiTurnGoal = { type:'numberSet', face:chosen.face, at:Date.now(), countAtSel:chosen.count };
				return player._aiTurnGoal;
			}
			// opportunistic single three early
			if (!player._aiTurnGoal && state.rollsRemaining>=2 && state.counts.three===1){
				player._aiTurnGoal = { type:'numberSet', face:'three', at:Date.now(), countAtSel:1, provisional:true };
				return player._aiTurnGoal;
			}
			return null;
		}

		// ---------- Scoring ----------
		_scoreDice(state, goal, player){
			const { counts, phase, cardSummary, personality } = state;
			const needHealing = player.health <= CFG.healingCriticalHP;
			const attackPressure = state.tokyoOccupant && state.tokyoOccupant.id !== player.id ? 1:0;
			const tokyoEmpty = !state.tokyoOccupant;
			const tokyoOccupiedBySelf = !!player.isInTokyo;
			const enemyTokyoOccupant = state.tokyoOccupant && state.tokyoOccupant.id !== player.id ? state.tokyoOccupant : null;
			const arr = [];
			state.dice.forEach((face,index)=>{
				let score=0, locked=false;
				if (face==='one'||face==='two'||face==='three'){
					const count = counts[face];
						if (count>=3){ score = CFG.formedSetBase + count; locked=true; }
						else if (count===2){ score = CFG.pairScoreBase + (face==='three'?18: face==='two'?10:5); }
						else { // single
							score = face==='three'? CFG.singleThree: face==='two'? CFG.singleTwo: CFG.singleOne;
							if (face==='one' && (counts.three>=2 || counts.two>=2)) score *= 0.3; // devalue stray 1 if better paths
						}
						if (goal && goal.face===face && !locked) score *= CFG.goalAlignmentMultiplier;
						if (cardSummary.vpBoost) score *= (1 + 0.15*cardSummary.vpBoost);
				} else if (face==='attack'){
					// Base attack weighting with pressure & aggression scaling
					const aggressionAdj = 1 + ((personality.aggression - 3) * 0.15);
					const threatBonus = state.criticalThreat ? 12 : 0;
					let baseAtk = 18 + attackPressure*8 + threatBonus;
					// Tokyo strategic modifiers
					if (tokyoEmpty && !tokyoOccupiedBySelf && player.health >= 6){
						// Encourage entering when healthy
						baseAtk += 6 + (personality.aggression-3)*2;
					}
					if (enemyTokyoOccupant){
						if (enemyTokyoOccupant.health <=5) baseAtk += 5; // pressure weakened occupant
						if (enemyTokyoOccupant.victoryPoints >=10) baseAtk += 5; // deny high VP occupant
					}
					if (tokyoOccupiedBySelf && player.health <=5){
						baseAtk -= 6; // survival over aggression inside Tokyo when low HP
					}
					score = baseAtk * aggressionAdj;
					if (cardSummary.attackBoost) score += 6*cardSummary.attackBoost;
					if (player.isInTokyo) score -= 4; // self-preservation tilt
					if (goal && counts[goal.face]===2) score *= 0.75; // leave space for forming triple
				} else if (face==='energy'){
					// Strategy emphasizes resource prep; risk slightly de-emphasizes energy (prefers explosive outcomes)
					const baseEnergy = phase==='early'?16: phase==='mid'?12:8;
					const stratAdj = 1 + ((personality.strategy - 3) * 0.12);
					const riskAdj = 1 - ((personality.risk - 3) * 0.07);
					score = baseEnergy * stratAdj * riskAdj;
					if (cardSummary.energyEngine) score += 5*cardSummary.energyEngine;
					if (player.energy <=2) score += 6;
					if (goal && counts[goal.face]===2) score *= 0.85;
				} else if (face==='heart'){
					const riskHealscale = 1 - ((personality.risk - 3) * 0.12); // high risk reduces heal priority
					let baseHeal = needHealing? (25 + (CFG.healingCriticalHP - player.health)*4): (player.health===player.maxHealth?0:10);
					// Pre-enter top-off: if Tokyo empty & planning to enter (healthy threshold) but still below max, modest boost
					if (tokyoEmpty && !tokyoOccupiedBySelf && player.health < player.maxHealth && player.health <= 6){
						baseHeal += 6;
					}
					score = baseHeal * riskHealscale;
					if (cardSummary.healEngine) score += 4*cardSummary.healEngine;
					if (player.isInTokyo) score = 0; // cannot heal
				}
				arr.push({ index, face, score, locked });
			});
			const max = Math.max(1,...arr.map(s=>s.score));
			arr.forEach(s=> s.normScore = s.score / max);
			return arr;
		}

		// ---------- Set EV ----------
		_computeSetEV(state, goal){
			// Effective free dice consider extra die cards (each adds another potential matching source)
			const extraDie = state.cardSummary?.extraDie || 0;
			const effectiveDiceCount = state.dice.length + extraDie;
			const committedToFormed = state.numbers.filter(n=>n.formed).reduce((a,n)=>a+n.count,0);
			const free = Math.max(0, effectiveDiceCount - committedToFormed);
			const R = state.rollsRemaining;
			const items=[];
			state.numbers.forEach(n=>{
				if (R<=0) return;
				// Probability helpers
				if (n.count===2){
					// Chance to hit at least one matching face across remaining rolls (binomial complement approximation)
					const pTriple = 1 - Math.pow(5/6, free * R);
					items.push({ face:n.face, type:'completeTriple', ev: pTriple * n.faceValue });
				} else if (n.count===3){
					// Four-of-a-kind chase
					const p4 = 1 - Math.pow(5/6, free * R * CFG.fourKindEVFocus);
					items.push({ face:n.face, type:'fourKind', ev: p4 * 0.9 });
					// Five-of-a-kind extended chase (only if free dice + potential future still leave capacity)
					if (free>=2 || (free>=1 && (state.cardSummary.extraReroll>0 || extraDie>0))){
						// Expected additional matches approximation: E = free * R * (1/6) (cap at 2 remaining steps to five-of-a-kind)
						const expectedMatches = Math.min(2, (free * R)/6);
						// Diminishing weight beyond four-kind (slightly less than perfect info)
						const ev5 = expectedMatches>1? (expectedMatches-1)*0.75 : 0; // only second expected match contributes to push to 5 kind
						if (ev5>0) items.push({ face:n.face, type:'fiveKindChase', ev: ev5 });
					}
				} else if (n.count===4){
					// Already four-of-a-kind, compute marginal for five
					if (free>0){
						const p5 = 1 - Math.pow(5/6, free * R * 0.65); // slight discount
						items.push({ face:n.face, type:'fiveKind', ev: p5 * 0.8 });
					}
				}
			});
			let total = items.reduce((s,i)=>s+i.ev,0);
			// Add additive EV for generic faces from free dice (approximate marginal future benefit)
			if (R>0 && free>0){
				// Simple expected counts over R rolls: free * R / 6 for any specific face.
				const expPerFace = (free * R)/6;
				// Weight attack higher if threat, healing if low HP, energy early/mid
				const player = state.player;
				const phase = state.phase;
				const threatFactor = state.criticalThreat?1.4:1;
				const lowHP = player.health <= CFG.healingCriticalHP;
				const attackEV = expPerFace * 0.9 * threatFactor; // abstract attack value
				const healEV = lowHP? expPerFace * 1.2: expPerFace*0.2;
				const energyEV = phase==='early'? expPerFace*0.9: phase==='mid'?expPerFace*0.6:expPerFace*0.3;
				const additive = attackEV + healEV + energyEV;
				if (additive>0){ items.push({ face:'*', type:'additiveFuture', ev:additive }); total += additive; }
			}
			return { items, total };
		}

		// ---------- Decision Assembly ----------
		_assembleDecision(state, goal, scored, ev, rollsRemaining, player){
			const keep = new Set();
			// keep all formed sets and pairs fully
			state.numbers.forEach(n=>{ if (n.formed || n.pair) state.dice.forEach((f,i)=>{ if(f===n.face) keep.add(i); }); });
			// high-value non-number dice
			const pairCount = state.numbers.filter(n=>n.pair).length;
			scored.filter(s=> !keep.has(s.index) && !['one','two','three'].includes(s.face)).forEach(s=>{
				const threshold = CFG.keepThresholdBase * (pairCount>=2?1.1:1);
				if (s.score >= threshold) keep.add(s.index);
			});
			// guarantee both dice of goal pair if goal
			if (goal){
				const goalIdxs=[]; state.dice.forEach((f,i)=>{ if(f===goal.face) goalIdxs.push(i); });
				if (goalIdxs.length>=2) goalIdxs.forEach(i=>keep.add(i));
			}
			const kept = Array.from(keep).sort((a,b)=>a-b);
			const improvement = ev.total;
			let action='reroll';
			const unresolvedPairs = state.numbers.filter(n=> n.pair && !n.formed).length;
			// Adaptive thresholds
			const personality = state.personality || { risk:3, aggression:3, strategy:3 };
			const riskFactor = (personality.risk - 3); // -2..+2
			const adaptiveMinKept = Math.max(3, CFG.earlyStopMinKept + (riskFactor<=0 ? -riskFactor : 0)); // cautious (low risk) needs fewer kept to stop
			const adaptiveEVThreshold = CFG.earlyStopImprovementThreshold + (riskFactor * -0.07); // high risk raises threshold (harder to stop)
			if (rollsRemaining>0){
				if (kept.length>=adaptiveMinKept && improvement < adaptiveEVThreshold && unresolvedPairs===0){ action='endRoll'; }
			} else action='endRoll';
			// Human-readable explanation parts (remove raw debug noise)
			const reasonParts=[];
			if (goal) reasonParts.push(`Chasing a set of ${goal.face}s`);
			if (unresolvedPairs>0) reasonParts.push(`Maintaining ${unresolvedPairs} potential pair${unresolvedPairs>1?'s':''}`);
			if (state.cardSummary.attackBoost) reasonParts.push(`Attack boost synergy active x${state.cardSummary.attackBoost}`);
			if (state.cardSummary.energyEngine) reasonParts.push(`Energy engine pieces ${state.cardSummary.energyEngine}`);
			if (state.cardSummary.healEngine) reasonParts.push(`Healing engine pieces ${state.cardSummary.healEngine}`);
			if (action==='endRoll'){
				reasonParts.push(`Stopping because expected improvement (${improvement.toFixed(2)}) below adaptive threshold (${adaptiveEVThreshold.toFixed(2)}) with ${kept.length} dice locked`);
			} else {
				reasonParts.push(`Continuing: expected gain (${improvement.toFixed(2)}) still above stop threshold or more consolidation desired`);
			}
			if (state.cardSummary.extraDie) reasonParts.push(`Extra die capacity influences future odds`);
			const techMeta = { keptCount: kept.length, evGain: improvement, unresolvedPairs, adaptiveEVThreshold, adaptiveMinKept, extraDie: state.cardSummary.extraDie||0 };
			const confidence = action==='endRoll'? (rollsRemaining>0?0.8:0.92):0.6;
			// Yield / retreat suggestion (does not alter dice action, only advisory flag) when inside Tokyo low HP and multiple opponents can strike
			let yieldSuggestion = false;
			if (player.isInTokyo){
				const threateningEnemies = state.player.gameState?.players?.filter(p=> !p.isEliminated && p.id!==player.id && p.health>0).length || 0;
				const lowHP = player.health <= CFG.healingCriticalHP;
				if (lowHP && threateningEnemies>=2){
					yieldSuggestion = true;
					reasonParts.push('SuggestYield');
				}
			}
			return { action, keepDice: kept, reason: reasonParts.join(' '), confidence, yieldSuggestion, techMeta, goal };
		}

		// ---------- Invariants ----------
		_enforceInvariants(decision, state, rollsRemaining){
			const counts = state.counts;
			// full pair retention
			['one','two','three'].forEach(face=>{
				if (counts[face]===2){
					const idxs=[]; state.dice.forEach((f,i)=>{ if(f===face) idxs.push(i); });
					const kept = idxs.filter(i=> decision.keepDice.includes(i));
					if (kept.length===1){ idxs.forEach(i=> decision.keepDice.push(i)); decision.reason+=' | inv:pair restore'; if (typeof window!=='undefined') window.AIOverrideStats.pairProtect++; }
				}
			});
			// multi-pair continuation
			if (decision.action==='endRoll' && rollsRemaining>0){
				const pairFaces = ['one','two','three'].filter(f=>counts[f]===2);
				if (pairFaces.length>=2){ decision.action='reroll'; decision.reason+=' | inv:multi-pair continue'; }
			}
			// attack cluster rule
			if (decision.action==='endRoll' && rollsRemaining>0 && counts.attack>=4){
				const singleNumber = ['one','two','three'].some(f=>counts[f]===1);
				if (singleNumber){ decision.action='reroll'; decision.reason+=' | inv:attack cluster'; }
			}
			decision.keepDice = Array.from(new Set(decision.keepDice)).sort((a,b)=>a-b);
			return decision;
		}

		// ---------- Utility ----------
		_canon(f){ switch(f){ case '1': return 'one'; case '2': return 'two'; case '3': return 'three'; default: return f; } }

		// ---------- Power Card Feature Extraction & Synergy ----------
		_getOrInitPlayerMemory(player){
			if (!player._aiMemory) player._aiMemory = { purchases:[], counts:{} };
			return player._aiMemory;
		}

		_extractCardFeatures(card){
			const features = new Set();
			if (!card) return features;
			const name = (card.name||'').toLowerCase();
			// Name hints (fallback)
			if (name.includes('extra') && name.includes('head')) features.add('extraDie');
			if (name.includes('brain')) features.add('extraReroll');
			if (name.includes('attack') || name.includes('spiked') || name.includes('fire')) features.add('attack');
			if (name.includes('heal') || name.includes('regeneration') || name.includes('rapid')) features.add('heal');
			if (name.includes('energy') || name.includes('metabolism') || name.includes('store')) features.add('energy');
			if (name.includes('victory') || name.includes('point') || name.includes('news')) features.add('vp');
			// Structured effects
			if (Array.isArray(card.effects)){
				card.effects.forEach(e=>{
					const type=(e.type||'').toLowerCase();
					if (type==='extradie') features.add('extraDie');
					else if (type==='extrareroll') features.add('extraReroll');
					else if (type==='attackbonus') features.add('attack');
					else if (type==='bonusenergy') features.add('energy');
					else if (type==='healpoints') features.add('heal');
					else if (type==='victorypoints') features.add('vp');
				});
			}
			return features;
		}

		// Basic synergy weight matrix (symmetric assumed); key: feature -> otherFeature -> multiplier bonus
		_getSynergyMatrix(){
			return {
				extraDie: { extraReroll: 1.15, attack:1.08, vp:1.05 },
				extraReroll: { extraDie:1.15, attack:1.07, vp:1.04 },
				attack: { extraDie:1.08, extraReroll:1.07, energy:1.03 },
				energy: { extraDie:1.05, vp:1.05 },
				heal: { energy:1.04, vp:1.03 },
				vp: { extraDie:1.05, extraReroll:1.04 }
			};
		}

		_computeSynergyMultiplier(existingFeatures, newFeatures){
			const matrix = this._getSynergyMatrix();
			let mult = 1.0;
			newFeatures.forEach(nf=>{
				existingFeatures.forEach(ef=>{
					const row = matrix[ef];
					if (row && row[nf]) mult *= row[nf];
					const row2 = matrix[nf];
					if (row2 && row2[ef]) mult *= row2[ef];
				});
			});
			return mult;
		}

		recordPowerCardPurchase(player, card){
			const mem = this._getOrInitPlayerMemory(player);
			mem.purchases.push({ id:card.id||card.name, ts:Date.now(), name:card.name });
			const feats = this._extractCardFeatures(card);
			feats.forEach(f=> mem.counts[f] = (mem.counts[f]||0)+1);
		}

		// ---------- Power Card Portfolio (Heuristic Stub) ----------
		// expected usage: optimizePowerCardPortfolio(availableCards, player) -> { cards:[], totalCost, strategy, efficiency, rationale: { perCard:[], aggregate:{} } }
		// New version: synergy-aware greedy optimizer with diminishing returns & rationale output
		_getDiminishingFactor(feature, count){
			// count = already owned BEFORE purchase; returns multiplier applied to base value of new feature instance
			// Curve chosen for gentle early stacking then tapering
			if (count <= 0) return 1.0;
			if (count === 1) return 0.82;
			if (count === 2) return 0.6;
			if (count === 3) return 0.45;
			return 0.35; // 4 or more
		}

		optimizePowerCardPortfolio(availableCards, player){
			if (!Array.isArray(availableCards) || !availableCards.length) return { cards:[], totalCost:0, strategy:'none', efficiency:0, rationale:{ perCard:[], aggregate:{} } };
			const energyBudget = player.energy || 0;
			if (energyBudget <= 0) return { cards:[], totalCost:0, strategy:'none', efficiency:0, rationale:{ perCard:[], aggregate:{} } };

			// Base feature weights (tunable)
			const baseWeights = { extraDie:22, extraReroll:18, attack:14, energy:12, heal:10, vp:8 };
			// Personality adjustments
			const { aggression=0.5, strategy: stratBias=0.5, risk=0.5 } = player.personality || {};
			// Copy existing purchase memory counts
			const mem = this._getOrInitPlayerMemory(player);
			const ownedCounts = { ...mem.counts };
			const ownedFeaturesSet = new Set(Object.keys(ownedCounts).filter(k=>ownedCounts[k]>0));

			// Helper to compute base value for a card
			const computeBase = (features)=>{
				let v=0; features.forEach(f=>{ v += (baseWeights[f]||5); });
				return v;
			};

			// Pre-extract features per card
			const cardMeta = availableCards.map(c=>{
				const feats = this._extractCardFeatures(c);
				return { card:c, features:feats, cost:c.cost||0 };
			});

			const rationalePerCard = [];
			const chosenCards=[]; let spent=0; let cumulativeScore=0;
			const simulatedCounts = { ...ownedCounts };
			const simulatedFeatures = new Set(ownedFeaturesSet);

			// Greedy selection loop
			while (true){
				let best=null;
				for (const meta of cardMeta){
					if (chosenCards.includes(meta.card)) continue;
					if (meta.cost + spent > energyBudget) continue;
					const base = computeBase(meta.features);
					// Diminishing returns factor (average across features for stability)
					let drFactors=[]; meta.features.forEach(f=>{ const cnt = simulatedCounts[f]||0; drFactors.push(this._getDiminishingFactor(f,cnt)); });
					const diminishing = drFactors.length? (drFactors.reduce((a,b)=>a+b,0)/drFactors.length):1;
					// Synergy multiplier relative to already simulated features
					const synergyMult = this._computeSynergyMultiplier(simulatedFeatures, meta.features) || 1;
					// Personality adjustments
					let personalityMult = 1;
					if (meta.features.has('attack')) personalityMult *= (1 + (aggression-0.5)*0.6);
					if (meta.features.has('extraDie') || meta.features.has('extraReroll')) personalityMult *= (1 + (stratBias-0.5)*0.5);
					if (meta.features.has('vp')) personalityMult *= (1 + (stratBias-0.5)*0.3);
					if (meta.features.has('heal') && player.health <= 4) personalityMult *= 1.25; // situational urgency
					// Risk leaning favors scaling pieces earlier
					if (meta.features.has('extraDie') && risk>0.6) personalityMult *= 1.1;
					// Raw adjusted value
					const rawAdjusted = base * diminishing * synergyMult * personalityMult;
					// Cost pressure (slightly superlinear) to discourage overpay
					const net = meta.cost>0? rawAdjusted / Math.pow(meta.cost,0.92): rawAdjusted;
					// Track candidate rationale (temporary)
					if (!best || net > best.net){
						best = { meta, base, diminishing, synergyMult, personalityMult, rawAdjusted, net };
					}
				}
				if (!best || best.net <= 5) break; // threshold guard; tunable
				// Accept best pick
				chosenCards.push(best.meta.card);
				spent += best.meta.cost;
				cumulativeScore += best.rawAdjusted;
				// Update simulated ownership
				best.meta.features.forEach(f=>{
					simulatedCounts[f] = (simulatedCounts[f]||0)+1;
					simulatedFeatures.add(f);
				});
				// Store rationale entry
				rationalePerCard.push({
					cardId: best.meta.card.id || best.meta.card.name,
					name: best.meta.card.name,
					features:[...best.meta.features],
					base: best.base,
					diminishing: best.diminishing,
					synergyMultiplier: best.synergyMult,
					personalityMultiplier: best.personalityMult,
					cost: best.meta.cost,
					netValue: best.net,
					rawAdjusted: best.rawAdjusted
				});
				if (spent >= energyBudget) break;
			}

			// Strategy label: pick most common feature category among chosen
			const featureTally={};
			for (const r of rationalePerCard){ r.features.forEach(f=> featureTally[f]=(featureTally[f]||0)+1); }
			let strategyLabel='balanced';
			if (Object.keys(featureTally).length){ strategyLabel = Object.entries(featureTally).sort((a,b)=> b[1]-a[1])[0][0]; }
			const efficiency = spent>0? cumulativeScore / spent : 0;
			const rationaleAggregate = {
				energyBudget,
				energySpent: spent,
				unspent: energyBudget-spent,
				selectedCount: chosenCards.length,
				featureTally,
				strategicIntent: strategyLabel,
				stoppedReason: (spent>=energyBudget? 'budget_exhausted': 'marginal_value_below_threshold'),
				thresholdUsed: 5
			};
			return { cards: chosenCards, totalCost: spent, strategy: strategyLabel, efficiency, rationale:{ perCard: rationalePerCard, aggregate: rationaleAggregate } };
		}

		// expected usage: evaluateDefensiveCardPurchase(card, player, availableCards) -> { shouldBuyDefensively, defensiveValue, denialReason }
		evaluateDefensiveCardPurchase(card, player, available){
			if (!card) return { shouldBuyDefensively:false, defensiveValue:0, denialReason:'' };
			// Heuristic: if card grants rerolls/extra heads/healing and opponents low HP or racing VP, deny
			const name = (card.name||'').toLowerCase();
			let defensiveValue=0; let reasonParts=[];
			if (name.includes('head')) { defensiveValue+=8; reasonParts.push('deny extra die potential'); }
			if (name.includes('brain')) { defensiveValue+=7; reasonParts.push('deny reroll boost'); }
			if (name.includes('heal') || name.includes('regeneration')) { defensiveValue+=6; reasonParts.push('deny sustain'); }
			if (name.includes('attack') || name.includes('spiked') || name.includes('fire')) { defensiveValue+=5; reasonParts.push('deny offense'); }
			// Scale by threat level among opponents
			const threats = (player.gameState?.players||[]).filter(p=> p.id!==player.id && !p.isEliminated);
			const highVP = threats.some(t=> t.victoryPoints>=15);
			if (highVP) defensiveValue *= 1.2;
			const lowHPEnemy = threats.some(t=> t.health<=3);
			if (lowHPEnemy && (name.includes('heal')||name.includes('regeneration'))) defensiveValue *= 0.6; // less need to deny heal if they may die soon
			// Budget gate: must still be affordable after portfolio plan (caller handles leftover energy)
			const should = defensiveValue >= 9 && (card.cost || 0) <= player.energy;
			return { shouldBuyDefensively: should, defensiveValue, denialReason: reasonParts.join(', ') };
		}
	}

	if (typeof window !== 'undefined') window.AIDecisionEngine = AIDecisionEngine;
	if (typeof module !== 'undefined' && module.exports) module.exports = { AIDecisionEngine };
})();

