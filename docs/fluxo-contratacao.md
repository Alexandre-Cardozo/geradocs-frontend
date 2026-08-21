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
| 5 | **Edital** | Art. 25 | Tem o TR como anexo (Art. 25, § 1º) |
| 6 | **Contrato** (minuta) | Art. 89 a 95; cláusulas do Art. 92 | Anexo do edital, vinculado a ele e à proposta (Art. 92, II) |

### Dependências

Declaradas em `CATALOGO[tipo].requer` e aplicadas por `pendencias()`:

- **TR requer ETP** · **Edital requer TR** · **Contrato requer TR**
- Cotação e Mapa não travam nada — são concomitantes ao planejamento.

Uma dependência **só bloqueia se o processo de fato contiver aquele documento**. No Leilão, por exemplo, o Edital é obrigatório e não há TR (a avaliação do bem faz esse papel); o Edital não pode ficar esperando um documento que o processo nunca terá.

No hub, um documento com dependência pendente tem o botão de ação substituído por uma tag "Requer …" até que a dependência seja gerada.

## Matriz modalidade × documentos

Declarada em `REGRA_MODALIDADE`. O wizard só oferece os tipos cabíveis à modalidade escolhida — os obrigatórios já vêm marcados e travados.

| Modalidade | Obrigatórios | Opcionais |
|---|---|---|
| Pregão Eletrônico · Concorrência · Diálogo Competitivo · Credenciamento | ETP, TR, Edital | Cotação, Mapa, Contrato |
| Concurso | ETP, Edital | Cotação, Mapa, TR, Contrato |
| Leilão | Edital | Cotação, Mapa, ETP, TR, Contrato |
| **Dispensa Art. 75 · Inexigibilidade** | TR | ETP, Cotação, Mapa, Contrato — **sem Edital** |

**Contratação direta não gera edital de licitação.** O Art. 72 instrui o processo com DFD, ETP *quando for o caso*, TR, estimativa de despesa, parecer jurídico e autorização — por isso, nessas modalidades, o ETP é opcional (Art. 18, § 2º c/c Art. 72, I) e o Edital não é oferecido. No Credenciamento (Art. 79), o "Edital" é o de chamamento público.

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
- **Encerramento**: quando todos os documentos escolhidos estão prontos. Se
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
