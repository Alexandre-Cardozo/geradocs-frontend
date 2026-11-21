import { describe, expect, it } from "vitest"

import { PRIMEIRO_ANO_DO_PCA, ULTIMO_ANO_DO_PCA, anosDoPca } from "@/lib/dominio/anos-do-pca"

/** Os exercícios da importação do PCA (§116). */
describe("anos do PCA", () => {
  it("vão de 2025 a 2050, em ordem crescente e sem lacuna", () => {
    const anos = anosDoPca().map((opcao) => Number(opcao.value))
    expect(PRIMEIRO_ANO_DO_PCA).toBe(2025)
    expect(ULTIMO_ANO_DO_PCA).toBe(2050)
    expect(anos).toHaveLength(26)
    expect(anos[0]).toBe(2025)
    expect(anos.at(-1)).toBe(2050)
    anos.forEach((ano, i) => expect(ano).toBe(2025 + i))
  })

  it("inclui o ano seguinte ao de hoje, como 2027", () => {
    expect(anosDoPca()).toContainEqual({ value: "2027", label: "2027" })
  })

  it("o rótulo é o próprio ano", () => {
    for (const opcao of anosDoPca()) expect(opcao.label).toBe(opcao.value)
  })
})
