import { describe, expect, it } from "vitest"

import { anoBrasilia } from "@/lib/format"

import { exerciciosDaDotacao } from "./exercicio-da-dotacao"

describe("exercícios da dotação", () => {
  it("vai do ano anterior aos quatro seguintes", () => {
    expect(exerciciosDaDotacao(undefined, 2026)).toEqual([2025, 2026, 2027, 2028, 2029, 2030])
  })

  it("parte do ano atual de Brasília quando não se diz o ano", () => {
    expect(exerciciosDaDotacao()).toContain(anoBrasilia())
  })

  it("guarda o exercício já gravado fora da faixa, na ordem", () => {
    expect(exerciciosDaDotacao(2022, 2026)).toEqual([2022, 2025, 2026, 2027, 2028, 2029, 2030])
    expect(exerciciosDaDotacao(2027, 2026)).toEqual([2025, 2026, 2027, 2028, 2029, 2030])
  })
})
