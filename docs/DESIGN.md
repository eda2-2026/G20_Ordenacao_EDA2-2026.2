# Design Context — Ranking Consensus Engine ("Meu gosto vs o Mundo")

> **Last Updated:** 2026-10-06 | **Figma:** https://www.figma.com/design/CZu2sZI1QmP1wofgDQPM8L/EDA2 (node `16-2`)
> **Design System:** Custom — "Music Intelligence" (tema escuro, orientado a dados)

## 1. Design System Overview

Interface **escura, sofisticada e orientada a dados**, com energia de plataformas musicais (Spotify, Apple Music, Deezer) **sem copiar** a identidade de nenhuma delas. Sensação-alvo: _"Estou descobrindo meu lugar no mapa musical."_ O gosto pessoal é tratado como **descoberta e medida**, nunca julgamento. **Cor semântica:** consenso (ciano) vs divergência (coral) comunicados à primeira vista. **Tipografia:** editorial (serif) para emoção + mono para evidência técnica. Regra: o verde Spotify é reservado a **status de conexão** — nunca como cor de marca.

## 2. Color Palette

Tokens reais em `ranking-consensus/css/style.css` (`:root`):

| Token | Value | Usage |
|-------|-------|-------|
| `--ink-950` | `#080b12` | Fundo base (page background) |
| `--ink-900` | `#0d111a` | Superfícies profundas |
| `--ink-850` | `#121824` | Cards / elevação média |
| `--ink-800` | `#18202d` | Superfícies elevadas / hover |
| `--ink-700` | `#273142` | Bordas / neutros fortes (ex.: track do progress) |
| `--ink-500` | `#667287` | Texto terciário / desabilitado |
| `--ink-300` | `#aeb8c8` | Texto secundário |
| `--paper` | `#f3f6fa` | Texto primário sobre fundo escuro |
| `--white` | `#fff` | Branco puro (uso pontual) |
| `--cyan-500` | `#52d4e8` | **Consenso** (aposta segura, afinidade, CTA primário) |
| `--cyan-300` | `#a9f2fa` | Consenso — variante clara / hover |
| `--coral-500` | `#ff7e73` | **Divergência** (minha bolha) |
| `--coral-300` | `#ffc0b8` | Divergência — variante clara |
| `--spotify` | `#9be15d` | Status "Spotify conectado" (**apenas status**) |
| `--amber` | `#f5c76b` | Estado vazio / avisos |
| `--danger` | `#ff8f8f` | Estado de erro |
| `--line` | `rgba(174,184,200,.16)` | Divisores / bordas de card |
| `--focus-ring` | `0 0 0 3px rgba(82,212,232,.45)` | Anel de foco (`:focus-visible`) |
| `--shadow-card` | `0 18px 50px rgba(0,0,0,.16)` | Sombra de card |
| `--shadow-glow` | `0 0 40px rgba(82,212,232,.13)` | Brilho ciano sutil |

**Gradientes-chave:** heatmap legend `coral-500 → ink-500 → cyan-500` (escala −1 → +1); progresso `cyan-500 → spotify`.

## 3. Typography

| Token | Family |
|-------|--------|
| `--font-display` | `Georgia, 'Times New Roman', serif` — títulos / emoção editorial |
| `--font-body` | `Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif` — interface |
| `--font-mono` | `'SFMono-Regular', Consolas, 'Liberation Mono', monospace` — métricas (`τ`, `O(n log n)`, posições, scores) |

| Scale | Token | Size | Usage |
|-------|-------|------|-------|
| xs | `--text-xs` | `.75rem` | Labels, badges, captions |
| sm | `--text-sm` | `.875rem` | Texto secundário, nav |
| base | `--text-base` | `1rem` | Corpo |
| lg | `--text-lg` | `1.125rem` | Hero copy, h3 de painel |
| xl | `--text-xl` | `1.375rem` | h2, títulos de highlight |
| 2xl | `--text-2xl` | `1.875rem` | Section headings (h2) |
| 3xl | `--text-3xl` | `clamp(2.75rem, 7vw, 6.5rem)` | Hero (h1) |

## 4. Spacing & Layout

- **Base Unit:** 4px (escala `--space-1`…`--space-16`).
- **Container Max:** `1440px` (`.shell { width: min(1440px, calc(100% - 40px)) }`).

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--space-1` | 4px | | `--space-6` | 24px |
| `--space-2` | 8px | | `--space-8` | 32px |
| `--space-3` | 12px | | `--space-10` | 40px |
| `--space-4` | 16px | | `--space-12` | 48px |
| `--space-5` | 20px | | `--space-16` | 64px |

**Raios:** `--radius-sm` 8px · `--radius-md` 14px · `--radius-lg` 22px · `--radius-pill` 999px.

**Breakpoints (implementados):** `max-width: 1024px` (hero/análise → 1 coluna; métricas/estados → 2 colunas) e `max-width: 640px` (tudo → 1 coluna; `.track__score` oculto; nav em linha rolável).

## 5. Component Patterns

### Button (`.btn`)
- Variants: `--primary` (ciano, fundo sólido), `--ghost` (borda, fundo transparente), `--spotify` (status verde).
- Altura mínima **44px**; pill; `:hover` com `translateY(-1px)`; foco via `--focus-ring`.

### Badge (`.badge`)
- `--safe` (consenso, ciano), `--bubble` (divergência, coral), `--neutral` (neutro).

### Metric card (`.card.metric`)
- `Kendall-Tau médio`, `Match-rate`, `Faixas analisadas`, `Fontes ativas`. Valor em `--font-mono`; delta verde.

### Music row (`.track`)
- Grid `28px 42px 1fr auto`: posição · capa · título/artista · score. Hover sutil.

### Heatmap (`.heatmap` — `<table>`)
- Células com **valor numérico `τ` SEMPRE visível** (nunca só cor). Cor por classe aria: `[aria-label*="alta"]` ciano, `"média"` cinza, `"baixa"` coral; diagonal em `--ink-850`.

### Panels / Split / States
- `.panel` (heatmap/super-ranking), `.highlight--safe` / `--bubble` (§ "Consenso vs Bolha"), `.state` (loading/erro/vazio/interseção insuficiente), `.skeleton` (pulse).

## 6. Motion

- Transições padrão ~`160ms ease` (botões/hover); `scroll-behavior: smooth`.
- **Respeita `prefers-reduced-motion: reduce`** — desliga animações/transições e scroll suave (regra global no `style.css`).

## 7. Figma File Map

| Page | Purpose | Key Node IDs |
|------|---------|--------------|
| Algoritmo de Ordenação | Design system do produto (fonte de verdade visual) | `node-id=16-2` |

> Observação de iteração: a v1 foi publicada como **frames visuais**; pode ser refeita com componentes/auto-layout nativos, mantendo tokens e valor visual.

## 8. Assets

- **Ícones:** glifos tipográficos/símbolos Unicode (ex.: `τ`, `↗`, `●`, `◌`) — sem bibliotecas de ícones.
- **Imagens:** capas de álbum são placeholders com gradiente CSS (`.cover`, `.cover--two`, `.cover--three`) no MVP; sem assets externos.

## 9. Accessibility (§13.8)

- Contraste texto ≥ **4.5:1**; texto grande ≥ 3:1.
- **Informação nunca transmitida apenas por cor** — heatmap exibe o número, badges exibem texto.
- Navegação por teclado + `:focus-visible`; touch targets ≥ **44×44px**.
- Hierarquia de headings correta; `prefers-reduced-motion` respeitado.
- `aria`/`role` para heatmap (tabela) e `role="progressbar"` na barra de alinhamento.

---
*Generated by context-generator on 2026-10-06*
