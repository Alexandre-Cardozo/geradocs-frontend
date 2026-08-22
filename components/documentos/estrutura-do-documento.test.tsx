import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { EstruturaDoDocumento } from "@/components/documentos/estrutura-do-documento"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * O servidor acrescenta, exclui e reordena o que ele criou (ADR-018).
 *
 * As do catálogo não aparecem aqui: reordená-las produziria um ETP com os
 * incisos fora de ordem, e excluí-las apagaria o que a dispensa justificada
 * existe para registrar.
 */
const PROCESSO = documentoApi.processId

function secao(id: string, titulo: string, origem: "catalogo" | "servidor"): SecaoDocumento {
  return {
    id,
    titulo,
    status: "Não iniciado",
    obrigatoria: origem === "catalogo",
    origem,
    conteudo: "",
    ...(origem === "catalogo"
      ? { hint: "Demonstre.", fundamentoLegal: "Art. 18, § 1º, Lei 14.133/21" }
      : {}),
  }
}

const SECOES = [
  secao("1", "Necessidade", "catalogo"),
  secao("2", "Requisitos", "catalogo"),
  secao("2.1", "Memória de cálculo", "servidor"),
  secao("2.2", "Justificativa do fornecedor", "servidor"),
]

async function escolher(rotulo: string, opcao: RegExp) {
  await userEvent.click(await screen.findByRole("button", { name: rotulo }))
  await userEvent.click(await screen.findByRole("option", { name: opcao }))
}

describe("estrutura do documento", () => {
  it("só oferece seções do catálogo como âncora", async () => {
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Seção do catálogo em que a nova se ancora" }),
    )

    // Ancorar em uma seção criada pelo servidor deixaria a nova pendurada em
    // algo que ele pode excluir depois.
    expect(screen.getByRole("option", { name: /^1\. Necessidade/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Memória de cálculo/ })).not.toBeInTheDocument()
  })

  it("não acrescenta sem título e sem âncora, e diz o que falta", async () => {
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)
    const botao = screen.getByRole("button", { name: /^Acrescentar$/ })

    expect(botao).toBeDisabled()
    const motivo = botao.getAttribute("aria-describedby")
    expect(document.getElementById(motivo!)?.textContent).toMatch(/em que ela se ancora/i)
  })

  it("acrescenta com título, âncora e tipo", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(documentoApi)
      }),
    )
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    await userEvent.type(screen.getByPlaceholderText(/Memória de cálculo/), "Nova seção")
    await escolher("Seção do catálogo em que a nova se ancora", /^2\. Requisitos/)
    await userEvent.click(screen.getByRole("button", { name: /^Acrescentar$/ }))

    await waitFor(() => expect(corpo.title).toBe("Nova seção"))
    expect(corpo.anchorSectionCode).toBe("2")
    expect(corpo.nested).toBe(true)
  })

  it("lista só as seções do servidor para excluir e reordenar", () => {
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    expect(screen.getByText("Memória de cálculo")).toBeInTheDocument()
    // A do catálogo não tem botão de excluir: ela tem a dispensa justificada,
    // que registra a ausência em vez de apagá-la.
    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(2)
  })

  it("reordenar envia a ordem nova das seções do servidor", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections-order`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(documentoApi)
        },
      ),
    )
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    await userEvent.click(screen.getAllByRole("button", { name: "Descer" })[0]!)

    await waitFor(() => expect(corpo.sectionCodesInOrder).toEqual(["2.2", "2.1"]))
  })

  it("a primeira não sobe e a última não desce", () => {
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    // Botão que não faz nada é pior que botão ausente: a pessoa clica e conclui
    // que a tela está quebrada.
    expect(screen.getAllByRole("button", { name: "Subir" })[0]).toBeDisabled()
    expect(screen.getAllByRole("button", { name: "Descer" })[1]).toBeDisabled()
  })

  it("excluir envia o código da seção", async () => {
    let rota = ""
    servidor.use(
      http.delete(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`,
        ({ request }) => {
          rota = new URL(request.url).pathname
          return HttpResponse.json(documentoApi)
        },
      ),
    )
    renderizar(<EstruturaDoDocumento processoId={PROCESSO} tipo="ETP" secoes={SECOES} />)

    await userEvent.click(screen.getAllByRole("button", { name: "Excluir" })[0]!)

    await waitFor(() => expect(rota).toContain("/sections/2.1"))
  })

  it("documento sem seção criada não mostra a lista", () => {
    renderizar(
      <EstruturaDoDocumento
        processoId={PROCESSO}
        tipo="ETP"
        secoes={SECOES.filter((s) => s.origem === "catalogo")}
      />,
    )

    expect(screen.queryByText("Seções que você criou")).not.toBeInTheDocument()
  })
})
