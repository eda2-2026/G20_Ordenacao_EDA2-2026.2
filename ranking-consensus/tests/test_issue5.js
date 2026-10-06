'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fetchSources = require('../scripts/fetch_sources');
const snapshot = require('../scripts/build_snapshot');
const auth = require('../scripts/auth_server');

test('uses the wider Brazil chart defaults', () => {
  assert.equal(fetchSources.DEFAULTS.deezer, 'https://api.deezer.com/chart/0/tracks?limit=100');
  assert.equal(fetchSources.DEFAULTS.itunes, 'https://itunes.apple.com/br/rss/topsongs/limit=100/json');
});

test('loads .env from the repository root when running from the project', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-env-root-'));
  const projectDir = path.join(root, 'ranking-consensus');
  const cwd = path.join(projectDir, 'scripts');
  const key = 'RC_TEST_REPOSITORY_ROOT';
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(path.join(root, '.env'), `${key}=from-repository-root\n`);
  const original = process.env[key];
  delete process.env[key];
  try { assert.equal(fetchSources.loadEnv(cwd, projectDir)[key], 'from-repository-root'); }
  finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('applies more specific .env files over less specific files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-env-precedence-'));
  const projectDir = path.join(root, 'ranking-consensus');
  const cwd = path.join(projectDir, 'scripts');
  const key = 'RC_TEST_PRECEDENCE';
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(path.join(root, '.env'), `${key}=root\n`);
  fs.writeFileSync(path.join(projectDir, '.env'), `${key}=project\n`);
  fs.writeFileSync(path.join(cwd, '.env'), `${key}=cwd\n`);
  const original = process.env[key];
  delete process.env[key];
  try { assert.equal(fetchSources.loadEnv(cwd, projectDir)[key], 'cwd'); }
  finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('keeps process.env at the highest precedence over .env files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-env-process-'));
  const projectDir = path.join(root, 'ranking-consensus');
  const key = 'RC_TEST_PROCESS_ENV';
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(root, '.env'), `${key}=file\n`);
  const original = process.env[key];
  process.env[key] = 'process';
  try { assert.equal(fetchSources.loadEnv(projectDir, projectDir)[key], 'process'); }
  finally {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('returns ordered absolute .env candidates without duplicates', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-env-candidates-'));
  const projectDir = path.join(root, 'ranking-consensus');
  try {
    assert.deepEqual(fetchSources.envFileCandidates(projectDir, projectDir), [
      path.join(root, '.env'),
      path.join(projectDir, '.env')
    ]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('adapts Deezer and ignores incomplete tracks', () => {
  const items = fetchSources.adaptDeezer({ data: [
    { title: 'Song', artist: { name: 'Artist' } },
    { title: 'Missing artist', artist: {} }
  ] });
  assert.deepEqual(items, [{ key: 'song|artist', title: 'Song', artist: 'Artist', position: 0 }]);
});

test('adapts iTunes RSS entries', () => {
  const items = fetchSources.adaptItunes({ feed: { entry: [{ 'im:name': { label: 'Song' }, 'im:artist': { label: 'Artist' } }] } });
  assert.equal(items[0].position, 0);
  assert.equal(items[0].key, 'song|artist');
});

test('reports insufficient intersections below fifteen', () => {
  const messages = [];
  const result = fetchSources.reportMatchRate([
    { id: 'a', items: [] }, { id: 'b', items: [] }
  ], (message) => messages.push(message));
  assert.equal(result[0].sufficient, false);
  assert.match(messages[0], /INTERSEÇÃO INSUFICIENTE/);
});

test('creates the required Spotify authorize parameters', () => {
  const url = new URL(auth.createAuthorizeUrl('client-id', 'state-value'));
  assert.equal(url.searchParams.get('redirect_uri'), auth.REDIRECT_URI);
  assert.equal(url.searchParams.get('scope'), 'user-top-read');
  assert.equal(url.searchParams.get('state'), 'state-value');
});

test('refresh uses refresh_token grant without writing credentials', async () => {
  let request;
  const token = await auth.refreshAccessToken('refresh-secret', { clientId: 'id', clientSecret: 'secret' }, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ access_token: 'access' }) };
  });
  assert.equal(token.access_token, 'access');
  assert.equal(new URLSearchParams(request.options.body).get('grant_type'), 'refresh_token');
  assert.equal(new URLSearchParams(request.options.body).get('refresh_token'), 'refresh-secret');
});

test('builds configurable Spotify top-tracks parameters and clamps the limit', () => {
  const url = new URL(auth.topTracksUrl({ timeRange: 'long_term', topLimit: 50 }));
  assert.equal(url.searchParams.get('time_range'), 'long_term');
  assert.equal(url.searchParams.get('limit'), '50');
  const original = process.env.SPOTIFY_TOP_LIMIT;
  process.env.SPOTIFY_TOP_LIMIT = '999';
  try { assert.equal(auth.config().topLimit, 50); } finally {
    if (original === undefined) delete process.env.SPOTIFY_TOP_LIMIT;
    else process.env.SPOTIFY_TOP_LIMIT = original;
  }
});

test('refresh mode refreshes, fetches configured tracks, and writes only safe source data', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-refresh-'));
  const tokenFile = path.join(directory, 'tokens.json');
  const dataFile = path.join(directory, 'spotify_me.json');
  auth.persistTokenPayload({ access_token: 'old-access', refresh_token: 'stored-refresh' }, tokenFile);
  const requests = [];
  const completed = await auth.refreshAndFetch({
    tokenFile,
    dataFile,
    credentials: { clientId: 'id', clientSecret: 'secret', timeRange: 'long_term', topLimit: 50 },
    logger: () => {},
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url === auth.TOP_URL_BASE + '?time_range=long_term&limit=50') {
        return { ok: true, json: async () => ({ items: [{ name: 'Song', artists: [{ name: 'Artist' }] }] }) };
      }
      return { ok: true, json: async () => ({ access_token: 'new-access', expires_in: 3600 }) };
    }
  });
  assert.equal(completed, true);
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[1].url).searchParams.get('limit'), '50');
  const source = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(source.items[0].key, 'song|artist');
  assert.equal(JSON.stringify(source).includes('new-access'), false);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('persists and loads Spotify tokens outside data with restrictive permissions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-token-'));
  const file = path.join(directory, 'tokens.json');
  const saved = auth.persistTokenPayload({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }, file);
  assert.equal(saved.refresh_token, 'refresh');
  assert.equal(auth.loadTokenPayload(file, () => {} ).access_token, 'access');
  const mode = fs.statSync(file).mode & 0o777;
  assert.equal(mode & 0o600, 0o600);
  if (process.platform !== 'win32') assert.equal(mode, 0o600);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('server loads persisted refresh token and persists refreshed payload', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-server-'));
  const file = path.join(directory, 'tokens.json');
  auth.persistTokenPayload({ access_token: 'old-access', refresh_token: 'stored-refresh' }, file);
  const requests = [];
  const server = auth.startServer({
    port: 0,
    tokenFile: file,
    credentials: { clientId: 'id', clientSecret: 'secret' },
    logger: () => {},
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ access_token: 'new-access', expires_in: 3600 }) };
    }
  });
  await new Promise((resolve) => server.once('listening', resolve));
  await server.refreshAccessToken();
  server.close();
  assert.equal(new URLSearchParams(requests[0].options.body).get('refresh_token'), 'stored-refresh');
  assert.equal(auth.loadTokenPayload(file, () => {}).access_token, 'new-access');
  assert.equal(auth.loadTokenPayload(file, () => {}).refresh_token, 'stored-refresh');
  fs.rmSync(directory, { recursive: true, force: true });
});

test('missing and corrupt token files produce non-secret messages', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-consensus-invalid-'));
  const missing = path.join(directory, 'missing.json');
  const messages = [];
  assert.equal(auth.loadTokenPayload(missing, (message) => messages.push(message)), null);
  fs.writeFileSync(missing, '{not-json');
  assert.equal(auth.loadTokenPayload(missing, (message) => messages.push(message)), null);
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => !message.includes('refresh') && !message.includes('access')));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('builds all three sources from the checked-in data shape', () => {
  const built = snapshot.buildSnapshot();
  assert.equal(built.sources.length, 3);
  assert.ok(built.sources.every((source) => Array.isArray(source.items)));
});
