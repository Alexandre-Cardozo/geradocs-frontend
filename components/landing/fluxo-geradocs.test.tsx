import { describe, expect, it } from "vitest"

import { render, screen, within } from "@/lib/teste/renderizar"

import { FluxoGeradocs } from "./fluxo-geradocs"

describe("FluxoGeradocs", () => {
  it("é a seção #geradocs, com os seis documentos numerados na ordem do fluxo", () => {
    const { container } = render(<FluxoGeradocs />)
    expect(container.querySelector("section#geradocs")).not.toBeNull()
    const lista = screen.getByRole("list", { name: "Documentos gerados, na ordem do fluxo" })
    const itens = within(lista).getAllByRole("listitem")
    expect(itens).toHaveLength(6)
    expect(itens[0]).toHaveTextContent("01")
    expect(itens[0]).toHaveTextContent("Cotação de Mercado")
    expect(itens[0]).toHaveTextContent("Art. 23, Lei 14.133/21")
    expect(itens[5]).toHaveTextContent("06")
    expect(itens[5]).toHaveTextContent("Minuta de Contrato")
  })

  it("diz que DFD e PCA não são gerados e que a contratação direta troca o Edital", () => {
    render(<FluxoGeradocs />)
    expect(screen.getByText("DFD")).toBeInTheDocument()
    expect(screen.getByText("PCA")).toBeInTheDocument()
    expect(screen.getByText(/nenhum dos dois é gerado/)).toBeInTheDocument()
    expect(screen.getByText(/Aviso de Contratação Direta/)).toBeInTheDocument()
    expect(screen.getByText(/DOCX e PDF, com o timbre da entidade/)).toBeInTheDocument()
  })
})
