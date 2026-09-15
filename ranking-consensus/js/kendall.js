(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./mergesort'));
  } else {
    root.Kendall = factory(root.MergeSort);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (mergeSortModule) {
  'use strict';

  if (!mergeSortModule || typeof mergeSortModule.countInversions !== 'function') {
    throw new Error('MergeSort module is required');
  }

  function validateRanking(rankA, rankB) {
    if (!Array.isArray(rankA) || !Array.isArray(rankB)) {
      throw new TypeError('Rankings must be arrays');
    }
    if (rankA.length !== rankB.length) {
      throw new RangeError('Rankings must have the same length');
    }

    var seenA = new Set();
    var seenB = new Set();
    rankA.forEach(function (item) {
      if (seenA.has(item)) {
        throw new RangeError('Rankings must not contain duplicate items');
      }
      seenA.add(item);
    });
    rankB.forEach(function (item) {
      if (seenB.has(item)) {
        throw new RangeError('Rankings must not contain duplicate items');
      }
      seenB.add(item);
      if (!seenA.has(item)) {
        throw new RangeError('Rankings must contain the same items');
      }
    });

    return true;
  }

  function kendallTau(rankA, rankB) {
    validateRanking(rankA, rankB);

    var n = rankA.length;
    var total = n * (n - 1) / 2;
    if (n < 2) {
      return {
        tau: null,
        concordante: 0,
        discordante: 0,
        total: 0,
        n: n
      };
    }

    var positionInB = new Map();
    rankB.forEach(function (item, position) {
      positionInB.set(item, position);
    });

    var orderInB = rankA.map(function (item) {
      return positionInB.get(item);
    });
    var discordante = mergeSortModule.countInversions(orderInB);
    var concordante = total - discordante;

    return {
      tau: (concordante - discordante) / total,
      concordante: concordante,
      discordante: discordante,
      total: total,
      n: n
    };
  }

  return {
    kendallTau: kendallTau,
    validateRanking: validateRanking
  };
}));
