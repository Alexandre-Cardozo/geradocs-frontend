import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import PaginaLanding, { metadata } from "./page"


describe("/ (página da GovPro)", () => {
  it("tem um único h1, o slogan da abertura, e as seções na ordem", () => {
    const { container } = render(<PaginaLanding />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inteligência para Gestão Pública")
    const secoes = Array.from(container.querySelectorAll("main > section"))
    expect(secoes[0]).toHaveAttribute("aria-label", "GovPro")
    // A abertura vem primeiro, sem id; as demais são as âncoras.
    const ids = Array.from(container.querySelectorAll("main > section"))
      .map((s) => s.id)
      .filter(Boolean)
    expect(ids).toEqual([
      "quem-somos",
      "desafio",
      "solucoes",
      "geradocs",
      "poucos-cliques",
      "documentos",
      "modalidades",
      "produtividade",
      "ia",
      "confianca",
      "perfis",
      "valores",
      "metodo",
      "compromissos",
      "faq",
      "contato",
    ])
  })

  it("o conteúdo principal é o alvo do link para pular a navegação", () => {
    const { container } = render(<PaginaLanding />)
    expect(screen.getByRole("link", { name: "Ir para o conteúdo" })).toHaveAttribute("href", "#conteudo")
    const principal = container.querySelector("main#conteudo")
    expect(principal).not.toBeNull()
    expect(principal).toHaveAttribute("tabindex", "-1")
  })

  it("não depende da sessão: nenhum botão de sair, nenhuma barra lateral", () => {
    render(<PaginaLanding />)
    expect(screen.queryByRole("button", { name: /sair/i })).toBeNull()
    expect(document.querySelector("aside")).toBeNull()
  })

  it("toda âncora da navegação tem a sua seção", () => {
    const { container } = render(<PaginaLanding />)
    const ancoras = Array.from(container.querySelectorAll('nav[aria-label="Seções da página"] a')).map((a) =>
      a.getAttribute("href"),
    )
    expect(ancoras.length).toBeGreaterThan(0)
    for (const ancora of ancoras) expect(container.querySelector(`section${ancora}`)).not.toBeNull()
  })

  it("exporta metadata próprio, da GovPro, sem o sufixo de homologação do aplicativo", () => {
    expect(metadata.title).toEqual({ absolute: "GovPro | Inteligência para a Gestão Pública" })
    expect(metadata.description).toContain("GeraDocs")
    expect(metadata.description).toContain("Lei 14.133/21")
  })
})
