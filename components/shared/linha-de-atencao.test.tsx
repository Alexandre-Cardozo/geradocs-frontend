import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui"
import { LinhaDeAtencao } from "@/components/shared/linha-de-atencao"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/** A linha de atenção da seção (§115): uma linha só, ações à direita, detalhe a pedido. */
describe("linha de atenção", () => {
  it("diz o que falta numa linha, com as ações ao lado, no tom de atenção por padrão", async () => {
    const corrigir = vi.fn()
    const { container } = renderizar(
      <LinhaDeAtencao acoes={<Button size="sm" onClick={corrigir}>Corrigir</Button>}>
        A memória de cálculo não cita a fonte.
      </LinhaDeAtencao>,
    )

    expect(screen.getByText("A memória de cálculo não cita a fonte.")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-tint-warning-bg")
    await userEvent.click(screen.getByRole("button", { name: "Corrigir" }))
    expect(corrigir).toHaveBeenCalledOnce()
  })

  it("o detalhe abre e fecha na própria linha, anunciando o estado", async () => {
    renderizar(
      <LinhaDeAtencao tom="resolvido" detalhe={{ rotulo: "Ver", conteudo: <p>A justificativa.</p> }}>
        Alteração justificada.
      </LinhaDeAtencao>,
    )

    const botao = screen.getByRole("button", { name: "Ver" })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("A justificativa.")).not.toBeInTheDocument()

    await userEvent.click(botao)
    const aberto = screen.getByRole("button", { name: "Ocultar" })
    expect(aberto).toHaveAttribute("aria-expanded", "true")
    expect(document.getElementById(aberto.getAttribute("aria-controls") as string)).toHaveTextContent("A justificativa.")

    await userEvent.click(aberto)
    expect(screen.queryByText("A justificativa.")).not.toBeInTheDocument()
  })

  it("pode abrir já aberta, com rótulo próprio para fechar, e sem ações nem detalhe é só a frase", () => {
    const { container, unmount } = renderizar(
      <LinhaDeAtencao
        tom="neutro"
        detalhe={{ rotulo: "Ver", rotuloAberto: "Fechar", conteudo: <p>Detalhe.</p>, abertoAoMontar: true }}
      >
        Registro.
      </LinhaDeAtencao>,
    )
    expect(container.firstElementChild).toHaveClass("bg-surface")
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument()
    expect(screen.getByText("Detalhe.")).toBeInTheDocument()
    unmount()

    renderizar(<LinhaDeAtencao>Só a frase.</LinhaDeAtencao>)
    expect(screen.getByText("Só a frase.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
