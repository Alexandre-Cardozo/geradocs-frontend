import { describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import PaginaLanding, { metadata } from "./page"

// O vitest não processa .png como o Next: sem o mock, next/image reclama de `width`.
vi.mock("@/public/landing/editor-etp.png", () => ({
  default: { src: "/editor-etp.png", width: 1440, height: 900 },
}))
vi.mock("@/public/landing/proposta-ia.png", () => ({
  default: { src: "/proposta-ia.png", width: 1440, height: 900 },
}))

describe("/landing-page", () => {
  it("tem um único h1, o slogan da abertura, e as seções na ordem", () => {
    const { container } = render(<PaginaLanding />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inteligência para Gestão Pública")
    const secoes = Array.from(container.querySelectorAll("main > section"))
    expect(secoes[0]).toHaveAttribute("aria-label", "GovPro")
    // A abertura e o hero vêm primeiro, sem id; as demais são as âncoras.
    const ids = Array.from(container.querySelectorAll("main > section"))
      .map((s) => s.id)
      .filter(Boolean)
    expect(ids).toEqual(["problema", "geradocs", "ia", "confianca", "quem-somos", "demonstracao"])
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

  it("exporta metadata próprio, sem o sufixo de homologação do aplicativo", () => {
    expect(metadata.title).toEqual({ absolute: "GovPro | GeraDocs — Contratações públicas inteligentes" })
    expect(metadata.description).toContain("Lei 14.133/21")
  })
})
