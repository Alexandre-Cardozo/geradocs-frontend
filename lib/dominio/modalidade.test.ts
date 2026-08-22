import { describe, expect, it } from "vitest"

import { impactoTrocaModalidade, motivoDaTrocaDeModalidade } from "@/lib/dominio/modalidade"
import { MODALIDADE_LABEL, type Modalidade } from "@/lib/types"

const MODALIDADES = Object.keys(MODALIDADE_LABEL) as Modalidade[]

/**
 * O caso que motivou a regra é o da reunião: um processo montado como Pregão
 * Eletrônico vira Dispensa do Art. 75. O Edital deixa de existir naquela
 * contratação — e, se já tiver sido gerado, fica no acervo contradizendo o
 * próprio processo.
 */
describe("impacto da troca de modalidade", () => {
  it("pregão para dispensa: o Edital deixa de ser cabível", () => {
    const impacto = impactoTrocaModalidade(
      "Pregão Eletrônico",
      "Dispensa Art. 75",
      ["ETP", "TR", "Edital"],
    )

    expect(impacto.deixamDeSerCabiveis).toEqual(["Edital"])
    expect(impacto.cabiveis).not.toContain("Edital")
    expect(impacto.exigeJustificativa).toBe(true)
  })

  it("avisa em separado o que já foi gerado", () => {
    const impacto = impactoTrocaModalidade(
      "Pregão Eletrônico",
      "Dispensa Art. 75",
      ["ETP", "TR", "Edital"],
      ["ETP", "Edital"],
    )

    // Documento gerado não some ao trocar a modalidade. É o aviso mais grave da
    // lista, e por isso vem separado do que apenas deixa de ser solicitado.
    expect(impacto.jaGeradosQueDeixamDeSerCabiveis).toEqual(["Edital"])
  })

  it("aponta o que passa a ser obrigatório", () => {
    const impacto = impactoTrocaModalidade("Leilão", "Pregão Eletrônico", ["Edital"])

    expect(impacto.passamASerObrigatorios).toEqual(["ETP", "TR"])
    expect(impacto.exigeJustificativa).toBe(true)
  })

  it("a sugestão preserva o que continua cabível", () => {
    const impacto = impactoTrocaModalidade(
      "Pregão Eletrônico",
      "Dispensa Art. 75",
      ["ETP", "TR", "Edital", "Cotação"],
    )

    // Quem montou o processo escolheu Cotação; a troca de modalidade não é
    // motivo para descartar a escolha onde ela continua valendo.
    expect(impacto.documentosSugeridos).toEqual(["Cotação", "ETP", "TR"])
  })

  it("a sugestão vem na ordem do fluxo, não na de digitação", () => {
    const impacto = impactoTrocaModalidade("Leilão", "Pregão Eletrônico", ["Edital"])

    // Fora de ordem, a lista do hub mostraria o Edital antes do ETP — e o
    // servidor leria como se fosse essa a sequência do trabalho.
    expect(impacto.documentosSugeridos).toEqual(["ETP", "TR", "Edital"])
  })

  it("trocar entre modalidades de mesma exigência não pede justificativa", () => {
    const impacto = impactoTrocaModalidade(
      "Pregão Eletrônico",
      "Concorrência",
      ["ETP", "TR", "Edital"],
    )

    // Alerta sem consequência vira ruído que se aprende a fechar sem ler — e aí
    // o alerta que importa passa junto.
    expect(impacto.exigeJustificativa).toBe(false)
    expect(impacto.deixamDeSerCabiveis).toEqual([])
    expect(impacto.passamASerObrigatorios).toEqual([])
  })

  it("manter a mesma modalidade nunca exige justificativa", () => {
    expect(
      impactoTrocaModalidade("Pregão Eletrônico", "Pregão Eletrônico", []).exigeJustificativa,
    ).toBe(false)
  })

  it.each(MODALIDADES)("%s tem impacto calculável a partir de qualquer origem", (modalidade) => {
    for (const origem of MODALIDADES) {
      const impacto = impactoTrocaModalidade(origem, modalidade, ["ETP", "TR", "Edital"])
      // Modalidade nova no catálogo não pode quebrar a tela de troca.
      expect(impacto.cabiveis.length).toBeGreaterThan(0)
      expect(impacto.documentosSugeridos).toEqual(expect.arrayContaining([]))
    }
  })
})

describe("motivo registrado na trilha", () => {
  const impacto = impactoTrocaModalidade(
    "Pregão Eletrônico",
    "Dispensa Art. 75",
    ["ETP", "TR", "Edital"],
  )

  it("com justificativa, ela entra literal", () => {
    const motivo = motivoDaTrocaDeModalidade(
      "Pregão Eletrônico",
      "Dispensa Art. 75",
      impacto,
      "  O edital já foi publicado e será anulado por ato próprio.  ",
    )

    // É a justificativa que responde ao controle por que a lista ficou
    // divergente da recomendação; parafraseá-la perderia o que foi dito.
    expect(motivo).toContain("O edital já foi publicado e será anulado por ato próprio.")
    expect(motivo).toContain("Pregão Eletrônico")
    expect(motivo).toContain("Dispensa Art. 75")
  })

  it("sem justificativa, registra o ajuste que foi feito", () => {
    const motivo = motivoDaTrocaDeModalidade("Pregão Eletrônico", "Dispensa Art. 75", impacto, "   ")

    expect(motivo).toContain("removidos por deixarem de ser cabíveis: Edital")
  })

  it("registra também o que passou a ser obrigatório", () => {
    const subida = impactoTrocaModalidade("Leilão", "Pregão Eletrônico", ["Edital"])

    expect(motivoDaTrocaDeModalidade("Leilão", "Pregão Eletrônico", subida, "")).toContain(
      "incluídos por passarem a ser obrigatórios: ETP, TR",
    )
  })

  it("sem consequência nenhuma, registra só a troca", () => {
    const neutra = impactoTrocaModalidade("Pregão Eletrônico", "Concorrência", ["ETP", "TR", "Edital"])

    expect(motivoDaTrocaDeModalidade("Pregão Eletrônico", "Concorrência", neutra, "")).toBe(
      "Modalidade alterada de Pregão Eletrônico para Concorrência.",
    )
  })
})
