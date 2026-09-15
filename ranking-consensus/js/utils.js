(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RankingConsensusUtils = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FEAT_SUFFIX = /\s+(?:\(|\[)?\s*(?:feat\.?|ft\.?)\b[^)\]]*(?:\)|\])?\s*$/i;
  var REMIX_SUFFIX = /\s+(?:\(|\[)?\s*(?:\d{4}\s+)?(?:remix|mix|edit)\b[^)\]]*(?:\)|\])?\s*$/i;

  function asText(value) {
    return value == null ? '' : String(value);
  }

  function stripMarks(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function removeVersionSuffixes(value) {
    var result = value;
    var previous;

    // Only remove parenthetical/bracketed suffixes when they identify a
    // release variant, rather than deleting arbitrary title content.
    do {
      previous = result;
      result = result.replace(FEAT_SUFFIX, '')
        .replace(REMIX_SUFFIX, '')
        .replace(/\s*[([\{][^\])}]*\b(?:explicit|deluxe|remaster(?:ed)?|bonus(?: track)?|live|radio edit|album version|original mix|extended mix)\b[^\])}]*[)\]}]\s*$/i, '')
        .replace(/\s+\b(?:explicit|deluxe|remaster(?:ed)?|bonus(?: track)?|live|radio edit|album version|original mix|extended mix)\b\s*$/i, '');
    } while (result !== previous);

    return result;
  }

  function normalizeText(value, removeSuffixes) {
    var result = stripMarks(asText(value)).toLowerCase();
    if (removeSuffixes) result = removeVersionSuffixes(result);
    // Punctuation is a separator, not a concatenation: "A.B" => "a b".
    result = result.replace(/[^a-z0-9]+/g, ' ');
    return result.trim().replace(/\s+/g, ' ');
  }

  function normalizeTitle(title) {
    return normalizeText(title, true);
  }

  function normalizeArtist(artist) {
    // Platform artist fields commonly contain the featured artist after a
    // comma. Matching the credited lead artist is deliberately conservative.
    return normalizeText(asText(artist).split(',')[0], false);
  }

  function normalizeKey(title, artist) {
    return normalizeTitle(title) + '|' + normalizeArtist(artist);
  }

  function itemKey(item) {
    item = item || {};
    return normalizeKey(item.title, item.artist);
  }

  function cloneWithPosition(item, position) {
    var copy = {};
    Object.keys(item || {}).forEach(function (name) {
      copy[name] = item[name];
    });
    copy.position = position;
    return copy;
  }

  function dedupeByKey(items) {
    var best = Object.create(null);
    var order = [];

    (Array.isArray(items) ? items : []).forEach(function (item, index) {
      var key = itemKey(item);
      var position = Number.isFinite(item && item.position) ? item.position : index;
      if (!Object.prototype.hasOwnProperty.call(best, key)) {
        best[key] = { item: item, position: position, index: index };
        order.push(key);
      } else if (position < best[key].position) {
        best[key] = { item: item, position: position, index: index };
      }
    });

    return order.map(function (key) {
      return cloneWithPosition(best[key].item, best[key].position);
    }).sort(function (a, b) {
      return a.position - b.position;
    });
  }

  function reRank(items, keys) {
    var source = Array.isArray(items) ? items : [];
    var ordered = source.slice();

    // With an explicit key order, align items to that order before assigning
    // positions. Without it, retain the historical input-order behavior.
    if (Array.isArray(keys)) {
      var positions = Object.create(null);
      keys.forEach(function (key, index) {
        if (!Object.prototype.hasOwnProperty.call(positions, key)) {
          positions[key] = index;
        }
      });

      ordered = ordered.map(function (item, index) {
        var key = itemKey(item);
        return {
          item: item,
          index: index,
          order: Object.prototype.hasOwnProperty.call(positions, key)
            ? positions[key]
            : keys.length + index
        };
      }).sort(function (a, b) {
        return a.order - b.order || a.index - b.index;
      }).map(function (entry) {
        return entry.item;
      });
    }

    return ordered.map(function (item, index) {
      return cloneWithPosition(item, index);
    });
  }

  function intersectByKey(itemsA, itemsB) {
    var uniqueA = dedupeByKey(itemsA);
    var uniqueB = dedupeByKey(itemsB);
    var keysB = Object.create(null);
    uniqueB.forEach(function (item) {
      keysB[itemKey(item)] = true;
    });

    var commonA = uniqueA.filter(function (item) {
      return Object.prototype.hasOwnProperty.call(keysB, itemKey(item));
    });
    var commonKeys = commonA.map(itemKey);
    var commonSet = Object.create(null);
    commonKeys.forEach(function (key) { commonSet[key] = true; });
    var commonB = uniqueB.filter(function (item) {
      return Object.prototype.hasOwnProperty.call(commonSet, itemKey(item));
    });

    return {
      keys: commonKeys,
      itemsA: reRank(commonA),
      itemsB: reRank(commonB),
      size: commonKeys.length
    };
  }

  return {
    normalizeTitle: normalizeTitle,
    normalizeArtist: normalizeArtist,
    normalizeKey: normalizeKey,
    dedupeByKey: dedupeByKey,
    reRank: reRank,
    intersectByKey: intersectByKey
  };
}));
