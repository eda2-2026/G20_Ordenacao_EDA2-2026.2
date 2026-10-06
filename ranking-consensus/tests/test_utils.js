'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const Utils = require('../js/utils');

test('normalizes accents, case, punctuation, features, remixes and live suffixes', () => {
  assert.equal(Utils.normalizeKey('Coração (Live) feat. Ana', 'Beyoncé, Guest'), 'coracao|beyonce');
  assert.equal(Utils.normalizeKey('Song [2024 Remix]', 'A.B.'), 'song|a b');
  assert.equal(Utils.normalizeArtist('A, B'), 'a');
});

test('dedupeByKey keeps the best (lowest) position and does not mutate input', () => {
  const input = [
    { title: 'Song', artist: 'Artist', position: 4, extra: 'late' },
    { title: 'Other', artist: 'Artist', position: 1 },
    { title: 'Song (Live)', artist: 'Artist', position: 2, extra: 'best' }
  ];
  const original = JSON.parse(JSON.stringify(input));
  assert.deepEqual(Utils.dedupeByKey(input), [
    { title: 'Other', artist: 'Artist', position: 1 },
    { title: 'Song (Live)', artist: 'Artist', position: 2, extra: 'best' }
  ]);
  assert.deepEqual(input, original);
});

test('real ranking keys match the original normalization', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const files = ['deezer.json', 'itunes.json', 'spotify_me.json'];
  const mismatches = [];

  files.forEach(file => {
    const items = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')).items;
    items.forEach((item, index) => {
      const normalized = Utils.normalizeKey(item.title, item.artist);
      if (normalized !== item.key) {
        mismatches.push(`${file}[${index}]: ${normalized} !== ${item.key}`);
      }
    });
  });

  assert.deepEqual(mismatches, []);
});

test('intersectByKey returns common keys in each ranking order with zero-based ranks', () => {
  const a = [{ title: 'A', artist: 'X', position: 0 }, { title: 'B', artist: 'X', position: 1 }, { title: 'C', artist: 'X', position: 2 }];
  const b = [{ title: 'C', artist: 'X', position: 0 }, { title: 'A', artist: 'X', position: 1 }, { title: 'D', artist: 'X', position: 2 }];
  const result = Utils.intersectByKey(a, b);
  assert.deepEqual(result.keys, ['a|x', 'c|x']);
  assert.deepEqual(result.itemsA.map(item => [item.title, item.position]), [['A', 0], ['C', 1]]);
  assert.deepEqual(result.itemsB.map(item => [item.title, item.position]), [['C', 0], ['A', 1]]);
  assert.deepEqual(a, [{ title: 'A', artist: 'X', position: 0 }, { title: 'B', artist: 'X', position: 1 }, { title: 'C', artist: 'X', position: 2 }]);
});

test('reRank follows explicit key order, assigns zero-based positions and does not mutate', () => {
  const input = [{ title: 'B', artist: 'X', position: 8 }, { title: 'A', artist: 'X', position: 9 }];
  const result = Utils.reRank(input, ['a|x', 'b|x']);
  assert.deepEqual(result.map(item => [item.title, item.position]), [['A', 0], ['B', 1]]);
  assert.deepEqual(input.map(item => item.position), [8, 9]);
});
