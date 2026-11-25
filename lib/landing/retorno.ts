/**
 * A volta à seção de onde a pessoa saiu (§131). Quem clica num botão da página
 * da GovPro (o onboarding, "Acessar") e volta pelo navegador tem de cair no
 * mesmo ponto. O navegador sozinho não consegue: ele devolve a rolagem antes de
 * os palcos de rolagem crescerem (a abertura passa a 270svh só depois de montar),
 * e a página para em outra seção.
 *
 * Por isso a marca não é o `scrollY`, é o bloco da página que estava no alto da
 * janela e quanto dele já tinha passado. Na volta, com a altura final, o mesmo
 * bloco volta ao mesmo lugar, cresça o que crescer acima dele.
 *
 * A marca fica no `history.state` da entrada da página, e não numa memória da
 * aba: só o "voltar" (ou o "avançar") reencontra essa entrada. Quem entra de
 * novo pelo logotipo ou por um link cria outra entrada e começa do alto.
 */

/** A chave da marca no `history.state` da entrada da página. */
export const CHAVE_DO_RETORNO = "govproRetorno"

export type MarcaDoRetorno = {
  /** A posição do bloco entre os filhos de `main`. */
  bloco: number
  /** O topo do bloco em relação ao alto da janela (negativo: já passou da borda). */
  deslocamento: number
}

/** O último bloco cujo topo já chegou ao alto da janela; se nenhum chegou, o primeiro. */
export function marcaDaRolagem(topos: number[]): MarcaDoRetorno | null {
  let marca: MarcaDoRetorno | null = null
  topos.forEach((topo, i) => {
    if (!marca || topo <= 1) marca = { bloco: i, deslocamento: topo }
  })
  return marca
}

/** A marca guardada na entrada do histórico, se tem o formato certo. */
export function lerMarca(estado: unknown): MarcaDoRetorno | null {
  if (typeof estado !== "object" || estado === null) return null
  const dado = (estado as Record<string, unknown>)[CHAVE_DO_RETORNO]
  if (typeof dado !== "object" || dado === null) return null
  const { bloco, deslocamento } = dado as Record<string, unknown>
  if (typeof bloco !== "number" || typeof deslocamento !== "number" || bloco < 0) return null
  return { bloco, deslocamento }
}

/** Onde rolar para o bloco voltar ao mesmo lugar da janela. */
export function alvoDoRetorno(marca: MarcaDoRetorno, topos: number[], rolagem: number): number | null {
  const topo = topos[marca.bloco]
  return topo === undefined ? null : Math.max(0, Math.round(rolagem + topo - marca.deslocamento))
}

/** Só links que saem da página (outra rota do site) marcam a volta; âncoras e `mailto:` não. */
export function saiDaPagina(destino: URL, atual: URL): boolean {
  return destino.origin === atual.origin && destino.pathname.replace(/\/$/, "") !== atual.pathname.replace(/\/$/, "")
}
