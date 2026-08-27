import { describe, expect, it } from "vitest"

import {
  ehUnidadeCanonica,
  rotuloDaUnidade,
  siglaDaUnidade,
  TODAS_AS_UNIDADES,
  UNIDADES,
  unidadeComparavel,
} from "@/lib/dominio/unidades"

/**
 * As unidades de medida.
 *
 * <p>Existem para que a unidade do item do DFD e a do painel de quantidades do
 * ETP sejam a mesma coisa. Enquanto eram duas listas, "UN" e "Unidade" viravam
 * divergência entre secretarias que pediram exatamente o mesmo item.
 */
describe("unidades de medida", () => {
  it("a sigla cabe na coluna do servidor", () => {
    // O banco aceita 20 caracteres na unidade do item; sigla maior seria
    // recusada na borda, com o cadastro já preenchido.
    for (const unidade of TODAS_AS_UNIDADES) {
      expect(unidade.sigla.length, unidade.nome).toBeLessThanOrEqual(20)
      expect(unidade.sigla.trim()).not.toBe("")
    }
  })

  it("nenhum grupo está vazio, e nenhum nome se repete", () => {
    const nomes = TODAS_AS_UNIDADES.map((u) => u.nome)
    expect(new Set(nomes).size).toBe(nomes.length)
    for (const grupo of UNIDADES) {
      expect(grupo.unidades.length, grupo.grupo).toBeGreaterThan(0)
    }
  })

  it("caixa, acento e pontuação não separam a mesma unidade", () => {
    // É a regra do servidor (`DemandItem.normalizedUnit`): sem ela, duas
    // secretarias que pediram "un" e "UN" apareciam divergindo.
    expect(unidadeComparavel("un")).toBe(unidadeComparavel("UN"))
    expect(unidadeComparavel("Mês")).toBe(unidadeComparavel("MES"))
    expect(unidadeComparavel(" m² ")).toBe(unidadeComparavel("M²"))
    expect(unidadeComparavel("PÇ")).toBe(unidadeComparavel("pc"))
  })

  it("reconhece a unidade pela sigla e pelo nome por extenso", () => {
    // O cadastro antigo gravou "Unidade" e "Caixa" por extenso: reconhecê-los
    // evita a mesma unidade aparecer duas vezes ao editar um item antigo.
    expect(siglaDaUnidade("UN")).toBe("UN")
    expect(siglaDaUnidade("Unidade")).toBe("UN")
    expect(siglaDaUnidade("caixa")).toBe("CX")
    expect(siglaDaUnidade("Bloco")).toBeNull()
  })

  it("unidade fora da lista continua aparecendo como foi gravada", () => {
    // Trocá-la por "não reconhecida" apagaria o que a secretaria pediu.
    expect(rotuloDaUnidade("Bloco")).toBe("Bloco")
    expect(ehUnidadeCanonica("Bloco")).toBe(false)
    expect(rotuloDaUnidade("RESMA")).toBe("Resma (RESMA)")
    expect(ehUnidadeCanonica("resma")).toBe(true)
  })
})
