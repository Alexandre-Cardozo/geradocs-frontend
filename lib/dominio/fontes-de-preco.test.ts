import { describe, expect, it } from "vitest"

import {
  ehFonteCanonica,
  FONTES_DE_PRECO,
  fonteDeclarada,
  fundamentoDaFonte,
  PREFIXO_DA_FONTE,
} from "@/lib/dominio/fontes-de-preco"

/**
 * As fontes de pesquisa de preços.
 *
 * <p>São os cinco parâmetros do Art. 23, § 1º, da Lei 14.133/21. A escolha vive
 * na memória de cálculo — é lá que o controle procura de onde saiu o preço —, e
 * é de lá que a tela a lê de volta.
 */
describe("fontes de pesquisa de preços", () => {
  it("toda fonte cita o parâmetro legal, literalmente", () => {
    // Parafrasear artigo de lei em documento de contratação é defeito, não
    // estilo: o fundamento vai como está escrito.
    for (const fonte of FONTES_DE_PRECO) {
      expect(fonte.fundamento, fonte.rotulo).toMatch(/^Art\. 23, § 1º, [IV]+, Lei 14\.133\/21$/)
      expect(fonte.rotulo.trim()).not.toBe("")
    }
  })

  it("os dois parâmetros preferenciais vêm primeiro, e a pesquisa direta por último", () => {
    // A IN SEGES 65/2021 prioriza o painel e as contratações similares, e manda
    // evitar que a cotação com fornecedores seja a única fonte.
    expect(FONTES_DE_PRECO[0]?.fundamento).toContain("I,")
    expect(FONTES_DE_PRECO.at(-1)?.rotulo).toMatch(/três fornecedores/)
    expect(FONTES_DE_PRECO.at(-1)?.fundamento).toContain("IV,")
  })

  it("lê de volta a fonte declarada na memória de cálculo", () => {
    const memoria = [
      "O valor estimado resulta dos preços unitários referenciais.",
      `${PREFIXO_DA_FONTE} Base nacional de notas fiscais eletrônicas.`,
      "[Anexar os documentos de suporte.]",
    ].join("\n\n")

    // É isso que faz a marcação sobreviver a trocar de seção: ela não vive na
    // memória da aba, vive no texto que a seção guarda.
    expect(fonteDeclarada(memoria)).toBe("Base nacional de notas fiscais eletrônicas")

    // Com o fundamento junto — que é como a plataforma o escreve — o rótulo
    // volta limpo, senão a fonte da lei pareceria uma "outra".
    expect(
      fonteDeclarada(
        `${PREFIXO_DA_FONTE} Base nacional de notas fiscais eletrônicas`
          + " (Art. 23, § 1º, V, Lei 14.133/21).",
      ),
    ).toBe("Base nacional de notas fiscais eletrônicas")
  })

  it("memória sem a linha, ou com ela vazia, não declara fonte nenhuma", () => {
    expect(fonteDeclarada("Texto qualquer.")).toBeNull()
    expect(fonteDeclarada("")).toBeNull()
    expect(fonteDeclarada(`${PREFIXO_DA_FONTE}   `)).toBeNull()
  })

  it("fonte fora da lista é aceita, e não tem fundamento a citar", () => {
    // Contratação municipal tem exceção: recusá-la transformaria orientação em
    // obstáculo. O que a plataforma não faz é inventar o artigo dela.
    expect(ehFonteCanonica("Cotação do consórcio intermunicipal")).toBe(false)
    expect(fundamentoDaFonte("Cotação do consórcio intermunicipal")).toBeNull()
    const primeira = FONTES_DE_PRECO[0]!
    expect(ehFonteCanonica(primeira.rotulo)).toBe(true)
    expect(fundamentoDaFonte(primeira.rotulo)).toBe(primeira.fundamento)
  })
})
