import { describe, expect, it } from "vitest"

import { corpoDoDocumento } from "@/lib/dominio"
import type { SecaoDocumento } from "@/lib/types"

function secao(partes: Partial<SecaoDocumento> & { id: string }): SecaoDocumento {
  return {
    titulo: `Seção ${partes.id}`,
    status: "Não iniciado",
    obrigatoria: true,
    conteudo: "",
    hint: "Oriente.",
    fundamentoLegal: "Art. 18, § 1º, Lei 14.133/21",
    ...partes,
  }
}

describe("corpo do documento", () => {
  it("preserva a ordem das seções", () => {
    const corpo = corpoDoDocumento([
      secao({ id: "1", conteudo: "Primeira" }),
      secao({ id: "2", conteudo: "Segunda" }),
      secao({ id: "3", conteudo: "Terceira" }),
    ])

    // A ordem é a do documento oficial: trocá-la mudaria a leitura do ETP.
    expect(corpo.map((b) => b.id)).toEqual(["1", "2", "3"])
  })

  it("a seção dispensada vira parágrafo, em vez de sumir", () => {
    const corpo = corpoDoDocumento([
      secao({ id: "1", conteudo: "Necessidade descrita." }),
      secao({
        id: "2",
        obrigatoria: false,
        justificativaDispensa: "Contratação de item único, sem métrica aplicável.",
      }),
    ])

    // É o ponto do passo: sem o parágrafo, quem audita não distingue o inciso
    // que não se aplica daquele que ninguém preencheu.
    expect(corpo).toHaveLength(2)
    expect(corpo[1]?.dispensada).toBe(true)
    expect(corpo[1]?.texto).toContain("Art. 18, § 2º")
    expect(corpo[1]?.texto).toContain("Contratação de item único, sem métrica aplicável.")
  })

  it("seção em branco sem justificativa fica de fora", () => {
    const corpo = corpoDoDocumento([
      secao({ id: "1", conteudo: "Preenchida." }),
      secao({ id: "2", obrigatoria: false }),
    ])

    // Lacuna não é decisão. Anunciá-la como dispensa inventaria uma
    // justificativa que ninguém deu.
    expect(corpo.map((b) => b.id)).toEqual(["1"])
  })

  it("conteúdo preenchido vence a justificativa que tenha sobrado", () => {
    const corpo = corpoDoDocumento([
      secao({
        id: "1",
        obrigatoria: false,
        conteudo: "Resultados descritos.",
        justificativaDispensa: "Sobra de uma dispensa desfeita.",
      }),
    ])

    // O documento traria o conteúdo e, logo abaixo, diria que ele foi
    // dispensado — contradizendo a si mesmo na mesma página.
    expect(corpo[0]?.dispensada).toBe(false)
    expect(corpo[0]?.texto).toBe("Resultados descritos.")
  })

  it("documento sem nenhuma seção resolvida tem corpo vazio", () => {
    expect(corpoDoDocumento([secao({ id: "1" })])).toEqual([])
    expect(corpoDoDocumento([])).toEqual([])
  })

  it("apara o conteúdo escrito", () => {
    const corpo = corpoDoDocumento([secao({ id: "1", conteudo: "  Texto com sobras.  " })])

    expect(corpo[0]?.texto).toBe("Texto com sobras.")
  })
})
