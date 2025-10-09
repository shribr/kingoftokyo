/**
 * new-modals.js
 * Content creators for the new modal system
 */

import { newModalSystem } from './new-modal-system.js';

// Initialize global winOdds object early so it's available even if settings modal never opens
if (!window.__KOT_WIN_ODDS__) {
  const winOdds = {
    history: [],
    maxHistory: 40,
    mode: (()=>{ try { return localStorage.getItem('KOT_DEV_WIN_ODDS_MODE') || 'bars'; } catch(_) { return 'bars'; } })(),
    compute(state){
      if (!state || !state.players) return {};
      const order = state.players.order || [];
      const byId = state.players.byId || {};
      const alive = order.filter(id => !byId[id].eliminated && !byId[id].isEliminated);
      if (!alive.length) return {};
      const features = alive.map(id => {
        const p = byId[id];
        const vp = p.vp ?? p.victoryPoints ?? 0;
        const health = p.health ?? 0;
        const energy = p.energy ?? 0;
        const inTokyo = !!p.inTokyo;
        const momentum = (p._recentVpGain || 0) + (p._recentEnergyGain || 0);
        return { id, vp, health, energy, inTokyo, momentum };
      });
      const maxVP = Math.max(...features.map(f=>f.vp), 0);
      const vpWeight = maxVP >= 15 ? 1.35 : (maxVP >= 10 ? 1.15 : 1.0);
      const healthWeight = 0.9;
      const energyWeight = 0.55;
      const tokyoWeight = 1.1;
      const momentumWeight = 0.4;
      let total = 0;
      const rawScores = {};
      features.forEach(f => {
        const tokyoBonus = f.inTokyo ? (tokyoWeight * (f.vp >= 10 ? 1.15 : 1)) : 0;
        const parts = {
          vp: f.vp * vpWeight,
          health: f.health * healthWeight,
          energy: f.energy * energyWeight,
          tokyo: tokyoBonus,
          momentum: f.momentum * momentumWeight
        };
        const score = parts.vp + parts.health + parts.energy + parts.tokyo + parts.momentum;
        rawScores[f.id] = { score, parts };
        total += score;
      });
      if (total <= 0) {
        const pct = (100 / features.length);
        const uniform = {}; features.forEach(f => uniform[f.id] = { percent: pct, parts: { vp:0,health:0,energy:0,tokyo:0,momentum:0 } });
        return uniform;
      }
      const odds = {};
      Object.keys(rawScores).forEach(id => { odds[id] = { percent: (rawScores[id].score / total) * 100, parts: rawScores[id].parts }; });
      return odds;
    },
    push(odds){
      const cloned = {}; Object.keys(odds).forEach(id => { const o = odds[id]; cloned[id] = { percent: o.percent, parts: { ...o.parts } }; });
      this.history.push({ ts: Date.now(), odds: cloned });
      if (this.history.length > this.maxHistory) this.history.shift();
    },
    trend(prev, current){
      if (prev == null) return 0;
      const delta = current - prev;
      const mag = Math.abs(delta);
      if (mag < 0.3) return 0;
      return delta;
    }
  };
  window.__KOT_WIN_ODDS__ = { obj: winOdds, render: null };
}

export function createSettingsModal() {
  const content = document.createElement('div');
  content.classList.add('settings-modal-root');
  // Optionally add 'settings-light' class later based on user preference
  content.innerHTML = `
    <!-- Tab Navigation -->
  <div class="settings-tabs" style="display:flex; border-bottom:2px solid #333; margin-bottom:0; background:#1c1c1c; border-radius:0.6vh 0.6vh 0 0; position:sticky; top:0; z-index:50; box-shadow:0 0.2vh 0.6vh -0.2vh rgba(0,0,0,.7); padding-bottom:2px;" role="tablist">
      <button type="button" class="tab-button active" data-tab="gameplay" style="flex: 1; background: none; border: none; color: #e4e4e4; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🎮</span>Gameplay
      </button>
      <button type="button" class="tab-button" data-tab="interface" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🎨</span>Interface
      </button>
      <button type="button" class="tab-button" data-tab="themes" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🌈</span>Themes
      </button>
      <button type="button" class="tab-button" data-tab="advanced" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">⚙️</span>Advanced
      </button>
      <button type="button" class="tab-button" data-tab="scenarios" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🧪</span>Scenarios
      </button>
      <button type="button" class="tab-button" data-tab="archives" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🗂</span>Archives
      </button>
      <button type="button" class="tab-button" data-tab="replay" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">▶️</span>Replay
      </button>
      <button type="button" class="tab-button" data-tab="ai" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">📊</span>Analytics & Insights
      </button>
      <button type="button" class="tab-button" data-tab="devtools" style="flex: 1; background: none; border: none; color: #999; padding: 1.2vh 1.6vw; cursor: pointer; font-family: 'Bangers', cursive; font-size: 1.6vh; border-bottom: 3px solid transparent; transition: all 0.3s; white-space: nowrap;">
        <span style="margin-right: 0.8vw;">🛠</span>Dev Tools
      </button>
    </div>

    <form class="unified-modal-form">
      <!-- Gameplay Tab -->
      <div class="tab-content active" data-tab-content="gameplay">
        <div class="section">
          <h3 class="section-title">🎮 Game Mechanics</h3>
          
          <div class="field">
            <label class="field-label">AI Decision Speed</label>
            <select name="cpuSpeed" class="field-input" style="width:auto;min-width:0;display:inline-block;">
              <option value="slow">Slow - Watch AI think through decisions</option>
              <option value="normal">Normal - Balanced timing for readability</option>
              <option value="fast">Fast - Quick AI actions</option>
            </select>
            <div class="field-help">Controls how quickly AI players make decisions and perform actions</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="showThoughtBubbles">
              <span class="checkbox-label">Show AI Thought Bubbles</span>
            </label>
            <div class="field-help">Display AI reasoning and decision-making process during gameplay</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="autoActivateMonsters">
              <span class="checkbox-label">Auto-Activate Monster Abilities</span>
            </label>
            <div class="field-help">Automatically trigger monster special abilities when applicable</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">🔊 Audio & Effects</h3>
          
          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="soundMuted">
              <span class="checkbox-label">Mute Sound Effects</span>
            </label>
            <div class="field-help">Turn off dice rolling, button clicks, and other game sounds</div>
          </div>
        </div>
      </div>

      <!-- Interface Tab -->
      <div class="tab-content" data-tab-content="interface" style="display: none;">
        <div class="section">
          <h3 class="section-title">📱 Layout Options</h3>
          
          <div class="field">
            <label class="field-label">Player Card Layout</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="stacked">
                <span>Stacked - Full overlap with dramatic tilt</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="condensed">
                <span>Condensed - Light overlap, readable mini stack</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="playerCardLayoutMode" value="list">
                <span>List - No overlap, linear arrangement</span>
              </label>
            </div>
            <div class="field-help">How player profile cards are arranged on screen</div>
          </div>

          <div class="field">
            <label class="field-label">Action Menu Placement</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="hybrid">
                <span>Smart - Auto-dock until dragged, then stays floating</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="docked">
                <span>Docked - Always positioned beside dice tray</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="actionMenuMode" value="floating">
                <span>Floating - Stays where you place it</span>
              </label>
            </div>
            <div class="field-help">Where action buttons appear during your turn</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="persistPositions">
              <span class="checkbox-label">Remember Layout & Positions</span>
            </label>
            <div class="field-help">Save draggable panel positions and collapsed/expanded states between game sessions</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">📱 Mobile</h3>
          
          <div class="field">
            <label class="field-label">Action Menu Corner</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="mobileMenuCorner" value="right">
                <span>Right Corner - Menu on right, dice tray on left</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="mobileMenuCorner" value="left">
                <span>Left Corner - Menu on left, dice tray on right</span>
              </label>
            </div>
            <div class="field-help">Choose which corner for the action menu. Perfect for left-handed or right-handed users.</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">🔧 UI Actions</h3>
          <div class="field" style="margin-top:16px;">
            <label class="field-label">UI Actions</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
              <button type="button" class="btn btn-sm" data-dev-reset-positions>Reset Positions</button>
              <button type="button" class="btn btn-sm" data-dev-log-positions>Log Positions</button>
              <button type="button" class="btn btn-sm" data-dev-log-dice>Log Dice</button>
              <button type="button" class="btn btn-sm" data-dev-log-effects>Log Effects</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Themes Tab -->
      <div class="tab-content" data-tab-content="themes" style="display: none;">
        <div class="section">
          <h3 class="section-title">🃏 Power Card Themes</h3>
          
          <div class="field" style="margin-top:18px;">
            <label class="field-label">Debug Console</label>
            <div id="dev-debug-console" style="margin-top:0.8vh;max-height:22vh;overflow:auto;font-family:monospace;font-size:11px;line-height:1.4;background:#0d1417;border:1px solid #222;border-radius:0.6vh;padding:0.8vh;">
              <div style="opacity:.5;">Debug output will appear here...</div>
            </div>
            <div style="margin-top:0.6vh;display:flex;gap:0.8vw;">
              <button type="button" class="btn btn-sm" id="dev-debug-clear">Clear</button>
              <button type="button" class="btn btn-sm" id="dev-debug-pause" data-paused="false">Pause</button>
            </div>
          </div>
          
          <div class="field">
            <label class="field-label">Dialog Style</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="dialogSystem" value="legacy">
                <span>Legacy - Original game dialogs and notifications</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="dialogSystem" value="unified">
                <span>Unified - Modern themed dialogs with enhanced visuals</span>
              </label>
            </div>
            <div class="field-help">Choose between original dialogs or the new unified theme system</div>
          </div>
        </div>
      </div>

      <!-- Advanced Tab -->
      <div class="tab-content" data-tab-content="advanced" style="display: none;">
        <div class="section">
          <h3 class="section-title">🔧 Developer Options</h3>
          
          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="autoStartInTest">
              <span class="checkbox-label">Auto-Start in Test Mode</span>
            </label>
            <div class="field-help">Skip intro screens and start directly in development/test mode</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="debugMode">
              <span class="checkbox-label">Enable Debug Console</span>
            </label>
            <div class="field-help">Show additional debug information in browser console</div>
          </div>

          <div class="field">
            <label class="field-checkbox">
              <input type="checkbox" name="showPerformanceMetrics">
              <span class="checkbox-label">Show Performance Metrics</span>
            </label>
            <div class="field-help">Display frame rate and performance statistics</div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">📊 Data Management</h3>
          
          <div class="field">
            <label class="field-label">Settings Export/Import</label>
            <div style="display: flex; gap: 0.8vw; margin-top: 0.8vh;">
              <button type="button" class="btn btn-secondary export-settings-btn" style="font-size: 1.2vh; padding: 0.6vh 1.2vw;">
                📤 Export Settings
              </button>
              <button type="button" class="btn btn-secondary import-settings-btn" style="font-size: 1.2vh; padding: 0.6vh 1.2vw;">
                📥 Import Settings
              </button>
              <input type="file" id="settings-import-file" accept=".json" style="display: none;">
            </div>
            <div class="field-help">Backup or restore all your game settings</div>
          </div>

          <div class="field">
            <label class="field-label">Reset Options</label>
            <div style="display: flex; gap: 0.8vw; margin-top: 0.8vh;">
              <button type="button" class="btn btn-warning reset-settings-btn" style="font-size: 1.2vh; padding: 0.6vh 1.2vw; background: #f39c12; border-color: #e67e22;">
                🔄 Reset to Defaults
              </button>
              <button type="button" class="btn btn-danger clear-all-data-btn" style="font-size: 1.2vh; padding: 0.6vh 1.2vw; background: #e74c3c; border-color: #c0392b;">
                🗑️ Clear All Data
              </button>
            </div>
            <div class="field-help">Reset settings or clear all stored game data</div>
          </div>
        </div>
      </div>

      <!-- Scenarios Tab -->
      <div class="tab-content" data-tab-content="scenarios" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🧪 Scenario Configuration</h3>
          <p style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:16px;">Configure scenario assignments and either apply them to the live game or generate a fresh auto-seeded run.</p>
          <div data-scenarios-host style="border:1px solid #222;background:#141414;padding:1vh 1.2vw;border-radius:0.6vh;min-height:14vh;position:relative;">
            <div class="loading" style="font-size:11px;opacity:.6;">Loading scenario tools…</div>
          </div>
        </div>
      </div>

      <!-- Archives Tab -->
      <div class="tab-content" data-tab-content="archives" style="display:none;">
        <div class="section">
          <h3 class="section-title">🗂 Archive Management</h3>
          <p style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:16px;">
            Manage your saved game archives, AI decision trees, and performance data.
          </p>

          <div class="field">
            <label class="field-label">Search & Filter</label>
            <div style="display:flex;gap:0.8vw;margin-top:0.8vh;margin-bottom:1.2vh;">
              <input type="text" id="settings-archive-search" placeholder="Search archives..." 
                     style="flex:1;padding:0.8vh;border:1px solid #ddd;border-radius:0.4vh;font-size:1.2vh;">
              <select id="settings-archive-filter" style="padding:0.8vh;border:1px solid #ddd;border-radius:0.4vh;font-size:1.2vh;">
                <option value="all">All Types</option>
                <option value="game">Game Logs</option>
                <option value="aidt">AI Decisions</option>
                <option value="auto">Auto Archives</option>
              </select>
              <button type="button" id="settings-archive-refresh" class="btn btn-secondary" style="padding:0.8vh 1.2vw;">🔄</button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Archives</label>
            <div id="settings-archive-list" style="margin-top:0.8vh;max-height:30vh;overflow-y:auto;border:1px solid #ddd;border-radius:0.4vh;background:#f9f9f9;">
              <div style="padding:2vh;text-align:center;color:#666;font-size:1.2vh;">
                Loading archives...
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Archive Settings</label>
            <div style="display:flex;gap:1.6vw;flex-wrap:wrap;margin-top:0.8vh;">
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="autoArchiveGameLogs" />
                <span class="checkbox-label">Auto-archive Game Logs</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="autoArchiveAIDTLogs" />
                <span class="checkbox-label">Auto-archive AI Decision Trees</span>
              </label>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Quick Actions</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
              <button type="button" class="btn btn-sm" data-dev-archive-game>Archive Game</button>
              <button type="button" class="btn btn-sm" data-dev-archive-ai>Archive AI Tree</button>
            </div>
            <div style="font-size:11px;opacity:.55;margin-top:6px;">Creates point-in-time snapshots in localStorage for analysis or replay.</div>
          </div>
        </div>
      </div>

      <!-- Replay Tab -->
      <div class="tab-content" data-tab-content="replay" style="display:none;">
        <div class="section">
          <h3 class="section-title">▶️ Replay System</h3>
          <p style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:16px;">
            Launch the professional replay overlay with speed controls, progress tracking, and rich visualizations.
          </p>
          
          <div class="field">
            <label class="field-label">Replay Actions</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
              <button type="button" class="btn btn-secondary" data-launch-replay-from-archive>
                ▶️ Start Replay from Archive
              </button>
              <button type="button" class="btn btn-secondary" data-show-replay-overlay>
                📼 Show Replay Overlay
              </button>
            </div>
            <div style="font-size:11px;opacity:.6;margin-top:8px;">
              Full replay system includes speed controls (0.5x-4x), minimize/maximize, keyboard shortcuts, and AI decision integration.
            </div>
          </div>

          <div class="field">
            <label class="field-label">Current Replay Status</label>
            <div style="padding:1.2vh;background:#1a1a1a;border:1px solid #333;border-radius:0.6vh;margin-top:0.8vh;">
              <div style="font-size:1.2vh;" data-replay-status-text>No active replay</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytics & Insights Tab -->
      <div class="tab-content" data-tab-content="ai" style="display:none;">
        <div class="section">
          <h3 class="section-title">📊 Game Analytics</h3>
          <p style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:16px;">
            Real-time game statistics, performance metrics, and analytical insights.
          </p>
          
          <div class="field">
            <label class="field-label">Analytics Overview</label>
            <div id="settings-analytics-overview" style="margin-top:0.8vh;padding:1.2vh;border:1px solid #ddd;border-radius:0.4vh;background:#f9f9f9;">
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(12vw,1fr));gap:1.2vw;text-align:center;">
                <div style="padding:0.8vh;background:white;border-radius:0.4vh;box-shadow:0 0.1vh 0.3vh rgba(0,0,0,0.1);">
                  <div style="font-size:18px;font-weight:bold;color:#333;" id="analytics-total-games">0</div>
                  <div style="font-size:11px;color:#666;">Total Games</div>
                </div>
                <div style="padding:0.8vh;background:white;border-radius:0.4vh;box-shadow:0 0.1vh 0.3vh rgba(0,0,0,0.1);">
                  <div style="font-size:18px;font-weight:bold;color:#333;" id="analytics-avg-duration">0min</div>
                  <div style="font-size:11px;color:#666;">Avg Duration</div>
                </div>
                <div style="padding:0.8vh;background:white;border-radius:0.4vh;box-shadow:0 0.1vh 0.3vh rgba(0,0,0,0.1);">
                  <div style="font-size:18px;font-weight:bold;color:#333;" id="analytics-ai-decisions">0</div>
                  <div style="font-size:11px;color:#666;">AI Decisions</div>
                </div>
                <div style="padding:0.8vh;background:white;border-radius:0.4vh;box-shadow:0 0.1vh 0.3vh rgba(0,0,0,0.1);">
                  <div style="font-size:18px;font-weight:bold;color:#333;" id="analytics-unique-players">0</div>
                  <div style="font-size:11px;color:#666;">Players</div>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Performance Insights</label>
            <div id="settings-analytics-performance" style="margin-top:8px;max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;background:#f9f9f9;padding:12px;">
              <div style="text-align:center;color:#666;font-size:12px;padding:20px;">
                Game performance data will appear here after games are played...
              </div>
            </div>
          </div>

          <div class="field" style="margin-top:16px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <button type="button" id="settings-refresh-analytics" class="btn btn-secondary">
                🔄 Refresh Analytics
              </button>
              <button type="button" id="settings-export-analytics" class="btn btn-secondary">
                📤 Export Data
              </button>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">🧠 AI Decision Analysis</h3>
          <p style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:16px;">
            Live AI decision tree with reasoning patterns and strategic insights.
          </p>
          
          <div class="field">
            <label class="field-label">Decision Tree Viewer</label>
            <div id="settings-ai-tree-embedded" class="ai-decision-tree-embedded" style="margin-top:8px;height:400px;border:1px solid #ddd;border-radius:4px;background:#f9f9f9;overflow:hidden;">
              <div style="padding:20px;text-align:center;color:#666;font-size:12px;">
                Loading AI Decision Tree...
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field-label">AI Analysis Tools</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
              <button type="button" id="settings-ai-modal" class="btn btn-secondary">
                🧠 Open Full Tree Modal
              </button>
              <button type="button" id="settings-ai-export" class="btn btn-secondary">
                📤 Export AI Data
              </button>
              <button type="button" id="settings-ai-clear" class="btn btn-secondary">
                🗑 Clear Tree
              </button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">AI Capture Settings</label>
            <div style="margin-top:8px;">
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="enableDecisionTreeCapture" />
                <span class="checkbox-label">Enable AI Decision Tree Capture</span>
              </label>
              <div style="font-size:11px;opacity:.6;margin-top:4px;">
                Captures detailed AI reasoning for analysis (may impact performance)
              </div>
            </div>
          </div>
        </div>

        <div class="section" style="margin-top:20px;">
          <h3 class="section-title">🎲 Player Win Odds</h3>
          <div class="field" style="margin-top:6px;">
            <div style="font-size:11px;opacity:.65;margin-bottom:6px;line-height:1.4;">Heuristic distribution (VP, health, energy, Tokyo control, momentum).</div>
            <div id="dev-win-odds-panel" style="background:#101317;border:1px solid #222;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;position:relative;z-index:6905;">
              <div class="win-odds-header" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #1e242b;background:linear-gradient(90deg,#13181f,#181f27);">
                  <button type="button" id="dev-win-odds-mode" title="Cycle view (V)" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:none;border:none;color:#cbd5e1;font-size:14px;border-radius:0;line-height:1;cursor:pointer;box-shadow:none;"></button>
                  <div style="flex:1;text-align:center;font-size:26px;font-weight:800;letter-spacing:2px;color:#e2e8f0;font-family:'Bangers',cursive;text-shadow:0 3px 6px #000,2px 2px 0 #000;">PLAYER WIN ODDS</div>
                  <button type="button" id="dev-win-odds-refresh" title="Refresh now (R)" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:none;border:none;color:#cbd5e1;font-size:12px;border-radius:0;line-height:1;cursor:pointer;box-shadow:none;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path></svg>
                </button>
              </div>
              <div class="win-odds-body" id="dev-win-odds-chart" style="padding:8px 10px;display:flex;flex-direction:column;gap:8px;min-height:150px;height:200px;overflow:hidden;">
                <div style="font-size:11px;opacity:.5;">Waiting for data...</div>
              </div>
              <div class="win-odds-footer" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-top:1px solid #1e242b;background:#13181f;">
                <label style="font-size:10px;display:flex;align-items:center;gap:4px;margin:0;white-space:nowrap;">
                  <input type="checkbox" id="dev-win-odds-auto" checked /> Auto
                </label>
                <div id="dev-win-odds-trend" style="flex:1;font-size:9px;opacity:.6;line-height:1.3;text-align:center;">–</div>
                <button type="button" id="dev-win-odds-clear" title="Clear history" style="background:none;border:none;color:#cbd5e1;padding:3px 6px;font-size:10px;border-radius:4px;line-height:1;cursor:pointer;">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dev Tools Tab -->
      <div class="tab-content" data-tab-content="devtools" style="display:none;">
        <div class="section" style="max-height:60vh;overflow:auto;">
          <h3 class="section-title">🛠 Developer Tools</h3>
          <p style="font-size:13px;opacity:.75;padding-bottom:12px;">Utilities for debugging & rapid iteration. Toggle floating panel or use in-modal actions.</p>
          
          <div class="field">
            <label class="field-label">Options</label>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;">
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="enableFloatingDevPanel" />
                <span class="checkbox-label">Enable Floating Dev Panel</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="enableDecisionTreeCapture" />
                <span class="checkbox-label">Capture AI Decision Data</span>
              </label>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Debug Logging</label>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;">
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="logComponentUpdates" />
                <span class="checkbox-label">Component Updates</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="logCPUDecisions" />
                <span class="checkbox-label">CPU/AI Decisions</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="logStoreUpdates" />
                <span class="checkbox-label">Store Updates</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="logSubscriptions" />
                <span class="checkbox-label">Subscriptions</span>
              </label>
              <label class="field-checkbox" style="margin:0;">
                <input type="checkbox" name="logModals" />
                <span class="checkbox-label">Modal Lifecycle</span>
              </label>
            </div>
            <div class="field-help">Enable verbose console logging for debugging. Changes apply immediately via Save Settings button.</div>
          </div>

          <div class="field">
            <label class="field-label">UI Actions</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
              <button type="button" class="btn btn-sm" data-dev-reset-positions>Reset Positions</button>
              <button type="button" class="btn btn-sm" data-dev-log-positions>Log Positions</button>
              <button type="button" class="btn btn-sm" data-dev-log-dice>Log Dice</button>
              <button type="button" class="btn btn-sm" data-dev-log-effects>Log Effects</button>
            </div>
            <div class="field-help">One-time actions for debugging (immediate effect, not saved).</div>
          </div>

          <!-- Game Log in Dev Tools -->
          <div class="field" style="margin-top:18px;">
            <label class="field-label">📜 Game Log</label>
            <div class="unified-modal-form" style="margin-top:8px;">
              <!-- Filter Controls -->
              <div class="filter-controls">
                <div class="filter-group">
                  <label>Show:</label>
                  <select name="devLogFilter" class="field-input" style="min-width: 120px;">
                    <option value="all">All Events</option>
                    <option value="dice">Dice Rolls</option>
                    <option value="combat">Combat</option>
                    <option value="cards">Power Cards</option>
                    <option value="phase">Phase Changes</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label>Player:</label>
                  <select name="devPlayerFilter" class="field-input" style="min-width: 100px;">
                    <option value="all">All Players</option>
                  </select>
                </div>
                <div class="filter-group">
                  <button type="button" class="field-input" id="dev-clear-log-btn" style="cursor:pointer;padding:4px 8px;font-size:0.75rem;white-space:nowrap;border:1px solid #1e242b;">Clear Log</button>
                  <button type="button" class="field-input" id="dev-export-log-btn" style="cursor:pointer;padding:4px 8px;font-size:0.75rem;white-space:nowrap;border:1px solid #1e242b;">Export</button>
                </div>
                <div class="filter-group">
                  <label class="field-checkbox" style="margin: 0;">
                    <span class="checkbox-label">Auto-scroll</span>
                    <input type="checkbox" name="devAutoScroll" checked>
                  </label>
                </div>
              </div>

              <!-- Game Log Content -->
              <div class="modal-content-scrollable" id="dev-game-log-content" style="max-height:300px;background:#101317;border:1px solid #222;border-radius:8px;padding:8px;">
                <div class="log-loading" style="text-align: center; color: #999; font-style: italic;">
                  📜 Loading game log...
                </div>
              </div>
              
              <div style="font-size:11px;opacity:.6;margin-top:12px;font-style:italic;">
                Some actions require #dev hash for full detail. Archive actions store snapshots in localStorage.
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </form>

    <!-- Save Bar - Fixed at bottom -->
    <div class="modal-actions" style="position:sticky;bottom:0;background:#1c1c1c;padding:14px 20px 0 20px;display:flex;justify-content:flex-end;border-top:2px solid #333;box-shadow:0 -4px 8px rgba(0,0,0,0.5);z-index:50;">
      <button type="button" class="btn btn-primary save-btn" style="font-family:'Bangers',cursive;font-size:14px;padding:8px 24px;background:#2a2a2a;color:#e4e4e4;border:2px solid #444;box-shadow:2px 2px 0 #000;margin-bottom:14px;" disabled>Save Settings</button>
    </div>
  `;

  // Handle tab switching
  const tabButtons = content.querySelectorAll('.tab-button');
  const tabContents = content.querySelectorAll('.tab-content');
  const LS_LAST_TAB = 'KOT_SETTINGS_LAST_TAB';
  let scenariosMounted = false;
  function ensureScenariosMounted(){
    if (scenariosMounted) return;
    const host = content.querySelector('[data-scenarios-host]');
    if (!host) return;
    scenariosMounted = true;
    import('../components/scenarios-tab/scenarios-tab.component.js').then(mod => {
      const inst = mod.build({});
      host.innerHTML = '';
      host.appendChild(inst.root);
      try { window.__KOT_NEW__?.store?.subscribe(()=>inst.update()); } catch(_) {}
      // Widen modal for roomy layout
      try { content.closest('.nm-modal').style.maxWidth = '1000px'; } catch(_) {}
    }).catch(err => {
      host.innerHTML = `<em style='color:#a55;'>Failed to load scenarios UI (${err?.message||'error'}).</em>`;
    });
  }
  // Lazy mount AI decision tree inside settings tab
  let aiTreeMounted = false;
  async function ensureAIMounted(){
    if (aiTreeMounted) return;
    const host = content.querySelector('[data-ai-tree-host]');
    if (!host) return;
    aiTreeMounted = true;
    try {
      const mod = await import('../components/ai-decision-tree/ai-decision-tree.component.js');
      const inst = mod.buildAIDecisionTree();
      host.innerHTML='';
      host.appendChild(inst.root);
    } catch(e){
      host.innerHTML = `<div style="color:#c55;font-size:12px;">Failed to load AI Decision Tree: ${e.message}</div>`;
    }
  }

  // Archive / Replay data loaders (lightweight stubs using archiveManagementService & replayService)
  let archivesLoaded = false;
  async function loadArchives(){
    const host = content.querySelector('[data-archives-host]');
    if (!host) return;
    host.innerHTML = '<div style="font-size:11px;opacity:.6;">Loading archives…</div>';
    try {
      const { archiveManager } = await import('../services/archiveManagementService.js');
      const list = archiveManager.getAllArchives();
      if (!list.length){ host.innerHTML = '<div style="font-size:11px;opacity:.5;">No archives found.</div>'; return; }
      host.innerHTML = `<ul style='list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;'>${list.slice(0,100).map(a=>{
        const ts = a.ts||a.timestamp; const d = ts? new Date(ts).toLocaleString():'';
        return `<li style='background:#1c1c1c;padding:6px 8px;border:1px solid #2a2a2a;border-radius:4px;display:flex;flex-direction:column;gap:4px;'>
          <div style='display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;'>
            <span style='font-size:11px;opacity:.85;'>${a.name||a.id||'Archive'} <span style='opacity:.5;'>${a.category||a.type||''}</span></span>
            <span style='font-size:10px;opacity:.5;'>${d}</span>
          </div>
          <div style='display:flex;gap:6px;flex-wrap:wrap;'>
            <button type='button' class='btn btn-secondary' data-archive-replay='${a.id}'>Load & Replay</button>
            <button type='button' class='btn btn-secondary' data-archive-export='${a.id}'>Export</button>
            <button type='button' class='btn btn-secondary' data-archive-delete='${a.id}'>Delete</button>
          </div>
        </li>`;}).join('')}</ul>`;
    } catch(e){
      host.innerHTML = `<div style='color:#c55;font-size:11px;'>Failed to load archives: ${e.message}</div>`;
    }
  }

  // Archive / Replay / AI launcher handlers  
  function attachLauncherHandlers(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-launch-replay-from-archive],[data-show-replay-overlay],[data-launch-ai-modal],[data-export-ai-decisions]');
      if (!btn) return;
      
      try {
        if (btn.hasAttribute('data-launch-replay-from-archive')) {
          const { showArchiveManager } = await import('../ui/components/archiveManagerComponent.js');
          showArchiveManager();
          // Note: User can select archive and start replay from there
        }
        else if (btn.hasAttribute('data-show-replay-overlay')) {
          const { createReplayStateOverlay } = await import('../ui/components/replayStateOverlay.js');
          const overlay = createReplayStateOverlay();
          overlay.show();
        }
        else if (btn.hasAttribute('data-launch-ai-modal')) {
          // Use existing AI modal from new-modals.js
          const aiModal = createAIDecisionModal();
          newModalSystem.showModal('aiDecision');
        }
        else if (btn.hasAttribute('data-export-ai-decisions')) {
          const { getAIDecisionTree } = await import('../services/aiDecisionService.js');
          const tree = getAIDecisionTree();
          const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ai-decisions-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
      } catch (err) {
        console.warn('[Settings] Failed to launch component:', err);
        inlineSettingsError('Failed: ' + (err?.message || err));
      }
    });
  }
  attachLauncherHandlers();

  // Handlers for embedded archive and analytics content
  function attachEmbeddedHandlers() {
    // Archive search and refresh
    const archiveSearch = content.querySelector('#settings-archive-search');
    const archiveFilter = content.querySelector('#settings-archive-filter');
    const archiveRefresh = content.querySelector('#settings-archive-refresh');
    const archiveList = content.querySelector('#settings-archive-list');
    
    if (archiveRefresh) {
      archiveRefresh.addEventListener('click', async () => {
        try {
          archiveList.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-size:12px;">Loading archives...</div>';
          
          const { archiveManager } = await import('../services/archiveManagementService.js');
          const archives = archiveManager.getAllArchives();
          
          if (!archives.length) {
            archiveList.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-size:12px;">No archives found.</div>';
            return;
          }
          
          archiveList.innerHTML = archives.slice(0, 20).map(archive => `
            <div style="padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:12px;font-weight:bold;">${archive.name || archive.id || 'Archive'}</div>
                <div style="font-size:11px;color:#666;">${archive.type || 'Unknown'} • ${new Date(archive.timestamp).toLocaleDateString()}</div>
              </div>
              <div style="display:flex;gap:4px;">
                <button onclick="window.openArchive?.('${archive.id}')" style="padding:4px 8px;font-size:10px;border:1px solid #ddd;border-radius:3px;background:white;cursor:pointer;">View</button>
                <button onclick="window.deleteArchive?.('${archive.id}')" style="padding:4px 8px;font-size:10px;border:1px solid #ddd;border-radius:3px;background:#fee;cursor:pointer;">Delete</button>
              </div>
            </div>
          `).join('');
        } catch (error) {
          archiveList.innerHTML = `<div style="padding:20px;text-align:center;color:#c55;font-size:12px;">Error loading archives: ${error.message}</div>`;
        }
      });
    }
    
    // Analytics refresh and export
    const analyticsRefresh = content.querySelector('#settings-refresh-analytics');
    const analyticsExport = content.querySelector('#settings-export-analytics');
    
    if (analyticsRefresh) {
      analyticsRefresh.addEventListener('click', async () => {
        try {
          // Update analytics overview
          content.querySelector('#analytics-total-games').textContent = '0';
          content.querySelector('#analytics-avg-duration').textContent = '0min';
          content.querySelector('#analytics-ai-decisions').textContent = '0';
          content.querySelector('#analytics-unique-players').textContent = '0';
          
          // Show placeholder message
          const performanceDiv = content.querySelector('#settings-analytics-performance');
          performanceDiv.innerHTML = '<div style="text-align:center;color:#666;font-size:12px;padding:20px;">Analytics functionality is being refactored. Enhanced analytics will be available soon!</div>';
        } catch (error) {
          console.warn('[Settings] Analytics refresh error:', error);
        }
      });
    }
    
    // AI Decision Tree handlers
    const aiModal = content.querySelector('#settings-ai-modal');
    const aiExport = content.querySelector('#settings-ai-export');
    const aiClear = content.querySelector('#settings-ai-clear');
    const aiTreeEmbedded = content.querySelector('#settings-ai-tree-embedded');
    
    // Load embedded AI decision tree
    let embeddedTreeLoaded = false;
    async function loadEmbeddedAITree() {
      if (embeddedTreeLoaded || !aiTreeEmbedded) return;
      embeddedTreeLoaded = true;
      
      try {
        const mod = await import('../components/ai-decision-tree/ai-decision-tree.component.js');
        const { root, dispose } = mod.buildAIDecisionTree();
        
        // Style the embedded tree differently (more compact)
        root.style.height = '100%';
        root.style.fontSize = '11px';
        
        aiTreeEmbedded.innerHTML = '';
        aiTreeEmbedded.appendChild(root);
        aiTreeEmbedded._treeDispose = dispose;
      } catch (error) {
        aiTreeEmbedded.innerHTML = `<div style="padding:20px;text-align:center;color:#c55;font-size:12px;">Error loading AI Decision Tree: ${error.message}</div>`;
      }
    }
    
    if (aiModal) {
      aiModal.addEventListener('click', () => {
        // Open the full modal version
        createAIDecisionModal();
        newModalSystem.showModal('aiDecision');
      });
    }
    
    if (aiClear) {
      aiClear.addEventListener('click', () => {
        if (aiTreeEmbedded._treeDispose) {
          aiTreeEmbedded._treeDispose();
        }
        embeddedTreeLoaded = false;
        aiTreeEmbedded.innerHTML = '<div style="padding:20px;text-align:center;color:#666;font-size:12px;">AI decision tree cleared.</div>';
      });
    }
    
    // Load embedded tree when Analytics & Insights tab is activated
    function loadTreeOnTabActivation() {
      const aiTab = content.querySelector('[data-tab="ai"]');
      if (aiTab && aiTab.classList.contains('active')) {
        loadEmbeddedAITree();
      }
    }
    
    // Hook into tab switching to load tree when needed
    content.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab="ai"]');
      if (tabBtn) {
        setTimeout(loadTreeOnTabActivation, 100);
      }
    });
    
    // Load initial data
    if (archiveRefresh) archiveRefresh.click();
    if (analyticsRefresh) analyticsRefresh.click();
  }
  attachEmbeddedHandlers();

  // Provide a small inline error area within archives tab (non-intrusive)
  function inlineSettingsError(msg){
    try {
      const tab = content.querySelector('[data-tab-content="archives"] .section');
      if (!tab) return;
      let area = tab.querySelector('.archives-inline-error');
      if (!area){
        area = document.createElement('div');
        area.className = 'archives-inline-error';
        area.style.cssText = 'margin-top:8px;font-size:11px;color:#ff7675;background:#2a1111;padding:6px 8px;border:1px solid #922;border-radius:4px;display:flex;gap:8px;align-items:center;';
        tab.appendChild(area);
      }
      area.textContent = msg;
      setTimeout(()=>{ if(area && area.parentNode) area.parentNode.removeChild(area); }, 6000);
    } catch(_){ /* ignore */ }
  }

  // Pre-warm archive manager module after first tab activation to reduce click latency
  let archiveModulePreloadStarted = false;
  function maybePrewarmArchiveModule(){
    if (archiveModulePreloadStarted) return;
    archiveModulePreloadStarted = true;
    import('../ui/components/archiveManagerComponent.js')
      .then((m)=> { if (window.__KOT_DEBUG_ARCHIVES) console.log('[Settings][Prewarm] Archive Manager module preloaded'); })
      .catch(e=> { if (window.__KOT_DEBUG_ARCHIVES) console.warn('[Settings][Prewarm] Archive Manager preload failed', e); });
  }

  // NOTE: activateTab wrapper moved to after function definition to avoid hoisting issues

  // Replay controls referencing active replay (simplified)
  function attachReplayControls(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-replay-pause],[data-replay-resume],[data-replay-stop]');
      if (!btn) return;
      // Note: These are now handled by the full replay overlay
      // This is kept for any basic controls if needed
    });
  }
  attachReplayControls();

  // Dev tools actions inside tab
  function attachDevToolsActions(){
    content.addEventListener('click', async (e)=>{
      const btn = e.target.closest('[data-dev-reset-positions],[data-dev-log-positions],[data-dev-log-dice],[data-dev-log-effects],[data-dev-archive-game],[data-dev-archive-ai]');
      if (!btn) return;
      const store = window.__KOT_NEW__?.store;
      if (!store) return;
      const { eventBus } = await import('../core/eventBus.js');
      if (btn.hasAttribute('data-dev-reset-positions')) eventBus.emit('ui/positions/reset');
      else if (btn.hasAttribute('data-dev-log-positions')) console.log('UI Positions', store.getState().ui.positions);
      else if (btn.hasAttribute('data-dev-log-dice')) {
        const st = store.getState();
        const order = st.players.order; let activeMods={};
        if (order.length){ const activeId = order[st.meta.activePlayerIndex % order.length]; activeMods = st.players.byId[activeId]?.modifiers||{}; }
        console.log('Dice State', st.dice, 'Active Player Mods', activeMods);
      }
      else if (btn.hasAttribute('data-dev-log-effects')) console.log('Effect Queue', store.getState().effectQueue);
      else if (btn.hasAttribute('data-dev-archive-game')) { const { archiveGameLog } = await import('../services/logArchiveService.js'); archiveGameLog(store,'Manual Snapshot'); }
      else if (btn.hasAttribute('data-dev-archive-ai')) { const { archiveAIDT } = await import('../services/logArchiveService.js'); archiveAIDT(store,'Manual Snapshot'); }
    });
  }
  attachDevToolsActions();

  // --- Win Odds Diagnostics -----------------------------------------------------------
  // Use global winOdds object
  const winOdds = window.__KOT_WIN_ODDS__.obj;

  function adaptSnapshotOdds(snapshotOdds){
    // Backward compatibility if older numeric entries exist
    Object.keys(snapshotOdds).forEach(id => {
      const val = snapshotOdds[id];
      if (typeof val === 'number') snapshotOdds[id] = { percent: val, parts: { vp:0,health:0,energy:0,tokyo:0,momentum:0 } };
    });
    return snapshotOdds;
  }

  function renderWinOdds(useLast = false) {
    const chart = content.querySelector('#dev-win-odds-chart');
    if (!chart) return;
    const trendDiv = content.querySelector('#dev-win-odds-trend');
    const state = window.__KOT_NEW__?.store?.getState?.();
    if (!state) { chart.innerHTML = '<div style="font-size:11px;opacity:.5;">No state</div>'; return; }
    let odds;
    if (useLast && winOdds.history.length) {
      odds = adaptSnapshotOdds(JSON.parse(JSON.stringify(winOdds.history[winOdds.history.length-1].odds)));
    } else {
      odds = winOdds.compute(state);
      if (!Object.keys(odds).length) { chart.innerHTML = '<div style="font-size:11px;opacity:.45;">No active players</div>'; return; }
      winOdds.push(odds);
    }
    const latestHist = winOdds.history;
    const prev = latestHist.length > 1 ? adaptSnapshotOdds(JSON.parse(JSON.stringify(latestHist[latestHist.length-2].odds))) : {};
    // Build rows
    const players = state.players.order.map(id => state.players.byId[id]).filter(p => !p.eliminated && !p.isEliminated);
    // Sparkline prep
    const SPARK_N = 12;
    const recent = winOdds.history.slice(-SPARK_N).map(h => adaptSnapshotOdds(h.odds));
    const sparkData = {};
    players.forEach(p => { sparkData[p.id] = recent.map(r => (r[p.id]?.percent) || 0); });
    let bodyHtml = '';
  const modeLabelEl = null; // label removed per simplification
    // Player color mapping - prefer monster theme by name, fallback palette
    const baseColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#14b8a6','#ec4899'];
    function monsterColor(p, idx){
      const name = (p.monster || p.monsterName || p.character || p.name || '').toLowerCase();
      const map = {
  // Alienoid distinct teal (adjusted to avoid collision with Space Penguin light blue)
  'alienoid':'#1496b4',
        'cyber bunny':'#f472b6',
        'cyber kitty':'#ec4899',
        'gigazaur':'#22c55e',
        'kraken':'#3b82f6',
        'meka dragon':'#a3a3a3',
        'space penguin':'#38bdf8',
        'the king':'#f59e0b',
        'king':'#f59e0b'
      };
      for (const k in map){ if (name.includes(k)) return map[k]; }
      return baseColors[idx % baseColors.length];
    }
    function rowCommon(p) {
      const pct = odds[p.id]?.percent || 0;
      const prevPct = prev[p.id]?.percent;
      const delta = winOdds.trend(prevPct, pct);
      const arrow = delta > 0 ? `<span style='color:#4ade80;font-weight:bold;'>▲</span>` : (delta < 0 ? `<span style='color:#f87171;font-weight:bold;'>▼</span>` : '');
      const deltaStr = prevPct != null ? ((delta>0?'+':'') + delta.toFixed(1)+'%') : '';
      const parts = odds[p.id]?.parts || { vp:0,health:0,energy:0,tokyo:0,momentum:0 };
      const partSum = Object.values(parts).reduce((a,b)=>a+b,0) || 1;
      const breakdown = Object.entries(parts).map(([k,v]) => `${k}:${(v/partSum*100).toFixed(0)}%`).join(' ');
      const tooltip = `title="${breakdown}"`;
      const sVals = sparkData[p.id];
      const maxS = Math.max(1, ...sVals);
      const spark = `<span style='display:inline-flex;align-items:flex-end;gap:1px;height:12px;'>${sVals.map(v=>`<i style='display:block;width:3px;height:${Math.max(2,Math.round(v/maxS*12))}px;background:${v===sVals[sVals.length-1]?'#818cf8':'#4f46e5'};opacity:${0.35+(v/maxS*0.65)}'></i>`).join('')}</span>`;
      return { pct, prevPct, delta, arrow, deltaStr, tooltip, spark };
    }
  if (winOdds.mode === 'bars') {
      bodyHtml = players.map((p,idx) => {
        const { pct, arrow, deltaStr, tooltip, spark } = rowCommon(p);
        const barW = Math.max(2, Math.min(100, pct)).toFixed(1);
        const c = monsterColor(p, idx);
        const grad = `linear-gradient(90deg, ${c}, ${c}cc)`;
        return `<div style='display:flex;flex-direction:column;gap:4px;'>
          <div style='display:flex;justify-content:space-between;align-items:center;font-size:11px;'>
            <span style='display:flex;align-items:center;gap:6px;' ${tooltip}>${arrow}<i style='width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;display:inline-block;'></i><strong style='letter-spacing:.5px;'>${p.name||p.id}</strong> ${spark}</span>
            <span style='font-variant-numeric:tabular-nums;' ${tooltip}>${pct.toFixed(1)}% <span style='opacity:.55;'>${deltaStr}</span></span>
          </div>
          <div style='background:#1d232c;border:1px solid #2c3440;border-radius:4px;height:10px;position:relative;overflow:hidden;'>
            <div style='position:absolute;left:0;top:0;bottom:0;width:${barW}%;background:${grad};box-shadow:0 0 6px ${c}66;transition:width .4s ease;'></div>
          </div>
        </div>`;
      }).join('');
    } else if (winOdds.mode === 'table') {
      bodyHtml = `<table style='width:100%;border-collapse:collapse;font-size:11px;'>
        <thead><tr style='text-align:left;'>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Player</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Odds %</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Δ</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Trend</th>
        </tr></thead>
        <tbody>
        ${players.map((p,idx) => { const { pct, arrow, deltaStr, tooltip, spark } = rowCommon(p); const c = monsterColor(p, idx); return `<tr>
          <td style='padding:4px 6px;' ${tooltip}><span style='display:inline-flex;align-items:center;gap:6px;'><i style="width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;display:inline-block;"></i>${p.name||p.id}</span></td>
          <td style='padding:4px 6px;font-variant-numeric:tabular-nums;' ${tooltip}>${pct.toFixed(1)}%</td>
          <td style='padding:4px 6px;'>${arrow} <span style='opacity:.65;'>${deltaStr}</span></td>
          <td style='padding:4px 6px;'>${spark}</td>
        </tr>`; }).join('')}
        </tbody></table>`;
    } else if (winOdds.mode === 'compact') {
      bodyHtml = `<div style='display:flex;flex-wrap:wrap;gap:10px;font-size:11px;'>${players.map((p,idx) => { const { pct, arrow, tooltip } = rowCommon(p); const c = monsterColor(p, idx); return `<span style='display:inline-flex;align-items:center;gap:6px;padding:4px 6px;background:#1d232c;border:1px solid #2c3440;border-radius:4px;' ${tooltip}>${arrow}<i style='width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;'></i><strong>${p.name||p.id}</strong> ${pct.toFixed(1)}%</span>`; }).join('')}</div>`;
    } else if (winOdds.mode === 'stacked') {
      const segs = players.map((p,idx) => { const { pct, tooltip } = rowCommon(p); const w = pct.toFixed(2); const c = monsterColor(p, idx); return `<div ${tooltip} style='flex:0 0 ${w}%;background:linear-gradient(135deg,${c},${c}cc 60%);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;position:relative;'>
          <span style='pointer-events:none;text-shadow:0 1px 2px #000;font-weight:600;'>${p.name||p.id} ${pct.toFixed(1)}%</span>
        </div>`; }).join('');
      bodyHtml = `<div style='display:flex;width:100%;height:42px;border:1px solid #2c3440;border-radius:6px;overflow:hidden;'>${segs}</div>`;
    } else if (winOdds.mode === 'monitor') {
  // Simple uniform grid (original sizing) – no major/minor emphasis
  const CELL = 30;
  const COLS = 10;
  const ROWS = 4;
  const W = CELL * COLS;
  const H = CELL * ROWS;
      const MAX_POINTS = 40;
      const hist = winOdds.history.slice(-MAX_POINTS);
      const gridLines = [];
  for (let y=0;y<=ROWS;y++){ const gy = (H - (y/ROWS)*H).toFixed(2); gridLines.push(`<line x1='0' y1='${gy}' x2='${W}' y2='${gy}' stroke='rgba(255,255,255,.07)' stroke-width='1' />`); }
  for (let x=0;x<=COLS;x++){ const gx = (x/COLS)*W; gridLines.push(`<line x1='${gx}' y1='0' x2='${gx}' y2='${H}' stroke='rgba(255,255,255,.05)' stroke-width='1' />`); }
      const paths = players.map((p,idx)=>{
        const c = monsterColor(p, idx);
        let d='';
        hist.forEach((h,i)=>{
          const po = adaptSnapshotOdds(h.odds);
          const v = po[p.id]?.percent ?? 0;
          const x = (i/(hist.length-1||1))*W;
          const y = H - (v/100)*H;
          d += (i===0?`M ${x.toFixed(2)} ${y.toFixed(2)}`:` L ${x.toFixed(2)} ${y.toFixed(2)}`);
        });
        return `<path d='${d}' fill='none' stroke='${c}' stroke-width='2' vector-effect='non-scaling-stroke' stroke-linejoin='round' stroke-linecap='round' />`;
      }).join('');
      const legend = players.map((p,idx)=>{ const c = monsterColor(p, idx); const cur = odds[p.id]?.percent||0; return `<span style='display:inline-flex;align-items:center;gap:4px;font-size:10px;'>
        <i style='width:10px;height:10px;border-radius:2px;background:${c};box-shadow:0 0 6px ${c}aa;'></i>${p.name||p.id} ${cur.toFixed(1)}%
      </span>`; }).join('<span style="opacity:.3;">|</span>');
      bodyHtml = `<div style='display:flex;flex-direction:column;gap:6px;'>
        <div style='background:#000;border:1px solid #222;border-radius:6px;padding:6px;position:relative;'>
          <svg viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid meet' style='width:100%;aspect-ratio:${W}/${H};display:block;background:#000;'>
            <g>${gridLines.join('')}</g>
            <g>${paths}</g>
          </svg>
        </div>
        <div style='display:flex;flex-wrap:wrap;gap:10px;justify-content:center;'>${legend}</div>
      </div>`;
    }
    chart.innerHTML = bodyHtml;
  // mode label removed
    // Render compact trend summary
    if (trendDiv) {
      const summary = players.map(p => {
        const pct = odds[p.id]?.percent||0;
        return `${p.name||p.id}: ${pct.toFixed(1)}%`;
      }).join(' • ');
      trendDiv.innerHTML = summary;
    }
  }

  // Update the render function in the global object
  window.__KOT_WIN_ODDS__.render = renderWinOdds;

  function setupWinOddsHandlers(){
    const autoCb = content.querySelector('#dev-win-odds-auto');
    const refreshBtn = content.querySelector('#dev-win-odds-refresh');
    const clearBtn = content.querySelector('#dev-win-odds-clear');
    const modeBtn = content.querySelector('#dev-win-odds-mode');
    if (!autoCb || !refreshBtn || !clearBtn) return;
    refreshBtn.addEventListener('click', ()=>renderWinOdds());
    clearBtn.addEventListener('click', ()=>{ winOdds.history.length=0; renderWinOdds(); });
    if (modeBtn) {
      const modes = ['bars','table','compact','stacked','monitor'];
      const icons = {
        bars: `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><rect x='4' y='10' width='3' height='10' fill='currentColor'/><rect x='10.5' y='6' width='3' height='14' fill='currentColor'/><rect x='17' y='3' width='3' height='17' fill='currentColor'/></svg>` ,
        table: `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><rect x='3' y='4' width='18' height='4' fill='currentColor'/><rect x='3' y='10' width='18' height='4' fill='currentColor'/><rect x='3' y='16' width='18' height='4' fill='currentColor'/></svg>`,
        compact: `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><rect x='4' y='5' width='16' height='3' fill='currentColor'/><rect x='4' y='10.5' width='10' height='3' fill='currentColor'/><rect x='4' y='16' width='14' height='3' fill='currentColor'/></svg>`,
        stacked: `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><rect x='3' y='5' width='18' height='2.5' fill='currentColor'/><rect x='3' y='10.5' width='15' height='2.5' fill='currentColor'/><rect x='3' y='16' width='12' height='2.5' fill='currentColor'/></svg>`,
        monitor: `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><path d='M4 5h16v10H4z' stroke='currentColor' stroke-width='2' fill='none'/><path d='M6 13l3-4 3 2 2-3 4 5' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/><rect x='9' y='17' width='6' height='2' fill='currentColor'/></svg>`
      };
      function updateModeIcon(){
        modeBtn.innerHTML = icons[winOdds.mode] || icons.bars;
      }
      updateModeIcon();
      modeBtn.addEventListener('click', () => {
        const curIdx = modes.indexOf(winOdds.mode);
        winOdds.mode = modes[(curIdx + 1) % modes.length];
        try { localStorage.setItem('KOT_DEV_WIN_ODDS_MODE', winOdds.mode); } catch(_) {}
        updateModeIcon();
        renderWinOdds(true);
      });
  // mode label removed
    }
    // Subscribe to store changes for auto mode
    const store = window.__KOT_NEW__?.store;
    if (store) {
      store.subscribe(()=>{ if (autoCb.checked) renderWinOdds(); });
    }
    // Initial render if tab already active
    if (content.querySelector('[data-tab-content="devtools"]').classList.contains('active')) {
      setTimeout(renderWinOdds, 50);
    }
    // Hook into tab activation
    content.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-button[data-tab="devtools"]');
      if (btn) setTimeout(renderWinOdds, 120);
    });
  }
  setupWinOddsHandlers();
  
  // --- Dev Tools Game Log -------------------------------------------------------------
  function setupDevGameLog() {
    const updateDevLogContent = () => {
      const logContainer = content.querySelector('#dev-game-log-content');
      if (!logContainer) return;
      const logFilter = content.querySelector('select[name="devLogFilter"]')?.value || 'all';
      const playerFilter = content.querySelector('select[name="devPlayerFilter"]')?.value || 'all';
      
      if (window.__KOT_NEW__?.store) {
        const state = window.__KOT_NEW__.store.getState();
        const logEntries = state.log?.entries || [];
        
        if (logEntries.length === 0) {
          logContainer.innerHTML = '<div style="text-align: center; color: #999; font-style: italic; padding: 20px;">📋 No game events recorded yet.<br>Start playing to see the action log!</div>';
          return;
        }

        // Filter entries
        let filteredEntries = logEntries;
        if (logFilter !== 'all') {
          filteredEntries = logEntries.filter(entry => {
            const msg = (entry.message || entry.text || '').toLowerCase();
            switch (logFilter) {
              case 'dice': return msg.includes('roll') || msg.includes('dice') || msg.includes('keep');
              case 'combat': return msg.includes('attack') || msg.includes('damage') || msg.includes('heal');
              case 'cards': return msg.includes('card') || msg.includes('buy') || msg.includes('energy');
              case 'phase': return msg.includes('phase') || msg.includes('turn') || msg.includes('round');
              default: return true;
            }
          });
        }

        if (playerFilter !== 'all') {
          filteredEntries = filteredEntries.filter(entry => 
            (entry.playerId === playerFilter) || (entry.message || '').includes(playerFilter)
          );
        }

        // Render filtered entries
        logContainer.innerHTML = filteredEntries.length === 0 
          ? '<div style="text-align: center; color: #999; font-style: italic; padding: 20px;">No entries match current filters</div>'
          : filteredEntries.map(entry => {
              const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
              const message = entry.message || entry.text || JSON.stringify(entry);
              const msg = message.toLowerCase();
              const type = msg.includes('error') || msg.includes('failed') ? 'error' :
                          msg.includes('attack') || msg.includes('damage') ? 'warning' :
                          msg.includes('heal') || msg.includes('win') ? 'success' : 'info';
              const icon = type === 'error' ? '❌' : type === 'warning' ? '⚔️' : type === 'success' ? '✅' : type === 'info' ? '🎲' : '📝';
              
              return `
                <div style="padding: 6px 0; border-bottom: 1px solid #222; font-family: monospace; font-size: 0.8rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; color: #e4e4e4; line-height: 1.3;">
                      <span style="margin-right: 6px; font-size: 0.65rem;">${icon}</span>
                      ${message}
                    </div>
                    ${timestamp ? `<div style="color: #666; font-size: 0.7rem; white-space: nowrap;">${timestamp}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('');

        // Auto-scroll to bottom if enabled
        const autoScrollCb = content.querySelector('input[name="devAutoScroll"]');
        if (autoScrollCb?.checked) {
          logContainer.scrollTop = logContainer.scrollHeight;
        }
      }
    };

    // Filter change handlers
    const logFilterSelect = content.querySelector('select[name="devLogFilter"]');
    const playerFilterSelect = content.querySelector('select[name="devPlayerFilter"]');
    if (logFilterSelect) logFilterSelect.addEventListener('change', updateDevLogContent);
    if (playerFilterSelect) playerFilterSelect.addEventListener('change', updateDevLogContent);

    // Populate player filter options
    if (window.__KOT_NEW__?.store) {
      const state = window.__KOT_NEW__.store.getState();
      const playersState = state.players || { order: [], byId: {} };
      
      if (playerFilterSelect) {
        playersState.order.forEach(playerId => {
          const player = playersState.byId[playerId];
          if (player) {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name || `Player ${player.id}`;
            playerFilterSelect.appendChild(option);
          }
        });
      }
    }

    // Clear log button
    const clearBtn = content.querySelector('#dev-clear-log-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm('Clear the entire game log? This cannot be undone.')) {
          try {
            if (window.__KOT_NEW__?.store) {
              const { logCleared } = await import('../core/actions.js');
              window.__KOT_NEW__.store.dispatch(logCleared());
              updateDevLogContent();
            }
          } catch (e) {
            console.error('Failed to clear log:', e);
          }
        }
      });
    }

    // Export log button
    const exportBtn = content.querySelector('#dev-export-log-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (window.__KOT_NEW__?.store) {
          const state = window.__KOT_NEW__.store.getState();
          const logEntries = state.log?.entries || [];
          const logText = logEntries.map(entry => 
            `[${entry.timestamp || 'Unknown'}] ${entry.message || entry.text || JSON.stringify(entry)}`
          ).join('\n');
          
          const blob = new Blob([logText], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `kingoftokyo-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }

    // Subscribe to store changes for auto-update
    const store = window.__KOT_NEW__?.store;
    if (store) {
      store.subscribe(updateDevLogContent);
    }

    // Initial load
    updateDevLogContent();
    
    // Hook into tab activation
    content.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-button[data-tab="devtools"]');
      if (btn) setTimeout(updateDevLogContent, 120);
    });
  }
  setupDevGameLog();
  
  // mini modal logic relocated to global function below
  // Initialize debug console capture (after DOM content injected)
  (function initDebugConsoleCapture(){
    const panel = content.querySelector('#dev-debug-console');
    if (!panel) return;
    const clearBtn = content.querySelector('#dev-debug-clear');
    const pauseBtn = content.querySelector('#dev-debug-pause');
    let paused = false;
    if (clearBtn) clearBtn.addEventListener('click',()=>{ panel.innerHTML=''; });
    if (pauseBtn) pauseBtn.addEventListener('click',()=>{ paused = !paused; pauseBtn.textContent = paused? 'Resume':'Pause'; });
    const originalDebug = console.debug ? console.debug.bind(console) : null;
    console.debug = function(...args){
      if (originalDebug) originalDebug(...args);
      if (paused) return;
      appendRow(args,'debug');
    };
    function appendRow(args, level){
      const row = document.createElement('div');
      row.style.padding='2px 0';
      const ts = new Date().toLocaleTimeString();
      const color = level==='debug'? '#7dd3fc':'#a5b4fc';
      row.innerHTML = `<span style="opacity:.35;color:${color}">[${ts}]</span> ${args.map(a=>format(a)).join(' ')}`;
      panel.appendChild(row);
      panel.scrollTop = panel.scrollHeight;
      if (panel.childNodes.length > 600) panel.removeChild(panel.firstChild);
    }
    function format(a){ if (typeof a==='object'){ try { return `<code>${escapeHtml(JSON.stringify(a))}</code>`; } catch(e){ return '[Object]'; } } return escapeHtml(String(a)); }
    function escapeHtml(str){ return str.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c])); }
  })();
  
  // Accessibility: roving tabindex and arrow key navigation
  tabButtons.forEach((btn,i)=>{ btn.setAttribute('role','tab'); btn.setAttribute('tabindex', i===0? '0':'-1'); });
  tabContents.forEach(tc=> tc.setAttribute('role','tabpanel'));

  function activateTab(button){
    const targetTab = button.getAttribute('data-tab');
    try { localStorage.setItem(LS_LAST_TAB, targetTab); } catch(_) {}
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.style.color = '#999';
      btn.style.borderBottomColor = 'transparent';
      btn.setAttribute('tabindex','-1');
      btn.setAttribute('aria-selected','false');
    });
    button.classList.add('active');
    button.style.color = '#e4e4e4';
    button.style.borderBottomColor = '#6c5ce7';
    button.setAttribute('tabindex','0');
    button.setAttribute('aria-selected','true');
    tabContents.forEach(c => { c.style.display='none'; c.classList.remove('active'); });
    const targetContent = content.querySelector(`[data-tab-content="${targetTab}"]`);
    if (targetContent){ targetContent.style.display = 'block'; targetContent.classList.add('active'); }
    if (targetTab === 'scenarios') ensureScenariosMounted();
    if (targetTab === 'ai') ensureAIMounted();
    if (targetTab === 'archives' && !archivesLoaded){ loadArchives(); archivesLoaded=true; }
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      activateTab(button);
    });
    button.addEventListener('keydown', (e)=>{
      const idx = Array.from(tabButtons).indexOf(button);
      let targetIdx = null;
      if (e.key==='ArrowRight') targetIdx = (idx+1) % tabButtons.length;
      else if (e.key==='ArrowLeft') targetIdx = (idx-1+tabButtons.length) % tabButtons.length;
      else if (e.key==='Home') targetIdx = 0;
      else if (e.key==='End') targetIdx = tabButtons.length-1;
      if (targetIdx!=null){
        e.preventDefault();
        const nextBtn = tabButtons[targetIdx];
        activateTab(nextBtn);
        nextBtn.focus();
      }
    });
  });

  // Restore previously selected tab (if different from default 'gameplay')
  try {
    const last = localStorage.getItem(LS_LAST_TAB);
    if (last && last !== 'gameplay') {
      const btn = content.querySelector(`.tab-button[data-tab="${last}"]`);
      if (btn) btn.click();
    }
  } catch(_) {}

  // Hook into tab activation to prewarm when user first views archives tab
  // (Moved here after activateTab definition to avoid hoisting issues)
  const originalActivateTab = activateTab;
  activateTab = function(button){
    originalActivateTab(button);
    if (button.getAttribute('data-tab') === 'archives') {
      maybePrewarmArchiveModule();
      // One-time deep diagnostics when user first enters archives tab
      if (window.__KOT_DEBUG_ARCHIVES && !window.__KOT_ARCHIVES_DIAG_ONCE__) {
        window.__KOT_ARCHIVES_DIAG_ONCE__ = true;
        console.log('[Settings][ArchivesDiag] First activation of Archives tab – installing MutationObserver');
        try {
          const host = document.querySelector('[data-tab-content="archives"] .section');
          if (host) {
            const mo = new MutationObserver((mutations)=>{
              let relevant = false;
              for (const m of mutations){
                if ([...m.addedNodes].some(n=> n.querySelector?.('#archives-open-manager,#archives-open-analytics')) ||
                    [...m.removedNodes].some(n=> n.querySelector?.('#archives-open-manager,#archives-open-analytics'))) {
                  relevant = true; break;
                }
              }
              if (relevant) {
                console.log('[Settings][ArchivesDiag][MO] Button subtree mutated – re-binding direct handlers');
                try { bindArchiveButtonsDirect(); } catch(_){}
              }
            });
            mo.observe(host, { childList:true, subtree:true });
            window.__KOT_ARCHIVES_MO__ = mo;
          }
        } catch(e){ console.warn('[Settings][ArchivesDiag] Failed to install MutationObserver', e); }
      }
    }
  };

  // Handle form changes
  const form = content.querySelector('.unified-modal-form');
  
  // Update theme preview function
  const updateThemePreview = (theme) => {
    const previewCard = content.querySelector('#theme-preview-card');
    if (!previewCard) return;
    
    // Reset to original styles
    previewCard.style.background = 'linear-gradient(135deg, #2d3436 0%, #1b1f20 78%)';
    previewCard.style.border = '2px solid #222';
    previewCard.style.color = '#ececec';
    previewCard.style.boxShadow = 'none';
    
    const titleEl = previewCard.querySelector('div');
    const costEl = previewCard.querySelector('div:last-child');
    
    if (theme === 'mystical') {
      previewCard.style.background = 'linear-gradient(135deg, #2d1810 0%, #1a0f08 78%)';
      previewCard.style.border = '2px solid #8b4513';
      previewCard.style.color = '#f4e4bc';
      previewCard.style.boxShadow = '2px 2px 0 #654321, 0 0 0 1px #8b4513 inset, 0 0 15px rgba(255, 215, 0, 0.2)';
      if (titleEl) {
        titleEl.style.color = '#ffd700';
        titleEl.style.fontFamily = "'Creepster', cursive";
        titleEl.style.textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 10px rgba(255, 215, 0, 0.5)';
      }
      if (costEl) {
        costEl.style.background = '#4a2c17';
        costEl.style.border = '1px solid #8b4513';
        costEl.style.color = '#ffd700';
      }
    } else if (theme === 'tech') {
      previewCard.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 78%)';
      previewCard.style.border = '2px solid #00ffff';
      previewCard.style.color = '#e0e0e0';
      previewCard.style.boxShadow = '2px 2px 0 #008b8b, 0 0 0 1px #00ffff inset, 0 0 20px rgba(0, 255, 255, 0.2)';
      if (titleEl) {
        titleEl.style.color = '#00ffff';
        titleEl.style.fontFamily = "'Courier New', monospace";
        titleEl.style.textTransform = 'uppercase';
        titleEl.style.textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px rgba(0, 255, 255, 0.8)';
      }
      if (costEl) {
        costEl.style.background = '#001a1a';
        costEl.style.border = '1px solid #00ffff';
        costEl.style.color = '#00ffff';
        costEl.style.fontFamily = "'Courier New', monospace";
      }
    } else {
      // Original theme - reset to defaults (already done above)
      if (titleEl) {
        titleEl.style.fontFamily = "'Bangers', cursive";
        titleEl.style.textTransform = 'none';
      }
      if (costEl) {
        costEl.style.fontFamily = "'Bangers', cursive";
      }
    }
  };
  
  // --- Dirty Tracking & Manual Save Implementation ---
  const saveBtn = content.querySelector('.save-btn');

  function collectSettingsFromForm() {
    const formData = new FormData(form);
    return {
      // Gameplay settings
      cpuSpeed: formData.get('cpuSpeed'),
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]')?.checked || false,
      soundMuted: form.querySelector('input[name="soundMuted"]')?.checked || false,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]')?.checked || false,

      // Interface settings
      playerCardLayoutMode: formData.get('playerCardLayoutMode'),
      actionMenuMode: formData.get('actionMenuMode'),
      mobileMenuCorner: formData.get('mobileMenuCorner'),
      persistPositions: form.querySelector('input[name="persistPositions"]')?.checked || false,

      // Theme settings
      powerCardTheme: formData.get('powerCardTheme'),
      dialogSystem: formData.get('dialogSystem'),

      // Advanced settings
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]')?.checked || false,
      debugMode: form.querySelector('input[name="debugMode"]')?.checked || false,
      showPerformanceMetrics: form.querySelector('input[name="showPerformanceMetrics"]')?.checked || false,
      
      // Dev Tools settings
      enableDecisionTreeCapture: form.querySelector('input[name="enableDecisionTreeCapture"]')?.checked || false,
      enableFloatingDevPanel: form.querySelector('input[name="enableFloatingDevPanel"]')?.checked || false,
      
      // Debug Logging flags
      logComponentUpdates: form.querySelector('input[name="logComponentUpdates"]')?.checked || false,
      logCPUDecisions: form.querySelector('input[name="logCPUDecisions"]')?.checked || false,
      logStoreUpdates: form.querySelector('input[name="logStoreUpdates"]')?.checked || false,
      logSubscriptions: form.querySelector('input[name="logSubscriptions"]')?.checked || false,
      logModals: form.querySelector('input[name="logModals"]')?.checked || false,
      
      // Archive settings
      autoArchiveGameLogs: form.querySelector('input[name="autoArchiveGameLogs"]')?.checked || false,
      autoArchiveAIDTLogs: form.querySelector('input[name="autoArchiveAIDTLogs"]')?.checked || false
    };
  }

  function shallowEqual(a, b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  let baselineSettings = null;

  function establishBaseline() {
    baselineSettings = collectSettingsFromForm();
    if (saveBtn) saveBtn.disabled = true;
  }

  function handlePotentialDirty(e) {
    // Theme preview side-effect (does not persist until save)
    if (e && e.target && e.target.name === 'powerCardTheme') {
      const themeValue = e.target.value;
      updateThemePreview(themeValue);
      // Apply preview to actual panel (visual only before save)
      const powerCardsPanel = document.getElementById('power-cards-panel');
      if (powerCardsPanel) {
        if (themeValue !== 'original') powerCardsPanel.setAttribute('data-theme', themeValue);
        else powerCardsPanel.removeAttribute('data-theme');
      }
    }
    const current = collectSettingsFromForm();
    const dirty = !shallowEqual(current, baselineSettings);
    if (saveBtn) saveBtn.disabled = !dirty;
  }

  form.addEventListener('change', handlePotentialDirty);
  form.addEventListener('input', handlePotentialDirty);

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!baselineSettings) return; // safety
      const newSettings = collectSettingsFromForm();
      const dirty = !shallowEqual(newSettings, baselineSettings);
      if (!dirty) return; // nothing to do
      
      // Build list of changes
      const changes = [];
      for (const key of Object.keys(newSettings)) {
        if (newSettings[key] !== baselineSettings[key]) {
          changes.push({
            setting: key,
            oldValue: baselineSettings[key],
            newValue: newSettings[key]
          });
        }
      }
      
      // Show confirmation modal with changes table
      const confirmContent = document.createElement('div');
      confirmContent.innerHTML = `
        <div style="padding: 16px;">
          <p style="margin-bottom: 16px;">Select which settings to save:</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #333;">
                <th style="padding: 8px; text-align: left; font-family: 'Bangers', cursive;">Setting</th>
                <th style="padding: 8px; text-align: left; font-family: 'Bangers', cursive;">Old Value</th>
                <th style="padding: 8px; text-align: left; font-family: 'Bangers', cursive;">New Value</th>
                <th style="padding: 8px; text-align: center; font-family: 'Bangers', cursive; width: 80px;">Include</th>
              </tr>
            </thead>
            <tbody>
              ${changes.map((change, index) => `
                <tr class="change-row" data-setting="${change.setting}" style="border-bottom: 1px solid #222; transition: opacity 0.2s ease;">
                  <td class="setting-name" style="padding: 8px; font-size: 13px;">${formatSettingName(change.setting)}</td>
                  <td class="old-value" style="padding: 8px; font-size: 13px; color: #f88;">${formatValue(change.oldValue)}</td>
                  <td class="new-value" style="padding: 8px; font-size: 13px; color: #8f8;">${formatValue(change.newValue)}</td>
                  <td style="padding: 8px; text-align: center;">
                    <input type="checkbox" class="change-checkbox" data-setting="${change.setting}" checked style="width: 18px; height: 18px; cursor: pointer;">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display: flex; gap: 12px; justify-content: space-between; align-items: center;">
            <button class="select-all-btn" style="font-family: 'Bangers', cursive; font-size: 12px; padding: 6px 16px; background: #2a2a2a; color: #e4e4e4; border: 2px solid #444; border-radius: 4px; cursor: pointer; box-shadow: 2px 2px 0 #000;">Toggle All</button>
            <div style="display: flex; gap: 12px;">
              <button class="confirm-cancel-btn" style="font-family: 'Bangers', cursive; font-size: 14px; padding: 8px 24px; background: #2a2a2a; color: #e4e4e4; border: 2px solid #444; border-radius: 4px; cursor: pointer; box-shadow: 2px 2px 0 #000;">Cancel</button>
              <button class="confirm-save-btn" style="font-family: 'Bangers', cursive; font-size: 14px; padding: 8px 24px; background: #4a9eff; color: #fff; border: 2px solid #6bb0ff; border-radius: 4px; cursor: pointer; box-shadow: 2px 2px 0 #000;">Save Selected</button>
            </div>
          </div>
        </div>
      `;
      
      // Helper functions for formatting
      function formatSettingName(key) {
        return key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      }
      
      function formatValue(val) {
        if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
        if (val === null || val === undefined) return 'None';
        return String(val);
      }
      
      // Create and show confirmation modal
      const confirmModal = newModalSystem.createModal('settings-confirm', '⚠️ Confirm Settings Changes', confirmContent, { width: '700px' });
      
      const cancelBtn = confirmContent.querySelector('.confirm-cancel-btn');
      const confirmBtn = confirmContent.querySelector('.confirm-save-btn');
      const selectAllBtn = confirmContent.querySelector('.select-all-btn');
      const checkboxes = confirmContent.querySelectorAll('.change-checkbox');
      
      // Add checkbox change listeners for visual feedback
      checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const row = cb.closest('.change-row');
          if (row) {
            if (cb.checked) {
              row.style.opacity = '1';
              row.style.textDecoration = 'none';
            } else {
              row.style.opacity = '0.4';
              row.style.textDecoration = 'line-through';
            }
          }
        });
      });
      
      // Toggle all checkboxes
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          const allChecked = Array.from(checkboxes).every(cb => cb.checked);
          checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            // Trigger change event to update visual state
            cb.dispatchEvent(new Event('change'));
          });
        });
      }
      
      cancelBtn.addEventListener('click', () => {
        newModalSystem.closeModal('settings-confirm');
      });
      
      confirmBtn.addEventListener('click', async () => {
        // Build settings object with only checked changes
        const settingsToSave = { ...baselineSettings };
        checkboxes.forEach(cb => {
          if (cb.checked) {
            const settingKey = cb.getAttribute('data-setting');
            settingsToSave[settingKey] = newSettings[settingKey];
          }
        });
        
        // Apply debug logging flags to window.__KOT_DEBUG__ if present
        const debugFlags = ['logComponentUpdates', 'logCPUDecisions', 'logStoreUpdates', 'logSubscriptions', 'logModals'];
        debugFlags.forEach(flagName => {
          if (flagName in settingsToSave && window.__KOT_DEBUG__) {
            window.__KOT_DEBUG__[flagName] = settingsToSave[flagName];
            console.log(`[Settings] Debug flag ${flagName} ${settingsToSave[flagName] ? 'enabled' : 'disabled'}`);
          }
        });
        
        if (window.__KOT_NEW__?.store) {
          try {
            const actions = await import('../core/actions.js');
            window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(settingsToSave));
            console.log('[NEW-SETTINGS] Settings saved:', settingsToSave);
            
            // Dispatch custom event for mobile corner changes
            if ('mobileMenuCorner' in settingsToSave && settingsToSave.mobileMenuCorner !== baselineSettings.mobileMenuCorner) {
              window.dispatchEvent(new CustomEvent('settings:mobileCornerChanged', {
                detail: { corner: settingsToSave.mobileMenuCorner }
              }));
            }
            
            baselineSettings = settingsToSave; // reset baseline to what was saved
            
            // Update form to reflect baseline (uncheck changes revert to baseline)
            checkboxes.forEach(cb => {
              if (!cb.checked) {
                const settingKey = cb.getAttribute('data-setting');
                const input = form.querySelector(`[name="${settingKey}"]`);
                if (input) {
                  if (input.type === 'checkbox') {
                    input.checked = baselineSettings[settingKey];
                  } else {
                    input.value = baselineSettings[settingKey];
                  }
                }
              }
            });
            
            saveBtn.disabled = true;
            newModalSystem.closeModal('settings-confirm');
            
            // Close settings modal
            newModalSystem.closeModal('settings');
            
            // Show success notification
            showNotification('✓ Settings saved successfully', 'success');
          } catch (err) {
            console.error('[NEW-SETTINGS] Failed to save settings:', err);
            showNotification('✗ Failed to save settings', 'error');
          }
        }
      });
      
      newModalSystem.showModal('settings-confirm');
    });
  }
  
  // Notification helper function
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: ${type === 'success' ? '#2d5016' : '#5c1616'};
      color: ${type === 'success' ? '#90ee90' : '#ffb3b3'};
      border: 2px solid ${type === 'success' ? '#4a7c2c' : '#8b3a3a'};
      border-radius: 6px;
      padding: 12px 20px;
      font-family: 'Nunito', system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 3px 3px 0 #000, 0 4px 12px rgba(0,0,0,0.5);
      z-index: 10000;
      animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
      pointer-events: none;
    `;
    notification.textContent = message;
    
    // Add animation keyframes if not already present
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Advanced button handlers
  const exportBtn = content.querySelector('.export-settings-btn');
  const importBtn = content.querySelector('.import-settings-btn');
  const resetBtn = content.querySelector('.reset-settings-btn');
  const clearBtn = content.querySelector('.clear-all-data-btn');
  const importFile = content.querySelector('#settings-import-file');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const state = window.__KOT_NEW__?.store?.getState();
      const settings = state?.settings || {};
      const dataStr = JSON.stringify(settings, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `kot-settings-${new Date().toISOString().slice(0,10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importedSettings = JSON.parse(e.target.result);
            if (window.__KOT_NEW__?.store) {
              const actions = await import('../core/actions.js');
              window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(importedSettings));
              // Apply imported settings to form fields directly then reset baseline
              applySettingsToForm(importedSettings);
              baselineSettings = collectSettingsFromForm();
              if (saveBtn) saveBtn.disabled = true;
            }
          } catch (err) {
            alert('Invalid settings file. Please select a valid JSON file.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('Reset all settings to default values? This cannot be undone.')) {
        const defaultSettings = {
          cpuSpeed: 'normal',
          showThoughtBubbles: true,
          soundMuted: false,
          autoActivateMonsters: false,
          playerCardLayoutMode: 'stacked',
          actionMenuMode: 'hybrid',
          persistPositions: true,
          powerCardTheme: 'original',
          dialogSystem: 'unified',
          autoStartInTest: false,
          debugMode: false,
          showPerformanceMetrics: false
        };
        
        if (window.__KOT_NEW__?.store) {
          try {
            const actions = await import('../core/actions.js');
            window.__KOT_NEW__.store.dispatch(actions.settingsUpdated(defaultSettings));
            applySettingsToForm(defaultSettings);
            baselineSettings = collectSettingsFromForm();
            if (saveBtn) saveBtn.disabled = true;
          } catch (e) {
            console.error('Failed to reset settings:', e);
          }
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear ALL game data including settings, save games, and statistics? This cannot be undone!')) {
        if (confirm('Are you absolutely sure? This will remove everything!')) {
          // Clear localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('KOT_') || key.startsWith('kot-')) {
              localStorage.removeItem(key);
            }
          });
          alert('All game data cleared. The page will reload.');
          window.location.reload();
        }
      }
    });
  }

  // No bottom close button; overlay / ESC handles close

  function applySettingsToForm(settings) {
    // Gameplay
    const cpuSelect = content.querySelector('select[name="cpuSpeed"]');
    if (cpuSelect) cpuSelect.value = settings.cpuSpeed || 'normal';
    const thoughtBubbles = content.querySelector('input[name="showThoughtBubbles"]');
    if (thoughtBubbles) thoughtBubbles.checked = !!settings.showThoughtBubbles;
    const soundMuted = content.querySelector('input[name="soundMuted"]');
    if (soundMuted) soundMuted.checked = !!settings.soundMuted;
    const autoActivate = content.querySelector('input[name="autoActivateMonsters"]');
    if (autoActivate) autoActivate.checked = !!settings.autoActivateMonsters;
    // Interface
    const persistPositions = content.querySelector('input[name="persistPositions"]');
    if (persistPositions) persistPositions.checked = !!settings.persistPositions;
    // Advanced
    const autoStart = content.querySelector('input[name="autoStartInTest"]');
    if (autoStart) autoStart.checked = !!settings.autoStartInTest;
    const debugMode = content.querySelector('input[name="debugMode"]');
    if (debugMode) debugMode.checked = !!settings.debugMode;
    const performanceMetrics = content.querySelector('input[name="showPerformanceMetrics"]');
    if (performanceMetrics) performanceMetrics.checked = !!settings.showPerformanceMetrics;
    // Radio groups
    const cardLayoutMode = settings.playerCardLayoutMode || (settings.stackedPlayerCards === false ? 'list' : 'stacked');
    content.querySelectorAll('input[name="playerCardLayoutMode"]').forEach(r => r.checked = r.value === cardLayoutMode);
    const actionMode = settings.actionMenuMode || 'hybrid';
    content.querySelectorAll('input[name="actionMenuMode"]').forEach(r => r.checked = r.value === actionMode);
    const mobileCorner = settings.mobileMenuCorner || 'right';
    content.querySelectorAll('input[name="mobileMenuCorner"]').forEach(r => r.checked = r.value === mobileCorner);
    const powerCardTheme = settings.powerCardTheme || 'original';
    content.querySelectorAll('input[name="powerCardTheme"]').forEach(r => r.checked = r.value === powerCardTheme);
    const dialogSystem = settings.dialogSystem || 'legacy';
    content.querySelectorAll('input[name="dialogSystem"]').forEach(r => r.checked = r.value === dialogSystem);
    updateThemePreview(powerCardTheme);
    // Dev tool flags
    const dtCap = content.querySelector('input[name="enableDecisionTreeCapture"]');
    if (dtCap) dtCap.checked = !!settings.enableDecisionTreeCapture;
    const floatDev = content.querySelector('input[name="enableFloatingDevPanel"]');
    if (floatDev) floatDev.checked = !!settings.enableFloatingDevPanel;
    
    // Debug Logging flags - sync with window.__KOT_DEBUG__ if available
    const debugFlags = ['logComponentUpdates', 'logCPUDecisions', 'logStoreUpdates', 'logSubscriptions', 'logModals'];
    debugFlags.forEach(flagName => {
      const checkbox = content.querySelector(`input[name="${flagName}"]`);
      if (checkbox) {
        // Prefer window.__KOT_DEBUG__ over settings if available
        const value = window.__KOT_DEBUG__?.[flagName] ?? settings[flagName] ?? false;
        checkbox.checked = !!value;
      }
    });
    
    // Archive settings
    const autoArchiveGame = content.querySelector('input[name="autoArchiveGameLogs"]');
    if (autoArchiveGame) autoArchiveGame.checked = !!settings.autoArchiveGameLogs;
    const autoArchiveAI = content.querySelector('input[name="autoArchiveAIDTLogs"]');
    if (autoArchiveAI) autoArchiveAI.checked = !!settings.autoArchiveAIDTLogs;
  }

  // Load current settings initially
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    applySettingsToForm(state.settings || {});
  }

  const __settingsModal = newModalSystem.createModal('settings', '⚙️ Game Settings', content, { width: '1400px', height: '700px' });
  try { __settingsModal.setAttribute('data-modal-id','settings'); } catch(_) {}

  // Remove max-height to prevent gap below sticky footer
  try {
    __settingsModal.style.maxHeight = 'none';
  } catch(_) {}

  // Ensure modal body can scroll properly
  try {
    const modalBody = __settingsModal.querySelector('.new-modal-body');
    if (modalBody) {
      modalBody.style.padding = '0';
      modalBody.style.overflow = 'hidden'; // Form handles scrolling
      modalBody.style.display = 'flex';
      modalBody.style.flexDirection = 'column';
      modalBody.style.minHeight = '0'; // Critical for flex scrolling
    }
  } catch(_) {}
  
  // Ensure form itself is scrollable and fills available space
  try {
    const form = __settingsModal.querySelector('.unified-modal-form');
    if (form) {
      form.style.flex = '1';
      form.style.minHeight = '0'; // Critical for flex scrolling
      form.style.overflowY = 'auto';
      form.style.overflowX = 'hidden';
      // Don't override padding - let CSS handle it
    }
  } catch(_) {}

  // Establish baseline AFTER loading initial settings values
  establishBaseline();
  return __settingsModal;
}

// --- Quick Win Odds Mini Modal (independent of settings modal) ---
export function openWinOddsQuickModal(){
  // If already open, bring to front
  const existing = document.getElementById('mini-win-odds-floating');
  if (existing) { existing.style.zIndex = '6905'; return; }
  const wrapper = document.createElement('div');
  wrapper.id = 'mini-win-odds-floating';
  wrapper.className = 'win-odds-mini-floating';
  const stored = (()=>{ try { return JSON.parse(localStorage.getItem('KOT_WIN_ODDS_MINI_SIZE')||'null'); } catch(_) { return null; } })();
  const width = Math.min(600, Math.max(240, stored?.width || stored?.size || 340));
  const height = Math.min(600, Math.max(200, stored?.height || stored?.size || 340));
  // Center on screen by default if no stored position
  const defaultTop = (window.innerHeight - height) / 2;
  const defaultRight = (window.innerWidth - width) / 2;
  const pos = stored?.pos || { top: defaultTop, right: defaultRight };
  // Elevated z-index above active player dock (6601) and typical overlays but below any traveling portal clone (~6900+)
  wrapper.style.cssText = `position:fixed;top:${pos.top}px;right:${pos.right}px;width:${width}px;height:${height}px;z-index:6905;display:flex;flex-direction:column;user-select:none;`;
  wrapper.innerHTML = `
    <div class="mini-wo-chrome">
      <div class="mini-wo-header" data-drag-handle>
        <div class="mini-wo-header-left">
          <button class="mini-wo-btn" id="mini-win-odds-mode" title="Cycle view (V)" aria-label="Cycle win odds view">
            <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='4' y='10' width='3' height='10' fill='currentColor'/><rect x='10.5' y='6' width='3' height='14' fill='currentColor'/><rect x='17' y='3' width='3' height='17' fill='currentColor'/></svg>
          </button>
        </div>
        <div class="mini-wo-title">WIN ODDS</div>
        <div class="mini-wo-header-right">
          <button class="mini-wo-btn" id="mini-win-odds-close" title="Close">×</button>
        </div>
      </div>
      <div class="mini-wo-body">
        <div id="mini-win-odds-chart" class="mini-wo-chart"><div style="opacity:.55;font-size:11px;">Loading...</div></div>
      </div>
      <div class="mini-wo-footer">
        <label class="mini-wo-auto"><input type="checkbox" id="mini-win-odds-auto" checked /> Auto</label>
        <div id="mini-win-odds-trend" class="mini-wo-trend">–</div>
        <button class="mini-wo-btn" id="mini-win-odds-refresh" title="Refresh now (R)" aria-label="Refresh win odds">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
        </button>
      </div>
      <div class="mini-wo-resize handle-nw" data-resize="nw"></div>
      <div class="mini-wo-resize handle-ne" data-resize="ne"></div>
      <div class="mini-wo-resize handle-sw" data-resize="sw"></div>
      <div class="mini-wo-resize handle-se" data-resize="se"></div>
      <div class="mini-wo-resize handle-n" data-resize="n"></div>
      <div class="mini-wo-resize handle-s" data-resize="s"></div>
      <div class="mini-wo-resize handle-e" data-resize="e"></div>
      <div class="mini-wo-resize handle-w" data-resize="w"></div>
    </div>`;
  document.body.appendChild(wrapper);
  // Dragging (header only)
  (function enableDrag(){
    let sx=0, sy=0, startTop=0, startRight=0, dragging=false;
    const handle = wrapper.querySelector('[data-drag-handle]');
    handle.addEventListener('mousedown', e=>{ dragging=true; sx=e.clientX; sy=e.clientY; const rect=wrapper.getBoundingClientRect(); startTop=rect.top; startRight = window.innerWidth - rect.right; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', stop); e.preventDefault(); });
    function onMove(e){ if(!dragging) return; const dy=e.clientY-sy; const dx=e.clientX-sx; let newTop = startTop+dy; let newRight = startRight-dx; newTop=Math.max(40, Math.min(window.innerHeight-120, newTop)); newRight=Math.max(40, Math.min(window.innerWidth-120, newRight)); wrapper.style.top=newTop+'px'; wrapper.style.right=newRight+'px'; persist(); }
    function stop(){ dragging=false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', stop); }
    function persist(){ try { const rect=wrapper.getBoundingClientRect(); const top=rect.top; const right=window.innerWidth-rect.right; const width=rect.width; const height=rect.height; localStorage.setItem('KOT_WIN_ODDS_MINI_SIZE', JSON.stringify({ width, height, pos:{ top, right } })); } catch(_) {} }
    wrapper._persist = persist;
  })();
  // Resizing (all directions)
  (function enableResize(){
    let startWidth=0, startHeight=0, startTop=0, startRight=0, originX=0, originY=0, resizing=false, dir='se';
    function onDown(e){ 
      const h=e.target.closest('.mini-wo-resize'); 
      if(!h) return; 
      resizing=true; 
      dir=h.dataset.resize; 
      const rect=wrapper.getBoundingClientRect(); 
      startWidth=rect.width; 
      startHeight=rect.height; 
      startTop=rect.top; 
      startRight=window.innerWidth - rect.right; 
      originX=e.clientX; 
      originY=e.clientY; 
      document.addEventListener('mousemove', onMove); 
      document.addEventListener('mouseup', onUp); 
      e.preventDefault(); 
      e.stopPropagation(); 
    }
    function onMove(e){ 
      if(!resizing) return; 
      const dx=e.clientX-originX; 
      const dy=e.clientY-originY; 
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newTop = startTop;
      let newRight = startRight;
      
      // Handle horizontal resizing
      if(dir.includes('e')) newWidth = startWidth + dx;
      if(dir.includes('w')) { newWidth = startWidth - dx; newRight = startRight - dx; }
      
      // Handle vertical resizing
      if(dir.includes('s')) newHeight = startHeight + dy;
      if(dir.includes('n')) { newHeight = startHeight - dy; newTop = startTop + dy; }
      
      // Apply constraints
      newWidth = Math.max(220, Math.min(800, newWidth));
      newHeight = Math.max(180, Math.min(800, newHeight));
      newTop = Math.max(0, Math.min(window.innerHeight - 100, newTop));
      newRight = Math.max(0, Math.min(window.innerWidth - 100, newRight));
      
      wrapper.style.width = newWidth + 'px';
      wrapper.style.height = newHeight + 'px';
      wrapper.style.top = newTop + 'px';
      wrapper.style.right = newRight + 'px';
      wrapper._persist?.(); 
    }
    function onUp(){ 
      resizing=false; 
      document.removeEventListener('mousemove', onMove); 
      document.removeEventListener('mouseup', onUp); 
    }
    wrapper.addEventListener('mousedown', onDown);
  })();
  const mini = {
    modeBtn: wrapper.querySelector('#mini-win-odds-mode'),
    refreshBtn: wrapper.querySelector('#mini-win-odds-refresh'),
    closeBtn: wrapper.querySelector('#mini-win-odds-close'),
    autoCb: wrapper.querySelector('#mini-win-odds-auto'),
    chart: wrapper.querySelector('#mini-win-odds-chart'),
    trend: wrapper.querySelector('#mini-win-odds-trend')
  };
  
  // View mode icons (same as Analytics tab)
  const modeIcons = {
    bars: `<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='4' y='10' width='3' height='10' fill='currentColor'/><rect x='10.5' y='6' width='3' height='14' fill='currentColor'/><rect x='17' y='3' width='3' height='17' fill='currentColor'/></svg>` ,
    table: `<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='3' y='4' width='18' height='4' fill='currentColor'/><rect x='3' y='10' width='18' height='4' fill='currentColor'/><rect x='3' y='16' width='18' height='4' fill='currentColor'/></svg>`,
    compact: `<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='4' y='5' width='16' height='3' fill='currentColor'/><rect x='4' y='10.5' width='10' height='3' fill='currentColor'/><rect x='4' y='16' width='14' height='3' fill='currentColor'/></svg>`,
    stacked: `<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='3' y='5' width='18' height='2.5' fill='currentColor'/><rect x='3' y='10.5' width='15' height='2.5' fill='currentColor'/><rect x='3' y='16' width='12' height='2.5' fill='currentColor'/></svg>`,
    monitor: `<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><path d='M4 5h16v10H4z' stroke='currentColor' stroke-width='2' fill='none'/><path d='M6 13l3-4 3 2 2-3 4 5' fill='none' stroke='currentColor' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/><rect x='9' y='17' width='6' height='2' fill='currentColor'/></svg>`
  };
  
  function updateModeIcon() {
    const winOdds = window.__KOT_WIN_ODDS__?.obj;
    if (mini.modeBtn && winOdds) {
      mini.modeBtn.innerHTML = modeIcons[winOdds.mode] || modeIcons.bars;
    }
  }
  
  function renderMini(force){
    const winOdds = window.__KOT_WIN_ODDS__?.obj;
    if (!winOdds || !mini.chart) return;
    
    const state = window.__KOT_NEW__?.store?.getState?.();
    if (!state) { 
      mini.chart.innerHTML = '<div style="font-size:11px;opacity:.5;">No state</div>'; 
      return; 
    }
    
    // Compute fresh odds
    let odds = winOdds.compute(state);
    if (!Object.keys(odds).length) { 
      mini.chart.innerHTML = '<div style="font-size:11px;opacity:.45;">No active players</div>'; 
      return; 
    }
    winOdds.push(odds);
    
    const players = state.players.order.map(id => state.players.byId[id]).filter(p => !p.eliminated && !p.isEliminated);
    
    // Helper: adaptSnapshotOdds
    function adaptSnapshotOdds(snapshotOdds){
      Object.keys(snapshotOdds).forEach(id => {
        const val = snapshotOdds[id];
        if (typeof val === 'number') snapshotOdds[id] = { percent: val, parts: { vp:0,health:0,energy:0,tokyo:0,momentum:0 } };
      });
      return snapshotOdds;
    }
    
    // Helper: monsterColor
    const baseColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9','#14b8a6','#ec4899'];
    function monsterColor(p, idx){
      const name = (p.monster || p.monsterName || p.character || p.name || '').toLowerCase();
      const map = {
        'alienoid':'#1496b4', 'cyber bunny':'#f472b6', 'cyber kitty':'#ec4899',
        'gigazaur':'#22c55e', 'kraken':'#3b82f6', 'meka dragon':'#a3a3a3',
        'space penguin':'#38bdf8'
      };
      return map[name] || baseColors[idx % baseColors.length];
    }
    
    // Sparkline data
    const SPARK_N = 12;
    const recent = winOdds.history.slice(-SPARK_N).map(h => adaptSnapshotOdds(h.odds));
    const sparkData = {};
    players.forEach(p => { sparkData[p.id] = recent.map(r => (r[p.id]?.percent) || 0); });
    
    // Previous odds for delta
    const latestHist = winOdds.history;
    const prev = latestHist.length > 1 ? adaptSnapshotOdds(JSON.parse(JSON.stringify(latestHist[latestHist.length-2].odds))) : {};
    
    // Common row data
    function rowCommon(p) {
      const pct = odds[p.id]?.percent || 0;
      const prevPct = prev[p.id]?.percent;
      const delta = winOdds.trend(prevPct, pct);
      const arrow = delta > 0 ? '▲' : (delta < 0 ? '▼' : '');
      const deltaStr = delta !== 0 ? (delta > 0 ? '+' : '') + delta.toFixed(1) : '';
      const parts = odds[p.id]?.parts || {};
      const partSum = Object.values(parts).reduce((a,b)=>a+b,0) || 1;
      const breakdown = Object.entries(parts).map(([k,v]) => `${k}:${(v/partSum*100).toFixed(0)}%`).join(' ');
      const tooltip = `title="${breakdown}"`;
      const sVals = sparkData[p.id];
      const maxS = Math.max(1, ...sVals);
      const spark = `<span style='display:inline-flex;align-items:flex-end;gap:1px;height:12px;'>${sVals.map(v=>`<i style='display:block;width:3px;height:${Math.max(2,Math.round(v/maxS*12))}px;background:${v===sVals[sVals.length-1]?'#818cf8':'#4f46e5'};opacity:${0.35+(v/maxS*0.65)}'></i>`).join('')}</span>`;
      return { pct, prevPct, delta, arrow, deltaStr, tooltip, spark };
    }
    
    // Render based on mode
    let html = '';
    if (winOdds.mode === 'bars') {
      html = '<div style="display:flex;flex-direction:column;gap:4px;padding:8px;">';
      players.forEach((p,idx) => {
        const { pct, arrow, deltaStr, tooltip, spark } = rowCommon(p);
        const barW = Math.max(2, Math.min(100, pct)).toFixed(1);
        const c = monsterColor(p, idx);
        const grad = `linear-gradient(90deg, ${c}, ${c}cc)`;
        html += `<div style='display:flex;flex-direction:column;gap:4px;'>
          <div style='display:flex;justify-content:space-between;align-items:center;font-size:11px;'>
            <span style='display:flex;align-items:center;gap:6px;' ${tooltip}>${arrow}<i style='width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;display:inline-block;'></i><strong style='letter-spacing:.5px;'>${p.name||p.id}</strong> ${spark}</span>
            <span style='font-variant-numeric:tabular-nums;' ${tooltip}>${pct.toFixed(1)}% <span style='opacity:.55;'>${deltaStr}</span></span>
          </div>
          <div style='background:#1d232c;border:1px solid #2c3440;border-radius:4px;height:10px;position:relative;overflow:hidden;'>
            <div style='position:absolute;left:0;top:0;bottom:0;width:${barW}%;background:${grad};box-shadow:0 0 6px ${c}66;transition:width .4s ease;'></div>
          </div>
        </div>`;
      });
      html += '</div>';
    } else if (winOdds.mode === 'table') {
      html = `<div style="padding:8px;font-size:11px;"><table style='width:100%;border-collapse:collapse;'>
        <thead><tr style='text-align:left;'>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Player</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Odds %</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Δ</th>
          <th style='padding:4px 6px;border-bottom:1px solid #222;'>Trend</th>
        </tr></thead><tbody>`;
      players.forEach((p,idx) => {
        const { pct, arrow, deltaStr, tooltip, spark } = rowCommon(p);
        const c = monsterColor(p, idx);
        html += `<tr>
          <td style='padding:4px 6px;' ${tooltip}><span style='display:inline-flex;align-items:center;gap:6px;'><i style="width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;display:inline-block;"></i>${p.name||p.id}</span></td>
          <td style='padding:4px 6px;font-variant-numeric:tabular-nums;' ${tooltip}>${pct.toFixed(1)}%</td>
          <td style='padding:4px 6px;'>${arrow} <span style='opacity:.65;'>${deltaStr}</span></td>
          <td style='padding:4px 6px;'>${spark}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    } else if (winOdds.mode === 'compact') {
      html = `<div style='display:flex;flex-wrap:wrap;gap:10px;font-size:11px;padding:8px;'>`;
      players.forEach((p,idx) => {
        const { pct, arrow, tooltip } = rowCommon(p);
        const c = monsterColor(p, idx);
        html += `<span style='display:inline-flex;align-items:center;gap:6px;padding:4px 6px;background:#1d232c;border:1px solid #2c3440;border-radius:4px;' ${tooltip}>${arrow}<i style='width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 4px ${c}aa;'></i><strong>${p.name||p.id}</strong> ${pct.toFixed(1)}%</span>`;
      });
      html += '</div>';
    } else if (winOdds.mode === 'stacked') {
      const segs = players.map((p,idx) => {
        const { pct, tooltip } = rowCommon(p);
        const w = pct.toFixed(2);
        const c = monsterColor(p, idx);
        return `<div ${tooltip} style='flex:0 0 ${w}%;background:linear-gradient(135deg,${c},${c}cc 60%);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;position:relative;'>
          <span style='pointer-events:none;text-shadow:0 1px 2px #000;font-weight:600;'>${p.name||p.id} ${pct.toFixed(1)}%</span>
        </div>`;
      }).join('');
      html = `<div style='padding:8px;'><div style='display:flex;width:100%;height:42px;border:1px solid #2c3440;border-radius:6px;overflow:hidden;'>${segs}</div></div>`;
    } else if (winOdds.mode === 'monitor') {
      // Line graph
      const CELL = 30;
      const COLS = 10;
      const ROWS = 4;
      const W = CELL * COLS;
      const H = CELL * ROWS;
      const MAX_POINTS = 40;
      const hist = winOdds.history.slice(-MAX_POINTS);
      const gridLines = [];
      for (let y=0;y<=ROWS;y++){ const gy = (H - (y/ROWS)*H).toFixed(2); gridLines.push(`<line x1='0' y1='${gy}' x2='${W}' y2='${gy}' stroke='rgba(255,255,255,.07)' stroke-width='1' />`); }
      for (let x=0;x<=COLS;x++){ const gx = (x/COLS)*W; gridLines.push(`<line x1='${gx}' y1='0' x2='${gx}' y2='${H}' stroke='rgba(255,255,255,.05)' stroke-width='1' />`); }
      const paths = players.map((p,idx)=>{
        const c = monsterColor(p, idx);
        let d='';
        hist.forEach((h,i)=>{
          const po = adaptSnapshotOdds(h.odds);
          const v = po[p.id]?.percent ?? 0;
          const x = (i/(hist.length-1||1))*W;
          const y = H - (v/100)*H;
          d += (i===0?`M ${x.toFixed(2)} ${y.toFixed(2)}`:` L ${x.toFixed(2)} ${y.toFixed(2)}`);
        });
        return `<path d='${d}' fill='none' stroke='${c}' stroke-width='2' vector-effect='non-scaling-stroke' stroke-linejoin='round' stroke-linecap='round' />`;
      }).join('');
      const legend = players.map((p,idx)=>{ const c = monsterColor(p, idx); const cur = odds[p.id]?.percent||0; return `<span style='display:inline-flex;align-items:center;gap:4px;font-size:10px;'>
        <i style='width:10px;height:10px;border-radius:2px;background:${c};box-shadow:0 0 6px ${c}aa;'></i>${p.name||p.id} ${cur.toFixed(1)}%
      </span>`; }).join('<span style="opacity:.3;">|</span>');
      html = `<div style='display:flex;flex-direction:column;gap:6px;padding:8px;'>
        <div style='background:#000;border:1px solid #222;border-radius:6px;padding:6px;position:relative;'>
          <svg viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid meet' style='width:100%;aspect-ratio:${W}/${H};display:block;background:#000;'>
            <g>${gridLines.join('')}</g>
            <g>${paths}</g>
          </svg>
        </div>
        <div style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;'>${legend}</div>
      </div>`;
    }
    
    mini.chart.innerHTML = html;
    
    // Update trend
    if (mini.trend) {
      const summary = players.map(p => {
        const pct = odds[p.id]?.percent || 0;
        const name = p.monster || p.monsterName || p.name || p.id;
        return `${name}: ${pct.toFixed(1)}%`;
      }).join(' • ');
      mini.trend.textContent = summary;
    }
    
    updateModeIcon();
  }
  mini.refreshBtn.addEventListener('click', ()=>renderMini(true));
  // Clear button removed per spec (history retained until page/session reset)
  mini.modeBtn.addEventListener('click', ()=>{ 
    const btn = document.querySelector('#dev-win-odds-mode'); 
    if (btn) btn.click(); 
    else { 
      const winOdds = window.__KOT_WIN_ODDS__?.obj;
      if (winOdds) {
        const modes=['bars','table','compact','stacked','monitor']; 
        const cur=winOdds.mode; 
        winOdds.mode=modes[(modes.indexOf(cur)+1)%modes.length]; 
        try { localStorage.setItem('KOT_DEV_WIN_ODDS_MODE', winOdds.mode); } catch(_) {}
      }
    } 
    setTimeout(()=>renderMini(true), 40); 
  });
  mini.closeBtn.addEventListener('click', ()=> wrapper.remove());
  const storeRef = window.__KOT_NEW__?.store;
  if (storeRef) storeRef.subscribe(()=>{ if (mini.autoCb.checked) renderMini(); });
  setTimeout(()=>renderMini(true), 60);
}

if (!window.__KOT_WIN_ODDS_QUICK_BOUND__) {
  window.__KOT_WIN_ODDS_QUICK_BOUND__ = true;
  window.addEventListener('open-win-odds-modal', openWinOddsQuickModal);
}

export function createGameLogModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="unified-modal-form">
      <!-- Filter Controls -->
      <div class="filter-controls">
        <div class="filter-group">
          <label>Show:</label>
          <select name="logFilter" class="field-input" style="min-width: 120px;">
            <option value="all">All Events</option>
            <option value="dice">Dice Rolls</option>
            <option value="combat">Combat</option>
            <option value="cards">Power Cards</option>
            <option value="phase">Phase Changes</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Player:</label>
          <select name="playerFilter" class="field-input" style="min-width: 100px;">
            <option value="all">All Players</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="field-checkbox" style="margin: 0;">
            <input type="checkbox" name="autoScroll" checked>
            <span class="checkbox-label">Auto-scroll</span>
          </label>
        </div>
      </div>

      <!-- Game Log Content -->
      <div class="modal-content-scrollable" id="game-log-content">
        <div class="log-loading" style="text-align: center; color: #999; font-style: italic;">
          📜 Loading game log...
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary clear-btn">🗑️ Clear Log</button>
      <button type="button" class="btn btn-primary export-btn">💾 Export</button>
    </div>
  `;

  // Load and display log entries
  const updateLogContent = () => {
    const logContainer = content.querySelector('#game-log-content');
    const logFilter = content.querySelector('select[name="logFilter"]').value;
    const playerFilter = content.querySelector('select[name="playerFilter"]').value;
    
    if (window.__KOT_NEW__?.store) {
      const state = window.__KOT_NEW__.store.getState();
      const logEntries = state.log?.entries || [];
      
      if (logEntries.length === 0) {
        logContainer.innerHTML = '<div style="text-align: center; color: #999; font-style: italic; padding: 40px;">📋 No game events recorded yet.<br>Start playing to see the action log!</div>';
        return;
      }

      // Filter entries
      let filteredEntries = logEntries;
      if (logFilter !== 'all') {
        filteredEntries = logEntries.filter(entry => {
          const msg = (entry.message || entry.text || '').toLowerCase();
          switch (logFilter) {
            case 'dice': return msg.includes('roll') || msg.includes('dice') || msg.includes('keep');
            case 'combat': return msg.includes('attack') || msg.includes('damage') || msg.includes('heal');
            case 'cards': return msg.includes('card') || msg.includes('buy') || msg.includes('energy');
            case 'phase': return msg.includes('phase') || msg.includes('turn') || msg.includes('round');
            default: return true;
          }
        });
      }

      if (playerFilter !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
          (entry.playerId === playerFilter) || (entry.message || '').includes(playerFilter)
        );
      }

      // Render filtered entries
      logContainer.innerHTML = filteredEntries.length === 0 
        ? '<div style="text-align: center; color: #999; font-style: italic; padding: 20px;">No entries match current filters</div>'
        : renderLogEntries(filteredEntries);

      // Auto-scroll to bottom if enabled
      if (content.querySelector('input[name="autoScroll"]').checked) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  };

  // Filter change handlers
  content.querySelector('select[name="logFilter"]').addEventListener('change', updateLogContent);
  content.querySelector('select[name="playerFilter"]').addEventListener('change', updateLogContent);

  // Populate player filter options
  if (window.__KOT_NEW__?.store) {
    const state = window.__KOT_NEW__.store.getState();
    const playersState = state.players || { order: [], byId: {} };
    const playerSelect = content.querySelector('select[name="playerFilter"]');
    
    // Convert from new store structure: { order: [...], byId: {...} } to array of players
    playersState.order.forEach(playerId => {
      const player = playersState.byId[playerId];
      if (player) {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name || `Player ${player.id}`;
        playerSelect.appendChild(option);
      }
    });
  }

  // Clear log button
  content.querySelector('.clear-btn').addEventListener('click', async () => {
    if (confirm('Clear the entire game log? This cannot be undone.')) {
      try {
        // Clear log in store if available
        if (window.__KOT_NEW__?.store) {
          const { logCleared } = await import('../core/actions.js');
          window.__KOT_NEW__.store.dispatch(logCleared());
          updateLogContent();
        }
      } catch (e) {
        console.error('Failed to clear log:', e);
      }
    }
  });

  // Export log button
  content.querySelector('.export-btn').addEventListener('click', () => {
    if (window.__KOT_NEW__?.store) {
      const state = window.__KOT_NEW__.store.getState();
      const logEntries = state.log?.entries || [];
      const logText = logEntries.map(entry => 
        `[${entry.timestamp || 'Unknown'}] ${entry.message || entry.text || JSON.stringify(entry)}`
      ).join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kingoftokyo-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  // No explicit Close button; overlay / ESC handles close

  // Initial load
  updateLogContent();

  const __gameLogModal = newModalSystem.createModal('gameLog', '📜 Game Log', content, { width: '700px' });
  try { __gameLogModal.setAttribute('data-modal-id','gameLog'); } catch(_) {}
  return __gameLogModal;
}

function renderLogEntries(entries) {
  return entries.map(entry => {
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
    const message = entry.message || entry.text || JSON.stringify(entry);
    const type = getLogEntryType(message);
    
    return `
      <div class="log-entry" style="padding: 8px 0; border-bottom: 1px solid #333; font-family: monospace; font-size: 0.875rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="flex: 1; color: #e4e4e4; line-height: 1.4;">
            <span class="status-indicator ${type}" style="margin-right: 8px; font-size: 0.65rem;">${getLogIcon(type)}</span>
            ${message}
          </div>
          ${timestamp ? `<div style="color: #666; font-size: 0.75rem; white-space: nowrap;">${timestamp}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getLogEntryType(message) {
  const msg = message.toLowerCase();
  if (msg.includes('error') || msg.includes('failed')) return 'error';
  if (msg.includes('attack') || msg.includes('damage')) return 'warning';
  if (msg.includes('heal') || msg.includes('win')) return 'success';
  if (msg.includes('roll') || msg.includes('dice')) return 'info';
  return 'info';
}

function getLogIcon(type) {
  switch (type) {
    case 'error': return '❌';
    case 'warning': return '⚔️';
    case 'success': return '✅';
    case 'info': return '🎲';
    default: return '📝';
  }
}

export function createHelpModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal-content-scrollable">
      <div class="content-section">
        <h4>🎮 Game Controls</h4>
        <ul>
          <li><strong>Roll Dice:</strong> Click the "Roll" button or press Space</li>
          <li><strong>Keep Dice:</strong> Click on dice to keep them before rerolling</li>
          <li><strong>Buy Cards:</strong> Click on power cards in the shop</li>
          <li><strong>Enter Tokyo:</strong> Click "Enter Tokyo" when prompted</li>
          <li><strong>Attack:</strong> Roll claws to attack other monsters</li>
        </ul>
      </div>
      
      <div class="content-section">
        <h4>🏆 Winning Conditions</h4>
        <ul>
          <li>Reach <strong>20 Victory Points</strong></li>
          <li>Be the <strong>last monster standing</strong></li>
          <li>Control Tokyo and survive attacks</li>
        </ul>
      </div>
      
      <h3 style="color: #ffd700;">Dice Symbols</h3>
      <ul style="padding-left: 20px; margin-bottom: 20px;">
        <li><strong>1, 2, 3:</strong> Victory Points (need 3+ of same number)</li>
        <li><strong>Energy:</strong> Buy power cards</li>
        <li><strong>Health:</strong> Heal damage (not in Tokyo)</li>
        <li><strong>Attack:</strong> Deal damage to other monsters</li>
      </div>

      <div class="content-section">
        <h4>🎲 Dice Symbols</h4>
        <ul>
          <li><strong>⚡ Energy:</strong> Currency to buy power cards</li>
          <li><strong>❤️ Hearts:</strong> Heal damage (not available in Tokyo)</li>
          <li><strong>🏆 Victory Points:</strong> Numbers 1, 2, 3 give points</li>
          <li><strong>👹 Attack:</strong> Deal damage to other monsters</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🗾 Tokyo Mechanics</h4>
        <p>Entering Tokyo gives you victory points each turn, but you can't heal and take damage from all attacks!</p>
        <ul>
          <li>Get <strong>1 VP</strong> for entering Tokyo</li>
          <li>Get <strong>2 VP</strong> at start of each turn in Tokyo</li>
          <li>Can't use hearts to heal while in Tokyo</li>
          <li>All other monsters' attacks hit you</li>
        </ul>
      </div>
      
      <div class="content-section">
        <h4>⌨️ Keyboard Shortcuts</h4>
        <ul>
          <li><strong>Space:</strong> Roll dice</li>
          <li><strong>M:</strong> Toggle sound</li>
          <li><strong>Escape:</strong> Close modals</li>
        </ul>
      </div>
    </div>
    <!-- No bottom close button: modal can be closed via overlay / ESC -->
  `;

  // No bottom close button; overlay / ESC handles close

  const __helpModal = newModalSystem.createModal('help', '❓ Help & Instructions', content, { width: '600px' });
  try { __helpModal.setAttribute('data-modal-id','help'); } catch(_) {}
  return __helpModal;
}

export function createAIDecisionModal() {
  console.log('🔍 [MODAL-DEBUG] createAIDecisionModal() called', {
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });
  
  const content = document.createElement('div');
  content.className = 'ai-decision-tree-wrapper';
  content.innerHTML = '<div style="padding: 20px; text-align: center; color: #ccc;">Loading AI Decision Tree...</div>';
  
  // Lazy import new component to avoid upfront cost
  import('../components/ai-decision-tree/ai-decision-tree.component.js').then(mod => {
    try {
      const { root, dispose } = mod.buildAIDecisionTree();
      content.innerHTML = ''; // Clear loading message
      content.appendChild(root);
      
      // Store dispose method for cleanup
      content._treeDispose = dispose;
    } catch(e){ 
      console.error('[aiDecisionModal] failed to init tree', e); 
      content.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Error loading AI Decision Tree: ${e.message}</div>`;
    }
  }).catch(err=> {
    console.error('[aiDecisionModal] load error', err);
    content.innerHTML = `<div style="padding: 20px; color: #ff6b6b;">Failed to load AI Decision Tree module: ${err.message}</div>`;
  });
  
  return newModalSystem.createModal('aiDecision', '✨ AI Decision Tree', content, { width: '820px' });
}

// Legacy simple render helpers removed: replaced by dedicated component.

export function createAboutModal() {
  const content = document.createElement('div');
  const buildTime = new Date().toLocaleString();
  
  content.innerHTML = `
    <div class="modal-content-scrollable">
      <div class="content-section">
        <h4>👑 King of Tokyo – Enhanced UI Prototype</h4>
        <p>This experimental interface brings advanced UI features, modular components, and flexible customization to the classic monster battle game by Richard Garfield.</p>
      </div>

      <div class="content-section">
        <h4>🎮 Core Gameplay Features</h4>
        <ul>
          <li><strong>Full Game Implementation:</strong> Complete rules including Tokyo Bay, Power Cards, Victory Stars, and Energy</li>
          <li><strong>AI Opponents:</strong> Intelligent computer players with strategic decision-making</li>
          <li><strong>Multiple Monster Choices:</strong> Play as Gigazaur, Meka Dragon, The King, Cyber Bunny, Alienoid, and Kraken</li>
          <li><strong>Power Card System:</strong> Complete deck with Keep and Discard cards, effects, and synergies</li>
          <li><strong>Tokyo Yield Mechanics:</strong> Strategic decisions for staying in Tokyo or yielding control</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>📱 Mobile UI Modes</h4>
        <ul>
          <li><strong>Classic Mobile View:</strong> Traditional touch-optimized layout with action menu button</li>
          <li><strong>Radial Menu Mode:</strong> Catan-inspired circular action menu with mini player cards in corners, mini power cards bar at bottom, mini deck indicator, rotated Tokyo tiles, and always-visible dice tray</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>⚙️ Settings & Customization</h4>
        <ul>
          <li><strong>Layout Density Options:</strong> Switch between Stacked, Condensed, and List views</li>
          <li><strong>Mobile UI Mode Toggle:</strong> Choose Classic or Radial Menu layouts for mobile</li>
          <li><strong>Accessible Settings Panel:</strong> Scrollable modal with clear controls</li>
          <li><strong>Developer Panel:</strong> Advanced debugging and state inspection tools</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🤖 AI & Analytics</h4>
        <ul>
          <li><strong>AI Decision Tree Viewer:</strong> Inspect AI reasoning and decision-making process</li>
          <li><strong>AI Thought Bubbles:</strong> Visual indicators showing what AI players are considering</li>
          <li><strong>Win Odds Calculator:</strong> Real-time probability analysis for victory chances</li>
          <li><strong>Analytics Dashboard:</strong> Track game statistics and player performance</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>♿ Accessibility</h4>
        <ul>
          <li><strong>ARIA Labels:</strong> Screen reader support throughout interface</li>
          <li><strong>Keyboard Navigation:</strong> Full game control without mouse/touch</li>
          <li><strong>Focus Management:</strong> Clear visual focus indicators</li>
          <li><strong>Modal Accessibility:</strong> Proper dialog roles and hidden attribute management</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🎨 Visual Design</h4>
        <ul>
          <li><strong>Dark Theme:</strong> Eye-friendly dark color scheme with design tokens</li>
          <li><strong>Modular Component System:</strong> Reusable, maintainable UI components</li>
          <li><strong>Responsive Layout:</strong> Adapts to desktop, tablet, and mobile screens</li>
          <li><strong>Custom Animations:</strong> Smooth transitions and visual feedback</li>
        </ul>
      </div>

      <div class="content-section">
        <h4>🔧 Technical Info</h4>
        <p><strong>Build Version:</strong> Enhanced v2.1</p>
        <p><strong>Session Built:</strong> ${buildTime}</p>
        <p><strong>Framework:</strong> Vanilla JS with Component Architecture</p>
        <p><strong>State Management:</strong> Redux-style Store</p>
      </div>

      <div class="content-section" style="opacity: 0.6; font-size: 0.85rem; margin-top: 20px;">
        <p>All trademarks belong to their respective owners. Prototype for personal/educational use.</p>
      </div>
    </div>
    <!-- No bottom close button: modal can be closed via overlay / ESC -->
  `;

  // No bottom close button; overlay / ESC handles close

  const __aboutModal = newModalSystem.createModal('about', 'ℹ️ About King of Tokyo', content, { width: '800px', maxHeight: '85vh' });
  try { __aboutModal.setAttribute('data-modal-id','about'); } catch(_) {}
  return __aboutModal;
}

/**
 * Tokyo Yield Modal
 * Allows human players to decide whether to leave Tokyo when attacked
 */
export function createTokyoYieldModal(prompt, onDecision) {
  const { defenderId, attackerId, slot, damage, originalHealth, advisory } = prompt;
  
  const slotName = slot === 'city' ? 'Tokyo City' : 'Tokyo Bay';
  const projectedHP = (originalHealth != null && typeof damage === 'number')
    ? Math.max(0, originalHealth - damage)
    : null;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="padding: 24px; text-align: center;">
      <div style="font-family: 'Bangers', cursive; font-size: 2.5rem; margin-bottom: 12px; color: #ff6b6b; text-shadow: 2px 2px 0 #000;">
        ⚔️ ${slotName.toUpperCase()} UNDER ATTACK!
      </div>
      
      <div style="font-size: 1.1rem; margin-bottom: 24px; opacity: 0.9;">
        You were hit for <strong style="color: #ff6b6b;">${damage}</strong> damage.
      </div>
      
      ${projectedHP != null ? `
        <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-around; gap: 20px;">
            <div>
              <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 4px;">Damage Taken</div>
              <div style="font-family: 'Bangers', cursive; font-size: 1.8rem; color: #ff6b6b;">${damage}</div>
            </div>
            <div>
              <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 4px;">Health</div>
              <div style="font-family: 'Bangers', cursive; font-size: 1.8rem;">
                <span style="opacity: 0.6;">${originalHealth}</span>
                <span style="margin: 0 8px;">→</span>
                <span style="color: ${projectedHP <= 3 ? '#ff6b6b' : '#90ee90'};">${projectedHP}</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
      
      <div style="font-size: 1.2rem; margin-bottom: 24px; line-height: 1.5;">
        Do you want to <strong style="color: #4a9eff;">stay</strong> in ${slotName}<br/>
        or <strong style="color: #ff9f43;">yield</strong> your slot?
      </div>
      
      ${advisory ? `
        <div style="background: rgba(255,183,67,0.1); border: 1px solid rgba(255,183,67,0.3); border-radius: 6px; padding: 12px; margin-bottom: 24px; font-size: 0.9rem; line-height: 1.5;">
          <strong>💡 Suggestion:</strong> ${advisory.suggestion === 'yield' ? 'Leave Tokyo' : 'Stay in Tokyo'}<br/>
          <span style="opacity: 0.8;">${advisory.reason || ''}</span>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 16px; justify-content: center;">
        <button class="yield-stay-btn" style="flex: 1; max-width: 200px; font-family: 'Bangers', cursive; font-size: 1.3rem; padding: 16px 32px; background: linear-gradient(135deg, #4a9eff, #357abd); color: #fff; border: 2px solid #6bb0ff; border-radius: 6px; cursor: pointer; box-shadow: 3px 3px 0 #000; transition: transform 0.1s;">
          Stay in Tokyo
        </button>
        <button class="yield-leave-btn" style="flex: 1; max-width: 200px; font-family: 'Bangers', cursive; font-size: 1.3rem; padding: 16px 32px; background: linear-gradient(135deg, #ff9f43, #d17a1e); color: #fff; border: 2px solid #ffb870; border-radius: 6px; cursor: pointer; box-shadow: 3px 3px 0 #000; transition: transform 0.1s;">
          Leave Tokyo
        </button>
      </div>
    </div>
  `;
  
  // Button hover effects
  const stayBtn = content.querySelector('.yield-stay-btn');
  const leaveBtn = content.querySelector('.yield-leave-btn');
  
  [stayBtn, leaveBtn].forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });
  });
  
  // Create modal
  const modal = newModalSystem.createModal('tokyo-yield', '🏯 Tokyo Decision', content, { width: '600px' });
  
  // Event handlers
  stayBtn.addEventListener('click', () => {
    if (onDecision) onDecision('stay');
    newModalSystem.closeModal('tokyo-yield');
  });
  
  leaveBtn.addEventListener('click', () => {
    if (onDecision) onDecision('yield');
    newModalSystem.closeModal('tokyo-yield');
  });
  
  return modal;
}

/**
 * Peek Modal
 * Shows preview of the next card in the deck
 */
export function createPeekModal(card, onClose) {
  const content = document.createElement('div');
  
  // Detect if this is a monster card or power card
  const isMonsterCard = card.isMonster || card.monster || card.personality || card.image;
  
  if (isMonsterCard) {
    const monster = card.monster || card;
    content.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <div style="font-family: 'Bangers', cursive; font-size: 1.8rem; margin-bottom: 16px; color: #4a9eff;">
          📋 Next Monster Card
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(74,158,255,0.1), rgba(53,122,189,0.1)); border: 2px solid rgba(74,158,255,0.3); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          ${monster.image ? `
            <div style="margin-bottom: 16px;">
              <img src="${monster.image}" alt="${monster.name}" style="max-width: 200px; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
            </div>
          ` : ''}
          
          <div style="font-family: 'Bangers', cursive; font-size: 2rem; margin-bottom: 8px;">
            ${monster.name || 'Unknown Monster'}
          </div>
          
          ${monster.description ? `
            <div style="font-size: 1rem; opacity: 0.85; margin-bottom: 16px; line-height: 1.5;">
              ${monster.description}
            </div>
          ` : ''}
          
          ${monster.personality ? `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; text-align: left;">
              ${Object.entries(monster.personality).map(([key, value]) => `
                <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 4px;">
                  <div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase;">${key}</div>
                  <div style="font-size: 0.9rem; font-weight: bold;">${value}/10</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <button class="peek-close-btn" style="font-family: 'Bangers', cursive; font-size: 1.1rem; padding: 12px 32px; background: #2a2a2a; color: #e4e4e4; border: 2px solid #444; border-radius: 6px; cursor: pointer; box-shadow: 2px 2px 0 #000;">
          Close
        </button>
      </div>
    `;
  } else {
    // Power card
    const cardText = card.description || card.text || formatCardEffect(card.effect) || 'No description available';
    const cost = card.cost != null ? `⚡${card.cost}` : '';
    
    content.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <div style="font-family: 'Bangers', cursive; font-size: 1.8rem; margin-bottom: 16px; color: #ffb870;">
          🎴 Next Power Card
        </div>
        
        <div style="background: linear-gradient(135deg, rgba(255,159,67,0.1), rgba(209,122,30,0.1)); border: 2px solid rgba(255,159,67,0.3); border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div style="font-family: 'Bangers', cursive; font-size: 2rem;">
              ${card.name || 'Unknown Card'}
            </div>
            ${cost ? `
              <div style="font-family: 'Bangers', cursive; font-size: 1.5rem; background: rgba(255,183,67,0.2); padding: 4px 12px; border-radius: 4px; border: 1px solid rgba(255,183,67,0.4);">
                ${cost}
              </div>
            ` : ''}
          </div>
          
          <div style="font-size: 1rem; line-height: 1.6; opacity: 0.9;">
            ${cardText}
          </div>
          
          ${card.type ? `
            <div style="margin-top: 12px; font-size: 0.85rem; opacity: 0.7; text-transform: uppercase;">
              ${card.type}
            </div>
          ` : ''}
        </div>
        
        <button class="peek-close-btn" style="font-family: 'Bangers', cursive; font-size: 1.1rem; padding: 12px 32px; background: #2a2a2a; color: #e4e4e4; border: 2px solid #444; border-radius: 6px; cursor: pointer; box-shadow: 2px 2px 0 #000;">
          Close
        </button>
      </div>
    `;
  }
  
  // Helper function to format card effect
  function formatCardEffect(effect) {
    if (!effect) return '';
    if (typeof effect === 'string') return effect;
    if (effect.kind) {
      const value = effect.value || '';
      switch(effect.kind) {
        case 'vp_gain': return `Gain ${value} Victory Points`;
        case 'energy_gain': return `Gain ${value} Energy`;
        case 'dice_slot': return `Add ${value} extra die`;
        case 'reroll_bonus': return `+${value} reroll per turn`;
        case 'heal_all': return `All monsters heal ${value} damage`;
        case 'heal_self': return `Heal ${value} damage`;
        case 'damage_all': return `Deal ${value} damage to all monsters`;
        default: return effect.kind.replace(/_/g, ' ');
      }
    }
    return '';
  }
  
  // Create modal
  const modal = newModalSystem.createModal('peek', '👁️ Card Preview', content, { width: '500px' });
  
  // Close button handler
  const closeBtn = content.querySelector('.peek-close-btn');
  closeBtn.addEventListener('click', () => {
    newModalSystem.closeModal('peek');
    if (onClose) onClose();
  });
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.transform = 'translateY(-2px)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.transform = 'translateY(0)';
  });
  
  return modal;
}

/**
 * Confirm Modal
 * Generic confirmation dialog with customizable message and buttons
 */
export function createConfirmModal(options = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm = null,
    onCancel = null,
    confirmStyle = 'primary', // 'primary' or 'danger'
  } = options;
  
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="padding: 20px;">
      <div style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;">
        ${message}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="confirm-cancel-btn" style="font-family: 'Bangers', cursive; font-size: 1rem; padding: 10px 24px; background: #2a2a2a; color: #e4e4e4; border: 2px solid #444; border-radius: 4px; cursor: pointer; box-shadow: 2px 2px 0 #000;">
          ${cancelLabel}
        </button>
        <button class="confirm-confirm-btn" style="font-family: 'Bangers', cursive; font-size: 1rem; padding: 10px 24px; background: ${confirmStyle === 'danger' ? '#d63031' : '#4a9eff'}; color: #fff; border: 2px solid ${confirmStyle === 'danger' ? '#ff7675' : '#6bb0ff'}; border-radius: 4px; cursor: pointer; box-shadow: 2px 2px 0 #000;">
          ${confirmLabel}
        </button>
      </div>
    </div>
  `;
  
  // Create modal
  const modal = newModalSystem.createModal('confirm', title, content, { width: '450px' });
  
  // Button handlers
  const cancelBtn = content.querySelector('.confirm-cancel-btn');
  const confirmBtn = content.querySelector('.confirm-confirm-btn');
  
  [cancelBtn, confirmBtn].forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });
  });
  
  cancelBtn.addEventListener('click', () => {
    newModalSystem.closeModal('confirm');
    if (onCancel) onCancel();
  });
  
  confirmBtn.addEventListener('click', () => {
    newModalSystem.closeModal('confirm');
    if (onConfirm) onConfirm();
  });
  
  return modal;
}

/**
 * Create the All Power Cards catalog modal
 * Displays complete catalog of all power cards in the game
 */
export function createAllPowerCardsModal() {
  import('../domain/cards.js').then(({ buildBaseCatalog }) => {
    const allCards = buildBaseCatalog();
    
    // Sort by cost, then alphabetically
    allCards.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.name.localeCompare(b.name);
    });
    
    const content = document.createElement('div');
    content.className = 'all-cards-catalog';
    content.innerHTML = `
      <div class="all-cards-grid">
        ${allCards.map(card => `
          <div class="catalog-card" data-card-id="${card.id}">
            <div class="catalog-card-inner">
              <div class="catalog-card-front">
                <div class="catalog-card-header">
                  <span class="catalog-card-name">${card.name}</span>
                  ${card.darkEdition ? '<span class="catalog-dark-badge">DARK</span>' : ''}
                </div>
                <div class="catalog-card-cost">${card.cost}⚡</div>
                <div class="catalog-card-type">${card.type === 'keep' ? 'KEEP' : 'DISCARD'}</div>
                <div class="catalog-card-description-front">${card.description}</div>
                <button class="catalog-card-flip-btn" data-flip="${card.id}" title="Show details"><span style="font-style: italic; font-weight: bold; text-transform: lowercase;">i</span></button>
              </div>
              <div class="catalog-card-back">
                <div class="catalog-card-description">${card.description}</div>
                <div class="catalog-card-effect-details" style="margin-top: 12px; font-size: 11px; opacity: 0.8;">
                  ${card.effect ? `<strong>Effect:</strong> ${card.effect.kind} ${card.effect.value ? '(+' + card.effect.value + ')' : ''}` : ''}
                </div>
                <button class="catalog-card-flip-btn catalog-card-flip-btn-back" data-flip="${card.id}" title="Back to card">←</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    const modal = newModalSystem.createModal('all-power-cards-catalog', '🎴 All Power Cards', content, { width: '900px' });
    
    // Add flip animation handlers
    const modalElement = document.getElementById('all-power-cards-catalog');
    if (modalElement) {
      modalElement.querySelectorAll('[data-flip]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          // Use closest to handle clicks on child elements (like the span)
          const button = e.target.closest('[data-flip]');
          if (!button) return;
          const cardId = button.dataset.flip;
          const cardElement = modalElement.querySelector(`.catalog-card[data-card-id="${cardId}"]`);
          if (cardElement) {
            cardElement.classList.toggle('flipped');
          }
        });
      });
    }
    
    newModalSystem.showModal('all-power-cards-catalog');
  });
}

