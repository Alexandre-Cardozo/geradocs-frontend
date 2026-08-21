# GeraDocs — Frontend

Aplicação web do **GeraDocs**, SaaS GovTech da **LAHHM** que automatiza, com IA, os documentos da fase preparatória da contratação pública sob a **Lei 14.133/2021**: o DFD é anexado e verificado, e a plataforma gera **Cotação de Mercado → ETP → Mapa de Riscos → TR → Edital → Contrato**, na ordem do fluxo real, até a aprovação e a exportação DOCX/PDF com timbre do município.

> Que documentos existem, em que ordem, com que fundamento legal e quais são as lacunas conhecidas: **[docs/fluxo-contratacao.md](docs/fluxo-contratacao.md)** — leia antes de mexer em documentos, wizard ou hub do processo.

O projeto está em integração progressiva com o backend Spring Boot. Autenticação, sessão, refresh, logout, recuperação/redefinição de senha, prefeituras, secretarias, usuários e a criação/listagem de processos usam a API real. Detalhe e edição de processo, DFD, documentos, aprovações, identidade visual e PCA continuam sobre a camada mockada até seus módulos existirem no backend.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript strict**
- **Tailwind CSS v4** utility-first — tokens do DS mapeados via `@theme` (fonte única de verdade); ver [docs/estilizacao.md](docs/estilizacao.md)
- **TanStack Query 5** — dados via hooks, com integração HTTP progressiva e mocks para módulos ainda não migrados
- **Design System LAHHM/GeraDocs** — componentes portados a TSX (sem bibliotecas de UI de terceiros)
- Fontes via `next/font`: Plus Jakarta Sans (display), Inter (UI), JetBrains Mono (IDs/valores)

## Comandos

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:3000/GeraDocsFrontend)
npm run build      # build de produção
npm start          # servir o build
npm run lint       # eslint-config-next + regras de aderência ao DS (hex/px/fonte)
npm run lint:ds    # oxlint com o config de aderência do DS
npm run typecheck  # tsc --noEmit
npm run check      # tudo acima
```

## Estrutura

> Documentação completa da organização de pastas, com o porquê de cada diretório e o fluxo "onde colocar meu código": **[docs/estrutura.md](docs/estrutura.md)**.

```
app/                    # ROTAS (App Router) — cada pasta = um segmento de URL
  layout.tsx            # fonts (next/font), metadata, Providers (Query + Toast)
  globals.css           # tokens do DS + extensões + reset + focus ring + classes gd-*
  not-found.tsx         # 404
  (auth)/               # login e redefinição de senha, sem shell
  (app)/                # shell autenticado (guarda de sessão + RBAC)
    page.tsx            # Dashboard (ou Painel do Sistema p/ admin)  /
    processos/          # Lista, wizard (novo/), hub (detalhe/), DFD (dfd/) e
                        #   editor de documentos (documento/). O id do processo é
                        #   query param (?id=), não segmento — static export, §22 decisions.md
    aprovacoes/         # Fila + trilha de auditoria      /aprovacoes
    documentos/         # Repositório de documentos       /documentos
    configuracoes/      # Prefeitura, secretarias, PCA, servidores  /configuracoes
    perfil/             # Meu Perfil                      /perfil
    admin/              # Admin geral: prefeituras e servidores  /admin/*
components/             # INTERFACE REUTILIZÁVEL
  ui/                   # Design System em TSX — importe SEMPRE de "@/components/ui"
  layout/               # Moldura: AppShell, Sidebar, Header, GuardaSessao
  documentos/           # Painéis de domínio do editor (ATA, quantidades, valor)
  shared/               # Apoios: providers (Query+Toast), estados (loading/erro/vazio), tabela
lib/                    # DADOS E DOMÍNIO (TypeScript puro)
  types.ts              # modelo de domínio congelado (Processo, Usuario, Sessao, ...)
  documentos/           # CATÁLOGO: ordem, dependências, regras por modalidade e seções
  processos/            # máquina de estados do fluxo de aprovação (fluxo.ts)
  auth/                 # cpf.ts (validação) + acesso.ts (RBAC — fonte única)
  format.ts             # formatBRL ("R$ 485.000,00"), formatData, formatDataHora
  mocks/fixtures.ts     # dados — nunca importar em componentes
  api/auth-client.ts    # transporte HTTP, token em memória, refresh HttpOnly
  api/access-client.ts  # transporte administrativo: organizações, departamentos e usuários
  api/client.ts         # fachada híbrida: acesso real + módulos ainda mockados
  api/hooks.ts          # hooks TanStack Query (única porta das views)
design_system/          # DS fonte (tokens, .prompt.md, guidelines) — normativo
docs/                   # estrutura.md · decisions.md · fluxo-contratacao.md (domínio)
```

## Convenções

- **Tailwind sobre tokens**: estilo por classes de token (`bg-royal`, `text-lg`); nenhuma cor hex/arbitrária — o ESLint falha o build. Tokens no `@theme` de `app/globals.css`. Ver [docs/estilizacao.md](docs/estilizacao.md).
- **Dados só via hooks**: views nunca importam `lib/mocks`; tudo passa por `lib/api/hooks.ts`, com loading/erro/empty tratados.
- **DS via barrel**: componentes do DS importados de `@/components/ui` (regra de lint). Antes de mexer em UI, consulte o `readme.md` do DS e o `.prompt.md` do componente.
- **Conteúdo pt-BR**: Title Case em títulos, imperativos em ações, referências legais literais ("Art. 75, II, Lei 14.133/21"), IDs/valores em monospace, vocabulário de status fixo.
- **Valores nunca crus**: monetários e quantidades sempre com milhar e duas casas (`500.000,00`). Exibir → `formatBRL`/`formatNumeroBR`; digitar → `MoneyInput`/`QuantityInput`, que mascaram sozinhos. Nunca refaça a máscara ou o parse na tela.
- **Zero emoji**: ícones de linha estilo Lucide em `components/ui/icons.tsx`.
- **Responsivo mobile-first**: variantes Tailwind `xs`(480)/`sm`(640)/`md`(768)/`lg`(1024) no `className`. Sidebar vira drawer abaixo de `lg`; tabelas largas rolam dentro de `overflow-x-auto` com `min-w-[...]`; nunca deixe a página estourar horizontalmente.

## Integração local com o backend

1. Inicie o PostgreSQL/Mailpit e o Spring Boot conforme o README do backend.
2. Copie `.env.example` para `.env.local` somente se a API não estiver em `http://localhost:8080/api/v1`.
3. Execute `npm run dev` e acesse `http://localhost:3000/GeraDocsFrontend/login`.

O access token JWT fica somente em memória. O refresh token é rotativo e permanece em cookie `HttpOnly`; ao recarregar a página, o frontend renova a sessão e consulta `GET /api/v1/me`. Não armazene tokens no `localStorage`.

As áreas administrativas também usam a API protegida: `GET`/`POST` de organizações, departamentos e usuários, além das desativações lógicas. As mutações de desativação buscam a versão atual e enviam `If-Match`, mantendo a concorrência otimista definida pelo backend. A senha inicial é informada pelo administrador e precisa ter ao menos 12 caracteres; o CPF devolvido nas listagens já vem mascarado pelo servidor.

> ⚠️ **A autenticação está validada apenas em ambiente local.** O refresh token usa `SameSite=Lax`, que funciona entre `localhost:3000` e `localhost:8080` porque a porta não separa *sites*. Publicado o front em `github.io` e a API em outro domínio, a renovação da sessão deixa de receber o cookie e o usuário cai no `/login` a cada recarga. A decisão que resolve isso — publicar as duas pontas sob o mesmo domínio registrável — está em [ADR-013](../geradocs-backend/docs/architecture-decisions.md) e precisa ser executada antes da primeira publicação.

## Login e perfis de acesso

O app exige uma conta ativa cadastrada no backend e login por CPF + senha. Três perfis: **Administrador Geral** (LAHHM — gere prefeituras e servidores), **Coordenador** (gere a sua prefeitura + faz o fluxo de servidor) e **Servidor** (processos e documentos). A API define o perfil, a organização ativa, os papéis de workflow e as permissões da sessão. Detalhe e matriz RBAC: [docs/perfis-acesso.md](docs/perfis-acesso.md).

## Fluxo completo simulável com mocks

Fazer login → criar processo no wizard (os documentos oferecidos dependem da modalidade — contratação direta não tem Edital) → anexar DFD → checklist da IA (parecer persistido) → elaborar os documentos na ordem do fluxo, preenchendo ou gerando cada seção com IA simulada, com as dependências travando o que ainda não pode começar (o TR espera o ETP; o Edital espera o TR) → finalizar cada documento (exige só as seções obrigatórias) → **enviar para aprovação** (travado até os obrigatórios estarem gerados) → **registrar parecer jurídico (Art. 53) e encaminhar** → o gestor **Aprova / Rejeita / Solicita Retificação** (apontamentos por seção, que o elaborador resolve no editor, gerando nova versão do documento) → **concluir** o processo aprovado. Toda transição fica na trilha de auditoria.

Ordem canônica, fundamento legal de cada documento e a **máquina de estados do fluxo de aprovação**: [docs/fluxo-contratacao.md](docs/fluxo-contratacao.md).
