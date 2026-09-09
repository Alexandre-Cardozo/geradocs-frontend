---
name: geradocs-ui-guardrails
description: Guarda-corpos de interface e de produto do front-end GeraDocs — Design System normativo, tokens como única fonte de cor, imports por barrel, dados só por hooks, vocabulário de status fixo, fundamento legal literal, valores sempre formatados e a regra de produto de que a plataforma orienta mas nunca trava o usuário. Use antes de criar ou alterar tela, componente, rota, hook, tipo de domínio ou catálogo de documentos; ao mexer em cor, espaçamento, tipografia ou ícone; ao adicionar bloqueio, validação ou botão desabilitado; e ao tocar em modalidade, seção de documento, versão, retificação ou autenticação. Use obrigatoriamente antes de qualquer decisão de arquitetura de front, que exige ADR antes do código.
---

# Guarda-corpos de interface — GeraDocs Front-end

Leia antes de escrever código: `docs/estrutura.md` (onde cada coisa mora),
`docs/estilizacao.md` (como estilizar), `docs/fluxo-contratacao.md` (o domínio) e
`docs/decisions.md` (o que já foi decidido). A ordem de trabalho é
`../geradocs-backend/docs/ordem-de-implementacao.md`.

## A regra de produto que vale acima das outras

**A plataforma orienta, justifica e alerta — nunca impõe.** O servidor mantém a
discricionariedade; a plataforma aumenta a segurança jurídica sem tirá-la.

Consequência prática: todo bloqueio novo precisa de uma válvula de escape
("seguir mesmo assim, com justificativa") e de uma explicação acessível. Botão
principal desabilitado sem `aria-describedby` apontando para o motivo é defeito,
não detalhe — e há teste cobrando isso.

Só travam de fato: seções **indispensáveis** do documento (no ETP, os incisos I,
IV, VI, VIII e XIII do Art. 18, § 2º) e dependência entre documentos que o
processo de fato contém.

## Camadas

`app/` só rotas e composição · `components/` interface reutilizável, sem fetch e
sem regra · `lib/` dados e domínio, sem JSX.

- Páginas consomem componentes e hooks.
- Componentes não conhecem rotas nem API.
- `lib/` não conhece React — exceto `lib/api/hooks.ts`, que é a ponte oficial.
- **Dados só por hooks** de `lib/api/hooks.ts`. Nenhuma tela chama o client direto.
- `lib/mocks/` é importado **apenas** por `lib/api/client.ts`. Nunca por componente.
- Regra de negócio vive em `lib/dominio/` e `lib/documentos/`, nunca dentro do client.

## Design System é normativo

Em conflito entre protótipo e DS, o DS vence. Antes de tarefa de UI, leia
`design_system/readme.md` e o `.prompt.md` do componente.

- Estilização por classes de token (`bg-royal`, `text-lg`, `rounded-card`).
- **Zero cor hex fora do `@theme` de `app/globals.css`** — o lint falha e há teste.
- Componentes do DS importados só do barrel `@/components/ui`; ícones de
  `@/components/ui/icons`. **Zero emoji na interface.**
- Responsivo mobile-first; a página nunca estoura horizontalmente.

## Conteúdo em PT-BR

- Title Case em títulos, imperativo em ações.
- **Fundamento legal citado literalmente**: "Art. 75, II, Lei 14.133/21".
- IDs e valores em monospace: `PROC-2024-089`, `R$ 485.000,00`.
- **Vocabulário de status fixo** — nenhum status é inventado na tela; sai de
  `STATUS_PROCESSO_LABEL`.
- **Valor nunca aparece cru**: exibir com `formatBRL`/`formatNumeroBR`; digitar com
  `MoneyInput`/`QuantityInput`. Nunca reimplemente máscara ou parse.

## Domínio: fonte única

Metadado por tipo de documento vive **só** em `lib/documentos/catalogo.ts`;
estrutura seccional em `secoes.ts`. Nunca espalhe pelas telas.

Todo `TipoDocumento` precisa existir nos três mapas — `CATALOGO`,
`REGRA_MODALIDADE` e `secoesPorTipoBase`. Há teste de exaustividade.

O DFD é **insumo** (anexo + verificação), não um dos seis documentos geráveis. O
PCA é contexto do órgão.

## Autenticação e transporte

- O access token vive **somente em memória**; o refresh token é cookie `HttpOnly`.
  Nada de token em `localStorage`, em nenhuma hipótese.
- Payload do backend não é declarado à mão: os tipos vêm do contrato gerado. O
  **mapeamento** para o modelo da interface é escrito à mão de propósito — é
  camada anticorrupção.
- Erro de API vira mensagem em PT-BR sem revelar se um usuário existe.

## Ao mexer em dependência

Use `npm run deps:sync`, nunca `npm install <pacote>` sozinho. Ele resolve o
lock dentro de um contêiner linux: no macOS o npm não busca o manifesto das
dependências opcionais do `sharp` para linux, o `npm ci` passa aqui e reprova no
runner dizendo que o lock está dessincronizado. Apagar o lock e reinstalar no
macOS não resolve.

## Anti-padrões proibidos

- Cor hex, cor arbitrária do Tailwind ou tamanho de fonte arbitrário.
- Import de `@/components/ui/forms` e afins em vez do barrel.
- `lib/mocks` importado por componente ou página.
- Regra de negócio dentro de `lib/api/client.ts`.
- Tipo de payload do backend declarado à mão em `lib/api/`.
- Status, rótulo de modalidade ou fundamento legal escrito solto na tela.
- Rota dinâmica `[id]` para conteúdo criado em runtime — o app é *static export*
  e o id viaja como query param (ADR 22).
- Tela sem tratamento de carregando, erro e vazio.
- Bloqueio sem explicação nem válvula de escape.

## Decisão nova? ADR antes do código

Registre em `docs/decisions.md`, no formato numerado existente, **antes** de
implementar. Nunca decida em silêncio.

## Checklist antes de concluir qualquer passo

- [ ] `npm run check` verde (ESLint + oxlint de aderência + type-check)?
- [ ] `npm test` verde, com teste novo para o comportamento novo?
- [ ] Guarda-corpos executáveis verdes?
- [ ] Carregando, erro e vazio tratados na tela?
- [ ] Valores e IDs formatados pelos helpers?
- [ ] Fundamento legal literal onde aparece?
- [ ] Nenhum bloqueio novo sem justificativa possível e explicação acessível?
- [ ] Documentação atualizada (`estrutura.md`, `decisions.md`, `fluxo-contratacao.md`)?
- [ ] Commits em Conventional Commits, pequenos e revisáveis?
