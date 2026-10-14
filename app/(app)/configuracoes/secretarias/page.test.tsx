import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import Secretarias from "@/app/(app)/configuracoes/secretarias/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor, within } from "@/lib/teste/renderizar"
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

const OBRAS = { id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Obras", active: true, version: 2 }

const saude = {
  id: "7c1e0d2a-9b8f-4e6d-a5c4-3b2a1f0e9d8c",
  name: "Secretaria de Saúde",
  acronym: "SMS",
  active: true,
  version: 4,
  details: {
    institutionalEmail: "saude@ecoporanga.es.gov.br",
    address: "Rua Central, 10",
    managementUnit: "020101",
    secretaryName: "Ana Souza",
    secretaryCpf: "***.982.247-**",
    secretaryAppointment: "Decreto nº 1.234/2025",
  },
}

const cartao = async (nome: string) => within(await screen.findByRole("article", { name: nome }))

describe("secretarias do órgão", () => {
  it("lista as secretarias com a ficha à vista e diz quantas estão incompletas", async () => {
    comSecretarias([OBRAS, saude])
    renderizar(<Secretarias />)

    const obras = await cartao("Secretaria de Obras")
    expect(obras.getByText("Ficha Incompleta")).toBeInTheDocument()
    expect(obras.getAllByText("Não informado")).toHaveLength(5)
    expect(obras.getByRole("button", { name: /Completar Ficha/ })).toBeInTheDocument()

    const daSaude = await cartao("Secretaria de Saúde")
    expect(daSaude.getByText("Ficha Completa")).toBeInTheDocument()
    expect(daSaude.getByText("Ana Souza · CPF ***.982.247-**")).toBeInTheDocument()
    expect(daSaude.getByText("Decreto nº 1.234/2025")).toBeInTheDocument()

    expect(screen.getByText("2 secretarias · 1 com ficha incompleta")).toBeInTheDocument()
  })

  it("órgão sem secretaria diz que está vazio e oferece o cadastro ali mesmo", async () => {
    comSecretarias([])
    renderizar(<Secretarias />)

    expect(await screen.findByText(/Nenhuma secretaria cadastrada/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Nova Secretaria/ }))

    expect(screen.getByRole("form", { name: "Nova secretaria" })).toBeInTheDocument()
    expect(screen.queryByText(/Nenhuma secretaria cadastrada/)).not.toBeInTheDocument()
  })
})

/**
 * O cadastro já traz a ficha: cadastrar só o nome e voltar depois para
 * completá-la era um passo que se esquecia — e o DFD saía sem os dados.
 */
describe("nova secretaria", () => {
  it("cadastra o nome com a ficha numa requisição só, e a lista passa a mostrá-la", async () => {
    comSecretarias([OBRAS])
    let criada: { name?: string; details?: Record<string, unknown> } = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        criada = (await request.json()) as typeof criada
        const nova = { id: "3f0f6b0e-6f2f-4a4e-9b02-1c2d3e4f5a6b", name: "Secretaria de Cultura", active: true }
        servidor.use(http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([OBRAS, nova])))
        return HttpResponse.json(nova)
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Secretaria/ }))
    const form = within(screen.getByRole("form", { name: "Nova secretaria" }))
    await userEvent.type(form.getByRole("textbox", { name: /Nome da secretaria/ }), "Secretaria de Cultura")
    await userEvent.type(form.getByRole("textbox", { name: "E-mail institucional" }), "cultura@x.gov.br")
    await userEvent.type(form.getByRole("textbox", { name: "UG (unidade gestora)" }), "020301")
    await userEvent.type(form.getByRole("textbox", { name: "Nome do secretário" }), "José Pereira")
    await userEvent.type(form.getByRole("textbox", { name: "CPF do secretário" }), "52998224725")
    await userEvent.click(form.getByRole("button", { name: "Cadastrar Secretaria" }))

    await waitFor(() => expect(criada.name).toBe("Secretaria de Cultura"))
    expect(criada.details).toEqual({
      institutionalEmail: "cultura@x.gov.br",
      address: null,
      managementUnit: "020301",
      secretaryName: "José Pereira",
      secretaryCpf: "529.982.247-25",
      secretaryAppointment: null,
    })
    expect(await screen.findByRole("article", { name: "Secretaria de Cultura" })).toBeInTheDocument()
    expect(screen.queryByRole("form")).not.toBeInTheDocument()
  })

  it("Enter no nome cadastra, sem passar pelo botão", async () => {
    comSecretarias([])
    let criada: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        criada = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: "1", name: "Secretaria de Educação", active: true })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Secretaria/ }))
    // O nome recebe o foco ao abrir: quem clicou em Nova Secretaria já pode digitar.
    expect(screen.getByRole("textbox", { name: /Nome da secretaria/ })).toHaveFocus()
    await userEvent.keyboard("Secretaria de Educação{Enter}")

    await waitFor(() => expect(criada.name).toBe("Secretaria de Educação"))
  })

  it("sem nome não cadastra, e aponta o campo", async () => {
    comSecretarias([])
    let criou = false
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, () => {
        criou = true
        return HttpResponse.json({})
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Secretaria/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar Secretaria" }))

    expect(screen.getByText("Informe o nome da secretaria.")).toBeInTheDocument()
    expect(criou).toBe(false)
  })

  it("aponta nome repetido antes de virar cadastro", async () => {
    comSecretarias([saude])
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Secretaria/ }))
    await userEvent.type(screen.getByRole("textbox", { name: /Nome da secretaria/ }), "secretaria de saude")

    expect(screen.getByText("Já existe uma secretaria com este nome: Secretaria de Saúde.")).toBeInTheDocument()
  })

  it("Esc desiste do cadastro", async () => {
    comSecretarias([OBRAS])
    renderizar(<Secretarias />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Secretaria/ }))
    await userEvent.keyboard("Secretaria de Cultura{Escape}")

    expect(screen.queryByRole("form")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Nova Secretaria/ })).toBeInTheDocument()
  })
})

/**
 * A edição abre o mesmo formulário no lugar do cartão, com nome e ficha juntos.
 * O CPF do secretário só existe mascarado aqui.
 */
describe("editar secretaria", () => {
  it("grava nome e ficha numa requisição só, sem reenviar o CPF guardado", async () => {
    comSecretarias([saude])
    let enviado: { name?: string; acronym?: string; details?: Record<string, unknown> } = {}
    let ifMatch: string | null = null
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, async ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        enviado = (await request.json()) as typeof enviado
        return HttpResponse.json({ ...saude, version: 5 })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Saúde")).getByRole("button", { name: /Editar/ }))
    const form = within(screen.getByRole("form", { name: "Editar Secretaria de Saúde" }))
    expect(form.getByPlaceholderText(/Atual: \*\*\*\.982\.247-\*\*/)).toBeInTheDocument()
    const nome = form.getByRole("textbox", { name: /Nome da secretaria/ })
    await userEvent.clear(nome)
    await userEvent.type(nome, "Secretaria Municipal de Saúde")
    const ug = form.getByDisplayValue("020101")
    await userEvent.clear(ug)
    await userEvent.type(ug, "020199")
    await userEvent.click(form.getByRole("button", { name: "Salvar Alterações" }))

    await waitFor(() => expect(enviado.details?.managementUnit).toBe("020199"))
    expect(enviado.name).toBe("Secretaria Municipal de Saúde")
    expect(enviado.acronym).toBe("SMS")
    expect(enviado.details).not.toHaveProperty("secretaryCpf")
    expect(ifMatch).toBe('"4"')
  })

  it("salvar sem mudar nada não gasta uma gravação", async () => {
    comSecretarias([saude])
    let gravou = false
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, () => {
        gravou = true
        return HttpResponse.json(saude)
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Saúde")).getByRole("button", { name: /Editar/ }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }))

    // Gravar o que não mudou subiria a versão do registro e apareceria na
    // trilha do órgão como uma edição que não houve.
    expect(gravou).toBe(false)
    expect(await screen.findByRole("article", { name: "Secretaria de Saúde" })).toBeInTheDocument()
  })

  it("o próprio nome não conta como repetido", async () => {
    comSecretarias([saude])
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Saúde")).getByRole("button", { name: /Editar/ }))

    expect(screen.queryByText(/Já existe uma secretaria/)).not.toBeInTheDocument()
  })

  it("não envia CPF inválido, e aponta o campo", async () => {
    comSecretarias([saude])
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Saúde")).getByRole("button", { name: /Editar/ }))
    await userEvent.type(screen.getByRole("textbox", { name: "CPF do secretário" }), "12345678900")
    await userEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }))

    expect(screen.getByText("CPF inválido.")).toBeInTheDocument()
  })

  it("Cancelar volta ao cartão sem gravar", async () => {
    comSecretarias([OBRAS])
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Obras")).getByRole("button", { name: /Completar Ficha/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(await screen.findByRole("article", { name: "Secretaria de Obras" })).toBeInTheDocument()
  })

  it("erro do servidor mantém o formulário aberto, com o que foi digitado", async () => {
    comSecretarias([OBRAS])
    let tentou = false
    servidor.use(
      http.patch(`${urlDaApi}/organizations/:id/departments/:dep`, () => {
        tentou = true
        return HttpResponse.json({ title: "Conflito", detail: "Outra pessoa alterou esta secretaria." }, { status: 409 })
      }),
    )
    renderizar(<Secretarias />)

    await userEvent.click((await cartao("Secretaria de Obras")).getByRole("button", { name: /Completar Ficha/ }))
    await userEvent.type(screen.getByRole("textbox", { name: "UG (unidade gestora)" }), "020401")
    await userEvent.click(screen.getByRole("button", { name: "Salvar Alterações" }))

    await waitFor(() => expect(tentou).toBe(true))
    // Fechar o formulário no erro jogaria fora o que a pessoa digitou.
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar Alterações" })).toBeEnabled())
    expect(screen.getByDisplayValue("020401")).toBeInTheDocument()
  })
})

describe("remover secretaria", () => {
  it("pede confirmação antes de desativar", async () => {
    comSecretarias([OBRAS])
    let desativou = false
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments/:dep/deactivate`, () => {
        desativou = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar(<Secretarias />)

    const obras = await cartao("Secretaria de Obras")
    await userEvent.click(obras.getByRole("button", { name: "Remover Secretaria de Obras" }))
    await userEvent.click(obras.getByRole("button", { name: "Manter" }))
    expect(desativou).toBe(false)

    await userEvent.click(obras.getByRole("button", { name: "Remover Secretaria de Obras" }))
    await userEvent.click(obras.getByRole("button", { name: "Desativar" }))

    await waitFor(() => expect(desativou).toBe(true))
  })
})
