# Skills do GeraDocs — Front-end

> Curadoria por camada, não por volume: skill demais polui o contexto do agente.
> Instalação com `npx skills add <owner/repo> -a claude-code -s <skill>`; o
> `skills-lock.json` versiona o que está instalado. Passo 1.2 da
> [ordem de implementação](../../geradocs-backend/docs/ordem-de-implementacao.md).
>
> Curadoria de 20/08/2026.

## Onde as skills moram neste repositório

Há **dois** diretórios, por histórico:

| Diretório | Conteúdo | Origem |
|---|---|---|
| `.agents/skills/` | 14 skills de conteúdo, design e stack (`frontend-design`, `shadcn`, `web-design-guidelines`, `vercel-react-best-practices`, `copywriting`, `seo-audit`, `docx`, `pdf`, …) | instaladas antes, com alvo universal |
| `.claude/skills/` | as skills de engenharia desta curadoria | instaladas com `-a claude-code` |

Consolidar em um único diretório é desejável, mas é mudança de convenção — fica
como decisão pendente, não como pendência técnica.

## Tier 1 — Núcleo (arquitetura, domínio e TDD)

| Skill | Origem | Para que serve aqui |
|---|---|---|
| `domain-modeling` | `mattpocock/skills` | Sustenta `lib/documentos/` e `lib/types.ts` como modelo de domínio, não como pasta de utilidades |
| `codebase-design` | `mattpocock/skills` | Desenho de módulos profundos — apoia a extração do domínio de dentro do mock (Bloco 5) |
| `improve-codebase-architecture` | `mattpocock/skills` | Varredura de oportunidades de arquitetura |
| `tdd` · `test-driven-development` | `mattpocock/skills` · `obra/superpowers` | Obrigatórios: o repositório sai de zero teste para suíte com gate (Blocos 1.7 e 3) |
| `systematic-debugging` | `obra/superpowers` | Depuração metódica da camada de transporte (`auth-client.ts`) |
| `verification-before-completion` | `obra/superpowers` | Casa com o "fecha quando" de cada passo da ordem de implementação |
| `using-superpowers` | `obra/superpowers` | Meta-skill que orquestra as demais da coleção |

## Tier 2 — Planejamento e workflow

| Skill | Origem | Uso |
|---|---|---|
| `writing-plans` · `executing-plans` | `obra/superpowers` | Executar a ordem de implementação por blocos, sem pular etapa |
| `to-spec` · `to-tickets` | `mattpocock/skills` | Transformar os blocos em specs e tickets acionáveis |
| `brainstorming` | `obra/superpowers` | Explorar alternativas **antes** de abrir uma ADR nova |

## Tier 3 — Qualidade e revisão

| Skill | Origem | Uso |
|---|---|---|
| `code-review` | `mattpocock/skills` | Revisão contra os padrões documentados do repositório |
| `requesting-code-review` · `receiving-code-review` | `obra/superpowers` | Ciclo de revisão — bloqueador de merge |
| `diagnosing-bugs` | `mattpocock/skills` | Diagnóstico de defeito |
| `playwright-cli` · `dev` | `microsoft/playwright-cli` | E2E e acessibilidade (Bloco 3.3) |

## Tier 4 — Git e higiene

| Skill | Origem | Uso |
|---|---|---|
| `git-guardrails-claude-code` | `mattpocock/skills` | Protege o histórico; complementa o hook versionado em `.githooks/` |
| `setup-pre-commit` | `mattpocock/skills` | Manutenção do hook de pré-commit |

## Não instaladas de propósito

- **`supabase/agent-skills`** — o banco aqui é PostgreSQL próprio, com Flyway como
  dono das migrations. A skill assume o ecossistema Supabase.
- **Coleções inteiras** — instalar `--all` traz 35 skills de uma vez e afoga o
  contexto. A curadoria é por camada.

## Skill própria do projeto

`.claude/skills/geradocs-ui-guardrails/` — guarda-corpos de interface e de
produto deste repositório. Ver passo 1.3 da ordem de implementação.
