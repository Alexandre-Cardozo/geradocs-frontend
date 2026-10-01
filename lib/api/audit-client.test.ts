import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A consulta da trilha de auditoria.
 *
 * <p>O que o cliente decide é o que vai na query string: filtro em branco não
 * vai, porque `actorId=` vazio é um filtro que não casa com ninguém — a tela
 * mostraria "nenhum registro" para quem só deixou o campo sem preencher.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/audit-client")
}

afterEach(() => vi.resetModules())

const entradaApi = {
  id: "e-1",
  occurredAt: "2026-09-29T13:00:00Z",
  action: "USER_TRANSFERRED",
  resourceType: "USER" as const,
  resourceId: "u-1",
  actorId: "a-1",
  actorName: "Maria Costa Andrade",
  organizationId: "o-1",
  reason: "Remanejamento",
  correlationId: "c-1",
}

function respondendo(conteudo: unknown[] = [entradaApi]) {
  const pedidos: URLSearchParams[] = []
  servidor.use(
    http.get(`${urlDaApi}/audit-entries`, ({ request }) => {
      pedidos.push(new URL(request.url).searchParams)
      return HttpResponse.json({
        content: conteudo,
        page: 2,
        size: 20,
        totalElements: 41,
        totalPages: 3,
      })
    }),
  )
  return pedidos
}

describe("consultarAuditoria", () => {
  it("sem parâmetros, pede a primeira página com 50 por página e nenhum filtro", async () => {
    const pedidos = respondendo()
    const { consultarAuditoria } = await carregarClienteLimpo()

    await consultarAuditoria()

    expect(Object.fromEntries(pedidos[0]!)).toEqual({ page: "0", size: "50" })
  })

  it("leva os filtros preenchidos aparados, e deixa de fora os em branco", async () => {
    const pedidos = respondendo()
    const { consultarAuditoria } = await carregarClienteLimpo()

    await consultarAuditoria({
      pagina: 2,
      porPagina: 20,
      tipoRecurso: "USER",
      recursoId: "  u-1  ",
      atorId: "   ",
      acao: "USER_TRANSFERRED",
      de: "2026-09-01",
      ate: "2026-09-30",
    })

    expect(Object.fromEntries(pedidos[0]!)).toEqual({
      page: "2",
      size: "20",
      resourceType: "USER",
      resourceId: "u-1",
      action: "USER_TRANSFERRED",
      from: "2026-09-01",
      to: "2026-09-30",
    })
  })

  it("traduz a resposta para o vocabulário da interface", async () => {
    respondendo()
    const { consultarAuditoria } = await carregarClienteLimpo()

    const pagina = await consultarAuditoria()

    expect(pagina).toEqual({
      itens: [
        {
          id: "e-1",
          ocorridoEm: "2026-09-29T13:00:00Z",
          acao: "USER_TRANSFERRED",
          tipoRecurso: "USER",
          recursoId: "u-1",
          atorId: "a-1",
          atorNome: "Maria Costa Andrade",
          organizacaoId: "o-1",
          motivo: "Remanejamento",
          correlationId: "c-1",
        },
      ],
      pagina: 2,
      porPagina: 20,
      total: 41,
      totalPaginas: 3,
    })
  })

  it("campo nulo na API vira ausente, e não a string “null” na tela", async () => {
    respondendo([
      {
        ...entradaApi,
        resourceId: null,
        actorId: null,
        actorName: null,
        organizationId: null,
        reason: null,
      },
    ])
    const { consultarAuditoria } = await carregarClienteLimpo()

    const [entrada] = (await consultarAuditoria()).itens

    expect(entrada?.recursoId).toBeUndefined()
    expect(entrada?.atorId).toBeUndefined()
    expect(entrada?.atorNome).toBeUndefined()
    expect(entrada?.organizacaoId).toBeUndefined()
    expect(entrada?.motivo).toBeUndefined()
  })
})
