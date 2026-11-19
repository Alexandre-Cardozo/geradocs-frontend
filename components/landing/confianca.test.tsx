import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Confianca } from "./confianca"

describe("Confianca", () => {
  it("é a seção #confianca, com cinco itens", () => {
    const { container } = render(<Confianca />)
    expect(container.querySelector("section#confianca")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Feito para o Controle da Contratação" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })

  it("cita o fundamento legal literalmente e diz onde ficam protocolo e assinatura", () => {
    render(<Confianca />)
    expect(screen.getByText(/Art\. 75, II, Lei 14\.133\/21/)).toBeInTheDocument()
    expect(screen.getByText(/continuam no sistema de processos da sua entidade/)).toBeInTheDocument()
  })

  it("os ícones são decorativos", () => {
    const { container } = render(<Confianca />)
    expect(container.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThanOrEqual(5)
  })
})
