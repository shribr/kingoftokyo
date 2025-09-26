import { uiSettingsClose, settingsUpdated } from '../../core/actions.js';

export function build(ctx) {
  const root = document.createElement('div');
  root.className = 'cmp-settings-modal modal-shell';
  root.innerHTML = `
    <div class="modal settings" data-settings-modal>
      <div class="modal-header"><h2>Game Settings</h2><button data-close>×</button></div>
      <div class="modal-body">
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
           <div class="actions">
             <button type="button" data-close>Close</button>
           </div>
         </form>
      </div>
    </div>`;
  root.querySelector('[data-close]').addEventListener('click', () => window.__KOT_NEW__.store.dispatch(uiSettingsClose()));
  const form = root.querySelector('[data-settings-form]');
  form.addEventListener('change', (e) => {
    const fd = new FormData(form);
    const partial = {
      cpuSpeed: fd.get('cpuSpeed'),
      showThoughtBubbles: form.querySelector('input[name="showThoughtBubbles"]').checked,
      autoActivateMonsters: form.querySelector('input[name="autoActivateMonsters"]').checked,
      autoStartInTest: form.querySelector('input[name="autoStartInTest"]').checked
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
  if (root.style) root.style.display = open ? 'block' : 'none';
  if (!open) return;
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
  }
}
