import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function cliente() {
  vi.resetModules()
  return import("@/lib/api/contextos-client")
}

afterEach(() => vi.resetModules())

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const contextosApi = {
  catalogVersion: "2026-11",
  contexts: [
    {
      code: "CONDUTOR_DE_VEICULO",
      title: "Serviço com Condutor de Veículo",
      description: "A contratação inclui o motorista.",
      confirmed: true,
      confirmedAt: "2026-11-05T12:00:00Z",
      confirmedInCatalogVersion: "2026-11",
      topics: [
        {
          code: "CONVENCAO_COLETIVA",
          documentType: "ETP",
          anchorSectionCode: "3",
          title: "Convenção ou Acordo Coletivo de Trabalho Aplicável",
          legalBasis: "Art. 135, II, Lei 14.133/21",
        },
      ],
    },
    {
      code: "LOCACAO_DE_BENS",
      title: "Locação de Bens",
      description: "Locar, e não adquirir.",
      confirmed: false,
      confirmedAt: null,
      topics: [
        {
          code: "COMPARATIVO_LOCACAO_AQUISICAO",
          documentType: "TR",
          anchorSectionCode: "5",
          title: "Comparativo",
          legalBasis: "Art. 44, Lei 14.133/21",
        },
      ],
    },
  ],
}

/** Os contextos da contratação (ADR-061 do back-end). */
describe("contextos da contratação", () => {
  it("traduz o catálogo visto do processo, com a confirmação", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/contracting-contexts`, () => HttpResponse.json(contextosApi)),
    )
    const { contextosDoProcesso } = await cliente()

    const resposta = await contextosDoProcesso(PROCESSO)

    expect(resposta.versaoDoCatalogo).toBe("2026-11")
    expect(resposta.contextos[0]).toEqual({
      codigo: "CONDUTOR_DE_VEICULO",
      titulo: "Serviço com Condutor de Veículo",
      descricao: "A contratação inclui o motorista.",
      confirmado: true,
      confirmadoEm: "2026-11-05T12:00:00Z",
      topicos: [
        {
          codigo: "CONVENCAO_COLETIVA",
          documento: "ETP",
          ancora: "3",
          titulo: "Convenção ou Acordo Coletivo de Trabalho Aplicável",
          fundamentoLegal: "Art. 135, II, Lei 14.133/21",
        },
      ],
    })
    // Sem confirmação, sem data: a tela não inventa quando foi.
    expect(resposta.contextos[1]?.confirmadoEm).toBeUndefined()
    expect(resposta.contextos[1]?.topicos[0]?.documento).toBe("TR")
    // Resposta sem naturezas: nenhuma traz tópico.
    expect(resposta.topicosDaNatureza).toEqual({})
  })

  it("traduz o que cada natureza do objeto traz ao documento", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/contracting-contexts`, () =>
        HttpResponse.json({
          ...contextosApi,
          natures: [
            { nature: "GOODS", label: "Bens", topics: [] },
            {
              nature: "SERVICES_WITH_DEDICATED_LABOR",
              label: "Serviços com dedicação exclusiva de mão de obra",
              topics: [
                {
                  code: "GARANTIAS_TRABALHISTAS",
                  documentType: "ETP",
                  anchorSectionCode: "7",
                  title: "Garantias Trabalhistas",
                  legalBasis: "Art. 121, Lei 14.133/21",
                },
              ],
            },
          ],
        }),
      ),
    )
    const { contextosDoProcesso } = await cliente()

    const { topicosDaNatureza } = await contextosDoProcesso(PROCESSO)

    expect(topicosDaNatureza.GOODS).toEqual([])
    expect(topicosDaNatureza.SERVICES_WITH_DEDICATED_LABOR).toEqual([
      {
        codigo: "GARANTIAS_TRABALHISTAS",
        documento: "ETP",
        ancora: "7",
        titulo: "Garantias Trabalhistas",
        fundamentoLegal: "Art. 121, Lei 14.133/21",
      },
    ])
  })

  it("confirmar envia exatamente a lista, e a vazia retira todos", async () => {
    const enviados: unknown[] = []
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/contracting-contexts`, async ({ request }) => {
        enviados.push(await request.json())
        return HttpResponse.json(contextosApi)
      }),
    )
    const { confirmarContextos } = await cliente()

    await confirmarContextos(PROCESSO, ["CONDUTOR_DE_VEICULO", "LOCACAO_DE_BENS"])
    const resposta = await confirmarContextos(PROCESSO, [])

    expect(enviados).toEqual([{ codes: ["CONDUTOR_DE_VEICULO", "LOCACAO_DE_BENS"] }, { codes: [] }])
    expect(resposta.contextos).toHaveLength(2)
  })
})
