import { describe, expect, it } from "vitest"

import { render, screen, userEvent, within } from "@/lib/teste/renderizar"

import { Modalidades } from "./modalidades"

describe("Modalidades", () => {
  it("começa no pregão, com ETP, TR e Edital obrigatórios", () => {
    render(<Modalidades />)
    expect(screen.getByRole("button", { name: /^Pregão Eletrônico, Concorrência e Diálogo/ })).toHaveAttribute("aria-pressed", "true")
    const lista = screen.getByRole("list", { name: /Documentos do processo: Pregão Eletrônico/ })
    expect(within(lista).getByText("Estudo Técnico Preliminar").parentElement).toHaveTextContent("Obrigatório")
    expect(within(lista).getByText("Aviso de Contratação Direta").parentElement).toHaveTextContent("Não se aplica")
  })

  it("na dispensa com disputa, o Aviso passa a ser obrigatório e o Edital sai", async () => {
    const usuario = userEvent.setup()
    render(<Modalidades />)
    await usuario.click(screen.getByRole("button", { name: "Dispensa com Disputa" }))
    expect(screen.getByRole("button", { name: "Dispensa com Disputa" })).toHaveAttribute("aria-pressed", "true")
    const lista = screen.getByRole("list", { name: /Dispensa com Disputa/ })
    expect(within(lista).getByText("Aviso de Contratação Direta").parentElement).toHaveTextContent("Obrigatório")
    expect(within(lista).getByText("Edital de Licitação").parentElement).toHaveTextContent("Não se aplica")
  })
})
