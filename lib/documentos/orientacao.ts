/**
 * O limite da orientação do servidor à IA (§91). O servidor confere de novo,
 * depois de normalizar; este é só o contador da tela. Eram 500 caracteres até
 * a §108 (ADR-073 do back-end).
 */
export const LIMITE_DA_ORIENTACAO = 1000

/** Quantos caracteres ainda cabem; negativo quando passou. */
export function sobraDaOrientacao(texto: string): number {
  return LIMITE_DA_ORIENTACAO - texto.trim().replace(/\s+/g, " ").length
}

/**
 * O maior texto de seção que a IA recebe (ADR 132): é o limite do campo `draft`
 * no back-end (`GenerateSectionRequest`). Passado dele, o "Gerar com IA" voltava
 * `400 Existem campos inválidos` — visto no TR e no Edital de serviços, em que a
 * minuta da AGU de uma seção chega a 36 mil caracteres.
 */
export const LIMITE_DO_TEXTO_PARA_A_IA = 20_000

/** O texto da seção passou do que a IA recebe. */
export function textoGrandeDemaisParaAIa(texto: string | undefined): boolean {
  return (texto?.length ?? 0) > LIMITE_DO_TEXTO_PARA_A_IA
}
