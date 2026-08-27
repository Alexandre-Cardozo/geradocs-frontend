import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { DfdsDoProcesso } from "@/components/processos/dfds-do-processo"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O cadastro de DFDs do processo.
 *
 * <p>Registrar o DFD é uma operação; informar item é outra (ADR-036). Aqui só se
 * cobra a primeira: quem formalizou, como o processo se refere ao documento, e o
 * arquivo — que pode chegar a qualquer momento.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const PDF = "application/pdf"
/**
 * O id da secretaria de teste.
 *
 * Não se chama `SECRETARIA` porque o gitleaks lê "SECRET" + string de alta
 * entropia como credencial vazada e recusa o commit.
 */
const EDUCACAO = "02753761-6201-45f7-a9d9-2a1abf6d4f3c"

function comSecretarias() {
  servidor.use(
    http.get(`${urlDaApi}/organizations/:id`, () =>
      HttpResponse.json({ ...sessaoServidor.organization, version: 1 }),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () =>
      HttpResponse.json([
        {
          id: EDUCACAO,
          organizationId: sessaoServidor.organization.id,
          name: "Secretaria de Educação",
          acronym: null,
          active: true,
          version: 0,
        },
      ]),
    ),
  )
}

function comDfds(dfds: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

const dfd = (
  id: string,
  fileName: string,
  departmentName: string,
  items: unknown[],
  file: unknown = null,
) => ({
  id,
  fileName,
  departmentId: EDUCACAO,
  departmentName,
  submittedAt: "2026-03-10T12:00:00Z",
  items,
  file,
})

const papel = { description: "Papel A4", unit: "RESMA", quantity: 1200, specification: null }

describe("DFDs do processo", () => {
  it("cada DFD aparece com a secretaria que formalizou e quantos itens estão vinculados", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel]),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", []),
    ])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText("DFD 003/2026")).toBeInTheDocument()
    expect(screen.getByText(/Secretaria de Educação/)).toBeInTheDocument()
    expect(screen.getByText("1 item")).toBeInTheDocument()
    // Sem item não é pendência: o documento pode ser registrado antes de o
    // detalhamento da demanda chegar.
    expect(screen.getByText("Sem itens")).toBeInTheDocument()
  })

  it("registrar um DFD não pede item nenhum", async () => {
    let corpo: Record<string, unknown> = {}
    comSecretarias()
    comDfds([])
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, async ({ request }) => {
        const formulario = await request.formData()
        corpo = JSON.parse(await (formulario.get("dados") as Blob).text()) as Record<
          string,
          unknown
        >
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Registrar DFD/ }))
    await userEvent.click(await screen.findByRole("button", { name: /Secretaria que formalizou/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Educação" }))
    await userEvent.type(screen.getByLabelText("Identificação do DFD"), "DFD 003/2026")
    await userEvent.click(screen.getByRole("button", { name: "Registrar DFD" }))

    // Registrar o documento e informar o que ele pede são atos de momentos
    // diferentes; exigir item aqui obrigaria a inventar quantidade.
    await waitFor(() => expect(corpo.fileName).toBe("DFD 003/2026"))
    expect(corpo.departmentId).toBe(EDUCACAO)
    expect(corpo.items).toEqual([])
  })

  it("sem secretaria e sem identificação, diz o que falta em vez de só desabilitar", async () => {
    comSecretarias()
    comDfds([])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Registrar DFD/ }))

    const salvar = screen.getByRole("button", { name: "Registrar DFD" })
    expect(salvar).toBeDisabled()
    const descrito = salvar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/Escolha a secretaria/)
  })

  it("o arquivo escolhido dá nome ao DFD quando não há outro", async () => {
    comSecretarias()
    comDfds([])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Registrar DFD/ }))
    await userEvent.upload(
      screen.getByLabelText("Arquivo do DFD"),
      new File(["%PDF-1.7"], "DFD-Educacao-2026.pdf", { type: PDF }),
    )

    expect(screen.getByLabelText("Identificação do DFD")).toHaveValue("DFD-Educacao-2026.pdf")
  })

  it("o arquivo pode ser anexado depois, direto na linha", async () => {
    let recebeu: string | null = null
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [])])
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId/file`, async ({ request }) => {
        const corpo = await request.formData()
        recebeu = (corpo.get("file") as File).name
        return HttpResponse.json({})
      }),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    // "Sem arquivo" era estado sem saída: o PDF assinado chega no tempo dele,
    // às vezes só no fim do processo.
    await userEvent.upload(
      await screen.findByLabelText("Arquivo de DFD 003/2026"),
      new File(["%PDF-1.7"], "assinado.pdf", { type: PDF }),
    )

    await waitFor(() => expect(recebeu).toBe("assinado.pdf"))
  })

  it("com arquivo, a linha oferece o download e a substituição", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [], {
        mediaType: PDF,
        byteSize: 2048,
        sha256: "a".repeat(64),
      }),
    ])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText(/2,0 KB/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Baixar DFD 003\/2026/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Substituir" })).toBeInTheDocument()
  })

  it("remover pede confirmação, e diz quantos itens vão junto", async () => {
    let removeu = false
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    servidor.use(
      http.delete(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId`, () => {
        removeu = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }))

    // Os itens vinculados saem junto: dizer quantos evita a surpresa de ver a
    // consolidação encolher depois do clique.
    expect(screen.getByText(/Remover o DFD e os 1 item\(ns\) dele\?/)).toBeInTheDocument()
    expect(removeu).toBe(false)

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(removeu).toBe(true))
  })

  it("desistir da remoção volta a linha ao normal", async () => {
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByText(/Remover o DFD/)).not.toBeInTheDocument()
  })

  it("sem DFD nenhum, diz que este é o primeiro passo", async () => {
    comDfds([])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText(/Nenhum DFD registrado/)).toBeInTheDocument()
  })

  it("a falha do servidor aparece na tela", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText(/Não foi possível listar/)).toBeInTheDocument()
  })
})
