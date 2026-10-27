import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { RevisaoComIa } from "@/components/documentos/revisao-com-ia"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

const PROCESSO = documentoApi.processId

const secao = (id: string, conteudo: string): SecaoDocumento => ({
  id,
  titulo: `Seção ${id}`,
  status: conteudo ? "Completo" : "Não iniciado",
  obrigatoria: true,
  conteudo,
  origem: "catalogo",
})

/** Responde à revisão com o texto do mapa; grava os pedidos e o que foi salvo. */
function comRevisao(respostas: Record<string, string | null>, espera?: Promise<void>) {
  const pedidos: { secao: string; corpo: unknown }[] = []
  const salvos: unknown[] = []
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: true })),
    http.post(
      `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/generate`,
      async ({ request, params }) => {
        pedidos.push({ secao: String(params.secao), corpo: await request.json() })
        if (espera) await espera
        const texto = respostas[String(params.secao)]
        return texto == null
          ? HttpResponse.json({ detail: "A IA não está disponível." }, { status: 503 })
          : HttpResponse.json({ text: texto })
      },
    ),
    http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`, async ({ request }) => {
      salvos.push(await request.json())
      return HttpResponse.json(documentoApi)
    }),
  )
  return { pedidos, salvos }
}

/**
 * A revisão da IA na etapa final (§87): seção por seção, a sugestão marcada
 * sobre o texto, e nada gravado sem aceitar.
 */
describe("revisão com IA", () => {
  it("sem seção escrita, o botão diz por que não revisa", async () => {
    comRevisao({})
    renderizar(<RevisaoComIa processoId={PROCESSO} tipo="ETP" secoes={[secao("1", "")]} />)

    const botao = screen.getByRole("button", { name: "Revisar com IA" })
    expect(botao).toBeDisabled()
    await waitFor(() => expect(botao).toHaveAccessibleDescription("Nenhuma seção escrita."))
  })

  it("sem modelo de IA, o motivo aparece antes do clique", async () => {
    servidor.use(http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: false })))
    renderizar(<RevisaoComIa processoId={PROCESSO} tipo="ETP" secoes={[secao("1", "Texto.")]} />)

    const botao = screen.getByRole("button", { name: "Revisar com IA" })
    expect(botao).toHaveAccessibleDescription("Verificando a IA...")
    await waitFor(() =>
      expect(botao).toHaveAccessibleDescription("Nenhum modelo de IA configurado nesta instalação."),
    )
    expect(botao).toBeDisabled()
  })

  it("revisa só as escritas, marca a sugestão e grava só ao aceitar", async () => {
    const { pedidos, salvos } = comRevisao({ "1": "Texto um revisado.", "2": "Texto  dois." })
    renderizar(
      <RevisaoComIa
        processoId={PROCESSO}
        tipo="ETP"
        secoes={[secao("1", "Texto um."), secao("2", "Texto dois."), secao("3", "  ")]}
      />,
    )

    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar com IA" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Revisar com IA" }))

    expect(await screen.findByRole("status")).toHaveTextContent("1 com sugestão · 1 sem alteração")
    expect(pedidos).toEqual([
      { secao: "1", corpo: { draft: "Texto um.", mode: "REVIEW" } },
      { secao: "2", corpo: { draft: "Texto dois.", mode: "REVIEW" } },
    ])
    expect(screen.getByRole("heading", { name: "Seção 1" })).toBeInTheDocument()
    expect(screen.getByText("revisado.", { exact: false, selector: "ins" })).toBeInTheDocument()
    expect(screen.getByText("um.", { exact: false, selector: "del" })).toBeInTheDocument()
    expect(salvos).toEqual([])

    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }))

    await waitFor(() => expect(salvos).toEqual([expect.objectContaining({ content: "Texto um revisado." })]))
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Seção 1" })).not.toBeInTheDocument())
    expect(screen.getByRole("button", { name: "Revisar de Novo" })).toBeInTheDocument()
  })

  it("descartar tira a sugestão sem gravar", async () => {
    const { salvos } = comRevisao({ "1": "Outro texto." })
    renderizar(<RevisaoComIa processoId={PROCESSO} tipo="ETP" secoes={[secao("1", "Texto.")]} />)

    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar com IA" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Revisar com IA" }))
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }))

    expect(screen.queryByRole("heading", { name: "Seção 1" })).not.toBeInTheDocument()
    expect(salvos).toEqual([])
  })

  it("a seção que falhou é dita, e as outras seguem", async () => {
    comRevisao({ "1": null, "2": "Texto dois." })
    renderizar(
      <RevisaoComIa processoId={PROCESSO} tipo="ETP" secoes={[secao("1", "Texto um."), secao("2", "Texto dois.")]} />,
    )

    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar com IA" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Revisar com IA" }))

    expect(await screen.findByText(/Não foi possível revisar: Seção 1\./)).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("0 com sugestão · 1 sem alteração")
  })

  it("parar interrompe depois da seção em andamento", async () => {
    let liberar = () => {}
    const espera = new Promise<void>((resolve) => (liberar = resolve))
    const { pedidos } = comRevisao({ "1": "Texto um.", "2": "Texto dois." }, espera)
    renderizar(
      <RevisaoComIa processoId={PROCESSO} tipo="ETP" secoes={[secao("1", "Texto um."), secao("2", "Texto dois.")]} />,
    )

    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar com IA" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Revisar com IA" }))
    expect(await screen.findByText("Revisando 1 de 2: Seção 1")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Parar" }))
    liberar()

    // O andamento também é um status: o resumo só fica quando ele sai.
    await waitFor(() => expect(screen.queryByText(/^Revisando/)).not.toBeInTheDocument())
    expect(screen.getByRole("status")).toHaveTextContent("0 com sugestão · 1 sem alteração")
    expect(pedidos).toHaveLength(1)
  })
})
