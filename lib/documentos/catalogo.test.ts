import { describe, expect, it } from "vitest"

import {
  CATALOGO,
  ORDEM_FLUXO,
  REGRA_MODALIDADE,
  documentosDaModalidade,
  ehObrigatorio,
  ordenar,
  pendencias,
  porSlug,
  totalSecoes,
} from "@/lib/documentos"
import type { Modalidade, TipoDocumento } from "@/lib/types"

describe("ordem canônica", () => {
  it("segue a ordem em que um documento embasa o seguinte", () => {
    // Cotação embasa a estimativa do ETP (Art. 18, § 1º, VI); o TR se funda no
    // ETP (Art. 6º, XXIII, 'b'); o Edital tem o TR como anexo (Art. 25, § 1º).
    expect(ORDEM_FLUXO).toEqual(["Cotação", "ETP", "Mapa", "TR", "Edital", "Contrato"])
  })

  it("reordena qualquer lista pela ordem do fluxo", () => {
    expect(ordenar(["Edital", "Cotação", "TR"])).toEqual(["Cotação", "TR", "Edital"])
  })
})

describe("matriz modalidade × documentos", () => {
  it("não oferece Edital na contratação direta", () => {
    // Art. 72: a contratação direta instrui o processo sem edital de licitação.
    expect(documentosDaModalidade("Dispensa Art. 75")).not.toContain("Edital")
    expect(documentosDaModalidade("Inexigibilidade")).not.toContain("Edital")
  })

  it("torna o ETP opcional na contratação direta", () => {
    // Art. 18, § 2º c/c Art. 72, I — "quando for o caso".
    expect(ehObrigatorio("Dispensa Art. 75", "ETP")).toBe(false)
    expect(ehObrigatorio("Dispensa Art. 75", "TR")).toBe(true)
  })

  it("exige ETP, TR e Edital nas modalidades competitivas", () => {
    for (const modalidade of ["Pregão Eletrônico", "Concorrência", "Diálogo Competitivo"] as Modalidade[]) {
      expect(REGRA_MODALIDADE[modalidade].obrigatorios).toEqual(["ETP", "TR", "Edital"])
    }
  })

  it("no Leilão exige apenas o Edital", () => {
    expect(REGRA_MODALIDADE.Leilão.obrigatorios).toEqual(["Edital"])
  })

  it("devolve os cabíveis já na ordem do fluxo", () => {
    const cabiveis = documentosDaModalidade("Pregão Eletrônico")
    expect(cabiveis).toEqual(ordenar(cabiveis))
  })
})

describe("pendências de dependência", () => {
  it("trava o TR enquanto o ETP do processo não foi gerado", () => {
    expect(pendencias("TR", ["ETP", "TR"], [])).toEqual(["ETP"])
  })

  it("libera o TR assim que o ETP é gerado", () => {
    expect(pendencias("TR", ["ETP", "TR"], ["ETP"])).toEqual([])
  })

  it("não trava o Edital do Leilão por um TR que o processo nunca terá", () => {
    // No Leilão a avaliação do bem faz o papel do TR. Esperar por um documento
    // ausente do processo deixaria o Edital obrigatório impossível de elaborar.
    expect(pendencias("Edital", ["Edital"], [])).toEqual([])
  })

  it("trava o Contrato pelo TR quando o processo contém os dois", () => {
    expect(pendencias("Contrato", ["TR", "Contrato"], [])).toEqual(["TR"])
  })
})

describe("catálogo como fonte única", () => {
  it("resolve o slug da URL para o tipo", () => {
    expect(porSlug("etp")).toBe("ETP")
    expect(porSlug("cotacao")).toBe("Cotação")
  })

  it("devolve undefined para slug inexistente", () => {
    expect(porSlug("inexistente")).toBeUndefined()
  })

  it("tem slug único por tipo", () => {
    const slugs = ORDEM_FLUXO.map((tipo) => CATALOGO[tipo].slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("declara fundamento legal literal para todo tipo", () => {
    for (const tipo of ORDEM_FLUXO) {
      expect(CATALOGO[tipo].fundamento, tipo).toMatch(/Lei 14\.133\/21/)
    }
  })

  it("conta as seções de cada tipo a partir da estrutura seccional", () => {
    const contagens = Object.fromEntries(ORDEM_FLUXO.map((t) => [t, totalSecoes(t)])) as Record<TipoDocumento, number>
    expect(contagens).toEqual({
      "Cotação": 5,
      ETP: 13,
      Mapa: 6,
      TR: 10,
      Edital: 14,
      Contrato: 19,
    })
  })
})
