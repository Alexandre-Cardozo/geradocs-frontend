import { describe, expect, it } from "vitest"

import { empilharVersao, entradaDeHistorico, proximaVersao, rotuloDaVersao } from "@/lib/dominio"

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
