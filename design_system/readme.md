# GovPro · GeraDocs Design System

GeraDocs is GovPro's GovTech SaaS product (GovPro was formerly named LAHHM): a web platform used by Brazilian municipal governments (prefeituras) and public agencies to automate the drafting of public-procurement documents under Lei 14.133/21. It generates **six document types, in the canonical order of a real contratação**: Cotação de Mercado → ETP → Mapa de Riscos → TR → Edital → Contrato. The DFD is an input (attached and AI-verified), and the PCA is agency-level context — neither is generated.

It replaces manual Word files and scattered templates with a guided, step-by-step flow: create a contratação process (the documents on offer depend on the modalidade — direct contracting has no Edital), attach/verify the DFD with AI feedback, fill each document section by section with automatic validations, manage ATA adhesion (attach an ATA for AI review and/or delegate ATA search to the model), send for approval through a real state machine (legal review under Art. 53, then the manager approves / rejects / requests retification with per-section annotations, versioning each document), and export final DOCX/PDF with the municipality's letterhead. The six process statuses are a fixed vocabulary — the flow never invents new ones.

Which documents exist, in what order, on what legal basis: `docs/fluxo-contratacao.md` in the app repo.

**Users:** municipal procurement staff, requesting secretarias, contracting commissions, legal, and approving managers. The UI must convey trust, security, organization, and institutional professionalism — modern corporate SaaS, not an institutional website.

## Sources

- Codebase (ground truth): mounted local folder `GeraDocs SaaS Platform Prototype (Copy)/` — Vite + React + TS prototype (`src/components/{Sidebar,Header,StatusBadge}.tsx`, `src/views/{Dashboard,ProcessList,NewProcess,ETPForm,Approvals,Documents,Settings,DFDReview}.tsx`, `src/index.css`). Styling is inline-style-based; `index.css` holds the palette and font imports.
- Logos: brand approved on 28/10/2026 (option A · Faceta — GovPro "G" with the green-yellow arrow; GeraDocs sheet with the same band and fold). Official files in `assets/` (SVG + PNG); the full brand package (manual, all sizes, letterheads, document stamps) lives outside the repo, in `marcas-govpro-geradocs/marca-aprovada/`. The previous LAHHM/GeraDocs art was retired.
- Original prototype prompts (product spec) provided by the user in chat.

Note: the prototype's sidebar wordmark reads "ContrataDoc"; per the user, the product name is **GeraDocs** and the company is **GovPro** — the design system uses GeraDocs/GovPro.

## CONTENT FUNDAMENTALS

- **Language:** Brazilian Portuguese, formal-institutional but friendly. Title Case for headings/labels ("Processos de Contratação", "Novo Processo").
- **Voice:** system addresses the user as *você* implicitly; imperative verbs for actions ("Selecione a Modalidade", "Salvar e Avançar →", "Anexar ATA"). Greeting is warm and first-name: "Bom dia, Maria".
- **Legal precision:** cites law verbatim — "Art. 75, II, Lei 14.133/21", "Art. 86 da Lei 14.133/21". Never paraphrases legal references.
- **Guidance-heavy:** every field/section has a hint sentence explaining what to write and why ("Baseie-se em pesquisas de mercado, contratos anteriores ou painel de preços…"). The user should always know the next step ("Após a criação você será direcionado ao preenchimento do ETP.").
- **IDs & money:** monospace, exact formats — `PROC-2024-089`, `R$ 485.000,00`, dates `05/07/2024`.
- **Numbers are never shown raw.** Every monetary value and quantity — displayed *or* typed — carries **thousand separators and exactly two decimals**: `500.000,00`, never `500000` or `500.000`. Displayed values go through `formatBRL` (`R$ 485.000,00`) or `formatNumeroBR` (`485.000,00`, no symbol). Typed values go through `MoneyInput`/`QuantityInput`, which mask as the user types and close the value to two decimals on blur — **the caller never masks, and a plain `<Input prefix="R$">` must not be used for money**. See `components/forms/MoneyInput.prompt.md`.
- **Micro-labels:** uppercase 10px with wide tracking ("ÓRGÃO ATUAL", "PRINCIPAL", table headers).
- **Arrows in CTAs:** "Continuar →", "Ver todos →", "← Seção Anterior".
- **Emoji:** not used. All icons are monochrome Lucide-style line SVGs (stroke currentColor).
- **Status vocabulary (fixed):** Rascunho, Em Revisão, Aguardando, Aprovado, Rejeitado, Concluído; doc states: Completo, Em andamento, Em revisão, Não iniciado, Rejeitado; tags: Obrigatório, Opcional, Recomendado, Urgente.

## VISUAL FOUNDATIONS

- **Palette (brand GovPro + GeraDocs, §94):** deep navy `#071A3D` (sidebar, dark surfaces), brand navy `#0A1F44` (headings and main text), royal = brand blue `#1F5FD6` (primary actions/links/active/focus, hover `#1650C4`), electric = brand light blue `#4C93FF` (accents on navy, info, active-item tick), petroleum = deep brand blue `#0E3A94` (money values, dark panels), slate `#64748B` (secondary text), ice `#F4F7FC` (app bg, blue-biased), border `#DCE3EE`. Semantic: success = dark brand green `#0B7A38` (status dots `#14A04B`), danger `#EF4444`, **attention = brand yellow**: tint `#FFF8E1`/`#FFE08A` with dark-brown text `#5C4300` and gold icon/dot `#8F6300` (revises the 27/08/2026 slate decision — the brand brought yellow into the palette). Token names did not change; only values did.
- **Document accents (`doc-*`)** — one hue per document type, used on chips, icons and selected cards. Each has a paired tint background: Cotação `#7C3AED`/`#F5F3FF` · ETP `#1F5FD6`/`#EDF3FD` · Mapa `#B45309`/`#FFFBEB` · TR `#0D9488`/`#F0FDFA` · Edital `#BE185D`/`#FDF2F8` · Contrato `#334155`/`#F1F5F9`. **Contrato is slate, not green:** institutional green is already the "Concluído" status, and a green chip on a document would read as a status badge.
- **Type:** Montserrat (700/800) — the brand font — for headings, card titles and stat numbers, with negative tracking (−0.3/−0.5px); Montserrat 600 for caps micro-labels (a base rule on `.uppercase`); Inter for UI text; JetBrains Mono for IDs, money, kbd. Base UI size 13px; inputs 14px; stat numbers 30px/800. **Heading ramp (fixed):** page headings 20px/800 −0.5px · toolbar/header titles 17px/700 −0.3px · card titles 15px/700 · body 13px.
- **Backgrounds:** flat ice-white app canvas; white cards; navy sidebar & occasional navy/petroleum dark panels (`gradient-panel`: `135deg #0E2A63→#0A1F44`); no imagery, no textures.
- **Gradients:** small and purposeful only — brand chip `135deg #1F5FD6→#4C93FF`, avatar `135deg #0A1F44→#1F5FD6`, progress bar `90deg #1F5FD6→#4C93FF`, dark panel `135deg #0E2A63→#0A1F44`, hero `135deg #071A3D→#0E2A63`.
- **Cards:** white, 1px `#E2E8F0` border, radius 12px, **no drop shadows** — the system is flat; borders carry separation. Inner section dividers use softer `#F1F5F9`.
- **Radii scale:** 12px cards/tables, 8px inputs/buttons/nav, 6px pills/small chips, 999px badges/toggles/avatars.
- **Buttons:** fixed heights — sm 32px · md 36px · lg 40px; radius 8px; 13–14px/600 labels.
- **Hover states:** background shifts, not shadows — rows/list items to `#F4F7FC`; primary button `#1F5FD6→#1650C4`; sidebar items to `rgba(255,255,255,0.06)` + white text. Transitions `0.15s` (bg) / `0.2s` (toggles, progress).
- **Selected states:** 2px royal border + `#EDF3FD` tint fill + check circle; sidebar active = `rgba(31,95,214,0.26)` fill + 3×20px electric (brand light blue) left bar (rounded right).
- **Press states:** none distinct from hover in source; keep it that way.
- **On-dark surfaces:** white at alpha steps — text 1.0/0.65/0.55/0.4/0.35/0.3, fills 0.06/0.08/0.1 borders.
- **Focus:** global `:focus-visible` ring in `app/globals.css` — 2px royal (brand blue, 5.7:1 on white), electric (brand light blue) inside `.on-dark` surfaces, and royal border + outline on inputs. Components do not declare their own focus styles.
- **Shadows:** only the toggle knob (`0 1px 3px rgba(0,0,0,0.2)`).
- **Density/layout:** fixed 240px navy sidebar, 60px white header, 28px page padding, max-width 1200px content (880px for wizards); ETP editor adds a 280px white section rail. Tables: uppercase 11px headers on `#F8FAFC`, 13–14px rows.
- **Animation:** subtle and functional only — 0.15–0.2s eases, 0.5s progress width, 1s spinner. No bounces, no entrance animations.
- **Scrollbars:** 5px thin, `#CBD5E1` rounded thumb.

## ICONOGRAPHY

- **System:** inline SVG line icons, 24×24 viewBox, `stroke="currentColor"`, stroke-width 2 (2.5 for small/bold marks, 1.5 for large empty-state), round caps/joins — visually equivalent to **Feather/Lucide**. Rendered at 13–20px.
- No icon font, no PNG icons. Use Lucide from CDN (or copy the same paths inline) when composing new screens — same stroke weight.
- Check marks: white 3–3.5 stroke polyline `20 6 9 17 4 12` inside filled royal/green circles/squares.
- Emoji are not used anywhere; quick-action and modalidade rows use the same monochrome line icons (royal on white surfaces, electric #4C93FF on navy).
- Unicode arrows (→ ←) inside button/link labels are standard.
- **Logos** (`assets/`) — naming convention `<brand>-<mark|logo>[-white].{svg,png}`: **`mark`** = símbolo only, **`logo`** = símbolo + nome (horizontal), **`endosso`** = "GeraDocs · uma solução GovPro"; `-white` = versão para fundo escuro. Files: `geradocs-{mark,logo}[-white]`, `govpro-{mark,logo}[-white]`, `geradocs-endosso-govpro[-white]`, plus `geradocs-carregando[-white].gif` (loading animation on solid white/navy). The wordmark is Montserrat ExtraBold in caps, two-tone (GERA/GOV navy `#0A1F44`, DOCS/PRO blue `#1F5FD6`), **already converted to curves in the SVG** — never retype it in another font; use the SVG (crisp at any size) or the PNG. In the app: the sidebar brand block is one row as tall as the header (60px), "GERADOCS | GOVPRO": `public/geradocs-logo-white.svg` (22px), a thin divider and `govpro-logo-white.svg` (12px, accessible name "Uma solução GovPro"), spread edge to edge (`justify-between`, same ends as the brand rule) and vertically centered, and the brand rule (`FaixaDaMarca`) on the same line as the header border; login and password reset use `geradocs-logo-white.svg` (48px), the slogan "Contratações públicas inteligentes" in Montserrat with the brand rule under it (`w-80`), the diagonal corner bands (`FaixasDeCanto`, from the letterhead) and the GovPro credit; the favicon is `app/icon.png` + `app/favicon.ico` (symbol on a fully **transparent** background, the inside of the sheet included) and `app/apple-icon.png` (navy tile — iOS does not support transparency). The animated loading symbol is the `MarcaCarregando` component (SVG, transparent), colored by the `--color-marca-*` tokens. **Brand font:** Montserrat (`font-marca`, 600/700, local in `app/fonts/`) is used only for text that accompanies the logo — the slogan and the "uma solução" endorsement — never for interface text.

## Fonts

In the app the fonts are local `woff2` files in `app/fonts/` (Fontsource, OFL): Montserrat 600/700/800 (brand: headings, stat numbers, caps labels, slogan), Inter (UI text), JetBrains Mono (IDs, money) and Plus Jakarta Sans (kept as fallback). The specimens here load the same families from Google Fonts via `tokens/typography.css`.

## Index

- `styles.css` — global entry; imports everything under `tokens/`.
- `tokens/` — `colors.css`, `typography.css`, `layout.css` (spacing, radii, borders, motion).
- `assets/` — artes da marca aprovada em SVG e PNG: `geradocs-{mark,logo}[-white]`, `govpro-{mark,logo}[-white]`, `geradocs-endosso-govpro[-white]` e `geradocs-carregando[-white].gif` (ver convenção acima).
- `components/core/` — Button, StatusBadge, DocPill, Tag, Toggle, Input, Textarea, Select, MoneyInput, QuantityInput, FormField, FileUpload, ChoiceCard, StatCard, SectionBlock, ValidationMsg, StepIndicator, ProgressBar, SearchInput, FilterTabs.
- `components/chrome/` — Sidebar, Header (app shell).
- `ui_kits/geradocs/` — interactive recreation of the app (Dashboard, Processos, Novo Processo wizard, ETP editor).
- `guidelines/` — foundation specimen cards shown in the Design System tab.
- `SKILL.md` — agent skill entry point.

### Intentional additions

- `ProgressBar`, `SearchInput`, `FilterTabs` — extracted from repeated inline patterns in the source views (ETP progress, header/list search, ProcessList status filter), not inventions.
- `MoneyInput` / `QuantityInput` — the masked pt-BR money and quantity fields (`components/forms/MoneyInput.prompt.md`). They own the formatting so no screen can forget it.
- **Login / auth screen** — `components/chrome/Login.prompt.md`. Outside the app shell, navy gradient background, official GeraDocs logo + GovPro credit. `Input` gained `type` (`text`/`password`/`email`), `autoComplete` and `onKeyDown` (backward-compatible) for the credential fields.
- **Perfil de acesso** — o chip do perfil (`admin_geral`/`coordenador`/`servidor`) usa `Tag` (`warning`/`success`/`neutral`); é distinto do vocabulário de status de processo.
- App-side extensions with no `.prompt.md` here, approved and registered in the app's `docs/decisions.md` §17: `Dropdown` (+ `DropdownOption`), `CheckMark`, `MarcaCarregando` (animated brand symbol for loading states). Conversely, `CardPanel` is specified in `SectionBlock.prompt.md` but is not exported by the app barrel.

### Known gaps

- Approvals/Documents/Settings/DFDReview views exist in source but are not yet recreated in the UI kit.
