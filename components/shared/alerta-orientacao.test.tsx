import { describe, expect, it, vi } from "vitest"

import { AlertaOrientacao } from "@/components/shared/alerta-orientacao"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * O contrato do padrão de alerta do produto: **orienta e deixa seguir**.
 *
 * Se algum dia ele passar a bloquear, é aqui que quebra — e é aqui que a
 * discussão volta, porque travar transforma orientação em obstáculo e empurra o
 * servidor para fora da plataforma, onde nada fica registrado.
 */
describe("alerta de orientação", () => {
  const padrao = {
    titulo: "A troca muda os documentos cabíveis",
    recomendacao: "Ajustar a lista para o que Dispensa de Licitação comporta.",
  }

  it("mostra a recomendação e as duas saídas", () => {
    renderizar(<AlertaOrientacao {...padrao} onSeguir={vi.fn()} onDivergir={vi.fn()} />)

    expect(screen.getByText(padrao.titulo)).toBeInTheDocument()
    expect(screen.getByText(padrao.recomendacao)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /seguir a recomendação/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /manter e justificar/i })).toBeEnabled()
  })

  it("seguir a recomendação não pede justificativa", async () => {
    const seguir = vi.fn()
    renderizar(<AlertaOrientacao {...padrao} onSeguir={seguir} onDivergir={vi.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: /seguir a recomendação/i }))

    // Quem aceita a orientação não deve nada a ninguém: exigir texto aqui faria
    // o caminho recomendado ser o mais caro.
    expect(seguir).toHaveBeenCalledOnce()
  })

  it("divergir sem justificativa não confirma, e diz por quê", async () => {
    renderizar(<AlertaOrientacao {...padrao} onSeguir={vi.fn()} onDivergir={vi.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: /manter e justificar/i }))
    const confirmar = screen.getByRole("button", { name: /confirmar e registrar/i })

    expect(confirmar).toBeDisabled()
    // Sem o vínculo, quem chega pelo teclado ouve "botão desabilitado" e não
    // descobre que falta preencher.
    const motivo = confirmar.getAttribute("aria-describedby")
    expect(motivo).not.toBeNull()
    expect(document.getElementById(motivo!)?.textContent).toMatch(/trilha do processo/i)
  })

  it("divergir com justificativa entrega o texto aparado", async () => {
    const divergir = vi.fn()
    renderizar(<AlertaOrientacao {...padrao} onSeguir={vi.fn()} onDivergir={divergir} />)

    await userEvent.click(screen.getByRole("button", { name: /manter e justificar/i }))
    await userEvent.type(screen.getByRole("textbox"), "  O edital já foi publicado.  ")
    await userEvent.click(screen.getByRole("button", { name: /confirmar e registrar/i }))

    expect(divergir).toHaveBeenCalledWith("O edital já foi publicado.")
  })

  it("enquanto salva, nenhuma das saídas aceita clique", async () => {
    const seguir = vi.fn()
    renderizar(<AlertaOrientacao {...padrao} pendente onSeguir={seguir} onDivergir={vi.fn()} />)

    // Sem isto, o duplo clique manda a mesma troca duas vezes e a trilha ganha
    // dois eventos para uma decisão.
    expect(screen.getByRole("button", { name: /seguir a recomendação/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /manter e justificar/i })).toBeDisabled()
  })

  it("cancelar só aparece quando há para onde voltar", async () => {
    const cancelar = vi.fn()
    const { rerender } = renderizar(
      <AlertaOrientacao {...padrao} onSeguir={vi.fn()} onDivergir={vi.fn()} />,
    )
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument()

    rerender(
      <AlertaOrientacao {...padrao} onSeguir={vi.fn()} onDivergir={vi.fn()} onCancelar={cancelar} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }))

    expect(cancelar).toHaveBeenCalledOnce()
  })

  it("mostra os detalhes que sustentam a recomendação", () => {
    renderizar(
      <AlertaOrientacao
        {...padrao}
        detalhes={<span>Já gerado e deixa de ser cabível: Edital</span>}
        onSeguir={vi.fn()}
        onDivergir={vi.fn()}
      />,
    )

    // Recomendação sem o porquê é ordem. Com o porquê, é orientação — e o
    // servidor consegue discordar com fundamento.
    expect(screen.getByText(/já gerado e deixa de ser cabível/i)).toBeInTheDocument()
  })
})
