# Decisões de Arquitetura — Frontend GeraDocs (Fase 1)

Registro curto das decisões relevantes da industrialização do protótipo (Vite → Next.js), conforme seção 9 do prompt da fase.

## 1. Estrutura de rotas (App Router)

Route group `(app)` para o shell autenticado (Sidebar + Header); `app/layout.tsx` só carrega fonts, providers e `globals.css`.

| Rota | View |
|---|---|
| `/` | Dashboard |
| `/processos` | Lista de processos |
| `/processos/novo` | Wizard de novo processo |
| `/processos/detalhe?id=` | Hub do processo (dados + pipeline de documentos) |
| `/processos/dfd?id=` | Verificação do DFD pela IA |
| `/processos/documento?id=&tipo=` | Editor de seções — atende os seis tipos de documento (ver §13) |
| `/processos/etp?id=` | Redirect para `/processos/documento?id=&tipo=etp` (compatibilidade — ver §14) |
| `/aprovacoes` · `/documentos` · `/configuracoes` | Aprovações · Documentos · Configurações |

O id do processo (e o tipo de documento) viajam como **query param**, não como segmento dinâmico `[id]`/`[tipo]` — imposição do static export para GitHub Pages, detalhada em §22.

A sub-rota opcional `/[tipo]/[secao]` foi dispensada nesta fase: a troca de seção é instantânea (estado local) e o deep-link relevante é para o processo, não para a seção.

## 2. Estilização: Tailwind CSS v4 utility-first sobre os tokens do DS

> **Atualizado (jul/2026):** a estilização migrou para **Tailwind CSS v4 utility-first**. A decisão detalhada e a garantia de fonte única de verdade estão no **item 10**; o guia prático em `docs/estilizacao.md`. O texto abaixo descreve a abordagem original (inline styles), preservado como histórico.

~~O DS LAHHM/GeraDocs é distribuído como componentes com estilos inline referenciando tokens (`var(--...)`). Mantivemos esse padrão nos ports TSX e nas views~~ — substituído por classes utilitárias do Tailwind, cujos valores vêm do `@theme` (mesmos tokens). Os tints/gradientes que eram "Extensões do app" em `globals.css` viraram tokens do `@theme`; os pseudo-estados que eram classes `gd-*` viraram utilities `hover:*`.

## 3. Enforcement de aderência

- `eslint.config.mjs`: `eslint-config-next` (flat, nativo no Next 16) + `no-restricted-syntax` com severidade **error** proibindo hex cru, px cru em strings e `fontFamily` fora dos três tokens de fonte. Escopo: `app/`, `components/`, `lib/`.
- `.oxlintrc.json`: derivado do `_adherence.oxlintrc.json` do DS. O oxlint atual não suporta `no-restricted-syntax`; essas regras rodam no ESLint, e a validação de props dos componentes do DS é garantida pelo TypeScript strict (os ports são tipados). Mantido no oxlint o `no-restricted-imports` (importar DS só via `@/components/ui`).
- CI (`.github/workflows/ci.yml`): `lint` + `lint:ds` + `tsc --noEmit` + `next build`.

## 4. Camada de dados: mock em memória com contrato de API estável

- `lib/types.ts` — modelo de domínio congelado (Processo, SecaoDocumento, AchadoDFD, TransicaoAprovacao, Tenant, papéis).
- `lib/documentos/` — catálogo de documentos e estrutura seccional (ver §13). É domínio, não mock.
- `lib/mocks/fixtures.ts` — dados do protótipo. **Nunca** importado por componentes.
- `lib/api/client.ts` — funções assíncronas com latência simulada (300–700 ms) sobre um "banco" em memória mutável (criação de processo, salvar/gerar seção, decidir aprovação e parecer do DFD persistem durante a sessão). As assinaturas espelham o futuro cliente OpenAPI do Spring Boot: a integração troca apenas o corpo das funções.
- `lib/api/hooks.ts` — hooks TanStack Query (`useProcessos`, `useProcesso`, `useCriarProcesso`, `useParecerDFD`/`useAnalisarDFD`, `useSecoes`, `useAtualizarSecao`, `useGerarSecao`, `useGerarDocumento`, `useFilaAprovacoes`, `useDecidirAprovacao`, `useDocumentos`, `useConfigTenant`...). Única porta de entrada das views. Os hooks de seção são genéricos por `TipoDocumento` — não há hook por tipo.
- MSW foi dispensado nesta fase: o client mockado cumpre o mesmo papel com menos infraestrutura; se a integração preferir interceptação HTTP, basta trocar o corpo do client.

## 5. Server vs Client Components

Dados são mock no cliente → todas as views são Client Components (`"use client"`). Layouts (`app/layout.tsx`, `app/(app)/layout.tsx`) e `not-found.tsx` são Server Components. Estados de loading/erro/empty são tratados dentro das views via TanStack Query (com `components/shared/estados.tsx`); `loading.tsx` de rota não se aplica porque não há fetch no servidor.

## 6. Modalidade "Credenciamento"

O modelo congelado da spec lista 4 modalidades; o wizard do protótipo exibe 5 (inclui Credenciamento). Para não regredir visualmente, o union `Modalidade` inclui `"Credenciamento"` como superset documentado. O rótulo do card usa "Dispensa de Licitação" (como no protótipo), mas o valor de domínio é `"Dispensa Art. 75"` (vocabulário da spec).

## 7. Correções obrigatórias aplicadas (seção 3.3)

1. **Wordmark GeraDocs** na sidebar (chip gradiente 34px `--gradient-brand` + texto), substituindo "ContrataDoc". O rodapé configurável do tenant também diz "plataforma GeraDocs".
2. **Zero emoji**: ações rápidas, modalidades, cards de Documentos e metadados de Aprovações usam ícones de linha inline estilo Lucide (`components/ui/icons.tsx` — 24×24, stroke 2, round caps). Setas Unicode (→ ←) e ⌘K permanecem, conforme o DS.
3. **Focus ring global** via `:focus-visible` em `globals.css` (2px royal, offset 2px; electric sobre superfícies navy via `.gd-on-dark`).

## 8. Aprovações além do protótipo

O protótipo tinha só Aprovar/Rejeitar. A fase exige comentário obrigatório, ação de Solicitar Retificação e trilha de auditoria — implementados sobre `TransicaoAprovacao` (máquina de estados Rascunho → Em Revisão → (Retificação →) Aprovado | Rejeitado → Concluído), com histórico renderizado por processo e decisões persistidas no mock.

## 9. Responsividade mobile-first (camada `gd-*`)

A partir desta fase o app é compatível com celulares, tablets e laptops (pedido do produto; substitui o "desktop-first ≥1280px" do plano original). Como o estilo é inline com tokens (padrão do DS) e inline styles não suportam media queries, todo layout que varia por viewport vive numa camada de classes `gd-*` em `app/globals.css` — mobile-first, breakpoints 480 / 640 / 768 / 1024 px:

- **Shell**: abaixo de 1024px a sidebar vira drawer off-canvas (`.gd-sidebar`) aberto pelo hambúrguer do Header (`AppShell` guarda o estado; fecha ao navegar ou tocar no backdrop). No laptop permanece fixa de 240px.
- **Header**: busca global oculta abaixo de 768px (`.gd-hide-sm`); CTA "Novo Processo" vira só ícone abaixo de 640px (`.gd-hide-xs`); título com ellipsis.
- **Grids**: stats 1→2→4 colunas (`.gd-stats-grid`), infos de Aprovações 2→4 (`.gd-info-grid`), formulários 1→2/3 (`.gd-form-grid-2/3`), dashboard empilha a coluna lateral abaixo de 1080px.
- **Tabelas**: envolvidas em `.gd-table-wrap` (scroll horizontal) com `minWidth` na tabela — nada estoura a página.
- **Dois painéis** (`.gd-split`): ETP e Aprovações empilham no celular; o rail de seções do ETP vira faixa horizontal rolável de chips (`.gd-etp-list/.gd-etp-item`).
- **Wizard**: conectores do StepIndicator encolhem e só o rótulo do passo ativo aparece abaixo de 480px.
- Padding de página 16→20→28 (`.gd-page`); heros/banners com `flex-wrap`.

Verificação: screenshots via Chrome headless em 375 (via harness de iframe — o headless impõe janela mínima de 500px), 768 e 1366 px em todas as rotas.

## 10. Tailwind CSS v4 — adotado (utility-first sobre os tokens do DS)

**Decisão (jul/2026, a pedido do produto): migrar toda a estilização para Tailwind CSS v4, utility-first, mantendo os tokens do DS como fonte única de verdade.** Substitui a abordagem anterior (estilos inline com `var(--...)` + camada `gd-*`). Guia completo em `docs/estilizacao.md`.

Como a fonte única de verdade foi preservada:
- O bloco **`@theme`** de `app/globals.css` declara cada token do DS (cores, fontes, escala tipográfica, raios, breakpoints, larguras máximas). O Tailwind v4 gera as utilities correspondentes, cada uma resolvendo para a mesma CSS variable — trocar `--color-royal` no `@theme` muda o app inteiro. Não há duplicação de valores.
- Nenhum utilitário de cor "de prateleira" do Tailwind é usado (`text-slate-500` etc.): a paleta do tema é **só** a do DS, então as utilities disponíveis são as dos tokens (`bg-royal`, `text-tint-success-fg`).
- **Enforcement (lint, severidade error)**: `eslint.config.mjs` proíbe cor hex crua, cor arbitrária (`bg-[#...]`, `-[rgb...]`) e tamanho de fonte arbitrário (`text-[NNpx]`). Valores estruturais pontuais em brackets (`min-w-[560px]` de tabela rolável) são permitidos — equivalem às "dimensões pontuais" que antes eram números JS. O `no-restricted-imports` (barrel `@/components/ui`) segue no oxlint.
- **Exceções tokenizadas**: dois tamanhos do protótipo fora da escala fixa (16px de títulos de painel, 28px da nota do DFD) viraram tokens `--text-panel`/`--text-score` no `@theme`, em vez de valores arbitrários — mantêm a fonte única.
- **Responsividade**: migrada da camada `gd-*` para variantes nativas (`xs`/`sm`/`md`/`lg` = 480/640/768/1024). Mesmos breakpoints, mesmo comportamento (sidebar→drawer, tabelas com scroll, painéis que empilham).
- **Componentes reutilizáveis preservados**: cada componente do DS manteve sua API de props (variantes/tamanhos); só o interior mudou de objeto de estilo para mapa de classes utilitárias. Quem consome (`<Button variant="primary">`) não muda.
- **shadcn/ui** (skill instalada): continua **não adotado** — traria componentes Radix com estética própria, conflitando com "os componentes vêm do DS" e com o sistema flat. Tailwind é usado só como camada de estilização dos componentes do próprio DS.

**Anti-regressão**: `tsc`, ESLint, oxlint e `next build` verdes; screenshots headless em 1366/768/375 px comparados com o baseline pré-migração — sem regressão visual. Verificado que zero classes `gd-*` e zero `var(--...)`/hex sobraram no TSX.

## 11. Auditoria com skills instaladas (jul/2026)

Revisão multi-ângulo (skill code-review) usando as skills do repo (`.agents/skills/`) como critérios — `vercel-react-best-practices`, `web-design-guidelines`, `frontend-design`. Correções aplicadas: IDs de aprovações desalinhados com processos nas fixtures (contaminação cruzada de status), race do rascunho do ETP com refetch pós-salvamento (ressincroniza só na troca de seção + ref para callbacks), status "Completo" mantido ao esvaziar seção, página do DFD sem tratamento de erro/id inexistente, "Valor Total Estimado" fixo → derivado de quantidade × valor unitário, comentário de Aprovações apagado por onSuccess tardio, reseed do formulário de Configurações com o tenant canônico pós-mutação, `import "client-only"` no mock (impede vazamento de estado entre requests se algum RSC importar), `prefers-reduced-motion`, e deduplicações: `SettingsCard`→`SectionBlock` do DS, opções de ATA→`ChoiceCard`, `Th` compartilhado (4 páginas), `InlineSpinner` compartilhado, `formatDataHora` em lib/format. Pendências registradas (não bloqueiam a fase): título do Header por contexto de rota em vez de regex, associação programática label↔input no FormField.

## 12. Protótipo preservado

O protótipo Vite original foi mantido em `prototype/` como referência visual durante a migração e **removido do repositório** após a conclusão das 8 telas (permanece disponível no histórico do git, commit `131c240`). A especificação visual vigente é o design system em `design_system/` (renomeado de `LAHHM___GeraDocs_Design_System/`).

## 13. Catálogo de documentos como fonte única (`lib/documentos/`)

Ao acrescentar Edital e Contrato, os metadados por tipo estavam **duplicados em seis lugares** (`TIPOS`/`SLUG`/`META_DOC` no hub, `SLUG_TIPO` no editor, `META_FASE` no DFD, `documentosGeraveis` no wizard, `tiposDoc` em Documentos, `TAMANHO_POR_TIPO` no client), com contagens de seções escritas à mão. Dois tipos novos significariam manter seis mapas em sincronia.

Criado `lib/documentos/`:

- **`catalogo.ts`** — `CATALOGO` (slug, título, descrição, ordem, fundamento, chip de cor, dependências, formato, tamanho), `ORDEM_FLUXO`, `REGRA_MODALIDADE` e os helpers `porSlug`, `ordenar`, `pendencias`, `totalSecoes`, `documentosDaModalidade`, `ehObrigatorio`.
- **`secoes.ts`** — a estrutura seccional de cada documento. **Saiu de `lib/mocks/fixtures.ts`**: a estrutura de um ETP é domínio legal, não dado de demonstração. O que sobrou em fixtures é o conteúdo já redigido do processo de referência (`conteudoDemoETP`).

Todas as telas passaram a ler daqui. Só permanece local no wizard o mapa de classes do estado selecionado (`CLASSES_SELECAO`), porque o Tailwind não enxerga classe montada em tempo de execução — as strings precisam ser literais.

**Ordem canônica e dependências** ficaram declaradas no catálogo e são a espinha do fluxo (Cotação → ETP → Mapa → TR → Edital → Contrato; TR requer ETP, Edital e Contrato requerem TR). Fundamentação em [`fluxo-contratacao.md`](fluxo-contratacao.md).

Uma dependência **só bloqueia se o processo contiver aquele documento**: no Leilão o Edital é obrigatório e não há TR, e ele não pode ficar preso esperando um documento que o processo nunca terá.

## 14. Editor de documentos unificado; rota `/etp` vira redirect

`/processos/[id]/etp` era um editor próprio, ~90% duplicado de `documento/[tipo]` (mesmo rail, mesmo save/advance, mesmo fluxo de regeração). Com seis tipos, a duplicação seria insustentável.

O editor genérico passou a ser o único. Os dois trechos que só o ETP tinha viraram **painéis acionados por metadado da seção** (`SecaoDocumento.painel`), em `components/documentos/paineis.tsx` — antes eram disparados por comparação de **título** (`active.titulo === "Soluções Disponíveis no Mercado"`, `titulo.startsWith("Estimativa")`), o que quebraria ao renomear uma seção.

O antigo `EstimativasSecao` renderizava quantidades **e** valor num bloco só. Como são incisos distintos (Art. 18, § 1º, IV e VI) e agora são seções distintas, virou dois painéis: `quantidades` e `valor`.

A rota `/etp` permanece como `redirect()` para `documento/etp`, para não quebrar links existentes.

## 15. Geração travada só pelas seções obrigatórias

Antes, "Gerar Documento" exigia **todas** as seções concluídas. Isso é incompatível com o **Art. 18, § 2º**, que torna indispensáveis apenas os incisos I, IV, VI, VIII e XIII do ETP e permite dispensar os demais mediante justificativa.

O gate (no hub e no editor) passou a exigir apenas as seções `obrigatoria`. As opcionais em branco são omitidas do documento, com aviso na interface. A `ProgressBar` continua medindo sobre o total.

## 16. Edital e Contrato — tokens `doc-*`

Dois tokens novos em `@theme` (`app/globals.css`), seguindo o padrão dos quatro existentes. O Contrato usa **ardósia** (`#334155`), e não verde: o verde institucional já é o status "Concluído" (`--color-status-done-fg` é exatamente `#15803D`), e um chip verde no documento leria como badge de status.

## 17. Extensões do barrel registradas (pendência antiga)

`docs/estrutura.md` exige registrar aqui todo componente de `components/ui/` que não esteja no DS. Ficaram sem registro: **`Dropdown`** (+ `DropdownOption`), **`MoneyInput`**, **`QuantityInput`** e **`CheckMark`** — todos em uso e sem `.prompt.md` no DS. Ficam registrados como extensões aprovadas. `CardPanel` é o inverso: está especificado em `SectionBlock.prompt.md` e não é exportado pelo barrel.

> `MoneyInput` e `QuantityInput` deixaram de ser extensões não documentadas: ganharam spec no DS (`components/forms/MoneyInput.prompt.md`) ao virarem componentes com máscara — ver §18.

## 18. Campos valorados se formatam sozinhos

`MoneyInput` e `QuantityInput` eram `<input>` de texto **sem máscara**: o que o usuário digitasse ficava como veio (`500000` continuava `500000`), e cada tela refazia o parse à mão com uma regex própria — três implementações ligeiramente diferentes, todas frágeis.

A formatação passou a ser **do componente**, não do chamador: a máscara agrupa os milhares a cada tecla e o blur fecha o valor em duas casas (`500000` → `500.000,00`). Texto colado sujo é aceito (`R$ 485.000,00` → `485.000,00`).

Consequência no contrato: `onChange` entrega **a string já formatada**, e não o `ChangeEvent` — mesmo padrão que o `Dropdown` já usava. Foi uma quebra de API deliberada, com 4 pontos de uso, porque o contrato anterior permitia que uma tela esquecesse de mascarar (e permitia mesmo: era exatamente o bug).

As primitivas de formatação ficam em `lib/format.ts` (`mascaraValorBR`, `normalizaValorBR`, `parseValorBR`, `formatNumeroBR`), ao lado de `formatBRL` — **nenhuma tela deve reimplementar parse ou máscara de valor**. Valores só de leitura (totais, estimativas) não são campos: renderize com `formatBRL` em monospace.

## 19. Verificação do DFD desacoplada do ETP; toggle de retificação removido

Dois ajustes de conformidade no fluxo do wizard.

**Verificação do DFD pela IA** deixou de ser apresentada como "Antes do ETP". Ela é a **etapa inicial** de qualquer processo: o que se verifica é a qualidade da *demanda* (DFD), que fundamenta qualquer documento subsequente — não só o ETP. Passou a ser **gateada na presença do DFD anexado**, não na seleção do ETP: sem DFD anexado (só Objeto da Demanda), o card aparece desabilitado com dica para anexar. Todos os textos que citavam ETP foram desacoplados ("antes de elaborar os documentos"). A mecânica de redirect já era desacoplada (vai para o primeiro documento do fluxo). Fundamentação em [`fluxo-contratacao.md`](fluxo-contratacao.md#verificação-do-dfd-pela-ia--quando-aparece).

**"Fase de Retificação"** era um toggle no wizard que gravava `Processo.fases.retificacao` e **nunca era lido** — flag morto prometendo uma fase inexistente (retificação-com-versionamento é Fase 2, ver §12 do plano e as lacunas em `fluxo-contratacao.md`). O toggle foi **removido do wizard**; o campo permanece no domínio como slot da Fase 2 (sempre `false` por ora). Não confundir com "Solicitar Retificação" na tela de Aprovações, que é decisão de aprovação e **funciona** — essa permaneceu intacta.

## 20. Fase 2 — fluxo de aprovação, versionamento e retificação por seção

Implementadas as lacunas que a análise da Fase 1 havia registrado. Detalhe de domínio e diagrama em [`fluxo-contratacao.md`](fluxo-contratacao.md#fluxo-de-aprovação-e-retificação-fase-2--implementada).

- **Máquina de estados** em `lib/processos/fluxo.ts` — tabela de transições + guardas, usando **apenas os seis status fixos** (o vocabulário é normativo). Substitui a lógica inline que existia só em `decidirAprovacao` e que não cobria envio nem conclusão. Novas transições: `envio` (rascunho→em_revisao e em_revisao→aguardando) e `conclusao` (aprovado→concluido).
- **Envio para aprovação** no hub, travado até os documentos obrigatórios da modalidade estarem gerados. **Conclusão** a partir de "Aprovado".
- **Parecer jurídico (Art. 53)** modelado como **gate no checklist**, e não como status novo — o vocabulário de `StatusProcesso` é fixo (§ da regra do DS). Emitido pelo papel Jurídico no estágio Em Revisão; exigido para encaminhar ao gestor.
- **Fila de aprovação derivada de `db.processos`** (`getFilaAprovacoes` projeta os processos no pipeline). Removida a fixture `aprovacoes` e a taxonomia `ItemAprovacao.tipo` (`"ETP" | "TR" | "ETP + TR"`), substituída por `documentos: TipoDocumento[]`. O checklist é computado do estado do processo. `Processo` ganhou `trilha`, `enviadoEm`, `prazo`, `parecerJuridico`.
- **Versionamento**: `gerarDocumento` incrementa `DocumentoGerado.versao` e guarda a versão anterior em `VersaoDocumento[]` — nunca sobrescreve sem rastro (rastreabilidade do controle). O histórico v1 das fixtures é semeado na init do client.
- **Retificação por seção**: `ApontamentoRetificacao` (documento + seção + texto), criado pelo gestor na fila e resolvido pelo elaborador no editor; regerar o documento resolve os apontamentos abertos e cria nova versão. Substitui o "parecer em texto livre único".
- **Fixtures alinhadas à conformidade**: cada processo do pipeline tem modalidade × documentos coerentes com `REGRA_MODALIDADE`, trilha realista e documentos obrigatórios gerados. Corrigida inconsistência do PROC-2024-087 (era Dispensa com Edital, o que a Lei não admite → passou a Pregão).
- **`fases.retificacao`** deixou de ser flag morto conceitualmente: a retificação é agora uma transição real da máquina de estados. O campo permanece no domínio; a fase preparatória de retificação é acionada pela decisão do gestor, não por um toggle no wizard.

## 21. Autenticação, multi-prefeitura e perfis de acesso (RBAC)

Login por CPF + senha, várias prefeituras e três perfis de acesso, **mockados** (consistente com a Fase 1 — backend real é fase futura). Detalhe em [`perfis-acesso.md`](perfis-acesso.md).

- **Três conceitos de papel coexistem, sem unificar:** `PerfilAcesso` (novo — `admin_geral`/`coordenador`/`servidor`, controla acesso), `PapelUsuario` (existente — papel no fluxo de aprovação) e (removido) o antigo `UsuarioTenant.perfil`. O identity model (`Usuario` com CPF/e-mail/prefeituraId) e a `Sessao` são novos; `UsuarioAtual`/`UsuarioTenant` saíram.
- **Multi-tenant:** `Tenant` ganhou `id` e passou a ser a Prefeitura; `Processo`/`DocumentoGerado` ganharam `prefeituraId`. As consultas do client filtram pela prefeitura da sessão (admin vê tudo). Fonte de dados: `db.prefeituras`, `db.usuarios`, `db.credenciais`, `db.sessaoUsuarioId`.
- **Auth client-side:** sessão em `localStorage` (`geradocs.sessao`); guarda em `components/layout/GuardaSessao.tsx` no `(app)/layout`. Route group novo **`(auth)`** para a tela de login fora do shell. Não há `middleware.ts` — coerente com o mock `client-only`. `validaCPF` valida dígitos; erro de login genérico (anti-enumeração).
- **RBAC como fonte única** em `lib/auth/acesso.ts` (`rotaPermitida`, `navPrincipal`, `navSistema`). Sidebar e Header derivam do perfil (o admin não vê o fluxo de processos; o servidor não vê Configurações/Admin).
- **CPFs de demonstração** (`11111111111`…) são sequências repetidas que a validação real reprova; liberados por `CPFS_DEMO` só nesta fase, listados no login.
- **Telas novas:** `(auth)/login`, `admin/prefeituras`, `admin/servidores`, `admin/PainelAdmin` (painel do sistema), `perfil` (Meu Perfil). A aba "Usuários" de Configurações deixou de ser stub — lista/adiciona servidores reais da prefeitura da sessão.
- **`Input` do DS ganhou `type`/`autoComplete`/`onKeyDown`** (extensão retrocompatível) para os campos de senha/e-mail do login.

## 22. Static export (GitHub Pages): id do processo vira query param

O deploy é **static export** (`output: "export"`, `basePath: "/GeraDocsFrontend"`) publicado no GitHub Pages via GitHub Actions. Nesse modo o Next só gera HTML para os params listados em `generateStaticParams`; **rotas dinâmicas com id de runtime são impossíveis** — um processo novo (`PROC-2024-090`) nunca existiria no build e o acesso caía em 404 (era o bug: o `generateStaticParams` fixo em `{ id: "1" }` derrubava todo processo que não fosse "1", inclusive os das fixtures).

Correção: o id do processo (e o `tipo` do documento) deixaram de ser **segmento dinâmico** e passaram a **query param**. As rotas de processo viraram páginas estáticas fixas:

| Antes (dinâmico, quebrava) | Depois (estático) |
|---|---|
| `/processos/[id]` | `/processos/detalhe?id=` |
| `/processos/[id]/dfd` | `/processos/dfd?id=` |
| `/processos/[id]/documento/[tipo]` | `/processos/documento?id=&tipo=` |
| `/processos/[id]/etp` | `/processos/etp?id=` (redirect) |

- Cada `page.tsx` é um Server Component que envolve o `ClientPage` em `<Suspense>` — exigência do `useSearchParams()` sob static export. Os `ClientPage` leem `searchParams.get("id")`/`get("tipo")` no lugar de `useParams()`.
- **Não recrie rotas `[id]`/`[tipo]` para conteúdo de runtime.** Qualquer tela nova que dependa de um id gerado em runtime segue este padrão (query param + página estática).
- **DFD continua separado de `documento/`** de propósito: o DFD é *insumo* (Art. 6º — anexo + verificação por IA que emite `ParecerDFD`), **não** um dos seis `TipoDocumento` geráveis (Cotação, ETP, Mapa, TR, Edital, Contrato). Ver §19 e [`fluxo-contratacao.md`](fluxo-contratacao.md#insumos-que-não-são-documentos-gerados). Unificar as duas rotas seria misturar um insumo com os documentos gerados.
- ~~Limitação conhecida do mock: o "db" em memória reseta a cada carregamento de página, então um processo recém-criado só existe na sessão que o criou.~~ **Resolvida em 22/08/2026, no Bloco 9.3.** Processo, documento e seções vivem no servidor; recarregar a página não perde mais nada. A jornada de ponta a ponta escreve no ETP, recarrega e confere que o texto continua lá — para que a limitação não volte sem ninguém notar.

## 23. Primeira integração real: autenticação e recuperação de conta

A decisão de autenticação mockada registrada no §21 foi substituída para o fluxo de identidade. Login, refresh, `/me`, logout, solicitação e conclusão da redefinição de senha agora usam o backend Spring Boot em `/api/v1`; os demais módulos continuam mockados até possuírem contratos implementados no backend.

- `lib/api/auth-client.ts` concentra transporte, Problem Details, renovação deduplicada e mapeamento dos enums/DTOs Java para o modelo da interface.
- O access token JWT existe somente em memória. O refresh token rotativo é enviado pelo backend em cookie `HttpOnly` e nunca fica disponível ao JavaScript ou ao `localStorage`.
- `getSessao` tenta renovar o token após reload e confirma a identidade em `GET /me`. Requisições autenticadas repetem uma única vez após `401`, evitando ciclos infinitos.
- A rota estática `/redefinir-senha?token=` completa o link enviado por e-mail. O backend deve usar a URL com o `basePath`: `http://localhost:3000/GeraDocsFrontend/redefinir-senha` no ambiente local.
- A sessão real alimenta temporariamente os módulos mockados pela fachada existente. Isso preserva telas e hooks, mas dados de processos/configurações ainda não representam persistência real.

## 24. Integração real da administração de acesso

As telas de Administração e a aba de Secretarias deixaram de manipular a base em memória. `lib/api/access-client.ts` é a camada anticorrupção que converte os DTOs do Spring para `Tenant` e `Usuario`, e reutiliza o transporte autenticado de `auth-client.ts`.

- Prefeituras, departamentos e usuários são consultados/criados pela API real e o cache é invalidado pelos hooks TanStack Query após cada mutação.
- "Remover" passou a significar **desativar**: não há exclusão local nem perda silenciosa de histórico. Como o backend exige concorrência otimista, a camada lê a versão atual e envia `If-Match` antes da desativação.
- O formulário envia a senha inicial escolhida pelo administrador (mínimo de 12 caracteres); não existe senha padrão no frontend. CPFs de listagem são tratados como mascarados, conforme a resposta do servidor.
- Identidade visual, cabeçalho/rodapé e PCA permanecem temporariamente locais na tela de Configurações, pois ainda não possuem contrato/persistência no backend. A interface não deve apresentar essas opções como integração concluída.

## 25. Vocabulário de status reduzido a três

O fluxo de aprovação entre setores sai do produto: na Prefeitura de Ecoporanga ele acontece no GPI da E&L, e a plataforma termina na elaboração do documento (ver [`fluxo-contratacao.md`](fluxo-contratacao.md) e o [plano das diretrizes](plano-diretrizes-reuniao.md)). Com isso, quatro dos seis status de `StatusProcesso` passariam a existir sem nada que os produza.

**Decisão (20/08/2026):** `StatusProcesso` passa a ser `rascunho` → `em_elaboracao` → `concluido`. `em_revisao`, `aguardando`, `aprovado` e `rejeitado` são removidos.

- **Por que remover em vez de deixar inertes:** vocabulário é contrato de leitura. Um status que ninguém alcança continua aparecendo em tipo, em filtro e em `switch`, e quem chegar depois vai tentar usá-lo — a alternativa "custo zero agora" cobra juros em cada tela nova.
- **Custo aceito:** filtros, badges, dashboard e fixtures mudam junto. Os testes do Bloco 3 da [ordem de implementação](../../geradocs-backend/docs/ordem-de-implementacao.md) entram antes justamente para tornar essa mudança verificável.
- **O que sobrevive:** a trilha de auditoria. `TransicaoAprovacao` vira `EventoProcesso` (criação, troca de modalidade, geração de documento, retificação, encerramento, reabertura) — é o único registro do que aconteceu **dentro** da plataforma, já que o GPI só registra o que vem depois.
- **Encerramento:** ocorre quando todos os documentos do processo foram gerados, com a válvula de escape padrão do produto — encerrar mesmo assim, mediante justificativa registrada.
- **Reversão:** se um dia um ente sem sistema de protocolo precisar do fluxo interno, ele volta como módulo próprio de workflow, não como ressurreição destes status. Ver ADR §20, que esta decisão substitui no que toca ao vocabulário.

## 26. Primeira integração real de processos de compra

Criação e listagem de processos passam a usar `GET` e `POST /api/v1/procurement-processes`. A camada `lib/api/procurement-client.ts` traduz o contrato do Spring para o tipo de tela `Processo`, mantendo as views dependentes apenas dos hooks existentes.

- O servidor atribui o número `PROC-AAAA-NNNNNN` de forma atômica no `POST`; o wizard não exibe previsão numérica que possa colidir com outra criação.
- O seletor de secretaria envia o identificador real do departamento. Organização, usuário responsável e isolamento por tenant são derivados da sessão pelo backend, nunca enviados pelo navegador.
- O processo nasce como `DRAFT`/Rascunho. Os filtros para estados ainda não implementados retornam vazio, em vez de simular um estado inexistente no servidor.
- Depois de criar, o usuário volta para a lista integrada. DFD, detalhe, edição e geração documental permanecem mockados até os respectivos contratos e persistência serem implementados; portanto o wizard não redireciona mais para uma tela que não encontraria o novo UUID no mock.

## 25. Decisões de produto que fecham a remoção do fluxo de aprovação

Tomadas em 21/08/2026, junto com a §24. Fecham as cinco perguntas que o [plano das diretrizes](plano-diretrizes-reuniao.md) deixou em aberto.

### 25.1 Apontamentos por seção e parecer jurídico saem do produto

Nenhum dos dois sobrevive à remoção do fluxo. O `ApontamentoRetificacao` não vira revisão interna e não há campo para anexar o parecer do Art. 53 — ele é emitido e guardado no GPI.

**Por quê:** ambos existiam como peças do fluxo entre setores. Mantê-los "por precaução", sem quem os produza, deixaria dois conceitos na interface que ninguém alimenta — e conceito órfão é lido por quem chega depois como funcionalidade a usar.

**Consequência:** a retificação passa a nascer de um comando explícito do próprio elaborador ("Retificar documento"), não de um apontamento recebido. É o que a §26 abaixo assume.

### 25.2 Documento de modalidade anterior é mantido e marcado

Trocada a modalidade, o documento já gerado que deixa de ser cabível — o Edital num processo que virou Dispensa — **permanece no repositório**, marcado como "de modalidade anterior".

**Por quê:** ele existiu, foi elaborado por alguém e integra o histórico do processo. Apagar ou esconder apagaria o rastro de trabalho real; a marcação diz o que mudou sem fingir que não aconteceu.

### 25.3 A errata é anexo da versão, não documento do catálogo

A errata ("Onde se lê… Leia-se…") fica pendurada na versão que a originou, sem id próprio no repositório de documentos.

**Por quê:** os seis tipos do catálogo participam da matriz modalidade × documentos e da ordem canônica do fluxo. A errata não pertence a nenhuma das duas: ela é derivada de uma correção, não um artefato exigido pela lei para instruir o processo. Dar-lhe id próprio obrigaria a inventar posição e obrigatoriedade que a Lei 14.133 não prevê.

### 25.4 O CPF continua obrigatório no cadastro

Mesmo quando a chave de login mudar para e-mail ou matrícula (Fase D do [plano de consolidação](../../geradocs-backend/docs/plano-consolidacao.md)), o CPF segue exigido no cadastro do servidor.

**Por quê:** ele identifica o servidor de forma inequívoca em documento oficial, e essa necessidade é independente de como a pessoa entra no sistema. A minimização de dado pessoal continua valendo no **uso**: CPF de terceiro segue mascarado nas respostas, e só o próprio usuário vê o seu por inteiro.

## 26. `PapelUsuario` sai do modelo; o perfil de acesso é a fonte única

Com o fluxo de aprovação fora do produto (§24 e §25.1), `PapelUsuario` — servidor de compras, secretaria demandante, comissão, jurídico, gestor aprovador — descrevia posições de um fluxo que a plataforma não executa mais.

**Decisão (21/08/2026):** o tipo é removido. `Usuario.papel` deixa de existir e `EventoDoProcesso.papel` passa a usar `PerfilAcesso`.

- **Por quê:** sem o workflow, os dois vocabulários descreviam a mesma coisa — quem é a pessoa no sistema. Dois vocabulários paralelos para o mesmo conceito é como um deles fica errado sem ninguém perceber: era exatamente o que estava acontecendo, com `papelDa()` caindo em `servidor_compras` para todo mundo cujo vínculo não trouxesse papel.
- **O que era o defeito concreto:** o backend tornou `workflowRoles` opcional no mesmo dia. Com a lista vazia — que passa a ser o caso comum — o fallback silencioso atribuiria "Servidor de Compras" ao jurídico, ao coordenador e a quem mais entrasse.
- **O que se perde:** a distinção entre secretaria demandante e servidor de compras, que hoje não é usada em lugar nenhum. Se voltar a fazer falta, volta como atributo do vínculo, com uso definido — não como enum que ninguém lê.
- **`WorkflowRole` continua no backend**, agora opcional. Removê-lo de vez é migração com perda de dado e fica como decisão à parte: [ordem de implementação](../../geradocs-backend/docs/ordem-de-implementacao.md), pendência do Bloco 4.

## 27. `lib/dominio/` — a regra sai do mock e da tela

Até 21/08/2026 a regra de negócio do front-end morava dentro de `lib/api/client.ts` (o banco em memória) e, em parte, dentro das próprias telas: o cálculo de progresso do documento, quais seções travam a geração, o que conta como pendência do processo e os indicadores do painel.

Isso quebrava a promessa registrada em [`estrutura.md`](estrutura.md) de que, na integração, "só os corpos destas funções trocam": a regra morreria junto com o mock, ou viraria duplicação silenciosa com o back-end.

**Decisão:** as regras passam para `lib/dominio/`, como funções puras — sem React, sem `fetch`, sem estado. `client.ts` e as telas passam a consumi-las.

| Módulo | O que guarda |
|---|---|
| `escopo.ts` | Quem enxerga qual prefeitura |
| `indicadores.ts` | Indicadores do painel e resumo do repositório |
| `processo.ts` | Pendências do processo e regra de encerramento |
| `secoes.ts` | Progresso, seções indispensáveis e quando o documento pode ser gerado |
| `versionamento.ts` | Incremento de versão, histórico e o rótulo `RETIFICADO` |
| `identidade.ts` | Primeiro nome e iniciais do avatar |
| `numeracao.ts` | `PROC-AAAA-NNN`, `DOC-AAAA-NNNN` e o título do arquivo gerado |

### O defeito que a extração revelou

`iniciaisDe` existia em **três cópias** — no mock, no cliente de autenticação e
no de acesso — e elas **divergiam**: para um nome de uma palavra só, duas
devolviam `"MM"` e a terceira devolvia `"M"`. O mesmo servidor aparecia com
avatares diferentes conforme a tela que tivesse carregado o dado.

Pior: havia um teste afirmando `"MM"`. Ele passava porque exercitava uma das três
implementações, sem que nada indicasse que existiam outras duas. A unificação o
derrubou, e a correção do teste é a prova de que a regra passou a ter um dono
só — `"M"`, porque repetir a mesma letra não é inicial de nada.

### A natureza da cópia

Quando o back-end assumir cada módulo, **estas regras passam a ser autoritativas no servidor**. A cópia daqui permanece apenas como *affordance* de interface — habilitar botão, mostrar pendência, calcular progresso — e **nunca como fonte de verdade**.

A distinção importa na hora de divergirem: se a tela diz que pode gerar e o servidor recusa, quem está certo é o servidor, e o defeito é da cópia. O caminho de correção é sempre alinhar o front ao back, nunca o contrário.

### O que ficou de fora, e por quê

`lib/api/client.ts` e `lib/api/hooks.ts` continuam fora do gate de cobertura. O motivo mudou: não é mais "serão apagados no Bloco 4/5", é que **o que sobrou neles não é domínio**. `client.ts` virou um armazenamento em memória com funções finas sobre arrays, e `hooks.ts` é invólucro do TanStack Query. Cobri-los a 100% mediria fixture e cola de framework, e o número subiria sem que nada ficasse mais verificado — enquanto cada módulo entregue pelo back-end apaga um pedaço deles.

## 28. A chave de login é um descritor, não um campo de CPF

Até 21/08/2026 a tela de login era uma tela de CPF: rótulo, placeholder, máscara, validação, `autoComplete` e a mensagem de erro estavam escritos literalmente em `app/(auth)/login/page.tsx`, e `client.ts` chamava `limpaCPF` antes de enviar. Trocar a chave — o que já se sabia necessário, porque nem toda prefeitura quer o CPF na porta de entrada — seria mexer nesses cinco pontos e torcer para não esquecer nenhum. Esquecer o `autoComplete`, por exemplo, faria o gerenciador de senhas oferecer o CPF salvo num campo de e-mail.

**Decisão:** `lib/auth/identificador.ts` descreve a chave inteira em um objeto — rótulo, placeholder, `inputMode`, `autoComplete`, máscara, normalização, validação e mensagem de formato. A tela renderiza o descritor e não sabe qual é a chave. O tipo ativo vem de `NEXT_PUBLIC_LOGIN_IDENTIFIER`, com CPF como padrão, e precisa coincidir com o `geradocs.auth.login-identifier` do back-end (ADR-015 lá).

**Consequências:**

- `autenticar()` envia `identifier` no lugar de `cpf`. O back-end aceita os dois durante a transição, mas o front já migrou.
- A normalização deixou de ser do `client.ts` e passou a ser do descritor: quem sabe o que fazer com o valor digitado é a chave ativa.
- A mensagem de credencial recusada passou a ser `«Rótulo» ou senha inválida.`, o mesmo texto que o back-end devolve no 401 — antes dizia "CPF" mesmo quando a chave não era CPF.
- `app/(auth)/login/page.test.tsx` roda a tela nas três chaves. Enquanto passar, "trocar a chave custa uma variável de ambiente" é fato verificado, e não intenção escrita aqui.

**Matrícula e decreto de nomeação** entraram em `Usuario` e no cadastro de servidores, com a busca da listagem passando a aceitar nome **ou** matrícula — atendendo ao caso levantado na reunião, o de localizar o servidor desligado pelo número que o RH usa. A busca vai ao servidor (com espera de 300 ms) porque quem conhece a matrícula de quem não está na página é ele; filtrar só o que já foi carregado esconderia justamente o servidor procurado.

**Divergência registrada:** o passo 6.6 do plano previa *edição* de matrícula em `perfil/`. Ela ficou somente leitura ali, editável apenas no cadastro em `admin/servidores`. O motivo é o próprio ADR-015: quando a matrícula for a chave de login, deixar a pessoa alterar a própria matrícula é deixá-la alterar o próprio identificador de acesso. É a mesma razão pela qual o CPF já era somente leitura nessa tela.

## 29. O contrato passou a afirmar, e os `??` sumiram

A §27 registrava que `client.ts` e `hooks.ts` ficavam fora do gate de cobertura, e a pendência do Bloco 2 registrava que a especificação OpenAPI não declarava campo obrigatório — o springdoc marcava **tudo** como opcional, porque não tem como saber o que é nulo de verdade.

As duas coisas se encontravam num sintoma só: o cliente gerado tratava como incerto o que o servidor sempre envia, e o mapeamento enchia o código de `??` para satisfazer o compilador em caminhos que nenhuma resposta real alcança. Cobertura de branch travada, e — pior — um contrato que não afirmava nada para quem integra.

**Decisão:** o back-end ganhou um `ModelConverter` que inverte o padrão — componente de record é obrigatório, a menos que anotado `@Nullable`. A ausência virou decisão declarada, visível em revisão. Os tipos foram regerados e os `??` sem caminho saíram.

**O que mudou de comportamento, e não só de tipo.** Três testes afirmavam que resposta incompleta devia ser preenchida com vazio: CPF, e-mail, cargo, e perfil de acesso caindo em `"servidor"`. Isso fazia sentido quando *tudo* era opcional no contrato. Deixou de fazer: hoje e-mail, perfil e situação são declarados obrigatórios, e resposta sem eles não é campo ausente — é servidor quebrado, proxy no caminho ou versão incompatível. Preencher com vazio montaria uma sessão que parece válida e não é, e o perfil assumido faria a pessoa entrar com menos acesso do que tem e abrir chamado de permissão. Agora vira `502` explícito.

Ficaram os `??` dos campos que são de fato opcionais: CPF de cadastro pendente, cargo, matrícula, decreto, último acesso e a organização do administrador global.

**Cobertura:** os quatro números — linha, branch, statement e função — estão em 100% e deixaram de ser catraca para virar piso. Uma queda é regressão, não flutuação.

**O que continua fora do gate, e por quê.** `client.ts` e `hooks.ts`. O motivo não é dívida: `client.ts` é o banco em memória que o back-end vem substituindo fatia por fatia — hoje são funções finas sobre arrays de fixture, e ele some junto com os Blocos 8 a 11; `hooks.ts` é invólucro do TanStack Query, e testá-lo mediria o TanStack, não o produto. Cobri-los levaria o número a 100% sem que uma regra a mais ficasse verificada.

## 30. Bloco 8 — o que a interface passou a dizer

Três das quatro fatias deste bloco têm a mesma forma: a plataforma **sabia** de algo e não dizia.

**Troca de modalidade.** Trocar Pregão Eletrônico por Dispensa do Art. 75 faz o Edital deixar de existir naquela contratação. Se ele já foi gerado, continua no acervo contradizendo o processo — e esse aviso vem separado dos demais porque é o mais grave. `AlertaOrientacao` nasceu aqui e é o padrão de todos os alertas do produto: **orienta e deixa seguir**. Bloquear seria pior de duas formas — a regra pode estar errada para o caso concreto, e o servidor contornaria a plataforma por fora, perdendo o registro; e travar transforma orientação em obstáculo, que é o que fez o fluxo de aprovação sair do produto (§24).

**Rótulo RETIFICADO.** `rotuloDaVersao` existia desde o Bloco 5 e não era usado em lugar nenhum. Agora o rótulo vai ao badge, ao cabeçalho e — principalmente — ao **título do arquivo**: o documento sai da plataforma, é anexado ao processo no sistema da prefeitura, impresso, encaminhado. Fora daqui o badge não viaja junto; o título, sim. Retificar não é regerar, e só a retificação declarada entra na trilha: marcar toda regeração como retificação esvaziaria a palavra onde ela tem peso. Erro material e alteração substancial ficam separados porque a segunda costuma exigir republicação — e é isso que o controle pergunta.

**Dispensa de seção.** O Art. 18, § 2º admite dispensar incisos *mediante justificativa*. Sem registrá-la, a seção em branco some do documento e ninguém distingue o inciso que não se aplica daquele que ninguém preencheu. O parágrafo precisava de onde nascer: o documento gerado era só metadado. `corpoDoDocumento` monta as seções resolvidas na ordem e é o que o Bloco 11 vai serializar — a regra de produto fica no domínio, DOCX e PDF são trabalho de adaptador.

**Dado sintético marcado.** `tenantDa()` fabrica timbre, cabeçalho, rodapé e exercício do PCA. Configuração inventada exibida como real é pior que campo vazio: campo vazio a pessoa preenche; valor plausível ela confere uma vez, aceita, e o documento sai com um cabeçalho que ninguém decidiu — e que ela vai jurar ter configurado. A marca é discreta e presente: alerta grande em quatro campos vira ruído que se aprende a ignorar. A lista em `lib/dominio/sintetico.ts` é fonte única, cada entrada diz em que bloco o campo passa a vir do servidor, e um guarda-corpo quebra o build se um campo declarado não estiver marcado em tela nenhuma.

**Dois guarda-corpos novos.** O nº 7 (`aria-describedby` em botão travado por regra de negócio) estava como `it.todo` desde o Bloco 1, adiado por depender de estender o `Button` — o que o 8.1 precisou fazer de qualquer forma. Ao virar executável apontou **onze** botões, não os três previstos. O nº 8 é o de dado sintético. O arquivo de guarda-corpos não tem mais nenhuma pendência declarada.

## 31. O front-end sai do mock para processo, documento e seções

Até 22/08/2026 o processo, o documento e as seções viviam num banco em memória dentro de `lib/api/client.ts`. Era isso que fazia um processo recém-criado sumir ao recarregar a página — a limitação registrada na §22.

**Decisão:** esses três fluxos passam a usar a API real, pelos tipos gerados do contrato. `client.ts` continua existindo como fachada, e é isso que permitiu a migração não tocar em nenhuma tela: as páginas chamam as mesmas funções, que agora falam HTTP.

**O que mudou de dono:**

| Antes (mock) | Agora |
|---|---|
| Processo: criar, listar, ler, editar | Servidor |
| Documento: abrir, salvar seção, gerar seção, concluir | Servidor |
| Catálogo de seções (Art. 18) | Servidor |
| Regra de conclusão e corpo do documento | Servidor — a cópia do front continua como *affordance* |
| Acervo: identificador `DOC-`, formato, tamanho | Ainda local, até o Bloco 11 produzir o arquivo |
| Trilha do processo, parecer do DFD, indicadores, configuração do órgão | Ainda local |

**Três decisões que o código passou a expressar:**

- **A versão do documento vem do servidor.** Contá-la no cliente faria duas abas divergirem sobre qual é a versão vigente.
- **A geração devolve o texto para o rascunho e não o grava.** Quem decide se aquilo entra no documento é quem assina.
- **`If-Match` com a versão que a tela leu.** A API substitui o recurso inteiro, então o que não muda é reenviado como está — e um PATCH que omitisse o valor estimado o zeraria.

**O mock encolheu de verdade**, não só de fachada: saíram o armazenamento de seções, o conteúdo de demonstração do ETP e a geração de texto simulada. O que sobrou em `client.ts` é o que ainda não tem contrato — e some conforme os blocos seguintes entregam.

## 32. Previsão no PCA: a tela separa o que a plataforma encontrou do que o servidor afirmou

O Art. 18, § 1º, II exige **demonstração** da previsão no Plano de Contratações Anual. Demonstrar é apontar o item — "está no PCA" sem dizer onde não demonstra coisa alguma, e é isso que o painel do inciso II cobra.

**Decisão:** o painel tem quatro estados e nenhum deles é ambíguo. A plataforma encontrou o item no plano importado (por igualdade, por termos ou por aproximação); ou o servidor informou qual é. **`FORMA_DA_PREVISAO` dá rótulo e explicação a cada um**, e "Informado por você" nunca aparece com a mesma cara de "Encontrado no PCA". Fundir os dois faria a tela parecer ter conferido algo que ninguém conferiu — e é o documento do servidor que vai ao controle depois.

**Item fora do plano não trava.** Contratação fora do PCA existe e exige justificativa, não bloqueio. O painel alerta, diz por que não trava, e a citação sai mesmo assim: ela enumera o que ficou de fora e deixa a justificativa entre colchetes, visível. É o padrão do `AlertaOrientacao` (§24) aplicado a mais um lugar.

**A citação é composta no servidor.** A tela mostra o parágrafo para leitura antes de gravar — é texto que entra em processo administrativo —, mas quem o monta é o domínio, e é ele que o snapshot da versão congela. Montá-lo aqui criaria duas fontes para a mesma frase.

**A aba de PCA em `/configuracoes` deixou de mentir.** Ela dizia "PCA carregado com sucesso, 247 itens de contratação indexados" a partir de uma fixture, aceitava PDF, XLSX e DOCX que nada lia, e afirmava que "o modelo utilizará este PCA" quando nenhum modelo existe. Agora aceita **CSV**, envia o conteúdo do arquivo, e o número que exibe — *itens indexados* — é o que o servidor devolveu. Que só CSV seja lido está escrito na tela, com o formato da linha: limitação declarada é limitação; limitação escondida é defeito.

**`pcaAno` saiu de `DADOS_SINTETICOS`** — o exercício agora é o do plano importado, e não o ano do calendário. E `Tenant.pca` saiu do tipo: era configuração fabricada por `tenantDa()` que nenhuma tela consome mais.

**Três `saiEm` estavam errados e foram corrigidos.** Timbre, cabeçalho e rodapé diziam "Bloco 10", mas nenhum passo do Bloco 10 os entrega — eles nascem com os templates publicados, no 11.1. Indicadores e parecer do DFD diziam o mesmo e dependem de trabalho que ainda não tem passo, então foram para o Bloco 12. O guarda-corpo cobra que cada campo declare seu bloco de saída; ele não tinha como cobrar que o bloco declarado fosse o certo.

**Um defeito anterior apareceu no caminho.** Desde que o front deixou o mock (§31), as seções vêm da API — e a API não conhece `painel`, que é assunto da tela. O campo morria no mapeamento, e os painéis de quantidades, ATA e valor **não apareciam mais**. Nenhum teste percebeu porque nenhum testava a seção *depois* da volta pelo servidor. `painelDaSecao(tipo, codigo)` faz a junção pelo código, e o teste que o guarda diz por que existe.

**`FormField` ganhou `htmlFor`.** O rótulo não envolve o controle — vem antes, como irmão —, então sem ligação explícita não havia associação nenhuma. Os campos deste painel passaram a usá-lo, e os demais ficaram como dívida aberta. **Fechada no mesmo dia, no §33:** a ligação passou a ser automática, por contexto, e alcança os 49 campos.

## 33. O ciclo de vida do processo sai do mock, e a cobertura deixa de ter exclusões

Ao auditar o Bloco 10 a pedido, apareceram **três defeitos da mesma família**: o dado passou a vir do servidor e a escrita continuou na fixture.

| Onde | O que acontecia |
|---|---|
| **Encerrar / reabrir processo** | `processoOuErro` procurava em `processosFixture`. Todo processo criado pela API caía em "não encontrado" — o botão da tela de detalhe **estourava** |
| **Editar usuário** | `atualizarUsuario` procurava em `usuariosFixture`. A lista já vinha do servidor: editar qualquer pessoa real falhava |
| **Salvar a configuração do órgão** | Gravava na fixture e a tela dizia "salvo". Recarregar desfazia — e este é o pior dos três, porque **parecia funcionar** |

Os três foram para a API. O backend ganhou `CLOSED`, `POST .../closure` e `POST .../reopening`, com a regra de produto onde ela pertence: **documento pendente não impede o encerramento, exige justificativa** — e quem sabe o que falta é o servidor, que conhece os documentos concluídos. `exigeJustificativaParaEncerrar` saiu do front-end: manter a regra dos dois lados é como eles divergem.

**A cobertura não estava em 100%.** Estava em 100% *do que o gate media*. `lib/api/client.ts` e `lib/api/hooks.ts` estavam excluídos desde o Bloco 7, com justificativa registrada no §27 — um era "o mock encolhendo", o outro "invólucro do TanStack". As duas envelheceram: **22 das 58 funções da fachada já falavam com o servidor**, e as escolhas de invalidação dos hooks são regra de produto, não de biblioteca (citar o PCA grava texto no documento, e por isso precisa invalidar as seções e o corpo).

Excluídas, elas escondiam exatamente os defeitos acima. **As exclusões acabaram** — o gate cobre `lib/**` inteiro, em 100% de linha, branch, statement e função.

Cobrir revelou três trechos **sem caminho de execução**, e eles saíram em vez de ganharem teste: a busca da prefeitura por id em `montarSessao` (só quem está logado edita o próprio perfil), o fallback `?? []` do histórico de versões (todo documento tem histórico desde a criação) e um `pendingDocuments` público que ninguém chamava.

**Rótulo sem campo.** `FormField` renderiza o `<label>` como irmão do controle. Sem ligação explícita não havia associação nenhuma em **47 dos 49 campos do produto**. *Correção de 22/08/2026, medida depois:* o efeito não era "campo sem nome nenhum" — quase todo controle tem `placeholder`, e o leitor de tela anunciava o placeholder. O defeito é real e menor do que a primeira redação deste parágrafo dizia: placeholder **não é rótulo** — ele some quando a pessoa começa a digitar, e some justamente para quem precisa reler o que o campo pede. A ligação é por `aria-labelledby` a partir de um contexto, e não por `htmlFor`, porque um `FormField` pode envolver mais de um controle — dois elementos com o mesmo `id` seriam DOM inválido, e o segundo voltaria a ficar sem nome. `aria-label` escrito à mão continua vencendo. Um teste prova a ligação para **cada tipo de controle**, porque um controle novo entraria sem nome e ninguém notaria.

**Cinco `saiEm` apontavam para blocos errados.** Timbre, cabeçalho e rodapé diziam "Bloco 10", que não os entrega — foram para o 11.1, com os templates publicados. Parecer do DFD e indicadores não tinham bloco nenhum, e por isso o plano ganhou o **Bloco 12**, que é o endereço do que a interface ainda fabrica. O guarda-corpo exige o formato "Bloco N" e é o que impede a lista de virar permanente; ele não tem como cobrar que o bloco declarado exista.

## 34. O que os guarda-corpos não alcançavam

A segunda auditoria do Bloco 10 não procurou defeitos: procurou **o que os testes existentes não conseguiriam ver**. Achou três coisas.

**O e2e de acessibilidade nunca tinha visitado uma tela de formulário.** Visitava login, painel e lista. Agora visita também `/processos/novo`, `/configuracoes`, o editor de documento e o detalhe do processo — quatro páginas onde os campos vivem.

**Mas ele não teria pego o defeito de rótulo, e isso foi medido, não suposto.** Com a associação removida de propósito, o axe relata exatamente o mesmo resultado: ele aceita `placeholder` como nome acessível. Duas consequências. A primeira é que o parágrafo do §33 sobre "anunciados como caixa de edição e nada mais" estava **errado** e foi corrigido — o leitor de tela anunciava o placeholder. O defeito continua sendo defeito, porque placeholder some quando a pessoa começa a digitar, e some justamente para quem precisa reler o que o campo pede. A segunda é que o guarda daquela regra é o teste de unidade, controle a controle, e isso está escrito nos dois lugares para ninguém confundir de novo.

**A exceção de `color-contrast` descrevia um problema menor do que o real.** Ela dizia "12 no painel e 6 na lista, todas na sidebar navy" — porque a varredura nunca tinha visitado formulário. Nas telas novas aparecem violações em **superfície clara**, e piores que as da sidebar:

| Token | Sobre | Razão | Onde aparece |
|---|---|---|---|
| `text-text-faint` `#cbd5e1` | `#f1f5f9` | **1,35:1** | atalho ⌘K |
| `text-text-faint` `#cbd5e1` | branco | **1,48:1** | "Não definido" no resumo do processo |
| `text-text-muted` `#94a3b8` | `#f8fafc` | **2,45:1** | passos do formulário |
| `text-text-muted` `#94a3b8` | branco | **2,56:1** | rótulos do resumo |

A WCAG AA exige 4,5:1. **A decisão de quem mantém os tokens foi corrigir**, e ela veio no mesmo dia:

| Token | Antes | Agora | Pior razão em superfície clara |
|---|---|---|---|
| `--color-text-3` | `#64748B` | `#4E5A6E` | 4,34 → **6,37** |
| `--color-text-muted` | `#94A3B8` | `#556074` | 2,45 → **5,79** |
| `--color-text-faint` | `#CBD5E1` | `#5F6B80` | 1,35 → **4,91** |

`text-3` entrou junto sem ter sido pedido, e o motivo é que sem ele a escala ficaria fora de ordem — o nível mais escuro dos três seria o mais claro na tela. A escala continua com três níveis distintos; ela só deixou de ter níveis ilegíveis.

**`color-contrast` passou a valer no gate**, e a exclusão que sobrou é **por token, não por página**: só o que estiver sobre o navy (`text-on-dark-*`, de 2,65:1 a 3,73:1) fica de fora, porque corrigi-lo é mexer na paleta da sidebar. Excluir a `<nav>` inteira por seletor apagaria as outras regras graves justamente onde fica a navegação.

**O gate morde**: com o token antigo de volta, a suíte reprova em cinco telas.

**E ele achou um defeito de verdade no primeiro uso.** O cartão de documento bloqueado usava `opacity-70` no contêiner inteiro. A 70% os cinzas caem para ~3,2:1 — e o que ficava ilegível incluía a etiqueta "Requer ETP e TR", ou seja, exatamente a frase que explica por que o cartão está bloqueado. Trocado por `bg-ice`: a distinção visual continua, o texto volta a ser legível.

Esse defeito aparecia como **teste intermitente** — reprovava em duas de cada três execuções da suíte inteira e passava sempre quando rodava sozinho, porque quantos cartões estão bloqueados depende de a consulta de documentos ter respondido ou não. É o pior formato de defeito: some quando se vai investigá-lo. Cinco execuções seguidas da suíte, 20/20, depois da correção.

**Código morto que mentia.** `getProximoNumeroProcesso` devolvia `PROC-2024-091` de um contador de fixture, enquanto o servidor emite `PROC-2026-000014`. Nenhuma tela o usava — mas ele estava exportado, com hook e chave de cache, esperando alguém chamá-lo. Saiu, junto com `db.usuarios`, `db.prefeituras` e três contadores que ninguém lia mais.

## 35. O arquivo passa a existir na tela, e três rótulos meus estavam errados

O Bloco 11.1 fez o servidor imprimir DOCX e PDF de verdade. A tela continuou mostrando o que fabricava — e é a mesma família de defeito que este projeto já corrigiu três vezes: **o dado passou a existir de um lado e o outro seguiu inventando**.

| O que a tela mostrava | De onde vinha | Agora |
|---|---|---|
| Formato (`"DOCX + PDF"`) | Constante por tipo de documento, igual para todo processo | Os formatos que foram impressos |
| Tamanho (`"196 KB"`) | Constante por tipo, no catálogo | Os bytes que o servidor mediu |
| Identificador (`DOC-2024-0159`) | Contador local | O identificador da geração no servidor |
| Botão de download | `showToast("disponível na integração com o backend")` | Baixa o arquivo, autenticado |

**O download não podia ser uma âncora.** `href` apontando para a rota do arquivo daria **401** — a autorização vai no cabeçalho, e âncora não leva cabeçalho. Os bytes vêm por `baixarProtegido`, que passa pela mesma renovação de token das demais chamadas; o nome do arquivo vem do `Content-Disposition`, porque é o servidor que sabe o número do processo e a versão.

**Um indicador parou de interpretar de volta o que a interface tinha escrito.** `resumirDocumentos` somava armazenamento fazendo `parseInt("312 KB")` — número que a própria tela fabricou, formatado como texto e depois lido como número para virar métrica de painel. Agora soma os bytes.

**Três `saiEm` que eu mesmo tinha escrito estavam errados.** Em 22/08 movi timbre, cabeçalho e rodapé para o "Bloco 11", dizendo que "nascem com os templates publicados". O 11.1 publicou template de **layout** — margem, fonte, tamanho — e não configuração por órgão. Foram para o Bloco 12, que ganhou um passo (12.2b) descrevendo o que falta de verdade: onde o brasão mora, e como o layout do órgão convive com um template que é imutável de propósito.

**E faltava um guarda.** O `contracts/openapi_v1.json` daqui ficou dois passos atrás do que o back-end publicava, e nada avisou: `npm run tipos` é manual, e tipo velho não dá erro de compilação — ele descreve um servidor que não existe mais, e a tela só descobre em produção. Agora um teste compara os tipos gerados com o contrato versionado, e `npm run contrato:conferir` compara o contrato com o do back-end. O teste alcança a metade local; a outra depende dos dois repositórios lado a lado, e isso está escrito nele.

## 36. Primeiro acesso: a tela deixa de pedir a senha de outra pessoa

O back-end passou a sortear a senha de quem é cadastrado (ADR-021). A tela pedia essa senha ao coordenador — e ela ficaria valendo para sempre, conhecida por quem a digitou.

**O campo "Senha inicial" saiu dos dois formulários.** No lugar, depois de cadastrar, a senha sorteada aparece **uma vez**, com botão de copiar e o aviso de que não volta a aparecer. É o único instante em que ela existe fora do hash: quem fecha a caixa sem anotar precisa recadastrar ou usar a recuperação por e-mail — e o componente diz isso antes, não depois.

**A troca no primeiro acesso substitui a aplicação inteira**, e não é mais um aviso dentro dela. O servidor recusa qualquer outra rota enquanto a senha for provisória; sem esta tela, a primeira ação daria **403** e pareceria falta de permissão.

**É a única trava do produto que não "orienta e deixa seguir" (§24).** A diferença é de quem é a decisão. As outras travas tirariam do servidor uma escolha que é dele — encerrar processo com pendência, contratar fora do PCA. Esta não tira decisão nenhuma: ela impede que **outra pessoa**, quem cadastrou e leu a senha, trabalhe como se fosse ele.

**Os impedimentos são ditos, não só desabilitados.** Senha curta, confirmação diferente e "repetiu a provisória" têm mensagem própria no `aria-describedby` do botão — o guarda-corpo nº 7 aplicado a uma tela que, por definição, é a primeira que a pessoa vê.

## 37. O primeiro uso real: a senha que ninguém viu, o perfil que ninguém alcançava

O §36 foi escrito contra o contrato, não contra alguém usando o produto. O primeiro teste real derrubou três coisas dele.

**A senha sorteada nunca aparecia.** O banner das credenciais era montado **dentro** do painel de cadastro, e o mesmo `onSuccess` que o preenchia chamava `setNovo(false)` — ele nascia desmontado. O servidor era gravado no banco e ninguém conseguia acessá-lo. O mesmo defeito, linha por linha, estava na aba de servidores das Configurações. Agora o banner vive fora do painel, e há teste de tela que fecha o painel e cobra a senha na tela depois disso.

**A senha sozinha não era o que precisava ser entregue.** Mostrar só a senha obrigava quem cadastra a lembrar sozinho de que se entra com o CPF. O componente passa a mostrar o par — acesso e senha — com um botão que copia os dois de uma vez.

**A trava do primeiro acesso vira aviso (ADR-022).** A tela que substituía a aplicação inteira saiu; no lugar, uma faixa no alto com o caminho da troca a um clique e um "Agora não" que vale enquanto a aba estiver aberta. Isto reverte o §36 na parte da trava e realinha o primeiro acesso com a regra do produto (§24): a plataforma orienta e não trava. O §36 abria exceção a ela; esta seção fecha a exceção. O argumento de segurança do §36 continua verdadeiro — durante a janela, quem cadastrou pode agir como a pessoa —, mas a trava não fechava essa janela: ela começa quando a senha é entregue, fora do sistema, e recusar tudo a quem já provou a credencial só empurrava a pessoa a trocar sem ler o que assinou.

**Ninguém alcançava o próprio perfil.** O menu do usuário escondia "Meu Perfil" para o `admin_geral` — e a página, quando alcançada, editava um objeto em memória: recarregar apagava tudo. Agora o cartão do usuário na barra lateral leva ao perfil, para todo perfil de acesso, e a página mudou de natureza: **os dados cadastrais são leitura**. Nome, CPF, matrícula e decreto compõem o registro dos processos que a pessoa assina; quem os altera é a administração, em Servidores, e a tela diz isso. O que é da pessoa — a foto e a senha — ela muda ali.

**A foto de perfil não viaja no JSON.** Vem de rota autenticada, o que impede apontar o `src` de um `<img>` direto para ela: os bytes são buscados com o token e viram object URL, revogado quando a foto muda. Um componente só (`FotoDePerfil`) atende barra lateral, perfil e ficha do servidor — repetir esse arranjo em cada tela é como uma delas acaba mostrando iniciais para quem já pôs foto.

**A administração redefine a senha de quem esqueceu.** Ficha do servidor aberta pela listagem, com confirmação antes: a senha atual deixa de valer e as sessões abertas caem. A senha nova aparece no mesmo componente de credenciais, uma vez.

**Dois campos do contrato eram descartados na tradução.** `mapearSessao` não copiava `registrationNumber` nem `appointmentDecree`, e a tela de perfil mostrava "—" para dois dados que o servidor conhece desde sempre. É a mesma família de defeito do §33 e do §35 — o dado passou a vir do servidor e este lado continuou inventando —, agora com teste que fixa os dois campos.

**O piso da senha caiu de 12 para 8 caracteres**, por decisão do cliente (ADR-022). Os dois lados do limite estão em teste: enfraquecer um parâmetro de segurança sem verificação é como ele acaba enfraquecido de novo, sem ninguém decidir.

## 38. A linha inteira abre a ficha, e o CPF se revela sob pedido

**O nome deixa de ser hiperlink.** A linha inteira da tabela abre a ficha do servidor — clicar na matrícula ou na prefeitura faz o mesmo que clicar no nome. O nome continua sendo um `<button>`, agora sem sublinhado e na cor do texto: `<tr>` não recebe foco, e sem esse controle a ficha seria inalcançável pelo teclado. Ele não tem `onClick` próprio — o clique, inclusive o vindo do Enter, sobe para a linha; um segundo handler alternaria a ficha duas vezes e ela fecharia sozinha. O botão de desativar interrompe a propagação, senão desativar abriria a ficha de quem acabou de ser desativado.

**O CPF ganha um botão de revelar, e revelar é um pedido ao servidor (ADR-023).** Não é `toggle` de aparência: a listagem mascara no servidor, o número inteiro não chega à tela antes de alguém pedir, e cada pedido vira linha de auditoria com quem revelou, de quem e quando. Revelado, o botão sai — clicar de novo só geraria outra linha na trilha. Fechar a ficha volta ao mascarado: o número não fica guardado na aplicação.

A tela de servidores entrou na suíte de acessibilidade. É onde "abre no clique mas não no teclado" passaria despercebido.

**Duas correções no dia seguinte, do primeiro uso.** A caixa de credenciais mostrava como "Acesso" o CPF **mascarado** — `***.***.***-74` copiado e entregue não abre porta nenhuma. No cadastro, a chave passa a ser o CPF que quem cadastra acabou de digitar; na redefinição, a ficha revela o número (a mesma revelação da ADR-023, reaproveitada — uma linha na trilha, não duas). Se a revelação falhar, a senha continua aparecendo com a chave mascarada: perdê-la seria irreversível, e a chave a pessoa consegue de outro jeito.

E o botão do CPF virou de fato um botão de dois estados — antes ele sumia ao revelar, e não havia como voltar a esconder sem fechar a ficha. Ganhou `IconEyeOff`, `aria-pressed` e o par de rótulos. Ocultar não desfaz a revelação: mostrar de novo não repete o pedido ao servidor, porque a revelação já aconteceu e já está registrada.

## 39. Uma rolagem, um beco a menos e um número que não existe ainda

**O `sr-only` esticava o documento.** O shell é `h-dvh overflow-hidden` com o conteúdo rolando dentro do `main` — uma barra de rolagem, portanto. Havia duas, e a página terminava numa faixa branca. A causa: `sr-only` é `position: absolute`, e o `main` não era bloco de contenção de ninguém. Um aviso de leitor de tela no fim de um formulário longo aterrissava na sua posição estática, centenas de pixels abaixo da dobra, **fora** do `main` — e o documento crescia com ele. Medido: `documentElement.scrollHeight` 1077 numa janela de 720; com `position: relative` no `main`, 720. O ajuste é de uma palavra e vale para toda tela do shell, não só para o assistente.

**Palavra longa sem espaço arrastava a tela.** O resumo lateral repete o que foi digitado; sem `break-words`, 120 caracteres sem espaço empurravam o painel 549 px para fora. Rolagem horizontal esconde conteúdo sem avisar.

Nenhum dos dois aparece em teste de componente — jsdom não faz layout. Foram para o Playwright, e os três testes falham com a correção revertida.

**"Será definido pelo servidor" saiu.** Ambíguo justamente aqui: nesta plataforma *servidor* é a pessoa que usa o sistema. E vinha em monoespaçada destacada — a formatação reservada a identificador de verdade (`PROC-2026-000007`), o que fazia parecer que já existia um número. Virou "Gerado na criação", em texto secundário.

**Órgão sem secretaria era um beco.** O seletor trazia só "Selecione a secretaria...", "Continuar" ficava desabilitado e a tela não dizia por quê nem quem resolve. O servidor **exige** a secretaria — é dela que sai a lotação do processo —, então a saída não é liberar o passo, e sim dizer de quem é a próxima ação: o coordenador recebe o link para Configurações; quem não cadastra secretaria recebe o recado de pedir a ele. É a §24 aplicada a um caso em que orientar não é opcional.

## 40. A trilha do processo passa a existir (12.1)

O passo dizia que a trilha "vive em memória do navegador". Ao implementar, a premissa se mostrou pior: **nenhuma tela a mostrava**. `getTrilha`, `EVENTO_LABEL` e o campo `trilha` das fixtures eram código morto — dez processos de fixture carregavam uma trilha inventada que ninguém lia. A metade de front do 12.1 não foi trocar a fonte: foi a trilha passar a existir.

**Ela mostra o que o servidor registrou, e só.** Criação, edição, encerramento e reabertura, do mais recente ao mais antigo, com quem agiu, quando e por quê. Uma ação que a tela ainda não conhece não vira linha em branco: é filtrada, e há teste para isso — o servidor pode ganhar ações novas antes desta tela.

**Evento sem autor admite a lacuna.** Os eventos gravados antes de o nome passar a ser guardado aparecem como "Autor não registrado". Atribuí-los a alguém para não deixar o campo vazio seria inventar quem agiu — e verifiquei contra o servidor real que é exatamente isso que acontece com os processos que já existiam.

**Sumiram os registros paralelos.** Encerrar e reabrir gravavam um evento local *além* de chamar o servidor; retificação e regeração gravavam só local. Os dois primeiros eram duplicata — o servidor já registra, com a justificativa. Os dois últimos continuam registrados onde o servidor os grava: **no histórico de versões do documento**, que é onde pertencem. Duplicar em dois lugares é como os dois passam a divergir.

**A justificativa da troca de modalidade deixou de ser descartada.** A plataforma calcula qual documento deixou de ser cabível e por quê; esse texto ia para a trilha em memória e morria ali. Agora acompanha a edição como `changeNote` e é o servidor que o registra — a trilha dizia que o processo mudou sem dizer por quê, que é metade do registro.

## 41. O painel conta o acervo (12.3)

As contagens do painel e o resumo de Documentos saíam de `lib/mocks`: a tela mostrava zero com dois processos no banco, e listava um acervo que nunca existiu. Marcar como sintético segurou a mentira enquanto o servidor não respondia; agora ele responde.

**Duas chamadas, porque são dois assuntos.** Quantos processos existem e em que estado é pergunta da contratação; quantos arquivos foram impressos, quando e ocupando quanto é pergunta do acervo. Nenhum módulo do servidor conta pelo outro — a soma acontece aqui, que é onde o painel mora (ADR-025).

**O que sumiu junto.** O recorte por prefeitura feito nesta camada perdeu o objeto: quem recorta é o servidor, e há teste de integração cobrando que o acervo da vizinha não apareça. Saíram `escopoPrefeituras`, `prefeiturasVisiveis`, `noEscopo`, `calcularIndicadores` e `resumirDocumentos` — e os testes que verificavam o filtro removido. Manter o bloco exigiria remontar na fachada o filtro que acabou de sair, só para ter o que testar.

**O armazenamento vem em bytes.** Converter para MB é decisão de apresentação: fixá-la no servidor obrigaria a tela a desfazer a conta para mostrar KB quando for pouco.

**Um tipo de documento que a interface não conhece é filtrado, não vira linha sem rótulo.** O servidor pode ganhar um tipo antes desta tela — e há teste para isso.

O selo "ainda não vem do servidor" saiu do painel e da tela de Documentos, e `indicadores` saiu de `sintetico.ts`. O aviso não deve sobreviver ao dado real.

## 40. O timbre da prefeitura sai do mock e vai para o papel

Brasão, cabeçalho e rodapé eram fabricados por `tenantDa()` e "salvos" num objeto em memória: a prefeitura configurava, recarregava e sumia — e nenhum documento saía com aquilo. Agora vão ao servidor e saem impressos em todo DOCX e PDF (ADR-026).

**O brasão é arquivo, não `data:` URL.** Sobe por rota autenticada e volta por object URL, como a foto de perfil. A versão anterior lia o arquivo com `FileReader` e guardava a string na tela — o que explica por que ele nunca chegou a documento nenhum.

**O interruptor "Documentos Timbrados" saiu.** Ele não desligava nada, e era ele próprio configuração inventada: órgão sem timbre cadastrado gera documento sem timbre. A prévia deriva o estado do que existe — se há brasão ou texto, há timbre.

**O botão "Salvar Configurações" da aba de identidade saiu junto.** Enviar o brasão já grava; um botão que não grava é a mesma promessa vazia que o §37 tirou da tela de perfil.

Com isso `sintetico.ts` perde três dos quatro campos que ainda listava. Sobra `parecerDfd`, que espera um modelo de verdade — e nesse caso o aviso está certo: a tela mostra achados fixos e diz isso.

## 41. Os itens do DFD passam a ter onde ser informados

A tela dizia que o DFD estava anexado e a consolidação ficava vazia para sempre — não havia por onde informar item nenhum. E a frase que explicava isso dizia que a plataforma guardava o arquivo "como comprovação", o que soa como se o DFD não servisse para mais nada.

**O DFD é a base dos documentos do processo**, e será a base da geração de texto quando houver modelo. O texto foi corrigido para dizer isso.

**O que faltava é outra coisa: a lista de itens.** Quantidade por secretaria é dado estruturado, e é dela que saem a consolidação, o painel de quantidades do ETP e a Cotação. Ler item de PDF assinado é OCR — e adivinhar quantidade em documento que vira edital não é algo que a plataforma deva fazer. Então há onde informar.

O formulário é **um DFD por secretaria**, e não um só: a consolidação existe justamente para somar o que três secretarias pediram separado, e é a secretaria de origem que se pergunta quando os pedidos divergem. A quantidade usa o `QuantityInput` do DS e chega ao servidor como número — mandar `"1.200"` faria o servidor ler 1,2, que é o defeito que o import do PCA já teve uma vez.

O endpoint já existia desde o Bloco 7 (`POST /procurement-processes/{id}/dfds`, com itens). O que faltava era inteiramente a tela.
