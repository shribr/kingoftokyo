/** assert.js - minimal dev assertions */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

export function invariant(condition, message) {
  if (!condition) {
    /* eslint-disable no-console */
    console.warn('[invariant]', message);
  }
}
