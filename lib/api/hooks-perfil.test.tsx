import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as avatares from "@/lib/api/avatar-client"
import * as acesso from "@/lib/api/access-client"
import { chaves, useEnviarFotoDePerfil, useFotoDePerfil, useRedefinirSenhaDeServidor, useRemoverFotoDePerfil } from "@/lib/api/hooks"

/**
 * A foto vem de rota autenticada e vira object URL. O que se verifica aqui é o
 * que a biblioteca não faz sozinha: quem não tem foto não fica pendurado em
 * "carregando", e o blob anterior é revogado quando a foto muda — senão cada
 * troca deixaria um blob preso na memória da aba.
 */
vi.mock("@/lib/api/avatar-client", () => ({
  obterFotoDePerfil: vi.fn(),
  enviarFotoDePerfil: vi.fn(),
  removerFotoDePerfil: vi.fn(),
}))
vi.mock("@/lib/api/access-client", () => ({ redefinirSenhaDeUsuario: vi.fn() }))

function ambiente() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const invalidou = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { invalidou, wrapper }
}

const criou = vi.fn(() => "blob:foto-1")
const revogou = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom não implementa nenhum dos dois.
  Object.assign(URL, { createObjectURL: criou, revokeObjectURL: revogou })
})

afterEach(() => vi.clearAllMocks())

describe("useFotoDePerfil", () => {
  it("transforma os bytes em URL utilizável em <img>", async () => {
    vi.mocked(avatares.obterFotoDePerfil).mockResolvedValue(new Blob(["x"]))
    const { wrapper } = ambiente()

    const { result } = renderHook(() => useFotoDePerfil("u-1"), { wrapper })

    await waitFor(() => expect(result.current.url).toBe("blob:foto-1"))
    expect(avatares.obterFotoDePerfil).toHaveBeenCalledWith("u-1")
  })

  it("quem não pôs foto fica sem URL, e não em carregamento eterno", async () => {
    vi.mocked(avatares.obterFotoDePerfil).mockResolvedValue(null)
    const { wrapper } = ambiente()

    const { result } = renderHook(() => useFotoDePerfil("u-1"), { wrapper })

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.url).toBeNull()
    expect(criou).not.toHaveBeenCalled()
  })

  it("sem usuário não pergunta nada ao servidor", () => {
    const { wrapper } = ambiente()

    const { result } = renderHook(() => useFotoDePerfil(undefined), { wrapper })

    // A barra lateral monta antes de a sessão responder: buscar `/users//avatar`
    // daria 404 a cada carga da aplicação.
    expect(avatares.obterFotoDePerfil).not.toHaveBeenCalled()
    expect(result.current.carregando).toBe(false)
  })

  it("revoga a URL ao desmontar", async () => {
    vi.mocked(avatares.obterFotoDePerfil).mockResolvedValue(new Blob(["x"]))
    const { wrapper } = ambiente()

    const { result, unmount } = renderHook(() => useFotoDePerfil("u-1"), { wrapper })
    await waitFor(() => expect(result.current.url).toBe("blob:foto-1"))
    unmount()

    expect(revogou).toHaveBeenCalledWith("blob:foto-1")
  })
})

describe("mutações da foto", () => {
  it("enviar recarrega só a foto daquela pessoa", async () => {
    vi.mocked(avatares.enviarFotoDePerfil).mockResolvedValue({
      mediaType: "image/png",
      byteSize: 4,
      updatedAt: "2026-08-25T12:00:00Z",
    })
    const { wrapper, invalidou } = ambiente()

    const { result } = renderHook(() => useEnviarFotoDePerfil("u-1"), { wrapper })
    result.current.mutate(new File(["x"], "rosto.png", { type: "image/png" }))

    await waitFor(() =>
      expect(invalidou).toHaveBeenCalledWith({ queryKey: chaves.foto("u-1") }),
    )
  })

  it("remover também", async () => {
    vi.mocked(avatares.removerFotoDePerfil).mockResolvedValue(undefined)
    const { wrapper, invalidou } = ambiente()

    const { result } = renderHook(() => useRemoverFotoDePerfil("u-1"), { wrapper })
    result.current.mutate()

    await waitFor(() =>
      expect(invalidou).toHaveBeenCalledWith({ queryKey: chaves.foto("u-1") }),
    )
  })
})

describe("useRedefinirSenhaDeServidor", () => {
  it("devolve a senha e não invalida a listagem, que não mudou", async () => {
    vi.mocked(acesso.redefinirSenhaDeUsuario).mockResolvedValue("aBcD3fGh4JkLmN5p")
    const { wrapper, invalidou } = ambiente()

    const { result } = renderHook(() => useRedefinirSenhaDeServidor(), { wrapper })
    result.current.mutate("u-1")

    await waitFor(() => expect(result.current.data).toBe("aBcD3fGh4JkLmN5p"))
    expect(invalidou).not.toHaveBeenCalled()
  })
})
