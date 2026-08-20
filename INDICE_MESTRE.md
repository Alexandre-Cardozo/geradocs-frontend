# GeraDocs — Front-end

Interface do GeraDocs: plataforma que ajuda servidores públicos a elaborar os
documentos da fase preparatória da contratação sob a **Lei 14.133/21** — ETP,
Termo de Referência, Mapa de Riscos, Cotação, Edital e minuta de contrato.

**Next.js 16 (App Router, static export) · React 19 · TypeScript strict · Tailwind v4 sobre os tokens do Design System.**

## Por onde começar

1. [`docs/00_MASTER_PROMPT.md`](docs/00_MASTER_PROMPT.md) — ponto de entrada de quem vai implementar; define a ordem de leitura.
2. [`docs/SETUP_INICIAL.md`](docs/SETUP_INICIAL.md) — deixa o ambiente rodando.
3. [`../geradocs-backend/docs/ordem-de-implementacao.md`](../geradocs-backend/docs/ordem-de-implementacao.md) — **o que fazer primeiro**, com o estado de cada passo.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/estrutura.md`](docs/estrutura.md) | Organização do código e onde colocar código novo |
| [`docs/fluxo-contratacao.md`](docs/fluxo-contratacao.md) | O domínio: documentos, ordem canônica e fundamento legal |
| [`docs/estilizacao.md`](docs/estilizacao.md) | Tokens, Tailwind e aderência ao Design System |
| [`docs/decisions.md`](docs/decisions.md) | Decisões de arquitetura do front (ADRs) |
| [`docs/perfis-acesso.md`](docs/perfis-acesso.md) | Autenticação, multi-prefeitura e RBAC |
| [`docs/plano-diretrizes-reuniao.md`](docs/plano-diretrizes-reuniao.md) | Plano de produto: o que o sistema já faz e o que falta |
| [`design_system/readme.md`](design_system/readme.md) | **Normativo** — em conflito com o código, ele vence |

## Estrutura do repositório

```
geradocs-frontend/
├── INDICE_MESTRE.md          ← você está aqui
├── app/                      ← rotas (App Router); id de processo vai por query param
├── components/               ← ui/ (Design System) · layout/ · documentos/ · shared/
├── lib/                      ← domínio e dados: documentos/ · processos/ · auth/ · api/ · teste/
├── design_system/            ← tokens e especificações — normativo, somente leitura
├── docs/                     ← documentação do projeto
├── .githooks/                ← guarda-corpo de pré-commit versionado
├── .claude/skills/           ← skills do projeto, com os guarda-corpos de interface
└── .github/workflows/        ← ci.yml (lint, tipos, testes, cobertura, segredos) e deploy.yml
```

## Estado

- **Autenticação integrada** à API Spring desde 20/08/2026 — token só em memória, refresh em cookie `HttpOnly`.
- **Demais módulos em mock**: processos, documentos, seções e versões vivem em memória e somem ao recarregar.
- **Geração por IA simulada**: nenhum modelo integrado.
- **Testes**: suíte iniciada em 20/08/2026, cobrindo a camada de transporte; o domínio entra no Bloco 3.

⚠️ A autenticação está validada **apenas em ambiente local** — ver o aviso no
[`README.md`](README.md) e a ADR-013 do back-end.

## Repositório irmão

O back-end (Spring Boot) vive em [`../geradocs-backend`](../geradocs-backend).
