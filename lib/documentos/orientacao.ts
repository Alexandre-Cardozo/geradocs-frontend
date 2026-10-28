/**
 * O limite da orientação do servidor à IA (§91). O servidor confere de novo,
 * depois de normalizar — este é só o contador da tela.
 */
export const LIMITE_DA_ORIENTACAO = 500

/** Quantos caracteres ainda cabem; negativo quando passou. */
export function sobraDaOrientacao(texto: string): number {
  return LIMITE_DA_ORIENTACAO - texto.trim().replace(/\s+/g, " ").length
}
