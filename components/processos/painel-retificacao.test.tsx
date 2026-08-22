import { describe, expect, it, vi } from "vitest"

import { PainelRetificacao } from "@/components/processos/painel-retificacao"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * Retificar exige dizer **o quê** e **de que natureza** — é essa a informação
 * que o controle procura no histórico, e é ela que decide se houve republicação.
 */
describe("painel de retificação", () => {
  const padrao = {
    processoId: "PROC-2024-089",
    tipo: "ETP" as const,
    versaoAtual: 1,
    pendente: false,
  }

  it("oferece as duas naturezas, com a diferença explicada", () => {
    renderizar(<PainelRetificacao {...padrao} onConfirmar={vi.fn()} onCancelar={vi.fn()} />)

    expect(screen.getByText("Erro material")).toBeInTheDocument()
    expect(screen.getByText("Alteração substancial")).toBeInTheDocument()
    // Sem a explicação, a escolha vira sorteio — e ela muda se o documento
    // precisa ou não ser republicado.
    expect(screen.getByText(/costuma exigir republicação/i)).toBeInTheDocument()
  })

  it("não confirma sem natureza e sem descrição, e diz o que falta", async () => {
    renderizar(<PainelRetificacao {...padrao} onConfirmar={vi.fn()} onCancelar={vi.fn()} />)
    const confirmar = screen.getByRole("button", { name: /retificar e gerar v2/i })

    expect(confirmar).toBeDisabled()
    const motivo = confirmar.getAttribute("aria-describedby")
    expect(document.getElementById(motivo!)?.textContent).toMatch(/natureza da retificação/i)

    // Só a natureza não basta: "erro material" sem dizer qual deixa a pergunta
    // seguinte sempre em aberto.
    await userEvent.click(screen.getByText("Erro material"))
    expect(confirmar).toBeDisabled()
  })

  it("entrega natureza e descrição aparada", async () => {
    const confirmar = vi.fn()
    renderizar(<PainelRetificacao {...padrao} onConfirmar={confirmar} onCancelar={vi.fn()} />)

    await userEvent.click(screen.getByText("Alteração substancial"))
    await userEvent.type(screen.getByRole("textbox"), "  Prazo de entrega alterado.  ")
    await userEvent.click(screen.getByRole("button", { name: /retificar e gerar v2/i }))

    expect(confirmar).toHaveBeenCalledWith({
      motivo: "alteracao_substancial",
      detalhe: "Prazo de entrega alterado.",
    })
  })

  it("mostra o histórico junto, com o motivo de cada versão", async () => {
    renderizar(<PainelRetificacao {...padrao} onConfirmar={vi.fn()} onCancelar={vi.fn()} />)

    // A pergunta que antecede toda retificação é "o que já foi retificado aqui
    // antes?". Mandá-la para outra tela é fazer a pessoa decidir sem o dado.
    expect(await screen.findByText("Histórico deste documento")).toBeInTheDocument()
    expect(screen.getByText("Geração inicial")).toBeInTheDocument()
    expect(screen.getByText("v1")).toBeInTheDocument()
  })

  it("enquanto retifica, nada aceita clique", () => {
    renderizar(<PainelRetificacao {...padrao} pendente onConfirmar={vi.fn()} onCancelar={vi.fn()} />)

    expect(screen.getByRole("button", { name: /retificando/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled()
  })
})
