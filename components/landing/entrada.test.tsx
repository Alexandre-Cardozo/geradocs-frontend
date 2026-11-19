import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Entrada } from "./entrada"

describe("Entrada", () => {
  it("escalona o atraso em 100ms por índice", () => {
    render(
      <>
        <Entrada indice={0}>a</Entrada>
        <Entrada indice={3}>b</Entrada>
      </>,
    )
    expect(screen.getByText("a")).toHaveStyle({ animationDelay: "0ms" })
    expect(screen.getByText("b")).toHaveStyle({ animationDelay: "300ms" })
  })

  it("usa a animação de entrada da landing", () => {
    render(<Entrada indice={1}>c</Entrada>)
    expect(screen.getByText("c")).toHaveClass("animate-landing-entrada")
  })
})
