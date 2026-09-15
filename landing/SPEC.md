# SPEC — Landing Page · Shared Agent Memory

Spec visual/UI. Fonte de layout: `Imagens.md` (brief "mėntality"). Adaptada de
mental-wellbeing para memória persistente de agentes.

| Campo | Valor |
|---|---|
| Autor | Designer (OpenCode · DeepSeek V4.1 Flash) |
| Worktree | `/Users/guidev/orca/workspaces/memory-shared/landing-page` |
| App | `landing/` (Vite + React 19 + Tailwind v4 + framer-motion) |
| Fonte visual | Nota `Imagens` (fichário "Squad Memory Shared") |
| Status | Spec autoritativa. Build atual diverge em pontos — ver §9 |
| Produto | https://github.com/Gleydsong/memory-shared |

Regra de ouro herdada do produto: **SOURCE CODE > MEMORY**. A landing comunica
isolamento por projeto, MCP model-agnostic e Redis como backend — nada promete
mais do que o README.

---

## 1. Objetivo

Landing de página única, fundo `#EDEEF5` estrito, com hero de vídeo, navbar
glassmórfica, seções de arquitetura, features, quickstart e footer. Tom:
técnico, sóbrio, premium. Nada de gradiente colorido, nada de emoji, nada de
borda dura preta fora do que o brief pede.

Ordem das seções (home):

1. Navbar (fixed)
2. Hero
3. Arquitetura MCP/Redis (`#architecture`, âncora `#mcp-server` e `#persistence`)
4. Features
5. Quickstart (`#quickstart`)
6. Footer

View secundária: Docs (`#docs` via hash) — ver §10.

---

## 2. Design tokens

### 2.1 Cor

| Token | Hex | Uso |
|---|---|---|
| `--color-bg-base` | `#EDEEF5` | Fundo global. Estrito, sem exceção de página |
| `--color-brand-green` | `#9fff00` | Acento, pills, seleção, ícones ativos, badges |
| `--color-brand-black` | `#1a1a1a` | Texto primário, botões, contorno, vídeo overlay |
| `--color-brand-gray` | `#8e8e8e` | Texto secundário, labels, bordas suaves (uso decorativo/>=18px) |
| `--color-brand-gray-aa` | `#6b6b6b` | **Substituto AA** de `#8e8e8e` em copy <18px sobre `#EDEEF5` |
| Surface | `#FFFFFF` | Cards, navbar quando sólida, capsules |
| Border | `rgb(26 26 26 / 0.10)` | Contorno padrão de card/borda |
| Border-soft | `rgb(26 26 26 / 0.05)` | Bordas mínimas (search capsule) |

Regras:
- Verde NUNCA como texto sobre branco nem como fundo de texto preto pequeno
  abaixo de 14px sem conferir contraste.
- Verde máximo ~15% da área visual. É acento, não tema.
- Sem novas cores. Sem vermelho/azul/roxo em estado algum.

### 2.2 Tipografia

- Display: **Outfit** (`--font-display`). Headlines `h1/h2/h3`, brand, números.
- Sans: **Inter** (`--font-sans`). Corpo, nav, labels, código usa `ui-monospace`.
- Pesos: Inter `400/500/600`; Outfit `500/600/700`.

| Papel | Classe alvo |
|---|---|
| H1 hero | `font-display font-semibold tracking-tight leading-[1.12] text-[clamp(1.75rem,5vw,3.25rem)]` |
| H2 seção | `font-display font-semibold tracking-tight text-3xl sm:text-4xl` |
| H3 card | `font-display font-semibold text-xl` |
| Eyebrow | `text-xs font-medium uppercase tracking-[0.2em] text-[#8e8e8e]` |
| Body | `text-sm sm:text-base leading-relaxed` |
| Nav link | `text-sm` lowercase |
| Código | `font-mono text-xs sm:text-sm` |

### 2.3 Espaço, raio, sombra

- Container: `max-w-6xl mx-auto px-4 sm:px-6` (hero usa `max-w-7xl` + 12 col — §4.2).
- Ritmo vertical: seção `py-16`–`py-20`; hero `pt-28 sm:pt-32`.
- Raio: card `rounded-3xl`; card interno/ícone `rounded-2xl`/`rounded-xl`; botão/pill `rounded-full`; search capsule `rounded-[6px]`; code panel `rounded-2xl`.
- Sombra: card `shadow-[0_20px_60px_rgba(26,26,26,0.06)]`; leve `shadow-[0_12px_40px_rgba(26,26,26,0.04)]`; search `shadow-[0_12px_40px_rgba(26,26,26,0.08)]`. Nunca sombra colorida.

### 2.4 Motion tokens

| Token | Valor |
|---|---|
| `dur-fast` | `220ms` |
| `dur-base` | `450–500ms` |
| `dur-hero` | `600–800ms` |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `delay-search` | `0.15s` (após headline) |
| `reveal-viewport` | `{ once: true, margin: '-80px' }` |

### 2.5 Camadas (z-index)

- `z-0` vídeo + máscara gradiente (hero)
- `z-10` conteúdo do hero
- `z-50` navbar e drawer mobile

---

## 3. Grid global

- Página: `<div className="min-h-svh bg-[#EDEEF5] text-zinc-900">`.
- Raiz: `selection:bg-[#9fff00] selection:text-black`.
- Conteúdo de seção centralizado em `max-w-6xl`.
- Breakpoints: `sm 640` · `md 768` · `lg 1024` · `xl 1280`.

---

## 4. Seções

### 4.1 Navbar

Fonte Imagens: barra fixa full-width com gradiente suave; NÃO é pill flutuante
(ver §9, delta A).

Wrapper:
```
fixed top-0 left-0 w-full z-50 py-6 md:py-10
bg-gradient-to-b from-[#f1f1f1]/80 to-transparent backdrop-blur-[2px]
```
Container: `grid grid-cols-12 max-w-7xl mx-auto` (usar `px-6`).

- **Esq (cols 1–3):** `Logo.tsx` (ícone geométrico clover/pupila, `fill #1a1a1a`
  com nós `#9fff00`) + brand `shared agent memory` em `font-display`.
- **Centro (cols 4–9, `hidden md:flex`):** links lowercase, `text-sm text-[#8e8e8e]`, hover `text-[#1a1a1a]`:
  `architecture` · `mcp server` · `persistence` · `docs`.
- **Dir (cols 10–12):** âncora `docs` (texto) + botão preto
  `rounded-full bg-[#1a1a1a] text-white px-5 py-2.5 text-sm` com label
  `get started →` (seta via `ArrowRight` lucide, `h-4 w-4`). Hamburger
  `md:hidden` (`Menu`/`X`), toggla drawer.

Drawer mobile (`AnimatePresence` + `motion.div`): slide-down
`initial/animate/exit { opacity, y: -12 }`, `duration 220ms ease-out`,
`rounded-2xl border border-white/50 bg-white/80 backdrop-blur-xl`. Lista links
+ CTA preto. Trava scroll do body quando aberto.

### 4.2 Hero

Seção:
```
relative min-h-[110vh] sm:min-h-[140vh] w-full flex flex-col items-center
justify-start overflow-hidden bg-bg-base
```

**Vídeo (camada 0):**
```
div.absolute top-[15vh] sm:top-[20vh] left-0 w-full h-[95vh] sm:h-[120vh]
    z-0 pointer-events-none
  video   autoPlay loop muted playsInline
          w-full h-full object-cover opacity-100
          src=https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4
  div   absolute top-0 left-0 w-full h-24 sm:h-32
        bg-gradient-to-b from-bg-base to-transparent   (máscara topo)
```
Sem margem/padding artificial abaixo do vídeo: o vídeo ocupa 100% do viewport
do hero e o `#EDEEF5` ancora a página. Sem autoplay de áudio; sem controles.

**Conteúdo (camada 10):**
```
max-w-7xl w-full mx-auto px-8 md:px-16 lg:px-20 relative z-10
grid grid-cols-12 gap-x-4 md:gap-x-8
→ texto em col-span-12 md:col-span-10 md:col-start-2
```

**Eye pill (inline, entre "their" e "persistent memory"):**
```
inline-flex items-center justify-center rounded-full border-[2px] border-[#1a1a1a]
w-[16px] md:w-[42px] lg:w-[62px] h-[0.95em]
→ dot interno: w-2 h-2 rounded-full bg-[#1a1a1a]
```
`aria-hidden`. Não usar largura em `em` do build atual (§9, delta B).

**Headline (h1)** — `motion.h1`, `initial { opacity:0, y:15 } → { opacity:1, y:0 }`,
`duration 0.8`. Cor por linha (preto na primeira, cinza no resto):

```
[#1a1a1a] Shared: Agent Memory offers
[#8e8e8e] recall and context to help your
[#8e8e8e] agents keep <EyePill/> persistent memory.
```
Linhas quebradas por `<span className="block">`. Segunda e terceira em
`text-[#8e8e8e]` (não `text-zinc-800`).

**Badge OSS (acima do h1, opcional mas manter):** pill `rounded-full border
border-[#1a1a1a]/10 bg-white/90 px-4 py-2 text-xs shadow-sm` com chip verde
`OSS` (`bg-[#9fff00] text-[#1a1a1a] font-mono uppercase`) + `MIT licensed ·
clone & self-host on GitHub`, link para o repo.

**Search capsule** — `motion.div` delay `0.15`:
```
bg-white rounded-[6px] border border-black/[0.05] p-1 pl-4 flex items-center shadow-sm
max-w-xl mt-10
  input   placeholder="Search agent memories..." bg-transparent (integrado)
  button  bg-[#1a1a1a] text-white w-9 h-9 rounded-full
          → ícone chevron/arrow SVG
```
Ação: scroll suave para `#quickstart`. Input é decorativo/estilístico — se não
houver busca real, manter `readOnly` + `aria-label` claro; não fingir função.

**Âncoras de borda (camada 10 / pointer-events-none):**
- Meio direita (desktop): pill glassmórfica. Adaptação do seletor de idioma
  `pl — en` → seletor de provider `v0 — iris`.
  `rounded-l-full border border-r-0 border-[#1a1a1a]/15 bg-white/90 px-4 py-2 pr-6 shadow-lg backdrop-blur-sm`.
- Inferior esquerda: `2026` (`font-display text-sm text-[#1a1a1a]`).
- Inferior direita: `mcp & redis agent memory`
  (`text-xs sm:text-sm text-[#8e8e8e] text-right`, oculto em `< sm`).

### 4.3 Arquitetura MCP/Redis

`<section id="architecture" className="scroll-mt-24 px-4 py-20 sm:px-6">`,
container `max-w-6xl`.

Cabeçalho central:
- Eyebrow `ARCHITECTURE`.
- `<h2 id="mcp-server">One MCP, every agent</h2>`.
- Sub: "Orca, Cursor Composer, Grok, Antigravity, and Codex share one MCP
  server. Memories persist in Redis with project-scoped isolation."

Corpo = card branco `rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10
shadow-[0_20px_60px_rgba(26,26,26,0.06)]`, reveal `whileInView`.

Fluxo (3 blocos):

1. **Agentes** — grid flex-wrap de chips `rounded-2xl border border-zinc-100
   bg-[#EDEEF5]/50 px-4 py-4`: Orca (`Cpu`), Cursor Composer (`Box`),
   Grok (`Sparkles`), Antigravity (`Rocket`), Codex (`Terminal`). Ícone em
   `h-11 w-11 rounded-xl bg-white shadow-sm`, label `font-display`.
2. **Conector** (`xl` only) — coluna de 5 dots `bg-[#9fff00]` + label
   `MCP TOOLS` + ícone `Bot`. Em `< xl`, linha `↓ MCP ↓ Redis`.
3. **Servidor** — card preto `rounded-2xl border-2 border-[#1a1a1a] bg-[#1a1a1a]
   text-white` com badge verde `MCP SERVER` flutuando no topo (`-top-2.5`),
   mono `memory_search · remember · context`. Conector vertical
   `h-full w-px bg-gradient-to-b from-[#1a1a1a] to-[#8e8e8e]`.
4. **Redis** (`id="persistence"`) — card branco `rounded-2xl border border-zinc-200
   shadow-sm` com quadrado `bg-[#9fff00]/30` + `Database`; título `Redis`; sub
   `vectors · handoffs · decisions`.

### 4.4 Features

`<section className="px-4 py-16 sm:px-6">`, grid `max-w-6xl md:grid-cols-3 gap-6`.

3 cards iguais: `motion.article`, `rounded-3xl border border-zinc-200/80 bg-white
p-8 shadow-[0_12px_40px_rgba(26,26,26,0.04)]`, reveal `delay i*0.08`.

Estrutura: ícone em `rounded-xl bg-[#9fff00]/25 p-3` (`h-6 w-6` stroke 1.5) →
`h3` display → `p text-sm text-[#8e8e8e]` (usar `#6b6b6b` se <18px, §7).

| Ícone | Título | Copy |
|---|---|---|
| `Layers` | Project Isolation | "Scoped namespaces keep each repo's memories separate. Agents only recall what belongs to the current project." |
| `RefreshCw` | Multi-Agent Sync | "Orca, Cursor Composer, Codex, Grok, and Antigravity share handoffs, decisions, and working state through one Streamable HTTP MCP endpoint." |
| `Zap` | Fast Vector Recall | "Semantic search over stored context returns the right memories in milliseconds—ready for the next tool call." |

Sem 4ª feature, sem "pricing", sem "testimonials".

### 4.5 Quickstart

`<section id="quickstart" className="scroll-mt-24 px-4 py-20 sm:px-6">`,
container `max-w-3xl`.

Cabeçalho: eyebrow `QUICKSTART`; `h2` `Streamable HTTP MCP`; sub com
`127.0.0.1:8787/mcp` em `code` branco e "Per-agent Bearer keys — no public npm
package."

Painel de código (dark): `rounded-2xl border border-zinc-200 bg-[#1a1a1a]
shadow-xl`, reveal `whileInView`.

- Header `border-b border-zinc-700 px-4 py-3`: tabs à esquerda, botão `Copy` à
  direita.
- **Tabs** (`role="tablist"`): `Cursor` · `Docker / CLI` · `Codex`.
  Ativa `bg-[#1a1a1a] text-white`; inativa `text-[#8e8e8e] hover:bg-white/60`.
  ⚠️ Conflito: tab ativa preta sobre painel preto — trocar ativa por
  `bg-[#9fff00] text-[#1a1a1a]` ou `bg-zinc-800 text-white` (§9, delta C).
  Focus ring `outline-[#9fff00]`.
- File label: `font-mono text-xs text-zinc-500` (`~/.cursor/mcp.json` /
  `terminal` / `Codex MCP (shared_memory)`).
- `<pre>` `text-xs sm:text-sm text-zinc-100` scroll horizontal; `aria-selected`
  por tab.
- Botão `Copy` → `Check` verde `#9fff00` por 2s.

Conteúdo exato das abas = `Quickstart.tsx` atual (Cursor JSON, Docker compose +
`./bin/memory health`, Codex `codex mcp get shared_memory`). Não inventar flags.

### 4.6 Footer

`<footer className="border-t border-zinc-200/80 px-4 py-12 sm:px-6">`,
container `max-w-6xl`.

Linha 1 (`sm:flex-row sm:justify-between`):
- Marca: `LogoMark` (`h-7 w-7`) + `shared agent memory` display.
- Nav: `Docs` (view docs) · `Quickstart` (`#quickstart`) · `Architecture`
  (`#architecture`) · `Repository` (link externo). `text-sm text-[#1a1a1a]
  underline-offset-4 hover:underline`.

Linha 2: `100% open source (MIT)` (peso médio preto) `· Open MCP memory layer ·
Redis-backed · built for agent orchestration`, `text-xs sm:text-sm text-[#8e8e8e]`.

Sem colunas de links de produto, sem newsletter, sem social icons decorativos.

---

## 5. Copy (EN) — inventário travado

| Local | String |
|---|---|
| Brand | `shared agent memory` |
| Nav | `architecture` `mcp server` `persistence` `docs` |
| CTA | `get started` + `→` / `view on github` |
| Badge | `OSS` · `MIT licensed · clone & self-host on GitHub` |
| H1 | `Shared: Agent Memory offers` / `recall and context to help your` / `agents keep ◉ persistent memory.` |
| Search | `Search agent memories...` |
| Provider pill | `v0 — iris` |
| Canto esq | `2026` |
| Canto dir | `mcp & redis agent memory` |
| H2 arq | `One MCP, every agent` |
| H2 quick | `Streamable HTTP MCP` |
| Footer tag | `100% open source (MIT) · Open MCP memory layer · Redis-backed · built for agent orchestration` |

Idioma: inglês em toda a UI (público OSS). Nav lowercase = escolha de estilo,
manter.

---

## 6. Responsividade & safe-area

- `min-h-svh`/`min-h-[110vh] sm:min-h-[140vh]` no hero; nunca `100vh` puro em mobile.
- Safe-area iOS: padding inferior das âncoras do hero e do footer com
  `pb-[max(2rem,env(safe-area-inset-bottom))]`; navbar `pt-[max(1.5rem,env(safe-area-inset-top))]`.
- Bottom anchors: esquerda/direita `left-4 right-4 sm:left-8 sm:right-8`;
  direita oculta em `< sm`.
- Search capsule full-width até `max-w-xl`.
- Chip de agentes: quebra em wrap; `min-w-[100px] sm:min-w-[112px]`.
- Tabs de quickstart: `flex-wrap` (não estourar em 360px).
- Alvos de toque `>= 44px` (hamburger, CTA, copy, botão da search).
- `prefers-reduced-motion: reduce` → desligar `autoPlay` do vídeo e reduzir
  animações a fade de `0.01ms` (ver §8).

---

## 7. Acessibilidade & contraste

- **Falha conhecida:** `#8e8e8e` sobre `#EDEEF5` ≈ **2.8:1** → reprova AA para
  texto pequeno. Ações:
  - Copy < 18px sobre fundo claro usa `#6b6b6b` (≈ 4.6:1, passa AA). Manter
    `#8e8e8e` só em eyebrow/labels grandes, ícones e texto sobre branco puro
    (≈ 3.0:1 — ainda insuficiente para corpo; então em card branco usar
    `#6b6b6b` também).
  - Corrigir nas Features (§4.4), sub do hero (§4.2) e footer (§4.6).
- `#9fff00` sobre `#1a1a1a` passa AA; verde nunca sobre branco como texto fino.
- Foco visível obrigatório: `focus-visible:outline-2 outline-offset-2 outline-[#9fff00]`
  em todos os interativos (nav, tabs, copy, CTAs).
- Vídeo decorativo: `aria-hidden`, `pointer-events-none`, sem áudio.
- Eye pill e conectores: `aria-hidden`.
- Hierarquia: um `h1`, `h2` por seção, `h3` nos cards.
- Contraste do painel de código: `text-zinc-100` sobre `#1a1a1a` → OK.

---

## 8. Motion

- Entrada hero: `h1` fade+y 15px, `0.8s`; search `0.15s` depois; badge `0.45s`.
- Reveals de seção: `whileInView`, `once: true`, `margin '-80px'`, duração
  `0.45–0.5s`, stagger `0.06–0.08s`.
- Hover: cor (`0.2s`) e sombra apenas. Sem scale em card (evita jitter).
- Navbar: `transition-all 300ms` ao passar de transparente → glass sólido
  (`scrolled state`, `scrollY > 8`).
- Drawer mobile: `220ms ease-out`.
- Sem marquee, sem parallax, sem scroll-jacking. Vídeo é o único movimento
  contínuo e fica atrás de tudo.
- `prefers-reduced-motion`: cortar stagger/slide; manter fade curto; pausar vídeo.

---

## 9. Deltas vs build atual (ação Programador)

| # | Componente | Spec | Build atual | Ação |
|---|---|---|---|---|
| A | `Navbar.tsx` | Barra full-width gradiente `from-[#f1f1f1]/80` | Pill `rounded-2xl bg-white/55` | Alinhar wrapper ao §4.1 (manter lógica de drawer/scroll) |
| B | `Hero.tsx` | Eye pill `w-[16px] md:w-[42px] lg:w-[62px]` | `w-[2.2em] h-[1.15em]` | Trocar para larguras px do brief |
| C | `Quickstart.tsx` | Tab ativa contrasta com painel preto | `bg-[#1a1a1a]` sobre `#1a1a1a` (invisível) | Ativa → `bg-[#9fff00] text-[#1a1a1a]` |
| D | `Hero.tsx` | Vídeo `top-[15vh] h-[95vh] sm:h-[120vh]`, máscara `h-24 sm:h-32` | Vídeo `inset-0` + gradiente `from-0% via-45%` | Reposicionar conforme §4.2 |
| E | `Hero.tsx` | Linha 2/3 em `#8e8e8e` | Linha 2 em `font-sans text-zinc-800` | Padronizar cinza por linha |
| F | Títulos | H1/H2 com tokens acima | OK | — |
| G | Contraste | `#6b6b6b` para copy pequena | `#8e8e8e` em Features/hero/footer | Corrigir §7 |
| H | Hero | Âncora de provider `v0 — iris` no meio-direita | Pill `MCP · streamable http` | Adaptar label; manter glass pill |
| I | Docs | Manter view `#docs` | Existe | Não regredir |
| J | Layout hero | Grid 12 col, texto `md:col-start-2` | Flex centralizado (`text-center`) | Decidir: §4.2 é alinhamento à esquerda no grid; se mantém centralizado, registrar desvio aprovado pelo Lead |

> Bloqueio de decisão: item J. O build centralizou; o Imagens especifica grid
> com `col-start-2`. Preferência do Designer: manter **centralizado** (funciona
> melhor para headline curta e search capsule central), mas adotar a estrutura de
> grid 12 col com `md:col-start-2` para respeitar o brief. Lead decide se J vira
> exceção documentada.

---

## 10. View Docs (não regredir)

Hash `#docs` troca a main para `<Docs />`. Navbar em modo docs: nascer com
`back to home` (`ArrowLeft`) + `view on github` (`ArrowRight`) no desktop e
drawer equivalente. Footer sempre com `onGoDocs`. Analítica e Speed Insights
(`@vercel/analytics`, `@vercel/speed-insights`) permanecem montados na raiz.

---

## 11. Critérios de aceite

1. `bg #EDEEF5` sem nenhuma faixa de outra cor entre navbar e footer.
2. Fontes Inter + Outfit carregadas e aplicadas (`--font-sans`, `--font-display`).
3. Paleta fechada em 4 hex + branco. Nenhuma cor nova.
4. Vídeo do URL exato do §4.2, autoplay, mudo, loop, playsInline, `aria-hidden`.
5. Eye pill entre "their" e "persistent memory" nas larguras px do brief.
6. Search capsule branca `rounded-[6px]` com botão preto e delay `0.15`.
7. Âncoras: `2026` (esq), `mcp & redis agent memory` (dir), provider pill (meio-direita).
8. Arquitetura mostra 5 agentes → MCP → Redis com `#mcp-server` e `#persistence`.
9. 3 features exatas, sem inventar 4ª.
10. Quickstart funcional: 3 tabs, copy 2s, tab ativa contrastante.
11. Nenhum texto pequeno abaixo de 4.5:1 sobre o fundo (§7/G).
12. Foco visível verde em todos os interativos.
13. Mobile 360px sem overflow horizontal; alvos >= 44px; safe-area respeitada.
14. `prefers-reduced-motion` respeitado (vídeo pausa, animações mínimas).
15. `npm run lint` e `npm run build` (em `landing/`) verdes.
16. Sem código de produto no app `src/` do repo raiz; landing isolada em `landing/`.

---

## 12. Proibido

- Código de produto, backend, MCP ou adapters — esta spec é visual/UI.
- Margens/padding que quebrem o vídeo full-bleed do hero (§4.2).
- Nova cor, novo gradiente colorido, sombra colorida, glassmorfismo forte.
- Blur alto na navbar além de `backdrop-blur-[2px]`/`2xl` quando glass.
- Texto `#8e8e8e` < 18px sobre `#EDEEF5` (falha AA).
- Prometer na landing recurso que o README não entrega (Iris, keyword search,
  Grok executável, npm público).
- Emoji, ícones decorativos fora dos listados, carrossel, depoimentos, preços.
