import { describe, expect, it } from "vitest"

import { PreviaDoDocumento } from "@/components/documentos/previa-do-documento"
import { TextoComTabelas } from "@/components/documentos/texto-com-tabelas"
import { renderizar, screen, within } from "@/lib/teste/renderizar"

/** A tabela do texto aparece como tabela na tela, no desenho do PDF (§100). */
describe("texto com tabelas", () => {
  it("a linha da minuta com barras vira tabela, com cabeçalho, número à direita e total em negrito", () => {
    renderizar(
      <TextoComTabelas
        texto={
          "As quantidades:\nItem | Secretaria | Quantidade\nPapel A4 | Educação | 120\nTotal |  | 120\n\nFim da memória."
        }
      />,
    )

    const tabela = screen.getByRole("table")
    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Item", "Secretaria", "Quantidade"])
    expect(within(tabela).getByText("Educação")).toBeInTheDocument()
    expect(within(tabela).getAllByText("120")[0]).toHaveClass("text-right")
    expect(within(tabela).getByText("Total").closest("tr")).toHaveClass("font-semibold")
    // Nenhuma barra sobra no texto.
    expect(screen.queryByText(/\|/)).not.toBeInTheDocument()
    expect(screen.getByText("As quantidades:")).toBeInTheDocument()
    expect(screen.getByText("Fim da memória.")).toBeInTheDocument()
  })

  it("texto sem tabela continua um parágrafo só, com as quebras", () => {
    renderizar(<TextoComTabelas texto={"Primeira linha.\nSegunda linha."} />)

    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    const paragrafo = screen.getByText(/Primeira linha\./)
    expect(paragrafo.tagName).toBe("P")
    expect(paragrafo.textContent).toBe("Primeira linha.\nSegunda linha.")
  })

  it("a prévia do documento desenha a tabela da seção", () => {
    renderizar(
      <PreviaDoDocumento
        blocos={[
          {
            id: "1",
            titulo: "Estimativa das quantidades",
            texto: "Item | Unidade | Total\nPapel A4 | resma | 150",
            dispensada: false,
          },
        ]}
      />,
    )

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Unidade" })).toBeInTheDocument()
  })
})
