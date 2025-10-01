/**
 * domain/dice.js
 * Pure dice logic for King of Tokyo style dice.
 * Faces: 1,2,3,claw,energy,heart
 */

export const DIE_FACES = ['1','2','3','claw','energy','heart'];

/**
 * Roll a single die face using provided RNG.
 * @param {Function} rng - function returning float in [0,1)
 * @returns {string} face value
 */
export function rollFace(rng = Math.random) {
  const idx = Math.floor(rng() * DIE_FACES.length);
  return DIE_FACES[idx];
}

/**
 * Roll N dice with kept indices preserved.
 * @param {Object} params
 * @param {Array<{value:string, kept:boolean}>} params.currentFaces - current dice state (may be empty)
 * @param {number} params.count - total dice count desired
 * @param {Function} [params.rng] - RNG function
 * @returns {Array<{value:string, kept:boolean}>}
 */
export function rollDice({ currentFaces = [], count = 6, rng = Math.random } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const existing = currentFaces[i];
    if (existing && existing.kept) {
      out.push(existing); // preserve kept die
    } else {
      out.push({ value: rollFace(rng), kept: existing ? existing.kept : false });
    }
  }
  return out;
}

/**
 * Count occurrences of each face.
 * @param {Array<{value:string}>} faces
 * @returns {Record<string, number>}
 */
export function tallyFaces(faces) {
  const tally = Object.create(null);
  for (const face of DIE_FACES) tally[face] = 0;
  for (const f of faces) {
    if (tally[f.value] !== undefined) tally[f.value]++;
  }
  return tally;
}

/**
 * Determine scoring triples for numeric faces.
 * @param {Record<string,number>} tally
 * @returns {Array<{number:number, count:number}>}
 */
export function extractTriples(tally) {
  const results = [];
  ['1','2','3'].forEach(n => {
    if (tally[n] >= 3) {
      results.push({ number: Number(n), count: tally[n] });
    }
  });
  return results;
}
