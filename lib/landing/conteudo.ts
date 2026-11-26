/**
 * Toda a copy da página da GovPro (§123, §125). Sem JSX: a página só compõe, e o
 * texto se revisa num lugar só. Vem das apresentações institucionais da GovPro
 * e do GeraDocs; não entra número de clientes, logo, depoimento nem data de
 * fundação, porque nenhum deles está confirmado.
 */

export const EMAIL_CONTATO = "contato@govpro.com.br"
export const HREF_CONTATO = `mailto:${EMAIL_CONTATO}`
export const HREF_ENTRAR = "/login"

/** O onboarding da GovPri (§130). A origem diz de onde a pessoa veio (botão da página, Instagram...). */
export const ROTA_ONBOARDING = "/onboarding"
export function hrefOnboarding(origem: string): string {
  return `${ROTA_ONBOARDING}?origem=${encodeURIComponent(origem)}`
}

/**
 * O WhatsApp do onboarding, só dígitos com DDI e DDD. Provisório, para os testes,
 * até a GovPro ter número próprio; vazio, o botão de WhatsApp não aparece.
 */
export const WHATSAPP_GOVPRO = "5527996495615"

/**
 * Para onde vão os leads do onboarding quando o envio automático falha e a
 * pessoa manda por e-mail (§130). Provisório: a caixa de testes da GovPro, a
 * mesma que recebe o aviso automático do back-end (ADR-082).
 */
export const EMAIL_DOS_LEADS = "govpro.admin@gmail.com"
export const ENDERECO = "Av. Antônio Perutti, nº 281, Honório Fraga, Colatina/ES"

/**
 * O portfólio da GovPro. A seção Soluções, o menu e o rodapé leem desta lista:
 * uma solução nova é uma entrada nova aqui, e o `id` escolhe a logo.
 */
export type IdDoProduto = "geradocs"

export type Produto = {
  id: IdDoProduto
  nome: string
  slogan: string
  area: string
  resumo: string
  destaques: string[]
  /** Âncora da seção do produto nesta página. */
  ancora: string
  /** Onde quem já é cliente entra. */
  acesso: string
}

export const PRODUTOS: [Produto, ...Produto[]] = [
  {
    id: "geradocs",
    nome: "GeraDocs",
    slogan: "Contratações públicas inteligentes",
    area: "Planejamento das contratações · Lei 14.133/21",
    resumo:
      "Orienta o servidor em cada etapa do planejamento da contratação e gera os documentos com inteligência artificial revisável e o timbre da entidade.",
    destaques: [
      "Todos os documentos da fase preparatória",
      "Geração assistida por IA",
      "Em conformidade com as minutas-padrão da AGU",
      "Alinhado e integrado ao PNCP",
      "DOCX e PDF com o timbre da entidade",
      "Trilha de auditoria completa",
    ],
    ancora: "#geradocs",
    acesso: HREF_ENTRAR,
  },
]

export type IconeDaIa = "proposta" | "conferida" | "revisao" | "lgpd" | "orientacao" | "opcional"

export type IconeDoItem =
  | "pessoas"
  | "sociedade"
  | "inovacao"
  | "lei"
  | "qualidade"
  | "parceria"
  | "auditoria"
  | "lgpd"
  | "acesso"
  | "alerta"
  | "versao"
  | "protocolo"

export const CONTEUDO = {
  navegacao: [
    { id: "quem-somos", rotulo: "Quem Somos" },
    { id: "solucoes", rotulo: "Soluções" },
    { id: "documentos", rotulo: "Documentos" },
    { id: "confianca", rotulo: "Confiança" },
    { id: "contato", rotulo: "Contato" },
  ],

  acoes: {
    demonstracao: "Solicitar Demonstração",
    acessar: "Acessar o GeraDocs",
    conversar: "Fale com a GovPro",
  },

  /** O cabeçalho usa rótulos curtos; o nome acessível completa o sentido. */
  cabecalho: {
    marca: "GovPro, voltar ao início",
    entrar: { rotulo: "Entrar", nome: "Entrar no GeraDocs" },
    demonstracao: { rotulo: "Demonstração", nome: "Solicitar demonstração" },
  },

  abertura: {
    titulo: ["Inteligência para", "Gestão Pública"],
    frase: "Tecnologia a serviço da Administração Pública.",
    altSede:
      "Sede da GovPro: edifício branco com fachada de vidro e a marca no alto, palmeiras, as bandeiras do Brasil e da GovPro e um jardim com canteiros floridos à frente.",
    manifesto: {
      inicio: "Por trás de cada contratação pública existe um servidor que precisou planejá-la.",
      destaque: "A GovPro nasceu para estar ao lado dessas pessoas.",
      valor: "Menos retrabalho, mais segurança jurídica e mais tempo para decidir bem.",
    },
  },

  quemSomos: {
    id: "quem-somos",
    rotulo: "Quem Somos",
    manifesto:
      "Tecnologia, para nós, é um meio. O fim é uma gestão pública mais eficiente, mais transparente e mais humana.",
    texto:
      "A GovPro é uma empresa de tecnologia dedicada à Administração Pública. Partimos de uma convicção simples: o setor público merece tecnologia pensada para ele, que fale a língua da legislação, respeite a responsabilidade de quem assina e se adapte à realidade de cada entidade.",
    publico: ["Prefeituras", "Câmaras Municipais", "Autarquias", "Fundações", "Consórcios Públicos"],
    ficha: [
      { rotulo: "Atuação", valor: "Tecnologia para a Administração Pública" },
      { rotulo: "Especialidade", valor: "Planejamento das contratações públicas" },
      { rotulo: "Assinatura", valor: "Inteligência para a gestão pública" },
    ],
    essencia: [
      {
        rotulo: "Propósito",
        titulo: "Aproximar inovação e rotina administrativa",
        texto: "Para que a gestão pública funcione melhor para quem nela trabalha.",
      },
      {
        rotulo: "Missão",
        titulo: "Apoiar quem faz a gestão pública com tecnologia confiável",
        texto:
          "Soluções que apoiam os servidores, organizam os fluxos de trabalho e dão segurança às decisões, com respeito à lei, aos dados e à responsabilidade de cada agente.",
      },
      {
        rotulo: "Visão",
        titulo: "Ser referência em tecnologia para a gestão pública brasileira",
        texto: "Reconhecida pela qualidade das soluções e pela confiança de quem as usa todos os dias.",
      },
    ],
    pilares: [
      {
        icone: "pessoas" as IconeDoItem,
        titulo: "Feito Para o Servidor Público",
        texto: "Cada tela parte da rotina real de quem elabora, revisa e assina os documentos da contratação.",
      },
      {
        icone: "lei" as IconeDoItem,
        titulo: "Segurança Para Quem Assina",
        texto: "Fundamento legal, alertas no momento certo e registro de tudo, para decidir com tranquilidade.",
      },
      {
        icone: "inovacao" as IconeDoItem,
        titulo: "Inovação Possível",
        texto: "Tecnologia que respeita a estrutura, as normas e a realidade de cada órgão, do menor ao maior.",
      },
    ],
  },

  solucoes: {
    id: "solucoes",
    rotulo: "Soluções GovPro",
    titulo: "Um Portfólio Que Nasce da Rotina de Quem Contrata",
    texto:
      "Cada solução da GovPro resolve um ponto real da gestão pública, com o mesmo método: ouvir quem usa, partir da lei e entregar com rigor.",
    proximas: {
      titulo: "Próximas Soluções",
      texto: "O portfólio cresce com o mesmo método, a partir do que as entidades nos contam.",
      metodo: ["Ouvir quem usa", "Partir da lei", "Entregar com rigor"],
    },
    conhecer: "Conhecer o GeraDocs",
  },

  desafio: {
    id: "desafio",
    rotulo: "O Desafio",
    titulo: "O Que Está em Jogo Quando o Planejamento Atrasa",
    texto:
      "A Lei 14.133/21 colocou o planejamento no centro da contratação e passou a exigir mais de quem a conduz. As equipes, na maioria das entidades, continuaram com as mesmas ferramentas.",
    itens: [
      { titulo: "Contratações Paradas", texto: "A demanda espera enquanto ETP, TR e pesquisa de preços não ficam prontos." },
      { titulo: "Serviços Essenciais em Risco", texto: "Contratos vencem antes do novo processo, e o serviço corre o risco de parar." },
      { titulo: "Emergência Sob Vigilância", texto: "A falta de planejamento empurra o órgão para contratações emergenciais." },
      { titulo: "Convênios e Emendas Perdidos", texto: "Prazos de transferências voluntárias vencem antes de a contratação terminar." },
      { titulo: "Mais Erros Sob Pressão", texto: "Dados digitados várias vezes geram documentos que se contradizem." },
      { titulo: "PCA Que Não Se Cumpre", texto: "O que foi planejado para o exercício fica para depois." },
    ],
    destaque: {
      titulo: "Da boa ideia à entrega",
      texto:
        "A ponte, a escola reformada, o novo serviço de saúde: boas ideias da gestão atrasam na hora de elaborar os documentos. A GovPro existe para que elas cheguem à população.",
    },
  },

  geradocs: {
    id: "geradocs",
    rotulo: "Nossa solução em foco",
    titulo: "A Contratação Pública Bem Planejada Começa Aqui",
    apoio:
      "O GeraDocs conduz o servidor por toda a fase preparatória e entrega documentos completos, fundamentados e com o timbre da entidade, prontos para o protocolo.",
    frase: "Orienta sem travar, propõe sem impor e registra tudo.",
    altCaptura:
      "Editor do Estudo Técnico Preliminar no GeraDocs: o menu da plataforma, a trilha de seções do ETP e a Descrição da Necessidade com o botão Gerar com IA.",
    numeros: [
      {
        valor: 100,
        sufixo: "%",
        rotulo: "da fase preparatória: cotação, ETP, mapa de riscos, TR, edital, aviso e minuta de contrato",
      },
      { valor: 5, sufixo: " de 5", rotulo: "modalidades do Art. 28, além de credenciamento, dispensa e inexigibilidade" },
      { valor: 13, sufixo: " de 13", rotulo: "incisos do Art. 18, § 1º no ETP, cada um com a sua seção" },
      { valor: 10, rotulo: "minutas-padrão da AGU, aplicadas pela modalidade e pela natureza do objeto" },
      { valor: 22, rotulo: "tópicos especializados que o ETP recebe conforme o contexto do objeto" },
    ] as { valor: number; sufixo?: string; rotulo: string }[],
  },

  poucosCliques: {
    id: "poucos-cliques",
    rotulo: "Poucos cliques",
    titulo: "Do Processo ao Documento em Poucos Cliques",
    texto: "Um fluxo guiado, na ordem real da contratação. Cada informação é digitada uma vez e aproveitada em todos os documentos.",
    etapas: [
      {
        titulo: "Abra o Processo",
        texto: "Descreva o objeto e escolha a modalidade. Os documentos cabíveis já vêm marcados.",
      },
      {
        titulo: "Traga a Demanda",
        texto: "Os DFDs das secretarias entram com itens, quantidades e códigos CATMAT ou CATSER.",
      },
      {
        titulo: "Gere Com IA",
        texto: "Em cada seção, a IA redige a partir do DFD, do PCA, dos preços e das normas do órgão.",
      },
      {
        titulo: "Revise e Aceite",
        texto: "A proposta chega identificada. Nada entra no documento sem o aceite do servidor.",
      },
      {
        titulo: "Gere DOCX e PDF",
        texto: "O documento sai com o timbre da entidade, numerado e pronto para o protocolo.",
      },
    ],
    exemplo: {
      processo: "PROC-2026-000007",
      objeto: "Aquisição de material de expediente",
      nota: "Telas reais do GeraDocs, com dados ilustrativos, sem entidade real.",
    },
  },

  documentos: {
    id: "documentos",
    rotulo: "Documentos gerados",
    titulo: "Toda a Fase Preparatória, Documento por Documento",
    texto:
      "Todos os documentos da fase preparatória, coerentes entre si porque leem as mesmas informações do processo. Cada arquivo sai com o timbre da entidade e é identificável.",
    timbre: "Timbre da entidade",
    tarja: "Elaborado com GeraDocs",
    nota: "Na contratação direta com disputa, o Aviso de Contratação Direta ocupa o lugar do Edital.",
  },

  modalidades: {
    id: "modalidades",
    rotulo: "Modalidade certa, documentos certos",
    titulo: "Escolha a Modalidade. O GeraDocs Monta o Processo.",
    texto:
      "Ao abrir o processo, a plataforma já apresenta os documentos cabíveis: os obrigatórios vêm marcados e protegidos, os recomendados vêm marcados e podem sair, os opcionais ficam à mão.",
    legenda: {
      obrigatorio: "Obrigatório",
      recomendado: "Recomendado",
      opcional: "Opcional",
      fora: "Não se aplica",
    },
    troca: "Mudou a modalidade? Nada se perde: os documentos novos entram e o que já foi feito permanece.",
  },

  produtividade: {
    id: "produtividade",
    rotulo: "Produtividade",
    titulo: "Digite Uma Vez, Aproveite em Todo o Processo",
    estimativas: [
      { valor: "+1 dia", rotulo: "é o que um servidor leva hoje, em média, para concluir um processo completo" },
      { valor: "3 a 5", rotulo: "processos completos por servidor por dia, com o GeraDocs" },
      { valor: "15", rotulo: "documentos gerados por servidor por dia, em média" },
    ],
    notaEstimativa:
      "Estimativas da GovPro a partir da experiência com órgãos públicos. Expressam capacidade de produção; o resultado de cada entidade depende do volume e da complexidade das contratações.",
    antes: "Como costuma ser",
    depois: "Com o GeraDocs",
    comparativo: [
      ["Abrir um processo antigo e apagar o que não serve", "Assistente com os documentos cabíveis já selecionados"],
      ["Escrever cada seção do zero", "Revisar uma proposta redigida com os dados do processo"],
      ["Copiar itens, quantidades e valores entre documentos", "Informar uma vez; as seções leem dos mesmos dados"],
      ["Montar a pesquisa de preços em planilha separada", "Série de preços com menor, média e mediana calculados"],
      ["Procurar o item no PCA manualmente", "Busca automática no plano do exercício"],
      ["Conferir à mão o limite da dispensa", "Conferência automática e alerta de fracionamento"],
      ["Anexar TR e minuta ao Edital", "Edital gerado com os anexos no próprio arquivo"],
      ["Explicar ao controle quem fez o quê", "Trilha de auditoria do processo"],
    ] as [string, string][],
  },

  ia: {
    id: "ia",
    rotulo: "Inteligência artificial responsável",
    titulo: "A IA Propõe. O Servidor Decide.",
    texto:
      "Diferente de ferramentas genéricas de texto, a IA do GeraDocs escreve dentro do processo e não acrescenta ao documento o que não consta nos autos.",
    garantias: [
      {
        icone: "proposta" as IconeDaIa,
        titulo: "Proposta Identificada",
        texto: "Todo rascunho chega marcado como proposta e só entra com o aceite do servidor.",
      },
      {
        icone: "conferida" as IconeDaIa,
        titulo: "Conferida Antes de Chegar",
        texto: "Um validador recusa números que não estão no processo e citação de norma que a IA não recebeu.",
      },
      {
        icone: "revisao" as IconeDaIa,
        titulo: "Revisão Palavra por Palavra",
        texto: "Na etapa final, cada sugestão aparece riscada ou destacada e é aceita uma a uma.",
      },
      {
        icone: "lgpd" as IconeDaIa,
        titulo: "LGPD Desde a Origem",
        texto: "A IA recebe dados da contratação, nunca CPF, nome, e-mail ou matrícula de servidores.",
      },
      {
        icone: "orientacao" as IconeDaIa,
        titulo: "Orientação Com Curadoria",
        texto: "O servidor orienta a IA por seção, e o pedido é conferido antes do envio.",
      },
      {
        icone: "opcional" as IconeDaIa,
        titulo: "Opcional de Verdade",
        texto: "Todo documento pode ser elaborado sem IA. Ela é uma facilidade, nunca uma exigência.",
      },
    ],
    altCaptura:
      "Tela de Revisão e Geração do GeraDocs: a revisão com IA mostra, em cada seção do ETP, o texto que sai riscado e o que entra destacado, com os botões Aceitar e Descartar.",
    legendaCaptura: "Cada sugestão só entra com o aceite do servidor.",
  },

  confianca: {
    id: "confianca",
    rotulo: "Feito para o controle",
    titulo: "Segurança Jurídica Para Quem Assina",
    texto: "A plataforma conhece as regras que mais geram apontamentos e avisa no momento certo, antes que o problema chegue ao papel.",
    alertas: [
      { fundamento: "Art. 75, I e II", titulo: "Limite da Dispensa", texto: "O valor é conferido contra o limite do inciso declarado." },
      { fundamento: "Art. 75, § 1º", titulo: "Alerta de Fracionamento", texto: "A soma do exercício, por inciso, mostra quando o conjunto passa do limite." },
      { fundamento: "Art. 18, § 1º, II", titulo: "Previsão no PCA", texto: "Cada item da demanda é confrontado com o plano do exercício." },
      { fundamento: "Art. 19, § 2º", titulo: "Minutas da AGU", texto: "Afastar cláusula obrigatória pede justificativa, que fica registrada." },
    ],
    identificacao: {
      titulo: "Cada Documento Gerado é Identificável",
      itens: [
        { rotulo: "Em todas as páginas", titulo: "Marca d'água discreta" },
        { rotulo: "Ao final do texto", titulo: "Assinatura de quem elaborou" },
        { rotulo: "Em todas as folhas", titulo: "Tarja na margem" },
        { rotulo: "Na última página", titulo: "Carimbo com código e QR Code" },
      ],
      nota: "O código é derivado do conteúdo da versão: qualquer alteração gera uma versão nova, com código próprio.",
    },
    protecoes: [
      {
        icone: "pessoas" as IconeDoItem,
        titulo: "Quem Elaborou, no Documento",
        texto: "O arquivo termina com o bloco de assinatura do responsável pela elaboração e a portaria de designação.",
      },
      { icone: "auditoria" as IconeDoItem, titulo: "Trilha de Auditoria", texto: "Autor, data e motivo das ações relevantes." },
      { icone: "versao" as IconeDoItem, titulo: "Versões e Errata", texto: "Retificação declarada e linhas Onde se lê / Leia-se." },
      { icone: "acesso" as IconeDoItem, titulo: "Isolamento Entre Entidades", texto: "Cada entidade enxerga só o que é seu." },
      { icone: "lgpd" as IconeDoItem, titulo: "LGPD na IA", texto: "Dados pessoais de servidores nunca vão ao modelo." },
      { icone: "protocolo" as IconeDoItem, titulo: "Seu Sistema de Protocolo", texto: "Assinatura e aprovação seguem onde sempre estiveram." },
    ],
  },

  perfis: {
    id: "perfis",
    titulo: "Valor Para Cada Pessoa da Contratação",
    itens: [
      {
        rotulo: "Servidor e agente de contratação",
        titulo: "Mais Segurança, Menos Digitação",
        lista: ["Sabe o que cada seção exige e por quê", "Recebe proposta em vez de página em branco", "É avisado dos riscos antes de assinar"],
      },
      {
        rotulo: "Coordenação e compras",
        titulo: "Padrão e Visibilidade",
        lista: ["Todas as secretarias na mesma estrutura", "Normas e modelos do órgão em todo processo", "Situação real de cada contratação"],
      },
      {
        rotulo: "Prefeito e gestor",
        titulo: "Planejamento Que Dá Resultado",
        lista: ["Boas ideias que viram entregas no prazo", "Menos risco de perder convênios e emendas", "Uso da IA com custo previsível"],
      },
      {
        rotulo: "Controle e procuradoria",
        titulo: "Tudo Documentado",
        lista: ["Fundamento legal literal em cada seção", "Justificativas onde a lei as exige", "Código de verificação em cada documento"],
      },
    ],
  },

  valores: {
    id: "valores",
    rotulo: "Nossos valores",
    titulo: "Valores Que Se Verificam na Prática",
    texto: "Cada valor tem correspondência direta no funcionamento da nossa tecnologia. Confira na demonstração, com um processo real da sua entidade.",
    itens: [
      { titulo: "Interesse Público em Primeiro Lugar", pratica: "Concentramos a solução no planejamento, a fase que define a qualidade da contratação." },
      { titulo: "A Legalidade Como Base", pratica: "Documentos estruturados inciso por inciso a partir da lei e das minutas da AGU." },
      { titulo: "O Servidor no Centro", pratica: "Alertas com o motivo e justificativa registrada, no lugar de bloqueios." },
      { titulo: "Responsabilidade no Uso da IA", pratica: "Toda proposta chega identificada e só entra com o aceite do servidor." },
      { titulo: "Transparência e Rastreabilidade", pratica: "Trilha de auditoria, histórico de versões e código de verificação." },
      { titulo: "Proteção de Dados", pratica: "Isolamento entre entidades, CPF mascarado e IA sem dados pessoais." },
      { titulo: "Simplicidade", pratica: "Um editor único para todos os documentos e textos de tela diretos." },
      { titulo: "Respeito à Realidade de Cada Órgão", pratica: "Decreto Municipal, PCA na planilha que o órgão já tem e protocolo existente." },
      { titulo: "Honestidade Sobre a Tecnologia", pratica: "Não anunciamos aprovação automática nem ausência de erros." },
      { titulo: "Melhoria Contínua Com Quem Usa", pratica: "Decisões de produto documentadas e evolução guiada pelo uso real." },
    ],
  },

  metodo: {
    id: "metodo",
    rotulo: "Como trabalhamos",
    titulo: "A Forma de Construir Também é o Que Entregamos",
    passos: [
      { titulo: "Ouvir Antes de Propor", texto: "Entender como o órgão elabora os documentos, quais normas segue e onde estão os gargalos." },
      { titulo: "Partir da Lei", texto: "Cada funcionalidade nasce do fundamento legal que a sustenta." },
      { titulo: "Desenhar Para Quem Usa", texto: "Telas claras, linguagem do servidor e orientação no lugar do bloqueio." },
      { titulo: "Construir Com Rigor", texto: "Testes automatizados a cada alteração, segurança e acessibilidade." },
      { titulo: "Validar no Uso Real", texto: "Soluções testadas com processos reais e ajustadas com quem as usa." },
      { titulo: "Evoluir Continuamente", texto: "Leis mudam, minutas são atualizadas, e as soluções acompanham." },
    ],
    integracao: {
      titulo: "Integração, não substituição",
      texto: "Protocolo, assinatura e aprovação continuam no sistema que o órgão já usa. Nossa tecnologia se soma ao fluxo existente.",
    },
  },

  compromissos: {
    id: "compromissos",
    rotulo: "Nossos compromissos",
    titulo: "O Que Cada Órgão Pode Esperar da GovPro",
    itens: [
      { titulo: "Ouvir a Realidade do Órgão", texto: "Como os documentos são feitos hoje, quais normas se aplicam e quem participa." },
      { titulo: "Demonstrar Com Casos Reais", texto: "A solução funcionando sobre uma contratação típica da entidade." },
      { titulo: "Valorizar o Que o Órgão Já Tem", texto: "Decreto Municipal, PCA, timbre e protocolo continuam no centro." },
      { titulo: "Ser Transparente", texto: "O que a tecnologia faz, o que não faz e o papel de cada agente." },
      { titulo: "Proteger as Informações", texto: "Isolamento entre entidades, acesso controlado e respeito à LGPD." },
      { titulo: "Respeitar a Autonomia", texto: "A decisão é sempre do servidor e da autoridade competente." },
      { titulo: "Evoluir Junto", texto: "O retorno de quem usa vira melhoria concreta." },
    ],
    naoPrometemos: {
      titulo: "O que não prometemos",
      texto:
        "Que a IA substitui a análise dos servidores, aprovação automática pelo jurídico ou documentos livres de erro. Prometemos apoio sólido, método e transparência sobre o papel de cada um.",
    },
  },

  faq: {
    id: "faq",
    titulo: "Perguntas Frequentes",
    itens: [
      {
        pergunta: "Preciso instalar alguma coisa?",
        resposta: "Não. O GeraDocs é uma aplicação web, acessada pelo navegador, no computador, no tablet ou no celular.",
      },
      {
        pergunta: "A inteligência artificial é obrigatória?",
        resposta: "Não. Todo documento pode ser elaborado sem IA. Quando usada, cada proposta chega identificada e só entra no documento com o aceite do servidor.",
      },
      {
        pergunta: "O GeraDocs substitui o nosso sistema de protocolo?",
        resposta: "Não. Ele entrega os documentos prontos, e o protocolo, a assinatura e a aprovação seguem no sistema que a entidade já usa.",
      },
      {
        pergunta: "Quais modalidades são atendidas?",
        resposta: "As cinco modalidades do Art. 28 da Lei 14.133/21, o credenciamento e a contratação direta, por dispensa ou inexigibilidade.",
      },
      {
        pergunta: "O Decreto Municipal e o PCA do órgão são usados?",
        resposta: "Sim. As normas cadastradas orientam a redação, e o PCA é importado na planilha que o órgão já tem para a busca da previsão de cada item.",
      },
      {
        pergunta: "Como ficam os dados pessoais?",
        resposta: "Cada entidade acessa só as próprias informações, o CPF aparece mascarado e a IA nunca recebe dados pessoais de servidores.",
      },
      {
        pergunta: "E quando o documento volta com apontamentos?",
        resposta: "O processo é reaberto para retificação, com o histórico preservado. A nova versão é declarada, e a errata Onde se lê / Leia-se fica disponível.",
      },
    ],
  },

  contato: {
    id: "contato",
    rotulo: "Vamos conversar",
    titulo: "Veja o GeraDocs Funcionando no Seu Órgão",
    texto: "Se a sua entidade quer planejar melhor, com mais segurança e menos retrabalho, queremos ouvir você.",
    passos: [
      { titulo: "Fale com a GovPro", texto: "Escreva para o nosso e-mail e conte o momento da sua entidade." },
      { titulo: "Traga um Caso Real", texto: "Uma contratação típica, o Decreto Municipal e o PCA, se possível." },
      { titulo: "Compare o Resultado", texto: "Tempo, padronização e segurança, lado a lado com o modelo atual." },
    ],
  },

  rodape: {
    slogan: "Inteligência para a gestão pública",
    texto: "Tecnologia a serviço da Administração Pública. Para quem planeja, decide e responde pelo que é de todos.",
    solucoes: "Soluções",
    institucional: "Institucional",
    contato: "Contato",
    copyright: "© 2026 GovPro. Todos os direitos reservados.",
  },
}
