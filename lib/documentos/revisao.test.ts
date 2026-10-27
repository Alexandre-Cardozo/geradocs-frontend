import { describe, expect, it } from "vitest"

import { compararRevisao, LIMITE_DE_PALAVRAS, revisaoMudouOTexto } from "@/lib/documentos/revisao"

describe("revisão sugerida pela IA (§87)", () => {
  it("marca por palavra o que sai e o que entra, e junta os vizinhos", () => {
    expect(compararRevisao("O objeto é a compra de papel.", "O objeto é a aquisição de papel A4.")).toEqual([
      { tipo: "igual", texto: "O objeto é a " },
      { tipo: "removido", texto: "compra " },
      { tipo: "incluido", texto: "aquisição " },
      { tipo: "igual", texto: "de " },
      { tipo: "removido", texto: "papel." },
      { tipo: "incluido", texto: "papel A4." },
    ])
  })

  it("o texto sugerido se remonta pelos trechos iguais e incluídos", () => {
    const atual = "Primeiro parágrafo.\n\nSegundo parágrafo com erro."
    const sugerido = "Primeiro parágrafo.\n\nSegundo parágrafo corrigido.\n\nTerceiro."
    const trechos = compararRevisao(atual, sugerido)
    expect(trechos.filter((t) => t.tipo !== "removido").map((t) => t.texto).join("")).toBe(sugerido)
    expect(trechos.filter((t) => t.tipo !== "incluido").map((t) => t.texto).join("").trim()).toBe(atual)
  })

  it("seção vazia ou sugestão vazia viram um trecho só", () => {
    expect(compararRevisao("", "Texto novo.")).toEqual([{ tipo: "incluido", texto: "Texto novo." }])
    expect(compararRevisao("Texto antigo.", "")).toEqual([{ tipo: "removido", texto: "Texto antigo." }])
  })

  it("texto longo demais é mostrado inteiro trocado, sem comparar palavra a palavra", () => {
    const longo = "palavra ".repeat(LIMITE_DE_PALAVRAS)
    expect(compararRevisao(longo, `${longo}fim`)).toEqual([
      { tipo: "removido", texto: longo },
      { tipo: "incluido", texto: `${longo}fim` },
    ])
    // Seção vazia com sugestão longa: nada a riscar, só o que entra.
    expect(compararRevisao("", `${longo}fim`)).toEqual([{ tipo: "incluido", texto: `${longo}fim` }])
  })

  it("diferença só de espaços, ou sugestão vazia, não é mudança", () => {
    expect(revisaoMudouOTexto("Texto  igual.\n", "Texto igual.")).toBe(false)
    expect(revisaoMudouOTexto("Texto.", "   ")).toBe(false)
    expect(revisaoMudouOTexto("Texto.", "Texto revisado.")).toBe(true)
  })
})
