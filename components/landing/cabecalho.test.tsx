import { describe, expect, it } from "vitest"

import { fireEvent, render, screen, userEvent } from "@/lib/teste/renderizar"

import { Cabecalho } from "./cabecalho"

/**
 * Termina a animação do menu. O jsdom não tem `AnimationEvent`, e nesse caso o React
 * escuta o nome com prefixo (`webkitAnimationEnd`) em vez de `animationend`;
 * `fireEvent.animationEnd` sozinho não chegaria ao `onAnimationEnd`. Dispara os dois
 * nomes: o tratador é idempotente, e o que sobrar no elemento já removido é inócuo.
 */
function terminarAnimacao(elemento: HTMLElement) {
  fireEvent(elemento, new Event("animationend", { bubbles: true }))
  fireEvent(elemento, new Event("webkitAnimationEnd", { bubbles: true }))
}

describe("Cabecalho", () => {
  it("traz as âncoras das seções e os dois logos", () => {
    render(<Cabecalho />)
    const nav = screen.getByRole("navigation", { name: "Seções da página" })
    expect(nav.querySelector('a[href="#problema"]')).toHaveTextContent("O Problema")
    expect(nav.querySelector('a[href="#geradocs"]')).toHaveTextContent("GeraDocs")
    expect(nav.querySelector('a[href="#ia"]')).toHaveTextContent("IA")
    expect(nav.querySelector('a[href="#confianca"]')).toHaveTextContent("Confiança")
    expect(screen.getByRole("img", { name: "GeraDocs" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Uma solução GovPro" })).toBeInTheDocument()
  })

  it("o menu móvel abre e fecha pelo botão", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    const botao = screen.getByRole("button", { name: "Menu" })
    expect(botao).toHaveAttribute("aria-expanded", "false")
    expect(document.getElementById("menu-landing")).toBeNull()

    await usuario.click(botao)
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true")
    const menu = document.getElementById("menu-landing") as HTMLElement
    expect(menu).not.toBeNull()
    expect(menu.querySelector('a[href="/login"]')).toHaveTextContent("Acessar o GeraDocs")
    expect(menu.querySelector('a[href^="mailto:contato@govpro.com.br"]')).toHaveTextContent("Solicitar Demonstração")

    await usuario.click(screen.getByRole("button", { name: "Menu" }))
    // Fechar toca a animação de saída; o menu só sai ao terminar.
    expect(document.getElementById("menu-landing")).not.toBeNull()
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("Escape fecha o menu", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    await usuario.click(screen.getByRole("button", { name: "Menu" }))
    await usuario.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus()
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("escolher uma âncora no menu fecha o menu", async () => {
    const usuario = userEvent.setup()
    render(<Cabecalho />)
    await usuario.click(screen.getByRole("button", { name: "Menu" }))
    const menu = document.getElementById("menu-landing") as HTMLElement
    await usuario.click(menu.querySelector('a[href="#ia"]') as HTMLElement)
    terminarAnimacao(document.getElementById("menu-landing") as HTMLElement)
    expect(document.getElementById("menu-landing")).toBeNull()
  })

  it("a borda inferior aparece depois de rolar", () => {
    render(<Cabecalho />)
    const cabecalho = screen.getByRole("banner")
    expect(cabecalho).toHaveClass("border-transparent")

    Object.defineProperty(window, "scrollY", { value: 24, configurable: true })
    fireEvent.scroll(window)
    expect(cabecalho).toHaveClass("border-on-dark-border")

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
    fireEvent.scroll(window)
    expect(cabecalho).toHaveClass("border-transparent")
  })
})
