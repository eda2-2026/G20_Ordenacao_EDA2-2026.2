(function (root) {
  'use strict';
  var registry = {
    me: { id: 'me', name: 'Você', color: 'spotify', kind: 'personal' },
    deezer: { id: 'deezer', name: 'Deezer', color: 'cyan', kind: 'chart' },
    itunes: { id: 'itunes', name: 'iTunes', color: 'coral', kind: 'chart' }
  };
  function loadSnapshot(snapshot) {
    snapshot = snapshot || root.RANK_SNAPSHOT;
    if (!snapshot || !Array.isArray(snapshot.sources)) throw new Error('Snapshot de rankings ausente ou inválido.');
    return snapshot.sources.map(function (source) {
      var meta = registry[source.id] || { id: source.id, name: source.name || source.id, color: 'cyan', kind: 'chart' };
      return { id: meta.id, name: meta.name, color: meta.color, kind: meta.kind, items: Array.isArray(source.items) ? source.items : [] };
    });
  }
  root.RankingSources = { registry: registry, loadSnapshot: loadSnapshot };
}(typeof globalThis !== 'undefined' ? globalThis : this));
