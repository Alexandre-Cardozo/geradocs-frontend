/**
 * Indicadores do painel, calculados a partir do estado dos processos e dos
 * documentos — nunca guardados como contador que pode divergir do que existe.
 */

import type { DocumentoGerado, Processo, ResumoDocumentos } from "@/lib/types"

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
 * O tamanho vem como texto ("312 KB") porque é o que a interface exibe; a soma
 * ignora o que não for numérico em vez de estourar — um documento sem tamanho
 * registrado não pode derrubar o indicador inteiro.
 */
export function resumirDocumentos(documentos: DocumentoGerado[]): ResumoDocumentos {
  const totalKB = documentos.reduce(
    (soma, documento) => soma + (Number.parseInt(documento.tamanho, 10) || 0),
    0,
  )
  return {
    total: documentos.length,
    esteMes: documentos.length,
    armazenamentoMB: Math.round((totalKB / 1024) * 10) / 10,
  }
}
