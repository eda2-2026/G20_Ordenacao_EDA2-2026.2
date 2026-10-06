# Project Context — Ranking Consensus Engine ("Meu gosto vs o Mundo")

> **Last Updated:** 2026-10-06 | **Maintained By:** AI Agent Team (G20)
> **Architecture:** Layered hybrid — camada de serviço/ingestão Node + aplicação web estática

---

## 1. Project Overview

Aplicação web do **Trabalho 2 de Estrutura de Dados 2 (2026.2, equipe G20)** que compara a **lista pessoal de músicas mais tocadas** do usuário (Spotify, via OAuth **Authorization Code**) com **charts globais reais** (Deezer e Apple/iTunes). O diferencial técnico é usar o **Merge Sort** de forma não-óbvia — a **contagem de inversões em O(n log n)** — para calcular a **correlação de Kendall-Tau** entre rankings, gerando heatmap de consenso, super-ranking (fusão Borda) e a classificação "apostas seguras vs minha bolha". Público-alvo: ouvinte curioso, curador de música e o professor avaliador. Fonte de verdade do produto: `PRODUCT.md`; estrutura-alvo: `README.md`.

---

## 2. Technology Stack — Dev Commands

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript ES6+ **puro** (módulos UMD, sem framework) |
| Build Tool | **N/A** — sem build; a página abre direto via `file://` |
| CSS | CSS3 puro com **Custom Properties** (design system próprio) |
| Backend | Node.js 18+ — módulos `http` nativo + `fetch` global, **sem framework** |
| Database | **N/A** — persistência por JSON estático em `ranking-consensus/data/` |
| ORM | **N/A** |
| Auth | **Spotify OAuth2 — Authorization Code** (login de usuário) |
| Package Manager | **N/A** — zero dependências npm |
| Linter | **N/A** — revisão manual |
| Formatter | **N/A** |

**Dev Commands:**

| Command | Description |
|---------|------------|
| `start index.html` | Abrir a aplicação (`file://`), **sem servidor** |
| `node tests/test_node.js` | Testes unitários Node (`node:assert`) |
| — | E2E: teste manual em `tests/test_manual.html` — ⏳ planejado (**#8**) |
| — | Lint: N/A (não configurado) |
| — | Type-check: N/A (JS puro) |
| — | Build: N/A |
| — | Security scan: N/A (revisão manual — T26/#8) |
| `node scripts/fetch_sources.js` | Coleta Deezer + iTunes (BR) → `data/` |
| `node scripts/build_snapshot.js` | Gera `data/snapshot.js` (browser) + match-rate |
| `node scripts/auth_server.js` | OAuth Spotify (login) → `data/spotify_me.json` |
| `node scripts/auth_server.js --refresh` | Renova o token salvo e regrava top tracks (sem navegador) |
| `node scripts/run_benchmark.js` | Benchmark O(n log n) vs O(n²) |

> Comandos de teste, coleta, snapshot e benchmark implementados (issues #3 e #5 concluídas).

**Test DB Management:**

| Command | Description |
|---------|------------|
| N/A | Sem banco de dados — snapshots JSON versionados em `data/` |
| N/A | Sem migrations |

---

## 3. Architecture

**Pattern:** **Layered hybrid** — duas camadas com responsabilidades separadas (PRODUCT.md §11):

1. **Camada de Serviço / Ingestão (Node.js):** `auth_server.js` (OAuth Spotify, `http` nativo em `127.0.0.1:8888`), `fetch_sources.js` (Deezer/iTunes) e `build_snapshot.js` (gera o wrapper browser). Resolve CORS e protege o `access_token` (segredos só no `.env`, server-side).
2. **Camada de Aplicação (web estática):** todo o cálculo roda no navegador — matching (`utils.js`), inversões (`mergesort.js`), Kendall-Tau (`kendall.js`), Borda/divergência (`consensus.js`) e orquestração/render (`app.js`). Consome dados já congelados via `window.RANK_SNAPSHOT`.

**Decisões estruturais travadas:** ver `DECISIONS.md` (snapshot via `<script>`, UMD, sem ES modules, zero deps). O executa via `file://` **sem** servidor — exigência central do `README.md`.

---

## 4. Data Model

Sem banco de dados. Entidades de dados (arquivos JSON em `data/`):

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| `Source` | `id`, `name`, `color`, `kind` | has many `Item` |
| `Item` (track) | `key`, `title`, `artist`, `position` | belongs to `Source` |
| `Snapshot` | `sources[]`, `generatedAt` | agrega `Source[]` |

> Schema completo, shape do `snapshot.js` e regras de matching → `DATA_MODEL.md`.

---

## 5. Coding Standards & Conventions

- **Naming:** `camelCase` para variáveis/funções; `PascalCase` para namespaces globais (`MergeSort`, `Kendall`, `RankingConsensusUtils`).
- **Files/Folders:** arquivos em `lowercase` (`mergesort.js`, `kendall.js`, `utils.js`, `style.css`); diretórios em `kebab-case`/`lowercase`.
- **Imports:** **sem ES modules** (D3) — módulos UMD que expõem namespace global no browser e `module.exports` no Node.
- **Module pattern:** IIFE UMD `(function(root, factory){ … })(typeof globalThis!=='undefined'?globalThis:this, …)`.
- **Commit Convention:** **Conventional Commits** — `<type>(<scope>): <descrição>` (obs.: os 2 PRs mesclados usaram `feat(scope):`).
- **Branch Naming:** `<type>/<id>-<short-desc>` (ex.: `feat/2-4-core-algorithms-matching`) — na prática também `feat/issue-<id>`.
- **Dependências:** **proibido** adicionar libs externas (requisito do trabalho).

---

## 6. Testing Strategy

- **Framework:** `node:assert` nativo — **zero dependências** (T4/D4). Sem Jest/Vitest.
- **E2E:** N/A — teste manual em `tests/test_manual.html` (⏳ #8).
- **Coverage Threshold:** N/A — sem ferramenta de cobertura configurada.
- **Test File Convention:** arquivos em `tests/` (`test_node.js`, `test_manual.html`).
- **Test Location:** `ranking-consensus/tests/`.
- **Mock Strategy:** N/A — comparação contra **força bruta** (O(n²)) em entradas pequenas como oráculo de corretude.
- **Pre-commit/PR:** testes Node devem passar 100%; exit code ≠ 0 em falha; imprime "X passaram / Y falharam".
- **Benchmark:** `scripts/run_benchmark.js` — tabela `n` vs tempo (Merge vs força bruta), evidência para o relatório.

---

## 7. Authentication & Security

- **Auth Method:** **OAuth2 — Spotify Authorization Code** (login de usuário), escopo `user-top-read`.
- **Redirect URI:** `http://127.0.0.1:8888/callback` — **exata** e idêntica em dashboard Spotify + `.env` + `auth_server.js`. Host `127.0.0.1` (não `localhost`).
- **Token:** `access_token` + `refresh_token`; renovação via `grant_type=refresh_token`; nunca vai para o browser no modo cache.
- **Security Scanner:** N/A (revisão manual — T26).
- **Secrets Management:** `.env` (nunca versionado; `.gitignore` na raiz); apenas `.env.example` é commitado. Segredos nunca chegam ao browser no modo cache.

---

## 8. Styling & Design

- **Figma File:** https://www.figma.com/design/CZu2sZI1QmP1wofgDQPM8L/EDA2 (página "Algoritmo de Ordenação"; design system node `16-2`).
- **Primary Font:** **Georgia** (display/serif) para títulos e emoção editorial; **Inter** (body) para UI; **mono** (`Consolas`/SFMono) para métricas.
- **CSS Approach:** CSS3 puro com **Custom Properties** (`--ink-*`, `--cyan-*`, `--coral-*`, `--spotify`, `--space-*`, `--radius-*`). Sem Tailwind/frameworks.
- **Color Palette:** tema escuro "Music Intelligence" — base `--ink-950 #080b12`; **consenso** = `--cyan-500 #52d4e8`; **divergência** = `--coral-500 #ff7e73`; verde Spotify `--spotify #9be15d` reservado a status.

> Design system completo (tokens, tipografia, componentes, a11y) → `DESIGN.md`.

---

## 9. External Dependencies & Integrations

| Service | Purpose | Auth/Config |
|---------|---------|-------------|
| Spotify Web API | Lista pessoal de mais tocadas (`/v1/me/top/tracks?time_range=long_term&limit=50`) | OAuth2 Authorization Code (`user-top-read`) |
| Deezer API | Chart da região (top 100, `chart/0/tracks?limit=100`) | Nenhuma (pública) |
| Apple/iTunes RSS | Top songs Brasil (`/br/rss/topsongs/limit=100/json`) | Nenhuma (pública) |

> Zero dependências **npm**. Contratos e payloads → `API.md`.

---

## 10. Common Pitfalls & Lessons Learned

> _Filled automatically by the `lessons-writer` skill during development._

- **`file://` quebra `fetch()` de JSON local e ES modules** → usar `window.RANK_SNAPSHOT` via `<script>` (D1) e scripts clássicos sem `type=module` (D3). Validar sempre abrindo o `index.html` por `file://`, não em `localhost` (ver `DECISIONS.md`).
- **Complexidade de espaço do Merge Sort:** o código atual copia subarrays (`slice`), então aloca `O(n log n)` no total — não confundir com o bound clássico `O(n)` (buffer único).
- **Interseção baixa/zero é resultado válido ("gosto de bolha"), não bug** — as fontes públicas podem não cruzar com um ouvinte específico. A UI deve exibi-lo como resultado (ADR-010).
- **Fontes/região:** `Deezer /chart/0/tracks` sem `limit` devolve **10** itens e é **regional** (pelo IP); iTunes precisa de storefront explícito (`/br/`); playlists do Spotify retornam **403** em Development Mode (ver ADR-009).

---

## 11. Context Files

> Specialized context documents. Load the relevant file for each task type.

| File | Purpose | When to read |
|------|---------|--------------|
| `DESIGN.md` | Tokens, tipografia, paleta, componentes, a11y | Tarefas frontend/UI |
| `API.md` | Endpoints externos, contratos UMD internos, error codes | Integração, testes |
| `DATA_MODEL.md` | Shape do snapshot, entidades, matching | Dados, matching, fixtures |
| `DECISIONS.md` | ADRs (D1–D4 + redirect, threshold, espaço) | Planejamento, review |
| `WORKFLOWS.md` | Branching, commits, PR, comandos, segurança | Commit, hotfix |

---
*Created by context-generator on 2026-10-06*
