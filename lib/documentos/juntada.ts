/**
 * A juntada: os documentos gerados do processo num arquivo só, na ordem que o
 * servidor escolher (ADR-048 do back-end).
 *
 * Nada é gerado de novo — entra o arquivo da geração vigente de cada documento,
 * no formato escolhido. Por isso só entra documento gerado, e só se ele tiver
 * arquivo naquele formato.
 */

import { ordenar } from "@/lib/documentos/catalogo"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

export type FormatoDaJuntada = "PDF" | "DOCX"

/** Um documento gerado do processo, como a juntada o oferece. */
export interface ItemDaJuntada {
  tipo: TipoDocumento
  versao: number
  /** Tem arquivo no formato escolhido; sem ele, não entra. */
  disponivel: boolean
}

/** Os gerados do processo, na ordem do fluxo, dizendo quais têm o formato. */
export function itensDaJuntada(
  documentos: DocumentoGerado[],
  processoId: string,
  formato: FormatoDaJuntada,
): ItemDaJuntada[] {
  const doProcesso = documentos.filter((documento) => documento.processoId === processoId)
  return ordenar(doProcesso.map((documento) => documento.tipo)).map((tipo) => {
    const documento = doProcesso.find((candidato) => candidato.tipo === tipo) as DocumentoGerado
    return {
      tipo,
      versao: documento.versao,
      disponivel: documento.arquivos.some((arquivo) => arquivo.formato === formato),
    }
  })
}

/** Os documentos do processo que ainda não foram gerados — não entram na juntada. */
export function aindaNaoGerados(solicitados: TipoDocumento[], itens: ItemDaJuntada[]): TipoDocumento[] {
  return ordenar(solicitados.filter((tipo) => !itens.some((item) => item.tipo === tipo)))
}

/** Sobe (-1) ou desce (+1) um documento na ordem; na ponta, fica onde está. */
export function mover(ordem: TipoDocumento[], tipo: TipoDocumento, direcao: -1 | 1): TipoDocumento[] {
  const de = ordem.indexOf(tipo)
  const para = de + direcao
  if (de < 0 || para < 0 || para >= ordem.length) return ordem
  const nova = [...ordem]
  ;[nova[de], nova[para]] = [nova[para] as TipoDocumento, nova[de] as TipoDocumento]
  return nova
}

/**
 * O Edital já sai com o TR e a minuta como anexos (ADR-040 do back-end):
 * juntá-los também repete o conteúdo. A tela avisa, e não impede.
 */
export function anexosRepetidos(selecionados: TipoDocumento[]): TipoDocumento[] {
  if (!selecionados.includes("Edital")) return []
  return selecionados.filter((tipo) => tipo === "TR" || tipo === "Contrato")
}
