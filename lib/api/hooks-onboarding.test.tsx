import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as onboarding from "@/lib/api/onboarding-client"
import { useEnviarLead, useMunicipiosDaUf } from "@/lib/api/hooks"
import { RESPOSTAS_VAZIAS } from "@/lib/onboarding/respostas"

vi.mock("@/lib/api/onboarding-client", () => ({
  enviarLead: vi.fn().mockResolvedValue(undefined),
  municipiosDaUf: vi.fn().mockResolvedValue([{ nome: "Colatina", codigoIbge: "3201506" }]),
}))

function ambiente() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

describe("hooks do onboarding (§130)", () => {
  it("só busca municípios depois de escolher a UF", async () => {
    const { wrapper } = ambiente()
    const { result, rerender } = renderHook(({ uf }: { uf?: string }) => useMunicipiosDaUf(uf), {
      wrapper,
      initialProps: {},
    })
    expect(result.current.fetchStatus).toBe("idle")
    expect(onboarding.municipiosDaUf).not.toHaveBeenCalled()
    rerender({ uf: "ES" })
    await waitFor(() => expect(result.current.data).toEqual([{ nome: "Colatina", codigoIbge: "3201506" }]))
    expect(onboarding.municipiosDaUf).toHaveBeenCalledWith("ES")
  })

  it("envia o lead com a origem", async () => {
    const { wrapper } = ambiente()
    const { result } = renderHook(() => useEnviarLead(), { wrapper })
    await result.current.mutateAsync({ respostas: RESPOSTAS_VAZIAS, origem: "instagram" })
    expect(onboarding.enviarLead).toHaveBeenCalledWith(RESPOSTAS_VAZIAS, "instagram")
  })
})
