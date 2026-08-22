/**
 * O corpo do documento, montado a partir das seções.
 *
 * Hoje o documento gerado é só metadado — título, formato, tamanho. O arquivo
 * em si nasce no Bloco 11. Esta função existe antes dele porque é aqui que a
 * regra mora, e porque sem ela a seção dispensada **desaparece em silêncio**: o
 * documento sai sem o inciso e sem dizer que ele foi dispensado, que é
 * exatamente o que o Art. 18, § 2º não admite.
 *
 * Serializar em DOCX ou PDF é trabalho de adaptador. O que é decisão de produto
 * — o que entra, em que ordem e com que texto — fica aqui.
 */

import { foiDispensada, paragrafoDeDispensa } from "./secoes"
import type { SecaoDocumento } from "@/lib/types"

export interface BlocoDoDocumento {
  /** Ordinal da seção no documento. */
  id: string
  titulo: string
  /** Texto que vai ao documento: o conteúdo escrito ou o parágrafo de dispensa. */
  texto: string
  /** Este bloco é a declaração de dispensa, e não conteúdo da seção. */
  dispensada: boolean
}

/**
 * As seções que entram no documento, na ordem, já resolvidas.
 *
 * Seção dispensável em branco **sem** justificativa fica de fora: ela é lacuna,
 * não decisão, e anunciá-la como dispensa inventaria uma justificativa que
 * ninguém deu.
 */
export function corpoDoDocumento(secoes: SecaoDocumento[]): BlocoDoDocumento[] {
  const blocos: BlocoDoDocumento[] = []
  for (const secao of secoes) {
    if (foiDispensada(secao)) {
      blocos.push({ id: secao.id, titulo: secao.titulo, texto: paragrafoDeDispensa(secao), dispensada: true })
      continue
    }
    const conteudo = secao.conteudo.trim()
    if (conteudo) {
      blocos.push({ id: secao.id, titulo: secao.titulo, texto: conteudo, dispensada: false })
    }
  }
  return blocos
}
