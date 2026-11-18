import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { PainelAlternativasMercado } from "@/components/documentos/painel-alternativas-mercado"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

type AlternativaDaApi = {
  id: string
  name: string
  description: string
  advantages?: string | null
  disadvantages?: string | null
  sourceReference?: string | null
  selected: boolean
}

describe("PainelAlternativasMercado", () => {
  it("explica a lacuna quando ainda não existe pesquisa", async () => {
    servidor.use(http.get(`${urlDaApi}/procurement-processes/:id/market-alternatives`, () => HttpResponse.json([])))
    renderizar(<PainelAlternativasMercado processoId="processo" />)
    expect(await screen.findByText(/Nenhuma alternativa cadastrada/)).toBeInTheDocument()
  })

  it("registra alternativa real e apresenta a solução escolhida", async () => {
    let values: AlternativaDaApi[] = []
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/market-alternatives`, () => HttpResponse.json(values)),
      http.post(`${urlDaApi}/procurement-processes/:id/market-alternatives`, async ({ request }) => {
        const body = (await request.json()) as Omit<AlternativaDaApi, "id">
        values = [{ id: "alt-1", ...body }]
        return HttpResponse.json(values[0], { status: 201 })
      }),
    )
    renderizar(<PainelAlternativasMercado processoId="processo" />)
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Alternativa" }))
    await userEvent.type(screen.getByRole("textbox", { name: /Nome da alternativa/ }), "Compra")
    await userEvent.type(screen.getByRole("textbox", { name: /Descrição da solução/ }), "Aquisição definitiva")
    await userEvent.click(screen.getByText("Solução escolhida pela Administração"))
    await userEvent.click(screen.getByRole("button", { name: "Registrar Alternativa" }))
    await waitFor(() => expect(screen.getByText(/Compra · Solução Escolhida/)).toBeInTheDocument())
  })
})
