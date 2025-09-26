// Legacy AI thought bubble removed per request. Keeping a no-op stub so any existing
// config referencing this component does not break mounting logic.
export function build() {
  const root = document.createElement('div');
  root.className = 'cmp-ai-thought-bubble';
  root.style.display = 'none';
  root.setAttribute('aria-hidden','true');
  return { root, update: () => {} };
}

export function update() { /* noop */ }