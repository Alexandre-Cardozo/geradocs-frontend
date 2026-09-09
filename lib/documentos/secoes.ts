/**
 * Estrutura seccional de cada documento gerável — domínio, não fixture.
 *
 * Cada seção declara o `fundamentoLegal` citado literalmente e um `hint` no
 * imperativo. Esse par é o que orienta o servidor na tela e, no backend, o que
 * instrui o modelo de IA a redigir a seção.
 */

import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/** Definição de uma seção antes de virar estado (status/conteúdo zerados). */
interface DefSecao {
  titulo: string
  /** Referência citada literalmente — nunca parafrasear. */
  fundamentoLegal: string
  hint: string
  /** Dispensável mediante justificativa. Por padrão a seção é obrigatória. */
  opcional?: boolean
  painel?: SecaoDocumento["painel"]
}

/** Monta seções zeradas, numerando-as na ordem declarada. */
function secoes(defs: DefSecao[]): SecaoDocumento[] {
  return defs.map((def, i) => ({
    id: String(i + 1),
    titulo: def.titulo,
    status: "Não iniciado",
    obrigatoria: !def.opcional,
    origem: "catalogo",
    conteudo: "",
    hint: def.hint,
    fundamentoLegal: def.fundamentoLegal,
    ...(def.painel ? { painel: def.painel } : {}),
  }))
}

/**
 * Cotação de Mercado — pesquisa de preços (Art. 23, Lei 14.133/21).
 * Insumo da estimativa de valor do ETP (Art. 18, § 1º, VI).
 */
const secoesCotacao: SecaoDocumento[] = secoes([
  {
    titulo: "Objeto da Pesquisa de Preços",
    fundamentoLegal: "Art. 23, Lei 14.133/21",
    hint: "Delimite o objeto e as especificações que balizam a coleta de preços, de modo que os preços obtidos sejam comparáveis entre si.",
  },
  {
    titulo: "Fornecedores e Fontes Consultadas",
    fundamentoLegal: "Art. 23, § 1º, Lei 14.133/21",
    hint: "Liste as fontes na ordem de preferência da IN SEGES 65/2021, Art. 5º: PNCP, contratações similares de outros entes, painel de preços, mídia especializada e, por último, pesquisa direta com fornecedores.",
    painel: "fontes",
  },
  {
    titulo: "Preços Coletados",
    fundamentoLegal: "Art. 23, § 2º, Lei 14.133/21",
    hint: "Registre os preços obtidos por fonte, com data da coleta, prazo de validade das propostas e identificação do fornecedor.",
    painel: "coletas",
  },
  {
    titulo: "Análise Crítica dos Preços Obtidos",
    fundamentoLegal: "Art. 6º, IN SEGES 65/2021",
    hint: "Justifique o descarte de preços inexequíveis ou excessivamente elevados; a média não pode ser aplicada sem análise crítica do conjunto.",
    painel: "analise",
  },
  {
    titulo: "Metodologia e Preço de Referência",
    fundamentoLegal: "Art. 23, caput, Lei 14.133/21",
    hint: "Explicite a metodologia adotada (média, mediana ou menor preço) e o valor de referência apurado, com a memória de cálculo.",
    painel: "referencia",
  },
])

/** Estudo Técnico Preliminar — um bloco por inciso do Art. 18, § 1º, Lei 14.133/21. */
const secoesETP: SecaoDocumento[] = secoes([
  {
    titulo: "Descrição da Necessidade",
    fundamentoLegal: "Art. 18, § 1º, I, Lei 14.133/21",
    hint: "Descreva o problema a ser resolvido sob a perspectiva do interesse público, e não a solução pretendida. Fundamente-se no DFD e no planejamento da unidade.",
    painel: "necessidade",
  },
  {
    titulo: "Demonstração da Previsão no PCA",
    fundamentoLegal: "Art. 18, § 1º, II, Lei 14.133/21",
    hint: "Demonstre que a contratação está prevista no Plano de Contratações Anual vigente, indicando o item correspondente. Se não estiver, justifique.",
    opcional: true,
    painel: "pca",
  },
  {
    titulo: "Requisitos da Contratação",
    fundamentoLegal: "Art. 18, § 1º, III, Lei 14.133/21",
    hint: "Especifique os requisitos técnicos, de desempenho e de sustentabilidade indispensáveis, sem direcionamento a marca ou fornecedor.",
    opcional: true,
  },
  {
    titulo: "Estimativa das Quantidades",
    fundamentoLegal: "Art. 18, § 1º, IV, Lei 14.133/21",
    hint: "Informe as quantidades com a memória de cálculo e os documentos que lhe dão suporte — histórico de consumo, demanda projetada e interdependências com outras contratações.",
    painel: "quantidades",
  },
  {
    titulo: "Levantamento de Mercado",
    fundamentoLegal: "Art. 18, § 1º, V, Lei 14.133/21",
    hint: "Analise as alternativas de solução existentes no mercado, incluindo a possibilidade de Adesão a Ata de Registro de Preços vigente, e justifique a escolhida.",
    opcional: true,
    painel: "ata",
  },
  {
    titulo: "Estimativa do Valor da Contratação",
    fundamentoLegal: "Art. 18, § 1º, VI, Lei 14.133/21",
    hint: "Apresente o valor estimado acompanhado dos preços unitários referenciais, das memórias de cálculo e dos documentos de suporte — em regra, a Cotação de Mercado do processo.",
    painel: "valor",
  },
  {
    titulo: "Descrição da Solução como um Todo",
    fundamentoLegal: "Art. 18, § 1º, VII, Lei 14.133/21",
    hint: "Descreva a solução considerando todo o ciclo de vida do objeto: implantação, garantia, manutenção, capacitação e descarte.",
    opcional: true,
  },
  {
    titulo: "Justificativas para o Parcelamento",
    fundamentoLegal: "Art. 18, § 1º, VIII, Lei 14.133/21",
    hint: "Justifique o parcelamento ou o não parcelamento da contratação. O parcelamento é a regra; a adjudicação por item integral exige demonstração de perda de economia de escala.",
  },
  {
    titulo: "Demonstrativo dos Resultados Pretendidos",
    fundamentoLegal: "Art. 18, § 1º, IX, Lei 14.133/21",
    hint: "Demonstre os resultados pretendidos em termos de economicidade e de melhor aproveitamento dos recursos públicos.",
    opcional: true,
  },
  {
    titulo: "Providências Prévias à Contratação",
    fundamentoLegal: "Art. 18, § 1º, X, Lei 14.133/21",
    hint: "Aponte as providências a serem adotadas antes da celebração do contrato — adequação do ambiente, capacitação de servidores, ajustes de infraestrutura.",
    opcional: true,
  },
  {
    titulo: "Contratações Correlatas e Interdependentes",
    fundamentoLegal: "Art. 18, § 1º, XI, Lei 14.133/21",
    hint: "Identifique contratações correlatas ou interdependentes cuja existência afete o objeto, ou registre que não há.",
    opcional: true,
  },
  {
    titulo: "Impactos Ambientais e Medidas Mitigadoras",
    fundamentoLegal: "Art. 18, § 1º, XII, Lei 14.133/21",
    hint: "Descreva os possíveis impactos ambientais da contratação e as medidas de mitigação, incluindo requisitos de baixo consumo e logística reversa.",
    opcional: true,
  },
  {
    titulo: "Posicionamento Conclusivo",
    fundamentoLegal: "Art. 18, § 1º, XIII, Lei 14.133/21",
    hint: "Declare de forma expressa se a contratação é viável e adequada ao atendimento da necessidade, com base nos elementos analisados nas seções anteriores.",
  },
])

/** Mapa de Riscos — análise de riscos da contratação (Art. 18, X, Lei 14.133/21). */
const secoesMapa: SecaoDocumento[] = secoes([
  {
    titulo: "Identificação dos Riscos",
    fundamentoLegal: "Art. 18, X, Lei 14.133/21",
    hint: "Liste os riscos das fases de planejamento, seleção do fornecedor e execução do contrato que possam comprometer o sucesso da contratação.",
  },
  {
    titulo: "Análise de Probabilidade e Impacto",
    fundamentoLegal: "Art. 18, X, Lei 14.133/21",
    hint: "Classifique cada risco quanto à probabilidade de ocorrência e ao impacto, apurando o nível de risco resultante.",
  },
  {
    titulo: "Ações Preventivas",
    fundamentoLegal: "Art. 18, X, Lei 14.133/21",
    hint: "Defina as medidas destinadas a reduzir a probabilidade de ocorrência de cada risco identificado.",
  },
  {
    titulo: "Ações de Contingência",
    fundamentoLegal: "Art. 18, X, Lei 14.133/21",
    hint: "Estabeleça as respostas a adotar caso o risco se concretize, com os respectivos gatilhos.",
  },
  {
    titulo: "Responsáveis e Monitoramento",
    fundamentoLegal: "Art. 18, X, Lei 14.133/21",
    hint: "Aponte o responsável por monitorar cada risco e a periodicidade de revisão do mapa ao longo do processo.",
  },
  {
    titulo: "Matriz de Alocação de Riscos Contratuais",
    fundamentoLegal: "Art. 22, Lei 14.133/21",
    hint: "Defina a repartição objetiva de riscos entre contratante e contratada. Alimenta a cláusula correspondente do contrato e é obrigatória nas obras de grande vulto (Art. 22, § 3º).",
    opcional: true,
  },
])

/** Termo de Referência — alíneas 'a' a 'j' do Art. 6º, XXIII, Lei 14.133/21. */
const secoesTR: SecaoDocumento[] = secoes([
  {
    titulo: "Definição do Objeto",
    fundamentoLegal: "Art. 6º, XXIII, 'a', Lei 14.133/21",
    hint: "Defina o objeto de forma precisa, suficiente e clara, com natureza, quantitativos, prazo do contrato e unidades de medida.",
    painel: "quantidades",
  },
  {
    titulo: "Fundamentação da Contratação",
    fundamentoLegal: "Art. 6º, XXIII, 'b', Lei 14.133/21",
    hint: "Referencie o ETP do processo e demonstre a necessidade pública que motiva a contratação.",
    painel: "necessidade",
  },
  {
    titulo: "Descrição da Solução",
    fundamentoLegal: "Art. 6º, XXIII, 'c', Lei 14.133/21",
    hint: "Descreva a solução como um todo, considerando todo o ciclo de vida do objeto.",
  },
  {
    titulo: "Requisitos da Contratação",
    fundamentoLegal: "Art. 6º, XXIII, 'd', Lei 14.133/21",
    hint: "Especifique os requisitos de sustentabilidade, garantia, prazos e as obrigações das partes.",
  },
  {
    titulo: "Modelo de Execução do Objeto",
    fundamentoLegal: "Art. 6º, XXIII, 'e', Lei 14.133/21",
    hint: "Defina como o contrato deverá produzir os resultados pretendidos: rotinas, prazos, locais e forma de entrega.",
  },
  {
    titulo: "Modelo de Gestão do Contrato",
    fundamentoLegal: "Art. 6º, XXIII, 'f', Lei 14.133/21",
    hint: "Descreva a fiscalização, o recebimento do objeto e a gestão contratual, indicando os papéis envolvidos.",
  },
  {
    titulo: "Critérios de Medição e Pagamento",
    fundamentoLegal: "Art. 6º, XXIII, 'g', Lei 14.133/21",
    hint: "Estabeleça os critérios de medição, a aferição de resultados e as condições de pagamento.",
  },
  {
    titulo: "Seleção do Fornecedor",
    fundamentoLegal: "Art. 6º, XXIII, 'h', Lei 14.133/21",
    hint: "Indique a forma de seleção, o critério de julgamento e as exigências de habilitação técnica.",
  },
  {
    titulo: "Estimativa do Valor da Contratação",
    fundamentoLegal: "Art. 6º, XXIII, 'i', Lei 14.133/21",
    hint: "Apresente o valor estimado acompanhado dos preços unitários referenciais e da memória de cálculo, remetendo à pesquisa de preços do processo.",
    painel: "valor",
  },
  {
    titulo: "Adequação Orçamentária",
    fundamentoLegal: "Art. 6º, XXIII, 'j', Lei 14.133/21",
    hint: "Informe a dotação orçamentária que suportará a despesa e a previsão no PCA vigente.",
    painel: "dotacao",
  },
])

/** Edital de licitação — Art. 25 e demais dispositivos da Lei 14.133/21. */
const secoesEdital: SecaoDocumento[] = secoes([
  {
    titulo: "Preâmbulo e Identificação da Licitação",
    fundamentoLegal: "Art. 25, caput, Lei 14.133/21",
    hint: "Identifique o órgão, o número do processo, a modalidade, o modo de disputa, o critério de julgamento, a data e o sítio eletrônico da sessão pública.",
  },
  {
    titulo: "Do Objeto",
    fundamentoLegal: "Art. 25, caput, Lei 14.133/21",
    hint: "Enuncie o objeto de forma sucinta, remetendo ao Termo de Referência anexo para as especificações completas.",
  },
  {
    titulo: "Da Participação e das Vedações",
    fundamentoLegal: "Art. 9º e Art. 14, Lei 14.133/21",
    hint: "Defina quem pode participar e enumere as vedações e os impedimentos de participação previstos em lei.",
  },
  {
    titulo: "Do Tratamento Diferenciado a ME e EPP",
    fundamentoLegal: "Art. 4º, Lei 14.133/21 e Lei Complementar 123/2006",
    hint: "Estabeleça o tratamento favorecido a microempresas e empresas de pequeno porte, incluindo empate ficto e regularidade fiscal diferida.",
  },
  {
    titulo: "Da Apresentação das Propostas e dos Documentos de Habilitação",
    fundamentoLegal: "Art. 56, Lei 14.133/21",
    hint: "Detalhe a forma, o prazo e as condições de envio das propostas e da documentação de habilitação no sistema eletrônico.",
  },
  {
    titulo: "Do Modo de Disputa e do Critério de Julgamento",
    fundamentoLegal: "Art. 33 e Art. 56, Lei 14.133/21",
    hint: "Fixe o modo de disputa (aberto, fechado ou combinado) e o critério de julgamento adotado, com as regras de desempate.",
  },
  {
    titulo: "Da Habilitação",
    fundamentoLegal: "Art. 62 a Art. 67, Lei 14.133/21",
    hint: "Relacione os documentos de habilitação jurídica, fiscal, social e trabalhista, econômico-financeira e técnica exigidos, sem excessos que restrinjam a competição.",
  },
  {
    titulo: "Da Impugnação e dos Pedidos de Esclarecimento",
    fundamentoLegal: "Art. 164, Lei 14.133/21",
    hint: "Estabeleça os prazos e a forma para impugnar o edital e solicitar esclarecimentos, bem como o prazo de resposta da Administração.",
  },
  {
    titulo: "Dos Recursos",
    fundamentoLegal: "Art. 165, Lei 14.133/21",
    hint: "Discipline a intenção de recorrer, os prazos de razões e contrarrazões e o efeito atribuído ao recurso.",
  },
  {
    titulo: "Da Adjudicação e da Homologação",
    fundamentoLegal: "Art. 71, Lei 14.133/21",
    hint: "Descreva o encerramento da licitação: adjudicação do objeto ao vencedor e homologação pela autoridade competente.",
  },
  {
    titulo: "Das Sanções Administrativas",
    fundamentoLegal: "Art. 155 e Art. 156, Lei 14.133/21",
    hint: "Enumere as infrações e as sanções aplicáveis, com os critérios de dosimetria e o direito ao contraditório.",
  },
  {
    titulo: "Da Dotação Orçamentária",
    fundamentoLegal: "Art. 150, Lei 14.133/21",
    hint: "Indique a dotação orçamentária que suportará a despesa no exercício e, se plurianual, a previsão nos exercícios seguintes.",
    painel: "dotacao",
  },
  {
    titulo: "Das Disposições Finais e dos Anexos",
    fundamentoLegal: "Art. 25, § 1º, Lei 14.133/21",
    hint: "Relacione os anexos que integram o edital — Termo de Referência, minuta de contrato, modelo de proposta e matriz de riscos, quando houver — e registre a divulgação no PNCP (Art. 54).",
  },
  {
    titulo: "Da Matriz de Alocação de Riscos",
    fundamentoLegal: "Art. 22, Lei 14.133/21",
    hint: "Reproduza a repartição objetiva de riscos entre as partes. Obrigatória nas contratações de obras e serviços de grande vulto (Art. 22, § 3º).",
    opcional: true,
  },
])

/** Minuta de contrato — cláusulas necessárias do Art. 92, Lei 14.133/21. */
const secoesContrato: SecaoDocumento[] = secoes([
  {
    titulo: "Da Qualificação das Partes e do Fundamento Legal",
    fundamentoLegal: "Art. 89, Lei 14.133/21",
    hint: "Qualifique contratante e contratada e indique o processo administrativo, a modalidade e o fundamento legal que autorizam a contratação.",
  },
  {
    titulo: "Do Objeto",
    fundamentoLegal: "Art. 92, I, Lei 14.133/21",
    hint: "Defina o objeto e seus elementos característicos, remetendo ao Termo de Referência.",
  },
  {
    titulo: "Da Vinculação ao Edital e à Proposta",
    fundamentoLegal: "Art. 92, II, Lei 14.133/21",
    hint: "Vincule o contrato ao edital de licitação e à proposta do licitante vencedor, que o integram independentemente de transcrição.",
  },
  {
    titulo: "Da Legislação Aplicável e dos Casos Omissos",
    fundamentoLegal: "Art. 92, III, Lei 14.133/21",
    hint: "Indique a legislação aplicável à execução do contrato e a forma de resolução dos casos omissos.",
  },
  {
    titulo: "Do Regime de Execução ou da Forma de Fornecimento",
    fundamentoLegal: "Art. 92, IV e Art. 46, Lei 14.133/21",
    hint: "Estabeleça o regime de execução da obra ou serviço, ou a forma de fornecimento do bem.",
  },
  {
    titulo: "Do Preço e das Condições de Pagamento",
    fundamentoLegal: "Art. 92, V, Lei 14.133/21",
    hint: "Fixe o preço, os critérios de medição e as condições, o prazo e a forma de pagamento.",
  },
  {
    titulo: "Do Reajuste e do Reequilíbrio Econômico-Financeiro",
    fundamentoLegal: "Art. 92, § 3º e Art. 124 a Art. 136, Lei 14.133/21",
    hint: "Discipline o índice e a periodicidade do reajuste e as hipóteses de repactuação e de restabelecimento do equilíbrio econômico-financeiro.",
  },
  {
    titulo: "Dos Prazos de Vigência e de Execução",
    fundamentoLegal: "Art. 105 a Art. 114, Lei 14.133/21",
    hint: "Fixe os prazos de vigência e de execução e as hipóteses e limites de prorrogação, observada a duração máxima admitida.",
  },
  {
    titulo: "Da Dotação Orçamentária",
    fundamentoLegal: "Art. 92, VIII, Lei 14.133/21",
    hint: "Indique o crédito orçamentário que suportará a despesa, com programa de trabalho e elemento de despesa.",
    painel: "dotacao",
  },
  {
    titulo: "Da Garantia de Execução",
    fundamentoLegal: "Art. 96 a Art. 102, Lei 14.133/21",
    hint: "Estabeleça a modalidade, o percentual e as condições de prestação e liberação da garantia de execução contratual.",
  },
  {
    titulo: "Das Obrigações da Contratante e da Contratada",
    fundamentoLegal: "Art. 92, XIV e XV, Lei 14.133/21",
    hint: "Relacione as obrigações e responsabilidades de cada parte, incluindo encargos trabalhistas, previdenciários, fiscais e comerciais.",
  },
  {
    titulo: "Da Gestão e da Fiscalização do Contrato",
    fundamentoLegal: "Art. 92, XVIII e Art. 117, Lei 14.133/21",
    hint: "Designe o gestor e o fiscal do contrato e defina os procedimentos de acompanhamento e o registro das ocorrências.",
  },
  {
    titulo: "Do Recebimento do Objeto",
    fundamentoLegal: "Art. 140, Lei 14.133/21",
    hint: "Discipline o recebimento provisório e o definitivo, com prazos e critérios de aceitação do objeto.",
  },
  {
    titulo: "Das Sanções Administrativas",
    fundamentoLegal: "Art. 155 e Art. 156, Lei 14.133/21",
    hint: "Enumere as infrações contratuais e as sanções aplicáveis, assegurados o contraditório e a ampla defesa.",
  },
  {
    titulo: "Da Extinção Contratual",
    fundamentoLegal: "Art. 137 a Art. 139, Lei 14.133/21",
    hint: "Relacione as hipóteses de extinção do contrato, a forma de apuração e as consequências para as partes.",
  },
  {
    titulo: "Do Foro e das Disposições Finais",
    fundamentoLegal: "Art. 92, § 1º, Lei 14.133/21",
    hint: "Eleja o foro da sede da Administração para dirimir as questões oriundas do contrato e registre as disposições finais.",
  },
  {
    titulo: "Da Matriz de Alocação de Riscos",
    fundamentoLegal: "Art. 22 e Art. 103, Lei 14.133/21",
    hint: "Reproduza a repartição objetiva de riscos entre as partes, definindo o responsável por cada evento e seus efeitos sobre o equilíbrio do contrato.",
    opcional: true,
  },
  {
    titulo: "Da Subcontratação",
    fundamentoLegal: "Art. 122, Lei 14.133/21",
    hint: "Autorize ou vede a subcontratação e, se admitida, fixe o limite, as parcelas admitidas e as condições.",
    opcional: true,
  },
  {
    titulo: "Da Proteção de Dados Pessoais",
    fundamentoLegal: "Lei 13.709/2018",
    hint: "Estabeleça as obrigações das partes quanto ao tratamento de dados pessoais, quando a execução do objeto envolver esse tratamento.",
    opcional: true,
  },
])

/** Seções por tipo de documento — fonte única do editor de seções. */
export const secoesPorTipoBase: Record<TipoDocumento, SecaoDocumento[]> = {
  "Cotação": secoesCotacao,
  ETP: secoesETP,
  Mapa: secoesMapa,
  TR: secoesTR,
  Edital: secoesEdital,
  Contrato: secoesContrato,
}

/**
 * O painel do editor que assiste uma seção do catálogo.
 *
 * Existe como consulta por código porque as seções chegam do servidor, e o
 * servidor não conhece painel — ele é assunto da tela. Sem esta junção, o
 * `painel` declarado acima morria no mapeamento e os painéis de quantidades,
 * valor, ATA e PCA simplesmente não apareciam.
 */
export function painelDaSecao(
  tipo: TipoDocumento,
  codigo: string,
): SecaoDocumento["painel"] {
  return secoesPorTipoBase[tipo].find((secao) => secao.id === codigo)?.painel
}
