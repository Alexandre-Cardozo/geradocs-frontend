import { describe, expect, it } from "vitest"

import { contar, resumoDaTroca } from "@/lib/documentos/troca"

const vazia = { mantidas: [], reunidas: [], emBranco: [], semLugar: [], restauradas: [] }

describe("resumo da troca de minuta (§90)", () => {
  it("diz as duas estruturas e o destino do texto, com concordância", () => {
    // O caso que confundia: Contrato de obras (18) para o de mão de obra (20),
    // com uma seção escrita.
    const resumo = resumoDaTroca({ ...vazia, mantidas: ["Cláusula Primeira – Objeto"], emBranco: Array(19).fill("x") }, 18, 20)

    expect(resumo).toEqual({
      estrutura: "18 seções hoje → 20 seções na nova minuta.",
      destinos: ["1 seção recebe o texto da seção do mesmo assunto."],
      emBranco: "19 seções começam em branco.",
    })
  })

  it("plural, reunidas, restauradas e o que fica guardado", () => {
    const resumo = resumoDaTroca(
      { mantidas: ["A", "B"], reunidas: ["C"], emBranco: ["D"], semLugar: ["Da Matriz de Riscos"], restauradas: ["E", "F"] },
      17,
      17,
    )

    expect(resumo).toEqual({
      estrutura: "17 seções hoje e na nova minuta.",
      destinos: [
        "2 seções recebem o texto da seção do mesmo assunto.",
        "1 seção junta o texto de mais de uma seção.",
        "2 seções voltam com o texto que já tinham.",
      ],
      guardado: "Sem seção do mesmo assunto, o texto fica guardado: Da Matriz de Riscos.",
      emBranco: "1 seção começa em branco.",
    })
    expect(resumoDaTroca({ ...vazia, restauradas: ["E"] }, 1, 1).destinos).toEqual([
      "1 seção volta com o texto que já tinha.",
    ])
  })

  it("sem nada escrito, diz que só a estrutura muda e não fala em branco", () => {
    expect(resumoDaTroca({ ...vazia, emBranco: ["A", "B"] }, 1, 2)).toEqual({
      estrutura: "1 seção hoje → 2 seções na nova minuta.",
      destinos: ["Ainda não há texto escrito: só a estrutura muda."],
    })
  })

  it("conta no singular e no plural", () => {
    expect(contar(1, "seção", "seções")).toBe("1 seção")
    expect(contar(0, "seção", "seções")).toBe("0 seções")
  })
})
