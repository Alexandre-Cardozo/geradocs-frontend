import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Demonstracao } from "./demonstracao"

describe("Demonstracao", () => {
  it("é a seção #demonstracao, com o botão de pedir demonstração", () => {
    const { container } = render(<Demonstracao />)
    expect(container.querySelector("section#demonstracao")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Veja o GeraDocs no Seu Órgão" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Solicitar Demonstração" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:contato@govpro\.com\.br\?subject=/),
    )
  })
})
