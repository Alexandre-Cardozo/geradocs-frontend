import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TopicosDoContexto } from "@/components/documentos/topicos-do-contexto"
import type { TopicoExigido } from "@/lib/api/authoring-client"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * Os subtópicos do contexto que alguém tirou, numa linha (ADR-061 do
 * back-end): os demais entram sozinhos, e o bloco some quando não há o que
 * restaurar.
 */
const toast = vi.fn()
vi.mock("@/components/shared/providers", () => ({ useToast: () => toast }))

const PROCESSO = documentoApi.processId
const ROTA = `${urlDaApi}/procurement-processes/:id/documents/:tipo/context-topics/:codigo`

function topico(codigo: string, titulo: string, secao?: string): TopicoExigido {
  return {
    codigo,
    titulo,
    fundamentoLegal: "Art. 135, II, Lei 14.133/21",
    orientacao: "Oriente.",
    ancora: "3",
    contextos: ["Motorista"],
    ...(secao ? { secao } : {}),
  }
}

const CONVENCAO = topico("CONVENCAO_COLETIVA", "Convenção Coletiva")
const HABILITACAO = topico("HABILITACAO_DO_CONDUTOR", "Habilitação do Condutor")
const JORNADA = topico("JORNADA_DO_MOTORISTA", "Jornada", "3.1")

const REQUISITOS: SecaoDocumento = {
  id: "3",
  titulo: "Requisitos da Contratação",
  status: "Não iniciado",
  obrigatoria: false,
  origem: "catalogo",
  conteudo: "",
}

function exibir(topicos: TopicoExigido[], secoes: SecaoDocumento[] = [REQUISITOS]) {
  return renderizar(<TopicosDoContexto processoId={PROCESSO} tipo="ETP" topicos={topicos} secoes={secoes} />)
}

beforeEach(() => toast.mockReset())

describe("subtópicos do contexto removidos", () => {
  it("sem removido, não aparece", () => {
    const { container } = exibir([JORNADA])
    expect(container).toBeEmptyDOMElement()
  })

  it("diz quantos foram removidos numa linha, e escolher mostra cada um com o fundamento e o destino na dica", async () => {
    exibir([CONVENCAO, HABILITACAO, JORNADA])

    expect(screen.getByText("2 subtópicos do contexto da contratação foram removidos.")).toBeInTheDocument()
    expect(screen.queryByText("Convenção Coletiva")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Escolher" }))
    expect(screen.getByRole("button", { name: "Convenção Coletiva" })).toHaveAttribute(
      "title",
      "Art. 135, II, Lei 14.133/21 · volta em Requisitos da Contratação",
    )
    // O que está no documento não aparece.
    expect(screen.queryByRole("button", { name: "Jornada" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(screen.queryByRole("button", { name: "Convenção Coletiva" })).not.toBeInTheDocument()
  })

  it("restaurar um escolhido chama a rota dele", async () => {
    let caminho = ""
    servidor.use(
      http.post(ROTA, ({ request }) => {
        caminho = new URL(request.url).pathname
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir([CONVENCAO, HABILITACAO])

    await userEvent.click(screen.getByRole("button", { name: "Escolher" }))
    await userEvent.click(screen.getByRole("button", { name: "Habilitação do Condutor" }))

    await waitFor(() => expect(caminho).toContain("/context-topics/HABILITACAO_DO_CONDUTOR"))
  })

  it("restaurar todos restaura um de cada vez, na ordem", async () => {
    const incluidos: string[] = []
    servidor.use(
      http.post(ROTA, ({ params }) => {
        incluidos.push(params.codigo as string)
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir([CONVENCAO, HABILITACAO, JORNADA])

    await userEvent.click(screen.getByRole("button", { name: "Escolher" }))
    await userEvent.click(screen.getByRole("button", { name: "Restaurar todos" }))

    await waitFor(() => expect(incluidos).toEqual(["CONVENCAO_COLETIVA", "HABILITACAO_DO_CONDUTOR"]))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument())
  })

  it("com um só removido, o botão é Restaurar, e a seção fora da lista é dita pelo código", async () => {
    exibir([CONVENCAO], [])
    expect(screen.getByText("1 subtópico do contexto da contratação foi removido.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Escolher" }))
    expect(screen.getByRole("button", { name: "Convenção Coletiva" })).toHaveAttribute(
      "title",
      "Art. 135, II, Lei 14.133/21 · volta em Seção 3",
    )
  })

  it("a recusa do servidor vira aviso, no individual e no conjunto", async () => {
    servidor.use(
      http.post(ROTA, () =>
        HttpResponse.json(
          { detail: "O tópico \"Convenção Coletiva\" já está no documento." },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    exibir([CONVENCAO, HABILITACAO])

    await userEvent.click(screen.getByRole("button", { name: "Escolher" }))
    await userEvent.click(screen.getByRole("button", { name: "Convenção Coletiva" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining("já está no documento")))

    toast.mockReset()
    await userEvent.click(screen.getByRole("button", { name: "Restaurar todos" }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining("já está no documento")))
    expect(screen.getByRole("button", { name: "Restaurar todos" })).toBeEnabled()
  })
})
