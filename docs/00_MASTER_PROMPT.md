# 00 — Ponto de entrada (front-end GeraDocs)

> Único documento que se entrega a quem vai implementar — pessoa ou agente. Os
> demais são referência consultada sob demanda.

## 1. O que é

Interface do **GeraDocs**, plataforma que ajuda servidores públicos a elaborar os
documentos da fase preparatória da contratação sob a **Lei 14.133/21**.

Next.js 16 (App Router, *static export*), React 19, TypeScript strict, Tailwind v4
sobre os tokens do Design System, TanStack Query.

**O que o produto não faz**: protocolo, assinatura e aprovação entre setores —
isso acontece no sistema de processo administrativo da prefeitura. A plataforma
termina na geração do documento.

## 2. A regra de produto acima de todas

**A plataforma orienta, justifica e alerta — nunca impõe.** O servidor mantém a
discricionariedade; a plataforma aumenta a segurança jurídica sem tirá-la.

Todo bloqueio novo precisa de válvula de escape ("seguir mesmo assim, com
justificativa") e de explicação acessível. Só travam de fato as seções
indispensáveis do documento e as dependências que o processo de fato contém.

## 3. Ordem de leitura obrigatória

1. este documento;
2. [`SETUP_INICIAL.md`](SETUP_INICIAL.md) — ambiente rodando;
3. [`../../geradocs-backend/docs/ordem-de-implementacao.md`](../../geradocs-backend/docs/ordem-de-implementacao.md) — **o que fazer primeiro**;
4. [`estrutura.md`](estrutura.md) — onde cada tipo de código mora;
5. [`fluxo-contratacao.md`](fluxo-contratacao.md) — o domínio: documentos, ordem e fundamento legal;
6. [`estilizacao.md`](estilizacao.md) — como estilizar sem violar o Design System;
7. [`decisions.md`](decisions.md) — o que já foi decidido e por quê;
8. [`perfis-acesso.md`](perfis-acesso.md) — autenticação e RBAC.

`design_system/readme.md` é **normativo**: em conflito com o código, ele vence.

A skill `geradocs-ui-guardrails` (em `.claude/skills/`) resume essas regras e deve
ser consultada em toda tarefa de interface, dado ou domínio.

## 4. Estado atual

- **Autenticação é real** desde 20/08/2026: login, refresh, `/me`, logout e
  recuperação/redefinição de senha falam com a API Spring por
  `lib/api/auth-client.ts`. O access token vive só em memória; o refresh token é
  cookie `HttpOnly`.
- **Todo o resto ainda é mock**: processos, documentos, seções, versões e o
  parecer da IA vivem em memória (`lib/api/client.ts` + `lib/mocks/fixtures.ts`) e
  somem ao recarregar.
- **A geração por IA é simulada.** Nenhum modelo está integrado.
- **Testes**: a suíte nasceu em 20/08/2026 cobrindo a camada de transporte. O
  resto do domínio entra no Bloco 3 da ordem de implementação.

## 5. Regras que a revisão cobra

- Dados **só** por hooks de `lib/api/hooks.ts`; `lib/mocks` nunca em componente.
- Componentes do DS **só** pelo barrel `@/components/ui`; ícones de `ui/icons`; zero emoji.
- Zero cor hex fora do `@theme` de `app/globals.css` — o lint falha.
- Fundamento legal citado literalmente; vocabulário de status fixo; valores sempre formatados.
- Rota dinâmica `[id]` é proibida para conteúdo de runtime: o app é *static export* e o id viaja como query param.
- Decisão nova exige registro em [`decisions.md`](decisions.md) **antes** do código.

## 6. Definição de pronto

`npm run check` verde (lint + aderência ao DS + type-check + testes) · teste novo
para comportamento novo · carregando, erro e vazio tratados · documentação
atualizada · commits em Conventional Commits.
