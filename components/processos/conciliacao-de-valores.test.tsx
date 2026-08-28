import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ConciliacaoDeValores } from "@/components/processos/conciliacao-de-valores"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Os três valores do processo.
 *
 * <p>Eles têm estatutos jurídicos diferentes — estimativa preliminar do DFD
 * (Decreto 10.947/2022, Art. 8º, IV), valor declarado na abertura e valor
 * apurado na pesquisa (Art. 23) —, e a plataforma os tratava como três números
 * soltos que nunca conversavam.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function comDemanda(itens: unknown[], coletas: unknown[] = []) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
      HttpResponse.json([
        {
          id: "d-1",
          fileName: "DFD 003/2026",
          departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
          departmentName: "Secretaria de Educação",
          submittedAt: "2026-03-10T12:00:00Z",
          items: itens,
          file: null,
        },
      ]),
    ),
    http.get(`${urlDaApi}/procurement-processes/:id/price-quotes`, () =>
      HttpResponse.json(coletas),
    ),
  )
}

const item = { description: "Papel A4", unit: "RESMA", quantity: 100, specification: null, unitPrice: 25 }

const coleta = (preco: number) => ({
  id: `c-${preco}`,
  item: "Papel A4",
  source: "Painel de Preços",
  unitPrice: preco,
  collectedAt: "2026-08-20T14:30:00Z",
  registeredAt: "2026-08-28T12:00:00Z",
})

describe("conciliação de valores", () => {
  it("mostra os três valores com o fundamento de cada um", async () => {
    comDemanda([item])
    renderizar(<ConciliacaoDeValores processoId={PROCESSO} valorDeclarado={2500} />)

    expect(await screen.findByText("Declarado na abertura")).toBeInTheDocument()
    expect(screen.getByText("Decreto 10.947/2022, Art. 8º, IV")).toBeInTheDocument()
    expect(screen.getByText("Nenhum item pesquisado")).toBeInTheDocument()
    // 100 resmas × R$ 25,00 preliminares = R$ 2.500,00, igual ao declarado.
    expect(screen.queryByText(/difere em/)).not.toBeInTheDocument()
  })

  it("aponta a divergência e oferece adotar o valor que a demanda sustenta", async () => {
    comDemanda([item])
    let enviado: Record<string, unknown> | null = null
    servidor.use(
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        enviado = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ detail: "ok" }, { status: 500 })
      }),
    )
    renderizar(<ConciliacaoDeValores processoId={PROCESSO} valorDeclarado={1000} />)

    expect(await screen.findByText(/difere em R\$\s*1\.500,00/)).toBeInTheDocument()
    // Adotar é ato de quem responde pelo processo: a plataforma não troca o
    // valor sozinha.
    await userEvent.click(screen.getByRole("button", { name: /Adotar R\$\s*2\.500,00/ }))
    await waitFor(() => expect(enviado).not.toBeNull())
  })

  it("com a pesquisa cobrindo todos os itens, o valor sugerido é o apurado", async () => {
    comDemanda([item], [coleta(20), coleta(30), coleta(40)])
    renderizar(<ConciliacaoDeValores processoId={PROCESSO} valorDeclarado={2500} />)

    // Média de 20, 30 e 40 = 30; × 100 resmas = 3.000,00 — e é ele que passa a
    // valer, porque o valor da contratação é o do Art. 23.
    expect(await screen.findByText("1 de 1 item · Art. 23")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Adotar R\$\s*3\.000,00/ })).toBeInTheDocument()
  })

  it("sem item na demanda, não há o que conciliar", async () => {
    comDemanda([])
    const { container } = renderizar(
      <ConciliacaoDeValores processoId={PROCESSO} valorDeclarado={2500} />,
    )

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
