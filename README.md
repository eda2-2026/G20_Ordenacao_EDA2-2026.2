# Ranking Consensus Engine · "Meu gosto vs o Mundo"

**Trabalho 2 — Ordenação** · Disciplina: **Estrutura de Dados 2 (2026.2)** · Equipe **G20**

| Matrícula | Nome completo |
| :-------: | :------------ |
| 232037937 | Italo Alves Sampaio de Oliveira |
| 221008202 | José Eduardo Vieira do Prado |

Aplicação web que compara **a sua lista pessoal de músicas mais tocadas** (Spotify, via login) com **charts reais** (Deezer e Apple/iTunes) e responde, com rigor matemático, *"o meu gosto está alinhado com o que o mundo escuta?"*.

O diferencial técnico não é "ordenar uma lista": é usar o **Merge Sort** pela sua **contagem de inversões em `O(n log n)`** — o que permite calcular a **correlação de Kendall-Tau** entre rankings de forma eficiente e derivar **consenso** (fusão Borda) e **divergência** ("minha bolha").

> **Relatório acadêmico completo:** [`ranking-consensus/relatorio.md`](ranking-consensus/relatorio.md).

---

## 1. Como funciona

```
[Node]  auth_server.js        login Spotify (OAuth) → data/spotify_me.json
        fetch_sources.js      Deezer + iTunes         → data/deezer.json / itunes.json
        build_snapshot.js     junta os JSON           → data/snapshot.js (window.RANK_SNAPSHOT)
                                       │  (dados reais congelados — modo cache)
                                       ▼
[Browser, file://]  index.html → js/*
  1. Matching        chave normalizada "título|artista" (utils.js)
  2. Inversões       Merge Sort O(n log n)               (mergesort.js)
  3. Kendall-Tau     matriz de correlação por par        (kendall.js)
  4. Borda           super-ranking de consenso           (consensus.js)
  5. Divergência     "apostas seguras" vs "minha bolha"  (consensus.js + app.js)
```

O cálculo roda **inteiramente no navegador**; o Node apenas **coleta os dados** (resolve CORS e protege o token server-side). A página abre por `file://`, **sem servidor**.

### O pulo do gato

Contar inversões por força bruta custa `O(n²)`. No **Merge Sort**, a contagem sai de graça no passo de `merge`, em `O(n log n)`. Cada inversão = um **par discordante** entre dois rankings → é exatamente o que a **Kendall-Tau** precisa. Daí saem: **quão "mainstream" você é** (`τ` entre você e o mundo), o **super-ranking** de consenso (Borda) e o **score de divergência** por faixa.

---

## 2. Fontes de dados

| Fonte | Endpoint | Auth | O que entrega |
| --- | --- | --- | --- |
| **Spotify (pessoal)** | `/v1/me/top/tracks?time_range=long_term&limit=50` | **OAuth Authorization Code** (`user-top-read`) | Suas mais tocadas |
| **Deezer** | `api.deezer.com/chart/0/tracks?limit=100` | Nenhuma | Chart **da região** (regionaliza pelo IP) |
| **Apple/iTunes** | `itunes.apple.com/br/rss/topsongs/limit=100/json` | Nenhuma | Top songs (storefront **Brasil**) |

- `position` de cada faixa = **índice 0-based** no array da API (uniforme entre as fontes).
- Matching por **chave normalizada** `título|artista` (sem acentos, minúscula, sem pontuação/sufixos como `(feat.)`, `(Remix)`, `(Live)`, `Explicit`; artista = primeiro antes da vírgula).
- **Threshold:** pares com **menos de 15** faixas em comum são sinalizados como **"interseção insuficiente"** (não entram na matriz).

---

## 3. Pré-requisitos

- **Node.js 18+** (usa `fetch` global nativo). **Zero dependências** — não há `npm install`.
- Um navegador moderno (Chrome, Firefox, Edge, Safari).
- _(Opcional, só para os seus dados do Spotify)_ um app no **Spotify for Developers** — ver [§5](#5-configurar-o-spotify-oauth).

---

## 4. Como rodar

### Modo rápido (cache) — sem login, sem rede

O repositório já inclui os dados coletados em `data/`. Basta **abrir `ranking-consensus/index.html`** no navegador (`file://`).

```bash
# Windows
start ranking-consensus/index.html
# macOS
open ranking-consensus/index.html
# Linux
xdg-open ranking-consensus/index.html
```

### Modo completo — coletar dados reais e regenerar o snapshot

```bash
cd ranking-consensus

# 1) (Opcional) suas top tracks do Spotify — ver §5 para o login
node scripts/auth_server.js            # 1ª vez: abre o login no navegador
node scripts/auth_server.js --refresh  # depois: renova o token salvo, sem navegador

# 2) Charts (Deezer da região + iTunes Brasil)
node scripts/fetch_sources.js

# 3) Gera o snapshot do browser + imprime o match-rate por par
node scripts/build_snapshot.js

# 4) Abra a aplicação
start index.html
```

> **Por que `snapshot.js`?** Abrindo via `file://`, `fetch()` de `.json` local é bloqueado por CORS. Então os coletores gravam `data/*.json` (fonte de verdade) e o `build_snapshot.js` gera `data/snapshot.js` (`window.RANK_SNAPSHOT`), que o `index.html` carrega via `<script>`.

---

## 5. Configurar o Spotify (OAuth)

1. Acesse **https://developer.spotify.com/dashboard** → **Create app**.
   > Desde 2026, apps em *Development Mode* exigem que o **dono tenha Spotify Premium ativo**.
2. Em **Settings**, cadastre a **Redirect URI exatamente** como:
   ```
   http://127.0.0.1:8888/callback
   ```
   (Loopback `127.0.0.1` é permitido em HTTP; **`localhost` não é aceito**.)
3. Copie **Client ID** e **Client Secret**.
4. Crie o `.env` (a partir de `ranking-consensus/.env.example`) e preencha:

   ```env
   SPOTIFY_CLIENT_ID=seu_client_id
   SPOTIFY_CLIENT_SECRET=seu_client_secret
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
   SPOTIFY_SCOPES=user-top-read
   SPOTIFY_TIME_RANGE=long_term
   SPOTIFY_TOP_LIMIT=50
   ```

   > **Onde fica o `.env`:** os scripts procuram o `.env` no diretório de execução **e** em `ranking-consensus/`. Pode ficar na **raiz do repositório** (rode os comandos de lá) ou em `ranking-consensus/.env`. O `.env` e o token `.spotify_tokens.json` são **ignorados pelo git**.

5. Rode `node scripts/auth_server.js` e abra **http://127.0.0.1:8888/**. Ao autorizar, o app salva `data/spotify_me.json` e o token em `ranking-consensus/.spotify_tokens.json`.

---

## 6. Comandos (resumo)

Executados a partir de `ranking-consensus/` (ou da raiz com `node ranking-consensus/scripts/...`).

| Comando | O que faz |
| --- | --- |
| `node scripts/auth_server.js` | Login OAuth Spotify → `data/spotify_me.json` |
| `node scripts/auth_server.js --refresh` | Renova o token salvo e regrava as top tracks (sem navegador) |
| `node scripts/fetch_sources.js` | Coleta Deezer + iTunes → `data/*.json` |
| `node scripts/build_snapshot.js` | Gera `data/snapshot.js` + match-rate por par |
| `node scripts/run_benchmark.js` | Benchmark Merge vs força bruta |
| `node tests/test_node.js` | Testes do algoritmo (inversões/Kendall) |
| `node --test tests/test_issue5.js` | Testes da coleta/OAuth/snapshot |
| `node --test tests/test_consensus.js` | Testes de Borda/divergência/match-rate |
| `node --test tests/test_utils.js` | Testes de matching (normalização/dedupe/interseção) |
| `node --test tests/test_app_identity.js` | Regressão da identidade de chaves no app |

---

## 7. Testes e benchmark

**36 testes automatizados**, zero dependências (`node:assert` / `node:test`):

```bash
cd ranking-consensus
node tests/test_node.js
node --test tests/test_issue5.js tests/test_consensus.js tests/test_utils.js tests/test_app_identity.js
```

Teste **manual** (navegador): abra `ranking-consensus/tests/test_manual.html` (`file://`) — executa inversões, Kendall, `normalizeKey`, Borda e `classify` com contador pass/fail.

**Benchmark** (`node scripts/run_benchmark.js`) — contagem de inversões, dados determinísticos:

| n | Merge (ms) | Força bruta (ms) | razão |
| --: | --: | --: | --: |
| 1.000 | 1.065 | 3.945 | 3.70× |
| 2.000 | 0.910 | 5.532 | 6.08× |
| 5.000 | 1.429 | — (força bruta limitada) | — |
| 10.000 | 3.937 | — | — |
| 20.000 | 6.579 | — | — |

A força bruta é limitada a `n = 2.000` (evita `O(n²)` inviável); o Merge escala linearmente em `n log n`. Tempos variam conforme a máquina.

---

## 8. Resultados (dados reais)

Snapshot coletado em **06/10/2026** (modo cache):

| Fonte | Itens | Observação |
| --- | --: | --- |
| Spotify (você) | 50 | `long_term` |
| Deezer | 100 | Chart da região |
| iTunes | 92 | Storefront Brasil |
| **Interseção** | **0 / 0 / 3** | `me×Deezer = 0`, `me×iTunes = 0`, `Deezer×iTunes = 3` |

Todos os pares ficaram **abaixo do threshold (15)** → a matriz é exibida com o estado **"interseção insuficiente"** e a leitura **"seu gosto é bolha"**.

> **Isso é um resultado válido, não um erro.** O produto mede consenso/divergência: para um gosto divergente dos charts, a interseção baixa é a própria resposta (ver `docs/DECISIONS.md`, ADR-010). Ouvintes mais mainstream tendem a produzir interseções maiores.

---

## 9. Estrutura do projeto

```
G20_Ordenacao_EDA2-2026.2/
├── README.md
├── docs/                          # Contexto do projeto (PRODUCT, DESIGN, API, DATA_MODEL, DECISIONS, WORKFLOWS)
└── ranking-consensus/
    ├── index.html                 # Interface (carrega data/snapshot.js + js/*)
    ├── relatorio.md               # Relatório acadêmico
    ├── css/style.css              # Design system (Custom Properties)
    ├── js/
    │   ├── mergesort.js           # ⭐ Merge Sort + contagem de inversões (UMD)
    │   ├── kendall.js             # Kendall-Tau via inversões (UMD)
    │   ├── utils.js               # Normalização/matching (UMD)
    │   ├── consensus.js           # Borda + divergência/classify + match-rate (UMD)
    │   ├── sources.js             # Registro das fontes + loader do snapshot
    │   └── app.js                 # Orquestração da análise + render do DOM
    ├── scripts/
    │   ├── auth_server.js         # OAuth Spotify (Authorization Code)
    │   ├── fetch_sources.js       # Coleta Deezer + iTunes
    │   ├── build_snapshot.js      # Gera data/snapshot.js
    │   └── run_benchmark.js       # Benchmark O(n log n) vs O(n²)
    ├── data/                      # Snapshots reais (commitados) + snapshot.js
    ├── tests/                     # testes Node (*.js) + teste manual (test_manual.html)
    └── .env.example               # Modelo de credenciais (Spotify)
```

---

## 10. Decisões & limitações

- **Merge Sort** é usado pela **contagem de inversões** (`O(n log n)`); a implementação copia subarrays (`slice`), então o espaço total é `O(n log n)` de alocações (o bound clássico `O(n)` vale para a variante com buffer único).
- **Cache determinístico:** a demo lê `data/` e funciona offline; os charts congelam na data da coleta.
- **Threshold `<15`** de interseção (pares sinalizados) e **narrativa "bolha"** — ver `docs/DECISIONS.md` (ADR-006/ADR-009/ADR-010).
- **Zero dependências** em todo o projeto (HTML/CSS/JS puro + Node built-ins).
- Design system (tokens/componentes): [Figma EDA2 · node 16-2](https://www.figma.com/design/CZu2sZI1QmP1wofgDQPM8L/EDA2?node-id=16-2) — refletido em `css/style.css`.

---

## 11. Screenshots e vídeo

> _Adicionar após a gravação da apresentação._

- Heatmap de correlação **Você × Deezer × iTunes**
- Super-ranking de consenso (Borda)
- Painéis "Apostas seguras" vs "Minha bolha"

**Vídeo:** [Apresentação G20 — Ordenação 2026.2](https://youtu.be/linkaqui)

---

## 12. Referências

- **Merge Sort / contagem de inversões:** CORMEN, T. H. et al. *Introduction to Algorithms*. 4. ed. MIT Press, 2022.
- **Correlação de Kendall:** KENDALL, M. G. *A new measure of rank correlation*. Biometrika, v. 30, 1938.
- **Spotify Web API:** https://developer.spotify.com/documentation/web-api/
- **Deezer API:** https://developers.deezer.com/api
- **Apple/iTunes RSS:** https://itunes.apple.com/

---

**Implementação:** desenvolvida integralmente pela equipe **G20** (EDA2 · 2026.2).
