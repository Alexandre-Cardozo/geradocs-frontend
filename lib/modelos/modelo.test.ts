import { describe, expect, it } from "vitest"

import { errosDoModelo, textosAlterados } from "@/lib/modelos/modelo"

describe("modelo do órgão (§88)", () => {
  it("título e justificativa são obrigatórios", () => {
    expect(errosDoModelo({ titulo: " ", descricao: "", justificativa: "", textos: {} })).toEqual({
      titulo: "Dê um título ao modelo.",
      justificativa: "Justifique a não utilização da minuta da AGU (Art. 19, § 2º, Lei 14.133/21).",
    })
    expect(errosDoModelo({ titulo: "Edital", descricao: "", justificativa: "Lei municipal.", textos: {} })).toEqual({})
  })

  it("só vai no pedido o texto que o órgão mudou", () => {
    const secoes = [
      { codigo: "PC00", texto: "Preâmbulo." },
      { codigo: "PC01", texto: "Objeto." },
      { codigo: "PC02", texto: "Participação." },
    ]
    expect(textosAlterados(secoes, { PC00: "Preâmbulo.", PC01: "Objeto do município." })).toEqual({
      PC01: "Objeto do município.",
    })
  })
})
