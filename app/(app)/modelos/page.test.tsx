import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import ModelosDoOrgao from "@/app/(app)/modelos/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Modelos do Órgão (§88; ADR-056 do back-end): todo servidor consulta; só o
 * coordenador publica sobre a minuta da AGU, com a justificativa do Art. 19,
 * § 2º, cria a versão seguinte e desativa.
 */
const minuta = {
  code: "AGU-EDITAL-PC",
  version: "2025-11",
  documentType: "EDITAL",
  title: "Minuta AGU — Pregão",
  description: "Menor preço.",
  publishedIn: "nov/2025",
  source: "AGU",
  sectionCount: 2,
}

const doOrgao = {
  code: "ORG-0A1B2C3D",
  version: "001",
  documentType: "EDITAL",
  title: "Edital do Município",
  description: "Cota ampliada.",
  publishedIn: "out/2026",
  justification: "Lei Municipal 1.234/2024.",
  baseCode: "AGU-EDITAL-PC",
  baseVersion: "2025-11",
  active: true,
  createdByName: "Maria Costa",
  createdAt: "2026-10-27T12:00:00Z",
  newerBase: { ...minuta, version: "2026-04", publishedIn: "abr/2026" },
}

const secoes = [
  { code: "PC00", number: "", title: "Preâmbulo", legalBasis: "Art. 25", hint: "", required: true, modelText: "Torna-se público.", notes: [] },
  { code: "PC01", number: "1", title: "Do Objeto", legalBasis: "Art. 25", hint: "", required: true, modelText: "O objeto é [objeto].", notes: [] },
]

function comPerfil(perfil: "SERVIDOR" | "COORDENADOR") {
  servidor.use(
    http.get(`${urlDaApi}/me`, () =>
      HttpResponse.json({ ...sessaoServidor, user: { ...sessaoServidor.user, profileAccess: perfil } }),
    ),
  )
}

function comModelos(organization: unknown[]) {
  const pedidos: { metodo: string; corpo?: unknown }[] = []
  servidor.use(
    http.get(`${urlDaApi}/structure-models`, () => HttpResponse.json({ agu: [minuta], organization })),
    http.get(`${urlDaApi}/structure-models/:codigo`, ({ params }) =>
      HttpResponse.json(
        params.codigo === doOrgao.code
          ? { ...doOrgao, source: "Órgão", sections: secoes.map((s) => ({ ...s, code: `O${s.code}` })) }
          : { ...minuta, justification: null, sections: secoes },
      ),
    ),
    http.post(`${urlDaApi}/structure-models`, async ({ request }) => {
      pedidos.push({ metodo: "POST", corpo: await request.json() })
      return HttpResponse.json({ ...minuta, sections: [] }, { status: 201 })
    }),
    http.put(`${urlDaApi}/structure-models/:codigo`, async ({ request }) => {
      pedidos.push({ metodo: "PUT", corpo: await request.json() })
      return HttpResponse.json({ ...minuta, sections: [] })
    }),
    http.delete(`${urlDaApi}/structure-models/:codigo`, () => {
      pedidos.push({ metodo: "DELETE" })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return pedidos
}

describe("modelos do órgão", () => {
  it("o servidor consulta o modelo, a justificativa e o aviso da minuta nova, sem publicar", async () => {
    comPerfil("SERVIDOR")
    comModelos([doOrgao])
    renderizar(<ModelosDoOrgao />)

    expect(await screen.findByRole("heading", { name: "Edital do Município" })).toBeInTheDocument()
    expect(screen.getByText(/sobre Minuta AGU — Pregão \(2025-11\)/)).toBeInTheDocument()
    expect(screen.getByText("Lei Municipal 1.234/2024.")).toBeInTheDocument()
    expect(screen.getByText(/A AGU publicou a versão abr\/2026 desta minuta/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Novo Modelo" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nova Versão" })).not.toBeInTheDocument()
  })

  it("sem modelo, o vazio diz quem publica", async () => {
    comPerfil("SERVIDOR")
    comModelos([])
    renderizar(<ModelosDoOrgao />)

    expect(await screen.findByText(/Quem publica é o coordenador/)).toBeInTheDocument()
  })

  it("o coordenador publica sobre a minuta, com a justificativa obrigatória e só o texto que mudou", async () => {
    comPerfil("COORDENADOR")
    const pedidos = comModelos([])
    renderizar(<ModelosDoOrgao />)

    await userEvent.click(await screen.findByRole("button", { name: "Novo Modelo" }))
    await userEvent.click(screen.getByRole("button", { name: /Minuta da AGU de Base/ }))
    await userEvent.click(await screen.findByRole("option", { name: /Minuta AGU — Pregão/ }))
    const objeto = await screen.findByRole("textbox", { name: /Do Objeto/ })
    expect(objeto).toHaveValue("O objeto é [objeto].")

    await userEvent.type(screen.getByRole("textbox", { name: "Título" }), "Edital do Município")
    await userEvent.click(screen.getByRole("button", { name: "Publicar Modelo" }))
    expect(screen.getByText(/Justifique a não utilização da minuta/)).toBeInTheDocument()
    expect(pedidos).toEqual([])

    await userEvent.type(screen.getByRole("textbox", { name: /Justificativa/ }), "Lei municipal.")
    await userEvent.clear(objeto)
    await userEvent.type(objeto, "O objeto segue a lei municipal.")
    await userEvent.click(screen.getByRole("button", { name: "Publicar Modelo" }))

    await waitFor(() =>
      expect(pedidos).toEqual([
        {
          metodo: "POST",
          corpo: {
            baseCode: "AGU-EDITAL-PC",
            title: "Edital do Município",
            description: "",
            justification: "Lei municipal.",
            sections: [{ code: "PC01", text: "O objeto segue a lei municipal." }],
          },
        },
      ]),
    )
    // Publicado, o formulário fecha.
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Novo Modelo" })).not.toBeInTheDocument())
  })

  it("o coordenador publica a versão seguinte com o texto inteiro, e desativa com confirmação", async () => {
    comPerfil("COORDENADOR")
    const pedidos = comModelos([doOrgao])
    renderizar(<ModelosDoOrgao />)

    await userEvent.click(await screen.findByRole("button", { name: "Nova Versão" }))
    expect(await screen.findByRole("textbox", { name: "Título" })).toHaveValue("Edital do Município")
    await userEvent.click(screen.getByRole("button", { name: "Publicar Nova Versão" }))
    await waitFor(() =>
      expect(pedidos[0]).toEqual({
        metodo: "PUT",
        corpo: expect.objectContaining({
          justification: "Lei Municipal 1.234/2024.",
          sections: [
            { code: "PC00", text: "Torna-se público." },
            { code: "PC01", text: "O objeto é [objeto]." },
          ],
        }),
      }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Desativar" }))
    expect(screen.getByText(/Os documentos que já o usam continuam nele/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }))
    await waitFor(() => expect(pedidos).toContainEqual({ metodo: "DELETE" }))
  })
})
