import { describe, expect, it } from "vitest"

import { FONTES_PADRAO, fontesDaIa } from "@/lib/documentos/fontes-da-ia"

/**
 * O que o cartão "Gerar com IA" diz que leu. Só o ETP tem fonte própria, e só
 * em três seções: dizer "PCA" em qualquer outra prometeria uma conferência que
 * o servidor não faz.
 */
describe("fontes da IA por seção", () => {
  it("o PCA só entra na seção 2 do ETP", () => {
    expect(fontesDaIa("ETP", "2")).toBe("no DFD, no PCA e no processo")
  })

  it("as alternativas de mercado entram na seção 5, e a pesquisa de preços na 6", () => {
    expect(fontesDaIa("ETP", "5")).toBe("no DFD, nas alternativas de mercado e no processo")
    expect(fontesDaIa("ETP", "6")).toBe("no DFD, na pesquisa de preços e no processo")
  })

  it("nas demais seções do ETP, e em qualquer seção de outro documento, só o DFD e o processo", () => {
    expect(fontesDaIa("ETP", "1")).toBe(FONTES_PADRAO)
    expect(fontesDaIa("ETP", "4")).toBe(FONTES_PADRAO)
    expect(fontesDaIa("TR", "2")).toBe(FONTES_PADRAO)
    expect(fontesDaIa("TR", "6")).toBe(FONTES_PADRAO)
  })

  it("sem documento identificado, vale o padrão", () => {
    expect(fontesDaIa(undefined, "2")).toBe(FONTES_PADRAO)
  })
})
