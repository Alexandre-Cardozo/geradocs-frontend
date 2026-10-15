import { describe, expect, it } from "vitest"

import { ResumoDaEstimativa } from "@/components/processos/resumo-da-estimativa"
import { EstimativaDoProcesso } from "@/components/documentos/estimativa-do-processo"
import { comEstimativaQueGrava } from "@/lib/teste/estimativa"
import { processoApi } from "@/lib/teste/fixtures-api"
import { renderizar, screen } from "@/lib/teste/renderizar"
import type { Processo } from "@/lib/types"

const base = {
  id: processoApi.id,
  status: "em_elaboracao",
  documentos: ["ETP", "TR"],
} as unknown as Processo

/**
 * A capa mostra a estimativa do processo e leva até onde ela se troca — a
 * seção de valor de um documento, onde o efeito no total aparece na hora.
 */
describe("estimativa de valor na capa", () => {
  it("resume a forma e a fonte, com o fundamento, e leva à seção de valor do ETP", () => {
    renderizar(
      <ResumoDaEstimativa
        processo={{
          ...base,
          estimativa: { metodo: "mediana", fonte: "Painel de Preços do Governo Federal (Compras.gov.br)" },
        }}
      />,
    )

    expect(screen.getByText(/Mediana · Painel de Preços/)).toBeInTheDocument()
    expect(screen.getByText(/Art. 23, § 1º, I, Lei 14.133\/21/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alterar no ETP" })).toHaveAttribute(
      "href",
      expect.stringContaining("tipo=etp&painel=valor"),
    )
  })

  it("sem estimativa, convida a declarar; só com Cotação, leva à metodologia", () => {
    renderizar(<ResumoDaEstimativa processo={{ ...base, documentos: ["Cotação"] }} />)

    expect(screen.getByText(/ainda não declaradas/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Declarar na Cotação" })).toHaveAttribute(
      "href",
      expect.stringContaining("painel=referencia"),
    )
  })

  it("processo encerrado não oferece a troca, e sem documento que estime não aparece", () => {
    const { container } = renderizar(<ResumoDaEstimativa processo={{ ...base, documentos: ["Edital"] }} />)
    expect(container).toBeEmptyDOMElement()

    renderizar(
      <ResumoDaEstimativa
        processo={{ ...base, status: "concluido", estimativa: { fonte: "Consórcio" } }}
      />,
    )
    expect(screen.getByText(/Consórcio/)).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("no processo encerrado, a seção mostra a estimativa sem deixar trocá-la", async () => {
    comEstimativaQueGrava(
      { priceEstimationMethod: "LOWEST" },
      { status: "CLOSED", closedAt: "2026-10-01T10:00:00-03:00", stage: "CLOSED" },
    )
    renderizar(<EstimativaDoProcesso processoId={processoApi.id} />)

    expect(await screen.findByText(/Menor\. O processo está encerrado/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Forma de Cálculo" })).not.toBeInTheDocument()
  })
})
