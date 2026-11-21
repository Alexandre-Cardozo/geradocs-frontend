import { CATALOGO, ORDEM_FLUXO } from "@/lib/documentos"

/**
 * Toda a copy da landing (§119). Sem JSX: a página só compõe, e o texto se
 * revisa num lugar só. Só entra fato que existe no produto; o que falta sobre a
 * GovPro é uma `[LACUNA: …]` visível, e não texto inventado.
 */

export const EMAIL_CONTATO = "contato@govpro.com.br"
export const ASSUNTO_DA_DEMONSTRACAO = "Solicitação de demonstração do GeraDocs"
export const HREF_DEMONSTRACAO = `mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(ASSUNTO_DA_DEMONSTRACAO)}`
export const HREF_ENTRAR = "/login"

export type IconeDaConfianca = "auditoria" | "lgpd" | "teto" | "fundamento" | "entidade"

/**
 * Os seis documentos que a plataforma gera, na ordem do fluxo. O Aviso de
 * Contratação Direta não entra: ele toma o lugar do Edital na contratação
 * direta, e a nota do bloco diz isso. Título, fundamento e cor vêm do catálogo.
 */
export const DOCUMENTOS_DO_FLUXO = ORDEM_FLUXO.filter((tipo) => tipo !== "Aviso").map((tipo) => ({
  tipo,
  titulo: CATALOGO[tipo].titulo,
  fundamento: CATALOGO[tipo].fundamento,
  chip: CATALOGO[tipo].chip,
}))

export const CONTEUDO = {
  navegacao: [
    { id: "problema", rotulo: "O Problema" },
    { id: "geradocs", rotulo: "GeraDocs" },
    { id: "ia", rotulo: "IA" },
    { id: "confianca", rotulo: "Confiança" },
  ],

  hero: {
    eyebrow: "Contratações públicas inteligentes",
    titulo: "Documentos da Contratação Pública, Conforme a Lei 14.133/21",
    apoio:
      "O GeraDocs, solução da GovPro, orienta o servidor em cada etapa da fase preparatória e gera os documentos com o timbre da entidade.",
    ctaPrimario: "Solicitar Demonstração",
    ctaSecundario: "Acessar o GeraDocs",
    altCaptura: "Editor de seção do Estudo Técnico Preliminar no GeraDocs, com a trilha de seções ao lado.",
  },

  problema: {
    id: "problema",
    titulo: "Do Word e dos Modelos Soltos para um Fluxo Guiado",
    itens: [
      {
        titulo: "Um Processo, Não Vários Arquivos",
        texto:
          "Os documentos da contratação deixam de viver em arquivos e modelos espalhados e passam a seguir um único processo.",
      },
      {
        titulo: "A Ordem Real da Contratação",
        texto:
          "Cada documento aparece na sequência em que a contratação de fato acontece, e a plataforma mostra o que vem antes.",
      },
      {
        titulo: "Proposta para Revisar, Não Página em Branco",
        texto: "Em vez de escrever cada seção do zero, o servidor recebe uma proposta e a revisa.",
      },
    ],
  },

  fluxo: {
    id: "geradocs",
    titulo: "O GeraDocs e o Fluxo da Contratação",
    intro:
      "A plataforma gera os seis documentos na ordem do fluxo real. O DFD entra como insumo e o PCA como contexto do órgão: nenhum dos dois é gerado.",
    insumos: [
      {
        rotulo: "Insumo",
        titulo: "DFD",
        texto: "Entra no processo por anexo ou por cadastro da secretaria. A plataforma não o gera.",
      },
      {
        rotulo: "Contexto do órgão",
        titulo: "PCA",
        texto: "Serve de contexto para os documentos do processo. Também não é gerado.",
      },
    ],
    notaDireta: "Na contratação direta, o Edital dá lugar ao Aviso de Contratação Direta.",
    exportacao: "A exportação é em DOCX e PDF, com o timbre da entidade.",
  },

  ia: {
    id: "ia",
    titulo: "A IA Propõe. O Servidor Decide.",
    itens: [
      {
        titulo: "Toda Proposta Vem Identificada",
        texto: "O texto gerado chega marcado como proposta da IA, e o servidor o revisa antes de aceitar.",
      },
      {
        titulo: "A IA Ajuda, Nunca Condiciona",
        texto: "O documento pode ser elaborado com ou sem IA. Ela é uma facilidade, nunca uma exigência.",
      },
      {
        titulo: "Orienta, Não Trava",
        texto:
          "A plataforma orienta e alerta, e o servidor mantém a decisão. Onde algo precisa ser seguido, ela explica o motivo.",
      },
      {
        titulo: "Só o Que Consta no Processo",
        texto: "A IA trabalha com as informações do processo e não acrescenta conhecimento próprio ao documento.",
      },
    ],
    altCaptura: "Proposta de texto gerada pela IA no editor do GeraDocs, para o servidor revisar antes de salvar.",
  },

  confianca: {
    id: "confianca",
    titulo: "Feito para o Controle da Contratação",
    itens: [
      {
        icone: "auditoria" as IconeDaConfianca,
        titulo: "Trilha de Auditoria",
        texto: "O que acontece no processo fica registrado.",
      },
      {
        icone: "lgpd" as IconeDaConfianca,
        titulo: "LGPD no Uso da IA",
        texto: "A LGPD é respeitada também nas informações enviadas à IA.",
      },
      {
        icone: "teto" as IconeDaConfianca,
        titulo: "Teto de IA Definido pela Entidade",
        texto: "A entidade define quanto usar de IA, e o servidor vê o limite antes de gerar.",
      },
      {
        icone: "fundamento" as IconeDaConfianca,
        titulo: "Fundamento Legal Literal",
        texto: "Os documentos citam a lei como ela é, por exemplo, Art. 75, II, Lei 14.133/21.",
      },
      {
        icone: "entidade" as IconeDaConfianca,
        titulo: "Protocolo e Assinatura no Seu Sistema",
        texto: "Protocolo, assinatura e aprovação continuam no sistema de processos da sua entidade.",
      },
    ],
  },

  quemSomos: {
    id: "quem-somos",
    titulo: "Quem Somos",
    lacuna: "[LACUNA: descrição da GovPro e serviços além do GeraDocs]",
  },

  demonstracao: {
    id: "demonstracao",
    titulo: "Veja o GeraDocs no Seu Órgão",
    texto: "Conte o que sua entidade contrata e veja o fluxo funcionando.",
    cta: "Solicitar Demonstração",
  },

  rodape: {
    endosso: "GeraDocs é uma solução",
    contato: "Precisa de ajuda?",
    copyright: "© 2026 GovPro. Todos os direitos reservados.",
  },
}
