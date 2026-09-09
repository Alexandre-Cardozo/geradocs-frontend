# LAHHM · GeraDocs Design System

GeraDocs is LAHHM's GovTech SaaS product: a web platform used by Brazilian municipal governments (prefeituras) and public agencies to automate the drafting of public-procurement documents under Lei 14.133/21. It generates **six document types, in the canonical order of a real contratação**: Cotação de Mercado → ETP → Mapa de Riscos → TR → Edital → Contrato. The DFD is an input (attached and AI-verified), and the PCA is agency-level context — neither is generated.

It replaces manual Word files and scattered templates with a guided, step-by-step flow: create a contratação process (the documents on offer depend on the modalidade — direct contracting has no Edital), attach/verify the DFD with AI feedback, fill each document section by section with automatic validations, manage ATA adhesion (attach an ATA for AI review and/or delegate ATA search to the model), send for approval through a real state machine (legal review under Art. 53, then the manager approves / rejects / requests retification with per-section annotations, versioning each document), and export final DOCX/PDF with the municipality's letterhead. The six process statuses are a fixed vocabulary — the flow never invents new ones.

Which documents exist, in what order, on what legal basis: `docs/fluxo-contratacao.md` in the app repo.

**Users:** municipal procurement staff, requesting secretarias, contracting commissions, legal, and approving managers. The UI must convey trust, security, organization, and institutional professionalism — modern corporate SaaS, not an institutional website.

## Sources

- Codebase (ground truth): mounted local folder `GeraDocs SaaS Platform Prototype (Copy)/` — Vite + React + TS prototype (`src/components/{Sidebar,Header,StatusBadge}.tsx`, `src/views/{Dashboard,ProcessList,NewProcess,ETPForm,Approvals,Documents,Settings,DFDReview}.tsx`, `src/index.css`). Styling is inline-style-based; `index.css` holds the palette and font imports.
- Logos: `uploads/geradocs_logo_.jpeg` (product mark), `uploads/laam_logo_.jpeg` (LAHHM company wordmark) → copied to `assets/`.
- Original prototype prompts (product spec) provided by the user in chat.

Note: the prototype's sidebar wordmark reads "ContrataDoc"; per the user, the product name is **GeraDocs** and the company is **LAHHM** — the design system uses GeraDocs/LAHHM.

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

- **Palette:** deep navy `#071A3D` (sidebar, headings), petroleum `#0D3B66` (money values, dark panels), royal `#2563EB` (primary actions/links/active), electric `#38BDF8` (accents, active-item tick, gradients), slate `#64748B` (secondary text), ice `#F8FAFC` (app bg), border `#E2E8F0`. Semantic: success `#10B981`, danger `#EF4444`. **Atenção não tem cor própria fora da paleta**: o par âmbar `#FFFBEB`/`#92400E` que vinha do protótipo saiu em 27/08/2026 — amarelo com texto tirando para o vermelho não existia em lugar nenhum do produto. O tom de atenção é ardósia `#F1F5F9` com texto petróleo `#0D3B66`, e quem avisa é o ícone e o texto.
- **Document accents (`doc-*`)** — one hue per document type, used on chips, icons and selected cards. Each has a paired tint background: Cotação `#7C3AED`/`#F5F3FF` · ETP `#2563EB`/`#EFF6FF` · Mapa `#B45309`/`#FFFBEB` · TR `#0D9488`/`#F0FDFA` · Edital `#BE185D`/`#FDF2F8` · Contrato `#334155`/`#F1F5F9`. **Contrato is slate, not green:** institutional green is already the "Concluído" status, and a green chip on a document would read as a status badge.
- **Type:** Plus Jakarta Sans (700/800) for headings with negative tracking (−0.3/−0.5px); Inter for UI text; JetBrains Mono for IDs, money, kbd. Base UI size 13px; inputs 14px; stat numbers 30px/800. **Heading ramp (fixed):** page headings 20px/800 −0.5px · toolbar/header titles 17px/700 −0.3px · card titles 15px/700 · body 13px.
- **Backgrounds:** flat ice-white app canvas; white cards; navy sidebar & occasional navy/petroleum dark panels (`linear-gradient(135deg,#1E3A5F,#0D3B66)`); no imagery, no textures.
- **Gradients:** small and purposeful only — brand logo chip `135deg #2563EB→#38BDF8`, avatar `135deg #0D3B66→#2563EB`, progress bar `90deg #2563EB→#38BDF8`.
- **Cards:** white, 1px `#E2E8F0` border, radius 12px, **no drop shadows** — the system is flat; borders carry separation. Inner section dividers use softer `#F1F5F9`.
- **Radii scale:** 12px cards/tables, 8px inputs/buttons/nav, 6px pills/small chips, 999px badges/toggles/avatars.
- **Buttons:** fixed heights — sm 32px · md 36px · lg 40px; radius 8px; 13–14px/600 labels.
- **Hover states:** background shifts, not shadows — rows/list items to `#F8FAFC`; primary button `#2563EB→#1D4ED8`; sidebar items to `rgba(255,255,255,0.06)` + white text. Transitions `0.15s` (bg) / `0.2s` (toggles, progress).
- **Selected states:** 2px royal border + `#EFF6FF` tint fill + check circle; sidebar active = `rgba(37,99,235,0.18)` fill + 3×20px electric left bar (rounded right).
- **Press states:** none distinct from hover in source; keep it that way.
- **On-dark surfaces:** white at alpha steps — text 1.0/0.65/0.55/0.4/0.35/0.3, fills 0.06/0.08/0.1 borders.
- **Focus:** inputs use `outline: none` in the source; no visible focus ring system (prototype-level; flag for accessibility work).
- **Shadows:** only the toggle knob (`0 1px 3px rgba(0,0,0,0.2)`).
- **Density/layout:** fixed 240px navy sidebar, 60px white header, 28px page padding, max-width 1200px content (880px for wizards); ETP editor adds a 280px white section rail. Tables: uppercase 11px headers on `#F8FAFC`, 13–14px rows.
- **Animation:** subtle and functional only — 0.15–0.2s eases, 0.5s progress width, 1s spinner. No bounces, no entrance animations.
- **Scrollbars:** 5px thin, `#CBD5E1` rounded thumb.

## ICONOGRAPHY

- **System:** inline SVG line icons, 24×24 viewBox, `stroke="currentColor"`, stroke-width 2 (2.5 for small/bold marks, 1.5 for large empty-state), round caps/joins — visually equivalent to **Feather/Lucide**. Rendered at 13–20px.
- No icon font, no PNG icons. Use Lucide from CDN (or copy the same paths inline) when composing new screens — same stroke weight.
- Check marks: white 3–3.5 stroke polyline `20 6 9 17 4 12` inside filled royal/green circles/squares.
- Emoji are not used anywhere; quick-action and modalidade rows use the same monochrome line icons (royal on white surfaces, electric #38BDF8 on navy).
- Unicode arrows (→ ←) inside button/link labels are standard.
- **Logos** (`assets/`) — naming convention `<brand>-<mark|logo>[-white].png`: **`mark`** = símbolo/glyph only, **`logo`** = símbolo + wordmark; `-white` = versão prata para fundo escuro. So: `geradocs-mark[-white].png` (blue gradient document glyph with check), `geradocs-logo[-white].png` (glyph + "GeraDocs"), `lahhm-mark[-white].png` (square "L" monogram), `lahhm-logo[-white].png` (monogram + "LAHHM"). Transparent PNGs. In the app: the sidebar uses `geradocs-mark-white.png` (34px), the login uses `geradocs-logo-white.png` + `lahhm-logo-white.png`, and the browser tab favicon is `geradocs-mark.png` (`app/icon.png`).

## Fonts

All three families are Google Fonts, loaded via `@import` in `tokens/typography.css` (as in the source prototype): Plus Jakarta Sans, Inter, JetBrains Mono. No local binaries were provided; if offline use is needed, supply .woff2 files and we'll switch to local `@font-face`.

## Index

- `styles.css` — global entry; imports everything under `tokens/`.
- `tokens/` — `colors.css`, `typography.css`, `layout.css` (spacing, radii, borders, motion).
- `assets/` — 8 artes: `geradocs-{mark,logo}[-white].png` e `lahhm-{mark,logo}[-white].png` (ver convenção acima).
- `components/core/` — Button, StatusBadge, DocPill, Tag, Toggle, Input, Textarea, Select, MoneyInput, QuantityInput, FormField, FileUpload, ChoiceCard, StatCard, SectionBlock, ValidationMsg, StepIndicator, ProgressBar, SearchInput, FilterTabs.
- `components/chrome/` — Sidebar, Header (app shell).
- `ui_kits/geradocs/` — interactive recreation of the app (Dashboard, Processos, Novo Processo wizard, ETP editor).
- `guidelines/` — foundation specimen cards shown in the Design System tab.
- `SKILL.md` — agent skill entry point.

### Intentional additions

- `ProgressBar`, `SearchInput`, `FilterTabs` — extracted from repeated inline patterns in the source views (ETP progress, header/list search, ProcessList status filter), not inventions.
- `MoneyInput` / `QuantityInput` — the masked pt-BR money and quantity fields (`components/forms/MoneyInput.prompt.md`). They own the formatting so no screen can forget it.
- **Login / auth screen** — `components/chrome/Login.prompt.md`. Outside the app shell, navy gradient background, product mark + LAHHM credit. `Input` gained `type` (`text`/`password`/`email`), `autoComplete` and `onKeyDown` (backward-compatible) for the credential fields.
- **Perfil de acesso** — o chip do perfil (`admin_geral`/`coordenador`/`servidor`) usa `Tag` (`warning`/`success`/`neutral`); é distinto do vocabulário de status de processo.
- App-side extensions with no `.prompt.md` here, approved and registered in the app's `docs/decisions.md` §17: `Dropdown` (+ `DropdownOption`), `CheckMark`. Conversely, `CardPanel` is specified in `SectionBlock.prompt.md` but is not exported by the app barrel.

### Known gaps

- No focus-ring system in source (accessibility gap to resolve with product).
- Approvals/Documents/Settings/DFDReview views exist in source but are not yet recreated in the UI kit.
