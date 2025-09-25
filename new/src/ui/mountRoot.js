/** ui/mountRoot.js */
import { eventBus } from '../core/eventBus.js';

// Registry for built components
const registry = new Map();

export async function mountRoot(configEntries, store) {
  const app = ensureAppRoot();
  const sorted = [...configEntries].sort((a,b) => a.order - b.order);
  for (const entry of sorted) {
    if (!entry.enabled) continue;
    const modFns = await resolveComponent(entry.build, entry.update);
    const inst = modFns.build({
      selector: entry.selector,
      initialState: entry.initialState,
      emit: (evt, payload) => eventBus.emit(evt, payload),
      dispatch: (action) => store.dispatch(action),
      getState: () => store.getState()
    });
    const mountPoint = document.querySelector(entry.mountPoint) || app;
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
  return el;
}

async function resolveComponent(buildRef, updateRef) {
  const [folder, buildName] = buildRef.split('.');
  const module = await import(`../components/${folder}/${folder}.component.js`);
  const pas = (s) => s.split('-').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join('');
  // Resolve build
  let build = module.build || module.default?.build;
  if (!build && buildName) build = module[buildName];
  if (!build) build = module[`build${pas(folder)}`];
  // Resolve update
  let update = module.update || module.default?.update;
  if (updateRef) {
    const [, updateName] = updateRef.split('.');
    if (updateName && module[updateName]) update = module[updateName];
  }
  if (!update) update = module[`update${pas(folder)}`];
  return { build, update };
}

function sliceState(keys, fullState) {
  const result = {};
  if (!Array.isArray(keys)) return result;
  for (const key of keys) result[key] = fullState[key];
  return result;
}
