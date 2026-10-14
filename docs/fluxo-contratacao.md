# Fluxo de contratação — como o produto espelha a Lei 14.133/21

Este documento é a referência de domínio do GeraDocs: que documentos existem, em que ordem, com que fundamento e o que ainda falta. Quem for mexer no catálogo de documentos, no wizard ou no hub do processo lê isto antes.

A fonte de verdade em código é `lib/documentos/` — `catalogo.ts` (ordem, dependências, regras por modalidade) e `secoes.ts` (a estrutura seccional de cada documento, com o fundamento legal citado literalmente).

## Fases da contratação

A Lei 14.133/21 organiza a contratação em três fases. O GeraDocs atua na **primeira**.

| Fase | O que acontece | No produto |
|---|---|---|
| **Planejamento** (fase preparatória, Art. 18) | Formalização da demanda, estudos, pesquisa de preços, riscos, TR, edital e minuta contratual | **É o escopo do GeraDocs** |
| **Seleção do fornecedor** (Art. 17, II) | Publicação, propostas, julgamento, habilitação, adjudicação, homologação | Fora do escopo |
| **Execução contratual** | Assinatura, gestão, fiscalização, aditivos | Fora do escopo |

## Insumos que não são documentos gerados

- **PCA — Plano de Contratações Anual** (Art. 12, VII): toda contratação deve estar nele previstas. No produto é **configuração do órgão** (`Tenant.pca`), usada como contexto de conformidade — o ETP demonstra a previsão (inciso II) e a verificação do DFD cruza com ele.
- **DFD — Documento de Formalização da Demanda** (Art. 6º): é o artefato que **instaura** o processo, elaborado pelo setor requisitante. No produto é **anexo** + uma verificação inicial opcional por IA. Não é gerado pela plataforma.

### Verificação do DFD pela IA — quando aparece

É a **etapa inicial** do processo, não uma fase atrelada ao ETP. A IA analisa o DFD anexado quanto à completude, à conformidade legal e à compatibilidade com o PCA, e emite um parecer persistido por processo (`ParecerDFD`).

Regras de conformidade:

- **Desacoplada do ETP.** O valor da verificação é a qualidade da *demanda*, que fundamenta qualquer documento subsequente — não só o ETP. Uma Inexigibilidade que gere apenas o TR também se beneficia. Por isso nenhuma tela deve dizer "antes do ETP"; o correto é "antes de elaborar os documentos".
- **Gate na presença do DFD, não na seleção do ETP.** A verificação só é oferecida quando há um DFD anexado (o que se verifica é o documento). Se o processo informa apenas o Objeto da Demanda, o wizard mostra o card desabilitado com a dica para anexar o DFD.
- **Dentro do processo, como primeira etapa.** Fica no processo (e não como ferramenta avulsa) porque o parecer é contextual e persistido por processo. Uma ferramenta avulsa de "verificar qualquer DFD" seria outra funcionalidade.
- Depois da verificação, o fluxo segue para o **primeiro documento do processo** na ordem canônica — que nem sempre é o ETP (numa Dispensa/Inexigibilidade sem ETP, é o TR).

## Ordem canônica dos documentos

Ordem declarada em `CATALOGO[tipo].ordem`. O hub do processo numera e ordena os cards por ela, e o wizard lista os documentos na mesma sequência.

| # | Documento | Fundamento | Por que nesta posição |
|---|---|---|---|
| 1 | **Cotação de Mercado** | Art. 23 + IN SEGES 65/2021 | É **insumo** da estimativa de valor do ETP: o Art. 18, § 1º, VI exige o valor "acompanhado dos preços unitários referenciais, das memórias de cálculo e dos documentos que lhe dão suporte" |
| 2 | **ETP** | Art. 18, § 1º | Consome a pesquisa de preços e fundamenta a contratação |
| 3 | **Mapa de Riscos** | Art. 18, X | Concomitante ao ETP; sua matriz de alocação (Art. 22) alimenta a cláusula correspondente do contrato |
| 4 | **TR** | Art. 6º, XXIII | Fundamenta-se no ETP (alínea "b") |
| 5 | **Edital** | Art. 25 | Tem o TR entre os seus elementos (Art. 25, § 3º) |
| 5.1 | **Contrato** (minuta) | Art. 89 a 95; cláusulas do Art. 92 | Consta obrigatoriamente como anexo do edital (Art. 18, VI), vinculado a ele e à proposta (Art. 92, II). Sem Edital no processo, vem por último, solta |
| 6 | **Aviso de Contratação Direta** | Art. 75, § 3º | Só na dispensa com disputa; faz o papel de chamamento que o edital faz na licitação, e se fundamenta no TR |

### Dependências

Declaradas em `CATALOGO[tipo].requer` e aplicadas por `pendencias()`:

- **TR requer ETP** · **Edital requer TR** · **Aviso requer TR** · **Contrato requer TR**
- Cotação e Mapa não travam nada — são concomitantes ao planejamento.

Uma dependência **só bloqueia se o processo de fato contiver aquele documento**. No Leilão, por exemplo, o Edital é obrigatório e não há TR (a avaliação do bem faz esse papel); o Edital não pode ficar esperando um documento que o processo nunca terá.

No hub, um documento com dependência pendente tem o botão de ação substituído por uma tag "Requer …" até que a dependência seja gerada.

### Anexos do edital

Declarados em `CATALOGO[tipo].anexoDe` e agrupados por `agruparAnexos()`.

A **minuta de contrato** consta obrigatoriamente como anexo do edital (Art. 18, VI), e todos os elementos do edital — minuta, TR, projetos e demais anexos — são divulgados com ele (Art. 25, § 3º). Por isso, no passo 3 do wizard e no hub do processo, a minuta aparece **sob o Edital**, numerada como subitem (5.1) e com a etiqueta "Anexo do Edital".

- **Continua sendo um documento próprio**, com editor, versões e geração independentes. Fundir as cláusulas no corpo do edital quebraria a contratação direta, que tem minuta sem ter edital, e misturaria duas peças que seguem caminhos diferentes depois da licitação: o contrato é assinado à parte.
- **O TR também é anexo do edital**, mas mantém o próprio lugar na ordem: é elaborado antes e fundamenta o Edital. Colocado sob ele, esconderia a sequência do fluxo.
- **Sem Edital no processo, a minuta fica solta.** É o caso da Dispensa e da Inexigibilidade, em que não há edital de que ela seja anexo (Art. 72).

**O arquivo do Edital leva os anexos ao final**, cada um em folha nova (ADR-040 do back-end): o TR e a minuta que o processo contém e já foram gerados, numerados em romanos na ordem do fluxo. O anexo ainda não gerado fica de fora sem travar a geração, e a etapa final do Edital avisa antes do clique (`anexosDoArquivo()` e `AnexosDoArquivo`). O TR e a minuta continuam saindo também em arquivo próprio.

## Matriz modalidade × documentos

Declarada em `REGRA_MODALIDADE` e, na dispensa, em `REGRA_DA_DISPENSA` — `regraDe(modalidade, forma)` escolhe. O wizard só oferece os tipos cabíveis à modalidade escolhida — os obrigatórios já vêm marcados e travados, e os recomendados vêm marcados mas podem ser desmarcados.

| Modalidade | Obrigatórios (travados) | Recomendados (marcados) | Opcionais (desmarcados) |
|---|---|---|---|
| Pregão Eletrônico · Concorrência · Diálogo Competitivo | ETP, TR, Edital | Cotação, Mapa, Contrato | — |
| Credenciamento (Art. 79; inexigibilidade do Art. 74, IV) | TR, Edital de chamamento | Cotação, ETP, Contrato | Mapa |
| Concurso (Art. 30) | ETP, Edital | Contrato | Cotação, Mapa, TR |
| Leilão (Art. 31) | Edital | Contrato | Cotação, Mapa, ETP, TR |
| **Dispensa Direta** (Art. 75) | TR | Cotação, Contrato | ETP, Mapa — **sem Edital nem Aviso** |
| **Dispensa com Disputa** (Art. 75, § 3º) | TR, Aviso | Cotação, ETP, Contrato | Mapa — **o Aviso no lugar do Edital** |
| **Inexigibilidade** (Art. 74) | TR | Cotação, Contrato | ETP, Mapa — **sem Edital** |

Os obrigatórios são os mesmos de `RequiredDocuments` no back-end (ADR-047), que os cobra no encerramento e os protege na retirada. **Obrigatório** é a peça que a lei exige; **recomendado** é o conteúdo que a lei exige mas admite noutra peça ou dispensa no caso concreto:

- **Minuta de contrato — marcada em todas.** O instrumento de contrato é obrigatório, salvo nas exceções do Art. 95 (dispensa por valor; compras com entrega imediata e integral), e, quando há edital, consta como anexo dele (Art. 18, VI). **O anexo que se apresenta sob o principal vem marcado com ele** — quem marca o edital já leva a minuta. No Leilão, desmarque quando a alienação se resolver na arrematação.
- **Cotação — marcada onde há contratação a estimar.** A estimativa de despesa é exigida (Art. 18, IV; Art. 23; Art. 72, II), e na contratação direta também a justificativa de preço (Art. 72, VII). Desmarcada no Leilão (o valor é o da avaliação do bem, Art. 31, § 2º) e no Concurso (o prêmio é fixado no edital, Art. 30).
- **Mapa de riscos — marcado nas licitações de contratação.** A análise de riscos integra a fase preparatória (Art. 18, X). Na contratação direta ela entra "se for o caso" (Art. 72, I).
- **ETP — recomendado na contratação direta onde costuma caber.** No Credenciamento e na Dispensa com Disputa vem marcado; a lei o exige só "se for o caso" (Art. 72, I).

**Contratação direta não gera edital de licitação.** O Art. 72 instrui o processo com DFD, ETP *quando for o caso*, TR, estimativa de despesa, parecer jurídico e autorização — por isso, nessas modalidades, o ETP é opcional (Art. 72, I) e o Edital não é oferecido. No Credenciamento (Art. 79), o "Edital" é o de chamamento público.

**A dispensa é direta ou com disputa (ADR-046 do back-end).** As duas são contratação direta, e quem abre o processo declara a forma — é ela que decide os documentos:

- **Direta:** o fornecedor é contratado sem disputa, nas hipóteses do Art. 75 que a dispensam (emergência, licitação deserta, entre outras). Sem Edital nem Aviso; o ETP só se for o caso (Art. 72, I). A Cotação vem marcada porque a estimativa de despesa e a justificativa de preço fazem parte da instrução (Art. 72, II e VII). Na dispensa por valor, a tela lembra que a lei prefere o aviso (Art. 75, § 3º).
- **Com disputa:** a contratação é precedida de aviso em sítio eletrônico oficial, por no mínimo 3 dias úteis, e seleciona a proposta mais vantajosa (Art. 75, § 3º) — a dispensa eletrônica. Tem as opções do pregão com o **Aviso de Contratação Direta no lugar do Edital**: TR e Aviso obrigatórios; Cotação, ETP e Contrato marcados. O ETP não é travado porque a lei o faculta nas dispensas por valor.

Trocar a forma no hub é troca de modalidade, com a mesma regra abaixo.

## Troca de modalidade, retirada e encerramento (ADR-047)

- **Trocar a modalidade (ou a forma da dispensa) acrescenta e não tira.** Entram para elaboração os obrigatórios da nova modalidade que faltavam — e, com um principal que entra, o anexo que vem marcado com ele (a minuta com o edital). Tudo o que já estava marcado ou elaborado continua no processo; o que a nova modalidade não prevê fica, sem ser cobrado, e sai só se o servidor o retirar. O back-end aplica a mesma regra ao gravar, e a trilha registra o que entrou e o que ficou.
- **Retirar do processo** só é oferecido ao que não é obrigatório na modalidade atual e não foi concluído. O back-end recusa as duas retiradas.
- **Encerrar** cobra os obrigatórios da modalidade **atual** — estejam na lista ou não. Faltando algum, pede justificativa (orienta, não trava). Opcional por fazer fica dito na tela e não pede justificativa; documento que a modalidade atual não prevê não é cobrado.

## Seções obrigatórias e dispensáveis

Cada seção declara `obrigatoria`. **Só as obrigatórias travam a geração do documento** — as demais podem ficar em branco e são omitidas.

Isso reflete o **Art. 18, § 2º**: no ETP, apenas os incisos **I, IV, VI, VIII e XIII** são indispensáveis; os outros podem ser dispensados mediante justificativa. Daí o ETP ter 13 seções mas só 5 obrigatórias.

| Documento | Seções | Obrigatórias |
|---|---|---|
| Cotação de Mercado | 5 | 5 |
| ETP | 13 (uma por inciso do Art. 18, § 1º) | 5 (Art. 18, § 2º) |
| Mapa de Riscos | 6 | 5 |
| TR | 10 (alíneas "a" a "j" do Art. 6º, XXIII) | 10 |
| Edital | 14 | 13 |
| Aviso de Contratação Direta | 8 | 8 |
| Contrato | 19 (cláusulas do Art. 92) | 16 |

O par `fundamentoLegal` + `hint` de cada seção é o que orienta o servidor na tela e, no backend, o que instruirá o modelo de IA a redigir a seção.

## Painéis especiais

Uma seção pode declarar `painel` e o editor genérico renderiza um formulário no lugar do textarea simples. Hoje: `quantidades` (ETP, inciso IV), `valor` (ETP, inciso VI — com as fontes de pesquisa na ordem de preferência da IN SEGES 65/2021, Art. 5º) e `ata` (ETP, inciso V — adesão a Ata de Registro de Preços, Art. 86). Ver `components/documentos/paineis.tsx`.

---

## Onde a plataforma termina

**A plataforma entrega os documentos; o protocolo e a aprovação acontecem fora dela.**

Na Prefeitura de Ecoporanga, o fluxo administrativo é o GPI da E&L: é lá que o
servidor protocola o processo, é lá que os documentos são assinados e é lá que a
comissão, o jurídico e o gestor se manifestam. Duplicar esse fluxo aqui criaria
duas verdades sobre o mesmo processo.

Decidido em 20–21/08/2026 — ADR [§24](decisions.md), [§25](decisions.md) e
[§26](decisions.md).

### Máquina de estados

Três status, e não seis:

```
Rascunho ──gera o primeiro documento──▶ Em Elaboração ──encerra──▶ Concluído
                                              ▲                        │
                                              └───────reabre───────────┘
```

- **Em Elaboração**: o processo ganhou o primeiro documento gerado.
- **Encerramento**: quando os obrigatórios da modalidade atual estão prontos. Se
  faltar algum, **a plataforma não impede** — pede justificativa, que fica
  registrada na trilha. Orientar sem travar é a regra de produto que vale acima
  das outras.
- **Reabertura**: para retificar um documento depois de encerrado. Corrigir não
  pode exigir criar outro processo, que quebraria o histórico.

A fonte da máquina de estados é [`lib/processos/fluxo.ts`](../lib/processos/fluxo.ts).

### O que a trilha registra

`EventoDoProcesso` sobrevive à remoção do fluxo porque é o **único registro do
que aconteceu dentro da plataforma** — o GPI só registra o que vem depois.
Eventos: criação, troca de modalidade, geração de documento, retificação,
encerramento e reabertura. Nem todos mudam o status: trocar a modalidade entra
na trilha sem transição.

### Retificação e versionamento

`gerarDocumento` **incrementa a versão** e guarda a anterior no histórico
(`VersaoDocumento`) — nunca sobrescreve sem rastro. A tela de Documentos mostra
`v{n}`.

O que **ainda falta** aqui está no [plano de produto](plano-diretrizes-reuniao.md):
o rótulo `RETIFICADO` da v2 em diante, o snapshot do conteúdo por versão (sem ele
não há errata possível) e a errata "Onde se lê… Leia-se…", facultativa.

### O que foi removido

Fila de aprovações, checklist de conformidade, parecer jurídico como *gate*,
apontamentos de retificação por seção e as decisões de aprovar, rejeitar e
solicitar retificação. Se um ente sem sistema de protocolo precisar disso um dia,
volta como **módulo próprio de workflow** — não como ressurreição destes status.

---

## Lacunas conhecidas (backlog futuro)

Itens reais que permanecem fora do escopo do produto (fase de planejamento) ou de fases seguintes:

### Retificação pós-publicação
Conceito distinto da retificação interna acima. Depois de publicado o edital, alteração vira republicação/errata (Art. 55, § 1º: nova divulgação e reabertura de prazos, salvo se não afetar as propostas). Na execução, vira termo aditivo (Art. 124) ou apostilamento (Art. 136). Fora do escopo — o produto encerra na fase preparatória.

### Perfis de acesso
A autenticação é real desde 20/08/2026 e o controle de acesso se apoia em três perfis — administrador geral, coordenador e servidor. Os papéis de workflow (comissão, jurídico, gestor aprovador) saíram junto com o fluxo de aprovação; ver ADR §26.

### Regime da Lei 13.303/16
Empresas estatais seguem regime próprio (RILC), não a 14.133/21. Hoje o produto assume 14.133 em todas as referências legais. Suportar estatais exigiria um campo de regime no `Tenant` e um mapa de fundamentos por regime.
