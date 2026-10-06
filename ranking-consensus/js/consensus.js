(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Consensus = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function list(source) { return Array.isArray(source && source.items) ? source.items : []; }
  function key(item) { return item && item.key != null ? String(item.key) : ''; }
  function position(item, index) { return Number.isFinite(item && item.position) ? item.position : index; }

  function bordaSuperRanking(sources) {
    var entries = Object.create(null);
    (Array.isArray(sources) ? sources : []).forEach(function (source) {
      var items = list(source);
      var m = items.length;
      items.forEach(function (item, index) {
        var itemKey = key(item);
        if (!itemKey) return;
        var p = position(item, index);
        var entry = entries[itemKey] || (entries[itemKey] = { item: item, points: 0, sources: [] });
        entry.points += Math.max(0, m - p);
        entry.sources.push({ id: source.id, position: p });
      });
    });
    return Object.keys(entries).map(function (itemKey) { return entries[itemKey]; })
      .filter(function (entry) { return entry.sources.length >= 2; })
      .sort(function (a, b) {
        return b.points - a.points || String(a.item.title || '').localeCompare(String(b.item.title || ''), 'pt-BR');
      });
  }

  function pairwiseDivergence(a, b) {
    var byB = Object.create(null), common = [];
    list(b).forEach(function (item, index) { byB[key(item)] = position(item, index); });
    list(a).forEach(function (item, index) {
      if (Object.prototype.hasOwnProperty.call(byB, key(item))) common.push({ key: key(item), a: position(item, index), b: byB[key(item)] });
    });
    var total = common.length * (common.length - 1) / 2;
    var inverted = Object.create(null);
    common.forEach(function (item) { inverted[item.key] = 0; });
    for (var i = 0; i < common.length; i += 1) for (var j = i + 1; j < common.length; j += 1) {
      if ((common[i].a - common[j].a) * (common[i].b - common[j].b) < 0) {
        inverted[common[i].key] += 1; inverted[common[j].key] += 1;
      }
    }
    var denominator = Math.max(1, common.length - 1);
    return common.map(function (entry) { return { key: entry.key, fraction: inverted[entry.key] / denominator }; });
  }

  function percentile(values, fraction) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var index = (sorted.length - 1) * fraction;
    var lower = Math.floor(index), upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function classify(item, scores) {
    var value = typeof item === 'number' ? item : Number(item && (item.fraction != null ? item.fraction : item.score));
    var values = (Array.isArray(scores) ? scores : []).map(function (entry) { return Number(entry && (entry.fraction != null ? entry.fraction : entry.score)); }).filter(Number.isFinite);
    if (!Number.isFinite(value)) return 'neutral';
    if (!values.length) values = [value];
    return value <= percentile(values, .25) ? 'safe' : value >= percentile(values, .75) ? 'bubble' : 'neutral';
  }

  function divergenceScores(sources) {
    var totals = Object.create(null), counts = Object.create(null), items = Object.create(null);
    for (var i = 0; i < (Array.isArray(sources) ? sources.length : 0); i += 1) {
      for (var j = i + 1; j < sources.length; j += 1) {
        pairwiseDivergence(sources[i], sources[j]).forEach(function (entry) {
          totals[entry.key] = (totals[entry.key] || 0) + entry.fraction;
          counts[entry.key] = (counts[entry.key] || 0) + 1;
        });
      }
    }
    (Array.isArray(sources) ? sources : []).forEach(function (source) { list(source).forEach(function (item) { if (key(item)) items[key(item)] = item; }); });
    var result = Object.keys(totals).map(function (itemKey) { return { item: items[itemKey], key: itemKey, fraction: totals[itemKey] / counts[itemKey] }; });
    result.forEach(function (entry) { entry.classification = classify(entry, result); });
    return result.sort(function (a, b) { return b.fraction - a.fraction; });
  }

  function matchRate(a, b) {
    var keys = Object.create(null), common = 0;
    list(a).forEach(function (item) { keys[key(item)] = true; });
    list(b).forEach(function (item) { if (keys[key(item)]) common += 1; });
    var pair = (a && a.id ? a.id : 'a') + ' x ' + (b && b.id ? b.id : 'b');
    return { pair: pair, common: common, comunes: common, min: Math.min(list(a).length, list(b).length), sufficient: common >= 15 };
  }

  return { bordaSuperRanking: bordaSuperRanking, divergenceScores: divergenceScores, classify: classify, matchRate: matchRate };
}));
