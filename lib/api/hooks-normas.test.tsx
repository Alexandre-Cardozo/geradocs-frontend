import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as normas from "@/lib/api/regulation-client"
import { useNormas, useVersoesDaNorma } from "@/lib/api/hooks"

/**
 * Toda alteração no acervo recarrega a lista: a resposta traz só a norma
 * alterada, e a ordem (vigentes primeiro) depende de todas.
 */
vi.mock("@/lib/api/regulation-client", () => ({
  listarNormas: vi.fn().mockResolvedValue([]),
  cadastrarNorma: vi.fn().mockResolvedValue({}),
  corrigirNorma: vi.fn().mockResolvedValue({}),
  trocarArquivoDaNorma: vi.fn().mockResolvedValue({}),
  revogarNorma: vi.fn().mockResolvedValue({}),
  restabelecerNorma: vi.fn().mockResolvedValue({}),
  excluirNorma: vi.fn().mockResolvedValue(undefined),
  versoesDaNorma: vi.fn().mockResolvedValue([]),
}))

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

describe("hooks das normas do órgão", () => {
  it("cada operação recarrega a lista", async () => {
    const { invalidou, wrapper } = ambiente()
    const { result } = renderHook(() => useNormas(), { wrapper })

    await result.current.excluir.mutateAsync({ id: "n1", justificativa: "Cadastrada por engano" })

    expect(normas.excluirNorma).toHaveBeenCalled()
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["normas"] })
  })

  it("as versões só são buscadas quando o painel delas abre", async () => {
    const { wrapper } = ambiente()
    const { rerender } = renderHook(({ aberto }) => useVersoesDaNorma("n1", aberto), {
      wrapper,
      initialProps: { aberto: false },
    })
    expect(normas.versoesDaNorma).not.toHaveBeenCalled()

    rerender({ aberto: true })
    await waitFor(() => expect(normas.versoesDaNorma).toHaveBeenCalledWith("n1"))
  })
})
