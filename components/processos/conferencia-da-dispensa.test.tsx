import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ConferenciaDaDispensa } from "@/components/processos/conferencia-da-dispensa"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A conferência do valor contra o limite da dispensa (Art. 75, I e II).
 *
 * <p>O que se cobra aqui é o que a tela afirma e o que ela cala. Ela informa e
 * não impede: quem escolhe o fundamento é quem responde pelo processo. E não
 * inventa pendência onde não há — dizer que falta o inciso de um pregão é como
 * se aprende a ignorar alerta.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function comConferencia(dados: Record<string, unknown>) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dispensation-check`, () =>
      HttpResponse.json({
        dispensation: true,
        applicable: true,
        ground: "VALUE_GENERAL",
        legalBasis: "Art. 75, II, Lei 14.133/21",
        limitAmount: 65492.11,
        limitSource: "Decreto nº 12.807/2025",
        estimatedValue: 12500,
        fiscalYear: 2026,
        exceeds: false,
        pendingGround: false,
        pendingLimit: false,
        ...dados,
      }),
    ),
  )
}

describe("conferência da dispensa", () => {
  it("acima do limite, diz o valor, o teto, o inciso e o decreto", async () => {
    comConferencia({ estimatedValue: 70000, exceeds: true })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText(/ultrapassa o limite/)).toBeInTheDocument()
    expect(screen.getByText(/Art. 75, II, Lei 14.133\/21/)).toBeInTheDocument()
    expect(screen.getByText(/Decreto nº 12.807\/2025/)).toBeInTheDocument()
    // Informa e não impede: não há botão travando nada.
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("dentro do limite, confirma sem alarde", async () => {
    comConferencia({})
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText("Valor dentro do limite da dispensa")).toBeInTheDocument()
  })

  it("fora da dispensa, não diz nada", async () => {
    comConferencia({ dispensation: false, applicable: false, ground: null, pendingGround: false })
    const { container } = renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it("dispensa por outro inciso não tem valor a conferir", async () => {
    comConferencia({ applicable: false, ground: "OTHER", limitAmount: null })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    // Emergência e fornecedor exclusivo não têm teto.
    expect(await screen.findByText("Dispensa sem limite de valor")).toBeInTheDocument()
  })

  it("exercício sem limites cadastrados é informado, e não vira palpite", async () => {
    comConferencia({ pendingLimit: true, limitAmount: null, limitSource: null, fiscalYear: 2027 })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText(/ainda não foram cadastrados/)).toBeInTheDocument()
    expect(screen.getByText(/2027/)).toBeInTheDocument()
  })

  it("sem inciso declarado, oferece declará-lo ali mesmo", async () => {
    comConferencia({ applicable: false, ground: null, pendingGround: true })
    let enviado: Record<string, unknown> | null = null
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () =>
        HttpResponse.json({
          id: PROCESSO,
          processNumber: "PROC-2026-000007",
          organizationId: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
          departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
          departmentName: "Secretaria de Educação",
          responsibleUserName: "Maria Costa",
          objectDescription: "Aquisição de papel A4",
          modality: "DIRECT_AWARD_ARTICLE_75",
          estimatedValue: 70000,
          urgency: false,
          documents: ["ETP"],
          status: "DRAFT",
          createdAt: "2026-08-01T12:00:00Z",
          updatedAt: "2026-08-01T12:00:00Z",
          version: 1,
        }),
      ),
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        enviado = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ detail: "erro" }, { status: 500 })
      }),
    )
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText(/ainda não diz com que inciso/)).toBeInTheDocument()
    const declarar = screen.getByRole("button", { name: "Declarar" })
    // Nasce travado com o motivo à vista.
    expect(declarar).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Fundamento da Dispensa" }))
    await userEvent.click(await screen.findByRole("option", { name: /Art. 75, II/ }))
    await userEvent.click(screen.getByRole("button", { name: "Declarar" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect(enviado!.dispensationGround).toBe("VALUE_GENERAL")
  })

  it("quando a consulta falha, a tela não inventa conferência", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dispensation-check`, () =>
        HttpResponse.json({ detail: "erro" }, { status: 500 }),
      ),
    )
    const { container } = renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
