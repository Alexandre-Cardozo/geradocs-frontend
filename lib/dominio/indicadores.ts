/**
 * Indicadores do painel, calculados a partir do estado dos processos e dos
 * documentos — nunca guardados como contador que pode divergir do que existe.
 */

import type { ArquivoDoDocumento, DocumentoGerado, Processo, ResumoDocumentos } from "@/lib/types"

export interface Indicadores {
  /** Processos que ainda não foram encerrados. */
  processosAtivos: number
  /** Processos que já têm documento em elaboração. */
  processosEmElaboracao: number
  /** Documentos escolhidos nos processos e ainda não gerados. */
  documentosPendentes: number
  documentosGerados: number
  etpsConcluidos: number
}

export function calcularIndicadores(processos: Processo[], documentos: DocumentoGerado[]): Indicadores {
  const gerados = new Set(documentos.map((documento) => `${documento.processoId}:${documento.tipo}`))
  return {
    processosAtivos: processos.filter((processo) => processo.status !== "concluido").length,
    processosEmElaboracao: processos.filter((processo) => processo.status === "em_elaboracao").length,
    documentosPendentes: processos
      .flatMap((processo) => processo.documentos.map((tipo) => `${processo.id}:${tipo}`))
      .filter((chave) => !gerados.has(chave)).length,
    documentosGerados: documentos.length,
    etpsConcluidos: documentos.filter((documento) => documento.tipo === "ETP").length,
  }
}

/**
 * Resumo do repositório de documentos: quantidade e armazenamento.
 *
 * O armazenamento soma os bytes que o servidor mediu em cada arquivo. Até
 * 23/08/2026 ele interpretava de volta um texto ("312 KB") que a própria
 * interface tinha fabricado — número que saía do nada e voltava para o painel
 * parecendo medida.
 */
/** A soma dos arquivos de um documento, em bytes. */
export function totalDeBytes(arquivos: ArquivoDoDocumento[]): number {
  return arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0)
}

export function resumirDocumentos(documentos: DocumentoGerado[]): ResumoDocumentos {
  const bytes = documentos.reduce((soma, documento) => soma + totalDeBytes(documento.arquivos), 0)
  return {
    total: documentos.length,
    esteMes: documentos.length,
    armazenamentoMB: Math.round((bytes / 1_048_576) * 10) / 10,
  }
}
