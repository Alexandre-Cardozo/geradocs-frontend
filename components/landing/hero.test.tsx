import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Hero } from "./hero"

// No vitest o import de .png vira só uma string; o next/image exige width/height.
vi.mock("@/public/landing/editor-etp.png", () => ({
  default: { src: "/editor-etp.png", width: 1440, height: 900 },
}))

describe("Hero", () => {
  it("traz o slogan, o título e o apoio", () => {
    render(<Hero />)
    expect(screen.getByText("Contratações públicas inteligentes")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2, name: "Documentos da Contratação Pública, Conforme a Lei 14.133/21" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/O GeraDocs, solução da GovPro/)).toBeInTheDocument()
  })

  it("tem um CTA primário de demonstração e um secundário para entrar", () => {
    render(<Hero />)
    expect(screen.getByRole("link", { name: "Solicitar Demonstração" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:contato@govpro\.com\.br\?subject=/),
    )
    expect(screen.getByRole("link", { name: "Acessar o GeraDocs" })).toHaveAttribute("href", "/login")
  })

  it("mostra a captura do editor com texto alternativo", () => {
    render(<Hero />)
    expect(screen.getByRole("img", { name: /Editor de seção do Estudo Técnico Preliminar/ })).toBeInTheDocument()
  })
})
