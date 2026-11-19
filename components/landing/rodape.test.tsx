import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Rodape } from "./rodape"

describe("Rodape", () => {
  it("traz o endosso, o contato e o copyright da GovPro", () => {
    render(<Rodape />)
    expect(screen.getByText("GeraDocs é uma solução")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "GovPro" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "contato@govpro.com.br" })).toHaveAttribute(
      "href",
      "mailto:contato@govpro.com.br",
    )
    expect(screen.getByText("© 2026 GovPro. Todos os direitos reservados.")).toBeInTheDocument()
  })
})
