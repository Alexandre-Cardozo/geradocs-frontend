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
- Limitação conhecida do mock: o "db" em memória reseta a cada carregamento de página, então um processo recém-criado só existe na sessão que o criou — hard refresh/deep-link de um id novo mostra "não encontrado" (esperado; processos das fixtures sobrevivem). Persistir em `localStorage` fica para quando fizer sentido.

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
