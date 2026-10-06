'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

globalThis.RankingConsensusUtils = require('../js/utils');
globalThis.Kendall = require('../js/kendall');
globalThis.Consensus = require('../js/consensus');
globalThis.RankingSources = {
  loadSnapshot(snapshot) { return snapshot.sources; }
};
require('../js/app');

test('analyze uses canonical item identity for Kendall rankings', () => {
  const snapshot = {
    sources: [
      { id: 'a', name: 'A', items: [
        { key: 'stale-key', title: 'First Song', artist: 'Artist', position: 0 },
        { key: 'second song|artist', title: 'Second Song', artist: 'Artist', position: 1 }
      ] },
      { id: 'b', name: 'B', items: [
        { key: 'first song|artist', title: 'First Song', artist: 'Artist', position: 0 },
        { key: 'second song|artist', title: 'Second Song', artist: 'Artist', position: 1 }
      ] }
    ]
  };

  assert.doesNotThrow(() => globalThis.RankingConsensusApp.analyze(snapshot));
  const result = globalThis.RankingConsensusApp.analyze(snapshot);
  assert.equal(result.pairs[0].n, 2);
  assert.equal(result.correlations['a|b'].tau, 1);
});
