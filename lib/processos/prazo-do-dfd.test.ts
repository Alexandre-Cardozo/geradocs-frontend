import { describe, expect, it } from "vitest"

import {
  ATALHOS_DE_PRAZO,
  diasAte,
  erroDaDataPrevista,
  situacaoDoPrazo,
  somarDias,
} from "@/lib/processos/prazo-do-dfd"

describe("data prevista de conclusão do DFD", () => {
  it("soma dias no calendário, atravessando mês e ano", () => {
    expect(somarDias("2026-10-14", 30)).toBe("2026-11-13")
    expect(somarDias("2026-12-15", 30)).toBe("2027-01-14")
    expect(ATALHOS_DE_PRAZO).toEqual([30, 60, 90])
  })

  it("conta os dias até a data, negativo quando já passou", () => {
    expect(diasAte("2026-10-24", "2026-10-14")).toBe(10)
    expect(diasAte("2026-10-11", "2026-10-14")).toBe(-3)
  })

  it("diz quanto falta, e destaca o que está perto ou vencido", () => {
    expect(situacaoDoPrazo("2026-12-15", "2026-10-14")).toEqual({ rotulo: "Em 62 dias", tom: "neutral" })
    expect(situacaoDoPrazo("2026-10-15", "2026-10-14")).toEqual({ rotulo: "Em 1 dia", tom: "warning" })
    expect(situacaoDoPrazo("2026-10-14", "2026-10-14")).toEqual({ rotulo: "Vence hoje", tom: "warning" })
    expect(situacaoDoPrazo("2026-10-13", "2026-10-14")).toEqual({ rotulo: "Venceu há 1 dia", tom: "danger" })
    expect(situacaoDoPrazo("2026-10-01", "2026-10-14")).toEqual({ rotulo: "Venceu há 13 dias", tom: "danger" })
  })

  it("aceita vazio, recusa data inválida e ano digitado errado", () => {
    expect(erroDaDataPrevista("")).toBeUndefined()
    expect(erroDaDataPrevista("2026-12-15")).toBeUndefined()
    expect(erroDaDataPrevista("2026-13-40")).toBe("Informe uma data válida.")
    expect(erroDaDataPrevista("15/12/2026")).toBe("Informe uma data válida.")
    expect(erroDaDataPrevista("0202-12-15")).toMatch(/Confira o ano/)
    expect(erroDaDataPrevista("2206-12-15")).toMatch(/Confira o ano/)
  })
})
