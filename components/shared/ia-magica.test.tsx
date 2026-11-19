import { act, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IaTrabalhando, TextoRevelado, useRevelacaoDaIa } from "@/components/shared/ia-magica"

const TEXTO = "A contratação atende à necessidade das escolas rurais, com entrega em lotes mensais."

/** O navegador com movimento: a escrita anima. Sem isto (jsdom puro), o texto entra de uma vez. */
function comMovimento(reduzido = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (consulta: string) => ({ matches: reduzido && consulta.includes("reduce") }) as MediaQueryList,
  })
}

function semMatchMedia() {
  Reflect.deleteProperty(window, "matchMedia")
}

/** O editor em miniatura: o estado é de quem chama, e o gancho só escreve. */
function Editor({ alvo = TEXTO }: { alvo?: string }) {
  const [texto, setTexto] = useState("")
  const [orientacao, setOrientacao] = useState("")
  const revelacao = useRevelacaoDaIa()
  return (
    <div data-testid="area" data-ia-escrevendo={revelacao.escrevendo || undefined} {...revelacao.interceptar}>
      <textarea aria-label="Texto da seção" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div data-ia-fora-da-escrita>
        <textarea aria-label="Orientação" value={orientacao} onChange={(e) => setOrientacao(e.target.value)} />
      </div>
      <button type="button" onClick={() => revelacao.revelar(alvo, setTexto)}>
        Gerar
      </button>
      <button type="button" onClick={revelacao.cancelar}>
        Parar
      </button>
      <span data-testid="estado">{revelacao.escrevendo ? "escrevendo" : "parado"}</span>
    </div>
  )
}

const campo = () => screen.getByRole("textbox", { name: "Texto da seção" }) as HTMLTextAreaElement
const gerar = () => act(() => screen.getByRole("button", { name: "Gerar" }).click())
const quadros = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe("a IA trabalhando (§107)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("as etapas trocam sozinhas, e o leitor de tela ouve só o anúncio fixo", () => {
    render(<IaTrabalhando etapas={["Lendo", "Redigindo", "Conferindo"]} anuncio="Gerando com IA." />)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Gerando com IA.")
    expect(screen.getByText("Lendo")).toHaveAttribute("aria-hidden", "true")
    // O símbolo da marca se desenhando, e não um spinner genérico.
    expect(status.querySelector('[data-marca="carregando"]')).not.toBeNull()

    quadros(1800)
    expect(screen.getByText("Redigindo")).toBeInTheDocument()
    quadros(1800 * 2)
    expect(screen.getByText("Lendo")).toBeInTheDocument()
  })

  it("com rótulo, a frase é uma só e é ela que se anuncia", () => {
    render(<IaTrabalhando rotulo="Revisando 2 de 5: Objeto" />)
    expect(screen.getByRole("status")).toHaveTextContent("Revisando 2 de 5: Objeto")
    expect(screen.getByText("Revisando 2 de 5: Objeto")).not.toHaveAttribute("aria-hidden")
  })

  it("com uma etapa só, ou nenhuma, nada troca", () => {
    const { unmount } = render(<IaTrabalhando etapas={["Lendo"]} />)
    quadros(5000)
    expect(screen.getByText("Lendo")).toBeInTheDocument()
    unmount()

    render(<IaTrabalhando />)
    expect(screen.getByRole("status")).toHaveTextContent("A IA está trabalhando.")
  })
})

describe("a escrita do texto da IA (§107)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    semMatchMedia()
  })

  it("fora do navegador (sem matchMedia), o texto entra de uma vez, como antes", () => {
    semMatchMedia()
    render(<Editor />)
    gerar()
    expect(campo().value).toBe(TEXTO)
    expect(screen.getByTestId("estado")).toHaveTextContent("parado")
  })

  it("com movimento reduzido, também de uma vez", () => {
    comMovimento(true)
    render(<Editor />)
    gerar()
    expect(campo().value).toBe(TEXTO)
  })

  it("texto vazio não anima", () => {
    comMovimento()
    render(<Editor alvo="" />)
    gerar()
    expect(screen.getByTestId("estado")).toHaveTextContent("parado")
  })

  it("com movimento, o texto é escrito palavra por palavra e termina inteiro", () => {
    comMovimento()
    render(<Editor />)
    gerar()

    expect(screen.getByTestId("area")).toHaveAttribute("data-ia-escrevendo", "true")
    quadros(100)
    const parcial = campo().value
    expect(parcial.length).toBeGreaterThan(0)
    expect(parcial.length).toBeLessThan(TEXTO.length)
    // Nunca meia palavra: o pedaço é sempre o começo do texto, cortado num espaço.
    expect(TEXTO.startsWith(parcial)).toBe(true)
    expect(TEXTO.charAt(parcial.length)).toMatch(/\s/)

    quadros(2000)
    expect(campo().value).toBe(TEXTO)
    expect(screen.getByTestId("area")).not.toHaveAttribute("data-ia-escrevendo")
  })

  it("a primeira tecla no campo completa o texto, sem ser digitada no meio dele", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(100)

    const tecla = fireEvent.keyDown(campo(), { key: "x" })
    expect(tecla).toBe(false) // preventDefault: a tecla não entra
    expect(campo().value).toBe(TEXTO)
    expect(screen.getByTestId("estado")).toHaveTextContent("parado")
  })

  it("Tab e modificadores sozinhos não interrompem a escrita", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    fireEvent.keyDown(campo(), { key: "Tab" })
    fireEvent.keyDown(campo(), { key: "Shift" })
    expect(screen.getByTestId("estado")).toHaveTextContent("escrevendo")
  })

  it("tecla fora de campo (num botão) completa o texto e deixa a ação seguir", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    const tecla = fireEvent.keyDown(screen.getByRole("button", { name: "Parar" }), { key: "Enter" })
    expect(tecla).toBe(true)
    expect(campo().value).toBe(TEXTO)
  })

  it("um clique em qualquer lugar da área completa o texto antes da ação", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    fireEvent.pointerDown(screen.getByTestId("estado"))
    expect(campo().value).toBe(TEXTO)
    // Sem escrita, o clique não faz nada a mais.
    fireEvent.pointerDown(screen.getByTestId("estado"))
    expect(campo().value).toBe(TEXTO)
  })

  it("colar ou soltar no campo durante a escrita completa o texto, sem colar no meio", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    expect(fireEvent.paste(campo())).toBe(false)
    expect(campo().value).toBe(TEXTO)

    gerar()
    quadros(50)
    expect(fireEvent.drop(campo())).toBe(false)
    expect(campo().value).toBe(TEXTO)

    // Sem escrita, colar e soltar seguem normais.
    expect(fireEvent.paste(campo())).toBe(true)
    expect(fireEvent.drop(campo())).toBe(true)
    expect(fireEvent.keyDown(campo(), { key: "x" })).toBe(true)
  })

  it("outra entrada no campo (corretor, preenchimento) para a escrita e fica com o que entrou", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    fireEvent.input(campo(), { target: { value: "Texto da pessoa." } })
    quadros(2000)
    expect(campo().value).toBe("Texto da pessoa.")
    expect(screen.getByTestId("estado")).toHaveTextContent("parado")
  })

  it("o campo fora da escrita (a orientação) aceita digitar, colar e soltar sem mexer na escrita", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(50)
    const orientacao = screen.getByRole("textbox", { name: "Orientação" }) as HTMLTextAreaElement

    // A tecla não é engolida, e a escrita segue.
    expect(fireEvent.keyDown(orientacao, { key: "E" })).toBe(true)
    expect(fireEvent.paste(orientacao)).toBe(true)
    expect(fireEvent.drop(orientacao)).toBe(true)
    fireEvent.input(orientacao, { target: { value: "Entrega em lotes." } })
    expect(orientacao.value).toBe("Entrega em lotes.")
    expect(screen.getByTestId("estado")).toHaveTextContent("escrevendo")

    quadros(2000)
    expect(campo().value).toBe(TEXTO)
    expect(orientacao.value).toBe("Entrega em lotes.")
  })

  it("cancelar para onde está, e gerar de novo recomeça do zero", () => {
    comMovimento()
    render(<Editor />)
    gerar()
    quadros(100)
    act(() => screen.getByRole("button", { name: "Parar" }).click())
    const parado = campo().value
    quadros(2000)
    expect(campo().value).toBe(parado)

    gerar()
    gerar() // a segunda escrita substitui a primeira, sem duas correndo juntas
    quadros(2000)
    expect(campo().value).toBe(TEXTO)
  })

  it("sair da tela no meio da escrita não deixa quadro pendurado", () => {
    comMovimento()
    const cancelado = vi.spyOn(window, "cancelAnimationFrame")
    const { unmount } = render(<Editor />)
    gerar()
    quadros(50)
    unmount()
    expect(cancelado).toHaveBeenCalled()
  })
})

describe("o texto revelado (§107)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    semMatchMedia()
  })

  it("aparece escrito, o leitor de tela ouve o texto inteiro, e o clique mostra o resto", () => {
    comMovimento()
    render(<TextoRevelado texto={TEXTO} className="texto" />)
    quadros(100)

    const paragrafo = document.querySelector("p.texto") as HTMLParagraphElement
    expect(paragrafo).toHaveAttribute("aria-busy", "true")
    expect(screen.getByText(TEXTO)).toHaveClass("sr-only")

    fireEvent.click(paragrafo)
    expect(paragrafo).not.toHaveAttribute("aria-busy")
    expect(paragrafo).toHaveTextContent(TEXTO)
  })

  it("sem movimento, aparece de uma vez", () => {
    semMatchMedia()
    render(<TextoRevelado texto={TEXTO} />)
    expect(screen.getByText(TEXTO)).not.toHaveClass("sr-only")
  })
})
