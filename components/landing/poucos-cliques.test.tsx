import { describe, expect, it } from "vitest"

import { render, screen, userEvent, waitFor } from "@/lib/teste/renderizar"

import { PoucosCliques } from "./poucos-cliques"

describe("PoucosCliques", () => {
  it("lista as cinco etapas, do processo ao arquivo", () => {
    render(<PoucosCliques />)
    const etapas = screen.getByRole("list", { name: "Etapas do processo ao documento" }).querySelectorAll("li")
    expect(etapas).toHaveLength(5)
    expect(etapas[0]).toHaveTextContent("Abra o Processo")
    expect(etapas[4]).toHaveTextContent("Gere DOCX e PDF")
  })

  it("depois de montar, começa na primeira etapa; o clique leva à etapa escolhida", async () => {
    const usuario = userEvent.setup()
    render(<PoucosCliques />)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Abra o Processo/ })).toHaveAttribute("aria-current", "step"),
    )
    await usuario.click(screen.getByRole("button", { name: /Revise e Aceite/ }))
    expect(screen.getByRole("button", { name: /Revise e Aceite/ })).toHaveAttribute("aria-current", "step")
    expect(screen.getByRole("button", { name: /Abra o Processo/ })).not.toHaveAttribute("aria-current")
  })

  it("a janela é decorativa e as telas se declaram com dados ilustrativos", () => {
    const { container } = render(<PoucosCliques />)
    expect(container.querySelector("[data-etapa]")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText(/dados ilustrativos/)).toBeInTheDocument()
  })
})

describe("PoucosCliques: o cursor", () => {
  it("cada etapa mostra a sua tela real e leva o cursor ao alvo medido", async () => {
    const { default: ALVOS } = await import("@/lib/landing/alvos-das-telas.json")
    const usuario = userEvent.setup()
    const { container } = render(<PoucosCliques />)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Abra o Processo/ })).toHaveAttribute("aria-current", "step"),
    )
    await usuario.click(screen.getByRole("button", { name: /Gere Com IA/ }))
    const janela = container.querySelector("[data-etapa]") as HTMLElement
    expect(janela).toHaveAttribute("data-etapa", "2")
    const cursor = janela.querySelector<HTMLElement>('[style*="translate("]')
    expect(cursor?.style.transform).toBe(`translate(${ALVOS.editor.x}cqw, ${ALVOS.editor.y}cqh)`)
    const telas = janela.querySelectorAll("img")
    expect(telas).toHaveLength(5)
    expect(telas[2]).toHaveClass("opacity-100")
    expect(telas[0]).toHaveClass("opacity-0")
  })
})
