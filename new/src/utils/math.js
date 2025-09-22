/** math.js - small math helpers */
export function clamp(value, min, max) { return value < min ? min : value > max ? max : value; }
export function sum(arr) { return arr.reduce((a,b) => a + b, 0); }
export function average(arr) { return arr.length ? sum(arr) / arr.length : 0; }
