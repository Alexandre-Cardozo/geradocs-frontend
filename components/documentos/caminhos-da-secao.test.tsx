import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Os dois caminhos de preenchimento da seção.
 *
 * <p>Antes havia um botão só — "Gerar com IA". Com o provedor `none`, que é o
 * padrão e o que roda hoje, o clique devolvia `503`: o servidor descobria **por
 * erro** que o facilitador não existe. A regra do produto é a inversa — a IA é
 * facilitadora, nunca bloqueadora, e escrever à mão é o caminho normal.
 */
function comIa(disponivel: boolean) {
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: disponivel })),
  )
}

function renderizarCaminhos(props: Partial<Parameters<typeof CaminhosDaSecao>[0]> = {}) {
  const escrever = vi.fn()
  const gerar = vi.fn()
  renderizar(
    <CaminhosDaSecao
      gerando={false}
      onEscreverAMao={escrever}
      onGerarComIa={gerar}
      {...props}
    />,
  )
  return { escrever, gerar }
}

describe("caminhos da seção", () => {
  it("sem modelo configurado, o botão de IA vem desabilitado com o motivo antes do clique", async () => {
    comIa(false)
    renderizarCaminhos()

    const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
    await waitFor(() => expect(botao).toBeDisabled())
    expect(screen.getByText(/não tem modelo de IA configurado/)).toBeInTheDocument()
    // O guarda-corpo nº 7: motivo desenhado, mas não anunciado, é motivo que só
    // existe para quem enxerga a tela.
    const descrito = botao.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(
      /não tem modelo de IA configurado/,
    )
    expect(screen.getByText("Indisponível")).toBeInTheDocument()
  })

  it("o caminho manual aparece junto, e não como o que sobra", async () => {
    comIa(false)
    const { escrever } = renderizarCaminhos()

    // Escrever à mão preenche a seção por inteiro: dizer isso é o que impede
    // que a ausência de IA pareça uma falta.
    expect(await screen.findByText("Escrever à mão")).toBeInTheDocument()
    expect(screen.getByText(/caminho normal, e completo/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Escrever agora" }))

    // O botão leva o cursor ao campo — apontar sem levar deixaria a ação pela
    // metade.
    expect(escrever).toHaveBeenCalledOnce()
  })

  it("com modelo configurado, a IA fica disponível e diz quem responde pelo texto", async () => {
    comIa(true)
    const { gerar } = renderizarCaminhos()

    const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
    await waitFor(() => expect(botao).toBeEnabled())
    expect(screen.getByText(/quem responde pelo texto é quem assina/)).toBeInTheDocument()
    expect(screen.queryByText("Indisponível")).not.toBeInTheDocument()

    await userEvent.click(botao)

    expect(gerar).toHaveBeenCalledOnce()
  })

  it("enquanto a resposta não chega, o botão não convida ao clique que dá erro", async () => {
    comIa(true)
    renderizarCaminhos()

    // Habilitar por otimismo devolveria exatamente o 503 que este passo existe
    // para evitar.
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeDisabled()
    expect(screen.getByText(/Verificando se esta instalação/)).toBeInTheDocument()
  })

  it("gerando em andamento, o botão diz isso e não aceita segundo clique", async () => {
    comIa(true)
    const { gerar } = renderizarCaminhos({ gerando: true })

    const botao = await screen.findByRole("button", { name: /Gerando com IA/ })
    await waitFor(() => expect(botao).toBeDisabled())

    await userEvent.click(botao)

    expect(gerar).not.toHaveBeenCalled()
  })
})
