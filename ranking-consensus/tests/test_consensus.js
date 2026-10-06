'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Consensus = require('../js/consensus');

const source = (id, items) => ({ id, items: items.map((key, position) => ({ key, title: key, artist: 'A', position })) });

test('Borda scores only items present in at least two sources', () => {
  const result = Consensus.bordaSuperRanking([source('a', ['x', 'y', 'z']), source('b', ['y', 'x', 'q'])]);
  assert.deepEqual(result.map(entry => [entry.item.key, entry.points]), [['x', 5], ['y', 5]]);
  assert.equal(result[0].sources.length, 2);
});

test('Borda handles empty and tied inputs deterministically', () => {
  assert.deepEqual(Consensus.bordaSuperRanking([]), []);
  const result = Consensus.bordaSuperRanking([source('a', ['x']), source('b', ['x'])]);
  assert.equal(result[0].points, 2);
});

test('matchRate reports threshold and aliases', () => {
  const result = Consensus.matchRate(source('a', ['x']), source('b', ['x', 'y']));
  assert.deepEqual(result, { pair: 'a x b', common: 1, comunes: 1, min: 1, sufficient: false });
});

test('divergence and classification separate agreement from disagreement', () => {
  const result = Consensus.divergenceScores([source('a', ['x', 'y', 'z']), source('b', ['z', 'y', 'x'])]);
  assert.equal(result.length, 3);
  assert.equal(result.find(entry => entry.key === 'y').fraction, 1);
  assert.ok(result.every(entry => entry.classification === 'safe'));
});

test('classify is stable for missing and singleton values', () => {
  assert.equal(Consensus.classify({}), 'neutral');
  assert.equal(Consensus.classify({ fraction: 0 }, [{ fraction: 0 }]), 'safe');
});

test('classify uses the score distribution percentiles', () => {
  const scores = [{ fraction: 0 }, { fraction: 0.2 }, { fraction: 0.5 }, { fraction: 1 }];
  assert.equal(Consensus.classify({ fraction: 0 }, scores), 'safe');
  assert.equal(Consensus.classify({ fraction: 0.5 }, scores), 'neutral');
  assert.equal(Consensus.classify({ fraction: 1 }, scores), 'bubble');
});
