import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ConferenciaDaDispensa } from "@/components/processos/conferencia-da-dispensa"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, waitFor } from "@/lib/teste/renderizar"
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
        doubledLimit: false,
        limitSource: "Decreto nº 12.807/2025",
        estimatedValue: 12500,
        yearTotal: 12500,
        yearTotalExceeds: false,
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

  it("dispensa por outro inciso não tem valor a conferir, e não diz nada", async () => {
    comConferencia({ applicable: false, ground: "OTHER", limitAmount: null })
    const { container } = renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    // Emergência e fornecedor exclusivo não têm teto: o campo Fundamento da
    // Dispensa da capa já diz "sem limite de valor".
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it("exercício sem limites cadastrados é informado, e não vira palpite", async () => {
    comConferencia({ pendingLimit: true, limitAmount: null, limitSource: null, fiscalYear: 2027 })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText(/não cadastrados/)).toBeInTheDocument()
    expect(screen.getByText(/2027/)).toBeInTheDocument()
  })

  it("sem inciso declarado, aponta para Editar Dados, sem botão próprio", async () => {
    comConferencia({ applicable: false, ground: null, pendingGround: true })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    expect(await screen.findByText(/Declare o inciso do Art. 75/)).toHaveTextContent("Editar Dados")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
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

  it("entidade com limite em dobro diz que ele está em dobro", async () => {
    comConferencia({ doubledLimit: true, limitAmount: 130984.22 })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    // Aplicar o limite simples a um consórcio apontaria como irregular uma
    // contratação que a lei permite — e não dizer que dobrou faria o número
    // parecer errado.
    expect(await screen.findByText(/em dobro \(Art. 75, § 2º\)/)).toBeInTheDocument()
  })

  it("aponta o fracionamento mesmo com o processo dentro do limite", async () => {
    comConferencia({ estimatedValue: 20000, yearTotal: 200000, yearTotalExceeds: true })
    renderizar(<ConferenciaDaDispensa processoId={PROCESSO} />)

    // Dez dispensas de vinte mil: nenhuma estoura sozinha, e quem olha um
    // processo por vez não vê.
    expect(await screen.findByText(/já dispensou/)).toBeInTheDocument()
    expect(screen.getByText(/Art. 75, § 1º/)).toBeInTheDocument()
  })
})
