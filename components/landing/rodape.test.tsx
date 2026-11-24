import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Rodape } from "./rodape"

describe("Rodape", () => {
  it("traz a marca, a assinatura, o contato, o endereço e o copyright da GovPro", () => {
    render(<Rodape />)
    expect(screen.getByRole("img", { name: "GovPro" })).toBeInTheDocument()
    expect(screen.getByText("Inteligência para a gestão pública")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "contato@govpro.com.br" })).toHaveAttribute("href", "mailto:contato@govpro.com.br")
    expect(screen.getByText(/Av\. Antônio Perutti/)).toBeInTheDocument()
    expect(screen.getByText("© 2026 GovPro. Todos os direitos reservados.")).toBeInTheDocument()
  })

  it("lista as soluções a partir do portfólio", () => {
    render(<Rodape />)
    const solucoes = screen.getByRole("navigation", { name: "Soluções" })
    expect(solucoes.querySelector('a[href="#geradocs"]')).toHaveTextContent("GeraDocs")
  })
})
