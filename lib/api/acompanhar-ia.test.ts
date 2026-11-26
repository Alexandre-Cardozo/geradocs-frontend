import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { acompanharIa, registrarPalcoDaIa, type PalcoDaIa } from "./acompanhar-ia"

function palcoDeTeste(): PalcoDaIa & { eventos: string[] } {
  const eventos: string[] = []
  return {
    eventos,
    esperaMinimaMs: 1700,
    celebracaoMs: 1600,
    entrar: () => eventos.push("entrar"),
    concluir: () => eventos.push("concluir"),
    falhar: () => eventos.push("falhar"),
    sair: () => eventos.push("sair"),
  }
}

describe("acompanharIa", () => {
  let retirar: () => void = () => {}
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    retirar()
    vi.useRealTimers()
  })

  it("sem palco, a chamada passa direto e sem atraso", async () => {
    await expect(acompanharIa(() => Promise.resolve(7))).resolves.toBe(7)
  })

  it("resposta imediata: espera o mínimo, comemora e só então entrega", async () => {
    const palco = palcoDeTeste()
    retirar = registrarPalcoDaIa(palco)
    let agora = 0
    let entregue = false
    const pedido = acompanharIa(() => Promise.resolve("texto"), { relogio: () => agora }).then((r) => {
      entregue = true
      return r
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(palco.eventos).toEqual(["entrar"])
    agora = 1699
    await vi.advanceTimersByTimeAsync(1699)
    expect(palco.eventos).toEqual(["entrar"])
    agora = 1700
    await vi.advanceTimersByTimeAsync(1)
    expect(palco.eventos).toEqual(["entrar", "concluir"])
    expect(entregue).toBe(false)
    await vi.advanceTimersByTimeAsync(1600)
    await expect(pedido).resolves.toBe("texto")
    expect(palco.eventos).toEqual(["entrar", "concluir", "sair"])
  })

  it("resposta demorada: comemora assim que chega, sem esperar de novo", async () => {
    const palco = palcoDeTeste()
    retirar = registrarPalcoDaIa(palco)
    let agora = 0
    const pedido = acompanharIa(
      () =>
        new Promise<number>((resolver) =>
          setTimeout(() => {
            agora = 9000
            resolver(1)
          }, 9000),
        ),
      { relogio: () => agora },
    )
    await vi.advanceTimersByTimeAsync(9000)
    expect(palco.eventos).toEqual(["entrar", "concluir"])
    await vi.advanceTimersByTimeAsync(1600)
    await expect(pedido).resolves.toBe(1)
  })

  it("erro: o Bô fica triste e sai, e o erro chega na hora", async () => {
    const palco = palcoDeTeste()
    retirar = registrarPalcoDaIa(palco)
    const pedido = acompanharIa(() => Promise.reject(new Error("limite")))
    await expect(pedido).rejects.toThrow("limite")
    expect(palco.eventos).toEqual(["entrar", "falhar", "sair"])
  })

  it("trabalho que junta as falhas: sem nada que deu certo, não comemora", async () => {
    const palco = palcoDeTeste()
    retirar = registrarPalcoDaIa(palco)
    await expect(acompanharIa(() => Promise.resolve({ ok: 0 }), { deuCerto: (r) => r.ok > 0 })).resolves.toEqual({ ok: 0 })
    expect(palco.eventos).toEqual(["entrar", "falhar", "sair"])
  })

  it("uma ação dentro de outra não chama o Bô de novo", async () => {
    const palco = palcoDeTeste()
    retirar = registrarPalcoDaIa(palco)
    const lote = acompanharIa(async () => {
      await acompanharIa(() => Promise.resolve(1))
      await acompanharIa(() => Promise.resolve(2))
      return 3
    })
    await vi.runAllTimersAsync()
    await expect(lote).resolves.toBe(3)
    expect(palco.eventos).toEqual(["entrar", "concluir", "sair"])
  })

  it("retirar um palco que já foi trocado não apaga o novo", async () => {
    const antigo = palcoDeTeste()
    const novo = palcoDeTeste()
    const retirarAntigo = registrarPalcoDaIa(antigo)
    retirar = registrarPalcoDaIa(novo)
    retirarAntigo()
    await expect(acompanharIa(() => Promise.reject(new Error("x")))).rejects.toThrow()
    expect(novo.eventos).toEqual(["entrar", "falhar", "sair"])
    expect(antigo.eventos).toEqual([])
  })
})
