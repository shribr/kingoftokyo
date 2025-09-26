/** audioService.js
 * Minimal audio subsystem: channel registry + global mute tied to settings.soundMuted.
 */
const channels = new Map();
let storeRef = null;
let unsub = null;

export function initAudio(store) {
  storeRef = store;
  // Subscribe to settings changes
  if (unsub) unsub();
  unsub = store.subscribe(() => {
    const st = store.getState();
    const muted = !!st.settings?.soundMuted;
    channels.forEach(ch => {
      ch.volume = muted ? 0 : ch._baseVolume;
    });
  });
}

export function registerSound(key, url, { volume = 0.6 } = {}) {
  if (channels.has(key)) return channels.get(key);
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio._baseVolume = volume;
  audio.volume = volume;
  channels.set(key, audio);
  return audio;
}

export function play(key, { url, volume } = {}) {
  let audio = channels.get(key);
  if (!audio && url) audio = registerSound(key, url, { volume });
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play();
  } catch(_) {}
}

export function setVolume(key, vol) {
  const a = channels.get(key); if (!a) return; a._baseVolume = vol; const muted = !!storeRef?.getState().settings?.soundMuted; a.volume = muted?0:vol; }
