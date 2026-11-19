import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Problema } from "./problema"

describe("Problema", () => {
  it("é a seção #problema, com título e três pontos", () => {
    const { container } = render(<Problema />)
    expect(container.querySelector("section#problema")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Do Word e dos Modelos Soltos para um Fluxo Guiado" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByRole("heading", { level: 3, name: "A Ordem Real da Contratação" })).toBeInTheDocument()
  })
})
