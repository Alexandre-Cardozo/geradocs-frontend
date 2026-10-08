import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { semBarraFinal, useRotaAtual } from "./use-rota-atual"

const rota = vi.hoisted(() => ({ atual: "/" }))
vi.mock("next/navigation", () => ({ usePathname: () => rota.atual }))

describe("semBarraFinal", () => {
  it("tira a barra final de uma rota", () => {
    expect(semBarraFinal("/processos/")).toBe("/processos")
    expect(semBarraFinal("/processos/novo/")).toBe("/processos/novo")
  })

  it("mantém a rota que já vem sem barra", () => {
    expect(semBarraFinal("/processos")).toBe("/processos")
  })

  it("mantém a raiz como raiz", () => {
    expect(semBarraFinal("/")).toBe("/")
    expect(semBarraFinal("//")).toBe("/")
  })
})

describe("useRotaAtual", () => {
  it("devolve o pathname sem a barra que o trailingSlash acrescenta", () => {
    rota.atual = "/configuracoes/timbre/"

    const { result } = renderHook(() => useRotaAtual())

    expect(result.current).toBe("/configuracoes/timbre")
  })
})
