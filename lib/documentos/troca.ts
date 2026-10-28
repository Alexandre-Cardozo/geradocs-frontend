/**
 * O que a troca de minuta faz com o documento, em frases (§90).
 *
 * <p>A prévia do servidor conta as seções da minuta nova; a pessoa pensa no
 * documento que tem. Sem dizer as duas estruturas — "hoje 18, na nova 20" —,
 * "1 recebe o texto · 19 ficam em branco" parecia perder 17 seções. Por isso a
 * estrutura vem primeiro, e depois o destino do que já foi escrito.
 */

/** "1 seção", "2 seções" — com o verbo, quando houver, concordando. */
export function contar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

export interface ResumoDaTroca {
  /** "18 seções hoje → 20 seções na nova minuta". */
  estrutura: string
  /** O destino do texto já escrito, só o que acontece. */
  destinos: string[]
  /** O que não tem seção do mesmo assunto e fica guardado. */
  guardado?: string
  /** As seções da minuta nova que começam vazias. */
  emBranco?: string
}

export function resumoDaTroca(
  previa: { mantidas: string[]; reunidas: string[]; emBranco: string[]; semLugar: string[]; restauradas: string[] },
  secoesAtuais: number,
  secoesNovas: number,
): ResumoDaTroca {
  const destinos = [
    previa.mantidas.length > 0 &&
      `${contar(previa.mantidas.length, "seção recebe", "seções recebem")} o texto da seção do mesmo assunto.`,
    previa.reunidas.length > 0 &&
      `${contar(previa.reunidas.length, "seção junta", "seções juntam")} o texto de mais de uma seção.`,
    previa.restauradas.length > 0 &&
      `${contar(previa.restauradas.length, "seção volta", "seções voltam")} com o texto que já tinha${
        previa.restauradas.length === 1 ? "" : "m"
      }.`,
  ].filter((linha): linha is string => typeof linha === "string")
  const nadaEscrito = destinos.length === 0 && previa.semLugar.length === 0
  return {
    estrutura:
      secoesAtuais === secoesNovas
        ? `${contar(secoesNovas, "seção", "seções")} hoje e na nova minuta.`
        : `${contar(secoesAtuais, "seção", "seções")} hoje → ${contar(secoesNovas, "seção", "seções")} na nova minuta.`,
    destinos: nadaEscrito ? ["Ainda não há texto escrito: só a estrutura muda."] : destinos,
    ...(previa.semLugar.length > 0
      ? { guardado: `Sem seção do mesmo assunto, o texto fica guardado: ${previa.semLugar.join(", ")}.` }
      : {}),
    ...(previa.emBranco.length > 0 && !nadaEscrito
      ? { emBranco: `${contar(previa.emBranco.length, "seção começa", "seções começam")} em branco.` }
      : {}),
  }
}
