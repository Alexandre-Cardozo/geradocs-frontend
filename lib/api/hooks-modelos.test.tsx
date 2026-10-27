import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import * as api from "@/lib/api/client"
import * as modelos from "@/lib/api/modelos-client"
import { useDetalheDoModelo, useJustificarDesvio, useJustificarModelo, useModelosDoOrgao } from "@/lib/api/hooks"

/**
 * Os modelos do órgão e as justificativas da minuta (§88): publicar recarrega a
 * lista e os documentos abertos; justificar devolve o documento e recarrega a
 * trilha, onde a justificativa fica registrada.
 */
vi.mock("@/lib/api/modelos-client", () => ({
  listarModelos: vi.fn().mockResolvedValue({ agu: [], doOrgao: [] }),
  detalheDoModelo: vi.fn().mockResolvedValue({ codigo: "AGU-EDITAL-PC", secoes: [] }),
  publicarModelo: vi.fn().mockResolvedValue(undefined),
  publicarVersaoDoModelo: vi.fn().mockResolvedValue(undefined),
  desativarModelo: vi.fn().mockResolvedValue(undefined),
}))

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

describe("hooks dos modelos do órgão", () => {
  it("publicar recarrega a lista e os documentos", async () => {
    const { invalidou, wrapper } = ambiente()
    const { result } = renderHook(() => useModelosDoOrgao(), { wrapper })

    await result.current.desativar.mutateAsync("ORG-0A1B2C3D")

    expect(modelos.desativarModelo).toHaveBeenCalled()
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["modelos-de-estrutura"] })
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["secoes"] })
  })

  it("o detalhe só é buscado com um modelo escolhido", async () => {
    const { wrapper } = ambiente()
    const { rerender } = renderHook(({ codigo }) => useDetalheDoModelo(codigo), {
      wrapper,
      initialProps: { codigo: null as string | null },
    })
    expect(modelos.detalheDoModelo).not.toHaveBeenCalled()

    rerender({ codigo: "AGU-EDITAL-PC" })
    await waitFor(() => expect(modelos.detalheDoModelo).toHaveBeenCalledWith("AGU-EDITAL-PC"))
  })

  it("justificar grava o documento devolvido e recarrega a trilha", async () => {
    const documento = { tipo: "Edital" } as never
    vi.spyOn(api, "justificarModelo").mockResolvedValue(documento)
    vi.spyOn(api, "justificarDesvio").mockResolvedValue(documento)
    const { invalidou, gravou, wrapper } = ambiente()
    const doModelo = renderHook(() => useJustificarModelo("p1", "Edital"), { wrapper })
    const doDesvio = renderHook(() => useJustificarDesvio("p1", "Edital"), { wrapper })

    await doModelo.result.current.mutateAsync("Motivo.")
    await doDesvio.result.current.mutateAsync({ secaoId: "PC01", texto: "Alteração." })

    expect(api.justificarModelo).toHaveBeenCalledWith("p1", "Edital", "Motivo.")
    expect(api.justificarDesvio).toHaveBeenCalledWith("p1", "Edital", "PC01", "Alteração.")
    expect(gravou).toHaveBeenCalledWith(["secoes", "p1", "Edital"], documento)
    expect(invalidou).toHaveBeenCalledWith({ queryKey: ["trilha", "p1"] })
  })
})
