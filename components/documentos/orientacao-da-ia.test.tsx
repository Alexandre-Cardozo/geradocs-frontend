import { HttpResponse, http } from "msw"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { OrientacaoDaIaContexto, type OrientacaoDaIa } from "@/components/documentos/orientacao-da-ia"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

function comIa(disponivel: boolean) {
  servidor.use(http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: disponivel })))
}

/** O cartão com a orientação de verdade: o estado vive aqui, como no editor. */
function ComOrientacao({ inicial = {} }: { inicial?: Partial<OrientacaoDaIa> }) {
  const [texto, setTexto] = useState(inicial.texto ?? "")
  return (
    <OrientacaoDaIaContexto.Provider
      value={{ texto, onTexto: setTexto, avisos: inicial.avisos ?? [], ...(inicial.erro ? { erro: inicial.erro } : {}) }}
    >
      <CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />
    </OrientacaoDaIaContexto.Provider>
  )
}

/**
 * A orientação do servidor à IA (§91): opcional, recolhida, com o contador e o
 * aviso de não incluir dado pessoal; a recusa e os avisos da curadoria
 * aparecem no próprio campo.
 */
describe("orientação à IA", () => {
  it("com IA, o campo opcional aparece recolhido, com o contador e o aviso", async () => {
    comIa(true)
    renderizar(<ComOrientacao />)

    await userEvent.click(await screen.findByText("Orientar a IA (opcional)"))
    const campo = screen.getByRole("textbox", { name: "Orientação para esta seção" })
    expect(screen.getByText(/Não inclua dados pessoais/)).toBeInTheDocument()
    expect(screen.getByText("0/500")).toBeInTheDocument()

    await userEvent.type(campo, "Entrega em lotes.")
    expect(screen.getByText("17/500")).toBeInTheDocument()
  })

  it("passou do limite, o contador diz quanto", async () => {
    comIa(true)
    renderizar(<ComOrientacao inicial={{ texto: "a".repeat(503) }} />)

    expect(await screen.findByText("Passa 3 do limite de 500 caracteres.")).toBeInTheDocument()
  })

  it("a recusa e os avisos da curadoria aparecem no campo", async () => {
    comIa(true)
    renderizar(
      <ComOrientacao
        inicial={{
          texto: "Indicar a marca.",
          avisos: ["Indicação de marca só com justificativa técnica no processo (Art. 41, I, Lei 14.133/21)."],
          erro: "A orientação tem dado pessoal.",
        }}
      />,
    )

    expect(await screen.findByText("A orientação tem dado pessoal.")).toBeInTheDocument()
    expect(screen.getByText(/Art. 41, I/)).toBeInTheDocument()
  })

  it("sem IA disponível, ou fora do editor, não há campo", async () => {
    comIa(false)
    renderizar(<ComOrientacao />)
    expect(await screen.findByText(/Nenhum modelo de IA configurado/)).toBeInTheDocument()
    expect(screen.queryByText("Orientar a IA (opcional)")).not.toBeInTheDocument()
  })

  it("fora do editor, sem quem forneça a orientação, não há campo", async () => {
    comIa(true)
    renderizar(<CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />)
    expect(await screen.findByText(/Rascunho com base no DFD/)).toBeInTheDocument()
    expect(screen.queryByText("Orientar a IA (opcional)")).not.toBeInTheDocument()
  })
})
