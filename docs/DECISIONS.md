# Architecture Decisions — Ranking Consensus Engine ("Meu gosto vs o Mundo")

> ADR log. Append new decisions at the bottom. Decisões **travadas** (não rediscutir na execução) estão marcadas como *Accepted*.
> **Last Updated:** 2026-10-06

## ADR-001: Carregamento de dados no browser via `<script>` (`data/snapshot.js`), não `fetch()`

**Date:** 2026-09-02 | **Status:** Accepted (Decisão D1 — Opção A)

### Context
O `README.md` exige abrir o `index.html` **direto via `file://`**. `fetch()`/XHR de `.json` local é bloqueado por CORS de origem em `file://` (Chrome/Firefox).

### Decision
Os coletores Node continuam gravando/​lendo `data/*.json` (fonte de verdade para testes/benchmark) **e** geram `data/snapshot.js` encapsulando tudo em `window.RANK_SNAPSHOT`, carregado via `<script src="data/snapshot.js">`.

### Rationale
Mantém a página 100% estática e abre sem servidor, preservando JSON como fonte de verdade para Node/relatório.

### Trade-offs
- ✅ Demo funciona offline e via `file://`; snapshots reprodutíveis.
- ⚠️ Duplicação de dados (`.json` + `snapshot.js`) exige regenerar o wrapper a cada coleta.

### Alternatives Considered
- **`fetch()` do JSON local:** bloqueado por CORS em `file://`.
- **Servir via servidor local:** descartado — contraria "abrir `index.html`".

---
## ADR-002: Módulos de algoritmo em formato UMD

**Date:** 2026-09-02 | **Status:** Accepted (D2)

### Context
Os mesmos arquivos (`mergesort.js`, `kendall.js`, `consensus.js`, `utils.js`) precisam rodar no **browser** (`file://`) **e** nos **testes Node**, sem duplicação.

### Decision
Padrão UMD: expõem namespace global no browser e `module.exports` no Node — `(function(root, factory){ … })(typeof globalThis!=='undefined'?globalThis:this, …)`.

### Rationale
Um único código serve as duas plataformas, evitando divergência entre produção e testes.

### Trade-offs
- ✅ Zero duplicação; testável em Node e executável em `file://`.
- ⚠️ Namespaces globais (`MergeSort`, `Kendall`, …) — cuidado com ordem de carregamento das `<script>` tags.

### Alternatives Considered
- **ES modules:** não carregam em `file://` (ver ADR-003).
- **Duas cópias (browser/node):** risco de divergência.

---
## ADR-003: Frontend com `<script>` comuns, sem `type="module"`

**Date:** 2026-09-02 | **Status:** Accepted (D3)

### Context
ES modules (`import`/`export`) não carregam via `file://` por restrição de CORS de origem.

### Decision
Usar `<script>` tags comuns e namespace global; **sem** `type="module"`. `app.js` é carregado por último.

### Rationale
Única forma de a app funcionar sem servidor, conforme exigência do README.

### Trade-offs
- ✅ Compatível com `file://`.
- ⚠️ Ordem de `<script>` importa; sem tree-shaking (irrelevante aqui).

### Alternatives Considered
- **Bundler (webpack/rollup):** adicionaria toolchain; conflita com "zero dependências".

---
## ADR-004: Testes e benchmark Node com built-ins apenas

**Date:** 2026-09-02 | **Status:** Accepted (D4)

### Context
O README especifica "sem dependências externas" e o comando `node tests/test_node.js`.

### Decision
Runner simples com `node:assert` + contador de passos + **exit code ≠ 0** em falha; benchmark com `performance.now()`.

### Rationale
Mantém o comando documentado funcionando e o repo livre de npm/jest.

### Trade-offs
- ✅ Zero deps; roda em qualquer Node 18+.
- ⚠️ Sem framework de relatório/cobertura prontos (saída é texto/tabela).

### Alternatives Considered
- **Jest/Vitest:** dependências externas proibidas.

---
## ADR-005: Unificação do Spotify Redirect URI em `http://127.0.0.1:8888/callback`

**Date:** 2026-09-02 | **Status:** Accepted

### Context
Havia divergência entre `PRODUCT.md §12.7` (mencionava `localhost`) e `.env.example` (`127.0.0.1`). O OAuth exige URI **exata** em três lugares.

### Decision
Fixar `http://127.0.0.1:8888/callback` (host `127.0.0.1`) no dashboard Spotify, no `.env` e no `auth_server.js` (mesmo bind).

### Rationale
`localhost` pode falhar na validação do dashboard; `127.0.0.1` é aceito de forma consistente.

### Trade-offs
- ✅ Fluxo OAuth confiável e documentado.
- ⚠️ Mudar a porta/host exige atualizar os três lugares simultaneamente.

### Alternatives Considered
- **`localhost:8888`:** validação instável no dashboard Spotify.

---
## ADR-006: Threshold de interseção `< 15` itens → par sinalizado

**Date:** 2026-09-02 | **Status:** Accepted (PRODUCT.md §12.3)

### Context
Kendall-Tau sobre interseções muito pequenas perde significado estatístico.

### Decision
Se um par tiver **< 15** itens em comum, o par é **sinalizado** e **não entra** na matriz principal ("interseção insuficiente").

### Rationale
Evita correlações enganosas; reporta o `match-rate` por par de forma transparente.

### Trade-offs
- ✅ Análise honesta; a "bolha" pequena é parte da narrativa.
- ⚠️ Pares de nicho podem sair da matriz.

### Alternatives Considered
- **Sem threshold:** reportaria `τ` sobre amostras ruidosas.

---
## ADR-007: MVP somente em modo cache determinístico

**Date:** 2026-09-02 | **Status:** Accepted (PRODUCT.md §12.6)

### Context
A demo precisa ser reprodutível e funcionar sem rede/login.

### Decision
MVP lê apenas `data/` (via `snapshot.js`). Modo "ao vivo" e `F9` (análise por dia) ficam pós-MVP.

### Rationale
Professor abre `index.html` e vê tudo sem rodar Node nem logar no Spotify.

### Trade-offs
- ✅ Demo offline e estável.
- ⚠️ Dados "congelam" na data da coleta (charts giram).

### Alternatives Considered
- **Modo ao vivo já no MVP:** dependência de rede/credenciais na apresentação.

---
## ADR-008: Correção da alegação de complexidade de espaço do Merge Sort

**Date:** 2026-10-06 | **Status:** Accepted

### Context
`README.md` (e o plano mestre) afirmavam "Espaço: `O(n)`". Porém `sortAndCount` copia subarrays com `array.slice(...)` a cada chamada recursiva, alocando **`O(n log n)`** no total. O bound clássico `O(n)` vale para a variante com **um único buffer auxiliar**.

### Decision
**Manter** a implementação atual (já validada em `#2`) e **corrigir a alegação** em `README.md` e no plano mestre para: "`O(n)` auxiliar por nível de merge; `O(n log n)` de alocações totais na implementação que copia subarrays".

### Rationale
Correção de documentação de baixo risco; a complexidade de **tempo** `O(n log n)` — o ponto central do trabalho — permanece correta e provada pelo benchmark (#3).

### Trade-offs
- ✅ Documentação fiel ao código; nenhum risco de regressão em código fechado.
- ⚠️ Não se obtém o bound estrito `O(n)` de espaço (aceitável para o MVP).

### Alternatives Considered
- **Refatorar `mergesort.js` para buffer único (`O(n)` real):** mexeria em código já aprovado pela #2 e não altera o tempo; descartado por ora.

## ADR-009: Ampliar o universo e alinhar a região das fontes (Deezer/iTunes/Spotify)

**Date:** 2026-10-06 | **Status:** Accepted

### Context
Após o login OAuth passar a funcionar, as interseções ficaram em **0–1 item**:
1. A URL Deezer padrão (`chart/0/tracks`) devolvia só **10 itens** (o endpoint limita a 10 sem `limit`);
2. O Deezer **regionaliza pelo IP** (retornou o chart do **Brasil**) enquanto o iTunes estava configurado para os **EUA** → Deezer(BR) × iTunes(US) = **0**;
3. O Spotify puxava `short_term` com **20** itens.

Mesmo alinhando a região, os charts do Deezer (streaming) e do iTunes (downloads) se sobrepõem pouco (**3 itens**).

### Decision
- **Deezer:** `chart/0/tracks?limit=100` (default configurável por `DEEZER_CHART_URL`).
- **iTunes:** storefront **Brasil** — `/br/rss/topsongs/limit=100/json` (default configurável por `ITUNES_TOP_SONGS_URL`).
- **Spotify:** `time_range=long_term` e `limit=50` (configuráveis por `SPOTIFY_TIME_RANGE` / `SPOTIFY_TOP_LIMIT`), + modo **não-interativo** `node scripts/auth_server.js --refresh` (renova o token salvo e regrava `data/spotify_me.json` sem navegador).

### Rationale
Aumentar o universo e comparar fontes da **mesma região** eleva a chance de interseção e torna a análise coerente para um usuário brasileiro, mantendo zero dependências.

### Trade-offs
- ✅ Fontes alinhadas; snapshots coletados sem re-login (`--refresh`).
- ⚠️ Ainda assim a interseção é baixa (0–3) para um gosto de nicho; o threshold `<15` (ADR-006) segue sinalizando os pares como "interseção insuficiente".

### Alternatives Considered
- **Manter iTunes US:** Deezer × iTunes = 0 garantido. Descartado.
- **Baixar o threshold `<15`:** contraria ADR-006/PRODUCT.md; **não** decidido aqui (em aberto).

### Update (2026-10-06) — alternativas descartadas na prática
- **Playlists editoriais via token de usuário:** o `search` funciona (200), mas `GET /playlists/{id}/tracks` retorna **403** (bloqueado para apps em Development Mode). Descartado.
- **Charts por gênero (Deezer):** Rap/Hip-Hop, Pop, Dance, Rock e R&B deram **0** de interseção com o top do usuário. Descartado.
- **Ampliar o "eu" (união de `short_term`+`medium_term`+`long_term`):** 121 faixas únicas → Deezer **2**, iTunes **0**. Insuficiente.
- **Conclusão:** nenhuma configuração das fontes públicas atinge `<15` para este usuário. Decisão de **produto** em aberto (aceitar a narrativa "bolha" / usar perfil de demonstração mais mainstream / redefinir "o mundo" como outro ouvinte / revisar o threshold).

## ADR-010: "Interseção insuficiente" / gosto de bolha é um resultado válido (não um erro)

**Date:** 2026-10-06 | **Status:** Accepted

### Context
Com as fontes alinhadas (ADR-009), a interseção para o usuário de teste ficou em **0–3** (abaixo do threshold 15 de ADR-006). Foram exploradas e descartadas: ampliar o universo, playlists editoriais (**403** em Development Mode) e charts por gênero (**0**). O gosto deste ouvinte não cruza com os charts regionais/globais — mas isso é **característico de um ouvinte**, não um defeito do produto.

### Decision
**Aceitar a narrativa "bolha".** Manter as fontes (**Spotify pessoal + Deezer região + iTunes BR**) e tratar "interseção insuficiente" como **resultado de primeira classe**: a UI deve exibir o **match-rate por par** (ex.: `0/0/3`), os pares sinalizados e a leitura "seu gosto é bolha/divergente" — em vez de tratar como erro ou lista vazia. O threshold `<15` (ADR-006) **permanece**.

### Rationale
O produto mede **consenso/divergência**; baixa interseção é um resultado informativo e honesto. É um **caso por usuário**, não universal — ouvintes mais mainstream produzem interseções maiores.

### Trade-offs
- ✅ Coerente com a proposta ("descubra o quão mainstream você é"); nenhum dado é inventado.
- ⚠️ Para este usuário, o heatmap fica **vazio** e o painel "apostas/bolha" não terá itens pessoais; o **super-ranking** terá apenas os itens compartilhados entre Deezer e iTunes (3).

### Consequences / Implications
- **#7 (frontend):** renderizar `loading/erro/vazio/interseção insuficiente` como parte da narrativa; destacar o match-rate e a mensagem "seu gosto é bolha".
- **Relatório (#8):** documentar o caso e a distribuição de interseção.

### Alternatives Considered
- **Perfil de demonstração mainstream / "mundo = outro ouvinte" / baixar o threshold:** descartados pelo usuário nesta decisão.

---
*Generated by context-generator on 2026-10-06*
