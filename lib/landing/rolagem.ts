/**
 * As contas da rolagem da landing (§125), fora da abertura: quanto de uma seção
 * já passou, em que etapa a demonstração está, quanto a faixa de documentos
 * desliza e quanto cada palavra do manifesto acende. Sem DOM e sem React.
 */

import { trecho } from "@/lib/landing/paralaxe"

/**
 * Quanto a seção já atravessou a janela, de 0 (o topo dela acaba de aparecer
 * embaixo) a 1 (o fim dela acaba de sair em cima). Serve às seções que não
 * prendem o palco.
 */
export function progressoDaPassagem(topo: number, altura: number, janela: number): number {
  return trecho(janela - topo, 0, janela + altura)
}

/** A etapa, de 0 a `total - 1`, em que o progresso cai. O fim da rolagem é a última. */
export function etapaDoProgresso(progresso: number, total: number): number {
  return Math.min(total - 1, Math.max(0, Math.floor(progresso * total)))
}

/**
 * O progresso que leva a uma etapa: o meio do trecho dela. É para onde o clique
 * num passo rola a página quando o palco está preso.
 */
export function progressoDaEtapa(etapa: number, total: number): number {
  return (etapa + 0.5) / total
}

/**
 * Quanto a faixa desliza para a esquerda, em px (negativo). Faixa que cabe na
 * janela não desliza.
 */
export function deslocamentoDaFaixa(progresso: number, largura: number, janela: number): number {
  return -Math.max(0, largura - janela) * progresso + 0
}

/**
 * Opacidade de uma palavra do manifesto. As palavras acendem em sequência entre
 * 15% e 75% da passagem, e cada uma leva o tempo de uma palavra para chegar.
 * Antes disso ficam em `minimo`, legíveis mas apagadas.
 */
export function opacidadeDaPalavra(progresso: number, indice: number, total: number, minimo = 0.22): number {
  const aceso = trecho(progresso, 0.15, 0.75) * total
  return minimo + (1 - minimo) * Math.min(1, Math.max(0, aceso - indice))
}

/** O valor de um contador num ponto da subida (0 a 1), com desaceleração no fim. */
export function valorDoContador(alvo: number, progresso: number): number {
  const p = Math.min(1, Math.max(0, progresso))
  return Math.round(alvo * (1 - (1 - p) ** 3))
}

export type Ponto = { x: number; y: number }

/**
 * Onde o cursor está na demonstração em poucos cliques (§127), em % da tela.
 * No começo do trecho de cada etapa (`fracaoDoVoo`) ele voa em arco do botão da
 * etapa anterior até o desta; no resto do trecho fica sobre o botão. Rolar aos
 * poucos leva o voo aos poucos, nos dois sentidos. `emVoo` diz se ainda não
 * chegou: a chegada é o momento do clique.
 */
export function vooDoCursor(
  progresso: number,
  alvos: Ponto[],
  fracaoDoVoo = 0.4,
  arco = 8,
): Ponto & { etapa: number; emVoo: boolean } {
  const etapa = etapaDoProgresso(progresso, alvos.length)
  const destino = alvos[etapa] ?? { x: 50, y: 50 }
  const origem = alvos[etapa - 1] ?? destino
  const local = Math.min(1, Math.max(0, progresso * alvos.length - etapa))
  const t = Math.min(1, local / fracaoDoVoo)
  const k = t * t * (3 - 2 * t)
  return {
    etapa,
    x: origem.x + (destino.x - origem.x) * k,
    y: origem.y + (destino.y - origem.y) * k - arco * Math.sin(Math.PI * k),
    emVoo: t < 1,
  }
}
