import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { QuemSomos } from "./quem-somos"

describe("QuemSomos", () => {
  it("é a seção #quem-somos e mostra a lacuna de conteúdo de forma visível", () => {
    const { container } = render(<QuemSomos />)
    expect(container.querySelector("section#quem-somos")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Quem Somos" })).toBeInTheDocument()
    const nota = screen.getByRole("note")
    expect(nota).toHaveTextContent("[LACUNA: descrição da GovPro e serviços além do GeraDocs]")
  })
})
