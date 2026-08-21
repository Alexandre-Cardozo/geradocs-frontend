# GeraDocs — Frontend (Next.js)

Aplicação Next.js 16 (App Router) + React 19 + TypeScript strict + TanStack Query. Fase 1: interface completa sobre camada de dados mockada (sem backend). Veja `README.md` (arquitetura e convenções), `docs/estrutura.md` (organização de pastas — onde colocar cada tipo de código) e `docs/decisions.md` (decisões da fase).

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run check` — lint (ESLint + oxlint de aderência) + type-check; rode ao final de qualquer alteração
- `npm run build` — build de produção

## Regras essenciais

- **Design System é normativo**: antes de qualquer tarefa de UI, leia `design_system/readme.md` e o `.prompt.md` do componente relevante. Em conflito entre protótipo e DS, o DS vence.
- **Tailwind utility-first sobre tokens**: estilize por classes de token (`bg-royal`, `text-lg`, `rounded-card`). Os tokens do DS são declarados no `@theme` de `app/globals.css` (fonte única de verdade) e viram utilities. Proibido cor hex/arbitrária (`#...`, `bg-[#...]`) e tamanho de fonte arbitrário — o lint falha. Guia: `docs/estilizacao.md`.
- **Componentes do DS** importados só de `@/components/ui` (barrel). Ícones: `components/ui/icons.tsx` (linha estilo Lucide) — zero emoji na interface.
- **Dados só via hooks** de `lib/api/hooks.ts`; nunca importe `lib/mocks` em componentes. Trate loading/erro/empty em toda tela.
- **Conteúdo pt-BR**: Title Case em títulos, imperativos em ações, referências legais literais ("Art. 75, II, Lei 14.133/21"), IDs e valores monetários em monospace (`PROC-2024-089`, `R$ 485.000,00`), vocabulário de status fixo (Rascunho, Em Revisão, Aguardando, Aprovado, Rejeitado, Concluído).
- **Valores nunca aparecem crus**: todo valor monetário e quantidade leva separador de milhar e duas casas (`500.000,00`, nunca `500000`). Para exibir, use `formatBRL`/`formatNumeroBR` de `lib/format.ts`; para digitar, use `MoneyInput`/`QuantityInput` (mascaram sozinhos — o `onChange` devolve a string já formatada). Nunca reimplemente máscara ou parse de valor na tela.
- O protótipo Vite original que serviu de referência visual foi removido do repositório após a migração; a especificação visual vigente é o design system em `design_system/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
