import { describe, expect, it } from "vitest"

import { ORDEM_FLUXO } from "@/lib/documentos"
import { secoesPorTipoBase } from "@/lib/documentos/secoes"
import type { TipoDocumento } from "@/lib/types"

/**
 * A lei vira teste.
 *
 * A estrutura seccional dos documentos não é escolha de produto: cada seção
 * corresponde a um inciso, uma alínea ou uma cláusula da Lei 14.133/21. Alterar
 * a contagem ou a obrigatoriedade sem alterar a lei é defeito, e é isto que
 * estes testes travam.
 */

const obrigatoriasEsperadas: Record<TipoDocumento, number> = {
  "Cotação": 5,
  ETP: 5,
  Mapa: 5,
  TR: 10,
  Edital: 13,
  Contrato: 16,
}

const totalEsperado: Record<TipoDocumento, number> = {
  "Cotação": 5,
  ETP: 13,
  Mapa: 6,
  TR: 10,
  Edital: 14,
  Contrato: 19,
}

describe("estrutura seccional por documento", () => {
  it.each(ORDEM_FLUXO)("%s tem a quantidade de seções que a lei prevê", (tipo) => {
    expect(secoesPorTipoBase[tipo]).toHaveLength(totalEsperado[tipo])
  })

  it.each(ORDEM_FLUXO)("%s tem a quantidade certa de seções indispensáveis", (tipo) => {
    const obrigatorias = secoesPorTipoBase[tipo].filter((secao) => secao.obrigatoria)
    expect(obrigatorias).toHaveLength(obrigatoriasEsperadas[tipo])
  })

  it("no ETP, só cinco dos treze incisos são indispensáveis", () => {
    // Art. 18, § 2º: os demais podem ser dispensados mediante justificativa.
    // Tornar todos obrigatórios travaria contratação que a lei permite instruir
    // sem eles — é a diferença entre orientar e impedir.
    const etp = secoesPorTipoBase.ETP
    expect(etp.filter((s) => s.obrigatoria).map((s) => s.titulo)).toEqual([
      "Descrição da Necessidade",
      "Estimativa das Quantidades",
      "Estimativa do Valor da Contratação",
      "Justificativas para o Parcelamento",
      "Posicionamento Conclusivo",
    ])
  })

  it("no TR, toda alínea do Art. 6º, XXIII é indispensável", () => {
    expect(secoesPorTipoBase.TR.every((secao) => secao.obrigatoria)).toBe(true)
  })
})

describe("toda seção orienta quem escreve", () => {
  it.each(ORDEM_FLUXO)("%s cita fundamento legal literal em cada seção", (tipo) => {
    for (const secao of secoesPorTipoBase[tipo]) {
      expect(secao.fundamentoLegal!.trim(), `${tipo} — ${secao.titulo}`).not.toBe("")
    }
  })

  it.each(ORDEM_FLUXO)("%s traz orientação em cada seção", (tipo) => {
    // O par fundamento + hint é o que orienta o servidor na tela e o que
    // instruirá o modelo de IA a redigir a seção. Seção sem hint deixa os dois
    // sem contexto.
    for (const secao of secoesPorTipoBase[tipo]) {
      expect(secao.hint!.trim(), `${tipo} — ${secao.titulo}`).not.toBe("")
    }
  })

  it.each(ORDEM_FLUXO)("%s numera as seções em sequência, sem repetir", (tipo) => {
    const ids = secoesPorTipoBase[tipo].map((secao) => secao.id)
    expect(ids).toEqual(ids.map((_, indice) => String(indice + 1)))
  })

  it.each(ORDEM_FLUXO)("%s não repete título de seção", (tipo) => {
    const titulos = secoesPorTipoBase[tipo].map((secao) => secao.titulo)
    expect(new Set(titulos).size).toBe(titulos.length)
  })
})

describe("painéis especiais", () => {
  it("estão só onde a seção exige entrada estruturada", () => {
    const comPainel = ORDEM_FLUXO.flatMap((tipo) =>
      secoesPorTipoBase[tipo].filter((s) => s.painel).map((s) => `${tipo}:${s.painel}`),
    )
    // Quantidades (inciso IV), ATA (inciso V) e valor (inciso VI) — todos no ETP.
    expect(comPainel.sort()).toEqual(["ETP:ata", "ETP:quantidades", "ETP:valor"])
  })
})
