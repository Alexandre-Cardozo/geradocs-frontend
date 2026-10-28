Authentication screen — rendered **outside** the app shell (no sidebar/header), in the `(auth)` route group.

Layout (modern SaaS, GeraDocs-styled): full-bleed navy→petroleum background (`gradient-hero`, no imagery — the flat GovTech look), everything **fits in the viewport without scrolling**. A `min-h-dvh flex-col` splits the screen into a centered `main` (brand + card) and a `footer` anchored to the bottom.

```jsx
<div className="flex min-h-dvh flex-col bg-navy">
  <div className="pointer-events-none fixed inset-0 gradient-hero" aria-hidden />
  {/* Centro: marca + card */}
  <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-4">
    {/* Marca — símbolo (mark) + wordmark grande + tagline entre filetes */}
    <div className="mb-5 flex flex-col items-center text-center">
      <Image src="/geradocs-mark-white.png" alt="" width={44} height={46} priority />
      <div className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-on-dark">GeraDocs</div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="h-px w-7 bg-on-dark-border" />
        <span className="text-2xs font-semibold tracking-caps-wide text-electric uppercase">Contratações Públicas · Lei 14.133/21</span>
        <span className="h-px w-7 bg-on-dark-border" />
      </div>
    </div>
    {/* Card branco flat */}
    <div className="w-full max-w-md rounded-card border border-on-dark-border bg-surface p-6 sm:p-7">
      <h1 className="mb-4 text-center font-display text-lg font-extrabold text-text-1">Acesse sua conta</h1>
      <FormField label="CPF"><Input placeholder="000.000.000-00" /></FormField>
      <FormField label="Senha"><Input type="password" /></FormField>
      <Button size="lg" className="w-full">Entrar</Button>
    </div>
  </main>
  {/* Rodapé proporcional, ancorado ao fim */}
  <footer className="relative z-10 flex flex-col items-center gap-1 px-4 pb-5 text-center">
    GeraDocs é uma solução <Image src={govproLogo /* public/govpro-logo-white.svg */} .../> · ajuda (mailto) · © GovPro
  </footer>
</div>
```

Rules:

- **Fits without scrolling.** `min-h-dvh flex-col`, `main` = `flex-1` centered, footer pinned. Keep the content compact (tight demo list, `py-4` main) so it fits on ~768px laptops.
- **Brand block (the critical part):** the official **logo** for dark backgrounds (`public/geradocs-logo-white.svg`, 44px high — symbol + two-tone Montserrat wordmark, already in curves, crisp at any size), then a short institutional tagline flanked by 1px rules (like the reference "— TRAVEL MANAGEMENT —"). Never retype the wordmark in another font, and never use a low-resolution raster of it.
- **CPF field:** mask `000.000.000-00`, validate check digits, generic error ("CPF ou senha inválidos" — never reveal which failed).
- **Footer:** proportional, always visible at the bottom — credits **GovPro** ("GeraDocs é uma solução" + `govpro-logo-white.svg`), help mailto, copyright "© GovPro". Favicon da aba: `app/icon.png` + `app/apple-icon.png` + `app/favicon.ico` (símbolo do GeraDocs no selo azul-marinho).
- Password recovery link → a minimal recovery view (email → generic confirmation) inside the same card.
- Never use a photo background — the DS is flat; the navy gradient carries the mood.
