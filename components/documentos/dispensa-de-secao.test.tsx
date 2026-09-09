import { describe, expect, it, vi } from "vitest"

import { DispensaDeSecao } from "@/components/documentos/dispensa-de-secao"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import type { SecaoDocumento } from "@/lib/types"

const SECAO: SecaoDocumento = {
  id: "7",
  titulo: "Resultados Pretendidos",
  status: "Não iniciado",
  obrigatoria: false,
  origem: "catalogo" as const,
  conteudo: "",
  hint: "Descreva os resultados esperados.",
  fundamentoLegal: "Art. 18, § 1º, VII, Lei 14.133/21",
}

describe("dispensa de seção", () => {
  it("diz que a seção é dispensável e cita o fundamento", async () => {
    renderizar(
      <DispensaDeSecao secao={SECAO} pendente={false} onDispensar={vi.fn()} onDesfazer={vi.fn()} />,
    )

    expect(screen.getByText(/Art\. 18, § 2º/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /dispensar esta seção/i }))
    // O fundamento da própria seção aparece porque é ele que vai ao documento.
    expect(screen.getByText(/Art\. 18, § 1º, VII/)).toBeInTheDocument()
  })

  it("não registra dispensa sem justificativa, e diz o que falta", async () => {
    renderizar(
      <DispensaDeSecao secao={SECAO} pendente={false} onDispensar={vi.fn()} onDesfazer={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /dispensar esta seção/i }))
    const registrar = screen.getByRole("button", { name: /registrar dispensa/i })

    // Dispensa sem justificativa é o próprio problema que o passo resolve: a
    // seção sumiria do documento sem nada explicando.
    expect(registrar).toBeDisabled()
    const motivo = registrar.getAttribute("aria-describedby")
    expect(document.getElementById(motivo!)?.textContent).toMatch(/entra no documento/i)
  })

  it("entrega a justificativa aparada", async () => {
    const dispensar = vi.fn()
    renderizar(
      <DispensaDeSecao secao={SECAO} pendente={false} onDispensar={dispensar} onDesfazer={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /dispensar esta seção/i }))
    await userEvent.type(screen.getByRole("textbox"), "  Item único, sem métrica.  ")
    await userEvent.click(screen.getByRole("button", { name: /registrar dispensa/i }))

    expect(dispensar).toHaveBeenCalledWith("Item único, sem métrica.")
  })

  it("já dispensada, mostra a justificativa e permite desfazer", async () => {
    const desfazer = vi.fn()
    renderizar(
      <DispensaDeSecao
        secao={{ ...SECAO, justificativaDispensa: "Item único, sem métrica." }}
        pendente={false}
        onDispensar={vi.fn()}
        onDesfazer={desfazer}
      />,
    )

    expect(screen.getByText("Item único, sem métrica.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /desfazer dispensa/i }))

    // Dispensa registrada por engano precisa ter volta: sem isso, a saída seria
    // preencher a seção com texto qualquer só para tirar o parágrafo.
    expect(desfazer).toHaveBeenCalledOnce()
  })

  it("permite corrigir a justificativa já registrada", async () => {
    const dispensar = vi.fn()
    renderizar(
      <DispensaDeSecao
        secao={{ ...SECAO, justificativaDispensa: "Motivo antigo." }}
        pendente={false}
        onDispensar={dispensar}
        onDesfazer={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /editar justificativa/i }))
    await userEvent.clear(screen.getByRole("textbox"))
    await userEvent.type(screen.getByRole("textbox"), "Motivo correto.")
    await userEvent.click(screen.getByRole("button", { name: /registrar dispensa/i }))

    expect(dispensar).toHaveBeenCalledWith("Motivo correto.")
  })

  it("enquanto salva, nada aceita clique", () => {
    renderizar(
      <DispensaDeSecao secao={SECAO} pendente onDispensar={vi.fn()} onDesfazer={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: /dispensar esta seção/i })).toBeDisabled()
  })
})
