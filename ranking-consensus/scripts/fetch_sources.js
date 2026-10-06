'use strict';

const fs = require('node:fs');
const path = require('node:path');
const utils = require('../js/utils');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const DEFAULTS = {
  deezer: 'https://api.deezer.com/chart/0/tracks?limit=100',
  itunes: 'https://itunes.apple.com/br/rss/topsongs/limit=100/json'
};

function envFileCandidates(cwd = process.cwd(), projectDir = PROJECT_DIR) {
  const resolvedProjectDir = path.resolve(projectDir);
  const candidates = [
    path.join(path.resolve(resolvedProjectDir, '..'), '.env'),
    path.join(resolvedProjectDir, '.env'),
    path.join(path.resolve(cwd), '.env')
  ];
  return [...new Set(candidates)];
}

function loadEnv(cwd = process.cwd(), projectDir = PROJECT_DIR) {
  const values = {};
  for (const file of envFileCandidates(cwd, projectDir)) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || match[1] in process.env) continue;
      values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return Object.assign(values, process.env);
}

function normalizeItem(title, artist, position) {
  if (typeof title !== 'string' || !title.trim() || typeof artist !== 'string' || !artist.trim()) return null;
  return { key: utils.normalizeKey(title, artist), title: title.trim(), artist: artist.trim(), position };
}

function adaptDeezer(payload) {
  if (!payload || !Array.isArray(payload.data)) throw new Error('Deezer payload inválido: campo data ausente.');
  return payload.data.map((track, position) => normalizeItem(track && track.title, track && track.artist && track.artist.name, position)).filter(Boolean);
}

function adaptItunes(payload) {
  const entries = payload && payload.feed && payload.feed.entry;
  if (!Array.isArray(entries)) throw new Error('iTunes payload inválido: campo feed.entry ausente.');
  return entries.map((entry, position) => normalizeItem(
    entry && entry['im:name'] && entry['im:name'].label,
    entry && entry['im:artist'] && entry['im:artist'].label,
    position
  )).filter(Boolean);
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

async function fetchJson(url, name, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('Node 18+ com fetch global é necessário.');
  let response;
  try { response = await fetchImpl(url, { headers: { accept: 'application/json' } }); }
  catch (error) { throw new Error(`${name}: erro de rede (${error.message}).`); }
  if (!response || !response.ok) throw new Error(`${name}: HTTP ${response && response.status ? response.status : 'desconhecido'}.`);
  try { return await response.json(); }
  catch (error) { throw new Error(`${name}: resposta não é JSON válido.`); }
}

function reportMatchRate(sources, logger = console.log) {
  const pairs = [];
  for (let i = 0; i < sources.length; i += 1) for (let j = i + 1; j < sources.length; j += 1) {
    const common = utils.intersectByKey(sources[i].items, sources[j].items).size;
    const threshold = common >= 15;
    const pair = `${sources[i].id} x ${sources[j].id}`;
    pairs.push({ pair, common, sufficient: threshold });
    logger(`match-rate ${pair}: ${common} item(ns) comuns${threshold ? '' : ' — INTERSEÇÃO INSUFICIENTE (<15)'}`);
  }
  return pairs;
}

async function collect(name, url, adapter, fetchImpl) {
  const payload = await fetchJson(url, name, fetchImpl);
  const items = utils.dedupeByKey(adapter(payload)).map((item, position) => ({
    key: item.key, title: item.title, artist: item.artist, position
  }));
  if (!items.length) throw new Error(`${name}: nenhum item válido na resposta.`);
  return items;
}

async function main() {
  const env = loadEnv();
  const sources = [];
  const jobs = [
    ['deezer', env.DEEZER_CHART_URL || DEFAULTS.deezer, adaptDeezer],
    ['itunes', env.ITUNES_TOP_SONGS_URL || DEFAULTS.itunes, adaptItunes]
  ];
  for (const [id, url, adapter] of jobs) {
    try {
      const items = await collect(id, url, adapter);
      const source = { id, name: id === 'deezer' ? 'Deezer' : 'iTunes', color: id === 'deezer' ? 'cyan' : 'coral', kind: 'chart', items };
      atomicWriteJson(path.join(DATA_DIR, `${id}.json`), source);
      sources.push(source);
      console.log(`${id}: ${items.length} item(ns) gravado(s).`);
    } catch (error) { console.error(`Não foi possível coletar ${id}: ${error.message}`); }
  }
  if (sources.length > 1) reportMatchRate(sources);
  if (!sources.length) { console.error('Nenhuma fonte foi coletada; dados existentes não foram apagados.'); process.exitCode = 1; }
}

module.exports = { DEFAULTS, envFileCandidates, loadEnv, normalizeItem, adaptDeezer, adaptItunes, atomicWriteJson, fetchJson, reportMatchRate, collect };
if (require.main === module) main().catch((error) => { console.error(`Coleta interrompida: ${error.message}`); process.exitCode = 1; });
