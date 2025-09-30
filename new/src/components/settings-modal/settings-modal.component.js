import { uiSettingsClose, settingsUpdated } from '../../core/actions.js';

export function build(ctx) {
  const root = document.createElement('div');
  root.className = 'cmp-settings-modal modal-shell';
  root.innerHTML = `
    <div class="modal settings" data-settings-modal>
      <div class="modal-header"><h2>Game Settings</h2><button data-close>×</button></div>
      <div class="modal-body" data-tabs-root>
        <div class="settings-tabs" style="display:flex;gap:6px;margin-bottom:10px;">
          <button type="button" data-tab-btn="general" class="is-active" style="padding:4px 10px;font-size:12px;">General</button>
          <button type="button" data-tab-btn="scenarios" style="padding:4px 10px;font-size:12px;">Scenarios</button>
        </div>
        <div data-tab-panel="general" class="tab-panel" style="display:block;">
         <form data-settings-form>
           <div class="field">
             <label for="cpuSpeed">CPU Speed</label>
             <select id="cpuSpeed" name="cpuSpeed">
               <option value="slow">Slow</option>
               <option value="normal">Normal</option>
               <option value="fast">Fast</option>
             </select>
           </div>
           <div class="field">
             <label><input type="checkbox" name="showThoughtBubbles"> Show Thought Bubbles</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="autoActivateMonsters"> Auto Activate Monsters</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="autoStartInTest"> Auto Start In Test (skipintro)</label>
           </div>
           <div class="field">
             <label><input type="checkbox" name="disableAnimations"> Disable Non-Essential Animations</label>
           </div>
           <div class="actions">
             <button type="button" data-close>Close</button>
           </div>
         </form>
        </div>
        <div data-tab-panel="scenarios" class="tab-panel" style="display:none;">
          <div data-scenarios-config></div>
        </div>
      </div>
    </div>`;
  root.querySelector('[data-close]').addEventListener('click', () => window.__KOT_NEW__.store.dispatch(uiSettingsClose()));
  bindTabs(root);
  const form = root.querySelector('[data-settings-form]');
  form.addEventListener('change', (e) => {
    const fd = new FormData(form);
    const partial = {
      cpuSpeed: fd.get('cpuSpeed'),
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]').checked,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]').checked,
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]').checked,
      disableAnimations: form.querySelector('input[name="disableAnimations"]').checked
    };
    window.__KOT_NEW__.store.dispatch(settingsUpdated(partial));
  });
  return { root, update: (p) => update(p) };
}

export function update(ctx) {
  const state = ctx.fullState || ctx.state || {};
  const root = ctx.inst?.root || ctx.root || (ctx instanceof HTMLElement ? ctx : null);
  if (!root || !root.querySelector) return; // defensive guard during early mount race
  const open = state.ui?.settings?.open;
  if (root.style) root.style.display = open ? 'flex' : 'none';
  root.classList.toggle('is-open', !!open);
  if (open) {
    try { window.__KOT_BLACKOUT__?.hide(); } catch(_) {}
    // Ensure modal-shell is above general overlays
    try { root.style.zIndex = '12000'; } catch(_) {}
  }
  if (!open) return;
  ensureScenarioConfigMounted(root);
  const settings = state.settings;
  if (settings) {
    const cpu = root.querySelector('select[name="cpuSpeed"]');
    if (cpu && cpu.value !== settings.cpuSpeed) cpu.value = settings.cpuSpeed;
    const bubble = root.querySelector('input[name="showThoughtBubbles"]');
    if (bubble) bubble.checked = !!settings.showThoughtBubbles;
  const auto = root.querySelector('input[name="autoActivateMonsters"]');
  if (auto) auto.checked = !!settings.autoActivateMonsters;
  const autoStart = root.querySelector('input[name="autoStartInTest"]');
  if (autoStart) autoStart.checked = !!settings.autoStartInTest;
  const disAnim = root.querySelector('input[name="disableAnimations"]');
  if (disAnim) disAnim.checked = !!settings.disableAnimations;
  }
}

function bindTabs(root){
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-tab-btn]');
    if (!btn) return;
    const target = btn.getAttribute('data-tab-btn');
    root.querySelectorAll('[data-tab-btn]').forEach(b=>b.classList.toggle('is-active', b===btn));
    root.querySelectorAll('[data-tab-panel]').forEach(p=>{
      p.style.display = (p.getAttribute('data-tab-panel') === target) ? 'block' : 'none';
    });
  });
}

function ensureScenarioConfigMounted(root){
  const host = root.querySelector('[data-scenarios-config]');
  if (!host || host._scenarioMounted) return;
  host._scenarioMounted = true;
  // Lazy import existing scenarios tab component and embed its content/summarization
  import('../scenarios-tab/scenarios-tab.component.js').then(mod => {
    const inst = mod.build({});
    host.appendChild(inst.root);
    window.__KOT_NEW__.store.subscribe(()=>inst.update());
  }).catch(err => {
    host.innerHTML = `<em style='color:#a55;'>Failed to load scenarios UI (${err?.message||'error'}).</em>`;
  });
}
