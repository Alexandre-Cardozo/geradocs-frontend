import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as api from "@/lib/api/client"
import * as impressao from "@/lib/api/generation-client"
import { chaves, useExportarJuntada, useGeracoesDoDocumento, useJuntadas } from "@/lib/api/hooks"

vi.mock("@/lib/api/generation-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/generation-client")>()),
  listarJuntadas: vi.fn().mockResolvedValue([]),
  geracoesDoDocumento: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  baixarJuntadaDoProcesso: vi.fn().mockResolvedValue({ conteudo: new Blob(), nomeSugerido: null }),
}))

function ambiente() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const invalidou = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidou }
}

/** As juntadas e as gerações (ADR-049 do back-end). */
describe("hooks dos documentos gerados", () => {
  it("lista as juntadas do órgão ou do processo, e as gerações do documento", async () => {
    const { wrapper } = ambiente()

    const doOrgao = renderHook(() => useJuntadas(), { wrapper })
    const doProcesso = renderHook(() => useJuntadas("p-1"), { wrapper })
    const geracoes = renderHook(() => useGeracoesDoDocumento("p-1", "ETP"), { wrapper })

    await waitFor(() => expect(geracoes.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(doOrgao.result.current.isSuccess && doProcesso.result.current.isSuccess).toBe(true))
    expect(impressao.listarJuntadas).toHaveBeenCalledWith(undefined)
    expect(impressao.listarJuntadas).toHaveBeenCalledWith("p-1")
    expect(impressao.geracoesDoDocumento).toHaveBeenCalledWith("p-1", "ETP")
    expect(chaves.juntadas()).toEqual(["juntadas", "todas"])
  })

  it("exportar recarrega as juntadas e a trilha do processo", async () => {
    const { wrapper, invalidou } = ambiente()
    const { result } = renderHook(() => useExportarJuntada(), { wrapper })

    await result.current.mutateAsync({ processoId: "p-1", formato: "PDF", ordem: ["TR"] })

    expect(api.baixarJuntadaDoProcesso).toHaveBeenCalledWith("p-1", "PDF", ["TR"])
    const chavesInvalidadas = invalidou.mock.calls.map(([filtro]) => JSON.stringify(filtro?.queryKey))
    expect(chavesInvalidadas).toContain(JSON.stringify(["juntadas"]))
    expect(chavesInvalidadas).toContain(JSON.stringify(chaves.trilha("p-1")))
  })
})
