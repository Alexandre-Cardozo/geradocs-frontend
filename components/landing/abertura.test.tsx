import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Abertura } from "./abertura"

describe("Abertura", () => {
  it("o slogan é o h1, com as duas linhas separadas por espaço", () => {
    render(<Abertura />)
    expect(screen.getByRole("heading", { level: 1, name: "Inteligência para Gestão Pública" })).toBeInTheDocument()
    expect(screen.getByText("Tecnologia a serviço da Administração Pública.")).toBeInTheDocument()
  })

  it("só a camada da sede descreve a cena; as outras são decorativas", () => {
    const { container } = render(<Abertura />)
    expect(screen.getByRole("img", { name: /Sede da GovPro: fachada branca em arco/ })).toBeInTheDocument()
    const imagens = Array.from(container.querySelectorAll("img"))
    expect(imagens).toHaveLength(5)
    expect(imagens.filter((img) => img.getAttribute("alt") === "")).toHaveLength(4)
  })

  it("cada camada tem o enquadramento alto para tela em pé", () => {
    const { container } = render(<Abertura />)
    const fontes = container.querySelectorAll('picture > source[media="(max-aspect-ratio: 4/5)"]')
    expect(fontes).toHaveLength(5)
  })

  it("traz o manifesto", () => {
    render(<Abertura />)
    expect(screen.getByText(/A GovPro nasceu para estar ao lado dessas pessoas/)).toBeInTheDocument()
  })

  it("a seta de rolar é decorativa e não tem texto", () => {
    const { container } = render(<Abertura />)
    const seta = container.querySelector("[data-seta]")
    expect(seta).toHaveAttribute("aria-hidden", "true")
    expect(seta?.textContent).toBe("")
  })

  it("ao montar, ativa o palco e põe a cena no ponto inicial da rolagem", async () => {
    const { container } = render(<Abertura />)
    const secao = container.querySelector("section") as HTMLElement
    expect(secao).toHaveAttribute("data-movimento", "ativo")
    // O primeiro quadro é pedido ao requestAnimationFrame.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    const frente = container.querySelector('[data-camada="frente"]') as HTMLElement
    expect(frente.style.transform).toBe("translate3d(0, 0%, 0) scale(1)")
    expect((container.querySelector("[data-veu]") as HTMLElement).style.opacity).toBe("0")
  })
})
