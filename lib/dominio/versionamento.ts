/**
 * Versionamento de documento gerado.
 *
 * Regerar **nunca sobrescreve sem rastro**: incrementa a versão e empilha a
 * anterior no histórico. É exigência de controle — um documento que instrui
 * processo de contratação precisa poder mostrar o que mudou e quando.
 */

import type { VersaoDocumento } from "@/lib/types"

/** Rótulo do motivo da versão, exibido no histórico. */
export type MotivoDaVersao = "inicial" | "regeracao"

export const NOTA_DA_VERSAO: Record<MotivoDaVersao, string> = {
  inicial: "Geração inicial",
  regeracao: "Regeração",
}

/** Próxima versão de um documento. A primeira geração é a versão 1. */
export function proximaVersao(versaoAtual?: number): number {
  return (versaoAtual ?? 0) + 1
}

/** Entrada do histórico para uma versão recém-gerada. */
export function entradaDeHistorico(versao: number, geradoEm: string, tamanho: string): VersaoDocumento {
  return { versao, geradoEm, tamanho, nota: NOTA_DA_VERSAO[versao === 1 ? "inicial" : "regeracao"] }
}

/**
 * Empilha a nova versão no topo do histórico.
 *
 * A ordem é do mais recente para o mais antigo porque é assim que a tela lê — e
 * porque a versão vigente é a que se procura primeiro.
 */
export function empilharVersao(historico: VersaoDocumento[], entrada: VersaoDocumento): VersaoDocumento[] {
  return [entrada, ...historico]
}

/** Rótulo da versão para exibição: a partir da segunda, o documento é retificado. */
export function rotuloDaVersao(versao: number): string {
  return versao === 1 ? "v1" : `v${versao} · RETIFICADO`
}
