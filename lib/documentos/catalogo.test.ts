import { describe, expect, it } from "vitest"

import {
  CATALOGO,
  ORDEM_FLUXO,
  REGRA_MODALIDADE,
  agruparAnexos,
  anexosDoArquivo,
  documentosDaModalidade,
  ehDispensaPorValor,
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
    // ETP (Art. 6º, XXIII, 'b'); o Edital tem o TR entre os seus elementos
    // (Art. 25, § 3º); a minuta de contrato é anexo do edital (Art. 18, VI).
    expect(ORDEM_FLUXO).toEqual(["Cotação", "ETP", "Mapa", "TR", "Edital", "Aviso", "Contrato"])
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

  it("já marca a minuta de contrato nas licitações em que o contrato é a regra", () => {
    // Art. 18, VI: quando necessária, a minuta consta obrigatoriamente como
    // anexo do edital.
    for (const modalidade of ["Pregão Eletrônico", "Concorrência", "Diálogo Competitivo", "Credenciamento"] as Modalidade[]) {
      expect(REGRA_MODALIDADE[modalidade].recomendados, modalidade).toEqual(["Contrato"])
    }
  })

  it("deixa a minuta desmarcada no Leilão, no Concurso e na contratação direta", () => {
    for (const modalidade of ["Leilão", "Concurso", "Dispensa Art. 75", "Inexigibilidade"] as Modalidade[]) {
      expect(REGRA_MODALIDADE[modalidade].recomendados, modalidade).not.toContain("Contrato")
    }
  })

  it("só recomenda o que é opcional na modalidade", () => {
    for (const [modalidade, regra] of Object.entries(REGRA_MODALIDADE)) {
      for (const tipo of regra.recomendados) {
        expect(regra.opcionais, `${modalidade} recomenda ${tipo}`).toContain(tipo)
      }
    }
  })

  it("devolve os cabíveis já na ordem do fluxo", () => {
    const cabiveis = documentosDaModalidade("Pregão Eletrônico")
    expect(cabiveis).toEqual(ordenar(cabiveis))
  })
})

describe("aviso de contratação direta", () => {
  it("só a dispensa por valor o oferece", () => {
    // Art. 75, § 3º: o aviso é das contratações dos incisos I e II.
    expect(documentosDaModalidade("Dispensa Art. 75", "VALUE_GENERAL")).toContain("Aviso")
    expect(documentosDaModalidade("Dispensa Art. 75", "VALUE_ENGINEERING")).toContain("Aviso")
    expect(documentosDaModalidade("Dispensa Art. 75", "OTHER")).not.toContain("Aviso")
    // Sem inciso declarado não há como saber se é dispensa por valor.
    expect(documentosDaModalidade("Dispensa Art. 75")).not.toContain("Aviso")
  })

  it("não existe fora da dispensa, qualquer que seja o fundamento", () => {
    expect(documentosDaModalidade("Pregão Eletrônico", "VALUE_GENERAL")).not.toContain("Aviso")
    expect(documentosDaModalidade("Inexigibilidade", "VALUE_GENERAL")).not.toContain("Aviso")
  })

  it("vem marcado na dispensa, porque a lei o quer 'preferencialmente'", () => {
    expect(REGRA_MODALIDADE["Dispensa Art. 75"].recomendados).toEqual(["Aviso"])
    expect(ehObrigatorio("Dispensa Art. 75", "Aviso")).toBe(false)
  })

  it("reconhece a dispensa por valor pelo inciso", () => {
    expect(ehDispensaPorValor("VALUE_GENERAL")).toBe(true)
    expect(ehDispensaPorValor("VALUE_ENGINEERING")).toBe(true)
    expect(ehDispensaPorValor("OTHER")).toBe(false)
    expect(ehDispensaPorValor(undefined)).toBe(false)
  })

  it("fica depois do TR, em que se fundamenta, e não é anexo de nada", () => {
    expect(pendencias("Aviso", ["TR", "Aviso"], [])).toEqual(["TR"])
    expect(CATALOGO.Aviso.anexoDe).toBeUndefined()
    expect(agruparAnexos(["TR", "Aviso", "Contrato"]).map((g) => g.tipo)).toEqual(["TR", "Aviso", "Contrato"])
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

describe("anexos do edital", () => {
  it("põe a minuta de contrato sob o Edital", () => {
    expect(agruparAnexos(["ETP", "TR", "Edital", "Contrato"])).toEqual([
      { tipo: "ETP", anexos: [] },
      { tipo: "TR", anexos: [] },
      { tipo: "Edital", anexos: ["Contrato"] },
    ])
  })

  it("mantém o TR no próprio lugar, porque ele fundamenta o Edital", () => {
    // O TR também é anexo do edital (Art. 25, § 3º), mas é elaborado antes.
    expect(CATALOGO.TR.anexoDe?.tipo).toBe("Edital")
    expect(agruparAnexos(["TR", "Edital"]).map((g) => g.tipo)).toEqual(["TR", "Edital"])
  })

  it("deixa a minuta solta quando o processo não tem Edital", () => {
    // Na contratação direta não há edital de que ela seja anexo (Art. 72).
    expect(agruparAnexos(["TR", "Contrato"])).toEqual([
      { tipo: "TR", anexos: [] },
      { tipo: "Contrato", anexos: [] },
    ])
  })

  it("agrupa na ordem do fluxo, qualquer que seja a ordem recebida", () => {
    expect(agruparAnexos(["Contrato", "Edital", "Cotação"])).toEqual([
      { tipo: "Cotação", anexos: [] },
      { tipo: "Edital", anexos: ["Contrato"] },
    ])
  })
})

describe("anexos dentro do arquivo do Edital", () => {
  it("entram o TR e a minuta gerados, numerados na ordem do fluxo", () => {
    expect(
      anexosDoArquivo("Edital", ["TR", "Edital", "Contrato"], [
        { tipo: "Contrato", versao: 2 },
        { tipo: "TR", versao: 1 },
      ])
    ).toEqual({
      incluidos: [
        { tipo: "TR", numero: "I", versao: 1 },
        { tipo: "Contrato", numero: "II", versao: 2 },
      ],
      faltando: [],
    })
  })

  it("o anexo ainda não gerado fica de fora, e a numeração acompanha o que entrou", () => {
    expect(anexosDoArquivo("Edital", ["TR", "Edital", "Contrato"], [{ tipo: "Contrato", versao: 1 }])).toEqual({
      incluidos: [{ tipo: "Contrato", numero: "I", versao: 1 }],
      faltando: ["TR"],
    })
  })

  it("usa a versão mais recente quando o acervo traz mais de uma", () => {
    const { incluidos } = anexosDoArquivo("Edital", ["Edital", "Contrato"], [
      { tipo: "Contrato", versao: 1 },
      { tipo: "Contrato", versao: 3 },
    ])
    expect(incluidos.map((a) => a.versao)).toEqual([3])
  })

  it("ignora o que o processo não contém, e documento sem anexo não tem nada", () => {
    expect(anexosDoArquivo("Edital", ["Edital"], [{ tipo: "TR", versao: 1 }])).toEqual({
      incluidos: [],
      faltando: [],
    })
    expect(anexosDoArquivo("ETP", ["ETP", "TR"], [])).toEqual({ incluidos: [], faltando: [] })
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
      Aviso: 8,
      Contrato: 19,
    })
  })
})
