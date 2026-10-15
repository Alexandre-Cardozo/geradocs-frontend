import { describe, expect, it } from "vitest"

import {
  CATALOGO,
  ORDEM_FLUXO,
  REGRA_DA_DISPENSA,
  REGRA_MODALIDADE,
  agruparAnexos,
  anexosDoArquivo,
  anexosSob,
  documentosDaModalidade,
  ehDispensaPorValor,
  ehObrigatorio,
  orientacaoDosDocumentos,
  regraDe,
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
    // Art. 72, I — "se for o caso".
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

  /**
   * A matriz inteira, de uma vez (ADR-047 do back-end): os obrigatórios são os
   * mesmos de `RequiredDocuments`, e os recomendados seguem três regras — a
   * minuta sempre (Art. 95), a cotação onde há contratação a estimar (Art. 23)
   * e o mapa de riscos nas licitações de contratação (Art. 18, X).
   */
  it("obrigatórios e recomendados de cada modalidade", () => {
    const matriz = (Object.keys(REGRA_MODALIDADE) as Modalidade[]).map((m) => [
      m,
      REGRA_MODALIDADE[m].obrigatorios,
      [...REGRA_MODALIDADE[m].recomendados].sort(),
    ])
    expect(matriz).toEqual([
      ["Pregão Eletrônico", ["ETP", "TR", "Edital"], ["Contrato", "Cotação", "Mapa"]],
      ["Concorrência", ["ETP", "TR", "Edital"], ["Contrato", "Cotação", "Mapa"]],
      ["Diálogo Competitivo", ["ETP", "TR", "Edital"], ["Contrato", "Cotação", "Mapa"]],
      ["Credenciamento", ["TR", "Edital"], ["Contrato", "Cotação", "ETP"]],
      ["Concurso", ["ETP", "Edital"], ["Contrato"]],
      ["Leilão", ["Edital"], ["Contrato"]],
      ["Dispensa Art. 75", ["TR"], ["Contrato", "Cotação"]],
      ["Inexigibilidade", ["TR"], ["Contrato", "Cotação"]],
    ])
  })

  it("o anexo que se apresenta sob o principal vem marcado com ele", () => {
    // A minuta sob o edital: quem marca o edital já leva a minuta.
    for (const [modalidade, regra] of Object.entries(REGRA_MODALIDADE)) {
      for (const principal of [...regra.obrigatorios, ...regra.recomendados]) {
        for (const anexo of anexosSob(principal)) {
          expect(regra.recomendados, `${modalidade}: ${anexo} sob ${principal}`).toContain(anexo)
        }
      }
    }
    expect(anexosSob("Edital")).toEqual(["Contrato"])
    expect(anexosSob("TR")).toEqual([])
  })

  it("o Credenciamento é inexigibilidade: o ETP vem marcado, mas não é exigido", () => {
    // Art. 74, IV c/c Art. 72, I — "se for o caso".
    expect(ehObrigatorio("Credenciamento", "ETP")).toBe(false)
    expect(ehObrigatorio("Credenciamento", "Edital")).toBe(true)
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

describe("as duas formas da dispensa (ADR-046 do back-end)", () => {
  it("a direta não tem aviso nem edital, e marca a cotação e a minuta", () => {
    const direta = documentosDaModalidade("Dispensa Art. 75", "DIRECT")
    expect(direta).toEqual(["Cotação", "ETP", "Mapa", "TR", "Contrato"])
    expect(regraDe("Dispensa Art. 75", "DIRECT").recomendados).toEqual(["Cotação", "Contrato"])
    expect(ehObrigatorio("Dispensa Art. 75", "TR", "DIRECT")).toBe(true)
    expect(ehObrigatorio("Dispensa Art. 75", "ETP", "DIRECT")).toBe(false)
  })

  it("a com disputa tem as opções do pregão, com o aviso no lugar do edital", () => {
    const disputa = documentosDaModalidade("Dispensa Art. 75", "DISPUTE")
    const pregao = documentosDaModalidade("Pregão Eletrônico")
    expect(disputa).toEqual(pregao.map((tipo) => (tipo === "Edital" ? "Aviso" : tipo)))
    expect(ehObrigatorio("Dispensa Art. 75", "Aviso", "DISPUTE")).toBe(true)
    // O ETP vem marcado, mas não travado: a lei o faculta na dispensa por valor.
    expect(ehObrigatorio("Dispensa Art. 75", "ETP", "DISPUTE")).toBe(false)
    expect(regraDe("Dispensa Art. 75", "DISPUTE").recomendados).toEqual(["Cotação", "ETP", "Contrato"])
  })

  it("só recomenda o que é opcional na forma", () => {
    for (const [forma, regra] of Object.entries(REGRA_DA_DISPENSA)) {
      for (const tipo of regra.recomendados) {
        expect(regra.opcionais, `${forma} recomenda ${tipo}`).toContain(tipo)
      }
    }
  })

  it("sem forma declarada, a dispensa é a direta; fora da dispensa, a forma não conta", () => {
    expect(documentosDaModalidade("Dispensa Art. 75")).toEqual(documentosDaModalidade("Dispensa Art. 75", "DIRECT"))
    expect(documentosDaModalidade("Pregão Eletrônico", "DISPUTE")).toEqual(documentosDaModalidade("Pregão Eletrônico"))
    expect(documentosDaModalidade("Inexigibilidade", "DISPUTE")).not.toContain("Aviso")
  })

  it("reconhece a dispensa por valor pelo inciso", () => {
    expect(ehDispensaPorValor("VALUE_GENERAL")).toBe(true)
    expect(ehDispensaPorValor("VALUE_ENGINEERING")).toBe(true)
    expect(ehDispensaPorValor("OTHER")).toBe(false)
    expect(ehDispensaPorValor(undefined)).toBe(false)
  })

  it("o aviso fica depois do TR, em que se fundamenta, e não é anexo de nada", () => {
    expect(pendencias("Aviso", ["TR", "Aviso"], [])).toEqual(["TR"])
    expect(CATALOGO.Aviso.anexoDe).toBeUndefined()
    expect(agruparAnexos(["TR", "Aviso", "Contrato"]).map((g) => g.tipo)).toEqual(["TR", "Aviso", "Contrato"])
  })
})

describe("orientação dos documentos da contratação direta", () => {
  it("a inexigibilidade cita o Art. 74, e o ETP vem do Art. 72, I", () => {
    const texto = orientacaoDosDocumentos("Inexigibilidade")
    expect(texto).toMatch(/Art\. 74 da Lei 14\.133\/21/)
    expect(texto).toMatch(/ETP apenas se for o caso \(Art\. 72, I\)/)
  })

  it("a dispensa direta não tem edital nem aviso, e na dispensa por valor lembra o aviso", () => {
    expect(orientacaoDosDocumentos("Dispensa Art. 75", "DIRECT", "OTHER")).toMatch(/\(Art\. 72, I\)\.$/)
    expect(orientacaoDosDocumentos("Dispensa Art. 75", "DIRECT", "VALUE_GENERAL")).toMatch(/precedida de aviso \(Art\. 75, § 3º\)/)
  })

  it("a dispensa com disputa explica o aviso, e fora do valor diz que a disputa é a forma usual do valor", () => {
    expect(orientacaoDosDocumentos("Dispensa Art. 75", "DISPUTE", "VALUE_GENERAL")).toMatch(/facultativo \(Art\. 72, I\)\.$/)
    expect(orientacaoDosDocumentos("Dispensa Art. 75", "DISPUTE", "OTHER")).toMatch(/\(Art\. 75, I e II\)\.$/)
  })

  it("nada a dizer nas licitações, nem na dispensa sem forma declarada", () => {
    expect(orientacaoDosDocumentos("Pregão Eletrônico")).toBeNull()
    expect(orientacaoDosDocumentos("Dispensa Art. 75")).toBeNull()
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
