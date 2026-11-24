import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { MolduraDeTela } from "./moldura-de-tela"

const captura = { src: "/landing/telas/produto.webp", width: 1600, height: 1000 }

describe("MolduraDeTela", () => {
  it("mostra a captura com o texto alternativo dado", () => {
    render(<MolduraDeTela src={captura} alt="Editor de seção do ETP" />)
    expect(screen.getByRole("img", { name: "Editor de seção do ETP" })).toBeInTheDocument()
  })

  it("a barra superior é decorativa", () => {
    const { container } = render(<MolduraDeTela src={captura} alt="x" />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
