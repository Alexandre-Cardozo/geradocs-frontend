import "client-only"
import { requisicaoProtegida } from "@/lib/api/auth-client"

export type Proposal = {
  id: string
  processId: string
  documentType: string
  sectionCode: string
  baseVersion: number
  proposedContent: string
  editedContent?: string | null
  status: "PROCESSING" | "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "FAILED" | "EXPIRED" | "SUPERSEDED"
  createdAt: string
  decidedAt?: string | null
  resultDocumentVersion?: number | null
}

export function criarPropostaEtp(processId: string, sectionCode: string, baseVersion: number, draft?: string) {
  return requisicaoProtegida<Proposal>(`/procurement-processes/${processId}/ai/proposals`, {
    method: "POST",
    body: JSON.stringify({ documentType: "ETP", sectionCode, baseVersion, draft: draft?.trim() || null }),
  })
}

export function listarPropostasEpt(processId: string) {
  return requisicaoProtegida<Proposal[]>(`/procurement-processes/${processId}/ai/proposals?documentType=ETP`)
}

export function aceitarProposta(processId: string, id: string, editedContent?: string) {
  return requisicaoProtegida<Proposal>(`/procurement-processes/${processId}/ai/proposals/${id}/accept`, {
    method: "POST", body: JSON.stringify({ editedContent: editedContent?.trim() || null }),
  })
}

export function rejeitarProposta(processId: string, id: string, reason?: string) {
  return requisicaoProtegida<Proposal>(`/procurement-processes/${processId}/ai/proposals/${id}/reject`, {
    method: "POST", body: JSON.stringify({ reason: reason?.trim() || null }),
  })
}

export function regenerarProposta(processId: string, id: string) {
  return requisicaoProtegida<Proposal>(`/procurement-processes/${processId}/ai/proposals/${id}/regenerate`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}
