import { HttpResponse, http } from "msw"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { CaminhosDaSecao, dadosDoProcesso } from "@/components/documentos/caminhos-da-secao"
import { OrientacaoDaIaContexto, type OrientacaoDaIa } from "@/components/documentos/orientacao-da-ia"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
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
 * A orientação do servidor à IA (§91, §110, §111): opcional e aberta ao lado do
 * botão, com o contador; a recusa (dado pessoal, por exemplo) e os avisos da
 * curadoria aparecem no próprio campo.
 */
describe("orientação à IA", () => {
  it("com IA, o campo opcional já aparece aberto, em cima da barra de ações, com o contador (§110, §113)", async () => {
    comIa(true)
    renderizar(<ComOrientacao />)

    // Sem clique para abrir: não há mais `details` recolhido.
    const campo = await screen.findByRole("textbox", { name: "Orientação para a IA (opcional)" })
    expect(campo).toBeVisible()
    expect(document.querySelector("details")).toBeNull()
    // O campo vem antes da barra de ações, na largura toda, e começa com duas linhas.
    const gerar = screen.getByRole("button", { name: "Gerar com IA" })
    expect(campo.compareDocumentPosition(gerar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(campo).toHaveClass("min-h-16")
    // O aviso de dado pessoal saiu da tela: a curadoria do servidor o recusa (§111).
    expect(screen.queryByText(/Não inclua dados pessoais/)).not.toBeInTheDocument()
    expect(screen.getByText("0/1000")).toBeInTheDocument()

    await userEvent.type(campo, "Entrega em lotes.")
    expect(screen.getByText("17/1000")).toBeInTheDocument()
    // Escreve a orientação e o Tab leva ao botão: a ordem de quem orienta e gera.
    await userEvent.tab()
    expect(gerar).toHaveFocus()
  })

  it("passou do limite, o contador diz quanto", async () => {
    comIa(true)
    renderizar(<ComOrientacao inicial={{ texto: "a".repeat(1003) }} />)

    expect(await screen.findByText("Passa 3 do limite de 1000 caracteres.")).toBeInTheDocument()
  })

  it("cabem 1000 caracteres: entre 500 e 1000 o contador não acusa excesso", async () => {
    comIa(true)
    renderizar(<ComOrientacao inicial={{ texto: "a".repeat(750) }} />)

    expect(await screen.findByText("750/1000")).toBeInTheDocument()
    expect(screen.queryByText(/Passa .* do limite/)).not.toBeInTheDocument()
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
    expect(screen.queryByRole("textbox", { name: "Orientação para a IA (opcional)" })).not.toBeInTheDocument()
  })

  it("fora do editor, sem quem forneça a orientação, não há campo", async () => {
    comIa(true)
    renderizar(<CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Gerar com IA" })).toBeEnabled())
    expect(screen.queryByRole("textbox", { name: "Orientação para a IA (opcional)" })).not.toBeInTheDocument()
  })

  it("diz as fontes da seção aberta: o PCA só aparece onde o servidor o consulta", async () => {
    comIa(true)
    renderizar(
      <OrientacaoDaIaContexto.Provider
        value={{ texto: "", onTexto: vi.fn(), avisos: [], fontes: "no DFD, no PCA e no processo" }}
      >
        <CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />
      </OrientacaoDaIaContexto.Provider>,
    )

    const botao = await screen.findByRole("button", { name: "Gerar com IA" })
    await waitFor(() =>
      expect(botao).toHaveAttribute("title", "Rascunho com base no DFD, no PCA e no processo. Revise antes de salvar."),
    )
  })

  it("com o preenchimento ao lado, Gerar com IA continua a ação seguinte ao campo e fica à direita (§113)", async () => {
    comIa(true)
    renderizar(
      <OrientacaoDaIaContexto.Provider value={{ texto: "", onTexto: vi.fn(), avisos: [] }}>
        <CaminhosDaSecao
          gerando={false}
          onGerarComIa={vi.fn()}
          texto=""
          setTexto={vi.fn()}
          preenchimentos={[dadosDoProcesso("monta o texto.", () => "Texto.")]}
        />
      </OrientacaoDaIaContexto.Provider>,
    )

    const campo = await screen.findByRole("textbox", { name: "Orientação para a IA (opcional)" })
    const gerar = screen.getByRole("button", { name: "Gerar com IA" })
    const preencher = screen.getByRole("button", { name: "Preencher com dados do processo" })
    // À direita a ação principal, à esquerda o caminho sem IA, na mesma barra.
    expect(gerar).toHaveClass("ml-auto")
    expect(preencher).toHaveClass("order-first")
    expect(gerar.parentElement).toBe(preencher.parentElement)
    await waitFor(() => expect(gerar).toBeEnabled())
    campo.focus()
    await userEvent.tab()
    expect(gerar).toHaveFocus()
  })

  it("o editor sem fontes informadas cai no mínimo que vale em toda seção, sem PCA", async () => {
    comIa(true)
    renderizar(<ComOrientacao />)

    const botao = await screen.findByRole("button", { name: "Gerar com IA" })
    await waitFor(() =>
      expect(botao).toHaveAttribute("title", "Rascunho com base no DFD e no processo. Revise antes de salvar."),
    )
  })
})
