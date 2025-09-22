import { rollDice, tallyFaces, extractTriples, DIE_FACES } from '../domain/dice.js';

(function testRollDiceLength() {
  const faces = rollDice({ count: 6 });
  if (faces.length !== 6) throw new Error('Expected 6 faces');
})();

(function testKeptPreserved() {
  const first = rollDice({ count: 2 });
  first[0].kept = true;
  const second = rollDice({ count: 2, currentFaces: first, rng: () => 0 });
  if (second[0].value !== first[0].value) throw new Error('Kept die should preserve value');
})();

(function testTallyAndTriples() {
  const mock = [ '1','1','1','claw','energy','heart' ].map(v => ({ value: v, kept: false }));
  const tally = tallyFaces(mock);
  if (tally['1'] !== 3) throw new Error('Triple 1 tally incorrect');
  const triples = extractTriples(tally);
  if (!triples.length || triples[0].number !== 1) throw new Error('Failed to detect triple');
})();

(function testFaceValidityDistribution() {
  const counts = Object.fromEntries(DIE_FACES.map(f => [f,0]));
  for (let i=0;i<600;i++) {
    const r = rollDice({ count: 1 })[0].value;
    if (!(r in counts)) throw new Error('Invalid face rolled: '+r);
    counts[r]++;
  }
  // Soft check: all faces observed at least once
  for (const f of DIE_FACES) {
    if (counts[f] === 0) throw new Error('Face never appeared: '+f);
  }
})();

console.log('[test] dice.domain.spec OK');
