import { describe, expect, it } from "vitest"

import { CATALOGO, ORDEM_FLUXO } from "@/lib/documentos"

import { DOCUMENTOS_DA_VITRINE, EXTRAS_DA_VITRINE, FORMATO_DOS_DOCUMENTOS, agruparFormas, OPCAO_INICIAL, OPCOES_DE_MODALIDADE, documentoDaVitrine, papeisNaModalidade } from "./documentos"

describe("DOCUMENTOS_DA_VITRINE", () => {
  it("traz os sete documentos na ordem do fluxo, com título e fundamento do catálogo", () => {
    expect(DOCUMENTOS_DA_VITRINE.map((d) => d.tipo)).toEqual(ORDEM_FLUXO)
    for (const d of DOCUMENTOS_DA_VITRINE) {
      expect(d.titulo).toBe(CATALOGO[d.tipo].titulo)
      expect(d.fundamento).toBe(CATALOGO[d.tipo].fundamento)
      expect(d.entrega.length).toBeGreaterThan(20)
    }
  })

  it("todo documento sai em DOCX e PDF, inclusive a juntada", () => {
    for (const d of DOCUMENTOS_DA_VITRINE) expect(d.formato).toBe(FORMATO_DOS_DOCUMENTOS)
    expect(EXTRAS_DA_VITRINE.find((e) => e.id === "juntada")?.formato).toBe("DOCX + PDF")
  })

  it("documentoDaVitrine devolve o mesmo que a lista", () => {
    expect(documentoDaVitrine("ETP")).toEqual(DOCUMENTOS_DA_VITRINE.find((d) => d.tipo === "ETP"))
  })

  it("cada documento tem um miolo próprio", () => {
    const miolos = DOCUMENTOS_DA_VITRINE.map((d) => d.miolo)
    expect(new Set(miolos).size).toBe(miolos.length)
  })
})

describe("EXTRAS_DA_VITRINE", () => {
  it("traz a juntada dos autos e a errata, que a plataforma também gera", () => {
    expect(EXTRAS_DA_VITRINE.map((e) => e.titulo)).toEqual(["Juntada dos Autos", "Errata"])
  })
})

describe("OPCOES_DE_MODALIDADE", () => {
  it("cada opção recebe uma lista de documentos diferente das outras", () => {
    const listas = OPCOES_DE_MODALIDADE.map((o) => {
      const [f] = o.formas
      return JSON.stringify(papeisNaModalidade(f!.modalidade, f!.forma))
    })
    expect(new Set(listas).size).toBe(OPCOES_DE_MODALIDADE.length)
  })

  it("junta as formas iguais num rótulo só, com os nomes do domínio", () => {
    const rotulos = OPCOES_DE_MODALIDADE.map((o) => o.rotulo)
    expect(rotulos[0]).toBe("Pregão Eletrônico, Concorrência e Diálogo Competitivo")
    expect(rotulos).toContain("Dispensa com Disputa")
    expect(rotulos).toContain("Dispensa Direta e Inexigibilidade")
    expect(rotulos).toContain("Leilão")
    expect(OPCAO_INICIAL).toBe(OPCOES_DE_MODALIDADE[0])
    expect(OPCAO_INICIAL.id).toBe("pregao-eletronico-concorrencia-e-dialogo-competitivo")
  })

  it("todas as nove formas de contratar aparecem em alguma opção", () => {
    expect(OPCOES_DE_MODALIDADE.flatMap((o) => o.formas)).toHaveLength(9)
  })

  it("agruparFormas mantém uma forma sozinha com o próprio rótulo", () => {
    expect(agruparFormas([{ modalidade: "Concurso" }])).toEqual([
      { id: "concurso", rotulo: "Concurso", formas: [{ modalidade: "Concurso" }] },
    ])
  })
})

describe("papeisNaModalidade", () => {
  const papel = (lista: ReturnType<typeof papeisNaModalidade>, tipo: string) =>
    lista.find((d) => d.tipo === tipo)?.papel

  it("no pregão, ETP, TR e Edital são obrigatórios e o Aviso fica de fora", () => {
    const lista = papeisNaModalidade("Pregão Eletrônico")
    expect(lista.map((d) => d.tipo)).toEqual(ORDEM_FLUXO)
    expect(papel(lista, "ETP")).toBe("obrigatorio")
    expect(papel(lista, "Edital")).toBe("obrigatorio")
    expect(papel(lista, "Cotação")).toBe("recomendado")
    expect(papel(lista, "Aviso")).toBe("fora")
  })

  it("na dispensa com disputa, o Aviso é obrigatório no lugar do Edital", () => {
    const lista = papeisNaModalidade("Dispensa Art. 75", "DISPUTE")
    expect(papel(lista, "Aviso")).toBe("obrigatorio")
    expect(papel(lista, "Edital")).toBe("fora")
    expect(papel(lista, "Mapa")).toBe("opcional")
  })
})
