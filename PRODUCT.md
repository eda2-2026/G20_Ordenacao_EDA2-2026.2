# PRODUCT.md — Ranking Consensus Engine · edição "Meu gosto vs o Mundo" (Música)

> **Disciplina:** Estrutura de Dados 2 (2026.2) — Trabalho 2: Ordenação
> **Equipe:** G20 — Italo Alves Sampaio de Oliveira · José Eduardo Vieira do Prado
> **Conceito central:** Aplicar o **Merge Sort** além da ordenação — usar sua **contagem de inversões** para medir a concordância (Kendall-Tau) entre a **sua própria lista de mais tocadas** (Spotify) e os **charts globais reais** (Deezer, Apple/iTunes).
> **Status:** Definição de Produto / MVP / Viabilidade — antes do planejamento técnico e da implementação.

---

## 1. Resumo do Produto

**Ranking Consensus Engine · "Meu gosto vs o Mundo"** é uma aplicação web que pega **a sua listagem pessoal de músicas mais tocadas** (via Spotify, com login) e a compara com os **charts globais reais** (Deezer e Apple/iTunes), respondendo com rigor matemático:

> *"O que **EU** mais escuto está alinhado com o que **o MUNDO** mais escuta? Quais das minhas músicas são **HITS CONSENSO** (todo mundo concorda) e quais são a **minha bolha** (só eu / underground)?"*

A engenharia-chave não é "ordenar uma lista". É usar um algoritmo de ordenação — **Merge Sort** — para fazer algo que a maioria das pessoas não sabe que ele faz: **contar inversões em O(n log n)**, o que permite calcular a **correlação de Kendall** entre duas classificações de forma muito mais rápida que a força bruta (O(n²)).

### O pulo do gato (o que diferencia o trabalho)
Não é uma "corrida de algoritmos". É **escolher UM algoritmo e extrair o melhor que ele tem de único**. O Merge Sort aqui não serve apenas para ordenar: ele é a ferramenta para **medir consenso/divergência** — aqui, entre o **gosto pessoal** e o **gosto do mundo**. Um conceito genuinamente útil (comparar rankings, QA de recomendadores, análise de opinião pública).

---

## 2. Problema & Oportunidade

### Problema
Uma mesma música pode ser disparadamente popular no mundo e, ao mesmo tempo, **invisível** ou **super-ouvida** por você. **Não existe uma visão objetiva de "o meu gosto combina com o mainstream?"** — cada ranking é um recorte de um público específico, com vieses próprios (algoritmo, região, catálogo, bolha pessoal).

### Oportunidade
- **Quantificar** essa relação entre gosto pessoal e gosto global de forma matematicamente sólida.
- Descobrir se suas músicas favoritas são **apostas seguras** (consenso) ou a **sua bolha** (divergência pessoal).
- Para qualquer área baseada em ranking (música, filmes, produtos, notícias), o conceito de **consenso entre fontes** é valioso — aqui aplicado de forma **pessoal e visual**.

### Valor para o curso
Cumpre o tema (Ordenação) com profundidade: o aluno mostra que domina o algoritmo e consegue **aplicá-lo a um problema real não-óbvio**, com análise de complexidade, validação de corretude e **autenticação OAuth de usuário de verdade** — além do padrão que o professor valorizou no Trabalho 1.

---

## 3. Público-alvo / Personas

| Persona | Necessidade |
|---|---|
| **Ouvinte curioso** | "Meu gosto é mainstream ou bolha? O que o mundo concorda comigo?" |
| **Analista de música / curador** | Entender o quão alinhado um gosto está com o mercado / descobrir hits consensuais |
| **Professor (avaliador)** | Ver a aplicação real de um algoritmo de ordenação + OAuth real + rigor experimental |

---

## 4. Proposta de Valor

> Unir o **seu ranking pessoal** (Spotify) a **2+ charts globais reais** em uma única visão, mostrando onde seu gosto **concorda** (consenso) e onde **diverge** (bolha), com a garantia matemática de confiabilidade (Kendall-Tau) e **rapidez** (Merge Sort O(n log n)).

**Diferenciais:**
- **Dados reais**: seu histórico pessoal (Spotify, via login) + charts globais (Deezer, iTunes).
- **Análise por estatística de ranqueamento** (Kendall-Tau), não "achismo".
- **Visualização clara**: heatmap de consenso + "meu ranking vs mundo" + "hits consensuais vs minha bolha".
- **Rigor experimental** provado contra força bruta (O(n²) vs O(n log n)).
- **OAuth de usuário de verdade** (Authorization Code) — integração de API real e moderna.

---

## 5. Como funciona (conceito técnico)

1. **Coleta:** **Sua lista pessoal** (Spotify `GET /v1/me/top/tracks?time_range=short_term`) + **Deezer** (chart global) + **iTunes** (top songs EUA). Cada uma entrega uma lista ordenada; a **posição** de cada item é o **índice no array** da API (0-based) — uniforme entre as fontes.
2. **Matching (universo comum):** cada música é convertida numa **chave** `título|artista` normalizada (minúscula, sem acentos, sem pontuação, sem sufixos como "(feat. …)", "(Remix)", "Explicit", etc.). Só os itens presentes em **≥2 fontes** entram na análise (interseção). Para cada fonte usamos a **ordem relativa dentro da interseção** (re-rank), não a posição original.
3. **Correlação por par (Kendall-Tau):** para cada par de fontes (ex.: **eu × Deezer**, **eu × iTunes**, **Deezer × iTunes**), o algoritmo **re-indexa** o ranking de uma fonte segundo a ordem da outra e conta as **inversões** com **Merge Sort** → obtém concordantes/discordantes → calcula `tau`.
4. **Consenso:** fusão **Borda** (soma de pontos por posição) gera um **super-ranking** "o melhor segundo todas as fontes" (conjunto: itens em ≥2 fontes).
5. **Polêmica/bolha:** para cada música, soma-se a fração de inversões em que ela participa → "score de divergência". Alta divergência = **minha bolha** (ou polêmica); baixa = **aposta segura** (consenso).

> **Por que Merge Sort?** A contagem de inversões é exatamente o passo de `merge`. Sem ele, contar inversões custa O(n²). Com Merge Sort é O(n log n) — e é isso que torna a análise escalável e, conceitualmente, bonita.

---

## 6. Funcionalidades

### Núcleo (não negociáveis para o MVP)
- **F1.** Obter **suas mais tocadas** (Spotify, via login) + rankings reais de **Deezer** e **iTunes**.
- **F2.** Calcular **Kendall-Tau** entre todos os pares de fontes (matriz de correlação / heatmap), incluindo **"eu × mundo"**.
- **F3.** Gerar o **Super-Ranking de consenso** (Borda).
- **F4.** Classificar músicas em **"Apostas seguras"** (baixa divergência) e **"minha bolha"** (alta divergência), com score.
- **F5.** Exibir **match-rate** (quantas músicas casaram entre fontes), métricas por par e o **score de divergência pessoal** (quão mainstream é o seu gosto).

### Diferenciais (surpresa / pós-MVP)
- **F6.** Painel "adaptativo": explicar, com dados, que a escolha de algoritmo depende do formato do dado (quase-ordenado vs aleatório).
- **F7.** Visualização da contagem de inversões passo a passo (animação) para fins didáticos.
- **F8.** Modo "ao vivo" (atualização automática) vs modo "cache" (dados congelados).
- **F9.** **Análise por dia** (usando `user-read-recently-played`): "o que eu mais ouvi num dado dia".

---

## 7. MVP — Escopo

### IN (fazemos no MVP)
- Aplicação web (HTML5/CSS3/JS puro — mesma stack caprichada do T1).
- **Fontes (confirmado):** **Spotify pessoal** (`/me/top/tracks`, via **Authorization Code**/login) + **Deezer** + **Apple/iTunes** (sem chave).
- **F1–F5** completas.
- **Mini servidor Node** (módulo `http` nativo, sem dependências) para o fluxo de **login OAuth**: abre autorização, captura o callback em `localhost`, troca código por token, busca as top tracks, salva em `data/`.
- **Super-ranking de consenso sobre itens presentes em ≥2 fontes** (a fusão Borda não considera música que aparece em só uma fonte).
- **Mix híbrido:** Node coleta as APIs (resolvem CORS + guardam credenciais server-side) + app no browser que faz todo o cálculo e renderiza.
- **Modo cache determinístico** (dados reais congelados em `data/`) para demo/relatório reprodutível.
- **Testes automatizados** (Node): contagem de inversões vs força bruta, Kendall-Tau vs força bruta em permutações pequenas.
- **Benchmark** (Node) provando empiricamente O(n log n) vs O(n²) (tabela para o relatório).
- **Relatório acadêmico** (`relatorio.md`) com introdução, teoria, implementação, resultados e conclusão.

### OUT (deixamos para depois / se der tempo)
- `F9` (análise por dia via `recently-played`) — feature extra se der tempo.
- Matching difuso (fuzzy/Levenshtein, acentos, feat/remix) — MVP usa normalização simples.
- Mais fontes (Last.fm, segundo chart de outra região, etc.).
- Exportação/salvamento de resultados, histórico.
- Gráficos com bibliotecas externas (MVP usa canvas/CSS puro).

---

## 8. Fontes de dados & Viabilidade (análise por API)

| Fonte | Endpoint principal | Auth | Ranking disponível | Limitação |
|---|---|---|---|---|
| **Spotify (pessoal)** ⭐ | `GET /v1/me/top/tracks?time_range=short_term` | **Authorization Code** (login) | **Suas mais tocadas** (ranking pessoal) | Requer login do usuário + mini servidor p/ callback |
| **Deezer** | `api.deezer.com/chart/0/tracks` | Nenhuma | Chart global top 100 | Catálogo/região específica |
| **Apple/iTunes** | `itunes.apple.com/us/rss/topsongs/limit=100/json` | Nenhuma | Top songs (EUA) | EUA-centrado |

> **Nota sobre o Spotify:** a tentativa anterior de usar a playlist editorial "Global Top 50" via *client-credentials* retornou **404** (limitação conhecida — playlists editoriais bloqueiam tokens de app). **Solução:** usar os dados **pessoais** (`/me/top/tracks`) com o fluxo **Authorization Code** (login), que **funciona de forma confiável**.

### Veredito de viabilidade: ✅ **Viável**
- **APIs gratuitas e acessíveis** (Deezer/iTunes sem chave; Spotify com login).
- **Dados suficientes** para a análise (título + artista + posição em todas).
- **Algoritmo bem definido e conhecido** (Merge Sort inversões + Kendall-Tau).
- **Arquitetura** (Node coleta + browser calcula) resolve CORS e protege credenciais/access token.

### ⚠️ Riscos & Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **Matching/universe** — mesma música com nomes diferentes entre plataformas (feat, remix, "explicit", pontuação) | **ALTO** — se a interseção for pequena, o Kendall-Tau perde significado | Normalização robusta; **reportar match-rate por par**; threshold (par < 15 itens → sinalizado/ignorado). *Obs.: gosto de nicho = interseção pequena é natural e é parte da história (é "a bolha"), mas reportamos.* |
| **OAuth / login** — fluxo exige usuário logar e um servidor de callback | Médio | Mini servidor Node nativo (`http`) em `localhost`; token com **refresh token** guardado; busca 1x e cacheia em `data/`. |
| **Token expirado** | Médio | Renovar com `refresh_token` automaticamente; se falhar, re-login. |
| **Disponibilidade de rede na demo** | Médio | Modo cache (dados reais já baixados) = funciona offline. |
| **Rate limit das APIs** | Baixo | Uma chamada por execução; cachear; nunca spam na demo. |
| **Identidade do item** — título duplicado/versões | Médio | Chave composta `título+artista` normalizada; deduplicação. |

**Conclusão técnica:** com **Spotify (pessoal) + Deezer + iTunes** conseguimos uma matriz 2×2 ou 3×3 de correlação de forma confiável. O maior investimento é no **matching** e no **fluxo OAuth** — ambos gerenciáveis e reportáveis (e que viram ótimo conteúdo para o relatório). A métrica chave do produto é **"quão 'mainstream' é o meu gosto"** (tau entre você e o mundo).

---

## 9. Métricas de Sucesso

- **Corretude:** 100% dos testes — contagem de inversões e Kendall-Tau batem com força bruta em entradas pequenas.
- **Performance:** tabela empírica provando Merge (O(n log n)) muito mais rápido que força bruta (O(n²)) em n = 1.000 → 20.000.
- **Qualidade de matching:** reportar o **match-rate por par** (ex.: você×Deezer, você×iTunes, Deezer×iTunes). Meta: interseção por par ≥ ~15 músicas; abaixo disso, o par é sinalizado/ignorado.
- **Sentido dos dados:** tau **você × Deezer/iTunes** deve ser interpretável (positivo = gosto mainstream; próximo de 0/negativo = bolha); valida que a análise é coerente.
- **Experiência:** app abre, carrega dados reais, renderiza heatmap + super-ranking + "consenso vs bolha" (< 1s de interação).

---

## 10. Roadmap (Fases)

### Fase 0 — Fundação (antes de planejar a implementação)
- ✅ Definição de produto (este doc), MVP e viabilidade.
- ✅ Decidir fontes e modelo de dados (chave de matching, itens, posição).

### Fase 1 — Prova de conceito do algoritmo
- Implementar (em Node/testes) `contagem de inversões via Merge Sort` e `Kendall-Tau`.
- Validar contra força bruta (testes) + rodar benchmark O(n log n) vs O(n²).

### Fase 2 — Coleta de dados
- Script Node: `fetch_sources.js` (Deezer + iTunes) → `data/`.
- **Fluxo OAuth Spotify**: mini servidor Node + login → `/me/top/tracks` → `data/spotify_me.json`.
- Normalização + matching.

### Fase 3 — Aplicação web (MVP)
- UI: heatmap de correlação + super-ranking (Borda) + "apostas seguras vs minha bolha" + match-rate.
- Carregar cache (e, se possível, modo ao vivo).

### Fase 4 — Rigor e entrega
- Testes completos, relatório `relatorio.md`, screenshots, README, vídeo.

---

## 11. Decisões de Produto (confirmadas)

> Decisões tomadas junto à equipe — registro formal antes do planejamento técnico.

| # | Decisão | Valor |
|---|---|---|
| 1 | **Domínio** | Música ✅ |
| 2 | **Conceito** | **"Meu gosto vs o Mundo"** — comparar a **sua** lista pessoal com os charts globais ✅ |
| 3 | **Fontes** | **Spotify pessoal** (`/me/top/tracks`, login) + **Deezer** + **Apple/iTunes** ✅ |
| 4 | **Autenticação Spotify** | **Authorization Code** (login do usuário) — as playlists editoriais via client-credentials retornavam 404, então usamos dados pessoais ✅ |
| 5 | **Arquitetura** | **Mini servidor Node** (OAuth callback) + **coletor Node** (Deezer/iTunes) + **app web estático** + **benchmark/testes Node** ✅ |

### Arquitetura (visão geral)

```
Camada de Serviço / Ingestão (Node.js)
  auth_server.js (módulo http nativo, localhost:8888)
    └── login Spotify → callback → token → GET /v1/me/top/tracks → data/spotify_me.json
  fetch_sources.js
    ├── Deezer  (chart global)   → data/deezer.json
    └── iTunes  (top songs EUA)  → data/itunes.json
          │
          ▼  dados reais (cache determinístico)
Camada de Aplicação (web estática — abrir index.html)
  ├── Matching (título|artista normalizado)
  ├── ⭐ Merge Sort: contagem de inversões
  ├── Kendall-Tau (matriz / heatmap, incluindo "EU × mundo")
  ├── Super-ranking de consenso (Borda)
  └── "Apostas seguras" vs "Minha bolha"
```

**Por que essa arquitetura:** resolve CORS e protege o access token, o app é 100% estático (professor só abre o `index.html`), os dados reais ficam congelados em `data/` (demo/relatório reprodutíveis), todo o algoritmo fica visível no navegador, e o Node cuida de OAuth, benchmark (O(n log n) vs O(n²)) e testes.

---

## 12. Especificações Fechadas (para o plano de implementação)

> Decisões técnicas detalhadas — o plano deve seguir estas regras sem reinterpretar.

### 12.1 Item e posição
- Cada música carrega: `key` (chave de matching), `title`, `artist`, `position`.
- **`position` = índice (0-based) no array retornado pela API** — uniforme entre as fontes.

### 12.2 Chave de matching (normalização)
- Chave = `` `${title}|${artist}` `` **normalizado**, nesta ordem:
  1. `unicode.normalize('NFD')` e remoção de diacríticos (acentos);
  2. minúsculas;
  3. remoção de pontuação/parênteses (inclui sufixos comuns: `(feat. …)`, `ft. …`, `(remix)`, `(bonus)`, `explicit`, `deluxe`, `live`, `edit`, etc.);
  4. colapso de espaços múltiplos.
- **Artista:** primeiro artista da fonte (o principal); em strings `"A, B"`, fica apenas `"A"` (cortar após vírgula) para melhor casamento.
- Itens duplicados (mesma chave na mesma fonte) → **deduplicar**, mantendo a melhor posição.

### 12.3 Interseção e re-rank
- A análise Kendall-Tau opera **apenas sobre a interseção** de cada par.
- Dentro da interseção, cada fonte é **re-indexada pela ordem relativa** (não pela posição original).
- **Threshold:** se um par tiver **< 15 itens** em comum, o par é **sinalizado** e **não entra** na matriz principal (fica como "interseção insuficiente").

### 12.4 Super-ranking de consenso (Borda)
- **Conjunto:** somente itens presentes em **≥2 fontes** (a união qualificada).
- **Pontos Borda:** para uma fonte com `m` itens, o item na posição relativa `p` (0-based) recebe `m - p` pontos. Soma os pontos entre as fontes onde o item aparece; ordena decrescente.

### 12.5 Score de divergência / bolha (por item)
- Para **cada fonte envolvida**, o item participa de inversões com os demais itens da interseção. O score é a **fração** de inversões daquele item **normalizada pelo total de pares possíveis naquele par** (elimina viés de tamanho de lista).
- **Agregação entre pares:** média das frações normalizadas entre todos os pares onde o item aparece.
- **Classificação:** itens com fração **acima do percentil ~75%** → "Minha bolha / Polêmicos"; **abaixo do percentil ~25%** → "Apostas seguras"; demais → neutros.

### 12.6 Modos
- **MVP:** somente **modo cache determinístico** (lê `data/`).
- **Pós-MVP (bônus):** modo "ao vivo" e `F9` (análise por dia).

### 12.7 Spotify — autenticação e dados pessoais
- Fluxo **Authorization Code** (login do usuário), **não** client-credentials.
- **Redirect URI:** `http://localhost:8888/callback` (importante neste fluxo — precisa ser exato e configurado no app do Spotify).
- **Escopo:** `user-top-read` (para `/me/top/tracks`). Opcional: `user-read-recently-played` (para `F9`).
- Endpoint: `GET /v1/me/top/tracks?time_range=short_term` (e `medium_term`/`long_term` como alternativas).
- **Token:** guardar `access_token` + `refresh_token`; renovar com `grant_type=refresh_token`; cachear resultados em `data/spotify_me.json`.

### 12.8 Dados e reprodutibilidade
- Coletas geram arquivos em `data/`: `spotify_me.json`, `deezer.json`, `itunes.json`.
- Estrutura comum: `{ sources: [{ id, name, items: [{ key, title, artist, position }] }] }` (ou arquivos separados por fonte).
- **Comitar os snapshots** no repositório para a demo do professor funcionar **sem rodar Node** (o login OAuth e as chamadas ficam opcionais/cacheados). Regerar depois ao atualizar.

---

## 13. Design System — Referência no Figma

> **Fonte de verdade visual do produto.** Qualquer implementação de front-end (`index.html`, `css/style.css`, `app.js`) deve seguir este design system, que está publicado no **Figma**.

### 13.1 Arquivo e página
- **Figma (arquivo EDA2):** https://www.figma.com/design/CZu2sZI1QmP1wofgDQPM8L/EDA2
- **Página de destino:** **Algoritmo de Ordenação**
- **Node do design system:** [Editar no Figma](https://www.figma.com/design/CZu2sZI1QmP1wofgDQPM8L/EDA2?node-id=16-2)
- **Preview local:** `design-system-preview.html`

### 13.2 Conceito visual
> **"Music Intelligence"** — interface escura, sofisticada e orientada a dados, com energia de plataformas musicais (Spotify, Apple Music, Deezer) **sem** copiar a identidade de nenhuma delas.

- Sensação: *"Estou descobrindo meu lugar no mapa musical."*
- Gosto pessoal tratado como **descoberta e medida**, nunca julgamento.
- **Cor semântica:** consenso vs. divergência comunicados à primeira vista.
- **Tipografia:** editorial (emoção) para títulos/resultado + mono (evidência) para métricas técnicas.

### 13.3 Tokens de cor (essenciais)
| Token | Hex | Semântica |
|---|---|---|
| `--ink-950` | `#080b12` | Fundo base (quase preto azulado) |
| `--ink-900` | `#0d111a` | Superfícies profundas |
| `--ink-850` | `#121824` | Cards / elevação média |
| `--ink-800` | `#18202d` | Superfícies elevadas / hover |
| `--ink-700` | `#273142` | Bordas / neutros fortes |
| `--ink-500` | `#667287` | Texto terciário / desabilitado |
| `--ink-300` | `#aeb8c8` | Texto secundário |
| `--paper` | `#f3f6fa` | Texto primário sobre fundo escuro |
| `--cyan-500` | `#52d4e8` | **Consenso** (aposta segura, afinidade) |
| `--cyan-300` | `#a9f2fa` | Consenso — variante clara/hover |
| `--coral-500` | `#ff7e73` | **Divergência** (minha bolha) |
| `--coral-300` | `#ffc0b8` | Divergência — variante clara |
| `--spotify` | `#9be15d` | Status "Spotify conectado" (apenas status) |

> **Regra:** o verde do Spotify é reservado a status de conexão, **nunca** como cor de marca do produto. Consenso e divergência controlam a narrativa visual.

### 13.4 Tipografia
- **Display:** Georgia / serif — títulos e emoção editorial.
- **Body:** Inter / sans-serif — interface.
- **Mono:** SFMono / monospace — métricas (`τ`, `O(n log n)`, posições, scores).
- Escala: `--text-xs` 12px → `--text-2xl` 30px → `--text-3xl` clamp(44–104px, hero).

### 13.5 Espaçamento e raios
- Grid base 4/8px: `--space-1` 4px → `--space-16` 64px. Contêiner máx. 1440px.
- Raios: `--radius-sm` 8px · `--radius-md` 14px · `--radius-lg` 22px · `--radius-pill` 999px.
- Sombras: `--shadow-card` · `--shadow-glow` (brilho ciano sutil). Foco: `--focus-ring`.

### 13.6 Componentes (inventário)
- **Botões:** `primary` (ciano), `ghost` (borda), `spotify` (status verde); altura mín. 44px; pill.
- **Badges:** `safe` (consenso), `bubble` (divergência), `neutral`.
- **Metric cards:** Kendall-Tau médio, match-rate, faixas analisadas, fontes ativas.
- **Music rows:** posição + capa + título/artista + score.
- **Heatmap cells:** matriz de correlação — **sempre com valor numérico visível** (nunca só cor).
- **Status de fonte · Alertas:** loading, erro, vazio, interseção insuficiente.

### 13.7 Layout (padrões)
- **Header:** nome do produto + seletor de seção + botão "Conectar Spotify".
- **Hero de resultado:** score grande (Kendall-Tau) com barra de alinhamento.
- **Matriz de correlação:** heatmap `EU × Deezer × iTunes`, legenda `-1 → +1`.
- **Super-ranking:** fusão Borda.
- **Consenso vs. Bolha:** dois painéis de cor contrastante (ciano / coral).
- **Bloco didático (opcional):** Merge Sort, inversões, Kendall-Tau, `O(n log n)` vs `O(n²)`.

### 13.8 Acessibilidade
- Contraste texto ≥ 4.5:1; texto grande ≥ 3:1.
- **Informação nunca transmitida apenas por cor** — heatmap sempre exibe o número.
- Navegação por teclado + foco visível; touch targets ≥ 44×44px.
- Hierarquia de headings correta; respeta `prefers-reduced-motion`.

### 13.9 Aplicação no código
- Mapear os tokens do Figma para **CSS Custom Properties** (mesmos nomes `--ink-*`, `--cyan-*`, etc.).
- Frontend é **HTML5/CSS3/JS puro** (sem bibliotecas de UI/gráficos no MVP) → o design system é convertido para `style.css` e classes/componentes, **não** para um framework.
- Heatmap/gráficos via **canvas/CSS puro**.

> **Nota de iteração:** a v1 foi publicada como **frames visuais** (captura fiel do `design-system-preview.html`). Pode ser refeita com **componentes/auto-layout nativos do Figma** para melhor reutilização — tokens e valor visual permanecem.

---

*Documento de Produto — definição, MVP, viabilidade, especificações fechadas e design system de referência concluídos. Próxima etapa (a pedido da equipe): planejamento técnico da implementação.*
