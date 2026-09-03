# G20_Ordenacao_EDA2-2026.2

**Número do trabalho:** 2 <br>
**Conteúdo do Módulo:** Ordenação <br>
**Disciplina:** Estrutura de Dados 2 (2026.2)

## Alunos

| Matrícula |          Nome Completo           |
| :-------: | :------------------------------: |
| 232037937 | Italo Alves Sampaio de Oliveira  |
| 221008202 | José Eduardo Vieira do Prado     |

## Sobre o trabalho

**Ranking Consensus Engine · "Meu gosto vs o Mundo"** é uma ferramenta web que compara **a sua lista pessoal de músicas mais tocadas** (via Spotify, com login) com os **charts globais reais** (Deezer e Apple/iTunes), usando **Merge Sort** de uma forma incomum: a **contagem de inversões**, que alimenta a **correlação de Kendall-Tau**. O resultado é uma visão objetiva de quais das suas músicas são **hits consenso** (o mundo concorda com você) e quais são a **sua bolha** (só você / underground).

### Objetivo

- Integrar **APIs reais**: Spotify (com **OAuth de usuário / login**), Deezer e Apple/iTunes
- Implementar **Merge Sort com contagem de inversões** em `O(n log n)` e aplicá-lo à correlação de Kendall-Tau
- **Comparar seu gosto com o mundo** (matriz de correlação / heatmap) e descobrir o quão "mainstream" você é
- Gerar um **super-ranking de consenso** (fusão Borda) e classificar músicas em **"apostas seguras" vs "minha bolha"**
- Provar rigorosamente a diferença `O(n log n)` vs `O(n²)` com benchmark e testes automatizados
- Oferecer interface amigável, com modo **cache determinístico** (demo/relatório reprodutíveis)

## Como usar

### Pré-requisitos

- **Node.js 18+** (usa `fetch` global nativo, sem dependências externas)
- Um navegador web moderno (Chrome, Firefox, Edge, Safari)
- _(Para o Spotify)_ um app gratuito no **Spotify for Developers** e as credenciais no `.env`

### Passo a passo

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/G20_Ordenacao_EDA2-2026.2.git
   cd G20_Ordenacao_EDA2-2026.2/ranking-consensus
   ```

2. Configure as credenciais:
   ```bash
   cp .env.example .env
   # edite .env e preencha SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET e SPOTIFY_REDIRECT_URI
   ```
   > **Importante (OAuth):** a `SPOTIFY_REDIRECT_URI` precisa ser **exatamente** `http://127.0.0.1:8888/callback` — idêntica à cadastrada no app do Spotify e à porta/host usada pelo `auth_server.js`.

3. _(Opcional — para incluir seus dados do Spotify)_ gere as suas top tracks:
   ```bash
   node scripts/auth_server.js
   ```
   O app abre o login do Spotify; ao autorizar, salva `data/spotify_me.json`.

4. Colete os charts globais (Deezer + iTunes) e gere o snapshot do browser:
   ```bash
   node scripts/fetch_sources.js
   node scripts/build_snapshot.js   # junta os JSON em data/snapshot.js
   ```
   > **Por que o `snapshot.js`?** A página abre via `file://` (sem servidor), e `fetch()` de `.json` local é bloqueado por CORS. Assim, os coletores Node gravam os `data/*.json` (fonte de verdade) e o `build_snapshot.js` gera `data/snapshot.js` (`window.RANK_SNAPSHOT`), que é o que o `index.html` carrega.

5. Abra a aplicação no navegador:
   ```bash
   # Windows
   start index.html

   # macOS
   open index.html

   # Linux
   xdg-open index.html
   ```

6. Na interface:
   - Veja a **matriz de correlação** (heatmap) entre **você**, Deezer e iTunes
   - Confira o **super-ranking de consenso** e os destaques de **"aposta segura" vs "minha bolha"**

> **Modo cache (MVP):** a interface lê os dados já congelados em `data/` (via `snapshot.js`) — demo/relatório reprodutíveis, sem depender de rede. O login Spotify (`auth_server.js`) é opcional e só é necessário para **gerar** `data/spotify_me.json`.

## Dados de exemplo

> _Os valores da tabela serão preenchidos após a primeira coleta real de dados._

| Fonte            | Ranking obtido                          | Itens | Observação                                  |
| ---------------- | --------------------------------------- | ----: | ------------------------------------------- |
| Spotify (você)   | Suas mais tocadas (`/me/top/tracks`)    |  100  | Requer login OAuth                          |
| Deezer           | Chart global top 100                    |  100  | Sem chave                                   |
| Apple/iTunes     | Top songs (RSS, EUA)                    |  100  | Sem chave, região EUA                       |
| **Interseção**   | _a definir após a coleta_               |  TBD  | Somente músicas presentes em ≥2 fontes      |

## Screenshots (demonstração)

> _As imagens serão adicionadas após a implementação._

- Heatmap de correlação **você × Deezer × iTunes**
- Super-ranking de consenso
- Seção "Apostas seguras vs Minha bolha"

## Algoritmos implementados

### Merge Sort — contagem de inversões (o coração do projeto)

Além de ordenar, o **Merge Sort** conta quantas **inversões** existem em um array durante o próprio passo de *merge*, em tempo `O(n log n)`.

**Complexidade:**
- Tempo: `O(n log n)` — contagem de inversões
- Espaço: `O(n)` — para o array temporário do merge

No ranqueamento, cada inversão corresponde a um **par discordante** entre duas classificações. Isso alimenta a **correlação de Kendall-Tau**, que responde "o ranking da fonte X concorda com o da fonte Y?" — aqui, inclusive, **"o seu gosto concorda com o do mundo?"**.

### Correlação de Kendall-Tau

```
tau = (concordante - discordante) / total
total = n * (n - 1) / 2
```

- `+1` → concordância perfeita
- `-1` → discordância perfeita
- `0` → sem relação de ordem

### Super-ranking de consenso (fusão Borda)

Cada música recebe pontos pela posição em cada fonte (quanto melhor a posição, mais pontos) e soma-se entre as fontes. O resultado é uma classificação única ("o melhor segundo todas as fontes juntas").

### Apostas seguras vs Minha bolha

Para cada música, soma-se a fração de inversões em que ela participa. Alta divergência ⇒ **minha bolha**; baixa ⇒ **aposta segura**.

## Estrutura do projeto

```
ranking-consensus/
├── index.html              # Interface principal
├── css/
│   └── style.css           # Design system e estilos
├── js/
│   ├── app.js              # Lógica da aplicação e manipulação do DOM
│   ├── mergesort.js        # ⭐ Merge Sort + contagem de inversões
│   ├── kendall.js          # Correlação de Kendall-Tau (via inversões)
│   ├── consensus.js        # Super-ranking (Borda) + apostas seguras vs bolha
│   ├── sources.js          # Registro e carregamento das fontes
│   └── utils.js            # Funções utilitárias (normalização, formatação)
├── scripts/
│   ├── auth_server.js      # OAuth Spotify (login) → data/spotify_me.json
│   ├── fetch_sources.js    # Coleta Deezer + iTunes → data/
│   ├── build_snapshot.js   # Junta os JSON → data/snapshot.js (browser)
│   └── run_benchmark.js    # Benchmark O(n log n) vs O(n²) p/ o relatório
├── data/
│   ├── spotify_me.json     # Suas mais tocadas (cache)
│   ├── deezer.json         # Chart global Deezer (cache)
│   ├── itunes.json         # Top songs iTunes (cache)
│   └── snapshot.js         # Dados p/ o browser (o app não usa fetch() em file://)
├── tests/
│   ├── test_node.js        # Testes automatizados (Node.js)
│   └── test_manual.html    # Testes manuais (navegador)
└── .env.example            # Modelo de credenciais (Spotify)
```

## Tecnologias utilizadas

| Tecnologia                | Uso                                                               |
| :-----------------------: | :---------------------------------------------------------------- |
| HTML5                     | Estrutura semântica da interface                                  |
| CSS3                      | Design system com Custom Properties                               |
| JavaScript (ES6+)         | Algoritmos e lógica da aplicação (puro, sem frameworks)           |
| Node.js (fetch + http)    | OAuth Spotify, coleta de APIs (Deezer/iTunes), benchmark, testes  |
| Spotify OAuth             | **Authorization Code** (login de usuário) — dados pessoais        |

## Executando os testes

### Testes automatizados (Node.js)

```bash
cd ranking-consensus
node tests/test_node.js
```

### Benchmark (O(n log n) vs O(n²))

```bash
cd ranking-consensus
node scripts/run_benchmark.js
```

### Testes manuais (navegador)

Abra `ranking-consensus/tests/test_manual.html` no navegador.

## Vídeo (demonstração)

> _Adicionar link do vídeo de apresentação após a conclusão._

[Apresentação G20 - Ordenação 2026.2](https://youtu.be/linkaqui)

## Créditos e referências

- **Disciplina:** Estrutura de Dados 2 — 2026.2
- **Merge Sort / contagem de inversões:** CORMEN, T. H. et al. *Introduction to Algorithms*. 4. ed. Cambridge: MIT Press, 2022.
- **Correlação de Kendall:** KENDALL, M. G. *A new measure of rank correlation*. Biometrika, v. 30, 1938.
- **Spotify Web API:** [developer.spotify.com](https://developer.spotify.com/documentation/web-api/)
- **Deezer API:** [developers.deezer.com](https://developers.deezer.com/api)
- **Apple/iTunes RSS:** [itunes.apple.com](https://itunes.apple.com/)
- **Implementação:** Desenvolvida integralmente pela equipe G20
