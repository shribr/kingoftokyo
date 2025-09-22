/** ui/mountRoot.js */
import { store } from '../bootstrap/index.js';
import { eventBus } from '../core/eventBus.js';

// Registry for built components
const registry = new Map();

export async function mountRoot(configEntries) {
  const app = ensureAppRoot();
  const sorted = [...configEntries].sort((a,b) => a.order - b.order);
  for (const entry of sorted) {
    if (!entry.enabled) continue;
    const modFns = await resolveComponent(entry.build, entry.update);
    const inst = modFns.build({
      selector: entry.selector,
      initialState: entry.initialState,
      emit: (evt, payload) => eventBus.emit(evt, payload)
    });
    registry.set(entry.name, { entry, inst, modFns });
    const mountPoint = document.querySelector(entry.mountPoint) || app;
    mountPoint.appendChild(inst.root);
    // Initial update with slice state
    const stateSlice = sliceState(entry.stateKeys);
    inst.update({ state: stateSlice });
  }
  // Subscribe to store updates
  store.subscribe((state) => {
    for (const { entry, inst } of registry.values()) {
      if (!entry.stateKeys || !entry.stateKeys.length) continue;
      const slice = sliceState(entry.stateKeys, state);
      inst.update({ state: slice });
    }
  });
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
  // buildRef like "dice-tray.build" => path src/components/dice-tray/dice-tray.component.js
  const [folder, fnName] = buildRef.split('.');
  const module = await import(`../components/${folder}/${folder}.component.js`);
  return { build: module.build, update: module.update };
}

function sliceState(keys, fullState = store.getState()) {
  const result = {};
  for (const key of keys) result[key] = fullState[key];
  return result;
}
