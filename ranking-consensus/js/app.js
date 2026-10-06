(function (root) {
  'use strict';
  function hook(name) { return document.querySelector('[data-hook="' + name + '"]'); }
  function text(node, value) { if (node) node.textContent = value; }
  function formatTau(value) { return value == null || !Number.isFinite(value) ? '—' : (value >= 0 ? '+' : '') + value.toFixed(2); }
  function heatClass(value) { return value >= .35 ? 'alta' : value <= -.35 ? 'baixa' : 'média'; }
  function pairName(a, b) { return a.name + ' × ' + b.name; }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function element(tag, className, value) { var node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = value; return node; }

  function analyze(snapshot) {
    var sources = root.RankingSources.loadSnapshot(snapshot);
    var pairs = [], correlations = Object.create(null), taus = [];
    for (var i = 0; i < sources.length; i += 1) for (var j = i + 1; j < sources.length; j += 1) {
      var intersection = root.RankingConsensusUtils.intersectByKey(sources[i].items, sources[j].items);
      // Kendall must use the same canonical identity as intersectByKey, not a
      // possibly stale key stored on the source item.
      var rankA = intersection.itemsA.map(function (item) { return root.RankingConsensusUtils.normalizeKey(item.title, item.artist); });
      var rankB = intersection.itemsB.map(function (item) { return root.RankingConsensusUtils.normalizeKey(item.title, item.artist); });
      var correlation = root.Kendall.kendallTau(rankA, rankB);
      correlations[sources[i].id + '|' + sources[j].id] = correlation;
      if (correlation.tau != null) taus.push(correlation.tau);
      var rate = root.Consensus.matchRate(sources[i], sources[j]);
      rate.pair = pairName(sources[i], sources[j]); rate.n = intersection.size; rate.correlation = correlation;
      pairs.push(rate);
    }
    var tau = taus.length ? taus.reduce(function (sum, value) { return sum + value; }, 0) / taus.length : null;
    return { sources: sources, pairs: pairs, correlations: correlations, tau: tau, ranking: root.Consensus.bordaSuperRanking(sources), divergence: root.Consensus.divergenceScores(sources) };
  }

  function render(result) {
    var sources = result.sources, byId = Object.create(null);
    sources.forEach(function (source) { byId[source.id] = source; });
    var pairsByKey = Object.create(null);
    result.pairs.forEach(function (pair, index) { pairsByKey[sources[Math.floor(index / Math.max(1, sources.length - 1))].id] = pair; });
    text(hook('signal-value'), formatTau(result.tau) + ' τ');
    text(hook('signal-note'), result.pairs.length && result.pairs.every(function (pair) { return !pair.sufficient; }) ? 'Seu gosto é uma bolha: as fontes quase não se cruzam.' : 'Seu ranking foi comparado com os charts disponíveis.');
    var progress = hook('signal-progress'), alignment = result.tau == null ? 0 : (result.tau + 1) / 2;
    if (progress) progress.style.width = Math.round(alignment * 100) + '%';
    var signal = document.querySelector('.progress'); if (signal) signal.setAttribute('aria-valuenow', String(alignment));
    text(hook('metric-tau'), formatTau(result.tau)); text(hook('metric-tau-note'), result.tau == null ? 'sem pares com dados' : 'média dos pares disponíveis');
    var averageMatch = result.pairs.length ? result.pairs.reduce(function (sum, pair) { return sum + (pair.min ? pair.common / pair.min : 0); }, 0) / result.pairs.length : 0;
    text(hook('metric-match'), Math.round(averageMatch * 100) + '%'); text(hook('metric-match-note'), 'média dos pares');
    text(hook('metric-tracks'), String(result.ranking.length)); text(hook('metric-sources'), String(sources.length).padStart(2, '0')); text(hook('metric-sources-note'), sources.map(function (source) { return source.name; }).join(' · '));

    var head = hook('heatmap-head'), body = hook('heatmap-body'); clear(head); clear(body);
     var row = element('tr'); var corner = element('th'); corner.setAttribute('scope', 'col'); row.appendChild(corner); sources.forEach(function (source) { var column = element('th', null, source.name); column.setAttribute('scope', 'col'); row.appendChild(column); }); head.appendChild(row);
     sources.forEach(function (sourceA) { var tr = element('tr'); var rowHeader = element('th', null, sourceA.name); rowHeader.setAttribute('scope', 'row'); tr.appendChild(rowHeader); sources.forEach(function (sourceB) { var td;
      if (sourceA.id === sourceB.id) { td = element('td', 'diagonal', '—'); td.setAttribute('aria-label', sourceA.name + ' consigo, não aplicável'); }
      else { var key = sources.indexOf(sourceA) < sources.indexOf(sourceB) ? sourceA.id + '|' + sourceB.id : sourceB.id + '|' + sourceA.id; var corr = result.correlations[key]; var label = corr.tau == null ? 'interseção insuficiente' : heatClass(corr.tau); td = element('td', null, formatTau(corr.tau)); td.setAttribute('aria-label', pairName(sourceA, sourceB) + ': ' + label + (corr.n < 15 ? ', interseção insuficiente' : '')); }
      tr.appendChild(td);
    }); body.appendChild(tr); });

    var ranking = hook('ranking'); clear(ranking); result.ranking.slice(0, 8).forEach(function (entry, index) { var track = element('div', 'track'); track.appendChild(element('span', 'track__position', String(index + 1).padStart(2, '0'))); track.appendChild(element('span', 'cover' + (index % 3 ? ' cover--' + (index % 3 === 1 ? 'two' : 'three') : '' ))); var info = element('span'); info.appendChild(element('span', 'track__title', entry.item.title || entry.item.key)); info.appendChild(element('span', 'track__artist', entry.item.artist || '')); track.appendChild(info); track.appendChild(element('span', 'track__score', entry.points + ' pts')); ranking.appendChild(track); });
    if (!result.ranking.length) ranking.appendChild(element('p', 'state__message', 'Nenhuma faixa apareceu em duas fontes ainda.'));
    var rates = hook('match-rates'); clear(rates); result.pairs.forEach(function (pair) { var line = element('p', 'state__message', pair.pair + ': ' + pair.common + ' em comum (' + (pair.min ? Math.round(pair.common / pair.min * 100) : 0) + '%)'); if (!pair.sufficient) line.appendChild(element('strong', null, ' · interseção insuficiente (<15)')); rates.appendChild(line); });
    var safe = result.divergence.filter(function (entry) { return entry.classification === 'safe'; }).slice(0, 3), bubble = result.divergence.filter(function (entry) { return entry.classification === 'bubble'; }).slice(0, 3);
    text(hook('safe-title'), safe.length ? 'O mundo também deixou no repeat.' : 'Ainda não há consenso suficiente.'); text(hook('safe-list'), safe.length ? safe.map(function (entry) { return entry.item.title; }).join(' · ') : 'sem faixas comuns');
    text(hook('bubble-title'), bubble.length ? 'O seu algoritmo secreto.' : 'Seu gosto é uma bolha.'); text(hook('bubble-copy'), bubble.length ? 'Faixas com divergência alta em relação às outras fontes.' : 'Todos os pares têm menos de 15 faixas em comum; isso é um resultado, não um erro.');
    var insufficient = result.pairs.filter(function (pair) { return !pair.sufficient; }); text(hook('insufficient-message'), insufficient.length === result.pairs.length ? 'Gosto de bolha: todos os pares têm menos de 15 faixas em comum.' : insufficient.length + ' par(es) têm menos de 15 faixas em comum.');
    document.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach(function (node) { node.hidden = true; });
  }

  function boot() { try { render(analyze(root.RANK_SNAPSHOT)); } catch (error) { var node = document.querySelector('[data-state="error"]'); if (node) { node.hidden = false; node.querySelector('.state__message').textContent = error.message; } } }
  if (typeof document !== 'undefined') document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
  root.RankingConsensusApp = { analyze: analyze, render: render };
}(typeof globalThis !== 'undefined' ? globalThis : this));
