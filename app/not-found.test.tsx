import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import NotFound from "./not-found"

describe("Página não encontrada", () => {
  it("oferece o início (a página da GovPro) e o painel do sistema", () => {
    render(<NotFound />)
    expect(screen.getByRole("heading", { name: "Página Não Encontrada" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir para o Início" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Ir para o Painel" })).toHaveAttribute("href", "/painel")
  })
})
