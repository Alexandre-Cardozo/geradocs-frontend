import { describe, expect, it } from "vitest"

import {
  empilharVersao,
  entradaDeHistorico,
  foiRetificado,
  notaDaVersao,
  proximaVersao,
  rotuloDaVersao,
  tituloComRotuloDeVersao,
} from "@/lib/dominio"

describe("proximaVersao", () => {
  it("a primeira geração é a versão 1", () => {
    expect(proximaVersao()).toBe(1)
    expect(proximaVersao(undefined)).toBe(1)
  })

  it("regerar incrementa", () => {
    expect(proximaVersao(1)).toBe(2)
    expect(proximaVersao(7)).toBe(8)
  })
})

describe("entradaDeHistorico", () => {
  it("distingue a geração inicial da regeração", () => {
    expect(entradaDeHistorico(1, "2026-08-21T10:00:00", "312 KB").nota).toBe("Geração inicial")
    expect(entradaDeHistorico(2, "2026-08-21T11:00:00", "312 KB").nota).toBe("Regeração")
  })

  it("guarda quando foi gerada e o tamanho", () => {
    const entrada = entradaDeHistorico(2, "2026-08-21T11:00:00", "348 KB")

    expect(entrada.versao).toBe(2)
    expect(entrada.geradoEm).toBe("2026-08-21T11:00:00")
    expect(entrada.tamanho).toBe("348 KB")
  })
})

describe("empilharVersao", () => {
  it("põe a mais recente no topo e preserva as anteriores", () => {
    // Regerar nunca sobrescreve sem rastro: é exigência de controle sobre um
    // documento que instrui processo de contratação.
    const historico = [entradaDeHistorico(1, "2026-08-20T10:00:00", "312 KB")]

    const atualizado = empilharVersao(historico, entradaDeHistorico(2, "2026-08-21T10:00:00", "315 KB"))

    expect(atualizado.map((v) => v.versao)).toEqual([2, 1])
    expect(historico).toHaveLength(1)
  })
})

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
  it("a nota diz a natureza e o que foi corrigido", () => {
    expect(
      notaDaVersao(2, { motivo: "erro_material", detalhe: "  Valor da seção 5 trocado.  " }),
    ).toBe("Retificação (Erro material): Valor da seção 5 trocado.")
  })

  it("distingue erro material de alteração substancial", () => {
    // Não é burocracia: alteração substancial muda o conteúdo da decisão e
    // costuma exigir republicação. No mesmo balaio, o histórico diria
    // "retificado" sem dizer o que aconteceu.
    expect(notaDaVersao(2, { motivo: "alteracao_substancial", detalhe: "Prazo alterado." })).toContain(
      "Alteração substancial",
    )
  })

  it("sem detalhe, registra ao menos a natureza", () => {
    expect(notaDaVersao(3, { motivo: "erro_material", detalhe: "   " })).toBe(
      "Retificação (Erro material)",
    )
  })

  it("regeração sem retificação declarada continua sendo regeração", () => {
    // Marcar toda regeração como retificação esvaziaria a palavra justamente
    // onde ela tem peso.
    expect(notaDaVersao(2)).toBe("Regeração")
    expect(notaDaVersao(1)).toBe("Geração inicial")
  })

  it("a entrada do histórico carrega a nota da retificação", () => {
    const entrada = entradaDeHistorico(2, "2026-08-22T10:00:00", "48 KB", {
      motivo: "erro_material",
      detalhe: "Nome do fornecedor.",
    })

    expect(entrada.nota).toBe("Retificação (Erro material): Nome do fornecedor.")
    expect(entrada.versao).toBe(2)
  })

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
