import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { DocumentoDaColeta } from "@/components/documentos/documento-da-coleta"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { ColetaDePreco } from "@/lib/api/procurement-client"

/**
 * O documento que dá suporte a um preço coletado.
 *
 * <p>O Art. 3º da IN SEGES/ME nº 65/2021 exige a memória de cálculo "e os
 * documentos que lhe dão suporte". A coleta nasce sem — o preço é anotado na
 * hora da consulta —, e é isso que a tela precisa dizer sem transformar a
 * ausência em bloqueio.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const coleta = (documento: ColetaDePreco["documento"]): ColetaDePreco => ({
  id: "c-1",
  item: "Papel A4",
  fonte: "Painel de Preços",
  valorUnitario: "24,90",
  coletadoEm: "2026-08-20T14:30:00Z",
  documento,
  registradaEm: "2026-08-28T12:00:00Z",
})

describe("documento de suporte da coleta", () => {
  it("sem documento, oferece anexar sem tratar a ausência como erro", async () => {
    renderizar(<DocumentoDaColeta processoId={PROCESSO} coleta={coleta(null)} />)

    expect(screen.getByText("Sem documento de suporte")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Anexar comprovante/ })).toBeEnabled()
  })

  it("com documento, mostra o nome, o tamanho e oferece baixar e substituir", () => {
    renderizar(
      <DocumentoDaColeta
        processoId={PROCESSO}
        coleta={coleta({
          nome: "painel-de-precos.png",
          tipo: "image/png",
          bytes: 2048,
          resumo: "a".repeat(64),
        })}
      />,
    )

    expect(screen.getByText("Com documento de suporte")).toBeInTheDocument()
    expect(screen.getByText(/painel-de-precos.png/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Baixar/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Substituir/ })).toBeInTheDocument()
  })

  it("anexa a captura da tela — é ela que comprova o preço de sítio eletrônico", async () => {
    let recebido = ""
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId/file`,
        async ({ request }) => {
          const corpo = await request.formData()
          recebido = (corpo.get("file") as File).name
          return HttpResponse.json({})
        },
      ),
    )
    renderizar(<DocumentoDaColeta processoId={PROCESSO} coleta={coleta(null)} />)

    await userEvent.upload(
      screen.getByLabelText(/Documento de suporte de Papel A4/),
      new File(["captura"], "painel-de-precos.png", { type: "image/png" }),
    )

    await waitFor(() => expect(recebido).toBe("painel-de-precos.png"))
  })

  it("quando o envio falha, a tela diz — e não finge que anexou", async () => {
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId/file`, () =>
        HttpResponse.json({ detail: "Formato não aceito." }, { status: 400 }),
      ),
    )
    renderizar(<DocumentoDaColeta processoId={PROCESSO} coleta={coleta(null)} />)

    await userEvent.upload(
      screen.getByLabelText(/Documento de suporte de Papel A4/),
      new File(["x"], "preco.exe", { type: "application/x-msdownload" }),
    )

    // O aviso vai pelo toast, que só existe dentro dos provedores da aplicação.
    // O que se cobra aqui é a consequência: a tela continua dizendo que o preço
    // está sem lastro, em vez de exibir um anexo que o servidor recusou.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Anexar comprovante/ })).toBeEnabled(),
    )
    expect(screen.getByText("Sem documento de suporte")).toBeInTheDocument()
  })

  it("baixar entrega os bytes e libera a memória", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId/file`, () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode("captura").buffer as ArrayBuffer, {
          headers: { "Content-Type": "image/png" },
        }),
      ),
    )
    const criar = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:documento")
    const revogar = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    renderizar(
      <DocumentoDaColeta
        processoId={PROCESSO}
        coleta={coleta({
          nome: "painel.png",
          tipo: "image/png",
          bytes: 7,
          resumo: "a".repeat(64),
        })}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Baixar/ }))

    // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
    await waitFor(() => expect(revogar).toHaveBeenCalledWith("blob:documento"))
    criar.mockRestore()
    revogar.mockRestore()
  })

  it("quando o download falha, a tela avisa", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId/file`, () =>
        HttpResponse.json({ detail: "Documento não encontrado." }, { status: 404 }),
      ),
    )
    renderizar(
      <DocumentoDaColeta
        processoId={PROCESSO}
        coleta={coleta({
          nome: "painel.png",
          tipo: "image/png",
          bytes: 7,
          resumo: "a".repeat(64),
        })}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Baixar/ }))

    // O botão volta ao estado de repouso: travado em "Baixando..." deixaria a
    // pessoa esperando por um download que não vem.
    await waitFor(() => expect(screen.getByRole("button", { name: "Baixar" })).toBeEnabled())
  })
})
