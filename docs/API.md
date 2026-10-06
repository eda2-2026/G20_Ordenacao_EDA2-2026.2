# API Context — Ranking Consensus Engine ("Meu gosto vs o Mundo")

> **Base URL:** N/A — não há backend próprio. A camada Node consome **APIs externas**; o browser usa **contratos de módulo UMD internos**.
> **Protocol:** REST (APIs externas) + chamadas de função JS (módulos internos)
> **Last Updated:** 2026-10-06

## 1. Authentication

- **Method (externo):** Spotify **OAuth2 Authorization Code** (login de usuário). Deezer e iTunes são públicas.
- **Header:** `Authorization: Bearer <access_token>` (apenas Spotify).
- **Authorize endpoint:** `GET https://accounts.spotify.com/authorize`
  - Parâmetros: `client_id`, `response_type=code`, `redirect_uri`, `scope=user-top-read`, `state`.
- **Token endpoint:** `POST https://accounts.spotify.com/api/token`
  - Troca: `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`.
  - Renovação: `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret`.
- **Redirect URI (exata):** `http://127.0.0.1:8888/callback`
- **Expiry:** `expires_in` (segundos) | **Refresh:** `refresh_token` (guardar junto do access token)

## 2. Endpoints (externos)

### Spotify
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `https://accounts.spotify.com/authorize` | Inicia login (redirect) | No |
| POST | `https://accounts.spotify.com/api/token` | Troca code / renova token | client_id+secret |
| GET | `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50` | Suas mais tocadas (position = índice 0-based) | Bearer |

> `time_range` e `limit` são configuráveis: `SPOTIFY_TIME_RANGE` (default `long_term`; alternativas `short_term`/`medium_term`) e `SPOTIFY_TOP_LIMIT` (default `50`, máx 50). Escopo `user-top-read`. Opcional: `user-read-recently-played` (F9, pós-MVP). O modo não-interativo `node scripts/auth_server.js --refresh` renova o token salvo e regrava `data/spotify_me.json` sem navegador.

### Deezer
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `https://api.deezer.com/chart/0/tracks?limit=100` | Chart da região do usuário (top 100) | No |

- Resposta: `{ data: [ { title, artist: { name }, … } ] }`. Item → `title`, `artist.name`; `position` = índice em `data`.

### Apple / iTunes RSS
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `https://itunes.apple.com/br/rss/topsongs/limit=100/json` | Top songs — Brasil | No |

- Resposta: `{ feed: { entry: [ { 'im:name': { label }, 'im:artist': { label }, … } ] } }`. Item → `im:name.label`, `im:artist.label`; `position` = índice em `entry`.

## 3. Contratos internos (módulos UMD)

Expõem namespace global no browser **e** `module.exports` no Node. **Sem ES modules.**

### `js/mergesort.js` → `MergeSort`
```js
MergeSort.mergeSort(array)        // → array ordenado (não muta a entrada)
MergeSort.countInversions(array)  // → number (inversões estritas; empate não conta)
```
Lança `TypeError` se a entrada não for array.

### `js/kendall.js` → `Kendall`
```js
Kendall.kendallTau(rankA, rankB)
// → { tau, concordante, discordante, total, n }
// n < 2 → { tau: null, concordante: 0, discordante: 0, total: 0, n }
Kendall.validateRanking(rankA, rankB) // → true | lança RangeError
```
Requer arrays do mesmo tamanho, sem itens duplicados e com os mesmos itens. `tau = (concordante - discordante) / total`, `total = n*(n-1)/2`.

### `js/utils.js` → `RankingConsensusUtils`
```js
normalizeTitle(title)                  // → string normalizada
normalizeArtist(artist)                // → string (1º artista, antes da vírgula)
normalizeKey(title, artist)            // → "titulo|artista" normalizado
dedupeByKey(items)                     // → items únicos por chave (melhor posição)
reRank(items[, keys])                  // → items com position 0-based relativa
intersectByKey(itemsA, itemsB)         // → { keys, itemsA, itemsB, size }
```

### `js/consensus.js` → `Consensus` ⏳ (planejado #7)
```js
Consensus.bordaSuperRanking(...)   // super-ranking Borda (§12.4)
Consensus.divergenceScores(...)    // score de divergência por item (§12.5)
Consensus.classify(item)           // "safe" | "neutral" | "bubble" (percentis ~25/75)
Consensus.matchRate(...)           // match-rate por par
```

## 4. Response / Data Conventions

**Item comum (todas as fontes):** `{ key, title, artist, position }` (`DATA_MODEL.md`).
**Snapshot browser:** `window.RANK_SNAPSHOT = { sources: [...], … }` via `data/snapshot.js`.
**Erro de API:** tratado na camada Node com mensagem clara (ex.: troca de code falhou, 401 token expirado → renovar/re-login).

## 5. Error Codes

| Status | When |
|--------|------|
| 400 | Requisição malformada na coleta |
| 401 | Token Spotify inválido/expirado → renovar via `refresh_token`; se falhar, re-login |
| 403 | Escopo insuficiente (falta `user-top-read`) |
| 404 | Limitação conhecida: playlists editoriais via client-credentials (por isso usamos dados pessoais) |
| 429 | Rate limit das APIs (baixo risco — 1 chamada por execução + cache) |
| 5xx | Falha do provedor externo |

## 6. Pagination

- **Strategy:** **N/A** — cada fonte entrega uma lista fixa (Deezer/iTunes: top 100; Spotify: top 50 em `long_term`). `position` é o índice 0-based no array retornado.

## 7. Rate Limiting

- **Limit:** não gerenciado explicitamente (uso único por execução).
- **Mitigação:** cachear resultados em `data/` e nunca repetir chamadas na demo.

---
*Generated by context-generator on 2026-10-06*
