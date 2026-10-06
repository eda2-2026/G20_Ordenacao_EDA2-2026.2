# Coleta e snapshot

Os scripts usam apenas APIs nativas do Node.js 18+ e não instalam dependências.

## Configuração (.env)

Os scripts procuram o `.env` no diretório de execução **e** em `ranking-consensus/`.
Como o `auth_server.js` é normalmente executado a partir de `ranking-consensus/`, o
caminho mais simples é:

- manter o `.env` na **raiz do repositório** e rodar os comandos de lá
  (`node ranking-consensus/scripts/...`), **ou**
- criar `ranking-consensus/.env` (copiando `.env.example`).

Nunca versione o `.env`. Tokens e segredos nunca são gravados em `data/` ou em `snapshot.js`.

## Comandos

```sh
# a partir da RAIZ do repositório (usa o .env da raiz):
node ranking-consensus/scripts/fetch_sources.js
node ranking-consensus/scripts/auth_server.js            # 1ª vez: login no navegador (http://127.0.0.1:8888/)
node ranking-consensus/scripts/auth_server.js --refresh  # depois: renova o token salvo, sem navegador
node ranking-consensus/scripts/build_snapshot.js
```

## Fontes e região (ADR-009)

- **Deezer:** `chart/0/tracks?limit=100` — chart **da região** (regionaliza pelo IP; sem `limit` devolve só 10).
- **iTunes:** storefront **Brasil** — `/br/rss/topsongs/limit=100/json`.
- **Spotify:** `time_range=long_term` e `limit=50` (via `SPOTIFY_TIME_RANGE` / `SPOTIFY_TOP_LIMIT`).

`fetch_sources.js` tenta Deezer e iTunes mesmo quando o Spotify não está configurado.
O `build_snapshot.js` reporta o **match-rate por par** e sinaliza pares com `<15` itens comuns.
