import type { ArquivoDoDocumento } from "@/lib/types"

/**
 * O tamanho de um documento é a soma dos arquivos dele.
 *
 * Os bytes são os que o servidor mediu em cada arquivo. Até 23/08/2026 esta
 * conta interpretava de volta um texto ("312 KB") que a própria interface tinha
 * fabricado — número que saía do nada e voltava para a tela parecendo medida.
 *
 * As contagens do painel saíram daqui no 12.3: quem conta o acervo é o servidor,
 * e contar na tela responderia "o que coube mostrar" (ADR-025).
 */
export function totalDeBytes(arquivos: ArquivoDoDocumento[]): number {
  return arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0)
}
