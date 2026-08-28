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

O deploy é **static export** (`output: "export"`, com o `basePath` `/GeraDocsFrontend` declarado pela publicação — veja §71) publicado no GitHub Pages via GitHub Actions. Nesse modo o Next só gera HTML para os params listados em `generateStaticParams`; **rotas dinâmicas com id de runtime são impossíveis** — um processo novo (`PROC-2024-090`) nunca existiria no build e o acesso caía em 404 (era o bug: o `generateStaticParams` fixo em `{ id: "1" }` derrubava todo processo que não fosse "1", inclusive os das fixtures).

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
- A rota estática `/redefinir-senha?token=` completa o link enviado por e-mail. O backend deve apontar para a URL do ambiente: `http://localhost:3000/redefinir-senha` no local, e a URL publicada (com o prefixo do Pages) em produção.
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

## 42. O arquivo do DFD passa a existir (13.2)

O §41 deu onde informar os **itens** do DFD. O arquivo continuava sendo só um nome: a plataforma anotava `DFD-CE-003.2026.pdf` e descartava os bytes. Quem fosse conferir o processo depois não tinha como rebaixá-lo, e o modelo de IA — que vai usar o DFD como base — não teria o que ler.

Agora o formulário de itens tem também o campo de arquivo (PDF ou DOCX), e a tela do processo lista os DFDs anexados com secretaria, data, tamanho e download.

**O arquivo é opcional, e isso é decisão, não omissão.** Há processo em que o servidor sabe o número do DFD e ainda não tem o PDF em mãos; exigi-lo transformaria um facilitador em bloqueio, que é o oposto do que o Bloco 13 existe para garantir. Quando não há arquivo, a linha diz "Sem arquivo anexado" em vez de oferecer um botão que não faz nada.

**Anexar de novo versiona, não substitui** (ADR-028). Por isso a tela mostra uma lista com a data de cada anexo: é ela que responde "qual DFD embasou o ETP daquela data" — a pergunta que um órgão de controle faz.

O download passa pela requisição autenticada e vira `blob:`, como o dos arquivos gerados: `href` direto na rota daria 401, e a pessoa veria um download quebrado sem explicação.

**Um efeito colateral no ambiente de teste.** O anexo virou `multipart/form-data`, e o primeiro teste com arquivo ficou pendurado até estourar o tempo. A causa não era o código: o `fetch` do ambiente é o do Node, e ele reconhece corpo multipart pelas classes dele — com o `Blob` e o `File` do jsdom no lugar, o envio nunca chega a virar requisição. A `FormData` foi junto pelo mesmo motivo, e é buscada pelo `Response` porque o jsdom tomou o nome global: instalar a cópia do `undici` do npm traria *outra* classe, que o `fetch` embutido não reconheceria. Está em `lib/teste/setup.ts`, comentado — a suíte inteira de JSON continuava verde, e só multipart depende disso.

## 43. A IA aparece como opcional, e não some quando não há modelo (13.5)

A tela oferecia "Gerar com IA" a todo mundo. Com `geradocs.ai.provider=none` — o padrão, e o que roda hoje — o clique devolvia `503`: **o servidor descobria por erro que o facilitador não existe.**

Agora o editor de seção mostra os dois caminhos lado a lado. "Escrever à mão" vem primeiro e diz o que é: o caminho normal, e completo. "Gerar com IA" vem ao lado, e quando não há modelo aparece desabilitado com o motivo escrito **antes** do clique, anunciado por `aria-describedby` — botão desabilitado sem motivo anunciado é motivo que só existe para quem enxerga a tela.

**"Escrever agora" é um botão de verdade**, e não um rótulo: ele leva o cursor ao campo. Apontar sem levar deixaria a ação pela metade.

**Enquanto a resposta de `/ai/status` não chega, o botão fica desabilitado**, com "Verificando...". Habilitar por otimismo devolveria exatamente o `503` que este passo existe para evitar.

**A tela não sabe qual provedor está ativo, e não deve saber.** O servidor responde só `{ available }` (ADR-029): publicar o nome convidaria a tela a ramificar por provedor, que é o que o registro do back-end existe para impedir. Quando o adaptador real entrar, esta tela passa a oferecer a IA **sem mudança de código**.

O handler padrão dos testes e a rota do e2e respondem `available: false`. É deliberado: o caminho feliz da suíte é a plataforma inteira funcionando **sem assistência nenhuma** — que é o estado em que ela está hoje e a garantia que o cliente pediu.

## 44. O "banco" do protótipo era estado morto — e escondia uma omissão na trilha

Auditoria de fechamento dos blocos. `lib/api/client.ts` ainda mantinha o banco em memória do protótipo: `processos`, `documentos`, `versoes`, `corpos`, `estatisticas`, `resumoDocumentos`, `sessao`. **Nenhum deles era lido.** As telas passaram a perguntar ao servidor entre os Blocos 9 e 12, e as escritas continuaram, alimentando um estado que ninguém consultava.

Estado morto não é inofensivo: o próximo a ler o arquivo acredita nele. As sete estruturas saíram, e `lib/mocks/fixtures.ts` caiu de 467 para 71 linhas — sobra o `parecerDFDBase`, único ainda declarado como sintético, que sai quando o modelo de IA entrar.

**Havia um leitor**, e ele revelou uma omissão real. `docsGeradosDo()` lia `db.documentos` para calcular o impacto da troca de modalidade. Recarregada a página, essa lista era vazia para todo processo real — mas o efeito não aparecia na tela, e sim na **ausência** dele: o campo `jaGeradosQueDeixamDeSerCabiveis` era calculado e **descartado** ao montar o texto da trilha.

Ou seja: a tela avisava "o Edital já gerado deixa de ser cabível", e a trilha — que é quem responde ao controle meses depois — não dizia nada. Duas correções, e a segunda é a que importa:

1. `docsGeradosDo()` passou a ler o acervo do servidor.
2. **O documento já gerado que perde cabimento entra no texto da trilha**, com ou sem justificativa. É o fato mais grave da troca: o arquivo continua no acervo contradizendo o próprio processo.

Junto saíram `proximaVersao`, `entradaDeHistorico`, `empilharVersao` e `notaDaVersao` de `lib/dominio/versionamento.ts`: quem monta o histórico é o servidor desde o Bloco 10, e a nota de cada versão vem pronta em `version.note`. Testar função que ninguém chama dá cobertura, não garantia — os testes delas saíram junto.

## 46. "Prefeitura" vira "Entidade", e o cadastro passa a pedir só o nome

Quem contrata o GeraDocs nem sempre é uma prefeitura: pode ser uma câmara, uma autarquia ou um consórcio intermunicipal. A interface — e o domínio inteiro do front — chamava todos de *prefeitura*, o que obrigava metade dos clientes a se reconhecer no nome errado, e o administrador da plataforma a cadastrar uma câmara num formulário intitulado "Cadastrar Prefeitura".

**Decisão: o conceito passa a se chamar `Entidade`,** do rótulo ao identificador. A troca é mecânica e vale para as duas pontas: `Tenant.orgao` → `Tenant.nome`, `Usuario.prefeituraId` → `entidadeId`, `usePrefeituras` → `useEntidades`, `/admin/prefeituras` → `/admin/entidades`. Nomes próprios ficaram intactos: a "Prefeitura Municipal de Ecoporanga" continua se chamando assim — o que mudou foi o substantivo genérico, não o nome de quem já está cadastrado.

A API nunca falou "prefeitura": o backend expõe `/organizations` desde sempre. Era o front que traduzia o contrato para um vocabulário mais estreito que ele.

**O cadastro de entidade pede só o nome.** Pedia também a unidade administrativa, e quem cadastra — o administrador da plataforma — não a conhece: quem sabe qual é a unidade, quais são as secretarias, qual o timbre e qual o PCA é o coordenador da entidade, e todos esses já são configuração dele. O campo continua no modelo, porque o servidor o guarda e a sidebar o mostra onde ele existe; o que saiu foi a pergunta feita a quem não tem a resposta.

**O cadastro pede o tipo, e é a única coisa além do nome.** O contrato já tinha `entityType` (`PREFEITURA`, `CAMARA`, `AUTARQUIA`, `FUNDACAO`, `CONSORCIO`, `OUTRO`) e o front o ignorava — e `Organization` no backend faz `entityType == null ? PREFEITURA`. Cadastrar uma câmara sem informar o tipo a gravaria como prefeitura: o erro de nomenclatura de volta, agora invisível, no banco. O tipo entrou no domínio (`Tenant.tipo`), sai na listagem e no resumo do painel, e é a razão pela qual o formulário tem dois campos e não um.

**O perfil "Administrador Geral" saiu do formulário de servidores.** A conta nasce com a inicialização do banco e é única; oferecê-la no seletor prometia um segundo administrador que não deve existir. Pela mesma razão o admin geral **não aparece na listagem de servidores**: ele não é servidor de entidade alguma, e listá-lo colocava um botão de desativar ao lado da única conta capaz de administrar a plataforma. Com isso a entidade virou obrigatória em todo cadastro desta tela — todo servidor tem lotação.

**O painel do sistema deixou de contar sem mostrar.** A lista de entidades dizia o nome e "2 servidor(es)"; para saber quem eram os dois era preciso ir a outra tela e filtrar. Agora a linha abre no clique e lista os usuários daquela entidade — nome, cargo, perfil e último acesso —, sem requisição nova: a lista de usuários já está em memória. Entidade sem ninguém cadastrado diz isso e oferece o caminho, em vez de abrir uma lista vazia.

**O resumo da entidade não conta secretarias.** Seria o número mais natural para exibir ali, e é exatamente o que a listagem de entidades não traz — `GET /organizations` não devolve os departamentos. "0 secretaria(s)" seria um número inventado para toda entidade do sistema.

## 47. Desativar deixou de poder quebrar o que estava inteiro

Três defeitos da mesma família, achados ao usar a área de administração.

**A unidade administrativa saiu.** Era o segundo campo do cadastro de entidade e não servia a nada: nenhuma tela a usava para decidir coisa alguma, a sidebar a exibia como legenda do nome e o cadastro a pedia a quem não a conhece. Saiu de `Tenant`, do cadastro e da listagem. No lugar dela, a sidebar mostra **o tipo da entidade** — que é o que responde "o que é este órgão". O campo continua existindo no servidor, e `atualizarEntidade` o reenvia como está: nenhuma tela o mostra, e apagá-lo de passagem seria decidir por quem não foi perguntado.

**Entidade com servidor vinculado era desativável — e foi.** A entidade sumia da listagem e os servidores dela continuavam lá, agora exibindo um UUID cru na coluna "Entidade", porque o nome vinha de uma busca que não achava mais nada. Os processos daquele órgão ficavam órfãos. Agora `DeactivateOrganizationUseCase` recusa enquanto houver usuário ativo vinculado, e a tela nem deixa clicar: o botão nasce desabilitado dizendo quantos servidores seguram a entidade.

**Servidor com processo em andamento também não é desativado.** Desativar revoga a sessão e tira a pessoa do sistema; o processo que ela conduzia ficaria aberto e sem responsável, com documentos pela metade e ninguém a quem cobrá-los. A regra é do backend, porque é lá que estão os processos: `access` declara a porta `ProcessWorkloadPort` e `procurement` — que já dependia de `access` — a implementa. A seta de dependência continua apontando para um lado só, e o `ArchitectureTest` cobra isso. Processo **encerrado** não segura ninguém: ele já saiu da plataforma.

**A recusa saiu do toast.** Quando o motivo é regra de negócio, três segundos não bastam: a tela de servidores passou a exibir a mensagem do servidor num aviso fixo acima da lista. "Não foi possível desativar" deixaria a pessoa sem saber o que fazer a seguir; "responde por 2 processo(s) em andamento" diz onde mexer.

**O identificador da entidade saiu das telas.** Aparecia sob o nome na listagem de entidades e como valor da coluna "Entidade" na de servidores. Ninguém digita um UUID em lugar nenhum do produto — e onde ele aparecia era justamente onde faltava um nome.

## 48. O cadastro de secretarias passa a ser feito com o teclado, e o nome deixa de ser imutável

A tela pedia mouse para cada secretaria: digitar, largar o teclado, clicar. E o que fosse cadastrado com um erro de digitação só tinha uma saída — desativar e cadastrar de novo, deixando na trilha do órgão uma secretaria extinta que nunca existiu de fato.

**Enter cadastra.** No campo, `Enter` faz o que o botão faz. Quem prefere o botão chega nele com um `Tab` — não há nada focável entre os dois — e o `Enter` de lá é o do próprio botão. O botão continua desabilitado com o campo vazio, então o `Tab` também não passa por ele à toa.

**O nome passou a ser editável, na própria linha.** Um lápis ao lado da lixeira abre o campo com o nome atual; `Enter` confirma, `Esc` desiste, e os dois botões (✓ e ✕) fazem o mesmo para quem está no mouse. A edição acontece **na lista**, e não num diálogo: o que muda é uma palavra, e tirar a pessoa da lista para isso a faria perder de vista o que já existe — que é justamente o que evita cadastrar duas parecidas.

**Confirmar sem mudar nada não vira requisição.** Gravar o que não mudou subiria a versão do registro e apareceria na trilha do órgão como uma edição que não houve.

**A sigla é reenviada como está.** O `PATCH` troca o recurso inteiro; mandar só o nome apagaria de passagem um campo que ninguém pediu para mudar. É o mesmo cuidado que `atualizarEntidade` tem com a unidade.

**`Input` do DS ganhou `ariaLabel` e `autoFocus`.** O campo da edição não vive dentro de um `FormField` — o rótulo dele é a linha que está sendo editada —, e sem nome acessível chegaria ao leitor de tela como "caixa de edição" e nada mais; `placeholder` não é nome. A precedência já existia no `useRotuloDoCampo`: `aria-label` escrito à mão vence o rótulo visível, porque `aria-labelledby` sobrepõe `aria-label` e deixar os dois faria o texto à mão ser ignorado em silêncio. O campo de cadastro, que também não tinha nome nenhum, ganhou o seu no caminho.

## 49. O PCA consultado é o do exercício do processo, e a tela mostra os exercícios

A tela de PCA mostrava **um** plano e dizia "PCA do exercício"; o servidor, por baixo, consultava `latestPlan` — o plano de **maior ano** já importado, qualquer que fosse o processo. As duas coisas juntas produziam dois erros silenciosos: um processo de 2026 verificado contra o PCA de 2027 recém-importado, e um processo de 2027 verificado contra o PCA de 2026 porque o do ano ainda não existia.

**A pergunta foi pesquisada antes de programar.** O PCA de um exercício é elaborado no ano anterior (Decreto 10.947/2022) e descreve o que o órgão pretende contratar **naquele** ano; o ETP demonstra a previsão "no plano de contratações anual, **sempre que elaborado**" (Art. 18, § 1º, II). Item não previsto entra no plano **do próprio ano**, por revisão justificada — não se recorre ao plano do ano anterior. Logo, citar o PCA de 2026 numa contratação de 2027 não é um arredondamento: é afirmar uma previsão que aquele plano não faz.

**Decisão: a verificação usa o plano do exercício do processo**, e o exercício é o ano em que o processo foi aberto — não o ano de hoje. Isso resolve o caso legítimo que existe (o processo aberto em dezembro de 2026 e concluído em janeiro de 2027 demonstra previsão no PCA de 2026) e **mantém a citação estável**: gerar de novo, em 2028, o documento de um processo de 2026 devolve a mesma citação. Amarrar ao calendário faria a citação de uma peça já assinada mudar de significado sozinha.

**Sem plano do exercício, não há queda para outro ano.** O painel do inciso II passou a dizer qual ano falta — "Nenhum PCA de 2027 anexado" —, porque "nenhum PCA anexado" mandava procurar um plano que podia até existir, só que de outro exercício. O caminho continua sendo o mesmo: informar o item à mão, com a justificativa visível.

**A tela virou a lista dos exercícios.** Todos os planos importados aparecem, o do ano corrente vem marcado, e a ausência dele é um aviso — não algo que se descobre processo a processo, no painel do inciso II. Importar sobre um exercício que já tem plano avisa antes do clique que a substituição é integral. Os exercícios anteriores continuam ali porque é neles que os processos daqueles anos demonstram a previsão.

`GET /pca-plans` nasceu para essa lista; `GET /pca-plan` passou a significar "o plano do exercício corrente", que é o que o nome sempre prometeu. `PcaVerificationResponse` ganhou `exerciseYear` — sem ele a tela não teria como dizer qual ano falta.

## 50. A tela de PCA aceita a planilha como ela existe, e devolve o arquivo importado

Três coisas faltavam à tela, e as três apareceram no uso.

**Só CSV.** O órgão que tem o plano em XLSX — a maioria — precisava abrir a planilha e salvar de novo antes de importar. Agora a tela aceita **XLSX e CSV**, e o que ela não lê continua escrito: PDF não é lido, e o XLS antigo precisa ser salvo como XLSX. O leitor é do back-end (ADR-032), sem biblioteca de planilha.

**O arquivo ia embora.** A plataforma guardava os itens lidos e o nome do arquivo; os bytes, não. Cada exercício agora tem **botão de baixar** a planilha que foi importada — é o que permite conferir depois o que entrou. Plano importado antes disso não oferece download e diz por quê: prometer um arquivo que não existe é pior que não oferecer.

**A substituição era invisível.** Um plano por exercício, e importar de novo substitui por inteiro — plano se revisa durante o ano, e isso é previsto. O que não podia era acontecer em silêncio: a tela avisa **antes do clique** qual plano será substituído, com nome, contagem de itens, quem importou e quando, e diz que a troca fica registrada na trilha do órgão com o arquivo que saiu e o que entrou.

Cada linha da lista passou a mostrar **quem importou**: substituir um plano é ato de gestão, e a tela diz de quem foi sem obrigar a abrir a trilha.

O upload virou multipart e manda o arquivo **como veio**. Ler o conteúdo no navegador para mandar como texto — o que a tela fazia — quebraria o XLSX, que é binário, e jogaria fora o original que agora será baixado.

## 51. A tela diz como a planilha é lida, porque a leitura mudou

O PCA de um município real era recusado pela importação (ADR-033 do back-end): o plano chega como planilha de planejamento — `OBJETO, MODALIDADE, MÊS, TOTAIS` e uma coluna por secretaria —, e a plataforma exigia cinco colunas na ordem que ela inventou.

A leitura passou a ser **pelo cabeçalho da primeira aba**, e o texto da tela diz isso: quais títulos a plataforma procura (`código`, `descrição` ou `objeto`, `unidade`, `quantidade`, `valor` ou `totais`), que as demais colunas são ignoradas, que sem cabeçalho reconhecível valem as cinco na ordem, e que linha sem objeto — como a de totais — não vira contratação.

Instrução de formato que não corresponde ao que o programa faz é pior que instrução nenhuma: manda a pessoa editar a planilha para atender a uma regra que já não existe.

## 52. A tela de PCA passa a ser uma coluna, com a importação em cima

Duas correções de layout, pelo mesmo motivo: a página gastava largura com o que se lê uma vez e apertava o que se usa sempre.

**A explicação do inciso II saiu da faixa lateral.** Ela ocupava 360px em toda a altura da página para dizer quatro linhas — e era a lista de planos, que cresce a cada exercício, que ficava espremida a ponto de truncar o nome do arquivo e de quem importou. Virou rodapé: continua acessível, em duas linhas, sem tomar a largura de quem trabalha ali todo dia.

**A importação subiu.** Importar é a ação da tela; a lista é o resultado dela. Com a lista em cima, quem vinha anexar o plano do exercício descia a página para achar o formulário — e a lista tende a crescer, o que pioraria a rolagem a cada ano.

## 53. A listagem de processos termina no status, e sem o identificador interno

**A coluna do ícone saiu.** A linha inteira já abre o processo; o botão de seta ao fim repetia a mesma ação e era a única coisa que empurrava a tabela para além da largura da tela — a rolagem horizontal existia para mostrar um ícone.

**O acesso pelo teclado continua.** O objeto virou botão de verdade dentro da primeira célula, como na tabela de servidores: sem ele, quem navega por teclado não teria como abrir processo nenhum, porque `<tr>` não recebe foco. Sem `onClick` próprio — o clique, inclusive o do Enter, sobe para a linha, que trata; um handler ali navegaria duas vezes.

**O identificador saiu da listagem.** Era o UUID do processo, em monoespaçado sob o objeto: ninguém o digita, ninguém o cita em ofício, e ele ocupava uma linha em toda a tabela.

**Fica registrado o que falta:** a API devolve `processNumber` — "PROC-2026-000007" —, e o front o descarta no mapeamento; `Processo.id` guarda o UUID, e o comentário do tipo ainda diz "Formato PROC-AAAA-NNN". É esse número que um servidor usa para se referir ao processo, e hoje nenhuma tela o mostra.

## 54. O número do processo aparece, e a trilha para de ocupar a tela

**O número do processo passou a existir na interface.** A API sempre devolveu `processNumber` — `PROC-2026-000007` — e o mapeamento o descartava; o que a tela mostrava era o UUID. É o número que o servidor usa em ofício, despacho e e-mail, e ele agora está na listagem (onde estava o UUID) e no cabeçalho do processo. O UUID continua sendo a chave da URL e da API: o que ele não é, é identificador para gente.

Do lado do servidor, a numeração virou sequencial **por entidade e por exercício** (ADR-034): era uma sequência única da plataforma, e a numeração de cada órgão nascia com saltos que denunciavam o volume dos outros clientes.

**A trilha fechada mostra só o último evento.** A pergunta de quem abre o processo é "o que aconteceu por último"; o histórico inteiro é consulta, e ocupava metade da tela para respondê-la — cinco eventos empurravam tudo o mais para fora da vista. Quantos eventos ficaram guardados vai escrito no botão, para que ninguém precise abrir só para descobrir se há mais.

**"Autor não registrado" não é defeito de hoje.** O nome de quem age é gravado com o evento desde 25/08/2026 (V025 e ADR-024), e há teste de integração cobrando isso na criação e no encerramento. Os eventos que aparecem sem autor no banco de desenvolvimento são anteriores àquela data: a coluna não existia quando foram gravados, e preenchê-los agora com o nome atual do cadastro seria reescrever a trilha.

## 55. A troca de modalidade encosta na modalidade

"Trocar modalidade" era um texto azul solto na linha do número e do status, ao lado da tag da modalidade. Competia com o "Editar Dados" — dois azuis no mesmo cabeçalho, e o secundário com mais palavras que o principal — e parecia link perdido, não ação de um campo.

Virou um botão de ícone **colado na tag da modalidade**, com rótulo acessível e dica no ponteiro. Quem procura trocar a modalidade olha para a modalidade; e o cabeçalho volta a ter uma ação principal só, que é o que o container pede. É o mesmo padrão do lápis que renomeia a secretaria (§48) — dois lugares onde se edita um campo, com a mesma cara.

Enquanto o painel de troca está aberto, o lápis some: a ação já está em curso, e oferecê-la de novo abriria a pergunta de o que o segundo clique faz.

## 56. A demanda consolidada vira um bloco só, e o formulário recolhe

Três cartões empilhados — consolidação, DFDs anexados e o formulário de itens — respondiam a uma pergunta encadeada: *o que foi pedido*, *de onde veio* e *como acrescentar*. Separados, pareciam três assuntos, e o formulário aberto o tempo todo empurrava os documentos do processo para fora da tela.

Agora é **um cartão com três seções**, e o formulário fica **recolhido atrás de um botão**. Informar item é ato pontual — uma vez por secretaria —, não estado permanente da tela. Enquanto não há nada consolidado ele abre sozinho, porque aí é o próximo passo; e é justamente aí que não há "Fechar", que deixaria a tela sem saída.

**O campo de arquivo não era redundante — o rótulo é que dizia "DFD" para duas coisas diferentes.** O cadastro do processo guarda o **nome** do DFD (o assistente de criação pede um arquivo e fica só com o nome dele); o arquivo em si é gravado aqui, por secretaria (ADR-028). O rótulo passou a ser "Arquivo assinado desta secretaria", e a dica diz o que estava implícito: *é o único lugar onde o arquivo fica guardado*.

**Fica registrado o que falta:** o passo 2 do assistente de novo processo usa `FileUpload`, que devolve só o nome — o arquivo escolhido ali é descartado. A tela promete um anexo que não acontece, e é por isso que os DFDs deste processo aparecem como "Sem arquivo anexado" com um nome de PDF assinado ao lado. Corrigir exige mudar a criação para multipart, como já foi feito no PCA.


## 57. O DFD escolhido na abertura sobe com o processo

O passo 2 do assistente pedia o arquivo do DFD e ficava **só com o nome**: `FileUpload` devolvia `arquivo.name` e os bytes eram descartados na hora. O processo nascia dizendo "DFD-2026-014.pdf anexado", a lista de DFDs mostrava esse nome com "Sem arquivo anexado" ao lado, e não havia o que baixar — a tela prometia um anexo que nunca existiu (§56).

A criação virou **multipart** (ADR-035), como já era o import do PCA: o JSON vai na parte `dados`, o arquivo na parte `file`, e o servidor grava o DFD como primeiro anexo do processo assim que ele é criado. `FileUpload` ganhou `onArquivo`, que entrega o `File` de verdade — o `onChange` de nome continua onde estava, porque as outras telas que o usam (a ATA, por exemplo) ainda só anotam o nome.

**O cabeçalho do processo passou a baixar o DFD.** O nome do documento estava ali desde sempre, sem ação nenhuma; agora tem um "Baixar" ao lado, pela mesma rota autenticada dos demais anexos (`BaixarDfd`, compartilhado com a lista).

**"DFDs anexados" continua existindo, mas só a partir do segundo anexo.** Com um anexo só, a lista repetia, uma linha abaixo, exatamente o que o cabeçalho já dizia — e era esse o incômodo. Do segundo em diante ela responde algo que o cabeçalho não responde: *de qual secretaria veio cada um* e *qual versão embasou o ETP daquela data*. Apagá-la de vez custaria a consolidação de demanda vinda de várias secretarias (ADR-028), que é a razão de o formulário de itens existir.

O campo de arquivo do formulário de itens deixou de ser "o único lugar onde o arquivo fica guardado" — agora é o DFD **daquela** secretaria, para a demanda que vem de mais de uma. A dica e o teste foram corrigidos junto: a afirmação de §56 valia até esta mudança.

## 58. Os DFDs anexados viram um cadastro, e cada item sabe de qual DFD veio

O processo do cliente chegou com **seis DFDs**, cinco com exatamente o mesmo nome e nenhum arquivo guardado. Não foi uso errado: era o que a tela permitia. Informar itens só sabia *criar* um DFD, e a identificação vinha preenchida com o nome do arquivo do processo — então cada correção de quantidade e cada secretaria nova produziam mais uma linha idêntica, que não podia ser aberta, corrigida nem removida.

**Sim, mais de um DFD por processo faz sentido** — é a demanda consolidada. Três secretarias pedem o mesmo material, cada uma formaliza o seu DFD com os seus itens, e o órgão compra uma vez. O que não fazia sentido era tratá-los como uma pilha de anexos.

**O bloco virou cadastro.** Cada linha traz a secretaria que pediu, quantos itens trouxe e se tem arquivo; abrindo, mostra os itens daquele DFD e as ações sobre ele — informar/editar itens, anexar ou substituir o arquivo, baixar, remover. É o mesmo formato do cadastro de secretarias (§48), e aparece já a partir do primeiro DFD: o cabeçalho do processo mostra o nome e o download, mas não tem por onde corrigir nem remover nada.

**Todo item pertence a um DFD, e o formulário passou a dizer a qual.** O primeiro campo é o DFD destes itens: um dos já registrados, ou "registrar um novo". Escolhendo um existente, os itens dele entram no formulário e salvar **troca** os itens daquele DFD — nenhum outro é criado. Escolhendo novo, pede secretaria, identificação e o arquivo (opcional).

**A identificação deixou de ser adivinhada.** O campo pergunta como o processo se refere ao DFD — nº, ofício ou o nome do arquivo — e só se preenche sozinho com o nome do arquivo escolhido, quando há um. Era o preenchimento automático com o nome do DFD do processo que fabricava as linhas iguais.

**O DFD pode chegar depois.** Registrar o documento é um ato; informar o que ele pede é outro; e o PDF assinado é um terceiro, que às vezes só aparece no fim do processo. Os três são independentes agora — "Sem arquivo anexado" tem botão, e "Sem itens" também. No servidor, isso é ADR-036.

## 59. O DFD sai do bloco principal: ele é o cadastro, e nada mais

O cartão de dados do processo tinha um campo "Documento de Formalização de Demanda (DFD)" — um nome de arquivo, um só, editável junto com a descrição. Era o que restava de quando o caso previsto era um DFD por processo. Com o cadastro no lugar (§58), esse campo virou **um segundo lugar dizendo a mesma coisa, e dizendo menos**: numa demanda de três secretarias ele mostra o DFD de uma e cala os outros dois, e não havia como declarar ali nenhum dos demais.

**O campo saiu.** O cabeçalho do processo agora traz o que é do processo — descrição, secretaria requisitante, valor, responsável, objeto da demanda. Os DFDs ficam onde eles são vários: no cadastro, um por secretaria, com arquivo, itens e ações próprias. O download que estava no cabeçalho foi junto — cada linha do cadastro tem o seu.

**O assistente de novo processo continua aceitando um DFD**, e ele entra como o primeiro registro do cadastro, nomeado pelo próprio arquivo. Sem um campo no processo para declarar o nome, o nome do arquivo é o que existe — e é o que a pessoa reconhece.

**A consolidação vazia parou de falar em "o DFD do processo".** O que falta ali é sempre a mesma coisa, com DFD registrado ou sem nenhum: os **itens**, que não saem de um PDF assinado. A mensagem agora aponta para onde eles são informados — o cadastro logo abaixo, com o vínculo item ↔ DFD explícito.

No servidor, isso é ADR-037: `dfdFileName` saiu do processo, e a migração converte o nome que estava declarado em um registro do cadastro, para nenhum processo perder o que afirmava.

## 60. Registrar DFD e cadastrar item viram duas operações, e o vínculo fica explícito na tabela

O formulário anterior fazia as duas coisas de uma vez: escolher o DFD *e* digitar itens no mesmo lugar. Parecia econômico e era confuso — o DFD de uma secretaria entra no meio do processo, o de outra depois, e os itens de cada um chegam num terceiro momento. Um formulário só obrigava a pensar nos dois ao mesmo tempo.

**Agora são dois blocos, na ordem dos atos.**

**DFDs do processo** é o cadastro do documento: quem formalizou, como o processo se refere a ele e o arquivo assinado — que é opcional e pode ser anexado depois, na própria linha. Nenhum campo de item. Podem ser registrados quantos forem, a qualquer momento do andamento. A linha mostra quantos itens estão vinculados àquele DFD, e remover avisa quantos vão junto.

**Itens da demanda** é a tabela de todos os itens do processo, com uma coluna **DFD de origem** — a identificação e a secretaria. É o vínculo pedido: cada item diz em qual DFD foi pedido. "Adicionar item" pede descrição, unidade, quantidade e o DFD, escolhido entre os já registrados; com um DFD só, ele já vem escolhido. Editar permite **mudar o vínculo**, e aí o item sai de um DFD e entra no outro numa operação só — deixar as duas metades pela metade contaria a quantidade duas vezes na consolidação.

**Sem DFD registrado não há "Adicionar item".** Um item solto não teria como dizer qual secretaria o pediu, que é exatamente a pergunta que a consolidação responde.

Do lado do cliente, `registrarDfd` deixou de aceitar itens: a função de registro e a de troca de itens (`atualizarItensDoDfd`) são as duas operações, e nada mais mistura as duas. A gravação de item passa pela lista inteira do DFD alvo, montada na tela a partir da que está lá — o que mantém a troca atômica por DFD.

**A consolidação vazia deixou de dizer o que falta.** Com o cadastro de DFDs e a tabela de itens logo abaixo — cada um já anunciando o que falta e onde informá-lo —, o aviso no lugar da tabela era uma terceira voz sobre o mesmo assunto. Sem item, a consolidação simplesmente não desenha nada.

**A trilha abre pelo cartão inteiro.** Mirar a linha "Ver N evento(s) anterior(es)" era pedir precisão para uma ação que vale em qualquer ponto do cartão. O botão continua lá — é por ele que o teclado e o leitor de tela chegam, com `aria-expanded` anunciando o estado —, e o clique no cartão é a mesma ação com alvo maior. O botão para a propagação: sem isso, o mesmo gesto abriria e fecharia a trilha.

## 61. As telas ocupam a largura da janela

Toda página do aplicativo era `max-w-content` — 1200px — **sem centragem**. Em tela larga, ou com o zoom do navegador reduzido (que para a página é a mesma coisa), o conteúdo travava nos 1200px e ficava colado à esquerda: o resto da janela virava faixa branca. Não era escolha de leitura, era um teto sem o `mx-auto` que o acompanharia.

As telas passaram a `w-full`. O que limita linha de leitura continua limitando onde faz sentido — a verificação do DFD tem `max-w-review` (820px), porque ali se lê um parecer corrido —, e os tokens que ninguém usava saíram do `@theme`.

**Vai coberto por e2e**, e não por teste de componente: só com uma janela de verdade dá para medir que o conteúdo tem a mesma largura do `main`. Três telas — painel, listagem e documentos — verificam isso a 1900px.

**O painel perdeu duas caixas.** "Documentos Pendentes" repetia em prosa o número que o cartão de estatística já dá, e "Ações Rápidas" levava as três opções ao mesmo lugar que o botão do topo. Ocupavam um terço da largura para não dizer nada novo; sem elas, os processos recentes ficam com a linha inteira. A listagem do painel também passou a mostrar o **número do processo** no lugar do UUID, como a de processos já fazia (§54).

## 62. A rolagem termina onde o conteúdo termina — e agora há teste que cobra isso

Relato de que algumas telas rolam além do conteúdo, parando numa faixa vazia. **Não consegui reproduzir** com os dados de teste: uma varredura das doze telas do aplicativo, em 1500×800 e em 2000×1195, não encontrou sobra nenhuma entre a área rolável do `main` e o ponto onde o conteúdo acaba.

O que ficou desta investigação:

**A varredura virou teste.** As doze telas passaram a ser verificadas em e2e — para cada uma, a área rolável do `main` não pode passar do elemento visível mais baixo, e o documento não pode rolar. Se o defeito voltar (ou aparecer numa tela nova), ele falha aqui em vez de ser notado por acaso.

**`sr-only` ficou ancorado no topo.** A classe é `position: absolute`, e um elemento absoluto vai para a sua posição estática — no fim de um formulário longo, centenas de pixels abaixo. Foi exatamente esse o defeito que o `relative` do `main` corrigiu na época; `top: 0; left: 0` resolve na origem, para qualquer aninhamento. Medi que **não** é a causa quando existe um painel com `overflow` no caminho — ele recorta o elemento antes —, então isto é endurecimento, não a correção do relato.

**Os painéis que rolam ganharam `relative`.** No editor e na sidebar: sem isso, o bloco de contenção de um filho absoluto salta para o `main`, e ele é colocado na posição estática que tem dentro do conteúdo rolado.

## 63. O brasão da entidade aparece na barra lateral

A entidade cadastrava o brasão no timbre e a barra lateral continuava com o ícone genérico. A causa não era a barra: ela já sabia desenhar a imagem — lia de `entidade.logoDataUrl`, um campo do tipo `Tenant` que **os dois mapeadores preenchiam com `null`, sempre**. A ponte nunca teve de onde tirar o dado: o brasão é do timbre, e vem por rota autenticada, em bytes.

A barra passou a lê-lo de onde ele existe — `useTimbre` para saber se há um, `useBrasao` para os bytes —, e os campos mortos saíram do tipo. Um campo que só sabe dizer `null` não é um dado ausente: é uma promessa que a interface acredita e o usuário não vê cumprida.

É a mesma imagem do cabeçalho dos documentos, e não uma segunda cópia: cadastrar em um lugar aparece nos dois.

## 64. O tom de atenção volta para a paleta da plataforma

Os avisos vinham em âmbar `#FFFBEB` com texto `#92400E` — amarelo com o texto tirando para o vermelho. Era herança do protótipo e não existia em lugar nenhum do produto: a interface é navy, petróleo, royal, elétrico e ardósia, e no meio dela aquele par parecia de outro sistema.

**A correção foi no token, não nas telas.** `tint-warning-*` passou a ser ardósia `#F1F5F9` com texto petróleo `#0D3B66` e borda `#CBD5E1`; `--color-warning` virou royal, e `--color-warning-strong`, petróleo. Os dez lugares que usam essas utilities — o aviso de senha provisória, o `InfoBanner` de atenção, a `Tag`, o `StatCard` "Em Elaboração", o painel do PCA, o parecer do DFD — mudaram junto, sem uma linha de JSX tocada. É para isso que os tokens existem.

O status **"Em Revisão"** era o mesmo par âmbar e foi junto, para o tom elétrico da marca: distinto de "Aguardando" (royal) e de "Rascunho" (ardósia).

**Ficou de fora, e é deliberado:** os acentos por tipo de documento (`doc-mapa` é âmbar, `doc-cotacao` violeta, `doc-edital` rosa). Eles não são alerta — são identidade, e formam um espectro em que cada documento se distingue dos outros. Trocá-los por tons da marca faria Mapa colidir com ETP. Se o incômodo se estender a eles, é outra conversa e outro critério.

**Quem escreve à mão não precisa de um cartão dizendo isso.** A seção do editor tinha dois cartões lado a lado — "Escrever à mão" e "Gerar com IA" —, e o primeiro só levava o cursor ao campo de texto que está logo acima, aberto e vazio. Anunciar o que a tela já permite é instrução, não caminho, e custava metade da largura da seção. Ficou só o da IA, que precisa existir mesmo indisponível: é ele que diz, antes do clique, que esta instalação não tem modelo configurado (ADR-029).

## 65. As seções do ETP passam a partir do que o processo já registrou

Levantamento pedido pelo cliente: o que, entre as seções, se fundamenta em informação anterior. O achado que mudou a pergunta veio antes da resposta — **os painéis de Quantidades e de Valor eram fixture do protótipo**. `useState("150,00")`, `useState("3.233,33")`, e o total `R$ 484.999,50` aparecendo idêntico em toda contratação, sem relação com o processo e sem ser salvo em lugar nenhum. Só a memória de cálculo ia para a seção. Não era "falta pré-preencher": era número inventado numa peça que vai ao controle.

O que ficou, na ordem em que foi construído:

**Unidades canônicas.** A unidade era texto livre no item do DFD e uma lista de quatro opções no painel — duas fontes que não conversavam, e por isso "UN" e "Unidade" viravam divergência entre secretarias que pediram a mesma coisa. Agora é uma lista só, agrupada por natureza (contagem, massa, volume, comprimento e área, tempo e serviço), guardando a sigla — que é o que cabe na coluna de 20 caracteres do servidor. **"Outra" com campo livre existe de propósito**: unidade de contratação municipal tem exceção, e recusá-la transformaria orientação em obstáculo. Unidade antiga fora da lista continua aparecendo como foi gravada.

**Quantidades (inciso IV) saem da consolidação.** Tabela item × unidade × origem × total, somada pelo servidor, com "—" no total quando as unidades divergem: mostrar um número ali seria a plataforma afirmando o que ninguém pode usar. A memória de cálculo é escrita como rascunho, dizendo de onde veio cada quantidade, e deixa entre colchetes o critério — que é de quem conduz o processo.

**Valor (inciso VI) sai dos itens.** O preço unitário, que o servidor já modelava e a interface ignorava, passou a ser coletado no item — opcional, porque a secretaria nem sempre tem preço na hora do DFD. O total é comparado com **o valor declarado na abertura**, e a diferença é dita: escondê-la deixaria a estimativa se contradizer em silêncio. Item sem preço vira pendência nomeada, e não zero — zero é um preço.

**Necessidade (inciso I) ganha rascunho.** A plataforma afirma só o que está registrado — objeto, secretarias requisitantes, itens — e marca entre colchetes o problema, a consequência de não contratar e o alinhamento com o planejamento. Escrever a necessidade por inferência e apresentá-la como pronta seria assinar no lugar de quem responde.

**O que não é pré-preenchido, e é deliberado:** parcelamento, riscos, impactos ambientais e posicionamento conclusivo. São juízo, não dado. A plataforma entrega os números; a conclusão é de quem assina.

## 66. O rascunho não substitui a IA — e a IA parte do rascunho

Três correções que vêm da mesma observação do cliente: *"um botão de rascunho não substitui o botão de gerar com IA"*.

**A chave duplicada.** `ML` era mililitro **e** metro linear na lista de unidades. O React reclamava de chave repetida e a segunda unidade sumia do dropdown. Metro linear virou `M LIN`, e agora há teste cobrando siglas únicas — o teste antigo só cobrava nomes.

**Os dois botões ficam lado a lado.** O rascunho serve a quem não usa o modelo; a IA, a quem usa. Eles ocupam a mesma linha, dentro do cartão da IA, em todas as seções que sabem montar um rascunho: necessidade, quantidades e valor.

**Nenhum dos dois some depois que a seção tem texto.** O card da IA aparecia só com a seção vazia — o que tirava justamente o caminho de "redija a partir do que eu rascunhei". Agora fica sempre; com modelo ausente, desabilitado com o motivo escrito (ADR-029).

**O que já está escrito vai no pedido de redação.** `POST .../sections/{code}/generate` passou a aceitar `draft`, e a tela manda o conteúdo da seção — rascunho da plataforma ou texto do servidor. É a regra que o cliente pediu para valer em todas as seções: o modelo parte do que existe em vez de descartá-lo. O provedor de template, que não redige, devolve o rascunho junto do aviso — perder o texto de quem pediu ajuda seria o pior resultado possível.

## 67. A seção do PCA passa a ser editável, e o que você informa vale

Dois relatos sobre a mesma tela, e os dois procedem.

**"Informar outro item do plano" não fazia nada.** Era verdade: a busca vinha antes da declaração, então informar o item de uma demanda **já encontrada** gravava a anotação e descartava o resto no mesmo instante. A tela oferecia a ação e dizia "registrada como sua" enquanto nada mudava. Agora o que o servidor informa **vence a busca** — ela casa por termos e erra, e quem responde pelo documento é ele. O rótulo continua distinguindo "Encontrado no PCA" de "Informado por você": fundir os dois faria a plataforma parecer ter conferido o que ninguém conferiu.

**Sobre a lei, você está certo.** Não constar do PCA não impede a contratação. O Art. 18, § 1º, II pede que o ETP **demonstre** a previsão *ou* justifique a ausência dela, e o plano é revisável no exercício. Por isso informar um item que não existe no plano importado sempre valeu — e agora tem efeito de verdade —, e por isso a plataforma nunca travou aqui.

**"O que vai para a seção" virou campo editável.** Era um bloco de leitura, e "Citar na seção" escrevia o parágrafo **direto no documento** — texto de processo administrativo entrando sem ninguém ler, sem como ajustar. Agora o botão preenche o campo, você revisa, edita e grava com o Salvar de sempre. É o mesmo comportamento da IA (§66), e a rota que gravava sozinha saiu do servidor (ADR-039).

Com o campo aberto, a seção também aceita o que a plataforma não sabe propor: a justificativa da contratação não prevista, escrita à mão. E o par de botões da §66 está lá — citar não substitui a IA, e a IA parte do que estiver escrito.

## 68. Salvar deixa de apagar a dispensa

Relato: dispensar a seção, clicar em "Salvar e Avançar", e nada acontecer. Reproduzido em e2e: o `PUT` da seção troca o par (texto, justificativa), e o salvamento mandava `dispensationJustification: null` — **apagando a dispensa registrada segundos antes**, em silêncio. A seção voltava a "não iniciada" e o progresso caía. Valia para os dois botões, "Salvar" e "Salvar e Avançar", e para toda seção dispensável.

Agora, enquanto o texto continua em branco, o salvamento reenvia a justificativa que está lá. Escrever na seção continua desfazendo a dispensa — é o que escrever significa, e aí a justificativa sai porque a seção passou a ter conteúdo.

**A dispensa também passou a valer onde não valia.** Ela só era oferecida no editor genérico; a seção do inciso II (Demonstração da Previsão no PCA) é dispensável pelo Art. 18, § 2º e tem painel próprio — ficava sem o caminho. Agora o bloco é renderizado uma vez, abaixo do conteúdo, para **toda** seção dispensável, tenha painel ou não.

Vai coberto por e2e com um servidor que guarda o que recebe: em teste de componente o `PUT` some no mock, e o defeito — que era exatamente o servidor receber o campo errado — passaria batido.

## 69. A revisão e a geração viram uma etapa, e não a última seção

O Posicionamento Conclusivo — inciso XIII do ETP — carregava seis coisas que não são dele: o aviso de obrigatórias faltando, o "Acrescentar seção", a prévia do documento, o aviso de lacunas silenciosas, o "Finalizar e Gerar" e, por consequência, a perda do "Salvar e Avançar" que todas as outras seções têm. A seção da lei estava fazendo o papel de tela de fechamento.

Três efeitos, todos ruins: para olhar o documento inteiro era preciso **abrir um inciso**; escrever a conclusão competia com revisar o todo na mesma tela; e a última seção era a única que não se comportava como seção.

**Agora é uma etapa.** "Revisão e Geração" fecha a trilha, sem número, sem fundamento legal e fora da contagem de progresso — porque não é um inciso do documento. Ela é **alcançável a qualquer momento**: revisar o documento inteiro não deveria depender de chegar ao fim dele. O cabeçalho dela não tem "Salvar" nem "Orientações", que são ações de seção.

**A geração saiu das seções.** Havia um atalho de "Finalizar e Gerar" que aparecia em qualquer seção assim que as obrigatórias estivessem resolvidas — gerar sem passar pela prévia. Agora o documento se gera de um lugar só, depois de a pessoa poder ver o que vai sair.

A última seção voltou a ser seção: "Salvar e Avançar" leva à etapa final, que é o passo seguinte e antes não existia. Vale para todos os documentos — a trilha é a mesma para ETP, TR, Edital, Contrato, Mapa de Riscos e Cotação.

**No DS**, os variants `success` e `dark` ganharam estado desabilitado, que só o `primary` tinha: o "Finalizar e Gerar" travado continuava verde, convidando um clique que não acontecia.

## 70. A fonte de pesquisa de preços passa a ser escolha da lei, e persiste

Três coisas na mesma tela do editor.

**O número do processo no lugar do UUID.** O painel do editor mostrava `1b10c406-6c87-42d7-99de-962d41e6e5f2`. Ninguém identifica processo por UUID — nem para conferir, nem para falar com alguém. Agora mostra `PROC-2026-000007`, como o resto da plataforma. O UUID continua onde ele serve: na URL.

**A fonte de pesquisa de preços virou lista, obrigatória e gravada.** Eram três opções soltas na tela, escolhidas com radio, e a escolha vivia só na memória da aba: trocar de seção apagava a marcação. Pior, a escolha ia para a memória de cálculo — o texto que a seção guarda — sem o fundamento legal.

Agora são os **cinco parâmetros do Art. 23, § 1º, da Lei 14.133/21**, detalhados pela **IN SEGES/ME nº 65/2021**, na ordem de preferência que a IN estabelece: Painel de Preços e Banco de Preços em Saúde primeiro (inciso I); contratações similares da Administração (II); tabela de referência do Executivo federal e mídia especializada (III); base nacional de notas fiscais eletrônicas (V); e a pesquisa direta com no mínimo três fornecedores **por último**, de propósito — a IN manda evitar que ela seja fonte única. Cada opção mostra seu fundamento junto: parafrasear artigo de lei em documento de contratação é defeito, não estilo.

**"Outra (informar)" existe de propósito.** Contratação municipal tem exceção — cotação de consórcio intermunicipal, tabela estadual —, e recusá-la transformaria orientação em obstáculo. O que a plataforma não faz é inventar o artigo dela.

**A escolha não ganhou armazenamento próprio: ela é a linha da memória de cálculo.** É lá que o controle vai procurar de onde saiu o preço, e guardá-la em outro lugar criaria um segundo registro da mesma coisa — que divergiria. Por isso ela volta marcada ao reabrir a seção: é lida de volta do texto gravado. E o rascunho só é oferecido depois da escolha: sem a fonte não há memória a montar, porque o parágrafo afirma de onde vem o preço.

**O "Salvar" do cabeçalho não é o "Salvar e Avançar" — mas se chamava igual.** A dúvida era legítima: dois botões, mesmo verbo, mesma tela. Eles fazem coisas diferentes. "Salvar e Avançar" declara a seção **Completo** — é o que conta no progresso e o que libera a geração do documento. O de cima guarda o texto **sem afirmar que a seção está pronta**, que é o que se quer ao parar no meio de um parágrafo. Remover seria tirar o único jeito de guardar trabalho inacabado. Ele ficou, com o nome do que faz: **"Salvar Rascunho"**.

**E havia uma perda de trabalho por trás disso.** Trocar de seção — pela trilha ou por "Seção Anterior" — recarregava o rascunho da seção de destino e **descartava em silêncio** o que estava escrito e não salvo. O "Salvar" do cabeçalho era a única defesa, e só para quem soubesse que precisava dela. Agora a troca grava antes o que está na tela, como rascunho: nunca "Completo", que continua sendo o que só "Salvar e Avançar" declara. Coberto por e2e com servidor que guarda o que recebe — inclusive o `status`, que é onde os dois botões diferem.

## 71. O `/GeraDocsFrontend` some da URL de desenvolvimento

`localhost:3000` respondia 308 e a aplicação só abria em `localhost:3000/GeraDocsFrontend`. O prefixo estava fixo no `next.config.ts`, e por isso valia em toda parte — inclusive na máquina de quem desenvolve, onde ele não tem função nenhuma. Um detalhe da hospedagem aparecendo em toda URL do dia a dia.

Ele existe por um motivo só: o GitHub Pages serve projeto sob o nome do repositório, e não na raiz do domínio. Então quem publica é que o declara — `NEXT_PUBLIC_BASE_PATH` no `deploy.yml` —, e o `next.config.ts` só o aplica quando ele vem. Localmente a URL é a que se espera: `localhost:3000/processos/detalhe?id=…`.

**De quebra, a caixa estava errada.** O prefixo era `/GeraDocsFrontend` e o repositório é `geradocs-frontend`; o endereço publicado é `alexandre-cardozo.github.io/geradocs-frontend/`. Funcionava porque o Pages é tolerante com a caixa do segmento do repositório — não porque estivesse certo. Agora o prefixo é o nome do repositório, literal.

O `playwright.config.ts` e o `e2e/api.ts` leem o mesmo env var, de modo que a suíte roda igual com prefixo ou sem. E o link de redefinição de senha do backend (`PASSWORD_RESET_FRONTEND_URL`) passou a apontar para `http://localhost:3000/redefinir-senha` no ambiente local.

## 72. As correções do ETP valem para os seis documentos — o que já valia e o que faltava

Pergunta legítima depois de várias rodadas de ajuste no ETP: o que foi corrigido ali chegou ao TR, ao Edital, ao Contrato, ao Mapa de Riscos e à Cotação? A resposta se divide em duas metades.

**O que já valia, porque mora no editor.** O editor (`/processos/documento`) é **um só** para os seis tipos: muda o catálogo de seções, não a tela. Então estas correções nunca foram do ETP —

- a dispensa que sobrevive ao salvamento (§68) e a dispensa oferecida em **toda** seção dispensável, tenha painel ou não — o Contrato tem três (matriz de riscos, subcontratação, proteção de dados), o Edital e o Mapa uma cada;
- a etapa final separada da última seção (§69);
- o número do processo no lugar do UUID, o "Salvar Rascunho" e a troca de seção que não descarta o texto (§70);
- o botão de IA que nunca some e parte do texto já escrito (§66);
- paleta, largura e rolagem.

Isso era conclusão de **leitura de código**, e a suíte inteira exercitava só o ETP. Agora o e2e roda a dispensa e a troca de seção também no **Contrato** — três seções dispensáveis e nenhum painel, que é justamente o caminho genérico.

**O que faltava: os painéis.** Painel só existia no ETP, e painel é onde vive o pré-preenchimento a partir do que o processo já tem. Havia seções, em outros documentos, pedindo **exatamente a mesma coisa** que um inciso do ETP — e obrigando a redigitar à mão número que a plataforma já tinha. Número digitado duas vezes diverge, e aí duas peças do mesmo processo se contradizem.

O painel passou a acompanhar a **matéria** da seção, e não o documento:

| Documento | Seção | Painel | Por quê |
|---|---|---|---|
| TR | Definição do Objeto (Art. 6º, XXIII, 'a') | quantidades | a alínea define o objeto "com natureza, quantitativos e unidades de medida" |
| TR | Fundamentação da Contratação ('b') | necessidade | referencia o ETP e demonstra a mesma necessidade pública |
| TR | Estimativa do Valor ('i') | valor | os mesmos preços unitários e a mesma memória de cálculo do inciso VI |
| Cotação | Metodologia e Preço de Referência (Art. 23, caput) | valor | o preço de referência sai da mesma apuração — e agora com a fonte da lei (§70) |

Os painéis já se rotulavam pela seção que os hospeda, então cada documento cita o **seu** fundamento. E os dados que eles leem são do **processo** (DFDs, itens, valor declarado), não do documento — por isso serviram sem adaptação.

**PCA e ATA continuam só no ETP:** são os incisos II e V, sem correspondente nos demais.

**O que ficou de fora, de propósito.** A Cotação tem duas seções sobre fontes — "Fornecedores e Fontes Consultadas" (Art. 23, § 1º) e "Preços Coletados" (§ 2º) — que pedem **várias** fontes, cada uma com data de coleta, validade da proposta e fornecedor identificado. O campo do §70 escolhe **uma**. Portar não resolveria: é um cadastro de coletas, não um campo, e inventá-lo aqui seria desenhar por analogia. Fica registrado como lacuna conhecida. Pelo mesmo motivo, "Adequação Orçamentária" do TR ('j') não recebeu o painel de PCA: a seção é sobre dotação orçamentária — que a plataforma não conhece —, e um painel que preenche metade dela faria a seção parecer pronta sem estar.

## 73. A dotação orçamentária deixa de ser texto e vira cadastro do processo

Três seções, em três documentos, pediam o **mesmo crédito** e não tinham de onde tirá-lo: a Adequação Orçamentária do TR (Art. 6º, XXIII, `j`), a Dotação Orçamentária do Edital (Art. 150) e a cláusula do contrato (Art. 92, VIII). Escritas à mão, três vezes, as três divergem — e aqui a divergência custa caro: o **Art. 150 torna a ausência da indicação dos créditos causa de nulidade do ato**, e o Art. 92, VIII exige o crédito "com a indicação da classificação funcional programática e da categoria econômica", nome por nome.

**Agora o crédito é declarado uma vez, no processo.** Unidade orçamentária, programa de trabalho, natureza da despesa, fonte de recurso, ficha (opcional — nem todo ente a usa), exercício e valor. Várias por processo, como os DFDs: a despesa de uma contratação compartilhada corre por mais de um programa de trabalho, e a de um contrato plurianual por mais de um exercício.

**O painel confronta o total com o valor estimado.** É isso que faz a palavra "adequação" significar alguma coisa: declarar o crédito e não confrontá-lo com a despesa deixaria a seção afirmar uma adequação que ninguém verificou. Quando os créditos não cobrem, o rascunho deixa a diferença **em colchetes** em vez de afirmar suficiência que os números não sustentam.

**No TR a seção tem duas metades, e agora tem as duas.** A alínea `j` pede a dotação *e* a previsão no PCA vigente; o Art. 150 e o Art. 92, VIII pedem só o crédito. Por isso a verificação do PCA aparece no TR e não no Edital nem no Contrato — foi exatamente por isso que, na §72, o painel de PCA não foi plugado ali sozinho: preencheria metade e a seção pareceria pronta.

**Três ações de auditoria e não uma**, pela mesma razão do DFD (§68): declarar, corrigir e retirar mudam a cobertura da despesa de formas diferentes. A trilha nomeia o programa de trabalho que saiu — quando um crédito deixou de constar, e por ordem de quem, é pergunta que alguém vai fazer.

Cobertura: 807 testes de unidade (100% em `lib/**`), 53 e2e — incluindo a travessia que teste de componente não alcança: declarar no processo e ver o crédito aparecer na cláusula do contrato. No backend, 860 testes com JaCoCo 100% em `domain` e `application`.

## 74. A pesquisa de preços passa a existir — e a Cotação deixa de ser folha em branco

As cinco seções da Cotação eram escritas inteiramente à mão, e a estimativa de valor do ETP somava o `unitPrice` que a secretaria digitou no DFD. Esse número é exigido — **Decreto 10.947/2022, Art. 8º, IV** —, mas a própria norma o chama de estimativa **preliminar**, obtida por **procedimento simplificado**, e ele serve ao PCA. O valor da contratação vem do **Art. 23 da Lei 14.133/21** e da pesquisa de preços, que a plataforma não tinha onde guardar. Era a maior lacuna de conformidade do fluxo, não uma falta de conforto.

**A série de preços coletados.** Uma linha por preço obtido — que é o que a **IN SEGES/ME nº 65/2021, Art. 3º** chama de "série de preços coletados": item, fonte, preço, data **e hora** da coleta (a hora é exigida para mídia e sítio eletrônico pelo Art. 5º, III), fornecedor com CNPJ e validade da proposta (Art. 5º, § 2º). Fornecedor, documento e validade ficam opcionais porque dependem da fonte: o Painel de Preços não tem CNPJ de fornecedor, e exigi-los de todas obrigaria a inventar dado para registrar um preço legítimo.

**Quatro seções leem da mesma série**, em vez de pedir o mesmo número quatro vezes:

| Seção | O que o painel entrega |
|---|---|
| Fornecedores e Fontes Consultadas (Art. 23, § 1º) | as fontes efetivamente usadas, com quantos preços vieram de cada, e o aviso quando nenhuma é parâmetro prioritário — o Art. 5º, § 1º manda priorizar os incisos I e II e justificar quando não for possível |
| Preços Coletados (§ 2º) | o cadastro da série, agrupada por item |
| Análise Crítica | menor, média, mediana e maior por item; aviso de série curta (Art. 6º, § 5º) e marcação do que destoa |
| Metodologia e Preço de Referência | os três métodos que o Art. 6º admite — média, mediana, menor — e o total apurado |

**A plataforma não descarta preço.** O Art. 6º, § 2º admite desconsiderar valores inexequíveis, inconsistentes ou excessivamente elevados, mas o § 3º exige critério "fundamentado e descrito no processo". Então ela **aponta** o que destoa da mediana e deixa o critério em colchetes, para quem responde pelos autos escrever. O percentual de triagem não é critério legal — a IN não fixa nenhum —, e a tela diz isso.

**O método escolhido não tem armazenamento próprio:** ele é a linha da memória de cálculo, como a fonte de pesquisa do §70. Guardá-lo em outro lugar criaria um segundo registro da mesma decisão, e os dois divergiriam.

**No DS**, o `Input` passou a aceitar `date` e `datetime-local`. Campo de texto com máscara própria seria reimplementar calendário — e a máscara divergiria do que o servidor grava.

## 75. Os três valores do processo param de ser três números soltos

A pergunta era direta: o preço do DFD é necessário, ou informação desnecessária? E o valor total digitado na abertura?

**Os dois ficam — porque são coisas diferentes**, e o defeito era tratá-los como a mesma:

| Valor | Quem declara | Fundamento | O que é |
|---|---|---|---|
| Preço unitário do item, no DFD | secretaria requisitante | **Decreto 10.947/2022, Art. 8º, IV** | estimativa **preliminar**, "por meio de procedimento simplificado" |
| Valor total, na abertura | quem abre o processo | valor do PCA / soma dos DFDs | referência de planejamento |
| Valor estimado da contratação | a pesquisa de preços | **Art. 23, Lei 14.133/21** | o que vai ao ETP VI, ao TR `i`, ao edital e ao contrato |

Retirar o preço do DFD quebraria a peça que alimenta o PCA — a norma o exige. O que estava errado era o **papel** que ele ganhou: o painel de valor do ETP somava o palpite da secretaria e o apresentava como o valor estimado da contratação.

**Agora a estimativa prefere o preço apurado na pesquisa** e cai para a preliminar só enquanto a coleta não existe — dizendo qual das duas está usando, na tela e no texto da seção. Cada linha da memória de cálculo diz de onde veio o preço: da pesquisa, com quantos preços e por qual método, ou da estimativa preliminar do DFD. E, enquanto houver item sem pesquisa, o rascunho deixa a pendência em colchetes.

**O método é o que a Cotação declarou**, e não um padrão da tela do ETP: se o ETP somasse pela média enquanto a Cotação adotou a mediana, duas peças do mesmo processo apresentariam valores diferentes para a mesma contratação. Ele é lido da seção de metodologia da Cotação, e só quando ela é um dos documentos escolhidos.

**O valor da abertura deixou de ser inerte.** Ele era digitado uma vez e nunca mais conversava com nada — verifiquei: nenhuma regra o consultava. Agora o processo mostra os três lado a lado, aponta a divergência e oferece **adotar** o que a demanda sustenta. Oferece, e não troca: quem responde pelo processo é quem decide qual valor ele declara.

**Fica anotado, e fora desta entrega:** o valor do processo também deveria conferir a modalidade contra os limites do Art. 75 (dispensa por valor), alertando sem bloquear. Hoje ninguém confere.
