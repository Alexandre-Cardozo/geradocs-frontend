# Estilização — Tailwind CSS v4 (utility-first)

Este documento define **como estilizar** no GeraDocs. Leia antes de mexer em qualquer UI. A regra central: **os tokens do design system são a única fonte de verdade, expostos como utilities do Tailwind via `@theme`.**

## O padrão

O projeto usa **React + Tailwind CSS v4**, utility-first. Não há CSS-in-JS, CSS Modules nem estilos inline de layout — a aparência de cada elemento é expressa por classes utilitárias no `className`.

O ponto que torna isso compatível com o design system GovPro/GeraDocs: em `app/globals.css`, o bloco **`@theme`** declara cada token do DS (cores, fontes, raios, breakpoints, larguras máximas). O Tailwind v4 então **gera automaticamente** as utilities correspondentes, e cada uma resolve para a mesma CSS variable. Um único lugar define o valor:

```css
/* app/globals.css */
@theme {
  --color-royal: #2563EB;   /* → utilities bg-royal, text-royal, border-royal... */
  --text-base: 13px;        /* → text-base (corpo padrão do DS) */
  --radius-card: 12px;      /* → rounded-card */
  --breakpoint-xs: 480px;   /* → variante xs: */
}
```

```tsx
// no componente — nunca o hex, sempre o token:
<div className="rounded-card bg-royal text-surface">…</div>
```

Trocar `--color-royal` no `@theme` muda o app inteiro. É a fonte única de verdade que o produto pediu.

## Regras (o lint reforça)

1. **Nunca hex cru** (`#2563EB`) em `className` ou `style`. Use a classe de token (`bg-royal`, `text-tint-success-fg`).
2. **Nunca cor arbitrária** no Tailwind (`bg-[#2563EB]`, `text-[rgb(...)]`) — isso burla o `@theme`. Use o token.
3. **Nunca tamanho de fonte arbitrário** (`text-[16px]`) — use a escala (`text-xs`…`text-3xl`, ou os tokens de exceção `text-panel`/`text-score`). A escala tipográfica do DS é fixa.
4. **Valores estruturais pontuais em brackets são permitidos** (`min-w-[560px]` numa tabela rolável, `rounded-[14px]` de um painel específico). São one-offs de layout, não decisões de design token — o equivalente utility-first das "dimensões pontuais" que antes eram números JS.

As regras 1–3 estão em `eslint.config.mjs` (`no-restricted-syntax`, severidade **error**) e falham o build. A regra do barrel (importar o DS só de `@/components/ui`) está em `.oxlintrc.json`.

## Onde vive cada coisa

| Preciso de… | Onde |
|---|---|
| Uma cor / raio / fonte nova | Token no `@theme` de `app/globals.css` (único lugar com hex) |
| Um gradiente | `@utility gradient-*` em `globals.css` (os 5 usos canônicos do DS) |
| Estilizar um elemento | Classes utilitárias no `className` |
| Um estilo global (focus ring, scrollbar, reduced-motion) | `@layer base` em `globals.css` |
| Um componente reutilizável | `components/ui` (DS), `components/layout` (moldura) ou `components/shared` (apoio) |

## Responsividade (mobile-first)

Continua mobile-first, agora com as variantes nativas do Tailwind. Breakpoints: **`xs` 480 · `sm` 640 · `md` 768 · `lg` 1024**. A base (sem prefixo) é o celular; cada variante amplia para cima.

```tsx
{/* 1 coluna no celular, 2 em ≥480, 4 em ≥1024 */}
<div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
```

Padrões aplicados: sidebar vira drawer off-canvas abaixo de `lg` (`fixed … -translate-x-full lg:static lg:translate-x-0`); tabelas largas rolam dentro de `overflow-x-auto` com `min-w-[...]`; padding de página `p-4 sm:p-5 lg:p-7`; os dois layouts de painel (ETP, Aprovações) empilham no celular e viram colunas fixas em `lg`.

## Padrão dos componentes reutilizáveis

Cada componente do DS mantém sua **API de props** (variantes, tamanhos) e monta o `className` a partir de mapas de classe — a estilização mudou de objeto de estilo inline para string de utilities, a interface não:

```tsx
const buttonVariants = {
  primary: "bg-royal text-surface hover:bg-royal-hover disabled:bg-border",
  secondary: "bg-surface border border-border text-text-3 hover:bg-ice",
  // ...
}
// <Button variant="primary" size="lg"> continua igual para quem consome
```

Componentes aceitam `className` opcional para ajustes pontuais do chamador (ex.: `flex-1` num botão dentro de uma linha de ações), concatenado ao final — o chamador estende, nunca reescreve o token.
