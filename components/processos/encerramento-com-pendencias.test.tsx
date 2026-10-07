import { describe, expect, it, vi } from "vitest"

import { EncerramentoComPendencias } from "@/components/processos/encerramento-com-pendencias"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * Encerrar com documento por gerar: orienta e deixa seguir, mas só com
 * justificativa — é ela que responde ao controle depois.
 */
const PENDENTES = ["Estudo Técnico Preliminar", "Termo de Referência"]

function abrir(pendente = false) {
  const confirmar = vi.fn()
  const cancelar = vi.fn()
  renderizar(
    <EncerramentoComPendencias
      pendentes={PENDENTES}
      pendente={pendente}
      onConfirmar={confirmar}
      onCancelar={cancelar}
    />,
  )
  return { confirmar, cancelar }
}

describe("encerramento com pendências", () => {
  it("é um diálogo modal que lista o que falta e põe o foco no campo", () => {
    abrir()

    const dialogo = screen.getByRole("dialog", { name: /encerrar processo com pendências/i })
    expect(dialogo).toHaveAttribute("aria-modal", "true")
    expect(dialogo).toHaveAccessibleDescription(/Faltam gerar 2 documentos/)
    expect(screen.getByText("Estudo Técnico Preliminar")).toBeInTheDocument()
    expect(screen.getByText("Termo de Referência")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: /justificativa/i })).toHaveFocus()
  })

  it("sem justificativa não confirma, e diz por quê", async () => {
    const { confirmar } = abrir()

    await userEvent.type(screen.getByRole("textbox", { name: /justificativa/i }), "   ")
    const botao = screen.getByRole("button", { name: /encerrar mesmo assim/i })

    expect(botao).toBeDisabled()
    expect(botao).toHaveAccessibleDescription(/Obrigatória/)
    expect(confirmar).not.toHaveBeenCalled()
  })

  it("com justificativa, confirma com o texto aparado", async () => {
    const { confirmar } = abrir()

    await userEvent.type(
      screen.getByRole("textbox", { name: /justificativa/i }),
      "  Edital será feito no sistema da entidade.  ",
    )
    await userEvent.click(screen.getByRole("button", { name: /encerrar mesmo assim/i }))

    expect(confirmar).toHaveBeenCalledWith("Edital será feito no sistema da entidade.")
  })

  it("Esc e Cancelar fecham sem encerrar", async () => {
    const { confirmar, cancelar } = abrir()

    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))

    expect(cancelar).toHaveBeenCalledTimes(2)
    expect(confirmar).not.toHaveBeenCalled()
  })

  it("o Tab não sai da janela", async () => {
    abrir()
    await userEvent.type(screen.getByRole("textbox", { name: /justificativa/i }), "Motivo.")

    await userEvent.tab()
    expect(screen.getByRole("button", { name: /cancelar/i })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: /encerrar mesmo assim/i })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole("textbox", { name: /justificativa/i })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole("button", { name: /encerrar mesmo assim/i })).toHaveFocus()
  })

  it("enquanto encerra, não cancela nem confirma de novo", async () => {
    const { cancelar } = abrir(true)

    await userEvent.keyboard("{Escape}")

    expect(cancelar).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /encerrando/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled()
  })

  it("ao fechar, devolve o foco a quem abriu", () => {
    const gatilho = document.createElement("button")
    document.body.appendChild(gatilho)
    gatilho.focus()

    const { unmount } = renderizar(
      <EncerramentoComPendencias pendentes={PENDENTES} pendente={false} onConfirmar={vi.fn()} onCancelar={vi.fn()} />,
    )
    expect(gatilho).not.toHaveFocus()
    unmount()

    expect(gatilho).toHaveFocus()
    gatilho.remove()
  })
})
