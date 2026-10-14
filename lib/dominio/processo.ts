/**
 * Regras do ciclo de vida do processo de contratação.
 *
 * A plataforma entrega os documentos; o protocolo e a aprovação acontecem no
 * sistema de processo administrativo da entidade. Encerrar é, portanto, uma
 * decisão do servidor — e a regra de produto que vale acima das outras se aplica
 * aqui: **obrigatório pendente não impede o encerramento; exige justificativa**.
 */

import { ordenar, regraDe } from "@/lib/documentos"
import type { DocumentoGerado, Processo, TipoDocumento } from "@/lib/types"

/** Tipos já gerados para um processo. */
export function tiposGerados(processoId: string, documentos: DocumentoGerado[]): TipoDocumento[] {
  return documentos.filter((documento) => documento.processoId === processoId).map((documento) => documento.tipo)
}

/**
 * Os obrigatórios da modalidade **atual** que ainda não foram gerados, na
 * ordem do fluxo — é o que o encerramento cobra (ADR-047 do back-end). Vazio
 * significa que o processo pode encerrar sem justificativa.
 *
 * Conta a modalidade de agora, esteja o documento na lista ou não: o Edital de
 * um processo que virou dispensa não é cobrado; o Aviso de uma dispensa que
 * passou a ter disputa é.
 */
export function documentosPendentes(
  processo: Pick<Processo, "modalidade" | "formaDaDispensa">,
  gerados: TipoDocumento[],
): TipoDocumento[] {
  return ordenar(
    regraDe(processo.modalidade, processo.formaDaDispensa).obrigatorios.filter((tipo) => !gerados.includes(tipo)),
  )
}

/** Os que estão no processo, não foram gerados e não são cobrados: encerrar sem eles é escolha prevista. */
export function documentosPorFazerSemCobranca(processo: Processo, gerados: TipoDocumento[]): TipoDocumento[] {
  const cobrados = documentosPendentes(processo, gerados)
  return ordenar(processo.documentos.filter((tipo) => !gerados.includes(tipo) && !cobrados.includes(tipo)))
}

/**
 * Texto do evento de encerramento na trilha.
 *
 * Registrar *por que* o processo foi encerrado com pendência é o que separa uma
 * decisão do servidor de um descuido.
 *
 * Não recebe mais a lista de pendências: desde 22/08/2026 é o servidor que cobra
 * a justificativa, e ele só aceita encerrar sem ela quando não falta documento.
 * Justificativa vazia, portanto, *significa* que não havia pendência — e manter
 * a regra também aqui daria duas fontes para a mesma decisão, que é o jeito de
 * elas divergirem.
 */
export function motivoDoEncerramento(justificativa: string): string {
  return justificativa.trim() === ""
    ? "Todos os documentos foram gerados."
    : `Encerrado com pendências. ${justificativa.trim()}`
}

/**
 * Reflexo da geração de um documento no processo.
 *
 * ETP e TR têm status próprio no processo porque são os dois que a listagem
 * exibe como coluna — o servidor precisa ver, sem abrir o processo, se os dois
 * documentos centrais já existem.
 */
export function statusDoDocumentoNoProcesso(tipo: TipoDocumento): Partial<Pick<Processo, "etpStatus" | "trStatus">> {
  if (tipo === "ETP") return { etpStatus: "Completo" }
  if (tipo === "TR") return { trStatus: "Completo" }
  return {}
}
