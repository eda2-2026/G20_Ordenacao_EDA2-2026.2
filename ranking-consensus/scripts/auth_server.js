'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { URL, URLSearchParams } = require('node:url');
const { loadEnv, atomicWriteJson } = require('./fetch_sources');

const HOST = '127.0.0.1';
const PORT = 8888;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPE = 'user-top-read';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const TOP_URL_BASE = 'https://api.spotify.com/v1/me/top/tracks';
const DATA_FILE = path.resolve(__dirname, '..', 'data', 'spotify_me.json');
const TOKEN_FILE = path.resolve(__dirname, '..', '.spotify_tokens.json');

function config() {
  const env = loadEnv();
  const parsedLimit = Number.parseInt(env.SPOTIFY_TOP_LIMIT || '50', 10);
  const topLimit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 50;
  return {
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
    timeRange: env.SPOTIFY_TIME_RANGE || 'long_term',
    topLimit
  };
}
function topTracksUrl(options = config()) {
  return `${TOP_URL_BASE}?${new URLSearchParams({ time_range: options.timeRange, limit: String(options.topLimit) })}`;
}
function createState() { return crypto.randomBytes(24).toString('hex'); }
function createAuthorizeUrl(clientId, state) {
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: REDIRECT_URI, scope: SCOPE, state }).toString();
  return url.toString();
}
function basicAuth(clientId, clientSecret) { return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`; }

async function tokenRequest(params, credentials, fetchImpl = globalThis.fetch) {
  if (!credentials.clientId || !credentials.clientSecret) throw new Error('Credenciais Spotify ausentes: preencha SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.');
  let response;
  try { response = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { Authorization: basicAuth(credentials.clientId, credentials.clientSecret), 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) }); }
  catch (error) { throw new Error(`Spotify token: erro de rede (${error.message}).`); }
  if (!response.ok) throw new Error(`Spotify token: HTTP ${response.status}; verifique credenciais, redirect URI e autorização.`);
  const value = await response.json();
  if (!value.access_token) throw new Error('Spotify token: resposta sem access_token.');
  return value;
}
function exchangeCode(code, credentials, fetchImpl) { return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }, credentials, fetchImpl); }
function refreshAccessToken(refreshToken, credentials, fetchImpl) {
  if (!refreshToken) throw new Error('Refresh token ausente; faça login novamente.');
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }, credentials, fetchImpl);
}
function tokenPayloadForStorage(tokens, previous = {}) {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || previous.refresh_token,
    ...(tokens.expires_in === undefined ? {} : { expires_in: tokens.expires_in }),
    ...(tokens.token_type === undefined ? {} : { token_type: tokens.token_type }),
    ...(tokens.scope === undefined ? {} : { scope: tokens.scope })
  };
}
function loadTokenPayload(file = TOKEN_FILE, logger = console.error) {
  if (!fs.existsSync(file)) {
    logger('Arquivo local de tokens Spotify não encontrado; faça login em /.');
    return null;
  }
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || typeof value.access_token !== 'string' || !value.access_token || typeof value.refresh_token !== 'string' || !value.refresh_token) throw new Error('invalid');
    return value;
  } catch (_) {
    logger('Arquivo local de tokens Spotify inválido; faça login em /.');
    return null;
  }
}
function persistTokenPayload(tokens, file = TOKEN_FILE, previous = {}) {
  if (!tokens || typeof tokens.access_token !== 'string' || !tokens.access_token) throw new Error('Spotify token: resposta sem access_token.');
  const payload = tokenPayloadForStorage(tokens, previous);
  if (!payload.refresh_token) throw new Error('Spotify token: resposta sem refresh_token para persistência.');
  atomicWriteJson(file, payload);
  fs.chmodSync(file, 0o600);
  return payload;
}
async function fetchTopTracks(accessToken, fetchImpl = globalThis.fetch, options = config()) {
  const response = await fetchImpl(topTracksUrl(options), { headers: { Authorization: `Bearer ${accessToken}`, accept: 'application/json' } });
  if (!response.ok) throw new Error(`Spotify top tracks: HTTP ${response.status}; renove o token ou faça login novamente.`);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.items)) throw new Error('Spotify top tracks: resposta sem items.');
  return payload.items.map((track, position) => {
    const title = track && track.name;
    const artist = track && track.artists && track.artists[0] && track.artists[0].name;
    if (typeof title !== 'string' || typeof artist !== 'string') return null;
    return { title, artist, position };
  }).filter(Boolean);
}
function safeSpotifySource(items) {
  const utils = require('../js/utils');
  return { id: 'me', name: 'Você', color: 'spotify', kind: 'personal', items: utils.dedupeByKey(items).map((item, position) => ({ key: utils.normalizeKey(item.title, item.artist), title: item.title, artist: item.artist, position })) };
}

async function refreshAndFetch(options = {}) {
  const credentials = options.credentials || config();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const tokenFile = options.tokenFile || TOKEN_FILE;
  const dataFile = options.dataFile || DATA_FILE;
  const logger = options.logger || console.error;
  const previous = loadTokenPayload(tokenFile, logger);
  if (!previous) return false;
  const tokens = await refreshAccessToken(previous.refresh_token, credentials, fetchImpl);
  const persisted = persistTokenPayload(tokens, tokenFile, previous);
  const items = await fetchTopTracks(persisted.access_token, fetchImpl, credentials);
  atomicWriteJson(dataFile, safeSpotifySource(items));
  logger(`Spotify atualizado. ${items.length} faixa(s) salva(s) em data/spotify_me.json.`);
  return true;
}

function startServer(options = {}) {
  const credentials = options.credentials || config();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  let state = createState();
  const tokenFile = options.tokenFile || TOKEN_FILE;
  let tokenPayload = loadTokenPayload(tokenFile, options.logger || console.error) || {};
  let refreshToken = tokenPayload.refresh_token || null;
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
    try {
      if (requestUrl.pathname === '/') {
        if (!credentials.clientId) throw new Error('SPOTIFY_CLIENT_ID ausente.');
        state = createState();
        response.statusCode = 302; response.setHeader('Location', createAuthorizeUrl(credentials.clientId, state)); response.end(); return;
      }
      if (requestUrl.pathname !== '/callback') { response.statusCode = 404; response.end('Rota não encontrada.'); return; }
      if (requestUrl.searchParams.get('state') !== state) { response.statusCode = 400; response.end('Falha de segurança: state inválido.'); return; }
      if (requestUrl.searchParams.get('error')) { response.statusCode = 400; response.end('Autorização Spotify recusada.'); return; }
      const tokens = await exchangeCode(requestUrl.searchParams.get('code'), credentials, fetchImpl);
      tokenPayload = persistTokenPayload(tokens, tokenFile, tokenPayload);
      refreshToken = tokenPayload.refresh_token;
      const items = await fetchTopTracks(tokens.access_token, fetchImpl);
      atomicWriteJson(DATA_FILE, safeSpotifySource(items));
      response.statusCode = 200; response.end(`Spotify conectado. ${items.length} faixa(s) salva(s) em data/spotify_me.json.\n`);
      if (options.once !== false) server.close();
    } catch (error) { response.statusCode = 500; response.end(`Falha no fluxo Spotify: ${error.message}`); }
  });
  server.listen(options.port === undefined ? PORT : options.port, options.host || HOST, () => console.log(`OAuth Spotify pronto: http://${HOST}:${PORT}/`));
  server.refreshAccessToken = async () => {
    const tokens = await refreshAccessToken(refreshToken, credentials, fetchImpl);
    tokenPayload = persistTokenPayload(tokens, tokenFile, tokenPayload);
    refreshToken = tokenPayload.refresh_token;
    return tokens;
  };
  return server;
}

module.exports = { HOST, PORT, REDIRECT_URI, SCOPE, TOKEN_FILE, TOP_URL_BASE, config, topTracksUrl, createState, createAuthorizeUrl, exchangeCode, refreshAccessToken, fetchTopTracks, safeSpotifySource, loadTokenPayload, persistTokenPayload, refreshAndFetch, startServer };
if (require.main === module) {
  if (process.argv.includes('--refresh')) {
    refreshAndFetch().then((completed) => { if (!completed) process.exitCode = 1; }).catch((error) => { console.error(`Falha na atualização Spotify: ${error.message}`); process.exitCode = 1; });
  } else startServer();
}
