import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { IaSemTravar } from "./ia-sem-travar"

// No vitest um import de .png vira string; o next/image exige width/height.
vi.mock("@/public/landing/proposta-ia.png", () => ({
  default: { src: "/proposta-ia.png", width: 1440, height: 900 },
}))

describe("IaSemTravar", () => {
  it("é a seção #ia, com o título e os quatro pontos", () => {
    const { container } = render(<IaSemTravar />)
    expect(container.querySelector("section#ia")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "A IA Propõe. O Servidor Decide." })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByRole("heading", { level: 3, name: "Orienta, Não Trava" })).toBeInTheDocument()
  })

  it("mostra a captura da proposta com texto alternativo", () => {
    render(<IaSemTravar />)
    expect(screen.getByRole("img", { name: /Proposta de texto gerada pela IA/ })).toBeInTheDocument()
  })
})
