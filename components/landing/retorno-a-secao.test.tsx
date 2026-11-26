import { act } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CHAVE_DO_RETORNO } from "@/lib/landing/retorno"
import { render } from "@/lib/teste/renderizar"

import { RetornoASecao } from "./retorno-a-secao"

/** Uma página com três blocos em `main#conteudo`, nos topos dados. */
function montarPagina(topos: number[]) {
  const main = document.createElement("main")
  main.id = "conteudo"
  for (const topo of topos) {
    const bloco = document.createElement("section")
    bloco.getBoundingClientRect = () => ({ top: topo }) as DOMRect
    main.appendChild(bloco)
  }
  const link = document.createElement("a")
  link.href = "/onboarding?origem=contato"
  link.addEventListener("click", (e) => e.preventDefault())
  main.lastElementChild?.appendChild(link)
  document.body.appendChild(main)
  return { main, link }
}

describe("RetornoASecao", () => {
  afterEach(() => {
    document.getElementById("conteudo")?.remove()
    window.history.replaceState(null, "", "/")
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("ao sair por um link, guarda na entrada do histórico o bloco do alto da janela", () => {
    window.history.replaceState({ __NA: true }, "", "/")
    const { link } = montarPagina([-2000, -80, 600])
    render(<RetornoASecao />)
    link.click()
    expect(window.history.state).toEqual({ __NA: true, [CHAVE_DO_RETORNO]: { bloco: 1, deslocamento: -80 } })
  })

  it("âncora da própria página não marca nada", () => {
    const { main } = montarPagina([-2000, -80, 600])
    const ancora = document.createElement("a")
    ancora.href = "#solucoes"
    main.appendChild(ancora)
    render(<RetornoASecao />)
    ancora.click()
    expect(window.history.state).toBeNull()
  })

  it("quando a entrada marcada volta, leva o bloco ao mesmo lugar enquanto a página acomoda", () => {
    vi.useFakeTimers()
    window.history.replaceState({ [CHAVE_DO_RETORNO]: { bloco: 1, deslocamento: -80 } }, "", "/")
    montarPagina([-3000, 500, 1400])
    const rolar = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    render(<RetornoASecao />)
    act(() => vi.advanceTimersByTime(0))
    expect(rolar).toHaveBeenCalledWith({ top: 580, behavior: "instant" })
  })

  it("se a pessoa mexe na rolagem, a volta para de insistir", () => {
    vi.useFakeTimers()
    window.history.replaceState({ [CHAVE_DO_RETORNO]: { bloco: 1, deslocamento: -80 } }, "", "/")
    montarPagina([-3000, 500, 1400])
    const rolar = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    render(<RetornoASecao />)
    window.dispatchEvent(new Event("wheel"))
    act(() => vi.advanceTimersByTime(2000))
    expect(rolar).not.toHaveBeenCalled()
  })

  it("sem marca, não rola nada", () => {
    vi.useFakeTimers()
    montarPagina([0, 500])
    const rolar = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    render(<RetornoASecao />)
    act(() => vi.advanceTimersByTime(2000))
    expect(rolar).not.toHaveBeenCalled()
  })
})
