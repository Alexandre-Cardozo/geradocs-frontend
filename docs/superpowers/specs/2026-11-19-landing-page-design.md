# Landing page da GovPro com o GeraDocs — design

Data: 2026-11-19 · Status: aguardando revisão · Worktree: `C:\geradocs-frontend-integration`

## 1. Objetivo e escopo

Uma página de apresentação da **GovPro** (empresa) que destaca o **GeraDocs** (produto). Ação principal do visitante: **solicitar uma demonstração** (gestor ou servidor de prefeitura, câmara ou órgão público).

Dentro do escopo: uma rota estática nova, `/landing-page`, com sete seções, cabeçalho e rodapé.

Fora do escopo: alterar a rota `/` (dashboard), formulário ou backend de contato, publicação/deploy, qualquer texto sobre a GovPro que não exista hoje (ver §9).

## 2. Restrições herdadas do projeto

- Static export (`output: "export"`, `trailingSlash: true`, `basePath` só em produção): sem fetch, sem rota dinâmica `[id]`, links por `next/link`.
- Camadas: `app/` só compõe; `components/` sem fetch nem regra; `lib/` sem JSX.
- Design System normativo: cor só por token (zero hex fora do `@theme` de `app/globals.css`), componentes e ícones pelos barrels `@/components/ui` e `@/components/ui/icons`, zero emoji.
- Decisão nova exige ADR em `docs/decisions.md` antes do código.
- Dependência nova só por `npm run deps:sync`. Este design não adiciona nenhuma.

## 3. Arquitetura

```
app/landing-page/page.tsx          componente de servidor; compõe as seções; exporta `metadata`
components/landing/
  cabecalho.tsx                    âncoras + CTAs; menu mobile (client)
  hero.tsx  problema.tsx  fluxo-geradocs.tsx  ia-sem-travar.tsx
  confianca.tsx  quem-somos.tsx  demonstracao.tsx  rodape.tsx
  moldura-de-tela.tsx              moldura em CSS para as capturas
  revelar.tsx                      wrapper de revelação ao rolar (client)
lib/landing/conteudo.ts            toda a copy como dados, sem JSX
public/landing/                    capturas de tela (PNG), com dados fictícios
```

- Fica fora de `(app)` e `(auth)`: não herda sidebar nem guarda de sessão (confirmar na implementação que a guarda só existe em `(app)`).
- `page.tsx` sem `"use client"`, para exportar `metadata` próprio (título e descrição da GovPro) e manter o HTML estático. Só `cabecalho` (menu) e `revelar` são client components.
- Os seis documentos do fluxo são lidos de `lib/documentos/catalogo.ts`; a landing não redeclara nome, ordem nem fundamento legal.
- "Solicitar Demonstração" é `mailto:contato@govpro.com.br` com assunto preenchido. "Acessar o GeraDocs" leva a `/login`.

## 4. Conteúdo

Português do Brasil, Title Case nos títulos, imperativo nas ações, sem emoji. Só fatos que existem no sistema; onde falta fato, `[LACUNA: …]` visível.

| Bloco | Conteúdo |
|---|---|
| Cabeçalho | Logos GovPro e GeraDocs; âncoras (O Problema, GeraDocs, IA, Confiança); "Solicitar Demonstração →" (primário) e "Acessar o GeraDocs" (secundário) |
| Hero | Eyebrow: "Contratações públicas inteligentes". H1: "Documentos da Contratação Pública, Conforme a Lei 14.133/21". Apoio: o GeraDocs, solução da GovPro, orienta o servidor em cada etapa da fase preparatória e gera os documentos com o timbre da entidade. Captura do editor |
| O Problema | "Do Word e dos Modelos Soltos para um Fluxo Guiado": arquivos soltos → processo único; ordem real da contratação; texto do zero → proposta revisável |
| O GeraDocs e o Fluxo | DFD como insumo e PCA como contexto (não gerados). Seis documentos na ordem do `catalogo.ts`: Cotação de Mercado → ETP → Mapa de Riscos → TR → Edital → Contrato. Nota: na contratação direta o Edital dá lugar ao Aviso de Contratação Direta. Exportação DOCX/PDF com timbre |
| A IA Propõe, Você Decide | Proposta marcada como gerada por IA e revisada antes de aceitar; IA é facilitadora, nunca condição; a plataforma orienta e nunca trava (toda trava tem saída com justificativa); a IA trabalha com o que consta no processo, sem conhecimento próprio |
| Confiança | Trilha de auditoria; LGPD inclusive no que vai à IA; teto de IA definido pela entidade e visível antes do clique; fundamento legal citado literalmente; protocolo, assinatura e aprovação ficam no sistema de processos da entidade |
| Quem Somos | Estrutura pronta, texto `[LACUNA: descrição da GovPro, serviços além do GeraDocs]` |
| Solicitar Demonstração | "Veja o GeraDocs no Seu Órgão" + botão `mailto:` |
| Rodapé | Logo, "GeraDocs é uma solução GovPro", contato@govpro.com.br, "© 2026 GovPro. Todos os direitos reservados." |

## 5. Design visual

- **Cor:** hero e demonstração em navy (`gradient-hero`, `FaixasDeCanto`, halo `royal/10 blur-3xl`); seções do meio alternando `ice` e `surface`. Ação em `royal` (hover `royal-hover`); foco `electric` sobre navy (`.on-dark`). Amarelo e verde só na `FaixaDaMarca`. Cards do fluxo com os acentos `doc-*` existentes. Estilo flat: borda de 1px, raio de 12px, sem sombra.
- **Tipografia:** Plus Jakarta Sans 800 nos títulos, Inter no corpo, Montserrat só no slogan e no endosso. Escala própria de marketing em tokens `--text-landing-*`: H1 `clamp(2rem, 5vw, 3.5rem)`, line-height 1,1, tracking −0,02em; H2 `clamp(1.5rem, 3vw, 2.25rem)`, line-height 1,2; corpo 16–18px, line-height 1,5–1,6, linha de 60–75 caracteres. `text-wrap: balance` nos títulos, `pretty` nos parágrafos, peso mínimo 400.
- **Layout:** contêiner centralizado com token `--container-landing` (~1120px). Espaço entre seções: 80–112px no desktop, 56–72px no mobile; entre grupos, pelo menos o dobro do espaço interno. Mobile-first, funcional em 320px e a 200% de zoom, sem rolagem horizontal. `scroll-mt-20` em cada seção com âncora, para o cabeçalho fixo de 64px.
- **Blocos:** hero em duas colunas (empilha no mobile); problema em três cards; fluxo em grade de seis cartões numerados (01 a 06), sem conectores desenhados — a ordem é dita pelo número e pela lista ordenada; IA em duas colunas; confiança em grade de cinco itens com ícone de linha.
- **Capturas:** reais, com dados fictícios (sem nome, CPF ou órgão reais — LGPD), em `public/landing/`, com `alt` descritivo, dentro de `moldura-de-tela` (borda, raio 12px, barra superior neutra, sem sombra). Ícones novos, se faltarem, entram em `components/ui/icons` no padrão existente.
- **Acessibilidade:** contraste ≥ 4,5:1 (conferido sobre navy para `on-dark-*`), foco visível, alvos de toque ≥ 44px no mobile, hover só onde há hover, `aria-label` em tudo que for só ícone, link "Ir para o conteúdo".

## 6. Movimento

Menos movimento é o padrão. Nada em loop, nada de parallax, sem biblioteca nova.

| Onde | Efeito | Duração | Curva |
|---|---|---|---|
| Hero, na carga | Entrada escalonada (eyebrow → H1 → texto → CTAs → captura), 100ms entre elementos: opacidade 0→1, blur 4px→0, translateY 12px→0 | 300ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Seções, ao rolar | Mesma revelação, uma vez; 100ms entre cards no fluxo e na confiança | 300ms | idem |
| Botões | Hover por troca de fundo; press com escala 0,96 | 150ms | ease-out |
| Menu mobile | Abre de escala 0,97 com fade; fecha mais curto | 250ms / 150ms | ease-out |
| Cabeçalho | Borda inferior aparece após rolar | 200ms | linear |

- Só `transform`, `opacity` e `filter` se animam; nenhum `transition: all`.
- Estado inicial escondido só é aplicado depois que `Revelar` monta no navegador: sem JavaScript, o conteúdo aparece.
- A captura do hero não fica escondida atrás do observer (LCP) e usa `priority`.
- `IntersectionObserver` desliga após a primeira revelação.
- Com `prefers-reduced-motion`, o conteúdo aparece direto, restando só fade de opacidade.
- Keyframes e curva entram no `@theme` (`--animate-landing-*`, `--ease-landing`), como `--animate-marca-varredura`. A animação de carregamento da marca não é usada.

## 7. ADRs (antes do código)

- **§107** — exceção do DS para entrada animada, restrita à landing e aos valores da §6.
- **§108** — escala tipográfica de marketing e contêiner de largura máxima como tokens novos.
- **§109** — a landing vive em `app/landing-page/`, fora de `(app)` e `(auth)`, sem sessão e sem fetch; a rota `/` não muda.

## 8. Testes e critério de pronto

- **vitest:** copy em PT-BR sem emoji; links `mailto:` e `/login`; os seis documentos vêm do `catalogo.ts` na ordem; teste que lista as lacunas `[LACUNA…]`; `Revelar` mostra o conteúdo sem JS e com movimento reduzido.
- **Guarda-corpos existentes** (zero hex, barrel, sem `lib/mocks` em componente) valem para a pasta nova.
- **Playwright:** a rota abre sem sessão e sem redirecionar; sem rolagem horizontal em 320px; âncoras e CTA funcionam; com movimento reduzido todo o conteúdo fica visível. Checagem de acessibilidade automática se o projeto já a tiver; senão, contraste e foco manuais.
- **Pronto quando:** `npm run check` e `npm test` verdes; e2e verde; guarda-corpos verdes; página estática abrindo sem sessão; nenhuma rota do app alterada; lacunas visíveis e listadas; `estrutura.md`, `estilizacao.md` e `decisions.md` atualizados; revisão com as skills `better-*`.
- Deploy e publicação ficam fora; a decisão de publicar com lacunas é do dono do produto.

## 9. Lacunas e riscos

1. Texto de "Quem Somos" e serviços da GovPro além do GeraDocs — a preencher pelo dono do produto.
2. Clientes, pilotos, números e depoimentos — inexistentes no material; não serão inventados, e a página não terá prova social até haver fato.
3. Estado de divulgação do produto: hoje em homologação; a página não afirma que está em produção até confirmação.
4. Capturas de tela com dados fictícios precisam ser produzidas.
5. O worktree está na branch `fix/mensagem-fontes-da-ia`; a implementação começa numa branch nova a partir de `integration/ai-frontend`.

## 10. Ordem de entrega (commits pequenos, Conventional Commits)

1. Branch nova a partir de `integration/ai-frontend`.
2. ADRs §107–§109.
3. Tokens no `@theme` (tipografia, contêiner, animação) + teste de guarda.
4. `lib/landing/conteudo.ts` + testes.
5. Componentes de base: `Revelar`, `moldura-de-tela`, cabeçalho, rodapé.
6. As sete seções (opcionalmente, direções do hero comparadas com a skill `variant`).
7. `page.tsx` com `metadata`.
8. Capturas de tela e `alt`.
9. e2e, revisão com `better-*`, atualização dos docs.
