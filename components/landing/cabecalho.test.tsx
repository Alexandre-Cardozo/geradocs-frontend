import { describe, expect, it, vi } from "vitest"

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
  it("traz a marca da GovPro e as âncoras das seções", () => {
    render(<Cabecalho />)
    const nav = screen.getByRole("navigation", { name: "Seções da página" })
    expect(nav.querySelector('a[href="#quem-somos"]')).toHaveTextContent("Quem Somos")
    expect(nav.querySelector('a[href="#solucoes"]')).toHaveTextContent("Soluções")
    expect(nav.querySelector('a[href="#documentos"]')).toHaveTextContent("Documentos")
    expect(nav.querySelector('a[href="#contato"]')).toHaveTextContent("Contato")
    expect(screen.getByRole("link", { name: "GovPro, voltar ao início" })).toHaveAttribute("href", "/")
  })

  it("os botões do cabeçalho são curtos, com o nome acessível completo", () => {
    render(<Cabecalho />)
    const entrar = screen.getByRole("link", { name: "Entrar no GeraDocs" })
    expect(entrar).toHaveTextContent(/^Entrar$/)
    expect(entrar).toHaveAttribute("href", "/login")
    const demonstracao = screen.getByRole("link", { name: "Solicitar demonstração" })
    expect(demonstracao).toHaveTextContent(/^Demonstração$/)
    expect(demonstracao.getAttribute("href")).toBe("/onboarding?origem=cabecalho")
  })

  it("na página da GovPro, a marca rola até a abertura em vez de navegar", async () => {
    const usuario = userEvent.setup()
    const rolar = vi.fn()
    window.scrollTo = rolar as unknown as typeof window.scrollTo
    window.history.replaceState(null, "", "/#documentos")
    render(
      <div data-landing>
        <Cabecalho />
      </div>,
    )
    await usuario.click(screen.getByRole("link", { name: "GovPro, voltar ao início" }))
    expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: "smooth" })
    expect(window.location.hash).toBe("")
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
    expect(menu.querySelector('a[href="/onboarding?origem=cabecalho"]')).toHaveTextContent("Solicitar Demonstração")

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
    await usuario.click(menu.querySelector('a[href="#documentos"]') as HTMLElement)
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
