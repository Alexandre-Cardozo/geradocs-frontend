import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Configuracoes from "@/app/(app)/configuracoes/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Configurações do órgão — o timbre (ADR-026).
 *
 * Antes de 25/08/2026 esta tela "salvava" brasão, cabeçalho e rodapé num objeto
 * em memória: a prefeitura configurava, recarregava e sumia — e nenhum documento
 * saía com aquilo. Agora vai ao servidor, e é o que sai impresso.
 */
const ORGAO = sessaoServidor.organization.id

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:brasao"),
    revokeObjectURL: vi.fn(),
  })
})

function comTimbre(timbre: {
  hasLogo?: boolean
  headerText?: string
  footerText?: string
  version?: number
}) {
  servidor.use(
    http.get(`${urlDaApi}/me`, () =>
      HttpResponse.json({
        ...sessaoServidor,
        user: { ...sessaoServidor.user, profileAccess: "COORDENADOR" },
      }),
    ),
    http.get(`${urlDaApi}/organizations/:id`, () =>
      HttpResponse.json({ ...sessaoServidor.organization, version: 1 }),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([])),
    http.get(`${urlDaApi}/organizations/:id/letterhead`, () => HttpResponse.json(timbre)),
    http.get(`${urlDaApi}/organizations/:id/letterhead/logo`, () =>
      timbre.hasLogo
        ? HttpResponse.arrayBuffer(new Uint8Array([1, 2]).buffer, {
            headers: { "Content-Type": "image/png" },
          })
        : new HttpResponse(null, { status: 404 }),
    ),
  )
}

/** A tela carrega o tenant antes de desenhar as abas. */
const abaCabecalho = () => screen.findByRole("button", { name: /Cabeçalho e Rodapé/ })

describe("timbre do órgão", () => {
  it("o cabeçalho e o rodapé vêm do servidor, não de um padrão inventado", async () => {
    comTimbre({ headerText: "PREFEITURA DE ECOPORANGA", footerText: "Rua Principal, 100" })
    renderizar(<Configuracoes />)

    await userEvent.click(await abaCabecalho())

    expect(await screen.findByDisplayValue("PREFEITURA DE ECOPORANGA")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Rua Principal, 100")).toBeInTheDocument()
  })

  it("salvar manda os textos ao servidor", async () => {
    comTimbre({ headerText: "Antigo", footerText: "" })
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.put(`${urlDaApi}/organizations/:id/letterhead`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ hasLogo: false, headerText: "Novo", footerText: "", version: 2 })
      }),
    )
    renderizar(<Configuracoes />)
    await userEvent.click(await abaCabecalho())
    const campo = await screen.findByDisplayValue("Antigo")

    await userEvent.clear(campo)
    await userEvent.type(campo, "Novo")
    await userEvent.click(screen.getByRole("button", { name: /Salvar Cabeçalho e Rodapé/ }))

    await waitFor(() => expect(corpo.headerText).toBe("Novo"))
  })

  it("o brasão sobe ao servidor em vez de virar data URL na tela", async () => {
    comTimbre({ hasLogo: false })
    let enviou = false
    servidor.use(
      http.put(`${urlDaApi}/organizations/:id/letterhead/logo`, () => {
        enviou = true
        return HttpResponse.json({ hasLogo: true, headerText: "", footerText: "", version: 2 })
      }),
    )
    renderizar(<Configuracoes />)

    await userEvent.upload(
      await screen.findByLabelText(/Escolher o brasão/),
      new File([new Uint8Array([137, 80])], "brasao.png", { type: "image/png" }),
    )

    await waitFor(() => expect(enviou).toBe(true))
  })

  it("recusa brasão acima de 512 KB antes de gastar a subida", async () => {
    comTimbre({ hasLogo: false })
    let enviou = false
    servidor.use(
      http.put(`${urlDaApi}/organizations/:id/letterhead/logo`, () => {
        enviou = true
        return HttpResponse.json({ hasLogo: true, headerText: "", footerText: "", version: 2 })
      }),
    )
    renderizar(<Configuracoes />)

    await userEvent.upload(
      await screen.findByLabelText(/Escolher o brasão/),
      new File([new Uint8Array(512 * 1024 + 1)], "grande.png", { type: "image/png" }),
    )

    await waitFor(() => expect(enviou).toBe(false))
  })

  it("quem já tem brasão pode substituí-lo ou removê-lo", async () => {
    comTimbre({ hasLogo: true })
    renderizar(<Configuracoes />)

    expect(await screen.findByText("Brasão cadastrado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Substituir" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remover" })).toBeInTheDocument()
  })

  it("não há mais interruptor de 'documentos timbrados'", async () => {
    comTimbre({ hasLogo: true, headerText: "PREFEITURA" })
    renderizar(<Configuracoes />)

    await screen.findByText("Brasão cadastrado")

    // Órgão sem timbre gera documento sem timbre: um interruptor que não
    // desligava nada era ele próprio configuração inventada.
    expect(screen.queryByText(/Documentos timbrados ativados/)).not.toBeInTheDocument()
  })
})
