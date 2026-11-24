import { afterEach, describe, expect, it, vi } from "vitest"

import { render } from "@/lib/teste/renderizar"

import { AncoraAoAbrir } from "./ancora-ao-abrir"

describe("AncoraAoAbrir", () => {
  afterEach(() => window.history.replaceState(null, "", "/"))

  it("leva de novo à seção da âncora depois que a página monta", async () => {
    window.history.replaceState(null, "", "/#solucoes")
    const secao = document.createElement("section")
    secao.id = "solucoes"
    secao.scrollIntoView = vi.fn()
    document.body.appendChild(secao)
    render(<AncoraAoAbrir />)
    await vi.waitFor(() => expect(secao.scrollIntoView).toHaveBeenCalled())
    secao.remove()
  })

  it("sem âncora, não rola nada", async () => {
    const secao = document.createElement("section")
    secao.id = "solucoes"
    secao.scrollIntoView = vi.fn()
    document.body.appendChild(secao)
    render(<AncoraAoAbrir />)
    await new Promise((r) => setTimeout(r, 50))
    expect(secao.scrollIntoView).not.toHaveBeenCalled()
    secao.remove()
  })
})
