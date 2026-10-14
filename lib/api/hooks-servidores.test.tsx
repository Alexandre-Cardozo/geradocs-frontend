import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as acesso from "@/lib/api/access-client"
import { useServidoresDoOrgao } from "@/lib/api/hooks"

vi.mock("@/lib/api/access-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/access-client")>()),
  listarServidoresDoOrgao: vi.fn().mockResolvedValue([]),
}))

/**
 * A lista de colegas só é buscada quando a pessoa escolhe indicar outro
 * servidor (ADR-045 do back-end): quem conclui com os próprios dados não paga
 * a consulta.
 */
describe("servidores do órgão", () => {
  it("só busca quando habilitado", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { rerender, result } = renderHook(({ habilitado }) => useServidoresDoOrgao(habilitado), {
      wrapper,
      initialProps: { habilitado: false },
    })
    expect(acesso.listarServidoresDoOrgao).not.toHaveBeenCalled()

    rerender({ habilitado: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(acesso.listarServidoresDoOrgao).toHaveBeenCalledTimes(1)
  })
})
