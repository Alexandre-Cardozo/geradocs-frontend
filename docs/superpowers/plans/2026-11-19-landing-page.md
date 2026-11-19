# Landing Page GovPro + GeraDocs — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a rota estática `/landing-page`, que apresenta a GovPro (empresa) e destaca o GeraDocs (produto), com "Solicitar Demonstração" como ação principal.

**Architecture:** Página de servidor (`app/landing-page/page.tsx`) que só compõe seções de `components/landing/`; toda a copy vive como dados em `lib/landing/conteudo.ts`; a ordem dos documentos é lida do catálogo existente. Animação é CSS (keyframes e curva no `@theme`) mais um único client component (`Revelar`) com `IntersectionObserver`. Sem fetch, sem sessão, sem dependência nova.

**Tech Stack:** Next 16 (static export), React 19, Tailwind v4 (`@theme`), vitest + Testing Library, Playwright + `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-11-19-landing-page-design.md`

## Global Constraints

- Worktree: `C:\geradocs-frontend-integration`. Todos os caminhos abaixo são relativos a ele. Todos os comandos rodam nele.
- Static export (`output: "export"`, `trailingSlash: true`, `basePath` só em produção): sem `fetch`, sem rota dinâmica `[id]`; links por `next/link`.
- Camadas: `app/` só compõe; `components/` sem fetch e sem regra; `lib/` sem JSX.
- Cor só por token: **zero hex** em `app/`, `components/` e `lib/` (guarda-corpo nº 1 de `lib/teste/guardrails.test.ts`). Hex só existe no `@theme` de `app/globals.css`. Nenhum token novo da landing usa hex.
- Imports de componentes do DS só pelo barrel `@/components/ui`; ícones de `@/components/ui/icons`. **Zero emoji.**
- Âncoras de página (`#problema`, `#geradocs`, `#ia`, `#confianca`, `#quem-somos`, `#demonstracao`, `#conteudo`) não podem casar com o regex de hex do guarda-corpo (`#[0-9a-fA-F]{3,8}\b`): nenhuma começa com três caracteres hexadecimais seguidos. Ao criar um id novo, conferir.
- Texto sobre fundo navy usa só `text-on-dark`, `text-on-dark-65`, `-60` ou `-55` (≥ 5,5:1). **Nunca** `-45`, `-40`, `-35`, `-30` ou `-20` em texto (< 4,5:1).
- Movimento: só `transform`, `opacity` e `filter`; nunca `transition: all`; nada em loop; durações e curva da spec §6.
- Português do Brasil, Title Case em títulos, imperativo em ações, fundamento legal literal. Nada sobre a GovPro além do que existe: o que falta fica como `[LACUNA: …]`.
- Dependência nova: **nenhuma**. Se aparecer necessidade, parar e perguntar (`npm run deps:sync`, nunca `npm install <pacote>`).
- Cada commit é em Conventional Commits e termina com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Nunca** `git add -A` nem `git add .`: o worktree tem arquivos soltos da instalação das skills (`.agents/`, `.claude/skills/`, `skills-lock.json`) e a spec/plano, que não entram nos commits de código. Adicionar sempre caminhos explícitos.
- Não pular os hooks (`GERADOCS_SKIP_HOOKS`). Se o hook reprovar, corrigir a causa. O hook de pré-commit roda o **type-check**: antes de cada commit, rodar `npm run typecheck` e `npm run lint`, além dos testes da tarefa (o vitest não enxerga erro de tipo).
- Defeito **só de teste** do plano (a asserção não compila, ou casa com algo que não é o que ela quer dizer): corrigir o teste preservando o que ele afirma, refletir a correção neste plano e reportar. Qualquer coisa que mude copy, spec ou comportamento do produto: parar e reportar.
- Não publicar, não fazer deploy.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `docs/decisions.md` | ADRs §107, §108, §109 |
| `app/globals.css` | tokens da landing no `@theme` (tipografia, contêiner, curva, keyframes) |
| `lib/landing/conteudo.ts` | toda a copy e os links, como dados |
| `lib/landing/conteudo.test.ts`, `lib/landing/tokens.test.ts` | testes de copy e de tokens |
| `components/shared/marca.tsx` | `FaixasDeCanto` ganha a prop `posicao` |
| `components/landing/botao-link.tsx` | link com aparência de botão (o `Button` do DS não é âncora) |
| `components/landing/entrada.tsx` | entrada escalonada por CSS (hero) |
| `components/landing/revelar.tsx` | revelação ao rolar (client) |
| `components/landing/moldura-de-tela.tsx` | moldura em CSS para capturas |
| `components/landing/cabecalho.tsx` | cabeçalho fixo, âncoras, menu mobile (client) |
| `components/landing/rodape.tsx` | rodapé |
| `components/landing/{hero,problema,fluxo-geradocs,ia-sem-travar,confianca,quem-somos,demonstracao}.tsx` | uma seção por arquivo |
| `app/landing-page/page.tsx` | composição + `metadata` |
| `e2e/capturas-landing.spec.ts` | gera as capturas (só com `CAPTURAS_LANDING=1`) |
| `e2e/landing.spec.ts` | jornada e acessibilidade da landing |
| `public/landing/editor-etp.png`, `public/landing/proposta-ia.png` | capturas |

---

### Task 0: Branch de trabalho e linha de base

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Ver o estado do worktree**

Run: `git status --short` e `git branch --show-current`
Expected: branch `fix/mensagem-fontes-da-ia`; só aparecem `M skills-lock.json` e itens `??` de `.agents/`, `.claude/skills/` e `docs/superpowers/`. Se aparecer outra modificação, parar e perguntar.

- [ ] **Step 2: Criar a branch a partir da integração**

Run:
```bash
git fetch origin
git checkout -b feat/landing-page origin/integration/ai-frontend
```
Expected: `Switched to a new branch 'feat/landing-page'`. Se o checkout recusar por causa de `skills-lock.json`, rodar `git stash push -- skills-lock.json`, repetir o checkout e depois `git stash pop`.

- [ ] **Step 3: Confirmar a linha de base verde**

Run: `npm ci --no-audit --no-fund` (só se `node_modules` estiver ausente ou desatualizado) e depois `npm run check`
Expected: ESLint, oxlint, `tsc --noEmit` e `vitest run` terminam sem erro. Se falhar, **parar**: a base já está vermelha e não é culpa da landing; reportar.

---

### Task 1: ADRs §107–§109

**Files:**
- Modify: `docs/decisions.md` (acrescentar ao final)

**Interfaces:** Produces: as referências §107, §108, §109 que os comentários de código das tasks seguintes citam.

- [ ] **Step 1: Acrescentar as três decisões ao final do arquivo**

Run (uma só vez):
```bash
cat >> docs/decisions.md <<'EOF'

## 107. A landing tem entrada animada, e só ela

O design system diz "sem animações de entrada", e continua valendo para o aplicativo. A landing é uma página de apresentação, lida uma vez por quem ainda não usa o produto, e ali uma entrada discreta ajuda a ler. A exceção é estreita:

- **Só na rota `/landing-page`.** As telas do aplicativo não ganham nenhum efeito novo.
- **Só estes efeitos:** entrada escalonada no hero (opacidade, blur de 4px e deslocamento de 12px, 300ms, `cubic-bezier(0.2, 0, 0, 1)`, 100ms entre elementos) e a mesma revelação, uma vez, ao rolar. O menu móvel abre em 250ms e fecha em 150ms.
- **Só `transform`, `opacity` e `filter`.** Nunca `transition: all`, nunca loop, nunca parallax.
- **Sem JavaScript o conteúdo aparece.** O estado escondido só é aplicado depois que o componente monta no navegador, e só em elementos abaixo da dobra.
- **Movimento reduzido:** nenhum elemento é escondido, e a regra global de `globals.css` já zera as durações.
- Keyframes e curva vivem no `@theme` (`--animate-landing-*`, `--ease-landing`), como `--animate-marca-varredura`.

## 108. A landing tem escala tipográfica e contêiner próprios

A escala do aplicativo tem corpo de 13px e tamanhos fixos em px: serve a uma interface densa e é pequena demais para uma página de leitura. A landing ganha tokens próprios no `@theme`, em vez de valores soltos nas classes:

- `--text-landing-h1` e `--text-landing-h2` fluidos com `clamp()`, `--text-landing-lead` (18px) e `--text-landing-body` (16px), cada um com `line-height` e, nos títulos, `letter-spacing` negativo.
- `--container-landing` (70rem), porque o aplicativo não tem teto de largura e uma página de leitura precisa dele.
- Os tokens do aplicativo não mudam, e o aplicativo não usa os da landing.

## 109. A landing vive em `app/landing-page/`, sem sessão e sem fetch

A rota `/landing-page` fica fora de `(app)` e de `(auth)`, portanto não herda a barra lateral nem a guarda de sessão. É um componente de servidor que exporta `metadata` próprio; é estática, sem chamada à API, sem hook de dados. Os componentes ficam em `components/landing/`, e a copy em `lib/landing/conteudo.ts`. A ordem dos documentos é lida de `lib/documentos/catalogo.ts`, a fonte única. A ação principal é um `mailto:` para `contato@govpro.com.br`; não há formulário nem backend novo. A rota `/` não muda.
EOF
```

- [ ] **Step 2: Conferir que o arquivo termina bem formado**

Run: `tail -n 8 docs/decisions.md`
Expected: termina no parágrafo da §109, sem marcador `EOF` solto.

- [ ] **Step 3: Commit**

```bash
git add docs/decisions.md
git commit -m "docs(adr): decisões 107-109 da landing page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tokens da landing no `@theme`

**Files:**
- Modify: `app/globals.css` (bloco `@theme`, logo após o `@keyframes marca-varredura`)
- Create: `lib/landing/tokens.test.ts`

**Interfaces:** Produces — utilities Tailwind usadas pelas tasks seguintes: `max-w-landing`, `ease-landing`, `text-landing-h1`, `text-landing-h2`, `text-landing-lead`, `text-landing-body`, `animate-landing-entrada`, `animate-landing-menu-abre`, `animate-landing-menu-fecha`.

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/landing/tokens.test.ts`:
```ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Os tokens da landing (§107, §108) vivem no `@theme` de `app/globals.css`, e as
 * classes dos componentes dependem deles. Se um token sumir, o Tailwind simplesmente
 * não gera a classe e a página perde o estilo sem erro algum — este teste é o aviso.
 */
const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8")

describe("tokens da landing no @theme", () => {
  it.each([
    "--container-landing:",
    "--ease-landing:",
    "--text-landing-h1:",
    "--text-landing-h1--line-height:",
    "--text-landing-h2:",
    "--text-landing-lead:",
    "--text-landing-body:",
    "--animate-landing-entrada:",
    "--animate-landing-menu-abre:",
    "--animate-landing-menu-fecha:",
    "@keyframes landing-entrada",
    "@keyframes landing-menu-abre",
    "@keyframes landing-menu-fecha",
  ])("declara %s", (token) => {
    expect(css).toContain(token)
  })

  it("não declara cor hex nos tokens da landing", () => {
    const trecho = css.slice(css.indexOf("Landing (§107"), css.indexOf("/*\n  `sr-only`"))
    expect(trecho.length).toBeGreaterThan(0)
    expect(trecho).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/landing/tokens.test.ts`
Expected: FAIL — os `declara …` falham (`css` não contém os tokens) e o último teste falha em `trecho.length`.

- [ ] **Step 3: Acrescentar os tokens**

Em `app/globals.css`, localizar o fim do bloco `@theme` — o `@keyframes marca-varredura { … }` seguido da chave `}` que fecha o `@theme`:
```css
    100% {
      stroke-dashoffset: -100;
    }
  }
}
```
Substituir por:
```css
    100% {
      stroke-dashoffset: -100;
    }
  }

  /*
   * ── Landing (§107, §108) ─────────────────────────────────────────────────
   *
   * Tokens da página de apresentação. O aplicativo não os usa.
   */
  --container-landing: 70rem;
  --ease-landing: cubic-bezier(0.2, 0, 0, 1);

  --text-landing-h1: clamp(2rem, 5vw, 3.5rem);
  --text-landing-h1--line-height: 1.1;
  --text-landing-h1--letter-spacing: -0.02em;
  --text-landing-h2: clamp(1.5rem, 3vw, 2.25rem);
  --text-landing-h2--line-height: 1.2;
  --text-landing-h2--letter-spacing: -0.01em;
  --text-landing-lead: 1.125rem;
  --text-landing-lead--line-height: 1.6;
  --text-landing-body: 1rem;
  --text-landing-body--line-height: 1.5;

  /*
   * Entrada do hero e menu móvel. `both` segura o estado inicial durante o
   * atraso e o final depois dele. Com movimento reduzido a regra global zera a
   * duração e o elemento fica no estado final.
   */
  --animate-landing-entrada: landing-entrada 300ms cubic-bezier(0.2, 0, 0, 1) both;
  --animate-landing-menu-abre: landing-menu-abre 250ms cubic-bezier(0.2, 0, 0, 1) both;
  --animate-landing-menu-fecha: landing-menu-fecha 150ms cubic-bezier(0.2, 0, 0, 1) both;

  @keyframes landing-entrada {
    from {
      opacity: 0;
      transform: translateY(12px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: blur(0);
    }
  }

  @keyframes landing-menu-abre {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes landing-menu-fecha {
    from {
      opacity: 1;
      transform: none;
    }
    to {
      opacity: 0;
      transform: scale(0.97);
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/landing/tokens.test.ts`
Expected: PASS (14 testes).

- [ ] **Step 5: Garantir que o resto não quebrou**

Run: `npx vitest run lib/teste/guardrails.test.ts`
Expected: PASS (nenhum hex novo).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css lib/landing/tokens.test.ts
git commit -m "feat(landing): tokens de tipografia, contêiner e movimento no @theme

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Conteúdo da landing como dados

**Files:**
- Create: `lib/landing/conteudo.ts`
- Test: `lib/landing/conteudo.test.ts`

**Interfaces:**
- Consumes: `CATALOGO`, `ORDEM_FLUXO` de `@/lib/documentos`.
- Produces (assinaturas exatas, usadas por todas as seções):
  - `EMAIL_CONTATO: string`, `ASSUNTO_DA_DEMONSTRACAO: string`, `HREF_DEMONSTRACAO: string`, `HREF_ENTRAR: string`
  - `type IconeDaConfianca = "auditoria" | "lgpd" | "teto" | "fundamento" | "entidade"`
  - `DOCUMENTOS_DO_FLUXO: { tipo: TipoDocumento; titulo: string; fundamento: string; chip: string }[]`
  - `CONTEUDO` (objeto com `navegacao`, `hero`, `problema`, `fluxo`, `ia`, `confianca`, `quemSomos`, `demonstracao`, `rodape`), conforme o código abaixo.

- [ ] **Step 1: Escrever o teste que falha**

Create `lib/landing/conteudo.test.ts`:
```ts
import { describe, expect, it } from "vitest"

import { CATALOGO } from "@/lib/documentos"

import {
  ASSUNTO_DA_DEMONSTRACAO,
  CONTEUDO,
  DOCUMENTOS_DO_FLUXO,
  EMAIL_CONTATO,
  HREF_DEMONSTRACAO,
  HREF_ENTRAR,
} from "./conteudo"

describe("links da landing", () => {
  it("o pedido de demonstração é um mailto para a GovPro, com assunto", () => {
    expect(EMAIL_CONTATO).toBe("contato@govpro.com.br")
    expect(HREF_DEMONSTRACAO.startsWith("mailto:contato@govpro.com.br?subject=")).toBe(true)
    const assunto = new URL(HREF_DEMONSTRACAO).searchParams.get("subject")
    expect(assunto).toBe(ASSUNTO_DA_DEMONSTRACAO)
  })

  it("entrar leva ao login do aplicativo", () => {
    expect(HREF_ENTRAR).toBe("/login")
  })
})

describe("fluxo dos documentos", () => {
  it("são os seis documentos geráveis, na ordem do catálogo, sem o Aviso", () => {
    expect(DOCUMENTOS_DO_FLUXO.map((d) => d.titulo)).toEqual([
      "Cotação de Mercado",
      "Estudo Técnico Preliminar",
      "Mapa de Riscos",
      "Termo de Referência",
      "Edital de Licitação",
      "Minuta de Contrato",
    ])
    expect(DOCUMENTOS_DO_FLUXO).toHaveLength(6)
    // O filtro já estreitou o tipo e tirou "Aviso" dele; o `string` deixa o teste
    // perguntar ao valor em execução, e não ao compilador.
    expect(DOCUMENTOS_DO_FLUXO.some((d) => (d.tipo as string) === "Aviso")).toBe(false)
  })

  it("título, fundamento e chip vêm do catálogo, sem cópia", () => {
    for (const doc of DOCUMENTOS_DO_FLUXO) {
      expect(doc.titulo).toBe(CATALOGO[doc.tipo].titulo)
      expect(doc.fundamento).toBe(CATALOGO[doc.tipo].fundamento)
      expect(doc.chip).toBe(CATALOGO[doc.tipo].chip)
    }
  })
})

describe("copy", () => {
  const texto = JSON.stringify(CONTEUDO)

  it("não tem emoji", () => {
    // Mesma regra do guarda-corpo nº 3: `©` é sinal tipográfico (copyright do
    // rodapé), embora o Unicode o inclua em Extended_Pictographic.
    const semSinaisTipograficos = texto.replace(/[✓✕©]/gu, "")
    expect(semSinaisTipograficos).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it("usa o slogan e o subtítulo oficiais da marca", () => {
    expect(CONTEUDO.hero.eyebrow).toBe("Contratações públicas inteligentes")
    expect(CONTEUDO.hero.titulo).toBe("Documentos da Contratação Pública, Conforme a Lei 14.133/21")
  })

  it("cita o fundamento legal literalmente", () => {
    expect(texto).toContain("Art. 75, II, Lei 14.133/21")
  })

  it("as âncoras da navegação têm uma seção com o mesmo id", () => {
    const ids = [
      CONTEUDO.problema.id,
      CONTEUDO.fluxo.id,
      CONTEUDO.ia.id,
      CONTEUDO.confianca.id,
    ]
    expect(CONTEUDO.navegacao.map((n) => n.id)).toEqual(ids)
  })

  it("nenhum id de âncora parece cor hexadecimal", () => {
    const ids = [
      ...CONTEUDO.navegacao.map((n) => n.id),
      CONTEUDO.quemSomos.id,
      CONTEUDO.demonstracao.id,
      "conteudo",
    ]
    for (const id of ids) expect(`#${id}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

describe("lacunas de conteúdo", () => {
  it("só existem em Quem Somos, marcadas e visíveis", () => {
    const { quemSomos, ...resto } = CONTEUDO
    expect(JSON.stringify(resto)).not.toContain("[LACUNA")
    expect(quemSomos.lacuna.startsWith("[LACUNA:")).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/landing/conteudo.test.ts`
Expected: FAIL — `Failed to resolve import "./conteudo"`.

- [ ] **Step 3: Implementar**

Create `lib/landing/conteudo.ts`:
```ts
import { CATALOGO, ORDEM_FLUXO } from "@/lib/documentos"

/**
 * Toda a copy da landing (§109). Sem JSX: a página só compõe, e o texto se
 * revisa num lugar só. Só entra fato que existe no produto; o que falta sobre a
 * GovPro é uma `[LACUNA: …]` visível, e não texto inventado.
 */

export const EMAIL_CONTATO = "contato@govpro.com.br"
export const ASSUNTO_DA_DEMONSTRACAO = "Solicitação de demonstração do GeraDocs"
export const HREF_DEMONSTRACAO = `mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(ASSUNTO_DA_DEMONSTRACAO)}`
export const HREF_ENTRAR = "/login"

export type IconeDaConfianca = "auditoria" | "lgpd" | "teto" | "fundamento" | "entidade"

/**
 * Os seis documentos que a plataforma gera, na ordem do fluxo. O Aviso de
 * Contratação Direta não entra: ele toma o lugar do Edital na contratação
 * direta, e a nota do bloco diz isso. Título, fundamento e cor vêm do catálogo.
 */
export const DOCUMENTOS_DO_FLUXO = ORDEM_FLUXO.filter((tipo) => tipo !== "Aviso").map((tipo) => ({
  tipo,
  titulo: CATALOGO[tipo].titulo,
  fundamento: CATALOGO[tipo].fundamento,
  chip: CATALOGO[tipo].chip,
}))

export const CONTEUDO = {
  navegacao: [
    { id: "problema", rotulo: "O Problema" },
    { id: "geradocs", rotulo: "GeraDocs" },
    { id: "ia", rotulo: "IA" },
    { id: "confianca", rotulo: "Confiança" },
  ],

  hero: {
    eyebrow: "Contratações públicas inteligentes",
    titulo: "Documentos da Contratação Pública, Conforme a Lei 14.133/21",
    apoio:
      "O GeraDocs, solução da GovPro, orienta o servidor em cada etapa da fase preparatória e gera os documentos com o timbre da entidade.",
    ctaPrimario: "Solicitar Demonstração →",
    ctaSecundario: "Acessar o GeraDocs",
    altCaptura: "Editor de seção do Estudo Técnico Preliminar no GeraDocs, com a trilha de seções ao lado.",
  },

  problema: {
    id: "problema",
    titulo: "Do Word e dos Modelos Soltos para um Fluxo Guiado",
    itens: [
      {
        titulo: "Um Processo, Não Vários Arquivos",
        texto:
          "Os documentos da contratação deixam de viver em arquivos e modelos espalhados e passam a seguir um único processo.",
      },
      {
        titulo: "A Ordem Real da Contratação",
        texto:
          "Cada documento aparece na sequência em que a contratação de fato acontece, e a plataforma mostra o que vem antes.",
      },
      {
        titulo: "Proposta para Revisar, Não Página em Branco",
        texto: "Em vez de escrever cada seção do zero, o servidor recebe uma proposta e a revisa.",
      },
    ],
  },

  fluxo: {
    id: "geradocs",
    titulo: "O GeraDocs e o Fluxo da Contratação",
    intro:
      "A plataforma gera os seis documentos na ordem do fluxo real. O DFD entra como insumo e o PCA como contexto do órgão: nenhum dos dois é gerado.",
    insumos: [
      {
        rotulo: "Insumo",
        titulo: "DFD",
        texto: "Entra no processo por anexo ou por cadastro da secretaria. A plataforma não o gera.",
      },
      {
        rotulo: "Contexto do órgão",
        titulo: "PCA",
        texto: "Serve de contexto para os documentos do processo. Também não é gerado.",
      },
    ],
    notaDireta: "Na contratação direta, o Edital dá lugar ao Aviso de Contratação Direta.",
    exportacao: "A exportação é em DOCX e PDF, com o timbre da entidade.",
  },

  ia: {
    id: "ia",
    titulo: "A IA Propõe. O Servidor Decide.",
    itens: [
      {
        titulo: "Toda Proposta Vem Identificada",
        texto: "O texto gerado chega marcado como proposta da IA, e o servidor o revisa antes de aceitar.",
      },
      {
        titulo: "A IA Ajuda, Nunca Condiciona",
        texto: "O documento pode ser elaborado com ou sem IA. Ela é uma facilidade, nunca uma exigência.",
      },
      {
        titulo: "Orienta, Não Trava",
        texto:
          "A plataforma orienta e alerta, e o servidor mantém a decisão. Onde algo precisa ser seguido, ela explica o motivo.",
      },
      {
        titulo: "Só o Que Consta no Processo",
        texto: "A IA trabalha com as informações do processo e não acrescenta conhecimento próprio ao documento.",
      },
    ],
    altCaptura: "Proposta de texto gerada pela IA no editor do GeraDocs, para o servidor revisar antes de salvar.",
  },

  confianca: {
    id: "confianca",
    titulo: "Feito para o Controle da Contratação",
    itens: [
      {
        icone: "auditoria" as IconeDaConfianca,
        titulo: "Trilha de Auditoria",
        texto: "O que acontece no processo fica registrado.",
      },
      {
        icone: "lgpd" as IconeDaConfianca,
        titulo: "LGPD no Uso da IA",
        texto: "A LGPD é respeitada também nas informações enviadas à IA.",
      },
      {
        icone: "teto" as IconeDaConfianca,
        titulo: "Teto de IA Definido pela Entidade",
        texto: "A entidade define quanto usar de IA, e o servidor vê o limite antes de gerar.",
      },
      {
        icone: "fundamento" as IconeDaConfianca,
        titulo: "Fundamento Legal Literal",
        texto: "Os documentos citam a lei como ela é, por exemplo, Art. 75, II, Lei 14.133/21.",
      },
      {
        icone: "entidade" as IconeDaConfianca,
        titulo: "Protocolo e Assinatura no Seu Sistema",
        texto: "Protocolo, assinatura e aprovação continuam no sistema de processos da sua entidade.",
      },
    ],
  },

  quemSomos: {
    id: "quem-somos",
    titulo: "Quem Somos",
    lacuna: "[LACUNA: descrição da GovPro e serviços além do GeraDocs]",
  },

  demonstracao: {
    id: "demonstracao",
    titulo: "Veja o GeraDocs no Seu Órgão",
    texto: "Conte o que sua entidade contrata e veja o fluxo funcionando.",
    cta: "Solicitar Demonstração →",
  },

  rodape: {
    endosso: "GeraDocs é uma solução",
    contato: "Precisa de ajuda?",
    copyright: "© 2026 GovPro. Todos os direitos reservados.",
  },
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/landing/conteudo.test.ts`
Expected: PASS. Se "são os seis documentos…" falhar na ordem, abrir `lib/documentos/catalogo.ts` e ajustar **o teste** à ordem real do `ORDEM_FLUXO` (a fonte da verdade é o catálogo, não o teste).

- [ ] **Step 5: Conferir cobertura e guarda-corpos**

Run: `npx vitest run --coverage lib/landing lib/teste/guardrails.test.ts`
Expected: PASS, e `lib/landing/conteudo.ts` com 100% nos quatro números (o piso de `lib/**` vale).

- [ ] **Step 6: Commit**

```bash
git add lib/landing/conteudo.ts lib/landing/conteudo.test.ts
git commit -m "feat(landing): copy e links da landing como dados

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Componentes de base — `BotaoLink`, `Entrada`, `Revelar`, `MolduraDeTela` e `FaixasDeCanto`

**Files:**
- Modify: `components/shared/marca.tsx` (prop `posicao` em `FaixasDeCanto`)
- Create: `components/landing/botao-link.tsx`, `components/landing/entrada.tsx`, `components/landing/revelar.tsx`, `components/landing/moldura-de-tela.tsx`
- Test: `components/landing/botao-link.test.tsx`, `components/landing/entrada.test.tsx`, `components/landing/revelar.test.tsx`, `components/landing/moldura-de-tela.test.tsx`

**Interfaces:**
- Produces:
  - `BotaoLink({ href: string; variante?: "primario" | "secundario-escuro" | "secundario-claro"; tamanho?: "md" | "lg"; className?: string; children: ReactNode })`
  - `Entrada({ indice: number; className?: string; children: ReactNode })`
  - `Revelar({ atraso?: number; className?: string; children: ReactNode })`
  - `MolduraDeTela({ src: StaticImageData; alt: string; prioridade?: boolean })`
  - `FaixasDeCanto({ posicao?: "fixed" | "absolute" })` — o padrão `"fixed"` mantém o login e a redefinição de senha como estão.

- [ ] **Step 1: Escrever os testes que falham**

Create `components/landing/botao-link.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { BotaoLink } from "./botao-link"

describe("BotaoLink", () => {
  it("é um link com o destino e o rótulo dados", () => {
    render(<BotaoLink href="/login">Acessar o GeraDocs</BotaoLink>)
    expect(screen.getByRole("link", { name: "Acessar o GeraDocs" })).toHaveAttribute("href", "/login")
  })

  it("aceita mailto", () => {
    render(<BotaoLink href="mailto:contato@govpro.com.br?subject=x">Pedir</BotaoLink>)
    expect(screen.getByRole("link", { name: "Pedir" })).toHaveAttribute(
      "href",
      "mailto:contato@govpro.com.br?subject=x",
    )
  })

  it("tem alvo de toque de 44px no tamanho padrão e 48px no grande", () => {
    const { rerender } = render(<BotaoLink href="/a">A</BotaoLink>)
    expect(screen.getByRole("link")).toHaveClass("h-11")
    rerender(
      <BotaoLink href="/a" tamanho="lg">
        A
      </BotaoLink>,
    )
    expect(screen.getByRole("link")).toHaveClass("h-12")
  })

  it("a variante primária usa a cor de ação", () => {
    render(<BotaoLink href="/a">A</BotaoLink>)
    expect(screen.getByRole("link")).toHaveClass("bg-royal")
  })
})
```

Create `components/landing/entrada.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Entrada } from "./entrada"

describe("Entrada", () => {
  it("escalona o atraso em 100ms por índice", () => {
    render(
      <>
        <Entrada indice={0}>a</Entrada>
        <Entrada indice={3}>b</Entrada>
      </>,
    )
    expect(screen.getByText("a")).toHaveStyle({ animationDelay: "0ms" })
    expect(screen.getByText("b")).toHaveStyle({ animationDelay: "300ms" })
  })

  it("usa a animação de entrada da landing", () => {
    render(<Entrada indice={1}>c</Entrada>)
    expect(screen.getByText("c")).toHaveClass("animate-landing-entrada")
  })
})
```

Create `components/landing/revelar.test.tsx`:
```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Revelar } from "./revelar"

class ObservadorFalso {
  static instancias: ObservadorFalso[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = () => []
  constructor(public aoObservar: IntersectionObserverCallback) {
    ObservadorFalso.instancias.push(this)
  }
  disparar(isIntersecting: boolean) {
    this.aoObservar([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

/** O elemento que o Revelar renderiza: o pai do filho passado. */
const elemento = () => screen.getByText("conteúdo").parentElement as HTMLElement

/** Posiciona o elemento abaixo da dobra (a janela do jsdom tem 768px). */
const abaixoDaDobra = () =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 2000 } as DOMRect)

beforeEach(() => {
  ObservadorFalso.instancias = []
  vi.stubGlobal("IntersectionObserver", ObservadorFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Revelar", () => {
  it("sem IntersectionObserver o conteúdo fica visível, sem estado escondido", () => {
    vi.unstubAllGlobals()
    vi.stubGlobal("IntersectionObserver", undefined)
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
  })

  it("com movimento reduzido nada é escondido", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
    expect(ObservadorFalso.instancias).toHaveLength(0)
  })

  it("elemento que já está na tela fica visível e não é observado", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect)
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
    expect(ObservadorFalso.instancias).toHaveLength(0)
  })

  it("elemento abaixo da dobra começa escondido e é revelado uma vez ao entrar na tela", () => {
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).toHaveAttribute("data-estado", "oculto")
    const [observador] = ObservadorFalso.instancias
    expect(observador?.observe).toHaveBeenCalledWith(elemento())

    observador?.disparar(false)
    expect(elemento()).toHaveAttribute("data-estado", "oculto")

    observador?.disparar(true)
    expect(elemento()).toHaveAttribute("data-estado", "visivel")
    expect(observador?.disconnect).toHaveBeenCalled()
  })

  it("aplica o atraso e a classe dadas", () => {
    render(
      <Revelar atraso={200} className="p-4">
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).toHaveStyle({ transitionDelay: "200ms" })
    expect(elemento()).toHaveClass("p-4")
  })
})
```

Create `components/landing/moldura-de-tela.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { MolduraDeTela } from "./moldura-de-tela"

const captura = { src: "/landing/editor-etp.png", width: 1440, height: 900 }

describe("MolduraDeTela", () => {
  it("mostra a captura com o texto alternativo dado", () => {
    render(<MolduraDeTela src={captura} alt="Editor de seção do ETP" />)
    expect(screen.getByRole("img", { name: "Editor de seção do ETP" })).toBeInTheDocument()
  })

  it("a barra superior é decorativa", () => {
    const { container } = render(<MolduraDeTela src={captura} alt="x" />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/landing`
Expected: FAIL — `Failed to resolve import` para os quatro componentes.

- [ ] **Step 3: Implementar `FaixasDeCanto` com `posicao`**

Em `components/shared/marca.tsx`, substituir a função `FaixasDeCanto` inteira (a partir do comentário `/** As faixas diagonais …`) por:
```tsx
/**
 * As faixas diagonais dos cantos, as do papel timbrado, em versão para o fundo
 * escuro. Decorativas: sem clique e fora da leitura.
 *
 * `fixed` (padrão) prende as faixas à janela, como nas telas de acesso. `absolute`
 * as prende ao bloco `relative` mais próximo — é o que a landing usa no hero, para
 * que elas não fiquem por cima das seções claras ao rolar.
 */
export function FaixasDeCanto({ posicao = "fixed" }: { posicao?: "fixed" | "absolute" }) {
  const canto = (
    <svg viewBox="0 0 100 100" className="size-full" focusable="false">
      <path className="fill-marca-faceta-clara/10" d="M28 0H52L100 48V72Z" />
      <path className="fill-marca-verde" d="M53.5 0H55.5L100 44.5V46.5Z" />
      <path className="fill-marca-amarelo" d="M57.5 0H59.5L100 40.5V42.5Z" />
      <path className="fill-marca-azul/70" d="M61.5 0H74L100 26V38.5Z" />
      <path className="fill-marca-azul" d="M74 0H100V26Z" />
    </svg>
  )
  const modo = posicao === "fixed" ? "fixed" : "absolute"
  return (
    <>
      <div className={`pointer-events-none ${modo} top-0 right-0 size-36 sm:size-52`} aria-hidden>
        {canto}
      </div>
      <div className={`pointer-events-none ${modo} bottom-0 left-0 size-36 rotate-180 sm:size-52`} aria-hidden>
        {canto}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Implementar os quatro componentes**

Create `components/landing/botao-link.tsx`:
```tsx
import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Link com a aparência de botão. O `Button` do DS é um `<button>` com `onClick`,
 * e a landing precisa de âncoras de verdade: o pedido de demonstração é um
 * `mailto:` e "Acessar" é uma navegação. Os alvos têm 44px (md) e 48px (lg).
 */
const TAMANHOS = {
  md: "h-11 px-5",
  lg: "h-12 px-6",
} as const

const VARIANTES = {
  primario: "bg-royal text-surface hover:bg-royal-hover",
  "secundario-escuro": "border border-on-dark-20 text-on-dark hover:bg-on-dark-fill-hover",
  "secundario-claro": "border border-border bg-surface text-text-1 hover:bg-ice",
} as const

export function BotaoLink({
  href,
  variante = "primario",
  tamanho = "md",
  className = "",
  children,
}: {
  href: string
  variante?: keyof typeof VARIANTES
  tamanho?: keyof typeof TAMANHOS
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-body text-landing-body font-semibold whitespace-nowrap no-underline transition-[background-color,transform] duration-150 ease-out active:scale-96 ${TAMANHOS[tamanho]} ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </Link>
  )
}
```

Create `components/landing/entrada.tsx`:
```tsx
import type { ReactNode } from "react"

/**
 * Entrada escalonada do hero (§107), feita só com CSS: o elemento já nasce com o
 * estado inicial da animação (`both`) e não depende de JavaScript nem de
 * observador — não atrasa o LCP e aparece mesmo se o script falhar.
 * 100ms entre um elemento e o seguinte.
 */
export function Entrada({
  indice,
  className = "",
  children,
}: {
  indice: number
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`animate-landing-entrada ${className}`} style={{ animationDelay: `${indice * 100}ms` }}>
      {children}
    </div>
  )
}
```

Create `components/landing/revelar.tsx`:
```tsx
"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Revela o bloco uma vez, ao entrar na tela (§107).
 *
 * O estado escondido é aplicado aqui, depois da montagem, e só em elemento que
 * está abaixo da dobra: sem JavaScript, ou com movimento reduzido, nada fica
 * escondido, e o que já está à vista no carregamento não pisca. O estado vai no
 * atributo `data-estado`, escrito direto no elemento — não há estado do React,
 * portanto nenhuma renderização extra.
 */
export function Revelar({
  atraso = 0,
  className = "",
  children,
}: {
  atraso?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    if (elemento.getBoundingClientRect().top < window.innerHeight) return

    elemento.dataset.estado = "oculto"
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((entrada) => entrada.isIntersecting)) return
        elemento.dataset.estado = "visivel"
        observador.disconnect()
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${atraso}ms` }}
      className={`data-[estado]:transition-[opacity,transform,filter] data-[estado]:duration-300 data-[estado]:ease-landing data-[estado=oculto]:translate-y-3 data-[estado=oculto]:opacity-0 data-[estado=oculto]:blur-xs ${className}`}
    >
      {children}
    </div>
  )
}
```

Create `components/landing/moldura-de-tela.tsx`:
```tsx
import Image, { type StaticImageData } from "next/image"

/**
 * Moldura de captura de tela, feita em CSS: borda, raio de 12px e uma barra
 * superior neutra, sem sombra — o sistema é flat. A captura é uma imagem de
 * verdade (`<img>`), com texto alternativo, e não um desenho em HTML.
 */
export function MolduraDeTela({
  src,
  alt,
  prioridade = false,
}: {
  src: StaticImageData
  alt: string
  prioridade?: boolean
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex h-8 items-center gap-1.5 border-b border-border bg-border-soft px-3" aria-hidden>
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
      </div>
      <Image src={src} alt={alt} priority={prioridade} className="block h-auto w-full" />
    </figure>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run components/landing`
Expected: PASS (todos os testes das quatro peças).

- [ ] **Step 6: Garantir que o login não mudou**

Run: `npx vitest run "app/(auth)"`
Expected: PASS (o padrão de `posicao` é `"fixed"`).

- [ ] **Step 7: Commit**

```bash
git add components/shared/marca.tsx components/landing/botao-link.tsx components/landing/botao-link.test.tsx components/landing/entrada.tsx components/landing/entrada.test.tsx components/landing/revelar.tsx components/landing/revelar.test.tsx components/landing/moldura-de-tela.tsx components/landing/moldura-de-tela.test.tsx
git commit -m "feat(landing): componentes de base (botão-link, entrada, revelar, moldura)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cabeçalho e rodapé

**Files:**
- Create: `components/landing/cabecalho.tsx`, `components/landing/rodape.tsx`
- Test: `components/landing/cabecalho.test.tsx`, `components/landing/rodape.test.tsx`

**Interfaces:**
- Consumes: `BotaoLink` (Task 4); `CONTEUDO`, `HREF_DEMONSTRACAO`, `HREF_ENTRAR`, `EMAIL_CONTATO` (Task 3); `IconMenu`, `IconX` de `@/components/ui/icons`; `FaixaDaMarca` de `@/components/shared/marca`; logos `@/public/geradocs-logo-white.svg` e `@/public/govpro-logo-white.svg`.
- Produces: `Cabecalho()` (client) e `Rodape()` (servidor), sem props.

- [ ] **Step 1: Escrever os testes que falham**

Create `components/landing/cabecalho.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { fireEvent, render, screen, userEvent } from "@/lib/teste/renderizar"

import { Cabecalho } from "./cabecalho"

/**
 * Termina a animação do menu. O jsdom não tem `AnimationEvent`, e nesse caso o React
 * escuta o nome com prefixo (`webkitAnimationEnd`) em vez de `animationend`;
 * `fireEvent.animationEnd` sozinho não chegaria ao `onAnimationEnd`. Dispara os dois
 * nomes: o tratador é idempotente, e o que sobrar no elemento já removido é inócuo.
 */
function terminarAnimacao(elemento: HTMLElement) {
  fireEvent(elemento, new Event("animationend", { bubbles: true }))
  fireEvent(elemento, new Event("webkitAnimationEnd", { bubbles: true }))
}

describe("Cabecalho", () => {
  it("traz as âncoras das seções e os dois logos", () => {
    render(<Cabecalho />)
    const nav = screen.getByRole("navigation", { name: "Seções da página" })
    expect(nav.querySelector('a[href="#problema"]')).toHaveTextContent("O Problema")
    expect(nav.querySelector('a[href="#geradocs"]')).toHaveTextContent("GeraDocs")
    expect(nav.querySelector('a[href="#ia"]')).toHaveTextContent("IA")
    expect(nav.querySelector('a[href="#confianca"]')).toHaveTextContent("Confiança")
    expect(screen.getByRole("img", { name: "GeraDocs" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Uma solução GovPro" })).toBeInTheDocument()
  })

  it("o menu móvel abre e fecha pelo botão", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    const botao = screen.getByRole("button", { name: "Abrir menu" })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    expect(document.getElementById("menu-landing")).toBeNull()

    await usuario.click(botao)
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true")
    const menu = document.getElementById("menu-landing") as HTMLElement
    expect(menu).not.toBeNull()
    expect(menu.querySelector('a[href="/login"]')).toHaveTextContent("Acessar o GeraDocs")
    expect(menu.querySelector('a[href^="mailto:contato@govpro.com.br"]')).toHaveTextContent("Solicitar Demonstração")

    await usuario.click(screen.getByRole("button", { name: "Fechar menu" }))
    // Fechar toca a animação de saída; o menu só sai ao terminar.
    expect(document.getElementById("menu-landing")).not.toBeNull()
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("Escape fecha o menu", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    await usuario.click(screen.getByRole("button", { name: "Abrir menu" }))
    await usuario.keyboard("{Escape}")
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("escolher uma âncora no menu fecha o menu", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    await usuario.click(screen.getByRole("button", { name: "Abrir menu" }))
    const menu = document.getElementById("menu-landing") as HTMLElement
    await usuario.click(menu.querySelector('a[href="#ia"]') as HTMLElement)
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("a borda inferior aparece depois de rolar", () => {
    render(<Cabecalho />)
    const cabecalho = screen.getByRole("banner")
    expect(cabecalho).toHaveClass("border-transparent")

    Object.defineProperty(window, "scrollY", { value: 24, configurable: true })
    fireEvent.scroll(window)
    expect(cabecalho).toHaveClass("border-on-dark-border")

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
    fireEvent.scroll(window)
    expect(cabecalho).toHaveClass("border-transparent")
  })
})
```

Create `components/landing/rodape.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Rodape } from "./rodape"

describe("Rodape", () => {
  it("traz o endosso, o contato e o copyright da GovPro", () => {
    render(<Rodape />)
    expect(screen.getByText("GeraDocs é uma solução")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "GovPro" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "contato@govpro.com.br" })).toHaveAttribute(
      "href",
      "mailto:contato@govpro.com.br",
    )
    expect(screen.getByText("© 2026 GovPro. Todos os direitos reservados.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/landing/cabecalho.test.tsx components/landing/rodape.test.tsx`
Expected: FAIL — `Failed to resolve import`.

- [ ] **Step 3: Implementar o cabeçalho**

Create `components/landing/cabecalho.tsx`:
```tsx
"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import geradocsLogo from "@/public/geradocs-logo-white.svg"
import govproLogo from "@/public/govpro-logo-white.svg"

import { BotaoLink } from "@/components/landing/botao-link"
import { IconMenu, IconX } from "@/components/ui/icons"
import { CONTEUDO, HREF_DEMONSTRACAO, HREF_ENTRAR } from "@/lib/landing/conteudo"

type Menu = "fechado" | "aberto" | "fechando"

/**
 * Cabeçalho fixo da landing. No desktop (lg), âncoras e o pedido de demonstração;
 * abaixo disso, um menu que abre em 250ms e fecha em 150ms (§107). A borda
 * inferior só aparece depois de rolar. Sobre o navy, o foco é `electric` (`.on-dark`).
 */
export function Cabecalho() {
  const [menu, setMenu] = useState<Menu>("fechado")
  const [rolou, setRolou] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 0)
    window.addEventListener("scroll", aoRolar, { passive: true })
    return () => window.removeEventListener("scroll", aoRolar)
  }, [])

  useEffect(() => {
    if (menu !== "aberto") return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenu("fechando")
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [menu])

  const aberto = menu === "aberto"
  const fechar = () => setMenu("fechando")

  return (
    <header
      className={`on-dark sticky top-0 z-30 border-b bg-navy transition-colors duration-200 ease-linear ${
        rolou ? "border-on-dark-border" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-landing items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image src={geradocsLogo} alt="GeraDocs" width={113} height={24} className="h-6 w-auto" />
          <span className="h-4 w-px bg-on-dark-border" aria-hidden />
          <Image src={govproLogo} alt="Uma solução GovPro" width={60} height={14} className="h-3.5 w-auto" />
        </div>

        <nav aria-label="Seções da página" className="hidden items-center gap-6 lg:flex">
          {CONTEUDO.navegacao.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex h-11 items-center text-md font-medium text-on-dark-65 no-underline hover:text-on-dark"
            >
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="hidden xl:block">
            <BotaoLink href={HREF_ENTRAR} variante="secundario-escuro">
              {CONTEUDO.hero.ctaSecundario}
            </BotaoLink>
          </div>
          <BotaoLink href={HREF_DEMONSTRACAO}>{CONTEUDO.hero.ctaPrimario}</BotaoLink>
        </div>

        <button
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-controls={menu === "fechado" ? undefined : "menu-landing"}
          onClick={() => (aberto ? fechar() : setMenu("aberto"))}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-on-dark lg:hidden"
        >
          {aberto ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </div>

      {menu !== "fechado" && (
        <div
          id="menu-landing"
          onAnimationEnd={() => menu === "fechando" && setMenu("fechado")}
          className={`absolute inset-x-0 top-full origin-top border-b border-on-dark-border bg-navy px-4 pb-5 sm:px-6 lg:hidden ${
            aberto ? "animate-landing-menu-abre" : "animate-landing-menu-fecha"
          }`}
        >
          <nav aria-label="Seções da página (menu)" className="flex flex-col">
            {CONTEUDO.navegacao.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={fechar}
                className="inline-flex h-12 items-center text-landing-body font-medium text-on-dark-65 no-underline hover:text-on-dark"
              >
                {item.rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-3">
            <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg">
              {CONTEUDO.hero.ctaPrimario}
            </BotaoLink>
            <BotaoLink href={HREF_ENTRAR} tamanho="lg" variante="secundario-escuro">
              {CONTEUDO.hero.ctaSecundario}
            </BotaoLink>
          </div>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 4: Implementar o rodapé**

Create `components/landing/rodape.tsx`:
```tsx
import Image from "next/image"

import govproLogo from "@/public/govpro-logo-white.svg"

import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTEUDO, EMAIL_CONTATO } from "@/lib/landing/conteudo"

/**
 * Rodapé da landing. Texto sobre navy só nos tons que passam de 4,5:1
 * (`on-dark-55` ou mais claro).
 */
export function Rodape() {
  const { rodape } = CONTEUDO
  return (
    <footer className="on-dark border-t border-on-dark-border bg-navy">
      <div className="mx-auto flex max-w-landing flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <FaixaDaMarca className="w-64" />
        <div className="mt-3 flex items-center gap-2 text-md text-on-dark-65">
          {rodape.endosso}
          <Image src={govproLogo} alt="GovPro" width={86} height={20} className="h-5 w-auto" />
        </div>
        <div className="text-sm text-on-dark-55">
          {rodape.contato}{" "}
          <a href={`mailto:${EMAIL_CONTATO}`} className="font-medium text-on-dark-65 no-underline hover:text-electric">
            {EMAIL_CONTATO}
          </a>
        </div>
        <div className="text-sm text-on-dark-55">{rodape.copyright}</div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run components/landing/cabecalho.test.tsx components/landing/rodape.test.tsx`
Expected: PASS. Se "Fechar menu" falhar por causa do `aria-controls`, conferir que ele só aparece com o menu aberto/fechando.

- [ ] **Step 6: Lint e tipos dos arquivos novos**

Run: `npm run lint && npm run lint:ds && npm run typecheck`
Expected: sem erro. Se o lint reclamar de `setState` em efeito, lembrar: aqui só há `setState` dentro de **ouvintes de evento** (`aoRolar`, `aoTeclar`), o que é permitido; nunca chamar `setState` direto no corpo do `useEffect`.

- [ ] **Step 7: Commit**

```bash
git add components/landing/cabecalho.tsx components/landing/cabecalho.test.tsx components/landing/rodape.tsx components/landing/rodape.test.tsx
git commit -m "feat(landing): cabeçalho fixo com menu móvel e rodapé

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Capturas de tela com dados fictícios

**Files:**
- Create: `e2e/capturas-landing.spec.ts`
- Create (gerados): `public/landing/editor-etp.png`, `public/landing/proposta-ia.png`

**Interfaces:**
- Consumes: `comSessao`, `comProcessoEDocumento`, `processo`, `rota`, `sessaoServidor` de `e2e/api.ts`.
- Produces: os dois PNGs, importados nas Tasks 7 e 8 como `@/public/landing/editor-etp.png` e `@/public/landing/proposta-ia.png`.

Regra de LGPD e de imagem: as capturas usam só os dados fictícios do `e2e/api.ts`, e o nome do órgão é trocado por "Prefeitura de Exemplo" — o nome real de um município numa página pública sugeriria um endosso que não existe.

- [ ] **Step 1: Escrever o gerador de capturas**

Create `e2e/capturas-landing.spec.ts`:
```ts
import { expect, test, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota, sessaoServidor } from "./api"

/**
 * Gera as capturas da landing a partir do aplicativo real, com os dados fictícios
 * dos dublês de `e2e/api.ts`. Não é teste: só roda quando pedido —
 *
 *     CAPTURAS_LANDING=1 npx playwright test e2e/capturas-landing.spec.ts
 *
 * O órgão da sessão é trocado por um nome genérico: o fixture usa um município
 * real, e uma página pública com o nome dele sugeriria um endosso que não existe.
 */
test.skip(!process.env.CAPTURAS_LANDING, "Só roda quando se pedem as capturas da landing.")
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })

const API = "**/api/v1"
const ROTA_DO_ETP = `/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`

const sessaoDeExemplo = {
  ...sessaoServidor,
  organization: { ...sessaoServidor.organization, name: "Prefeitura de Exemplo" },
}

// O indicador de desenvolvimento do Next (a bolinha "N") não pode ir para a imagem pública.
const SEM_INDICADOR_DO_NEXT = "nextjs-portal { display: none !important; }"

/** Espera o botão da IA sair da transição de habilitado/desabilitado antes de fotografar. */
async function esperarOBotaoDaIa(page: Page) {
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  await page.waitForTimeout(600)
}

const NECESSIDADE =
  "A Secretaria de Administração precisa repor o material de expediente das unidades, hoje com estoque abaixo do consumo mensal."

test("captura o editor do ETP", async ({ page }) => {
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.goto(rota(ROTA_DO_ETP))
  await page.addStyleTag({ content: SEM_INDICADOR_DO_NEXT })

  const campo = page.getByLabel("Descrição da Necessidade")
  await expect(campo).toBeVisible()
  await campo.fill(NECESSIDADE)
  await esperarOBotaoDaIa(page)
  await page.screenshot({ path: "public/landing/editor-etp.png" })
})

test("captura a proposta da IA", async ({ page }) => {
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  // Na seção 1 do ETP o botão "Gerar com IA" chama `/sections/1/ai-draft` (gerarRascunhoDaNecessidadeEtp).
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft`, (r) =>
    r.fulfill({
      json: {
        documentType: "ETP",
        sectionCode: "1",
        content: NECESSIDADE,
        evidence: [],
        missingFacts: [],
        warnings: [],
      },
    }),
  )

  await page.goto(rota(ROTA_DO_ETP))
  await page.addStyleTag({ content: SEM_INDICADOR_DO_NEXT })
  await esperarOBotaoDaIa(page)
  await page.getByRole("button", { name: "Gerar com IA" }).click()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(NECESSIDADE)
  await esperarOBotaoDaIa(page)
  await page.screenshot({ path: "public/landing/proposta-ia.png" })
})
```

- [ ] **Step 2: Garantir que o Chromium do Playwright existe**

Run: `npx playwright install chromium`
Expected: baixa o navegador ou informa que já está instalado.

- [ ] **Step 3: Gerar as capturas**

Run: `mkdir -p public/landing && CAPTURAS_LANDING=1 npx playwright test e2e/capturas-landing.spec.ts`
Expected: 2 passed, e os dois arquivos aparecem em `public/landing/`. (Sem a variável, o arquivo é pulado: conferir com `npx playwright test e2e/capturas-landing.spec.ts` → 2 skipped.)

- [ ] **Step 4: Olhar as imagens (obrigatório)**

Abrir `public/landing/editor-etp.png` e `public/landing/proposta-ia.png` com a ferramenta Read e conferir: (a) aparece "Prefeitura de Exemplo" e **não** "Ecoporanga"; (b) nenhum CPF, e-mail ou nome real; (c) o editor está legível; (d) na proposta, o texto da IA está no campo. Se algo estiver errado, ajustar o gerador e repetir o Step 3. (Ajustes já incorporados ao código acima: na seção 1 do ETP o botão chama `/sections/1/ai-draft`, não `/ai-draft-with-sources`; `ai/status` também no editor; indicador "N" do Next escondido; espera o botão da IA assentar. O nome "Prefeitura de Exemplo" cabe inteiro na barra lateral; a foto de perfil é forçada a 404 no gerador, para o app mostrar as iniciais em vez de imagem quebrada; a captura da proposta usa viewport 1440x1180 e espera o aviso "Rascunho gerado." sumir.)

- [ ] **Step 5: Commit**

```bash
git add e2e/capturas-landing.spec.ts public/landing/editor-etp.png public/landing/proposta-ia.png
git commit -m "feat(landing): capturas do editor e da proposta da IA, com dados fictícios

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Seções Hero, O Problema e O GeraDocs e o Fluxo

**Files:**
- Create: `components/landing/hero.tsx`, `components/landing/problema.tsx`, `components/landing/fluxo-geradocs.tsx`
- Test: `components/landing/hero.test.tsx`, `components/landing/problema.test.tsx`, `components/landing/fluxo-geradocs.test.tsx`

**Interfaces:**
- Consumes: `BotaoLink`, `Entrada`, `Revelar`, `MolduraDeTela`, `FaixasDeCanto({ posicao })` (Task 4); `FaixaDaMarca`; `CONTEUDO`, `DOCUMENTOS_DO_FLUXO`, `HREF_DEMONSTRACAO`, `HREF_ENTRAR` (Task 3); `@/public/landing/editor-etp.png` (Task 6).
- Produces: `Hero()`, `Problema()`, `FluxoGeradocs()` — sem props.

- [ ] **Step 1: Escrever os testes que falham**

Create `components/landing/hero.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Hero } from "./hero"

// No vitest o import de .png vira só uma string; o next/image exige width/height.
vi.mock("@/public/landing/editor-etp.png", () => ({
  default: { src: "/editor-etp.png", width: 1440, height: 900 },
}))

describe("Hero", () => {
  it("traz o slogan, o título e o apoio", () => {
    render(<Hero />)
    expect(screen.getByText("Contratações públicas inteligentes")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 1, name: "Documentos da Contratação Pública, Conforme a Lei 14.133/21" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/O GeraDocs, solução da GovPro/)).toBeInTheDocument()
  })

  it("tem um CTA primário de demonstração e um secundário para entrar", () => {
    render(<Hero />)
    expect(screen.getByRole("link", { name: "Solicitar Demonstração →" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:contato@govpro\.com\.br\?subject=/),
    )
    expect(screen.getByRole("link", { name: "Acessar o GeraDocs" })).toHaveAttribute("href", "/login")
  })

  it("mostra a captura do editor com texto alternativo", () => {
    render(<Hero />)
    expect(screen.getByRole("img", { name: /Editor de seção do Estudo Técnico Preliminar/ })).toBeInTheDocument()
  })
})
```

Create `components/landing/problema.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Problema } from "./problema"

describe("Problema", () => {
  it("é a seção #problema, com título e três pontos", () => {
    const { container } = render(<Problema />)
    expect(container.querySelector("section#problema")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Do Word e dos Modelos Soltos para um Fluxo Guiado" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByRole("heading", { level: 3, name: "A Ordem Real da Contratação" })).toBeInTheDocument()
  })
})
```

Create `components/landing/fluxo-geradocs.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen, within } from "@/lib/teste/renderizar"

import { FluxoGeradocs } from "./fluxo-geradocs"

describe("FluxoGeradocs", () => {
  it("é a seção #geradocs, com os seis documentos numerados na ordem do fluxo", () => {
    const { container } = render(<FluxoGeradocs />)
    expect(container.querySelector("section#geradocs")).not.toBeNull()
    const lista = screen.getByRole("list", { name: "Documentos gerados, na ordem do fluxo" })
    const itens = within(lista).getAllByRole("listitem")
    expect(itens).toHaveLength(6)
    expect(itens[0]).toHaveTextContent("01")
    expect(itens[0]).toHaveTextContent("Cotação de Mercado")
    expect(itens[0]).toHaveTextContent("Art. 23, Lei 14.133/21")
    expect(itens[5]).toHaveTextContent("06")
    expect(itens[5]).toHaveTextContent("Minuta de Contrato")
  })

  it("diz que DFD e PCA não são gerados e que a contratação direta troca o Edital", () => {
    render(<FluxoGeradocs />)
    expect(screen.getByText("DFD")).toBeInTheDocument()
    expect(screen.getByText("PCA")).toBeInTheDocument()
    expect(screen.getByText(/nenhum dos dois é gerado/)).toBeInTheDocument()
    expect(screen.getByText(/Aviso de Contratação Direta/)).toBeInTheDocument()
    expect(screen.getByText(/DOCX e PDF, com o timbre da entidade/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/landing/hero.test.tsx components/landing/problema.test.tsx components/landing/fluxo-geradocs.test.tsx`
Expected: FAIL — `Failed to resolve import`.

- [ ] **Step 3: Implementar o hero**

Create `components/landing/hero.tsx`:
```tsx
import editorEtp from "@/public/landing/editor-etp.png"

import { BotaoLink } from "@/components/landing/botao-link"
import { Entrada } from "@/components/landing/entrada"
import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { FaixaDaMarca, FaixasDeCanto } from "@/components/shared/marca"
import { CONTEUDO, HREF_DEMONSTRACAO, HREF_ENTRAR } from "@/lib/landing/conteudo"

/**
 * Hero em navy. Entrada escalonada por CSS (`Entrada`), sem observador: a captura
 * é o maior elemento da dobra e não pode esperar JavaScript (LCP). Os efeitos
 * decorativos têm `pointer-events-none`.
 */
export function Hero() {
  const { hero } = CONTEUDO
  return (
    <section className="on-dark relative overflow-hidden gradient-hero">
      <div
        className="pointer-events-none absolute top-[-18%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-royal/10 blur-3xl"
        aria-hidden
      />
      <FaixasDeCanto posicao="absolute" />

      <div className="relative z-10 mx-auto grid max-w-landing items-center gap-10 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-start gap-6">
          <Entrada indice={0}>
            <p className="m-0 font-marca text-2xs font-semibold tracking-slogan text-on-dark-65 uppercase">
              {hero.eyebrow}
            </p>
            <FaixaDaMarca className="mt-3 w-64" />
          </Entrada>
          <Entrada indice={1}>
            <h1 className="m-0 font-display text-landing-h1 font-extrabold text-balance text-on-dark">{hero.titulo}</h1>
          </Entrada>
          <Entrada indice={2}>
            <p className="m-0 max-w-xl text-landing-lead text-pretty text-on-dark-65">{hero.apoio}</p>
          </Entrada>
          <Entrada indice={3}>
            <div className="flex flex-wrap gap-3">
              <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg">
                {hero.ctaPrimario}
              </BotaoLink>
              <BotaoLink href={HREF_ENTRAR} tamanho="lg" variante="secundario-escuro">
                {hero.ctaSecundario}
              </BotaoLink>
            </div>
          </Entrada>
        </div>

        <Entrada indice={4}>
          <MolduraDeTela src={editorEtp} alt={hero.altCaptura} prioridade />
        </Entrada>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar "O Problema"**

Create `components/landing/problema.tsx`:
```tsx
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Três cards sobre o que o fluxo guiado resolve. `scroll-mt-20` compensa o cabeçalho fixo (64px). */
export function Problema() {
  const { problema } = CONTEUDO
  return (
    <section id={problema.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {problema.titulo}
          </h2>
        </Revelar>
        <ul className="m-0 mt-10 grid list-none gap-4 p-0 md:grid-cols-3">
          {problema.itens.map((item, indice) => (
            <li key={item.titulo}>
              <Revelar atraso={indice * 100} className="h-full rounded-card border border-border bg-surface p-6">
                <h3 className="m-0 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{item.texto}</p>
              </Revelar>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implementar "O GeraDocs e o Fluxo"**

Create `components/landing/fluxo-geradocs.tsx`:
```tsx
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO, DOCUMENTOS_DO_FLUXO } from "@/lib/landing/conteudo"

/**
 * Os seis documentos, na ordem do catálogo, cada um com o acento `doc-*` do
 * tipo. A ordem é dita pelo número do cartão (e pela lista ordenada), sem
 * conectores desenhados. DFD e PCA aparecem à parte, tracejados: entram no
 * processo, mas não são gerados.
 */
export function FluxoGeradocs() {
  const { fluxo } = CONTEUDO
  return (
    <section id={fluxo.id} className="scroll-mt-20 bg-ice py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {fluxo.titulo}
          </h2>
          <p className="m-0 mt-4 max-w-2xl text-landing-lead text-pretty text-text-3">{fluxo.intro}</p>
        </Revelar>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {fluxo.insumos.map((insumo) => (
            <div key={insumo.titulo} className="rounded-card border border-dashed border-border bg-ice p-5">
              <p className="m-0 text-xs font-semibold tracking-caps text-text-3 uppercase">{insumo.rotulo}</p>
              <p className="m-0 mt-1 font-display text-xl font-bold text-text-1">{insumo.titulo}</p>
              <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{insumo.texto}</p>
            </div>
          ))}
        </div>

        <ol
          aria-label="Documentos gerados, na ordem do fluxo"
          className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
        >
          {DOCUMENTOS_DO_FLUXO.map((documento, indice) => (
            <li key={documento.tipo}>
              <Revelar atraso={indice * 100} className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-5">
                <span
                  className={`inline-flex w-fit items-center rounded-sm px-2 py-1 font-mono text-sm font-bold ${documento.chip}`}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <h3 className="m-0 font-display text-xl font-bold text-text-1">{documento.titulo}</h3>
                <p className="m-0 font-mono text-sm text-text-3">{documento.fundamento}</p>
              </Revelar>
            </li>
          ))}
        </ol>

        <p className="m-0 mt-6 max-w-2xl text-landing-body text-pretty text-text-3">{fluxo.notaDireta}</p>
        <p className="m-0 mt-2 max-w-2xl text-landing-body text-pretty text-text-3">{fluxo.exportacao}</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run components/landing/hero.test.tsx components/landing/problema.test.tsx components/landing/fluxo-geradocs.test.tsx`
Expected: PASS.

- [ ] **Step 7: Guarda-corpos, lint e tipos**

Run: `npx vitest run lib/teste/guardrails.test.ts && npm run lint && npm run lint:ds && npm run typecheck`
Expected: sem erro. Se o guarda-corpo de hex acusar um dos arquivos, é uma âncora ou um texto casando com `#[0-9a-f]{3,8}`: renomear.

- [ ] **Step 8: Commit**

```bash
git add components/landing/hero.tsx components/landing/hero.test.tsx components/landing/problema.tsx components/landing/problema.test.tsx components/landing/fluxo-geradocs.tsx components/landing/fluxo-geradocs.test.tsx
git commit -m "feat(landing): seções Hero, O Problema e O GeraDocs e o Fluxo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Seções IA, Confiança, Quem Somos e Demonstração

**Files:**
- Create: `components/landing/ia-sem-travar.tsx`, `components/landing/confianca.tsx`, `components/landing/quem-somos.tsx`, `components/landing/demonstracao.tsx`
- Test: `components/landing/ia-sem-travar.test.tsx`, `components/landing/confianca.test.tsx`, `components/landing/quem-somos.test.tsx`, `components/landing/demonstracao.test.tsx`

**Interfaces:**
- Consumes: `Revelar`, `MolduraDeTela`, `BotaoLink` (Task 4); `CONTEUDO`, `HREF_DEMONSTRACAO`, `IconeDaConfianca` (Task 3); `@/public/landing/proposta-ia.png` (Task 6); ícones `IconClipboardList`, `IconLock`, `IconSettings`, `IconScale`, `IconBuilding` de `@/components/ui/icons`.
- Produces: `IaSemTravar()`, `Confianca()`, `QuemSomos()`, `Demonstracao()` — sem props.

- [ ] **Step 1: Escrever os testes que falham**

Create `components/landing/ia-sem-travar.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { IaSemTravar } from "./ia-sem-travar"

// No vitest um import de .png vira string; o next/image exige width/height.
vi.mock("@/public/landing/proposta-ia.png", () => ({
  default: { src: "/proposta-ia.png", width: 1440, height: 900 },
}))

describe("IaSemTravar", () => {
  it("é a seção #ia, com o título e os quatro pontos", () => {
    const { container } = render(<IaSemTravar />)
    expect(container.querySelector("section#ia")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "A IA Propõe. O Servidor Decide." })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByRole("heading", { level: 3, name: "Orienta, Não Trava" })).toBeInTheDocument()
  })

  it("mostra a captura da proposta com texto alternativo", () => {
    render(<IaSemTravar />)
    expect(screen.getByRole("img", { name: /Proposta de texto gerada pela IA/ })).toBeInTheDocument()
  })
})
```

Create `components/landing/confianca.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Confianca } from "./confianca"

describe("Confianca", () => {
  it("é a seção #confianca, com cinco itens", () => {
    const { container } = render(<Confianca />)
    expect(container.querySelector("section#confianca")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Feito para o Controle da Contratação" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })

  it("cita o fundamento legal literalmente e diz onde ficam protocolo e assinatura", () => {
    render(<Confianca />)
    expect(screen.getByText(/Art\. 75, II, Lei 14\.133\/21/)).toBeInTheDocument()
    expect(screen.getByText(/continuam no sistema de processos da sua entidade/)).toBeInTheDocument()
  })

  it("os ícones são decorativos", () => {
    const { container } = render(<Confianca />)
    expect(container.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThanOrEqual(5)
  })
})
```

Create `components/landing/quem-somos.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { QuemSomos } from "./quem-somos"

describe("QuemSomos", () => {
  it("é a seção #quem-somos e mostra a lacuna de conteúdo de forma visível", () => {
    const { container } = render(<QuemSomos />)
    expect(container.querySelector("section#quem-somos")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Quem Somos" })).toBeInTheDocument()
    const nota = screen.getByRole("note")
    expect(nota).toHaveTextContent("[LACUNA: descrição da GovPro e serviços além do GeraDocs]")
  })
})
```

Create `components/landing/demonstracao.test.tsx`:
```tsx
import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Demonstracao } from "./demonstracao"

describe("Demonstracao", () => {
  it("é a seção #demonstracao, com o botão de pedir demonstração", () => {
    const { container } = render(<Demonstracao />)
    expect(container.querySelector("section#demonstracao")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Veja o GeraDocs no Seu Órgão" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Solicitar Demonstração →" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:contato@govpro\.com\.br\?subject=/),
    )
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/landing/ia-sem-travar.test.tsx components/landing/confianca.test.tsx components/landing/quem-somos.test.tsx components/landing/demonstracao.test.tsx`
Expected: FAIL — `Failed to resolve import`.

- [ ] **Step 3: Implementar "A IA Propõe, Você Decide"**

Create `components/landing/ia-sem-travar.tsx`:
```tsx
import propostaIa from "@/public/landing/proposta-ia.png"

import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Quatro pontos sobre o papel da IA, ao lado da captura da proposta. */
export function IaSemTravar() {
  const { ia } = CONTEUDO
  return (
    <section id={ia.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto grid max-w-landing items-start gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div>
          <Revelar>
            <h2 className="m-0 font-display text-landing-h2 font-extrabold text-balance text-text-1">{ia.titulo}</h2>
          </Revelar>
          <ul className="m-0 mt-8 flex list-none flex-col gap-6 p-0">
            {ia.itens.map((item, indice) => (
              <li key={item.titulo}>
                <Revelar atraso={indice * 100}>
                  <h3 className="m-0 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                  <p className="m-0 mt-1 text-landing-body text-pretty text-text-3">{item.texto}</p>
                </Revelar>
              </li>
            ))}
          </ul>
        </div>
        <Revelar>
          <MolduraDeTela src={propostaIa} alt={ia.altCaptura} />
        </Revelar>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar "Confiança"**

Create `components/landing/confianca.tsx`:
```tsx
import type { ComponentType } from "react"

import { Revelar } from "@/components/landing/revelar"
import { IconBuilding, IconClipboardList, IconLock, IconScale, IconSettings } from "@/components/ui/icons"
import { CONTEUDO, type IconeDaConfianca } from "@/lib/landing/conteudo"

/** Um ícone por item. O `Record` sobre a união garante que nenhum item fique sem ícone. */
const ICONES: Record<IconeDaConfianca, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  auditoria: IconClipboardList,
  lgpd: IconLock,
  teto: IconSettings,
  fundamento: IconScale,
  entidade: IconBuilding,
}

export function Confianca() {
  const { confianca } = CONTEUDO
  return (
    <section id={confianca.id} className="scroll-mt-20 bg-ice py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {confianca.titulo}
          </h2>
        </Revelar>
        <ul className="m-0 mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {confianca.itens.map((item, indice) => {
            const Icone = ICONES[item.icone]
            return (
              <li key={item.titulo}>
                <Revelar atraso={indice * 100} className="h-full rounded-card border border-border bg-surface p-6">
                  <span className="flex size-10 items-center justify-center rounded-md bg-tint-royal-bg text-royal" aria-hidden>
                    <Icone size={20} />
                  </span>
                  <h3 className="m-0 mt-4 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                  <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{item.texto}</p>
                </Revelar>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implementar "Quem Somos" e "Demonstração"**

Create `components/landing/quem-somos.tsx`:
```tsx
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/**
 * A estrutura existe; o texto sobre a GovPro, não: não há fato sobre a empresa no
 * material do produto, e inventá-lo numa página pública seria pior que a lacuna.
 * A lacuna aparece tracejada e legível, para ninguém publicar sem preencher.
 */
export function QuemSomos() {
  const { quemSomos } = CONTEUDO
  return (
    <section id={quemSomos.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 font-display text-landing-h2 font-extrabold text-balance text-text-1">{quemSomos.titulo}</h2>
          <div
            role="note"
            className="mt-6 max-w-2xl rounded-card border-2 border-dashed border-tint-royal-border bg-tint-royal-bg p-6 font-mono text-md text-text-1"
          >
            {quemSomos.lacuna}
          </div>
        </Revelar>
      </div>
    </section>
  )
}
```

Create `components/landing/demonstracao.tsx`:
```tsx
import { BotaoLink } from "@/components/landing/botao-link"
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO, HREF_DEMONSTRACAO } from "@/lib/landing/conteudo"

/** Chamada final, em navy, com o mesmo pedido de demonstração do topo. */
export function Demonstracao() {
  const { demonstracao } = CONTEUDO
  return (
    <section id={demonstracao.id} className="on-dark scroll-mt-20 gradient-hero py-16 lg:py-24">
      <div className="mx-auto flex max-w-landing flex-col items-center px-4 text-center sm:px-6">
        <Revelar className="flex flex-col items-center">
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-on-dark">
            {demonstracao.titulo}
          </h2>
          <p className="m-0 mt-4 max-w-xl text-landing-lead text-pretty text-on-dark-65">{demonstracao.texto}</p>
          <div className="mt-8">
            <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg">
              {demonstracao.cta}
            </BotaoLink>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run components/landing`
Expected: PASS em todos os arquivos de `components/landing/`. Se o teste dos ícones de `Confianca` falhar porque os ícones não levam `aria-hidden` no próprio `<svg>`, **não** mexer em `components/ui/icons`: o teste deve checar o `<span aria-hidden>` que os envolve (`container.querySelectorAll("[aria-hidden='true']")`).

- [ ] **Step 7: Guarda-corpos, lint e tipos**

Run: `npx vitest run lib/teste/guardrails.test.ts && npm run lint && npm run lint:ds && npm run typecheck`
Expected: sem erro.

- [ ] **Step 8: Commit**

```bash
git add components/landing/ia-sem-travar.tsx components/landing/ia-sem-travar.test.tsx components/landing/confianca.tsx components/landing/confianca.test.tsx components/landing/quem-somos.tsx components/landing/quem-somos.test.tsx components/landing/demonstracao.tsx components/landing/demonstracao.test.tsx
git commit -m "feat(landing): seções IA, Confiança, Quem Somos e Demonstração

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: A página `/landing-page`

**Files:**
- Create: `app/landing-page/page.tsx`
- Test: `app/landing-page/page.test.tsx`

**Interfaces:**
- Consumes: `Cabecalho`, `Hero`, `Problema`, `FluxoGeradocs`, `IaSemTravar`, `Confianca`, `QuemSomos`, `Demonstracao`, `Rodape`.
- Produces: `export default function PaginaLanding()` e `export const metadata: Metadata`.

- [ ] **Step 1: Escrever o teste que falha**

Create `app/landing-page/page.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import PaginaLanding, { metadata } from "./page"

// O vitest não processa .png como o Next: sem o mock, next/image reclama de `width`.
vi.mock("@/public/landing/editor-etp.png", () => ({
  default: { src: "/editor-etp.png", width: 1440, height: 900 },
}))
vi.mock("@/public/landing/proposta-ia.png", () => ({
  default: { src: "/proposta-ia.png", width: 1440, height: 900 },
}))

describe("/landing-page", () => {
  it("tem um único h1 e as sete seções, na ordem", () => {
    const { container } = render(<PaginaLanding />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    // O hero é a primeira <section> e não tem id; as demais são as âncoras.
    const ids = Array.from(container.querySelectorAll("main > section"))
      .map((s) => s.id)
      .filter(Boolean)
    expect(ids).toEqual(["problema", "geradocs", "ia", "confianca", "quem-somos", "demonstracao"])
  })

  it("o conteúdo principal é o alvo do link para pular a navegação", () => {
    const { container } = render(<PaginaLanding />)
    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute("href", "#conteudo")
    const principal = container.querySelector("main#conteudo")
    expect(principal).not.toBeNull()
    expect(principal).toHaveAttribute("tabindex", "-1")
  })

  it("não depende da sessão: nenhum botão de sair, nenhuma barra lateral", () => {
    render(<PaginaLanding />)
    expect(screen.queryByRole("button", { name: /sair/i })).toBeNull()
    expect(document.querySelector("aside")).toBeNull()
  })

  it("exporta metadata próprio, sem o sufixo de homologação do aplicativo", () => {
    expect(metadata.title).toEqual({ absolute: "GovPro | GeraDocs — Contratações públicas inteligentes" })
    expect(metadata.description).toContain("Lei 14.133/21")
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run app/landing-page/page.test.tsx`
Expected: FAIL — `Failed to resolve import "./page"`.

- [ ] **Step 3: Implementar a página**

Create `app/landing-page/page.tsx`:
```tsx
import type { Metadata } from "next"

import { Cabecalho } from "@/components/landing/cabecalho"
import { Confianca } from "@/components/landing/confianca"
import { Demonstracao } from "@/components/landing/demonstracao"
import { FluxoGeradocs } from "@/components/landing/fluxo-geradocs"
import { Hero } from "@/components/landing/hero"
import { IaSemTravar } from "@/components/landing/ia-sem-travar"
import { Problema } from "@/components/landing/problema"
import { QuemSomos } from "@/components/landing/quem-somos"
import { Rodape } from "@/components/landing/rodape"

/**
 * Landing da GovPro com o GeraDocs em destaque (§109). Fica fora de `(app)` e de
 * `(auth)`: sem sessão, sem barra lateral, sem chamada à API. Componente de
 * servidor — o HTML é estático e o `metadata` é próprio. `title.absolute` ignora o
 * sufixo "Homologação" do layout raiz, que descreve o aplicativo e não esta página.
 */
export const metadata: Metadata = {
  title: { absolute: "GovPro | GeraDocs — Contratações públicas inteligentes" },
  description:
    "A GovPro apresenta o GeraDocs: plataforma que orienta o servidor e gera, com IA revisável, os documentos da fase preparatória da contratação pública sob a Lei 14.133/21.",
}

export default function PaginaLanding() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-text-1"
      >
        Ir para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Hero />
        <Problema />
        <FluxoGeradocs />
        <IaSemTravar />
        <Confianca />
        <QuemSomos />
        <Demonstracao />
      </main>
      <Rodape />
    </>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run app/landing-page/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Build estático**

Run: `npm run build`
Expected: build conclui; a saída lista `/landing-page` como rota estática (○ Static) e existe `out/landing-page/index.html`. Conferir: `ls out/landing-page/`.

- [ ] **Step 6: Commit**

```bash
git add app/landing-page/page.tsx app/landing-page/page.test.tsx
git commit -m "feat(landing): rota /landing-page com metadata próprio

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: e2e — jornada, movimento e acessibilidade

**Files:**
- Create: `e2e/landing.spec.ts`

**Interfaces:** Consumes `rota`, `semSessao` de `e2e/api.ts`; `AxeBuilder` de `@axe-core/playwright`.

- [ ] **Step 1: Escrever a especificação**

Create `e2e/landing.spec.ts`:
```ts
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { rota, semSessao } from "./api"

/**
 * A landing (§109): estática, sem sessão, sem chamada à API. A varredura de
 * acessibilidade **não** exclui os tokens sobre navy, como faz a do aplicativo —
 * a landing só usa `on-dark`, `-65`, `-60` e `-55`, todos acima de 4,5:1.
 */
const ROTA = "/landing-page"

test("abre sem sessão, sem redirecionar para o login", async ({ page }) => {
  await semSessao(page)
  await page.goto(rota(ROTA))

  await expect(page).toHaveURL(new RegExp(`${ROTA}/?$`))
  await expect(page).toHaveTitle("GovPro | GeraDocs — Contratações públicas inteligentes")
  await expect(
    page.getByRole("heading", { level: 1, name: "Documentos da Contratação Pública, Conforme a Lei 14.133/21" }),
  ).toBeVisible()
})

test("o pedido de demonstração é um mailto com assunto", async ({ page }) => {
  await page.goto(rota(ROTA))
  const cta = page.getByRole("link", { name: "Solicitar Demonstração →" }).first()
  const href = (await cta.getAttribute("href")) ?? ""
  expect(href.startsWith("mailto:contato@govpro.com.br?subject=")).toBe(true)
  await expect(page.getByRole("link", { name: "Acessar o GeraDocs" }).first()).toHaveAttribute("href", /\/login\/?$/)
})

test("as âncoras levam à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(rota(ROTA))
  await page
    .getByRole("navigation", { name: "Seções da página" })
    .getByRole("link", { name: "Confiança" })
    .click()
  await expect(page).toHaveURL(/#confianca$/)
  await expect(page.getByRole("heading", { level: 2, name: "Feito para o Controle da Contratação" })).toBeInViewport()
})

test("o fluxo mostra os seis documentos na ordem", async ({ page }) => {
  await page.goto(rota(ROTA))
  const itens = page.getByRole("list", { name: "Documentos gerados, na ordem do fluxo" }).getByRole("listitem")
  await expect(itens).toHaveCount(6)
  await expect(itens.first()).toContainText("Cotação de Mercado")
  await expect(itens.last()).toContainText("Minuta de Contrato")
})

test("a lacuna de Quem Somos fica visível", async ({ page }) => {
  await page.goto(rota(ROTA))
  await expect(page.getByRole("note")).toContainText("[LACUNA:")
})

test("não rola na horizontal em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(rota(ROTA))
  const estoura = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(estoura).toBe(false)
})

test("o menu móvel abre e leva às âncoras", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(rota(ROTA))
  await page.getByRole("button", { name: "Abrir menu" }).click()
  const menu = page.locator("#menu-landing")
  await expect(menu).toBeVisible()
  await menu.getByRole("link", { name: "IA", exact: true }).click()
  await expect(page).toHaveURL(/#ia$/)
  await expect(menu).toHaveCount(0)
})

test("o link para pular a navegação aparece ao receber foco", async ({ page }) => {
  await page.goto(rota(ROTA))
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused()
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeInViewport()
})

test("ao rolar, tudo que estava escondido é revelado", async ({ page }) => {
  await page.goto(rota(ROTA))
  await expect(page.locator('[data-estado="oculto"]').first()).toBeAttached()
  const altura = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y <= altura; y += 400) {
    await page.evaluate((posicao) => window.scrollTo(0, posicao), y)
    await page.waitForTimeout(60)
  }
  await expect(page.locator('[data-estado="oculto"]')).toHaveCount(0)
})

test.describe("com movimento reduzido", () => {
  // `test.use({ reducedMotion })` não chega ao contexto neste Chromium; emular na página, antes do `goto`.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
  })

  test("nada é escondido", async ({ page }) => {
    await page.goto(rota(ROTA))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator('[data-estado="oculto"]')).toHaveCount(0)
  })

  test("não tem violação grave de acessibilidade, nem de contraste", async ({ page }) => {
    await page.goto(rota(ROTA))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const resultado = await new AxeBuilder({ page }).analyze()
    const graves = resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
    expect(graves.map((v) => ({ regra: v.id, nos: v.nodes.map((n) => n.target) }))).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar**

Run: `npx playwright test e2e/landing.spec.ts`
Expected: todos passam. O servidor de desenvolvimento sobe sozinho (`npm run dev`).

- [ ] **Step 3: Tratar falhas de acessibilidade pela causa, nunca pela exclusão**

Se o axe acusar `color-contrast`: identificar o token (`target` no relatório) e trocar por um mais claro sobre navy (`text-on-dark-65` ou `text-on-dark`) ou por um mais escuro sobre superfície clara (`text-text-3` ou `text-text-1`). **Não** excluir regra nem seletor, e **não** mexer em valor de token do `@theme`. Se acusar `landmark`/`region`, conferir que `Cabecalho` é o `<header>` e `Rodape` o `<footer>` no nível do `<body>`.

- [ ] **Step 4: Rodar também contra o export estático**

Run: `npm run build && E2E_PUBLICADO=1 npx playwright test e2e/landing.spec.ts`
Expected: todos passam servidos como no GitHub Pages (`scripts/servir-publicacao.mjs`). Se algum falhar só aqui, o motivo costuma ser `trailingSlash` na URL esperada: ajustar a expressão regular do teste, não a página.

- [ ] **Step 5: Commit**

```bash
git add e2e/landing.spec.ts
git commit -m "test(landing): jornada, movimento reduzido e acessibilidade da landing

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Documentação, revisão com as skills e verificação final

**Files:**
- Modify: `docs/estrutura.md`, `docs/estilizacao.md`
- Modify: `docs/superpowers/specs/2026-11-19-landing-page-design.md` (dois ajustes de fidelidade, abaixo)

- [ ] **Step 1: Registrar a landing em `docs/estrutura.md`**

Abrir `docs/estrutura.md`, localizar a árvore de pastas (o trecho com `components/ui/` — "Design System LAHHM/GeraDocs portado…") e acrescentar, no mesmo formato e nível de recuo das linhas vizinhas, as entradas:
```
│   ├── landing/                  # Seções, cabeçalho, rodapé e peças de movimento da /landing-page (§109)
```
sob `components/`, e
```
│   ├── landing-page/             # Landing da GovPro com o GeraDocs: estática, sem sessão, sem fetch (§109)
```
sob `app/`, além de uma linha em `lib/`:
```
│   ├── landing/                  # Copy e links da landing, como dados (sem JSX)
```
Depois, na seção que explica as camadas, acrescentar um parágrafo curto: "**`components/landing/`** guarda a landing: cada seção é um componente sem fetch; a copy vem de `lib/landing/conteudo.ts`; a rota é `app/landing-page/`, fora de `(app)` e `(auth)`."

- [ ] **Step 2: Registrar a exceção de estilo em `docs/estilizacao.md`**

Acrescentar ao final do arquivo:
```markdown

## A landing (§107–§109)

A rota `/landing-page` tem escala tipográfica própria (`text-landing-h1`, `text-landing-h2`, `text-landing-lead`, `text-landing-body`), contêiner próprio (`max-w-landing`) e movimento próprio (`animate-landing-entrada`, `animate-landing-menu-*`, `ease-landing`) — todos no `@theme`, e nenhum usado fora dela. Regras: só `transform`, `opacity` e `filter`; nada em loop; texto sobre navy só em `text-on-dark`, `-65`, `-60` ou `-55`; o estado escondido da revelação nunca vem do servidor (sem JavaScript, o conteúdo aparece).
```

- [ ] **Step 3: Ajustar a spec à implementação**

Em `docs/superpowers/specs/2026-11-19-landing-page-design.md`:
1. Na §5, em "Blocos", trocar "fluxo em linha com conectores (grade no mobile)" por "fluxo em grade de seis cartões numerados (01 a 06), sem conectores desenhados — a ordem é dita pelo número e pela lista ordenada".
2. Na §5, em "Layout", trocar "`scroll-padding-block-start` para o cabeçalho fixo" por "`scroll-mt-20` em cada seção com âncora, para o cabeçalho fixo de 64px".

- [ ] **Step 4: Revisão com as skills de design**

Invocar a skill `better-interface` sobre `app/landing-page/` e `components/landing/` (revisão somente leitura). Tratar todo achado **HIGH** e os MEDIUM que couberem sem mudar a spec; cada correção em commit próprio (`fix(landing): …`) com teste ou verificação que a cubra. O que exigir mudança de spec **volta para o usuário**, não é decidido aqui.

- [ ] **Step 5: Verificação final completa**

Run, nesta ordem:
```bash
npm run check
npm run coverage
npm run build
npx playwright test e2e/landing.spec.ts
E2E_PUBLICADO=1 npx playwright test e2e/landing.spec.ts
```
Expected: `check` verde (ESLint, oxlint, `tsc`, vitest); `coverage` sem queda do piso de 100% em `lib/**`; `build` gera `out/landing-page/index.html`; os dois e2e passam. Rodar também a suíte e2e inteira (`npx playwright test`) para provar que nenhuma rota do aplicativo mudou: nenhum teste antigo pode ter ficado vermelho.

- [ ] **Step 6: Conferir o escopo do diff**

Run: `git diff --stat origin/integration/ai-frontend...HEAD`
Expected: só arquivos de `app/landing-page/`, `components/landing/`, `components/shared/marca.tsx`, `lib/landing/`, `e2e/`, `public/landing/`, `app/globals.css` e `docs/`. **Nenhuma** mudança em `(app)`, `(auth)`, `lib/api`, `package.json` ou `package-lock.json`.

- [ ] **Step 7: Commit**

```bash
git add docs/estrutura.md docs/estilizacao.md
git commit -m "docs(landing): estrutura e estilização da landing

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

A spec e este plano ficam fora do commit de código; o dono do produto decide se e onde versioná-los.

- [ ] **Step 8: Entregar para decisão**

Reportar ao usuário: o que foi feito, o resultado real de cada comando do Step 5, e as pendências que **não** são de código — o texto de "Quem Somos" (a lacuna continua visível na página), a confirmação de que o produto pode ser divulgado (hoje em homologação), e a decisão de publicar. **Não** fazer push, PR nem deploy sem pedido explícito.

---

## Auto-revisão

**Cobertura da spec.** §1 escopo → Tasks 7–9. §2 restrições → Global Constraints + Tasks 2, 9 e 11 (Step 6 confere que nada fora do escopo mudou). §3 arquitetura → Mapa de arquivos e Tasks 3–9. §4 conteúdo → Task 3 (copy) e Tasks 7–8 (seções); Quem Somos como lacuna → Task 8. §5 visual → Tasks 2, 4, 7, 8 (tokens, navy/ice, acentos `doc-*`, moldura, ícones do barrel); acessibilidade → Tasks 5, 9, 10. §6 movimento → Tasks 2, 4, 5, 10. §7 ADRs → Task 1. §8 testes → todas as tasks e Task 10; "revisão com `better-*`" → Task 11 Step 4. §9 lacunas → Task 8 e Task 11 Step 8. §10 ordem → Tasks 0–11. Desvios assumidos e registrados na spec (Task 11 Step 3): fluxo sem conectores desenhados e `scroll-mt-20` no lugar de `scroll-padding`.

**Placeholders.** Procurei por "TBD", "TODO", "implementar depois" e "similar à Task N": nenhum. Os dois pontos condicionais (ordem do catálogo na Task 3 Step 4; ícones decorativos na Task 8 Step 6) dizem exatamente qual arquivo ler e o que ajustar.

**Consistência de tipos.** `BotaoLink`, `Entrada`, `Revelar`, `MolduraDeTela` e `FaixasDeCanto` têm as assinaturas da Task 4 usadas sem variação nas Tasks 5, 7 e 8. `CONTEUDO`, `DOCUMENTOS_DO_FLUXO`, `HREF_DEMONSTRACAO`, `HREF_ENTRAR`, `EMAIL_CONTATO` e `IconeDaConfianca` vêm da Task 3 com os mesmos nomes. Ids de seção: `problema`, `geradocs`, `ia`, `confianca`, `quem-somos`, `demonstracao`, `conteudo` — iguais em conteúdo, componentes, `page.test.tsx` e e2e. O `aria-label` da lista de documentos ("Documentos gerados, na ordem do fluxo") é o mesmo no componente, no teste unitário e no e2e. Os botões "Abrir menu"/"Fechar menu" e o `id="menu-landing"` coincidem entre componente, teste unitário e e2e.

**Riscos conhecidos.** (1) O formato exato de `ORDEM_FLUXO` não foi lido: a Task 3 Step 4 trata isso. (2) O fluxo "Gerar com IA" das capturas segue `e2e/orientacao-da-ia.spec.ts`, que passa hoje; se a tela mudar, a Task 6 Step 4 (olhar as imagens) pega. (3) As classes `active:scale-96`, `blur-xs`, `translate-y-3` e `data-[estado]:` são do Tailwind v4: o build da Task 9 Step 6 e o e2e da Task 10 provam que foram geradas.
