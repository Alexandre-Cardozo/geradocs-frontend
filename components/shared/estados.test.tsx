import { describe, expect, it, vi } from "vitest"

import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

describe("estados de tela", () => {
  it("mostra a mensagem do erro e permite tentar de novo", async () => {
    const tentarNovamente = vi.fn()
    renderizar(<ErrorState message="Servidor indisponível." onRetry={tentarNovamente} />)

    expect(screen.getByText("Servidor indisponível.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button"))

    expect(tentarNovamente).toHaveBeenCalledOnce()
  })

  it("anuncia carregamento com o rótulo recebido", () => {
    renderizar(<LoadingState label="Carregando ETP..." />)

    expect(screen.getByText("Carregando ETP...")).toBeInTheDocument()
  })

  it("explica o vazio em vez de mostrar tela em branco", () => {
    renderizar(
      <EmptyState message="Nenhum processo encontrado">
        <span>Crie o primeiro processo.</span>
      </EmptyState>,
    )

    expect(screen.getByText("Nenhum processo encontrado")).toBeInTheDocument()
    expect(screen.getByText("Crie o primeiro processo.")).toBeInTheDocument()
  })
})
