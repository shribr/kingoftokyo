/** ui/mountRoot.js */
import { eventBus } from '../core/eventBus.js';
import { store } from '../bootstrap/index.js';
import { selectActivePlayer, selectEffectQueueState } from '../core/selectors.js';

// Registry for built components
const registry = new Map();

export async function mountRoot(configEntries, store) {
  const app = ensureAppRoot();
  const sorted = [...configEntries].sort((a,b) => a.order - b.order);
  for (const entry of sorted) {
    if (!entry.enabled) continue;
    
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
  else if (/powercard|power-cards|powercardspanel|power-cards-panel/.test(n)) { mountPoint = left; } // Power Cards panel on left
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
    
    // Debug logging for radial/mini components
    if (entry.name && (entry.name.toLowerCase().includes('radial') || entry.name.toLowerCase().includes('mini'))) {
      console.log('[mountRoot] 📍 Mounting component:', entry.name, {
        mountPoint: mountPoint?.tagName || mountPoint?.className || 'unknown',
        rootElement: rootEl?.tagName,
        rootClass: rootEl?.className
      });
    }
    
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
      const aiTurn = active && (active.isCPU || active.isAI || active.isAi || active.type === 'ai' || active.type === 'cpu');
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
  <header class="gl-header">
    <div class="gl-head-spacer gl-head-left" data-gl-head-left></div>
    <h1 class="gl-title" data-game-title>King of Tokyo</h1>
    <div class="gl-head-spacer gl-head-right" data-gl-head-right>
      <div class="ai-thinking-banner" data-ai-thinking hidden><span class="label">AI Thinking</span><span class="dots" aria-hidden="true"></span></div>
    </div>
  </header>
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
  
  // Add window resize listener to reposition AI banner when screen size changes
  if (!window._aibannerResizeListenerAdded) {
    window.addEventListener('resize', () => {
      const banner = document.querySelector('[data-ai-thinking]');
      if (banner && !banner.hasAttribute('hidden')) {
        // Trigger repositioning check when window resizes
        setAIThinking(true);
      }
    });
    window._aibannerResizeListenerAdded = true;
  }
  
  return el;
}

// Simple API to toggle AI thinking indicator (can be called from AI decision pipeline)
export function setAIThinking(isThinking) {
  const banner = document.querySelector('[data-ai-thinking]');
  if (!banner) {
    console.log('❌ AI thinking banner not found');
    return;
  }
  // Only show when active player is CPU (ai flags)
  try {
    const st = store.getState();
    const active = selectActivePlayer(st);
    const isCpu = !!(active && (active.isCPU || active.isAI || active.isAi || active.type === 'ai' || active.type === 'cpu'));
    if (!isCpu) {
      isThinking = false; // force hide if human turn
    }
  } catch(_) {}
  
  // Check if should be in footer (width < 1100px or mobile touch)
  const shouldBeInFooter = window.innerWidth < 1100 || matchMedia('(pointer: coarse)').matches;
  const footer = document.querySelector('.gl-footer');
  
  console.log('🤖 AI thinking banner check:', {
    isThinking,
    shouldBeInFooter,
    windowWidth: window.innerWidth,
    isTouch: matchMedia('(pointer: coarse)').matches,
    bannerParent: banner.parentElement?.className,
    footerExists: !!footer
  });
  
  const moveToFooter = () => {
    if (!footer) return;
    if (banner.classList.contains('footer-positioned')) return; // already
    banner.classList.add('footer-enter');
    footer.appendChild(banner);
    requestAnimationFrame(() => {
      banner.classList.add('footer-positioned','footer-enter-active');
      banner.addEventListener('transitionend', () => {
        banner.classList.remove('footer-enter','footer-enter-active');
      }, { once:true });
    });
  };
  const moveToHeader = () => {
    if (!banner.classList.contains('footer-positioned')) return; // already header
    banner.classList.add('footer-exit');
    // animate while still in footer, then move
    banner.classList.add('footer-exit-active');
    banner.addEventListener('transitionend', () => {
      const rightSpacer = document.querySelector('.gl-head-right');
      if (rightSpacer) {
        rightSpacer.appendChild(banner);
        banner.classList.remove('footer-positioned','footer-exit','footer-exit-active');
      }
    }, { once:true });
  };
  if (shouldBeInFooter) moveToFooter(); else moveToHeader();
  
  const applyActiveState = () => {
    if (!banner.querySelector('.dots span')) {
      const span = document.createElement('span');
      banner.querySelector('.dots')?.appendChild(span);
    }
    banner.classList.add('is-active');
    banner.classList.remove('out','leaving');
    banner.removeAttribute('hidden');
  };
  const applyInactiveState = () => {
    banner.classList.add('leaving');
    banner.classList.remove('is-active');
    const onDone = () => {
      if (!banner.classList.contains('is-active')) {
        banner.setAttribute('hidden','');
      }
      banner.removeEventListener('transitionend', onDone);
      banner.classList.remove('leaving');
    };
    banner.addEventListener('transitionend', onDone);
  };
  if (isThinking) applyActiveState(); else applyInactiveState();
}

async function resolveComponent(buildRef, updateRef) {
  const [folder, buildName] = buildRef.split('.');
  
  // Debug logging for radial/mini components
  if (folder && (folder.includes('radial') || folder.includes('mini'))) {
    console.log('[resolveComponent] 🔍 Attempting to load:', folder, {
      buildRef,
      updateRef,
      expectedPath: `../components/${folder}/${folder}.component.js`
    });
  }
  
  const pas = (s) => s.split('-').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join('');
  const tryLoad = async (folderName) => {
    let module;
    try {
      module = await import(`../components/${folderName}/${folderName}.component.js`);
    } catch(e) {
      console.error('[resolveComponent] dynamic import failed for', folderName, e);
      throw e;
    }
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
