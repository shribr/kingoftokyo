/** ui/mountRoot.js */
import { eventBus } from '../core/eventBus.js';
import { selectActivePlayer, selectEffectQueueState } from '../core/selectors.js';

// Registry for built components
const registry = new Map();

export async function mountRoot(configEntries, store) {
  const app = ensureAppRoot();
  const sorted = [...configEntries].sort((a,b) => a.order - b.order);
  for (const entry of sorted) {
    if (!entry.enabled) continue;
  // (Diagnostics removed after resolving monsterSelection visibility issue)
    const modFns = await resolveComponent(entry.build, entry.update);
    if (!modFns || typeof modFns.build !== 'function') {
      console.error('[mountRoot] Failed to resolve build function for', entry.name, 'from refs', entry.build, entry.update, modFns);
      continue;
    }
    const inst = modFns.build({
      selector: entry.selector,
      initialState: entry.initialState,
      emit: (evt, payload) => eventBus.emit(evt, payload),
      dispatch: (action) => store.dispatch(action),
      getState: () => store.getState()
    });
  // (Build logging removed)
    // Determine mount region if mountPoint is generic #app
    let mountPoint;
    if (entry.mountPoint && entry.mountPoint !== '#app') {
      mountPoint = document.querySelector(entry.mountPoint);
    }
    if (!mountPoint) {
      const left = document.querySelector('[data-gl-left]');
      const center = document.querySelector('[data-gl-center-content]');
      const centerBottom = document.querySelector('[data-gl-center-bottom]');
      const right = document.querySelector('[data-gl-right]');
      const footer = document.querySelector('[data-gl-footer]');
      const n = entry.name.toLowerCase();
      // Layout heuristic mapping:
  // LEFT  = Power Cards panel ONLY per latest requirement.
      // RIGHT = Monsters / player profiles cluster + remaining ancillary panels.
      if (/arena/.test(n)) mountPoint = center;
    else if (/powercard|power-cards|powercardspanel|power-cards-panel/.test(n)) { mountPoint = left; console.log('[mountRoot] mapped', entry.name, '-> LEFT (power cards heuristic)'); } // Power Cards panel on left
      else if (/monsterspanel|monsterprofiles|monsterprofilesingle|playerprofile|playercards|player-card-list/.test(n)) mountPoint = right; // Monsters & player info on right
      else if (/dice/.test(n)) mountPoint = centerBottom; // dice lives center-bottom
      else if (/actionmenu/.test(n)) mountPoint = centerBottom; // action menu near dice
      else if (/toolbar/.test(n)) mountPoint = footer; // toolbar anchored footer
      else if (/effectqueue|effectinspector|peekmodal|carddetail|logfeed|settingsmodal|aidecisionmodal|gamelogmodal|aithoughtbubble/.test(n)) mountPoint = right; // ancillary panels default to right
      else mountPoint = right; // default other UI to right panel for now
    }
    // Support components that return a plain element
  const rootEl = inst?.root || inst;
  if (!rootEl) continue;
  // Keep instance shape consistent; do not attach module update to instance when build returns raw element
  const instance = inst?.root ? inst : { root: rootEl };
  registry.set(entry.name, { entry, inst: instance, modFns });
    mountPoint.appendChild(rootEl);
    // Initial update with slice state (guard if no stateKeys provided)
    const needsState = Array.isArray(entry.stateKeys) && entry.stateKeys.length > 0;
    const hasInstUpdate = inst && typeof inst.update === 'function';
    const hasModuleUpdate = typeof modFns.update === 'function';
    const instSrc = hasInstUpdate ? Function.prototype.toString.call(inst.update) : '';
    const looksNoop = hasInstUpdate && inst.update.length === 0 && /\{\s*\}/.test(instSrc);
    if (hasInstUpdate && !looksNoop) {
      if (needsState) {
        inst.update({ state: sliceState(entry.stateKeys, store.getState()) });
      } else {
        inst.update({ state: {} });
      }
    } else if (hasModuleUpdate) {
      if (needsState) {
        callUpdate(inst, modFns, { state: sliceState(entry.stateKeys, store.getState()) }, store.getState());
      } else {
        callUpdate(inst, modFns, { state: {} }, store.getState());
      }
    } else if (hasInstUpdate) {
      // As a last resort, call the instance update even if it looks like a no-op
      inst.update({ state: needsState ? sliceState(entry.stateKeys, store.getState()) : {} });
    }
  }
  // Subscribe to store updates
  store.subscribe((state) => {
    for (const { entry, inst, modFns } of registry.values()) {
      const hasInstUpdate = inst && typeof inst.update === 'function';
      const hasModuleUpdate = typeof modFns.update === 'function';
      const instSrc = hasInstUpdate ? Function.prototype.toString.call(inst.update) : '';
      const looksNoop = hasInstUpdate && inst.update.length === 0 && /\{\s*\}/.test(instSrc);
      const needsState = Array.isArray(entry.stateKeys) && entry.stateKeys.length > 0;
      if (hasInstUpdate && !looksNoop) {
        if (needsState) {
          inst.update({ state: sliceState(entry.stateKeys, state) });
        } else {
          inst.update({ state: {} });
        }
        continue;
      }
      if (!hasModuleUpdate) {
        if (hasInstUpdate) {
          inst.update({ state: needsState ? sliceState(entry.stateKeys, state) : {} });
        }
        continue;
      }
      if (!needsState) {
        callUpdate(inst, modFns, { state: {} }, state);
      } else {
        const slice = sliceState(entry.stateKeys, state);
        callUpdate(inst, modFns, { state: slice }, state);
      }
    }
    // AI thinking banner auto logic: show only if active player is AI and no effect currently processing but AI is in a pending decision window.
    try {
      const active = selectActivePlayer(state);
      const eq = selectEffectQueueState(state);
      // Heuristic: show when active AI player exists and queue not processing but phase indicates awaiting dice roll OR resolution choices.
      const phase = state.phase?.name || state.phase;
      const aiTurn = active && (active.isCPU || active.isAi || active.type === 'ai');
      const busy = !!eq.processing || document.querySelector('.cmp-ai-decision-modal:not([hidden])');
      const bannerShould = aiTurn && !busy && /roll|buy|resolve|start/i.test(phase || '');
      setAIThinking(bannerShould);
    } catch(_) {}
  });
}

function callUpdate(inst, modFns, payload, fullState) {
  const fn = modFns.update;
  if (typeof fn !== 'function') return;
  const el = inst?.root || inst;
  const ctx = { inst: inst?.root ? inst : { root: el }, state: payload?.state || {}, fullState };
  const src = Function.prototype.toString.call(fn);
  const likelyCtx = /\(\s*ctx\s*\)/.test(src);
  try {
    if (likelyCtx) {
      fn(ctx);
      return;
    }
    const ar = fn.length;
    if (ar <= 1) fn(el);
    else if (ar === 2) fn(el, payload);
    else if (ar === 3) fn(el, payload, payload.state);
    else fn(el, payload, payload.state, fullState);
  } catch (e) {
    // Fallback to alternate convention once if first attempt fails
    try {
      if (likelyCtx) {
        fn(el, payload, payload?.state, fullState);
      } else {
        fn(ctx);
      }
    } catch (e2) {
      console.error('Component update failed:', e2);
    }
  }
}

function ensureAppRoot() {
  let el = document.querySelector('#app');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app';
    document.body.appendChild(el);
  }
  // Inject layout shell once (idempotent)
  if (!document.querySelector('.game-layout-shell')) {
    const shell = document.createElement('div');
    shell.className = 'game-layout-shell';
    shell.innerHTML = `
      <header class="gl-header"><h1 class="gl-title" data-game-title>King of Tokyo</h1><div class="ai-thinking-banner" data-ai-thinking hidden><span class="label">AI Thinking</span><span class="dots" aria-hidden="true"></span></div></header>
      <div class="gl-main">
        <div class="gl-left" data-gl-left></div>
        <div class="gl-center" data-gl-center>
          <div class="gl-center-content" data-gl-center-content></div>
          <div class="gl-center-bottom" data-gl-center-bottom></div>
        </div>
        <div class="gl-right" data-gl-right></div>
      </div>
      <footer class="gl-footer" data-gl-footer></footer>`;
    el.appendChild(shell);
  }
  return el;
}

// Simple API to toggle AI thinking indicator (can be called from AI decision pipeline)
export function setAIThinking(isThinking) {
  const banner = document.querySelector('[data-ai-thinking]');
  if (!banner) return;
  if (isThinking) {
    if (banner.hasAttribute('hidden')) banner.removeAttribute('hidden');
    // Ensure dot element has three phases (using ::before, ::after plus span)
    if (!banner.querySelector('.dots span')) {
      const span = document.createElement('span');
      banner.querySelector('.dots')?.appendChild(span);
    }
    banner.classList.remove('out');
  } else {
    banner.classList.add('out');
    banner.addEventListener('animationend', () => {
      if (banner.classList.contains('out')) banner.setAttribute('hidden','');
    }, { once:true });
  }
}

async function resolveComponent(buildRef, updateRef) {
  const [folder, buildName] = buildRef.split('.');
  const pas = (s) => s.split('-').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join('');
  const tryLoad = async (folderName) => {
    const module = await import(`../components/${folderName}/${folderName}.component.js`);
    let build = module.build || module.default?.build;
    if (!build && buildName) build = module[buildName];
    if (!build) build = module[`build${pas(folderName)}`];
    let update = module.update || module.default?.update;
    if (updateRef) {
      const [, updateName] = updateRef.split('.');
      if (updateName && module[updateName]) update = module[updateName];
    }
    if (!update) update = module[`update${pas(folderName)}`];
    return { build, update };
  };
  return await tryLoad(folder);
}

function sliceState(keys, fullState) {
  const result = {};
  if (!Array.isArray(keys)) return result;
  for (const key of keys) result[key] = fullState[key];
  return result;
}
