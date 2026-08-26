import { describe, expect, it } from "vitest"

import {
  foiRetificado,
  rotuloDaVersao,
  tituloComRotuloDeVersao,
} from "@/lib/dominio"

/**
 * O que sobrou do versionamento na interface.
 *
 * <p>Quem monta o histórico é o servidor desde o Bloco 10: a nota de cada
 * versão vem pronta. `proximaVersao`, `entradaDeHistorico`, `empilharVersao` e
 * `notaDaVersao` saíram em 26/08/2026 junto com o histórico em memória que as
 * chamava — testar função que ninguém usa dá cobertura, não garantia.
 */

describe("rotuloDaVersao", () => {
  it("a primeira versão não é retificação", () => {
    expect(rotuloDaVersao(1)).toBe("v1")
  })

  it("da segunda em diante o documento é retificado", () => {
    expect(rotuloDaVersao(2)).toBe("v2 · RETIFICADO")
    expect(rotuloDaVersao(5)).toBe("v5 · RETIFICADO")
  })
})

describe("retificação", () => {
  it("o título carrega o rótulo, porque o arquivo sai da plataforma", () => {
    // O badge da tela não viaja junto com o arquivo anexado ao processo no
    // sistema da prefeitura. O título, sim.
    expect(tituloComRotuloDeVersao("ETP — Aquisição de notebooks", 1)).toBe(
      "ETP — Aquisição de notebooks",
    )
    expect(tituloComRotuloDeVersao("ETP — Aquisição de notebooks", 3)).toBe(
      "ETP — Aquisição de notebooks (RETIFICADO — v3)",
    )
  })

  it("retificado vale da segunda versão em diante", () => {
    expect(foiRetificado(1)).toBe(false)
    expect(foiRetificado(2)).toBe(true)
  })
})
