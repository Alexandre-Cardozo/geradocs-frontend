import { describe, expect, it } from "vitest"

import { LoadingState } from "@/components/shared/estados"
import { MarcaCarregando } from "@/components/shared/marca-carregando"
import { renderizar, screen } from "@/lib/teste/renderizar"

describe("MarcaCarregando", () => {
  it("é decorativa: o leitor de tela ouve o rótulo, não o desenho", () => {
    const { container } = renderizar(<MarcaCarregando />)

    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("width", "48")
    expect(svg).toHaveAttribute("height", "51")
  })

  it("dá a cada instância a sua própria máscara", () => {
    const { container } = renderizar(
      <>
        <MarcaCarregando />
        <MarcaCarregando tamanho={36} />
      </>,
    )

    const mascaras = [...container.querySelectorAll("mask")].map((m) => m.id)
    expect(new Set(mascaras).size).toBe(2)
    for (const id of mascaras) {
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
      expect(container.querySelector(`[mask="url(#${id})"]`)).not.toBeNull()
    }
  })

  it("aparece no estado de carregamento das telas, que continua anunciado", () => {
    const { container } = renderizar(<LoadingState label="Carregando processos..." />)

    expect(screen.getByRole("status")).toHaveTextContent("Carregando processos...")
    expect(container.querySelector('[data-marca="carregando"]')).not.toBeNull()
  })
})
