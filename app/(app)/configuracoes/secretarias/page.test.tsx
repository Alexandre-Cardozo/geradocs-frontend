import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import Secretarias from "@/app/(app)/configuracoes/secretarias/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Secretarias do órgão — a tela que alimenta a Secretaria Requisitante do
 * processo. Desde 26/08/2026 é rota própria, e não a terceira aba de uma tela
 * que também tratava de timbre, PCA e usuários.
 */
function comSecretarias(secretarias: Array<{ id: string; name: string; active: boolean }>) {
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
    http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json(secretarias)),
  )
}

describe("secretarias do órgão", () => {
  it("lista as secretarias cadastradas", async () => {
    comSecretarias([
      { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente", active: true },
    ])
    renderizar(<Secretarias />)

    expect(await screen.findByText("Secretaria de Meio Ambiente")).toBeInTheDocument()
  })

  it("órgão sem secretaria diz que está vazio, em vez de mostrar uma grade em branco", async () => {
    comSecretarias([])
    renderizar(<Secretarias />)

    expect(await screen.findByText(/Nenhuma secretaria cadastrada/)).toBeInTheDocument()
  })

  it("cadastrar manda o nome ao servidor e a lista passa a mostrá-la", async () => {
    comSecretarias([])
    let criada: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        criada = (await request.json()) as Record<string, unknown>
        servidor.use(
          http.get(`${urlDaApi}/organizations/:id/departments`, () =>
            HttpResponse.json([
              { id: "3f0f6b0e-6f2f-4a4e-9b02-1c2d3e4f5a6b", name: "Secretaria de Cultura", active: true },
            ]),
          ),
        )
        return HttpResponse.json({
          id: "3f0f6b0e-6f2f-4a4e-9b02-1c2d3e4f5a6b",
          name: "Secretaria de Cultura",
          active: true,
        })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.type(
      await screen.findByPlaceholderText(/Secretaria de Cultura e Turismo/),
      "Secretaria de Cultura",
    )
    await userEvent.click(screen.getByRole("button", { name: /Adicionar Nova Secretaria/ }))

    await waitFor(() => expect(criada.name).toBe("Secretaria de Cultura"))
    expect(await screen.findByText("Secretaria de Cultura")).toBeInTheDocument()
  })
})

describe("teclado e edição do nome", () => {
  /**
   * O cadastro é de uma palavra só, e repetido: quem cadastra cinco secretarias
   * digita e tecla Enter cinco vezes. Obrigar o mouse a cada uma era atrito sem
   * motivo — e o botão continua ali, alcançável por Tab, para quem prefere.
   */
  it("Enter no campo cadastra sem passar pelo botão", async () => {
    comSecretarias([])
    let criada: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        criada = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: "3f0f6b0e-6f2f-4a4e-9b02-1c2d3e4f5a6b",
          name: "Secretaria de Educação",
          active: true,
        })
      }),
    )
    renderizar(<Secretarias />)

    const campo = await screen.findByLabelText("Nome da nova secretaria")
    await userEvent.type(campo, "Secretaria de Educação{Enter}")

    await waitFor(() => expect(criada.name).toBe("Secretaria de Educação"))
  })

  it("Tab leva do campo ao botão, e o Enter de lá cadastra", async () => {
    comSecretarias([])
    let criada: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        criada = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: "1", name: "Secretaria de Cultura", active: true })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.type(await screen.findByLabelText("Nome da nova secretaria"), "Secretaria de Cultura")
    await userEvent.tab()

    // Nada focável entre o campo e o botão: quem prefere confirmar olhando para
    // o botão chega nele com um Tab só.
    expect(screen.getByRole("button", { name: /Adicionar Nova Secretaria/ })).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    await waitFor(() => expect(criada.name).toBe("Secretaria de Cultura"))
  })

  it("renomear troca só o nome, mantendo a sigla, e a lista mostra o novo", async () => {
    comSecretarias([
      { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Obras", active: true },
    ])
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        servidor.use(
          http.get(`${urlDaApi}/organizations/:id/departments`, () =>
            HttpResponse.json([
              {
                id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
                name: "Secretaria de Obras e Serviços",
                active: true,
              },
            ]),
          ),
        )
        return HttpResponse.json({
          id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
          name: "Secretaria de Obras e Serviços",
          active: true,
        })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: "Renomear Secretaria de Obras" }))
    const campo = screen.getByLabelText("Novo nome de Secretaria de Obras")
    await userEvent.clear(campo)
    await userEvent.type(campo, "Secretaria de Obras e Serviços{Enter}")

    await waitFor(() => expect(corpo.name).toBe("Secretaria de Obras e Serviços"))
    expect(await screen.findByText("Secretaria de Obras e Serviços")).toBeInTheDocument()
  })

  it("Esc desiste da edição e o nome antigo continua na lista", async () => {
    comSecretarias([
      { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Obras", active: true },
    ])
    let renomeou = false
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, () => {
        renomeou = true
        return HttpResponse.json({ id: "x", name: "x", active: true })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: "Renomear Secretaria de Obras" }))
    await userEvent.type(screen.getByLabelText("Novo nome de Secretaria de Obras"), " e Serviços{Escape}")

    expect(renomeou).toBe(false)
    expect(await screen.findByText("Secretaria de Obras")).toBeInTheDocument()
  })

  it("confirmar sem mudar nada não gasta uma gravação", async () => {
    comSecretarias([
      { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Obras", active: true },
    ])
    let renomeou = false
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, () => {
        renomeou = true
        return HttpResponse.json({ id: "x", name: "x", active: true })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: "Renomear Secretaria de Obras" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar o nome de Secretaria de Obras" }))

    // Gravar o que não mudou subiria a versão do registro e apareceria na
    // trilha do órgão como uma edição que não houve.
    expect(renomeou).toBe(false)
    expect(await screen.findByText("Secretaria de Obras")).toBeInTheDocument()
  })

  it("nome em branco não é salvo", async () => {
    comSecretarias([
      { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Obras", active: true },
    ])
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: "Renomear Secretaria de Obras" }))
    await userEvent.clear(screen.getByLabelText("Novo nome de Secretaria de Obras"))

    expect(screen.getByRole("button", { name: "Salvar o nome de Secretaria de Obras" })).toBeDisabled()
  })
})
