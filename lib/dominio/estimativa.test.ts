import { describe, expect, it } from "vitest"

import {
  divergenciasDaMemoria,
  documentosDaEstimativa,
  enumerar,
  linhaDaFonte,
  linhaDoMetodo,
  memoriaEmDia,
  metodoCitado,
  resumoDaEstimativa,
} from "@/lib/dominio/estimativa"
import { fonteDeclarada } from "@/lib/dominio/fontes-de-preco"
import { metodoDeclarado } from "@/lib/dominio/pesquisa-de-precos"

const PAINEL = "Painel de Preços do Governo Federal (Compras.gov.br)"

/**
 * A estimativa é do processo (ADR-051 do back-end), e a memória de cálculo é o
 * texto de cada documento: quando os dois discordam, a tela avisa e põe o texto
 * em dia sem reescrever o resto.
 */
describe("estimativa de valor e memória de cálculo", () => {
  it("a linha da fonte cita o fundamento só quando a fonte é um parâmetro da lei", () => {
    expect(linhaDaFonte(PAINEL)).toBe(
      `Fonte de pesquisa de preços: ${PAINEL} (Art. 23, § 1º, I, Lei 14.133/21).`,
    )
    expect(linhaDaFonte("Consórcio intermunicipal")).toBe(
      "Fonte de pesquisa de preços: Consórcio intermunicipal.",
    )
    // E a linha volta como a mesma fonte.
    expect(fonteDeclarada(linhaDaFonte(PAINEL))).toBe(PAINEL)
  })

  it("a frase do método volta como o mesmo método", () => {
    expect(linhaDoMetodo("mediana")).toContain("mediana dos preços obtidos")
    expect(metodoDeclarado(linhaDoMetodo("menor"))).toBe("menor")
  })

  it("o método citado vem da frase, ou do único rótulo no texto", () => {
    expect(metodoCitado(linhaDoMetodo("mediana"))).toBe("mediana")
    expect(metodoCitado("- Papel: 10 × R$ 5,00 (média dos preços obtidos de 3 preço(s) coletado(s))")).toBe(
      "media",
    )
    // Nenhum, ou dois: a memória não diz qual prevalece.
    expect(metodoCitado("Texto escrito à mão.")).toBeNull()
    expect(metodoCitado("média dos preços obtidos e mediana dos preços obtidos")).toBeNull()
  })

  it("memória em branco, ou processo sem estimativa, não diverge", () => {
    expect(divergenciasDaMemoria("  ", { metodo: "media", fonte: PAINEL }, true)).toEqual({
      fonte: null,
      metodo: null,
    })
    expect(divergenciasDaMemoria("Texto.", undefined, true)).toEqual({ fonte: null, metodo: null })
    expect(divergenciasDaMemoria("Texto.", {}, true)).toEqual({ fonte: null, metodo: null })
  })

  it("aponta a fonte ausente ou diferente", () => {
    expect(divergenciasDaMemoria("Texto à mão.", { fonte: PAINEL }, false).fonte).toBe("ausente")
    expect(
      divergenciasDaMemoria(linhaDaFonte("Base nacional de notas fiscais eletrônicas"), { fonte: PAINEL }, false)
        .fonte,
    ).toBe("diferente")
    expect(divergenciasDaMemoria(linhaDaFonte(PAINEL), { fonte: PAINEL }, false).fonte).toBeNull()
  })

  it("aponta o método diferente, e o ausente só quando há pesquisa", () => {
    expect(divergenciasDaMemoria(linhaDoMetodo("media"), { metodo: "mediana" }, false).metodo).toBe(
      "diferente",
    )
    expect(divergenciasDaMemoria(linhaDoMetodo("media"), { metodo: "media" }, true).metodo).toBeNull()
    expect(divergenciasDaMemoria("Texto à mão.", { metodo: "media" }, true).metodo).toBe("ausente")
    // Sem pesquisa, o preço é o preliminar do DFD: o método não muda nada.
    expect(divergenciasDaMemoria("Texto à mão.", { metodo: "media" }, false).metodo).toBeNull()
  })

  it("põe em dia só o que diverge, e o resto fica como estava", () => {
    const memoria = [
      "Introdução escrita à mão.",
      "- Papel (média dos preços obtidos de 3 preço(s) coletado(s)) = R$ 50,00.",
      linhaDaFonte("Base nacional de notas fiscais eletrônicas"),
      "Fecho escrito à mão.",
    ].join("\n")
    const estimativa = { metodo: "mediana" as const, fonte: PAINEL }

    const emDia = memoriaEmDia(memoria, estimativa, divergenciasDaMemoria(memoria, estimativa, true))

    expect(emDia).toBe(
      [
        "Introdução escrita à mão.",
        "- Papel (mediana dos preços obtidos de 3 preço(s) coletado(s)) = R$ 50,00.",
        linhaDaFonte(PAINEL),
        "Fecho escrito à mão.",
      ].join("\n"),
    )
    expect(divergenciasDaMemoria(emDia, estimativa, true)).toEqual({ fonte: null, metodo: null })
  })

  it("acrescenta ao fim o que a memória não diz", () => {
    const estimativa = { metodo: "menor" as const, fonte: PAINEL }
    const emDia = memoriaEmDia(
      "Texto à mão.  ",
      estimativa,
      divergenciasDaMemoria("Texto à mão.", estimativa, true),
    )

    expect(emDia).toBe(`Texto à mão.\n\n${linhaDoMetodo("menor")}\n\n${linhaDaFonte(PAINEL)}`)
  })

  it("sem divergência, ou sem o valor do processo, o texto não muda", () => {
    expect(memoriaEmDia("Texto.", {}, { fonte: "ausente", metodo: "diferente" })).toBe("Texto.")
    expect(memoriaEmDia("Texto.", {}, { fonte: null, metodo: "ausente" })).toBe("Texto.")
  })

  it("resume a estimativa para a capa", () => {
    expect(resumoDaEstimativa({ metodo: "mediana", fonte: PAINEL })).toBe(`Mediana · ${PAINEL}`)
    expect(resumoDaEstimativa({ metodo: "menor" })).toBe("Menor")
    expect(resumoDaEstimativa({ fonte: "Consórcio" })).toBe("Consórcio")
    expect(resumoDaEstimativa({})).toBeNull()
    expect(resumoDaEstimativa(undefined)).toBeNull()
  })

  it("a escolha alcança Cotação, ETP e TR, dos que o processo tem", () => {
    expect(documentosDaEstimativa(["Cotação", "ETP", "Mapa", "TR", "Edital"])).toEqual(["Cotação", "ETP", "TR"])
    expect(documentosDaEstimativa(["Edital"])).toEqual([])
  })

  it("enumera como se escreve", () => {
    expect(enumerar([])).toBe("")
    expect(enumerar(["ETP"])).toBe("ETP")
    expect(enumerar(["ETP", "TR"])).toBe("ETP e TR")
    expect(enumerar(["Cotação", "ETP", "TR"])).toBe("Cotação, ETP e TR")
  })
})
