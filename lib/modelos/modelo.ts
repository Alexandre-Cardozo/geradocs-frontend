import type { DadosDoModelo } from "@/lib/api/modelos-client"

/**
 * As regras do formulário do modelo do órgão (§88).
 *
 * <p>Título e justificativa são obrigatórios: o título é o que aparece na
 * escolha da minuta, e a justificativa é o que a Lei 14.133/21 pede para não
 * seguir a minuta da AGU como publicada (Art. 19, § 2º).
 */
export function errosDoModelo(dados: DadosDoModelo): Partial<Record<"titulo" | "justificativa", string>> {
  return {
    ...(dados.titulo.trim() ? {} : { titulo: "Dê um título ao modelo." }),
    ...(dados.justificativa.trim()
      ? {}
      : { justificativa: "Justifique a não utilização da minuta da AGU (Art. 19, § 2º, Lei 14.133/21)." }),
  }
}

/** Só as seções cujo texto o órgão mudou vão no pedido: as outras ficam com o da minuta. */
export function textosAlterados(
  secoes: { codigo: string; texto: string }[],
  textos: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    secoes
      .filter((secao) => textos[secao.codigo] !== undefined && textos[secao.codigo] !== secao.texto)
      .map((secao) => [secao.codigo, textos[secao.codigo] as string]),
  )
}
