import { render } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it } from "vitest"

import { GovBo, GovPri, type AcaoDaPri, type AcaoDoBo, type ControleDoMascote } from "@/components/mascotes/mascotes"

describe("mascotes (§127)", () => {
  it("o GovBô monta o SVG decorativo e responde só ao que sabe fazer", () => {
    const controle = createRef<ControleDoMascote<AcaoDoBo>>()
    const { container, unmount } = render(<GovBo ref={controle} expressao="pensativo" />)

    const caixa = container.querySelector('[data-mascote="govbo"]')
    expect(caixa).toHaveAttribute("aria-hidden", "true")
    expect(caixa?.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    // O pensativo traz o balão acima da cabeça.
    expect(container.querySelector(".extra svg")).not.toBeNull()

    expect(controle.current?.expressar("apaixonado")).toBe(true)
    expect(controle.current?.agir("clicar")).toBe(true)
    expect(controle.current?.agir("pular", { repetir: true })).toBe(true)
    // "Séria" é da GovPri; o GovBô ignora.
    expect(controle.current?.expressar("serio")).toBe(false)
    expect(controle.current?.agir("notebook" as AcaoDoBo)).toBe(false)

    unmount()
    expect(container.querySelector("svg")).toBeNull()
  })

  it("dormir troca a expressão do GovBô, e qualquer outra ação o acorda", () => {
    const controle = createRef<ControleDoMascote<AcaoDoBo>>()
    const { container } = render(<GovBo ref={controle} />)
    controle.current?.agir("dormir")
    expect(container.querySelector(".extra svg")).not.toBeNull()
    controle.current?.agir("ociosa")
    expect(container.querySelector(".extra")?.innerHTML).toBe("")
  })

  it("a GovPri de corpo inteiro tem pernas; o busto não", () => {
    const inteira = render(<GovPri corpo="inteiro" expressao="alegre" acao="acenar" manter />)
    expect(inteira.container.querySelector(".pernas")).not.toBeNull()
    expect(inteira.container.querySelector("svg")).toHaveAttribute("viewBox", "-40 40 480 910")

    const busto = render(<GovPri />)
    expect(busto.container.querySelectorAll(".pernas")).toHaveLength(0)
  })

  it("a GovPri mostra o objeto da pose e ignora o que não sabe", () => {
    const controle = createRef<ControleDoMascote<AcaoDaPri>>()
    const { container } = render(<GovPri ref={controle} falando />)
    const notebook = container.querySelector<SVGElement>(".prop-notebook")

    expect(notebook?.style.display).toBe("none")
    expect(controle.current?.agir("notebook")).toBe(true)
    expect(notebook?.style.display).toBe("")
    expect(controle.current?.expressar("serio")).toBe(true)
    // "Dormindo" é do GovBô; a GovPri ignora.
    expect(controle.current?.expressar("dormindo")).toBe(false)
  })

  it("nenhuma cor crua: o desenho usa os tokens do tema", () => {
    const { container } = render(
      <>
        <GovBo />
        <GovPri corpo="inteiro" />
      </>,
    )
    expect(container.innerHTML).toContain("var(--color-mascote-pele)")
    expect(container.innerHTML).toContain("var(--color-mascote-bo-luz)")
  })
})
