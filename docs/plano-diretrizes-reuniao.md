# Diretrizes da reunião × sistema atual — análise e plano de ação

Documento de trabalho. Confronta cada ponto discutido com o que o GeraDocs **já
faz hoje**, o que **precisa de ajuste** e o que **não existe**, e propõe a ordem
de implementação.

> **Companheiro obrigatório:** este documento trata do **produto**. A engenharia
> (arquitetura, testes, CI, chave de login plugável, camada de IA) está em
> [`plano-consolidacao.md`](../../geradocs-backend/docs/plano-consolidacao.md).
> As ondas funcionais abaixo só começam depois da Fase A daquele plano — mudanças
> transversais sem rede de teste é o risco mais caro disponível hoje.

> **Atualização de 20/08/2026 — a autenticação foi integrada de verdade.** Os
> commits `178ccf6` (frontend) e `e4d0b2c`/`23eb489` (backend) plugaram login,
> refresh, `/me`, logout e recuperação/redefinição de senha na API Spring. O que
> mudou neste plano por causa disso está marcado com **[20/08]**.

> **Ordem de execução:** as ondas deste plano estão sequenciadas junto com as do
> plano de engenharia em
> [`ordem-de-implementacao.md`](../../geradocs-backend/docs/ordem-de-implementacao.md).
> Use aquele documento para saber **o que fazer primeiro**; use este para saber
> **o que fazer e por quê**.

## 0. Advertência de leitura (vale para tudo abaixo)

**[20/08] O sistema deixou de ser 100% protótipo.** `lib/api/client.ts` virou uma
**fachada híbrida**: autenticação, sessão, refresh, logout e recuperação/redefinição
de senha falam com a API Spring (`lib/api/auth-client.ts`, 252 linhas); todo o
resto continua em memória. O backend segue com **apenas o módulo `access`
implementado** — `procurement`, `authoring`, `templates`, `generation`,
`workflow`, `files` e `reporting` ainda contêm só `package-info.java`.

Então, quando este documento diz "o sistema já faz" sobre processo, documento,
seção, versão, apontamento ou parecer da IA, isso continua significando **o
protótipo**: nada disso é persistido, tudo some ao recarregar. Nada invalida as
respostas dadas na reunião (o comportamento existe e está desenhado), mas o
esforço de cada item abaixo tem duas metades: ajustar o protótipo e implementar
de verdade no backend.

**[20/08] Três consequências da integração que mudam prioridades:**

1. **Os tipos do contrato passaram a ser escritos à mão.** `auth-client.ts`
   declara `BackendSession`, `AuthenticationResponse`, `BackendMembership` e o
   mapeamento de enums Java → tipos da interface, tudo digitado. Cada módulo
   migrado a seguir repetirá esse trabalho e o risco de divergência silenciosa.
   O contrato gerado do OpenAPI (Fase B do plano de consolidação) deixou de ser
   melhoria e virou **pré-requisito da próxima fatia de integração**.
2. **A sessão real fabrica dados de prefeitura.** `tenantDa()` monta o `Tenant` a
   partir de `organization` com `secretarias: []`, `pca` zerado, `timbrado: true`
   e um rodapé fixo — porque o backend ainda não expõe esses campos. Quem logar
   com organização real verá configuração inventada em `/configuracoes` e no
   timbre dos documentos. É aceitável como ponte, desde que fique explícito e com
   data para sair.
3. **Existe código de rede sem nenhum teste.** Renovação deduplicada, repetição
   única após `401`, mapeamento de Problem Details e o estado de erro do
   `GuardaSessao` são exatamente o tipo de lógica que falha em silêncio. Hoje o
   repositório não tem um único teste automatizado.

E o mais importante: **não existe camada de IA em lugar nenhum**. `gerarSecao`
(`lib/api/client.ts:407`) devolve uma string fixa, e `analisarDFD` devolve um
parecer de fixture. Como a geração automática de texto foi apontada no diálogo
como *o diferencial* frente à concorrência, isso muda a ordem do roadmap do
backend (hoje a IA só aparece na Fase 7).

---

## 1. Liberdade do servidor × orientação da plataforma (modalidade)

### O que já existe

| Diretriz | Situação | Onde |
|---|---|---|
| Campo no início para o servidor informar o tipo de contratação | **Já faz** — passo 1 do wizard, 8 modalidades em ChoiceCards | `app/(app)/processos/novo/page.tsx:307` |
| Documentos cabíveis por modalidade, obrigatórios marcados e travados | **Já faz** | `lib/documentos/catalogo.ts` (`REGRA_MODALIDADE`) |
| Acrescentar documentos ao processo depois de criado | **Já faz** — bloco "Adicionar documento ao processo" no hub, limitado aos cabíveis | `app/(app)/processos/detalhe/ClientPage.tsx:389` |
| Contratação direta não oferece Edital, com aviso explicando | **Já faz** | `novo/page.tsx:609` |

### O que falta

1. **Trocar a modalidade depois de criado o processo — não é possível hoje.**
   `atualizarProcesso` aceita apenas `secretaria`, `objeto`, `objetoDemanda`,
   `dfdArquivo` e `documentos` (`lib/api/client.ts:350-360`); a tela "Editar
   Dados" não expõe modalidade. Este é exatamente o cenário do diálogo: a
   modalidade amadurece durante o ETP, no levantamento de mercado.
2. **Alerta no ato da troca**, listando o que muda: documentos que passam a ser
   obrigatórios, documentos que deixam de ser cabíveis (ex.: Edital ao migrar
   para Dispensa) e o que acontece com o que já foi gerado.
3. **Recomendação da IA** ("Com base nas informações fornecidas, o Pregão
   Eletrônico parece mais adequado. Deseja seguir?"). Não existe nada — nem o
   analisador, nem o componente de alerta, nem o registro da decisão.
4. **Registro da divergência**: quando o servidor mantém a escolha contrária à
   recomendação, a justificativa precisa ficar gravada e disponível para o texto
   do ETP. Não há campo para isso.

### Como implementar

- `Processo`: novos campos `justificativaModalidade?: string` e
  `recomendacaoModalidade?: RecomendacaoModalidade` (`{ sugerida, confianca,
  justificativa, fundamento, decisao: "seguida" | "mantida", decididoEm }`).
- `AtualizarProcessoInput` passa a aceitar `modalidade`; o hub ganha um
  `Dropdown` de modalidade no modo de edição.
- Novo helper `impactoTrocaModalidade(de, para, documentosDoProcesso, gerados)`
  em `lib/documentos/catalogo.ts`, devolvendo `{ passamASerObrigatorios,
  deixamDeSerCabiveis, geradosAfetados }` — usado no diálogo de confirmação.
- Novo componente `AlertaOrientacao` em `components/shared/` (padrão reutilizável
  "recomendação + Seguir / Manter e justificar"), a ser reaproveitado em todos os
  outros alertas da plataforma.
- `analisarModalidade(processoId)` no client, disparado em três momentos: ao
  concluir o passo 2 do wizard, após a análise do DFD, e ao concluir a seção
  "Levantamento de Mercado" do ETP (inciso V) — que é onde o diálogo diz que a
  definição amadurece.
- **Decisão pendente da equipe:** documento já gerado que deixa de ser cabível na
  nova modalidade — mantém no repositório marcado como "de modalidade anterior",
  ou é arquivado? Recomendo manter e marcar (rastreabilidade).

---

## 2. A plataforma não pode travar o usuário

### O que já existe — esta diretriz já é a arquitetura do produto

| Diretriz | Situação | Onde |
|---|---|---|
| Só o indispensável trava a geração | **Já faz** — no ETP, 13 seções e só 5 obrigatórias (Art. 18, § 2º) | ADR 15 · `documento/ClientPage.tsx:80` |
| Orientação em vez de bloqueio | **Já faz** — cada seção carrega `hint` + `fundamentoLegal` | `lib/documentos/secoes.ts` |
| Dependência só trava o que o processo realmente contém | **Já faz** — `pendencias()`; no Leilão o Edital não espera um TR inexistente | `catalogo.ts:pendencias` |
| Dependência pendente vira tag "Requer …", não erro | **Já faz** | `detalhe/ClientPage.tsx:298` |

Ponto 2 da resposta ("hoje o sistema já tem essa característica") **procede** —
com três ressalvas.

### Ressalvas / ajustes

1. **Seção dispensável é omitida em silêncio.** O Art. 18, § 2º admite dispensar
   os demais incisos *mediante justificativa*; hoje a seção em branco
   simplesmente não entra no documento, sem registro. Falta
   `justificativaDispensa?: string` por seção e, na geração, um parágrafo
   automático "O inciso X foi dispensado por [justificativa]".
2. **Documento obrigatório da modalidade não pode ser desmarcado** no wizard
   (checkbox travado). Coerente com a lei na maioria dos casos, mas é o único
   ponto onde a plataforma realmente trava. Sugiro a válvula de escape padrão:
   "remover mesmo assim, com justificativa" — registrada na trilha.
3. **Não existe o padrão visual de "alerta + justificar + seguir"**. Há
   `InfoBanner` e `ValidationMsg`, ambos passivos. O `AlertaOrientacao` do item 1
   é o componente que materializa esta diretriz em todo o sistema.

---

## 3. Retificação, versionamento e errata

### O que já existe

| Diretriz | Situação | Onde |
|---|---|---|
| Nova versão do documento ao alterar | **Já faz** — `gerarDocumento` incrementa `versao` e empilha a anterior no histórico, nunca sobrescreve | `client.ts:681` |
| Histórico consultável | **Já faz** — `getHistoricoVersoes`, nota por versão ("Geração inicial" / "Regeração" / "Retificação: n apontamento(s)") | `client.ts:668` |
| `v{n}` visível na tela de Documentos | **Já faz** | `app/(app)/documentos/page.tsx` |

Ponto 3 da resposta procede: o versionamento existe.

### O que falta

1. **O rótulo "RETIFICADO" não existe.** O título permanece `TIPO — objeto`; a
   versão só aparece na listagem. Falta carregar o rótulo para o título, o
   cabeçalho/timbre e o arquivo gerado.
2. **Não há snapshot do conteúdo por versão.** `atualizarSecao` altera a seção no
   lugar (`client.ts:396`); o que se versiona é o *metadado do arquivo*, não o
   texto. Isso significa que hoje **é impossível gerar uma errata**, comparar
   versões ou provar o que mudou. É a lacuna estrutural deste ponto — e o
   `domain-model.md` do backend (§5) já prescreve o snapshot canônico por
   `DocumentVersion`; falta refletir isso no protótipo.
3. **Errata ("Onde se lê… Leia-se…") não existe** em nenhuma camada.
4. **A retificação não tem porta de entrada própria.** Hoje ela nasce dos
   apontamentos criados pelo gestor na fila de aprovações — que o ponto 4 remove.
   Sem a fila, é preciso um botão "Retificar documento" no hub/repositório.

### Como implementar

- `VersaoDocumento` ganha `snapshot: Array<{ id, titulo, conteudo }>`,
  `classificacao: "inicial" | "regeracao" | "erro_material" | "substancial"` e
  `motivo: string`.
- `gerarDocumento` grava o snapshot; da v2 em diante o documento recebe o rótulo
  `RETIFICADO` (título, badge na listagem, cabeçalho do arquivo).
- `diffVersoes(processoId, tipo, versaoA, versaoB)` — comparação por seção,
  reaproveitando os códigos estáveis de seção.
- `gerarErrata(processoId, tipo, versaoBase, versaoNova)` — monta as linhas
  "Onde se lê / Leia-se" a partir do diff. **Facultativa**, como pedido no
  diálogo: um checkbox no fluxo de retificação.
- Fluxo de retificação no hub: `Retificar` → escolher *erro material* (oferece
  errata) ou *alteração substancial* (só nova versão) → editar → regerar.
- **Decisão pendente:** a Errata é um documento do catálogo (aparece no
  repositório com id próprio `DOC-…`) ou um anexo da versão? Recomendo anexo da
  versão — ela não pertence à matriz modalidade × documentos.

---

## 4. Fluxo de aprovação entre setores — sai do escopo (GPI faz)

Esta é a mudança de maior impacto do diálogo, e a mais barata em valor entregue:
remove complexidade que não é do produto.

### O que existe hoje e será desmontado

| Peça | Tamanho | Onde |
|---|---|---|
| Tela de aprovações (fila, checklist, parecer jurídico, decisão, apontamentos, trilha) | 869 linhas | `app/(app)/aprovacoes/page.tsx` |
| Máquina de estados com 6 status | — | `lib/processos/fluxo.ts` |
| Guardas: `obrigatoriosPendentes`, `montarChecklist`, `empurrarTransicao`, `decidirAprovacao`, apontamentos | ~200 linhas | `lib/api/client.ts:425-665` |
| Botão "Enviar para Aprovação", travado até os obrigatórios estarem gerados | — | `detalhe/ClientPage.tsx:417` |
| Item de menu + badge de contagem + rota no RBAC | — | `lib/auth/acesso.ts` |
| Indicadores "Aguardando Aprovação"/"urgentes" no dashboard | — | `app/(app)/page.tsx`, `EstatisticasDashboard` |
| **Backend:** papéis de workflow **obrigatórios** no cadastro (`SERVIDOR_COMPRAS`, `SECRETARIA_DEMANDANTE`, `COMISSAO`, `JURIDICO`, `GESTOR_APROVADOR`) | — | módulo `access` (já implementado e testado) |
| **[20/08] Frontend:** `papelDa()` deriva o papel exibido de `activeMembership.workflowRoles`, com fallback para `servidor_compras` | — | `lib/api/auth-client.ts` |
| **Backend:** Fase 6 inteira do roadmap + `Review`, `LegalOpinion`, `ApprovalDecision`, `ChangeRequest` no modelo de domínio | — | `docs/backend-roadmap.md`, `docs/domain-model.md` |

A avaliação "a remoção dessa aba é bem simples" está **correta para a aba**, mas
subestima a cauda: o vocabulário de status, o dashboard, o checklist, a origem
dos apontamentos e — principalmente — os **papéis de workflow já persistidos no
backend**, que hoje são exigência de validação no cadastro de usuário.

### Plano de remoção

1. **Status.** Reduzir `StatusProcesso` de seis para três: `rascunho` →
   `em_elaboracao` → `concluido` (e, se a equipe quiser, `cancelado`). Encerramento
   quando todos os documentos do processo estiverem gerados; reabertura auditada
   para retificar.
2. **Manter a trilha.** `TransicaoAprovacao` vira `EventoProcesso` (criação,
   troca de modalidade, geração de documento, retificação, encerramento,
   reabertura). Custa pouco e é o único registro do que aconteceu *dentro* da
   plataforma — o GPI registra só o que acontece depois.
3. **Remover** a rota `/aprovacoes`, o item de menu, o badge, a regra de RBAC, o
   checklist, o parecer jurídico como gate e as funções de decisão.
4. **Dashboard**: trocar "Aguardando Aprovação" por "Processos em elaboração" e
   "Documentos pendentes".
5. **Backend**: tornar `workflowRoles` opcional (hoje exige ao menos um papel
   para `COORDENADOR`/`SERVIDOR`) — migração + ajuste de validação e testes. O
   RBAC passa a se apoiar só em `PerfilAcesso`. **[20/08]** Isso agora tem um
   consumidor vivo: `papelDa()` em `auth-client.ts` deriva o papel exibido dos
   `workflowRoles` da sessão. Com a lista vazia, o fallback silencioso
   `servidor_compras` passa a valer para todo mundo — ou o campo `papel` sai do
   modelo junto com o workflow, ou vira derivação explícita do `PerfilAcesso`.
   Decidir junto, não depois.
6. **Documentação**: marcar a Fase 6 do roadmap como fora do MVP e retirar
   `Review`/`LegalOpinion`/`ApprovalDecision` do modelo ativo (manter registrado
   como módulo futuro, conforme o próprio diálogo prevê).

### Decisões pendentes da equipe

- **Apontamentos por seção** (`ApontamentoRetificacao`): nasceram do gestor na
  fila. Sumem junto, ou sobrevivem como "revisão interna" (o coordenador aponta
  ajustes ao servidor **dentro do mesmo setor**, sem workflow entre setores)?
  Recomendo manter a estrutura, fora do caminho crítico — é barato e cobre o caso
  real de duas pessoas trabalhando o mesmo processo.
- **Parecer jurídico (Art. 53)**: acontece no GPI. Sugiro manter apenas como
  *anexo opcional* do processo, para o dossiê ficar completo, sem gate nenhum.

---

## 5. Cadastro e login — CPF por enquanto, com a chave trocável

> **Decisão da equipe (20/08/2026):** o login **continua por CPF**. O que muda é
> que a chave deixa de estar cravada no código: e-mail ou matrícula passam a ser
> uma configuração, sem reescrever autenticação, throttling, auditoria ou
> recuperação de senha. Desenho completo em
> [plano-consolidacao.md §7](../../geradocs-backend/docs/plano-consolidacao.md).

### O que existe hoje

- **Frontend**: login por **CPF + senha** (`app/(auth)/login/page.tsx`), com
  `validaCPF`, máscara e cinco contas demo por CPF.
- **Backend**: login por **CPF + senha** (`POST /api/v1/auth/login`); `users.cpf`
  é único, obrigatório (exceto em `PENDING_ACTIVATION`), a ativação do
  administrador legado exige CPF, e a **proteção contra força bruta é chaveada
  por hash do CPF + IP**. O `/me` expõe o CPF completo só ao próprio usuário e
  mascara CPF de terceiros.
- **`users.email` já existe e já é único** (`V002`).
- **Não existe matrícula nem número de decreto** em nenhuma camada
  (`lib/types.ts:Usuario`, tabela `users`).
- **[20/08] O CPF agora está cravado em mais um lugar: o transporte.**
  `auth-client.ts` envia `{ cpf, password, organizationId }` em
  `autenticar()`, converte qualquer falha em `"CPF ou senha inválidos."`, e a
  tela de login mantém estado `cpf` com `formatCPF`. Antes da integração eram
  cinco pontos de acoplamento no backend; agora são **oito**, contando os três do
  frontend. Cada fatia nova de integração aumenta esse número — é o argumento
  para fazer a chave plugável **antes** da próxima fatia, não depois.
- **[20/08] Ponto a favor**: o payload já carrega `organizationId`, então a
  migração para `{ identifier, password, organizationId }` é aditiva — o backend
  aceita os dois campos durante a transição e nenhuma janela de indisponibilidade
  é necessária.

### O que muda

Backend (migração `V007`):

- `LoginIdentifierPolicy` como porta, com implementações para CPF, e-mail e
  matrícula, selecionadas por `geradocs.auth.login-identifier` (padrão: `CPF`);
- corpo do login passa a ser `{ identifier, password }`, aceitando `cpf` por
  compatibilidade durante a transição;
- `login_attempts` e a auditoria passam de `cpf_hash` para
  `identifier_hash` + `identifier_type` — é o **rechaveamento que hoje impediria
  trocar a chave**, e é o trabalho real desta fase;
- adicionar `registration_number` (matrícula) e `appointment_decree` (decreto de
  nomeação), ambos nulos, matrícula com índice único parcial;
- a obrigatoriedade da chave ativa sai do banco e vai para a aplicação, dirigida
  por configuração — deixá-la em `CHECK` exigiria uma migração a cada troca;
- **recuperação de senha continua por e-mail em qualquer configuração**: chave de
  identificação e canal de contato são coisas diferentes.

Frontend:

- `lib/auth/identificador.ts` descreve a chave ativa (rótulo, placeholder,
  máscara, validador) e a tela de login renderiza a partir do descritor;
- `Usuario` ganha `matricula?: string` e `decretoNomeacao?: string`;
- exibição/edição em `perfil/page.tsx` e no CRUD `admin/servidores`;
- **matrícula pesquisável na listagem de servidores** — é o que atende ao caso
  citado ("servidor desligado, bloquear com facilidade"). O bloqueio em si já
  existe: desativação lógica que revoga os refresh tokens.

**Prova de que a chave é plugável**: a suíte de autenticação inteira roda
parametrizada pelos três tipos de identificador no CI. Enquanto os três passarem,
a plugabilidade é fato verificado, não intenção.

---

## 6. DFDs desencontrados (Ecoporanga) — o problema novo

Levantado no fim do diálogo e **não coberto por nada do que existe**: várias
secretarias mandam DFDs para a mesma demanda e as incongruências só aparecem no
fim, no colo do servidor de compras.

### Situação atual

- **Um** DFD por processo: `Processo.dfdArquivo: string | null`.
- `analisarDFD(processoId, arquivo)` devolve um parecer de fixture (nota,
  classificação, achados) — sem IA real e sem noção de múltiplos documentos.
- A verificação já está corretamente posicionada como **etapa inicial do
  processo**, desacoplada do ETP (ADR 19) — a base conceitual está certa.

### Como implementar

- `Processo.dfds: AnexoDFD[]` — `{ arquivo, secretaria, responsavel, enviadoEm }`
  (mantendo `dfdArquivo` como alias durante a transição).
- `ParecerDFD` ganha `incongruencias: Incongruencia[]`, com tipo (objeto
  divergente, unidade de medida, quantidade, especificação técnica, prazo, preço
  unitário discrepante), secretarias envolvidas e sugestão de consolidação.
- **Tela de consolidação da demanda**: tabela unificada item × unidade ×
  quantidade por secretaria × total, com marcação do que diverge e resolução
  item a item.
- A tabela consolidada **alimenta diretamente** o painel de quantidades do ETP
  (inciso IV) e a Cotação — reaproveitando `PainelQuantidades`
  (`components/documentos/paineis.tsx`).
- Cruzamento item a item com o PCA do órgão (já configurado em `Tenant.pca`).

Este item, junto com o 7, é o que diferencia a plataforma. Vale priorizar acima
de refinamentos de UI.

---

## 7. ETP passo a passo, com texto gerado automaticamente

### O que já existe

| Diretriz | Situação | Onde |
|---|---|---|
| Editor passo a passo, seção a seção, com trilho de progresso | **Já faz** | `app/(app)/processos/documento/ClientPage.tsx` |
| Comando de gerar texto por seção | **Já faz na interface** — botão "Gerar com IA" | `ClientPage.tsx:handleGerarIA` |
| Servidor pode alterar o texto gerado | **Já faz** — textarea + salvar/avançar | idem |
| Cada seção com fundamento legal e orientação (insumo do prompt) | **Já faz** | `lib/documentos/secoes.ts` |
| Painéis estruturados (quantidades, valor, ATA) | **Já faz** | `components/documentos/paineis.tsx` |
| Roteiro 1-objeto, 2-necessidade, 3-PCA | **Parcial** — o objeto é capturado no wizard; o ETP começa em "Descrição da Necessidade"; PCA é a seção 2 | `secoes.ts:71` |

### O que falta

1. **A IA não existe.** `gerarSecao` devolve uma frase montada por template
   (`client.ts:407`). Não há provider, prompt, contexto (DFD, PCA, cotação,
   seções anteriores), nem regeração com instrução ("refaça enfatizando X").
2. **Estrutura seccional é fixa.** O servidor **não pode acrescentar, excluir ou
   reordenar** seções, e **subtópicos não existem** — `SecaoDocumento` não tem
   filhos. O diálogo pede exatamente isso.
3. **"Objeto" não é o passo 1 do ETP.** Vem do wizard. Sugiro exibi-lo como passo
   0 do editor (campo ligado a `objetoDemanda`), para o roteiro bater com o que o
   servidor espera — sem inventar seção legal que o Art. 18 não prevê.
4. **A previsão no PCA é um textarea.** O diálogo pede: anexar o PCA (ou usar o
   já configurado no órgão) e a plataforma **descobrir** se há previsão, com a
   opção de o servidor apenas marcar que há. Falta `verificarPCA(processoId)` →
   `{ previsto, item, confianca, fonte }` e um `painel: "pca"` para a seção 2.
5. **Planilhas não são geradas automaticamente.** Quantidades e valor são
   formulários manuais; deveriam vir pré-preenchidos da consolidação dos DFDs
   (item 6) e da Cotação.

### Como implementar

- `SecaoDocumento` ganha `origem: "catalogo" | "usuario"`, `ordem`,
  `subsecoes?: SecaoDocumento[]`, `dispensada?: boolean` e
  `justificativaDispensa?: string`.
- Client: `adicionarSecao`, `adicionarSubsecao`, `removerSecao`,
  `reordenarSecoes`, `gerarSecao(secaoId, instrucao?)`.
- Geração encadeada: o prompt de cada seção recebe objeto, DFDs consolidados,
  PCA, seções já concluídas e o `fundamentoLegal` + `hint` da seção — que é
  literalmente o que `secoes.ts` já documenta como propósito.
- **Impacto no modelo de domínio do backend**: `domain-model.md` §2 trata
  `TemplateSection` como imutável e `SectionResponse` como única por seção de
  template. Seções criadas pelo usuário exigem um conceito novo
  (`ad_hoc_section` vinculada à `DocumentVersion`) — precisa entrar no documento
  antes da Fase 3.
- **Impacto no roadmap do backend**: um módulo `ai` (porta de provider, catálogo
  de prompts versionado, contexto do processo, orçamento de custo/latência,
  auditoria do texto gerado) precisa nascer **junto com a Fase 3**, não na Fase 7.

---

## Plano de ação — ordem sugerida

Tamanhos relativos: **P** pequeno · **M** médio · **G** grande.

### Onda 1 — simplificação e destravamento (só frontend, alto retorno)

| # | Entrega | Tam. |
|---|---|---|
| 1.1 | Remover aprovações: tela, rota, menu, badge, RBAC, checklist, decisões, gate do parecer jurídico | M |
| 1.2 | Reduzir `StatusProcesso` para `rascunho` / `em_elaboracao` / `concluido`; encerramento ao gerar todos os documentos; trilha vira `EventoProcesso` | M |
| 1.3 | Dashboard e filtros ajustados ao novo vocabulário | P |
| 1.4 | Descritor de identificador de login no frontend (CPF ativo) **cobrindo também `auth-client.autenticar()` e a mensagem de erro**; matrícula e decreto (facultativos) no cadastro/perfil/admin | M |
| 1.5 | Trocar modalidade no hub + alerta de impacto (`impactoTrocaModalidade`) + componente `AlertaOrientacao` | M |
| 1.6 | Rótulo `RETIFICADO` da v2 em diante + botão "Retificar" no hub | P |
| 1.7 | **[20/08]** Marcar explicitamente na interface o que ainda é dado sintético do `tenantDa()` (secretarias, PCA, timbre) até o backend expor esses campos | P |

### Onda 2 — backend alinhado às decisões

| # | Entrega | Tam. |
|---|---|---|
| 2.1 | `V007`: `LoginIdentifierPolicy` plugável (CPF ativo), `registration_number`, `appointment_decree`; **rechavear força bruta e auditoria para `identifier_hash` + `identifier_type`** | M |
| 2.2 | `workflowRoles` opcional; RBAC só por `PerfilAcesso`; **decidir o destino de `Usuario.papel` e de `papelDa()`**; testes atualizados | P |
| 2.3 | Atualizar `domain-model.md` (§7 estados, §2 seções ad hoc) e `backend-roadmap.md` (Fase 6 fora do MVP; módulo `ai` na Fase 3) | P |
| 2.4 | Fase 3 do roadmap: processo, anexos DFD, template ETP, versões e seções persistidos | G |

### Onda 3 — a camada de IA (preparada agora, provedor depois)

> **Decisão da equipe (20/08/2026):** nenhum modelo será integrado nesta etapa. O
> que se constrói agora é a camada plugável — portas, registro de provedores,
> prompts versionados, auditoria e adaptadores `none`/`template` — de modo que a
> integração futura seja troca de adaptador. Ver
> [plano-consolidacao.md §8](../../geradocs-backend/docs/plano-consolidacao.md).

| # | Entrega | Tam. |
|---|---|---|
| 3.1 | Módulo `ai` no backend: portas, registro de provedores, prompts versionados, montagem de contexto, auditoria e custo — com `NoopAiAdapter` e `TemplateAiAdapter` | G |
| 3.2 | Geração por seção com regeração instruída e encadeamento de contexto, servida pelo `TemplateAiAdapter` (provedor real entra sem tocar em domínio/aplicação) | M |
| 3.3 | Recomendação de modalidade + registro da divergência justificada | M |
| 3.4 | Verificação automática de previsão no PCA (`painel: "pca"`) | M |

### Onda 4 — consolidação de DFDs (dor da Ecoporanga)

| # | Entrega | Tam. |
|---|---|---|
| 4.1 | Múltiplos DFDs por processo, com secretaria de origem | M |
| 4.2 | Detecção de incongruências entre DFDs | G |
| 4.3 | Tela de consolidação da demanda alimentando quantidades e cotação | G |

### Onda 5 — editor flexível e errata

| # | Entrega | Tam. |
|---|---|---|
| 5.1 | Acrescentar/excluir/reordenar seções e subtópicos | G |
| 5.2 | Snapshot de conteúdo por versão + `diffVersoes` | M |
| 5.3 | Errata "Onde se lê / Leia-se" (facultativa) | M |
| 5.4 | Justificativa de dispensa de seção (Art. 18, § 2º) no documento gerado | P |

---

## Decisões que dependem da equipe

1. Vocabulário de status: reduzir para três (quebra filtros/badges/fixtures, mas
   é honesto) ou manter os seis com quatro inertes?
2. Apontamentos por seção sobrevivem como revisão interna do mesmo setor?
3. Parecer jurídico: some do produto ou vira anexo opcional do dossiê?
4. Documento já gerado que deixa de ser cabível após troca de modalidade: manter
   marcado ou arquivar?
5. Errata: documento próprio no repositório ou anexo da versão?
6. CPF: continua obrigatório no cadastro (mesmo sendo a chave de login hoje) ou
   vira opcional de fato quando a chave mudar?
7. Qual provedor de IA — e, antes dele, o ADR de LGPD sobre o que pode ir no
   prompt.

## Documentos a atualizar quando as ondas 1 e 2 fecharem

- `docs/fluxo-contratacao.md` — seção "Fluxo de aprovação e retificação" precisa
  ser reescrita: o produto encerra na geração dos documentos.
- `docs/decisions.md` — novas ADRs: remoção do workflow, identificador de login plugável, troca
  de modalidade com recomendação, retificação/errata.
- `docs/perfis-acesso.md` — login e matriz de rotas sem `/aprovacoes`.
- `geradocs-backend/docs/domain-model.md` e `backend-roadmap.md` — conforme 2.3.
