import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Revelar } from "./revelar"

class ObservadorFalso {
  static instancias: ObservadorFalso[] = []
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  takeRecords = () => []
  constructor(public aoObservar: IntersectionObserverCallback) {
    ObservadorFalso.instancias.push(this)
  }
  disparar(isIntersecting: boolean) {
    this.aoObservar([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

/** O elemento que o Revelar renderiza: o pai do filho passado. */
const elemento = () => screen.getByText("conteúdo").parentElement as HTMLElement

/** Posiciona o elemento abaixo da dobra (a janela do jsdom tem 768px). */
const abaixoDaDobra = () =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 2000 } as DOMRect)

beforeEach(() => {
  ObservadorFalso.instancias = []
  vi.stubGlobal("IntersectionObserver", ObservadorFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Revelar", () => {
  it("sem IntersectionObserver o conteúdo fica visível, sem estado escondido", () => {
    vi.unstubAllGlobals()
    vi.stubGlobal("IntersectionObserver", undefined)
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
  })

  it("com movimento reduzido nada é escondido", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
    expect(ObservadorFalso.instancias).toHaveLength(0)
  })

  it("elemento que já está na tela fica visível e não é observado", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect)
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).not.toHaveAttribute("data-estado")
    expect(ObservadorFalso.instancias).toHaveLength(0)
  })

  it("elemento abaixo da dobra começa escondido e é revelado uma vez ao entrar na tela", () => {
    abaixoDaDobra()
    render(
      <Revelar>
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).toHaveAttribute("data-estado", "oculto")
    const [observador] = ObservadorFalso.instancias
    expect(observador?.observe).toHaveBeenCalledWith(elemento())

    observador?.disparar(false)
    expect(elemento()).toHaveAttribute("data-estado", "oculto")

    observador?.disparar(true)
    expect(elemento()).toHaveAttribute("data-estado", "visivel")
    expect(observador?.disconnect).toHaveBeenCalled()
  })

  it("aplica o atraso e a classe dadas", () => {
    render(
      <Revelar atraso={200} className="p-4">
        <p>conteúdo</p>
      </Revelar>,
    )
    expect(elemento()).toHaveStyle({ transitionDelay: "200ms" })
    expect(elemento()).toHaveClass("p-4")
  })
})
