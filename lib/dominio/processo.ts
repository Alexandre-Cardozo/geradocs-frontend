/**
 * Regras do ciclo de vida do processo de contratação.
 *
 * A plataforma entrega os documentos; o protocolo e a aprovação acontecem no
 * sistema de processo administrativo da prefeitura. Encerrar é, portanto, uma
 * decisão do servidor — e a regra de produto que vale acima das outras se aplica
 * aqui: **documento pendente não impede o encerramento; exige justificativa**.
 */

import { ordenar } from "@/lib/documentos"
import type { DocumentoGerado, Processo, TipoDocumento } from "@/lib/types"

/** Tipos já gerados para um processo. */
export function tiposGerados(processoId: string, documentos: DocumentoGerado[]): TipoDocumento[] {
  return documentos.filter((documento) => documento.processoId === processoId).map((documento) => documento.tipo)
}

/**
 * Documentos escolhidos no processo que ainda não foram gerados, na ordem
 * canônica do fluxo. Vazio significa que o processo está pronto para encerrar.
 */
export function documentosPendentes(processo: Processo, gerados: TipoDocumento[]): TipoDocumento[] {
  return ordenar(processo.documentos.filter((tipo) => !gerados.includes(tipo)))
}

/** Encerrar com pendência exige justificativa — orientar sem travar. */
export function exigeJustificativaParaEncerrar(pendentes: TipoDocumento[]): boolean {
  return pendentes.length > 0
}

/**
 * Texto do evento de encerramento na trilha.
 *
 * Registrar *por que* o processo foi encerrado com pendência é o que separa uma
 * decisão do servidor de um descuido.
 */
export function motivoDoEncerramento(pendentes: TipoDocumento[], justificativa: string): string {
  return pendentes.length > 0
    ? `Encerrado com pendências. ${justificativa.trim()}`
    : "Todos os documentos foram gerados."
}
