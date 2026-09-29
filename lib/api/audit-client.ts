import "client-only"

import { requisicaoProtegida } from "@/lib/api/auth-client"

export type TipoRecursoAuditoria =
  | "AUTHENTICATION"
  | "USER"
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "PROCUREMENT_PROCESS"
  | "PCA_PLAN"
  | "TEMPLATE"

export interface EntradaAuditoria {
  id: string
  ocorridoEm: string
  acao: string
  tipoRecurso: TipoRecursoAuditoria
  recursoId?: string
  atorId?: string
  atorNome?: string
  organizacaoId?: string
  motivo?: string
  correlationId: string
}

interface RespostaApi {
  content: Array<{
    id: string
    occurredAt: string
    action: string
    resourceType: TipoRecursoAuditoria
    resourceId?: string | null
    actorId?: string | null
    actorName?: string | null
    organizationId?: string | null
    reason?: string | null
    correlationId: string
  }>
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ConsultaAuditoria {
  pagina?: number
  porPagina?: number
  tipoRecurso?: TipoRecursoAuditoria
  recursoId?: string
  atorId?: string
  acao?: string
  de?: string
  ate?: string
}

export interface PaginaAuditoria {
  itens: EntradaAuditoria[]
  pagina: number
  porPagina: number
  total: number
  totalPaginas: number
}

export async function consultarAuditoria(params: ConsultaAuditoria = {}): Promise<PaginaAuditoria> {
  const query = new URLSearchParams({
    page: String(params.pagina ?? 0),
    size: String(params.porPagina ?? 50),
  })
  const filtros: Array<[string, string | undefined]> = [
    ["resourceType", params.tipoRecurso],
    ["resourceId", params.recursoId],
    ["actorId", params.atorId],
    ["action", params.acao],
    ["from", params.de],
    ["to", params.ate],
  ]
  for (const [nome, valor] of filtros) {
    if (valor?.trim()) query.set(nome, valor.trim())
  }
  const resposta = await requisicaoProtegida<RespostaApi>(`/audit-entries?${query}`)
  return {
    itens: resposta.content.map((item) => ({
      id: item.id,
      ocorridoEm: item.occurredAt,
      acao: item.action,
      tipoRecurso: item.resourceType,
      recursoId: item.resourceId ?? undefined,
      atorId: item.actorId ?? undefined,
      atorNome: item.actorName ?? undefined,
      organizacaoId: item.organizationId ?? undefined,
      motivo: item.reason ?? undefined,
      correlationId: item.correlationId,
    })),
    pagina: resposta.page,
    porPagina: resposta.size,
    total: resposta.totalElements,
    totalPaginas: resposta.totalPages,
  }
}
