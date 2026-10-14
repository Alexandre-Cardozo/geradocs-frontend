import { describe, expect, it } from "vitest"

import {
  houveTroca,
  impactoTrocaModalidade,
  motivoDaTrocaDeModalidade,
  rotuloDaModalidade,
} from "@/lib/dominio/modalidade"
import { MODALIDADE_LABEL, type Modalidade } from "@/lib/types"

const MODALIDADES = Object.keys(MODALIDADE_LABEL) as Modalidade[]

/**
 * A troca de modalidade acrescenta o que a nova exige e não tira nada
 * (ADR-047 do back-end): o que já estava marcado ou elaborado fica, e o que a
 * nova modalidade não prevê só sai se o servidor o retirar.
 */
describe("impacto da troca de modalidade", () => {
  it("pregão para dispensa: o Edital fica, sem estar previsto", () => {
    const impacto = impactoTrocaModalidade("Pregão Eletrônico", "Dispensa Art. 75", ["ETP", "TR", "Edital"], ["Edital"], {
      para: "DIRECT",
    })

    expect(impacto.naoPrevistos).toEqual(["Edital"])
    expect(impacto.jaGeradosNaoPrevistos).toEqual(["Edital"])
    expect(impacto.entram).toEqual([])
    expect(impacto.documentos).toEqual(["ETP", "TR", "Edital"])
  })

  it("dispensa para inexigibilidade: nada sai, nada entra — o TR já estava", () => {
    const impacto = impactoTrocaModalidade("Dispensa Art. 75", "Inexigibilidade", ["Cotação", "TR", "Aviso"], [], {
      de: "DISPUTE",
    })

    expect(impacto.entram).toEqual([])
    expect(impacto.naoPrevistos).toEqual(["Aviso"])
    expect(impacto.documentos).toEqual(["Cotação", "TR", "Aviso"])
  })

  it("dispensa para pregão: entram os exigidos, e a minuta vem com o edital", () => {
    const impacto = impactoTrocaModalidade("Dispensa Art. 75", "Pregão Eletrônico", ["Cotação", "TR"], [], {
      de: "DIRECT",
    })

    expect(impacto.entram).toEqual(["ETP", "Edital", "Contrato"])
    // A ordem é a do fluxo, não a de digitação.
    expect(impacto.documentos).toEqual(["Cotação", "ETP", "TR", "Edital", "Contrato"])
  })

  it("a minuta que já estava não entra de novo", () => {
    const impacto = impactoTrocaModalidade("Inexigibilidade", "Concorrência", ["TR", "Contrato"])

    expect(impacto.entram).toEqual(["ETP", "Edital"])
    expect(impacto.documentos).toEqual(["ETP", "TR", "Edital", "Contrato"])
  })

  it("nenhuma troca entre duas modalidades remove documento", () => {
    for (const de of MODALIDADES) {
      for (const para of MODALIDADES) {
        const solicitados = ["Cotação", "ETP", "Mapa", "TR", "Edital", "Aviso", "Contrato"] as const
        const impacto = impactoTrocaModalidade(de, para, [...solicitados])
        expect(impacto.documentos, `${de} → ${para}`).toEqual(expect.arrayContaining([...solicitados]))
      }
    }
  })

  it("na mesma modalidade, nada é dado como não previsto", () => {
    const impacto = impactoTrocaModalidade("Pregão Eletrônico", "Pregão Eletrônico", ["ETP", "TR", "Edital", "Aviso"])

    expect(impacto.naoPrevistos).toEqual([])
  })
})

describe("motivo registrado na trilha", () => {
  it("diz o que entrou e o que ficou sem estar previsto, com os já gerados", () => {
    const impacto = impactoTrocaModalidade("Pregão Eletrônico", "Dispensa Art. 75", ["ETP", "TR", "Edital"], ["Edital"], {
      para: "DISPUTE",
    })

    expect(motivoDaTrocaDeModalidade("Pregão Eletrônico", "Dispensa Art. 75", impacto, { para: "DISPUTE" })).toBe(
      "Modalidade alterada de Pregão Eletrônico para Dispensa Art. 75 (com disputa). Incluídos para elaboração: Aviso. Mantidos, embora a nova modalidade não os preveja: Edital (já gerados: Edital).",
    )
  })

  it("sem consequência nenhuma, registra só a troca", () => {
    const neutra = impactoTrocaModalidade("Pregão Eletrônico", "Concorrência", ["ETP", "TR", "Edital"])

    expect(motivoDaTrocaDeModalidade("Pregão Eletrônico", "Concorrência", neutra)).toBe(
      "Modalidade alterada de Pregão Eletrônico para Concorrência.",
    )
  })

  it("não previsto que não foi gerado sai sem a observação", () => {
    const impacto = impactoTrocaModalidade("Pregão Eletrônico", "Dispensa Art. 75", ["ETP", "TR", "Edital"], [], {
      para: "DIRECT",
    })

    expect(motivoDaTrocaDeModalidade("Pregão Eletrônico", "Dispensa Art. 75", impacto, { para: "DIRECT" })).toBe(
      "Modalidade alterada de Pregão Eletrônico para Dispensa Art. 75 (direta). Mantidos, embora a nova modalidade não os preveja: Edital.",
    )
  })
})

/**
 * Na dispensa, trocar a forma — direta ↔ com disputa — é trocar a regra de
 * documentos, e segue a mesma regra de acrescentar sem tirar (ADR-046).
 */
describe("troca da forma da dispensa", () => {
  it("de direta para com disputa, o aviso entra", () => {
    const impacto = impactoTrocaModalidade("Dispensa Art. 75", "Dispensa Art. 75", ["Cotação", "TR"], [], {
      de: "DIRECT",
      para: "DISPUTE",
    })

    expect(impacto.entram).toEqual(["Aviso"])
    expect(impacto.documentos).toEqual(["Cotação", "TR", "Aviso"])
  })

  it("de com disputa para direta, o aviso fica — e, gerado, entra na trilha", () => {
    const formas = { de: "DISPUTE", para: "DIRECT" } as const
    const impacto = impactoTrocaModalidade("Dispensa Art. 75", "Dispensa Art. 75", ["TR", "Aviso"], ["Aviso"], formas)

    expect(impacto.naoPrevistos).toEqual(["Aviso"])
    expect(impacto.documentos).toEqual(["TR", "Aviso"])
    expect(motivoDaTrocaDeModalidade("Dispensa Art. 75", "Dispensa Art. 75", impacto, formas)).toBe(
      "Modalidade alterada de Dispensa Art. 75 (com disputa) para Dispensa Art. 75 (direta). Mantidos, embora a nova modalidade não os preveja: Aviso (já gerados: Aviso).",
    )
  })

  it("a mesma forma não é troca; fora da dispensa, a forma não conta", () => {
    expect(houveTroca("Dispensa Art. 75", "Dispensa Art. 75", { de: "DIRECT", para: "DIRECT" })).toBe(false)
    expect(houveTroca("Dispensa Art. 75", "Dispensa Art. 75", { de: "DIRECT", para: "DISPUTE" })).toBe(true)
    expect(houveTroca("Pregão Eletrônico", "Pregão Eletrônico", { de: "DIRECT", para: "DISPUTE" })).toBe(false)
    expect(houveTroca("Pregão Eletrônico", "Concorrência")).toBe(true)
  })

  it("o rótulo diz a forma na dispensa, e só a modalidade nas demais", () => {
    expect(rotuloDaModalidade("Dispensa Art. 75", "DISPUTE")).toBe("Dispensa com Disputa")
    expect(rotuloDaModalidade("Dispensa Art. 75", "DIRECT")).toBe("Dispensa Direta")
    expect(rotuloDaModalidade("Dispensa Art. 75")).toBe("Dispensa de Licitação")
    expect(rotuloDaModalidade("Pregão Eletrônico", "DISPUTE")).toBe("Pregão Eletrônico")
  })
})
