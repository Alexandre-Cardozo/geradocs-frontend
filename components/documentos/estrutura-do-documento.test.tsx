import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EstruturaDoDocumento } from "@/components/documentos/estrutura-do-documento"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor, within } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * O servidor acrescenta, renomeia, exclui e reordena o que ele criou (ADR-018), inclusive
 * os subtópicos vindos do contexto da contratação (ADR-061).
 *
 * As do catálogo não aparecem: reordená-las produziria um ETP com os incisos
 * fora de ordem. Subir e descer valem dentro da seção-mãe, onde a ordem existe.
 */
const toast = vi.fn()
vi.mock("@/components/shared/providers", () => ({ useToast: () => toast }))

const PROCESSO = documentoApi.processId

function secao(id: string, titulo: string, origem: "catalogo" | "servidor", secaoPai?: string): SecaoDocumento {
  return {
    id,
    titulo,
    status: "Não iniciado",
    obrigatoria: origem === "catalogo",
    origem,
    conteudo: "",
    ...(origem === "catalogo" ? { hint: "Demonstre.", fundamentoLegal: "Art. 18, § 1º, Lei 14.133/21" } : {}),
    ...(secaoPai ? { secaoPai } : {}),
  }
}

const SECOES = [
  secao("1", "Necessidade", "catalogo"),
  secao("2", "Requisitos", "catalogo"),
  secao("2.1", "Memória de cálculo", "servidor", "2"),
  secao("2.2", "Justificativa do fornecedor", "servidor", "2"),
  secao("2+1", "Seção depois de Requisitos", "servidor"),
  secao("3", "Quantidades", "catalogo"),
  secao("3.1", "Convenção Coletiva", "servidor", "3"),
]

async function escolher(rotulo: string, opcao: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name: rotulo }))
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

function exibir(secoes = SECOES) {
  renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={secoes} />)
}

async function abrirFormulario() {
  await userEvent.click(screen.getByRole("button", { name: "Acrescentar seção" }))
}

beforeEach(() => toast.mockReset())

describe("estrutura do documento", () => {
  it("o formulário fica recolhido até pedir, e cancelar recolhe de novo", async () => {
    exibir()
    expect(screen.queryByPlaceholderText(/Memória de cálculo/)).not.toBeInTheDocument()

    await abrirFormulario()
    expect(screen.getByPlaceholderText(/Memória de cálculo/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByPlaceholderText(/Memória de cálculo/)).not.toBeInTheDocument()
  })

  it("só oferece seções do catálogo como âncora", async () => {
    exibir()
    await abrirFormulario()

    await userEvent.click(screen.getByRole("button", { name: "Seção do catálogo em que a nova se ancora" }))

    expect(screen.getByRole("option", { name: /^1\. Necessidade/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Memória de cálculo/ })).not.toBeInTheDocument()
  })

  it("não acrescenta sem título e sem âncora, e diz o que falta", async () => {
    exibir()
    await abrirFormulario()
    const botao = screen.getByRole("button", { name: /^Acrescentar$/ })

    expect(botao).toBeDisabled()
    const motivo = botao.getAttribute("aria-describedby")
    expect(document.getElementById(motivo!)?.textContent).toMatch(/em que ela se ancora/i)
  })

  it("acrescenta com título, âncora e tipo, e recolhe o formulário", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir()
    await abrirFormulario()

    await userEvent.type(screen.getByPlaceholderText(/Memória de cálculo/), "Nova seção")
    await escolher("Seção do catálogo em que a nova se ancora", /^2\. Requisitos/)
    await escolher("Tipo da seção nova", /Seção nova logo depois/)
    await userEvent.click(screen.getByRole("button", { name: /^Acrescentar$/ }))

    await waitFor(() => expect(corpo).toEqual({ title: "Nova seção", anchorSectionCode: "2", nested: false }))
    await waitFor(() => expect(screen.queryByPlaceholderText(/Memória de cálculo/)).not.toBeInTheDocument())
  })

  it("a recusa do servidor ao acrescentar vira aviso, em vez de silêncio", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections`, () =>
        HttpResponse.json(
          { detail: "A seção 99 não existe em Estudo Técnico Preliminar." },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    exibir()
    await abrirFormulario()

    await userEvent.type(screen.getByPlaceholderText(/Memória de cálculo/), "Nova")
    await escolher("Seção do catálogo em que a nova se ancora", /^1\. Necessidade/)
    await userEvent.click(screen.getByRole("button", { name: /^Acrescentar$/ }))

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining("não existe")))
    expect(screen.getByPlaceholderText(/Memória de cálculo/)).toHaveValue("Nova")
  })

  it("agrupa pela seção-mãe, e separa subtópicos de seções novas", () => {
    exibir()

    const grupos = screen.getAllByRole("list")
    expect(grupos).toHaveLength(3)
    expect(screen.getByText("2. Requisitos")).toBeInTheDocument()
    expect(screen.getByText("Depois de 2. Requisitos")).toBeInTheDocument()
    expect(screen.getByText("3. Quantidades")).toBeInTheDocument()
    expect(within(grupos[0]!).getAllByRole("listitem")).toHaveLength(2)
    // As do catálogo não têm excluir: têm a dispensa justificada.
    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(4)
  })

  it("subir e descer valem dentro do grupo, e mandam a ordem nova só dele", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections-order`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir()
    const [requisitos, depois, quantidades] = screen.getAllByRole("list")

    // O único do grupo não sobe nem desce: não há com quem trocar.
    expect(within(depois!).getByRole("button", { name: "Subir" })).toBeDisabled()
    expect(within(quantidades!).getByRole("button", { name: "Descer" })).toBeDisabled()
    expect(within(requisitos!).getAllByRole("button", { name: "Subir" })[0]).toBeDisabled()
    expect(within(requisitos!).getAllByRole("button", { name: "Descer" })[1]).toBeDisabled()

    await userEvent.click(within(requisitos!).getAllByRole("button", { name: "Descer" })[0]!)

    await waitFor(() => expect(corpo.sectionCodesInOrder).toEqual(["2.2", "2.1"]))
  })

  it("excluir manda o código e avisa se o servidor recusar", async () => {
    let caminho = ""
    servidor.use(
      http.delete(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`, ({ request }) => {
        caminho = new URL(request.url).pathname
        return HttpResponse.json({ detail: "Falhou." }, { status: 400, headers: { "Content-Type": "application/problem+json" } })
      }),
    )
    exibir()

    await userEvent.click(within(screen.getAllByRole("list")[2]!).getByRole("button", { name: "Excluir" }))

    await waitFor(() => expect(caminho).toContain("/sections/3.1"))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Falhou."))
  })

  it("renomear abre o campo com o título, e Enter manda só o título novo", async () => {
    let caminho = ""
    let corpo: unknown
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/title`, async ({ request }) => {
        caminho = new URL(request.url).pathname
        corpo = await request.json()
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir()
    const [requisitos] = screen.getAllByRole("list")

    await userEvent.click(within(requisitos!).getAllByRole("button", { name: "Renomear" })[0]!)
    const campo = screen.getByRole("textbox", { name: "Novo título de Memória de cálculo" })
    expect(campo).toHaveValue("Memória de cálculo")
    await userEvent.clear(campo)
    await userEvent.type(campo, "  Memória do quantitativo {Enter}")

    await waitFor(() => expect(caminho).toContain("/sections/2.1/title"))
    expect(corpo).toEqual({ title: "Memória do quantitativo" })
    await waitFor(() => expect(screen.queryByRole("textbox", { name: /Novo título/ })).not.toBeInTheDocument())
  })

  it("Esc, cancelar, título igual ou vazio fecham sem mandar nada", async () => {
    const put = vi.fn()
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/title`, () => {
        put()
        return HttpResponse.json(documentoApi)
      }),
    )
    exibir()
    const renomear = () => userEvent.click(screen.getAllByRole("button", { name: "Renomear" })[0]!)
    const campo = () => screen.getByRole("textbox", { name: /Novo título/ })

    await renomear()
    await userEvent.type(campo(), "{Escape}")
    expect(screen.queryByRole("textbox", { name: /Novo título/ })).not.toBeInTheDocument()

    await renomear()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar edição do título" }))
    expect(screen.queryByRole("textbox", { name: /Novo título/ })).not.toBeInTheDocument()

    await renomear()
    await userEvent.click(screen.getByRole("button", { name: "Salvar título" }))
    expect(screen.queryByRole("textbox", { name: /Novo título/ })).not.toBeInTheDocument()

    await renomear()
    await userEvent.clear(campo())
    await userEvent.type(campo(), "   {Enter}")
    expect(screen.queryByRole("textbox", { name: /Novo título/ })).not.toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it("a recusa ao renomear vira aviso, e o campo continua aberto", async () => {
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/title`, () =>
        HttpResponse.json(
          { detail: "A seção 2.1 não foi criada neste documento." },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    exibir()

    await userEvent.click(screen.getAllByRole("button", { name: "Renomear" })[0]!)
    await userEvent.type(screen.getByRole("textbox", { name: /Novo título/ }), " revisada")
    await userEvent.click(screen.getByRole("button", { name: "Salvar título" }))

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining("não foi criada")))
    expect(screen.getByRole("textbox", { name: /Novo título/ })).toHaveValue("Memória de cálculo revisada")
  })

  it("sem nada acrescentado, só o botão de acrescentar", () => {
    exibir(SECOES.filter((s) => s.origem === "catalogo"))
    expect(screen.queryByText(/acrescentados/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Acrescentar seção" })).toBeInTheDocument()
  })

  it("âncora que não está na lista ainda nomeia o grupo pelo código", () => {
    exibir([secao("1", "Necessidade", "catalogo"), secao("9.1", "Órfã", "servidor", "9")])
    expect(screen.getByText("Seção 9")).toBeInTheDocument()
  })
})
