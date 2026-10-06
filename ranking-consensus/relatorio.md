# Relatório — Ranking Consensus Engine · "Meu gosto vs o Mundo"

**Disciplina:** Estrutura de Dados 2 (2026.2) · **Trabalho:** 2 (Ordenação) · **Equipe:** G20
**Integrantes:** Italo Alves Sampaio de Oliveira (232037937) · José Eduardo Vieira do Prado (221008202)

---

## 1. Introdução

### 1.1 Motivação

Uma mesma música pode ser enorme no mundo e invisível para você — e não existe uma forma objetiva de responder *"o meu gosto combina com o mainstream?"*. Cada ranking (seu histórico, o chart global, o chart de uma plataforma) é um recorte com vieses próprios.

### 1.2 Problema

Dado o **ranking pessoal** de um usuário (Spotify) e **rankings de charts reais** (Deezer, Apple/iTunes), medir **de forma matematicamente sólida** o quanto essas ordens concordam ou divergem, e apresentar o resultado de forma interpretável — incluindo o caso em que o usuário é "bolha".

### 1.3 Objetivo e diferencial

O objetivo não é "ordenar uma lista", e sim **usar um algoritmo de ordenação para algo não-óbvio**: a **contagem de inversões** do **Merge Sort** (`O(n log n)`) como motor da **correlação de Kendall-Tau** entre rankings. Com isso:

- mede-se o **alinhamento pessoal** ("quão mainstream é o meu gosto") via `τ`;
- gera-se um **super-ranking de consenso** (fusão **Borda**);
- classifica-se cada faixa em **"aposta segura"** (baixa divergência) ou **"minha bolha"** (alta divergência).

Tudo sobre **APIs reais**, com **OAuth de usuário** (Authorization Code), em **zero dependências**.

---

## 2. Fundamentação teórica

### 2.1 Contagem de inversões via Merge Sort

Dado um array, uma **inversão** é um par `(i, j)` com `i < j` e `a[i] > a[j]`. A contagem por força bruta é `O(n²)`. No **Merge Sort**, toda vez que o `merge` retira um elemento da metade direita antes de esgotar a esquerda, ele "passa à frente" de todos os elementos restantes da esquerda — exatamente `len(left) − i` inversões. Assim, a contagem sai no próprio `merge`:

```
inversions += (len(left) - i)   // quando a[left[i]] > a[right[j]]
```

Complexidade de **tempo:** `O(n log n)`. **Espaço:** `O(n)` auxiliar por nível de merge; nesta implementação, que copia subarrays (`slice`) a cada chamada recursiva, o total de alocações é `O(n log n)` — o bound clássico estrito `O(n)` refere-se à variante com um único buffer auxiliar. Implementação em `js/mergesort.js` (`mergeSort`, `countInversions`).

### 2.2 Correlação de Kendall-Tau

Entre dois rankings de `n` itens, com `C` pares **concordantes** e `D` pares **discordantes** (`C + D = n(n−1)/2`):

```
τ = (C − D) / total,   total = n(n − 1)/2
```

`τ = +1` → ordens idênticas; `−1` → invertidas; `0` → sem relação. Para computá-la, **re-indexa-se** um ranking pela ordem do outro e contam-se as **inversões** desse vetor de posições — reutilizando o Merge Sort. Implementação em `js/kendall.js` (`kendallTau`).

### 2.3 Super-ranking de consenso (fusão Borda)

Sobre o conjunto de itens presentes em **≥2 fontes**, uma fonte com `m` itens dá ao item na posição relativa `p` (0-based) `m − p` pontos. Somam-se os pontos entre as fontes onde o item aparece e ordena-se decrescente. Implementação em `js/consensus.js` (`bordaSuperRanking`).

### 2.4 Divergência / "bolha"

Para cada par de fontes, o item participa de inversões com os demais da interseção. O score é a **fração de inversões** daquele item, normalizada pelo total de pares possíveis (evita viés de tamanho). Agrega-se pela **média** entre os pares onde o item aparece e classifica-se por **percentis** (~75% → "minha bolha"; ~25% → "aposta segura"; demais neutro). Implementação em `js/consensus.js` (`divergenceScores`, `classify`).

---

## 3. Arquitetura

Arquitetura **híbrida em duas camadas**:

```
Camada de Serviço / Ingestão (Node.js)                 Camada de Aplicação (web estática)
  auth_server.js   → OAuth Spotify → spotify_me.json     index.html + js/*
  fetch_sources.js → Deezer + iTunes → *.json              matching → inversões → Kendall → Borda → divergência
  build_snapshot.js→ data/snapshot.js (window.RANK_SNAPSHOT)   (todo o cálculo roda no navegador)
```

**Decisões de projeto (ver `docs/DECISIONS.md`):**

- **D1 — Snapshot via `<script>`:** a página abre por `file://`, onde `fetch()` de JSON local é bloqueado por CORS. Os coletores gravam `data/*.json` (fonte de verdade) **e** o `build_snapshot.js` gera `data/snapshot.js` (`window.RANK_SNAPSHOT`), carregado por `<script>`.
- **D2 — Módulos UMD:** `mergesort.js`, `kendall.js`, `utils.js`, `consensus.js` expõem namespace global no browser **e** `module.exports` no Node — mesmo código para produção e testes.
- **D3 — Sem ES modules:** `import/export` não carregam em `file://`; usam-se `<script>` clássicos, com `app.js` por último.
- **D4 — Zero dependências:** apenas Node built-ins (`http`, `fetch` global, `assert`, `test`, `perf_hooks`).

**Vantagens:** resolve CORS e protege o `access_token` (server-side), mantém todo o algoritmo visível no navegador, e torna a demo **reprodutível offline** (dados congelados em `data/`).

---

## 4. Implementação

### 4.1 Módulos

| Módulo | Responsabilidade |
| --- | --- |
| `js/mergesort.js` | `mergeSort`, `countInversions` (O(n log n)) |
| `js/kendall.js` | `kendallTau(rankA, rankB)` com validação de ranking |
| `js/utils.js` | Normalização `título\|artista`, `dedupeByKey`, `reRank`, `intersectByKey` |
| `js/consensus.js` | `bordaSuperRanking`, `divergenceScores`, `classify`, `matchRate` |
| `js/sources.js` | Registro das fontes + loader de `window.RANK_SNAPSHOT` |
| `js/app.js` | Orquestra a análise e renderiza o DOM |
| `scripts/auth_server.js` | OAuth Authorization Code (login, callback, refresh token) |
| `scripts/fetch_sources.js` | Coleta Deezer/iTunes, normaliza e grava JSON |
| `scripts/build_snapshot.js` | Gera `data/snapshot.js` e reporta o match-rate |
| `scripts/run_benchmark.js` | Mede Merge vs força bruta |

### 4.2 Matching

A **chave** de cada faixa é `normalizeKey(title, artist)`:

1. `NFD` + remoção de diacríticos; 2. minúsculas; 3. remoção de pontuação e sufixos de versão (`(feat. …)`, `(Remix)`, `(Live)`, `Explicit`, `Deluxe`, `Bonus`, `Edit`…); 4. colapso de espaços. O **artista** é o primeiro antes da vírgula. Itens com a mesma chave na mesma fonte são **deduplicados** (mantém a melhor posição).

A análise opera **apenas sobre a interseção** de cada par; dentro dela, cada fonte é **re-indexada** pela ordem relativa. Se um par tem **< 15** itens comuns, é **sinalizado** ("interseção insuficiente").

### 4.3 OAuth Spotify

Fluxo **Authorization Code**: `GET /authorize` (com `state` anti-CSRF e `scope=user-top-read`) → callback em `http://127.0.0.1:8888/callback` → troca de `code` por token → `GET /v1/me/top/tracks?time_range=long_term&limit=50`. O `refresh_token` é persistido localmente (arquivo ignorado pelo git, permissão restrita) e renovado via `grant_type=refresh_token` (modo `--refresh`, sem navegador). **Tokens e segredos nunca vão para `data/` nem para o browser.**

---

## 5. Resultados

### 5.1 Corretude (testes)

**36 testes automatizados**, zero dependências — 100% verdes:

- `test_node.js` (8): `countInversions` **confere com força bruta** em todas as permutações até `n = 7` + casos (vazio, unitário, ordenado, invertido, duplicados); `kendallTau` confere com cálculo **direto** em permutações até `n = 6`, com casos `τ = +1`, `−1`, `1/3`, `n < 2` e entradas inválidas.
- `test_issue5.js` (16): adaptadores Deezer/iTunes, match-rate/threshold, OAuth (URL/state/refresh), persistência segura de tokens e resolução do `.env`.
- `test_consensus.js` (6): Borda, percentis/`classify`, `divergenceScores`, `matchRate`.
- `test_utils.js` (5): normalização (acentos, caixa, pontuação, `feat.`/`remix`/`live`, artista múltiplo), dedupe, interseção/re-rank e invariante de chave sobre os dados reais.
- `test_app_identity.js` (1): regressão da identidade de chaves no app.

### 5.2 Performance (benchmark)

`node scripts/run_benchmark.js` — contagem de inversões, dados determinísticos:

| n | Merge (ms) | Força bruta (ms) | razão |
| --: | --: | --: | --: |
| 1.000 | 1.065 | 3.945 | 3.70× |
| 2.000 | 0.910 | 5.532 | 6.08× |
| 5.000 | 1.429 | — (limitada) | — |
| 10.000 | 3.937 | — | — |
| 20.000 | 6.579 | — | — |

A força bruta é limitada a `n = 2.000` (o crescimento quadrático torna `n` maior inviável em tempo hábil); o Merge continua escalando em taxa compatível com `n log n`. Os tempos variam conforme a máquina.

### 5.3 Dados reais e match-rate

Snapshot de **06/10/2026** (modo cache):

| Fonte | Itens |
| --- | --: |
| Spotify (você, `long_term`) | 50 |
| Deezer (chart da região) | 100 |
| iTunes (storefront Brasil) | 92 |

Interseções: `me × Deezer = 0`, `me × iTunes = 0`, `Deezer × iTunes = 3`. **Todos os pares abaixo do threshold (15).**

### 5.4 Interpretação

O único par computável (`Deezer × iTunes`, com 3 itens) resultou em `τ = 1` (ordens idênticas nesses itens). Os pares que envolvem o usuário ficaram **abaixo do threshold** — o produto os exibe como **"interseção insuficiente"** e resume o resultado como **"seu gosto é bolha"**.

> **Este é um resultado válido, não uma falha.** A proposta do produto é medir **consenso × divergência**: para um ouvinte cujo repertório (trap/rap internacional e funk BR) pouco cruza com os charts regionais/de download, a interseção baixa *é* a resposta. É um caso do ouvinte, não universal — perfis mais mainstream geram interseções maiores. O comportamento é especificado como **resultado de primeira classe** (`docs/DECISIONS.md`, ADR-010).

---

## 6. Conclusão

O trabalho atingiu o objetivo central: **empregar a ordenação (Merge Sort) para resolver um problema não-óbvio** — a medição de consenso/divergência entre rankings via **contagem de inversões** e **Kendall-Tau** — sobre **dados reais**, com **OAuth de usuário**, matriz de correlação, super-ranking (Borda) e classificação por divergência, tudo em **HTML/CSS/JS puro + Node built-ins**.

A **corretude** foi demonstrada por comparação exaustiva com força bruta (permutações até `n = 7`/`n = 6`), e a **eficiência** (`O(n log n)` vs `O(n²)`) foi comprovada empiricamente pelo benchmark. A arquitetura híbrida (Node coleta + browser calcula) resolveu CORS e a proteção de credenciais, permitindo uma demo **reprodutível offline**.

Como limitação, a interseção entre fontes públicas pode ser pequena para gostos de nicho — tratada explicitamente como resultado ("bolha"), e não como erro. Trabalhos futuros: matching difuso (acentos/`feat`/versões), mais fontes (outra região, Last.fm), modo "ao vivo" e análise por dia.

---

## 7. Referências

- CORMEN, T. H.; LEISERSON, C. E.; RIVEST, R. L.; STEIN, C. *Introduction to Algorithms*. 4. ed. Cambridge: MIT Press, 2022.
- KENDALL, M. G. *A new measure of rank correlation*. Biometrika, v. 30, n. 1/2, p. 81–93, 1938.
- BORDA, J.-C. de. *Mémoire sur les élections au scrutin*. 1781.
- Spotify Web API — Authorization Code Flow. https://developer.spotify.com/documentation/web-api/
- Deezer API. https://developers.deezer.com/api
- Apple/iTunes RSS. https://itunes.apple.com/

---

*Implementação desenvolvida integralmente pela equipe G20 — Estrutura de Dados 2, 2026.2.*
