import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as api from "@/lib/api/client"
import * as contextos from "@/lib/api/contextos-client"
import { chaves, useConfirmarContextos, useContextosDaContratacao, useEstruturaDoDocumento } from "@/lib/api/hooks"

/**
 * Os contextos da contratação (ADR-061 do back-end): confirmar muda o que os
 * documentos oferecem e entra na trilha: os dois precisam recarregar.
 */
vi.mock("@/lib/api/contextos-client", () => ({
  contextosDoProcesso: vi.fn().mockResolvedValue({ versaoDoCatalogo: "2026-11", contextos: [] }),
  confirmarContextos: vi.fn().mockResolvedValue({ versaoDoCatalogo: "2026-11", contextos: [] }),
}))

vi.mock("@/lib/api/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/api/client")>()
  return { ...real, incluirTopicoDoContextoNoDocumento: vi.fn().mockResolvedValue({}) }
})

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function ambiente() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const invalidou = vi.spyOn(queryClient, "invalidateQueries")
  const gravou = vi.spyOn(queryClient, "setQueryData")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { invalidou, gravou, wrapper }
}

describe("hooks dos contextos da contratação", () => {
  it("a consulta só sai com processo, e pede o catálogo visto dele", async () => {
    const { wrapper } = ambiente()
    const { rerender, result } = renderHook(({ id }) => useContextosDaContratacao(id), {
      wrapper,
      initialProps: { id: "" },
    })
    expect(contextos.contextosDoProcesso).not.toHaveBeenCalled()

    rerender({ id: PROCESSO })

    await waitFor(() => expect(result.current.data?.versaoDoCatalogo).toBe("2026-11"))
    expect(contextos.contextosDoProcesso).toHaveBeenCalledWith(PROCESSO)
  })

  it("confirmar grava a resposta e recarrega os documentos e a trilha do processo", async () => {
    const { invalidou, gravou, wrapper } = ambiente()
    const { result } = renderHook(() => useConfirmarContextos(PROCESSO), { wrapper })

    await result.current.mutateAsync(["CONDUTOR_DE_VEICULO"])

    expect(contextos.confirmarContextos).toHaveBeenCalledWith(PROCESSO, ["CONDUTOR_DE_VEICULO"])
    expect(gravou).toHaveBeenCalledWith(chaves.contextos(PROCESSO), { versaoDoCatalogo: "2026-11", contextos: [] })
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["secoes", PROCESSO] })
    expect(invalidou).toHaveBeenCalledWith({ queryKey: chaves.trilha(PROCESSO) })
  })

  it("incluir o tópico recarrega a estrutura e o corpo, como as outras mudanças de estrutura", async () => {
    const { invalidou, wrapper } = ambiente()
    const { result } = renderHook(() => useEstruturaDoDocumento(PROCESSO, "ETP"), { wrapper })

    await result.current.incluirTopico.mutateAsync("CONVENCAO_COLETIVA")

    expect(api.incluirTopicoDoContextoNoDocumento).toHaveBeenCalledWith(PROCESSO, "ETP", "CONVENCAO_COLETIVA")
    expect(invalidou).toHaveBeenCalledWith({ queryKey: chaves.secoes(PROCESSO, "ETP") })
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["corpo-documento"] })
  })
})
