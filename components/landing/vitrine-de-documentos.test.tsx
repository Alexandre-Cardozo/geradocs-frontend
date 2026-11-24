import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Folha, FolhaExtra } from "./folha"
import { VitrineDeDocumentos } from "./vitrine-de-documentos"
import { DOCUMENTOS_DA_VITRINE, EXTRAS_DA_VITRINE } from "@/lib/landing/documentos"

describe("VitrineDeDocumentos", () => {
  it("mostra os sete tipos, a juntada e a errata, cada um com título, fundamento e o que entrega", () => {
    const { container } = render(<VitrineDeDocumentos />)
    const figuras = container.querySelectorAll("figure")
    expect(figuras).toHaveLength(9)
    expect(figuras[7]).toHaveTextContent("Juntada dos Autos")
    expect(figuras[8]).toHaveTextContent("Errata")
    expect(container).not.toHaveTextContent("Também gerados")
    expect(figuras[2]).toHaveTextContent("DOCX + PDF")
    expect(figuras[0]).toHaveTextContent("Cotação de Mercado")
    expect(figuras[0]).toHaveTextContent("Art. 23, Lei 14.133/21")
    expect(screen.getByText("Aviso de Contratação Direta", { selector: "figcaption span" })).toBeInTheDocument()
  })

  it("a faixa pode ser rolada pelo teclado", () => {
    render(<VitrineDeDocumentos />)
    expect(screen.getByRole("region", { name: "Documentos gerados pelo GeraDocs" })).toHaveAttribute("tabindex", "0")
  })
})

describe("FolhaExtra", () => {
  it.each(EXTRAS_DA_VITRINE.map((e) => [e.titulo, e] as const))("desenha %s, decorativa", (_, extra) => {
    const { container } = render(<FolhaExtra extra={extra} />)
    const folha = container.firstElementChild
    expect(folha).toHaveAttribute("aria-hidden", "true")
    // Uma página só, no padrão das outras: timbre, título e carimbo.
    expect(folha).toHaveTextContent("Timbre da entidade")
    expect(folha).toHaveTextContent(extra.titulo)
    expect(folha).toHaveTextContent("Código de verificação")
  })
})

describe("Folha", () => {
  it.each(DOCUMENTOS_DA_VITRINE.map((d) => [d.titulo, d] as const))("desenha a folha de %s, decorativa", (_, documento) => {
    const { container } = render(<Folha documento={documento} />)
    const folha = container.firstElementChild
    expect(folha).toHaveAttribute("aria-hidden", "true")
    expect(folha).toHaveTextContent(documento.titulo)
    expect(folha).toHaveTextContent("Elaborado com GeraDocs")
    expect(folha).toHaveTextContent("Timbre da entidade")
  })
})
