import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { AproveitamentoDaIa } from "@/components/admin/aproveitamento-da-ia"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O aproveitamento da IA na tela das entidades (ADR-071).
 *
 * <p>É o número de quem paga a IA. O estado "ainda sem decisão" não pode ser 0%:
 * diria que a IA não serviu quando ela só não foi avaliada.
 */
const ENTIDADE = "615aa89a-215e-4591-add9-0264c0b4639e"

function comResumo(corpo: Record<string, unknown>) {
  servidor.use(
    http.get(`${urlDaApi}/organizations/${ENTIDADE}/ai-proposals/summary`, () => HttpResponse.json(corpo)),
  )
}

const base = { month: "2026-11", pending: 0, acceptedAsIs: 0, acceptedEdited: 0, rejected: 0, superseded: 0, decided: 0 }

describe("aproveitamento da IA da entidade", () => {
  it("sem proposta decidida, diz isso em vez de mostrar 0%", async () => {
    comResumo(base)
    renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)

    expect(await screen.findByText("Sem decisões")).toBeInTheDocument()
    expect(screen.getByText("Nenhum rascunho decidido neste mês.")).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("sem decisão mas com rascunhos esperando, conta quantos esperam", async () => {
    comResumo({ ...base, pending: 1 })
    const { unmount } = renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)
    expect(await screen.findByText("1 rascunho espera o servidor")).toBeInTheDocument()
    unmount()

    comResumo({ ...base, pending: 3 })
    renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)
    expect(await screen.findByText("3 rascunhos esperam o servidor")).toBeInTheDocument()
  })

  it("com decisões, mostra a taxa e quantas foram aceitas, com as editadas à parte", async () => {
    comResumo({
      ...base, acceptedAsIs: 1, acceptedEdited: 1, rejected: 1, superseded: 1, decided: 4, acceptanceRate: 0.5,
    })
    renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)

    expect(await screen.findByText("50% aceitos")).toBeInTheDocument()
    expect(screen.getByText("2 de 4 decididos · 1 com edição")).toBeInTheDocument()
  })

  it("sem aceita editada, não fala em edição", async () => {
    comResumo({ ...base, acceptedAsIs: 2, rejected: 1, decided: 3, acceptanceRate: 0.6667 })
    renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)

    expect(await screen.findByText("67% aceitos")).toBeInTheDocument()
    expect(screen.getByText("2 de 3 decididos")).toBeInTheDocument()
  })

  it("quando o servidor não responde, diz que está indisponível", async () => {
    servidor.use(
      http.get(`${urlDaApi}/organizations/${ENTIDADE}/ai-proposals/summary`, () =>
        HttpResponse.json({ title: "Erro", status: 500 }, { status: 500 }),
      ),
    )
    renderizar(<AproveitamentoDaIa entidadeId={ENTIDADE} />)

    expect(await screen.findByText("Indisponível")).toBeInTheDocument()
  })
})
