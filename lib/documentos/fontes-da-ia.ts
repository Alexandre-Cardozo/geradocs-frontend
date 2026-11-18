/**
 * O que a IA lê para redigir uma seção, dito como o servidor o faz.
 *
 * <p>A frase do cartão "Gerar com IA" prometia o PCA em toda seção, mas o servidor
 * só o consulta na seção 2 do ETP (alinhamento ao PCA). Prometer mais do que a IA
 * viu leva a pessoa a confiar numa conferência que não houve. Estas fontes
 * espelham `DocumentAuthoringUseCases.prepareSection` do back-end: DFD e processo
 * em toda seção, mais uma fonte própria em três seções do ETP.
 */
export const FONTES_PADRAO = "no DFD e no processo"

const FONTES_DO_ETP: Readonly<Record<string, string>> = {
  "2": "no DFD, no PCA e no processo",
  "5": "no DFD, nas alternativas de mercado e no processo",
  "6": "no DFD, na pesquisa de preços e no processo",
}

export function fontesDaIa(tipo: string | undefined, secaoId: string): string {
  return (tipo === "ETP" ? FONTES_DO_ETP[secaoId] : undefined) ?? FONTES_PADRAO
}
