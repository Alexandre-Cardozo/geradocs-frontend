# Estrutura do Projeto — GeraDocs Frontend

Este documento é a referência oficial de organização do código. Ele define **o padrão adotado**, explica **a função de cada diretório** e diz **onde colocar código novo**. Toda contribuição deve seguir esta estrutura.

## O padrão adotado

O projeto segue o padrão **"App Router + camadas"**, a convenção dominante em projetos Next.js atuais (é a estrutura que `create-next-app`, a documentação oficial da Vercel e ecossistemas como o shadcn/ui usam):

1. **`app/` define as rotas** — cada pasta é um segmento de URL (roteamento por sistema de arquivos). Aqui vivem apenas páginas e layouts; nada de lógica de negócio.
2. **`components/` define a interface reutilizável** — dividida por papel: primitivos do design system (`ui/`), moldura da aplicação (`layout/`) e apoios compartilhados (`shared/`).
3. **`lib/` define dados e domínio** — tipos, cliente de API, hooks de dados e formatação. Nenhum JSX aqui.

A regra de ouro que amarra as camadas: **páginas consomem componentes e hooks; componentes não conhecem rotas nem API; `lib/` não conhece React** (exceto os hooks de `lib/api/hooks.ts`, que são a ponte oficial entre dados e telas).

## Árvore comentada

```
GeraDocs/
├── app/                          # ROTAS (Next.js App Router) — cada pasta = um segmento de URL
│   ├── layout.tsx                # Layout raiz: fontes (next/font), metadata, Providers
│   ├── globals.css               # Tailwind v4 + @theme (tokens do DS = utilities) + base (focus ring/scrollbar)
│   ├── not-found.tsx             # Página 404
│   ├── (auth)/                   # Route group SEM shell — telas de autenticação
│   │   ├── layout.tsx            # Shell mínimo (sem sidebar/header)
│   │   └── login/page.tsx        # Login CPF + senha .......................... rota  /login
│   └── (app)/                    # Route group do shell autenticado (guarda de sessão + RBAC)
│       ├── layout.tsx            # GuardaSessao + AppShell (sidebar + header)
│       ├── error.tsx             # Error boundary das telas
│       ├── page.tsx              # Dashboard (ou Painel do Sistema p/ admin) . rota  /
│       ├── processos/            # O id do processo é query param (?id=), não segmento — ver §22 de decisions.md
│       │   ├── page.tsx          # Lista de processos ........................ rota  /processos
│       │   ├── novo/page.tsx     # Wizard de novo processo ................... rota  /processos/novo
│       │   ├── detalhe/page.tsx  # Hub do processo (pipeline de documentos) .. rota  /processos/detalhe?id=PROC-2024-089
│       │   ├── dfd/page.tsx      # Verificação do DFD pela IA (insumo, não é doc gerado) . rota  /processos/dfd?id=PROC-2024-089
│       │   ├── documento/page.tsx# Editor de seções — serve os 6 tipos de documento ..... rota  /processos/documento?id=PROC-2024-089&tipo=etp
│       │   └── etp/page.tsx      # Redirect legado → documento?tipo=etp (compat. — ver §14)
│       ├── documentos/page.tsx   # Repositório de documentos gerados ......... rota  /documentos
│       ├── configuracoes/page.tsx# Config da prefeitura (coordenador) ........ rota  /configuracoes
│       ├── perfil/page.tsx       # Meu Perfil (servidor/coordenador) ......... rota  /perfil
│       └── admin/               # Área do administrador geral
│           ├── PainelAdmin.tsx   # Painel do sistema (renderizado por page.tsx quando admin)
│           ├── prefeituras/page.tsx  # CRUD de prefeituras .................... rota  /admin/prefeituras
│           └── servidores/page.tsx   # CRUD de servidores .................... rota  /admin/servidores
│
├── components/                   # INTERFACE REUTILIZÁVEL (sem lógica de negócio, sem fetch)
│   ├── ui/                       # Design System LAHHM/GeraDocs portado para React (primitivos)
│   │   ├── index.ts              # Barrel — IMPORTE SEMPRE DAQUI: import { Button } from "@/components/ui"
│   │   ├── actions.tsx           # Button, Toggle
│   │   ├── forms.tsx             # Input, Textarea, Select, FormField, FileUpload, ChoiceCard, SearchInput,
│   │   │                         #   FilterTabs, Dropdown, MoneyInput, QuantityInput, CheckMark
│   │   ├── feedback.tsx          # StatusBadge, DocPill, Tag, StatCard, ProgressBar, ValidationMsg, InfoBanner
│   │   ├── navigation.tsx        # SectionBlock, StepIndicator
│   │   └── icons.tsx             # Ícones de linha estilo Lucide (zero emoji na interface)
│   ├── layout/                   # Moldura da aplicação (o "esqueleto" comum a todas as telas)
│   │   ├── AppShell.tsx          # Casca responsiva: sidebar fixa no laptop, drawer no celular
│   │   ├── Sidebar.tsx           # Navegação lateral navy 240px com wordmark GeraDocs
│   │   └── Header.tsx            # Barra superior 60px: título da rota, busca, hambúrguer, CTA
│   ├── documentos/               # Componentes de DOMÍNIO dos documentos (não são do DS)
│   │   └── paineis.tsx           # Painéis especiais do editor, acionados por SecaoDocumento.painel:
│   │                             #   PainelATA (adesão a ARP), quantidades e valor (ETP, incisos IV e VI)
│   └── shared/                   # Componentes de apoio usados por várias telas (não são do DS)
│       ├── providers.tsx         # QueryClientProvider (TanStack Query) + Toast global
│       ├── estados.tsx           # LoadingState, SkeletonRows, ErrorState, EmptyState, InlineSpinner
│       └── tabela.tsx            # Th — cabeçalho de tabela padronizado
│
├── lib/                          # DADOS E DOMÍNIO (TypeScript puro; nenhum componente aqui)
│   ├── types.ts                  # Modelo de domínio congelado: Processo, SecaoDocumento, AchadoDFD,
│   │                             #   TransicaoAprovacao, Tenant, papéis, vocabulários de status
│   ├── format.ts                 # Formatação pt-BR: formatBRL, formatData, formatDataHora
│   ├── documentos/               # CATÁLOGO DE DOCUMENTOS — fonte única (ver docs/fluxo-contratacao.md)
│   │   ├── catalogo.ts           # CATALOGO, ORDEM_FLUXO, REGRA_MODALIDADE + helpers (porSlug, ordenar,
│   │   │                         #   pendencias, totalSecoes). Metadados por tipo vivem SÓ aqui.
│   │   ├── secoes.ts             # Estrutura seccional de cada documento, com fundamento legal e hint
│   │   └── index.ts              # Barrel — importe daqui: import { CATALOGO } from "@/lib/documentos"
│   ├── processos/                # Máquina de estados do processo
│   │   └── fluxo.ts              # TRANSICOES (elaboração → encerramento → reabertura)
│   ├── auth/                     # Autenticação e controle de acesso
│   │   ├── cpf.ts               # validaCPF (dígitos), formatCPF, CPFS_DEMO
│   │   └── acesso.ts            # RBAC: rotaPermitida, navPrincipal, navSistema (fonte única)
│   ├── api/
│   │   ├── auth-client.ts        # Transporte HTTP da autenticação, refresh e mapeamento da sessão
│   │   ├── access-client.ts      # Organizações, secretarias e usuários na API real
│   │   ├── procurement-client.ts # Processos na API real
│   │   ├── gerado/v1.d.ts        # Tipos do contrato OpenAPI — NÃO editar à mão (npm run tipos)
│   │   ├── client.ts             # Fachada híbrida: auth real; demais módulos ainda mockados
│   │   └── hooks.ts              # Hooks TanStack Query (useProcessos, useCriarProcesso, ...) —
│   │                             #   ÚNICA porta de entrada de dados para as telas
│   ├── mocks/
│   │   └── fixtures.ts           # Dados de exemplo — PROIBIDO importar em componentes/páginas
│   └── teste/                    # setup do Vitest, MSW, fixtures de API e guarda-corpos executáveis
│
├── design_system/                # Design System fonte (LAHHM · GeraDocs) — NORMATIVO, não editável
│   ├── readme.md                 # Regras visuais (leia antes de qualquer tarefa de UI)
│   ├── tokens/                   # colors.css, typography.css, layout.css (origem dos tokens)
│   └── components/*/*.prompt.md  # Especificação de cada componente
│
├── docs/                         # Documentação do projeto
│   ├── estrutura.md              # Este arquivo
│   └── decisions.md              # Registro de decisões de arquitetura (ADR curto)
│
├── .agents/skills/               # Skills instaladas para agentes de IA (não é código do app)
├── .github/workflows/ci.yml     # CI: lint + lint de aderência + type-check + build
├── eslint.config.mjs             # ESLint (config Next) + regras de aderência ao DS (hex/px proibidos)
├── .oxlintrc.json                # Lint de aderência derivado do DS (imports só via barrel)
└── AGENTS.md / CLAUDE.md         # Instruções para agentes de IA que trabalham no repo
```

## Função de cada diretório, em detalhe

### `app/` — Rotas

No App Router do Next.js, **a estrutura de pastas É o mapa de URLs**. Convenções de nome que o framework impõe (não são escolha nossa):

| Convenção | Significado |
|---|---|
| `page.tsx` | O conteúdo da rota (a "tela") |
| `layout.tsx` | Moldura que envolve as rotas filhas |
| `(app)/`, `(auth)/` | *Route group*: agrupa rotas sob um mesmo layout **sem** criar segmento na URL — por isso o Dashboard é `/` e não `/app`, e o login é `/login` e não `/auth/login`. Os parênteses são a sintaxe do Next.js para "pasta organizacional que não vira parte da rota" |
| `?id=` em vez de `[id]/` | O app é **static export** (GitHub Pages): rotas dinâmicas exigiriam pré-gerar todo id no build, o que é impossível para processos criados em runtime. Por isso o id viaja como query param e cada tela é uma página estática. Detalhe em §22 de `decisions.md` |
| `error.tsx`, `not-found.tsx` | Telas de erro e 404 |

**Regra**: uma página deve ser fina — composição de componentes + chamadas de hooks. Se um trecho de JSX se repete em duas páginas, ele desce para `components/`.

### `components/ui/` — Design System (primitivos)

É o Design System LAHHM/GeraDocs (`design_system/`, a fonte normativa) portado para React, estilizado com **Tailwind utility-first** sobre os tokens do DS. `ui` é o nome consagrado no ecossistema para "primitivos do design system" (mesma convenção do shadcn/ui e dos templates da Vercel). Botões, campos, badges — peças pequenas, sem estado de negócio, que só recebem props.

**Regras**:
- Importe **sempre pelo barrel**: `import { Button, FormField } from "@/components/ui"` — o lint proíbe importar dos módulos internos (`actions.tsx` etc.). Exceção: ícones, que podem vir de `@/components/ui/icons`.
- Componente novo aqui só se estiver no DS (`design_system/components/*.prompt.md`) ou for aprovado como extensão; registre em `docs/decisions.md`.
- Estilização por classes utilitárias de token (`bg-royal`, `text-lg`); zero cor hex/arbitrária. Detalhes em **[docs/estilizacao.md](estilizacao.md)** (o lint falha o build se violar).

### `components/layout/` — Moldura da aplicação

Tudo que forma a "casca" constante em volta do conteúdo: sidebar de navegação, header e o `AppShell` que os orquestra (incluindo o comportamento responsivo de virar drawer no celular). Se um dia existir um rodapé global ou uma barra de contexto, é aqui que entra.

### `components/shared/` — Apoios compartilhados

Componentes reutilizáveis que **não são primitivos do DS** nem moldura: estados de carregamento/erro/vazio, o cabeçalho de tabela `Th`, e os providers globais (TanStack Query, Toast). Critério de entrada: usado por **2+ telas** e sem regra de negócio. Se for específico de uma tela só, fica na própria página; se for um padrão visual do DS, vai para `ui/`.

### `lib/` — Dados e domínio

TypeScript puro, testável sem browser:

- **`types.ts`** — o contrato do domínio (congelado nesta fase). Toda entidade que a UI exibe está tipada aqui, com os vocabulários fixos de status.
- **`api/auth-client.ts`** — transporte HTTP da autenticação real. Mantém o JWT somente em memória, envia o cookie HttpOnly com `credentials: "include"`, serializa o contrato Spring e converte a sessão para os tipos da interface.
- **`api/client.ts`** — fachada estável consumida pelos hooks. Autenticação e recuperação já delegam à API real; os módulos sem implementação correspondente no backend continuam no banco em memória até sua migração.
- **`api/hooks.ts`** — envelopa o client em hooks do TanStack Query com cache e invalidação. **É a única forma de uma tela obter dados.**
- **`mocks/fixtures.ts`** — os dados de exemplo. Importado **apenas** por `api/client.ts`; nunca por componente (o objetivo é que apagar esta pasta, na integração, não quebre nenhuma tela).
- **`format.ts`** — formatação pt-BR de moeda e datas (IDs e valores em monospace com formato exato).

### `design_system/`, `docs/`, `.agents/`

- **`design_system/`** — o pacote fonte do DS (tokens, especificações `.prompt.md`, guidelines). É **normativo e somente-leitura**: em conflito entre qualquer código e ele, ele vence.
- **`docs/`** — este arquivo, o `decisions.md` (o "diário" de decisões de arquitetura) e o [`fluxo-contratacao.md`](fluxo-contratacao.md) (referência de domínio: documentos, ordem, fundamento legal).
- **`.agents/skills/`** — skills para agentes de IA (Claude etc.); não participa do build.

## Onde colocar meu código? (fluxo de decisão)

1. **É uma tela nova?** → `app/(app)/<segmento>/page.tsx`. Adicione o item na `Sidebar` e o título no `Header`.
2. **É um pedaço visual reutilizável?**
   - Está especificado no DS? → `components/ui/` (+ export no `index.ts`).
   - É moldura da aplicação? → `components/layout/`.
   - É de domínio dos documentos (painel de seção etc.)? → `components/documentos/`.
   - É apoio genérico (estado, tabela, provider)? → `components/shared/`.
   - Usado por uma tela só? → dentro do próprio `page.tsx`, como função local.
3. **É dado/lógica?**
   - Nova entidade ou campo? → `lib/types.ts`.
   - **Novo tipo de documento, ou mexer em ordem/dependência/seções?** → `lib/documentos/` (catálogo e seções). **Nunca** espalhe metadado por tipo nas telas — elas leem do catálogo. Leia [`fluxo-contratacao.md`](fluxo-contratacao.md) antes.
   - Novo acesso a dados? → função em `lib/api/client.ts` **+** hook em `lib/api/hooks.ts` (as telas usam só o hook).
   - Dado de exemplo? → `lib/mocks/fixtures.ts`.
   - Formatação? → `lib/format.ts`.
4. **É estilo?** (guia completo em [docs/estilizacao.md](estilizacao.md))
   - Estilizar um elemento → classes utilitárias de token no `className` (`bg-royal`, `rounded-card`).
   - Novo token/cor/raio → bloco `@theme` de `app/globals.css` (único lugar com hex).
   - Estilo global (focus ring, scrollbar) → `@layer base` de `app/globals.css`.
   - Layout que muda por tamanho de tela → variantes responsivas (`xs:`/`sm:`/`md:`/`lg:`) no próprio `className`.

## Convenções de nomenclatura

| Item | Padrão | Exemplo |
|---|---|---|
| Pastas de rota | kebab-case, pt-BR, plural para coleções | `processos/`, `documentos/` |
| Componentes | PascalCase (arquivo = componente principal quando exclusivo) | `AppShell.tsx`, `Sidebar.tsx` |
| Módulos agrupadores | minúsculo, pelo papel | `forms.tsx`, `estados.tsx` |
| Hooks | `use` + Entidade em pt-BR | `useProcessos`, `useCriarProcesso` |
| Tipos | PascalCase pt-BR | `Processo`, `SecaoDocumento`, `ItemAprovacao` |
| Classes CSS globais | prefixo `gd-` (GeraDocs) kebab-case | `gd-page`, `gd-table-wrap` |
| Tokens CSS | `--categoria-nome` | `--color-royal`, `--radius-card` |
| Alias de import | `@/` = raiz do repo | `@/components/ui`, `@/lib/types` |

## Histórico: por que `chrome` e `ds` foram renomeados

A estrutura original usava dois jargões de área: **`chrome`** (termo clássico de UI para a "moldura" fixa da aplicação — barras, menus; o navegador Google Chrome pegou o nome daí) e **`ds`** (abreviação de *design system*). Corretos tecnicamente, mas nada autoexplicativos — foram renomeados em jul/2026 para **`layout/`** e **`ui/`**, os nomes que o ecossistema React/Next.js de fato usa, junto com a criação de **`shared/`** para os apoios avulsos que viviam soltos em `components/`.
