import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { BotaoLink } from "./botao-link"

describe("BotaoLink", () => {
  it("é um link com o destino e o rótulo dados", () => {
    render(<BotaoLink href="/login">Acessar o GeraDocs</BotaoLink>)
    expect(screen.getByRole("link", { name: "Acessar o GeraDocs" })).toHaveAttribute("href", "/login")
  })

  it("aceita mailto", () => {
    render(<BotaoLink href="mailto:contato@govpro.com.br?subject=x">Pedir</BotaoLink>)
    expect(screen.getByRole("link", { name: "Pedir" })).toHaveAttribute(
      "href",
      "mailto:contato@govpro.com.br?subject=x",
    )
  })

  it("tem alvo de toque de 44px no tamanho padrão e 48px no grande", () => {
    const { rerender } = render(<BotaoLink href="/a">A</BotaoLink>)
    expect(screen.getByRole("link")).toHaveClass("h-11")
    rerender(
      <BotaoLink href="/a" tamanho="lg">
        A
      </BotaoLink>,
    )
    expect(screen.getByRole("link")).toHaveClass("h-12")
  })

  it("a variante primária usa a cor de ação", () => {
    render(<BotaoLink href="/a">A</BotaoLink>)
    expect(screen.getByRole("link")).toHaveClass("bg-royal")
  })

  it("a seta é decorativa: não entra no nome do link", () => {
    render(
      <BotaoLink href="/a" seta>
        Pedir
      </BotaoLink>,
    )
    const link = screen.getByRole("link", { name: "Pedir" })
    expect(link).toHaveTextContent("Pedir→")
    expect(link.querySelector("[aria-hidden]")).toHaveTextContent("→")
  })
})
