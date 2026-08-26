import type { ParecerDFD } from "@/lib/types";

/**
 * O que sobrou do mock: o parecer do DFD, e mais nada.
 *
 * Até 26/08/2026 este arquivo tinha 467 linhas — usuários, prefeituras,
 * processos, documentos, estatísticas e resumo do acervo do protótipo. **Nada
 * disso era lido**: as telas passaram a perguntar ao servidor entre os Blocos 9
 * e 12, e as fixtures ficaram, alimentando um "banco" em memória que ninguém
 * consultava. Dado de demonstração que ninguém apaga vira dado que alguém
 * acredita.
 *
 * O parecer fica porque é o único ainda declarado como sintético
 * (`DADOS_SINTETICOS.parecerDfd`) — a tela avisa quem o lê —, e sai quando o
 * modelo de IA entrar (12.2).
 *
 * Nunca importe este módulo em componentes: consuma via lib/api + hooks. O
 * guarda-corpo nº 2 cobra isso.
 */

/** Achados do parecer da IA sobre o DFD (protótipo DFDReview). */
export const parecerDFDBase: Omit<ParecerDFD, "processoId" | "arquivo"> = {
  analisadoEm: "2025-07-09T14:38:00",
  nota: 74,
  classificacao: "Adequado com ressalvas",
  achados: [
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Identificação do demandante completa e assinada pela autoridade competente.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Objeto descrito com clareza e especificidade suficiente para embasamento do ETP.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Justificativa da necessidade alinhada com o planejamento institucional.",
      fundamentacao: "PCA 2025 — item 47",
    },
    {
      tipo: "alerta",
      severidade: "recomendacao",
      descricao:
        "Estimativa de valor ausente. Recomenda-se incluir pesquisa prévia de preços para fortalecer a justificativa.",
    },
    {
      tipo: "alerta",
      severidade: "recomendacao",
      descricao:
        "Prazo de entrega não especificado. Adicionar cronograma ou prazo estimado facilita o preenchimento do TR.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao: "Critérios de sustentabilidade mencionados.",
      fundamentacao: "Art. 11 do Decreto 7.746/2012",
    },
    {
      tipo: "alerta",
      severidade: "atencao",
      descricao:
        "Ausência de referência ao item do PCA vigente. O ETP pode ser questionado na fase de aprovação.",
    },
  ],
};
