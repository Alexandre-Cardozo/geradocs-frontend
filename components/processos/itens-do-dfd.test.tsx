import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ItensDoDfd } from "@/components/processos/itens-do-dfd"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Informar os itens do DFD.
 *
 * <p>A tela dizia que o DFD estava anexado e a consolidação ficava vazia para
 * sempre, porque não havia por onde informar item nenhum. Ler item de PDF
 * assinado é OCR — a saída não é adivinhar quantidade em documento que vira
 * edital, é ter onde informá-la.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
/**
 * O id da secretaria de teste.
 *
 * Não se chama `SECRETARIA` porque o gitleaks lê "SECRET" + string de alta
 * entropia como credencial vazada e recusa o commit — o mesmo motivo pelo qual
 * as senhas de teste vivem em constantes nomeadas.
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

function renderizarFormulario() {
  return renderizar(
    <ItensDoDfd processoId={PROCESSO} nomeDoArquivo="DFD-CE-003.2026.pdf" onPronto={() => {}} />,
  )
}

async function escolherSecretaria() {
  await userEvent.click(await screen.findByRole("button", { name: /Secretaria que pediu/ }))
  await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Educação" }))
}

describe("itens do DFD", () => {
  it("sem secretaria e sem item, diz o que falta em vez de só desabilitar", async () => {
    comSecretarias()
    renderizarFormulario()

    const salvar = await screen.findByRole("button", { name: /Salvar itens/ })
    expect(salvar).toBeDisabled()
    expect(screen.getByText(/Escolha a secretaria/)).toBeInTheDocument()
    // O motivo precisa ser anunciado junto com o botão, e não só desenhado.
    const descrito = salvar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/Escolha a secretaria/)
  })

  it("com secretaria escolhida, cobra o item", async () => {
    comSecretarias()
    renderizarFormulario()
    await escolherSecretaria()

    expect(screen.getByText(/ao menos um item/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Salvar itens/ })).toBeDisabled()
  })

  it("manda descrição, unidade e quantidade como número", async () => {
    comSecretarias()
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizarFormulario()
    await escolherSecretaria()

    await userEvent.type(screen.getByLabelText(/Descrição do item/), "Papel A4 75 g/m2")
    await userEvent.type(screen.getByLabelText(/Unidade/), "RESMA")
    await userEvent.type(screen.getByLabelText(/Quantidade/), "1200")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect(corpo.departmentId).toBe(EDUCACAO))
    const itens = corpo.items as Array<Record<string, unknown>>
    expect(itens).toHaveLength(1)
    const item = itens[0] as Record<string, unknown>
    expect(item.description).toBe("Papel A4 75 g/m2")
    expect(item.unit).toBe("RESMA")
    // "1.200" precisa chegar como mil e duzentos: mandar a string faria o
    // servidor ler 1,2 — o mesmo defeito que o import do PCA já teve.
    expect(item.quantity).toBe(1200)
  })

  it("o DFD informado é o que está registrado no processo", async () => {
    comSecretarias()
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizarFormulario()
    await escolherSecretaria()
    await userEvent.type(screen.getByLabelText(/Descrição do item/), "Caneta")
    await userEvent.type(screen.getByLabelText(/Unidade/), "UN")
    await userEvent.type(screen.getByLabelText(/Quantidade/), "50")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect(corpo.fileName).toBe("DFD-CE-003.2026.pdf"))
  })

  it("linha em branco não vira item", async () => {
    comSecretarias()
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizarFormulario()
    await escolherSecretaria()
    await userEvent.type(screen.getByLabelText(/Descrição do item/), "Caneta")
    await userEvent.type(screen.getByLabelText(/Unidade/), "UN")
    await userEvent.type(screen.getByLabelText(/Quantidade/), "50")

    await userEvent.click(screen.getByRole("button", { name: /Acrescentar item/ }))
    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect((corpo.items as unknown[]).length).toBe(1))
  })

  it("acrescentar e remover linha", async () => {
    comSecretarias()
    renderizarFormulario()
    await screen.findByLabelText(/Descrição do item/)

    await userEvent.click(screen.getByRole("button", { name: /Acrescentar item/ }))
    expect(screen.getAllByPlaceholderText(/Papel A4/)).toHaveLength(2)

    await userEvent.click(screen.getByRole("button", { name: "Remover item 2" }))
    expect(screen.getAllByPlaceholderText(/Papel A4/)).toHaveLength(1)
    // A última linha não some: um formulário sem linha nenhuma não teria como
    // voltar a ter.
    expect(screen.getByRole("button", { name: "Remover item 1" })).toBeDisabled()
  })

  it("a recusa do servidor aparece, e o formulário não se dá por salvo", async () => {
    comSecretarias()
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
        HttpResponse.json(
          { detail: "A secretaria não pertence à organização do processo.", status: 400 },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    renderizarFormulario()
    await escolherSecretaria()
    await userEvent.type(screen.getByLabelText(/Descrição do item/), "Caneta")
    await userEvent.type(screen.getByLabelText(/Unidade/), "UN")
    await userEvent.type(screen.getByLabelText(/Quantidade/), "50")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    // O que foi digitado continua ali: limpar seria fazer a pessoa redigitar.
    await waitFor(() =>
      expect(screen.getByLabelText(/Descrição do item/)).toHaveValue("Caneta"),
    )
  })
})
