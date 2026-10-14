/**
 * Os endereços que ligam o processo e a tela de Documentos (ADR-049 do
 * back-end): um documento gerado tem página própria, e os documentos de um
 * processo têm endereço próprio dentro de Documentos.
 */

import { CATALOGO, ordenar } from "@/lib/documentos/catalogo"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

/**
 * A página do documento gerado.
 *
 * @param gerado acabou de ser gerado: a página o anuncia
 */
export function rotaDoDocumentoGerado(processoId: string, tipo: TipoDocumento, gerado = false): string {
  const consulta = new URLSearchParams({ processo: processoId, tipo: CATALOGO[tipo].slug })
  if (gerado) consulta.set("gerado", "1")
  return `/documentos/documento?${consulta.toString()}`
}

/** Os documentos de um processo, na tela de Documentos; com a juntada, já com o painel aberto. */
export function rotaDosDocumentosDoProcesso(processoId: string, juntada = false): string {
  const consulta = new URLSearchParams({ processo: processoId })
  if (juntada) consulta.set("juntada", "1")
  return `/documentos?${consulta.toString()}`
}

/** Os documentos gerados de um processo, agrupados. */
export interface DocumentosDoProcesso {
  processoId: string
  numero: string
  objeto: string
  /** Na ordem do fluxo. */
  documentos: DocumentoGerado[]
  /** A geração mais recente entre eles — é por ela que os processos se ordenam. */
  ultimaGeracao: string
}

/** Agrupa o acervo por processo; o processo com geração mais recente vem primeiro. */
export function agruparPorProcesso(documentos: DocumentoGerado[]): DocumentosDoProcesso[] {
  const grupos = new Map<string, DocumentosDoProcesso>()
  for (const documento of documentos) {
    const grupo = grupos.get(documento.processoId) ?? {
      processoId: documento.processoId,
      numero: documento.processoNumero ?? documento.processoId,
      objeto: documento.processoObjeto ?? "",
      documentos: [],
      ultimaGeracao: documento.geradoEm,
    }
    grupo.documentos.push(documento)
    if (documento.geradoEm > grupo.ultimaGeracao) grupo.ultimaGeracao = documento.geradoEm
    grupos.set(documento.processoId, grupo)
  }
  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      documentos: [...grupo.documentos].sort((a, b) => CATALOGO[a.tipo].ordem - CATALOGO[b.tipo].ordem),
    }))
    .sort((a, b) => b.ultimaGeracao.localeCompare(a.ultimaGeracao))
}

/** Os tipos que existem no acervo, na ordem do fluxo, com quantos documentos de cada. */
export function tiposNoAcervo(documentos: DocumentoGerado[]): { tipo: TipoDocumento; quantidade: number }[] {
  const tipos = ordenar([...new Set(documentos.map((documento) => documento.tipo))])
  return tipos.map((tipo) => ({ tipo, quantidade: documentos.filter((documento) => documento.tipo === tipo).length }))
}
