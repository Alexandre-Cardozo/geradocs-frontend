import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import AdminEntidades from "@/app/(app)/admin/entidades/page"
import { sessaoAdmin } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

// O toast vive no provider do layout, fora destas telas: confere-se o que foi
// mandado para ele.
const avisos = vi.hoisted(() => vi.fn())
vi.mock("@/components/shared/providers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/shared/providers")>()),
  useToast: () => avisos,
}))

/**
 * Entidades clientes da plataforma.
 *
 * O que a tela deixou de fazer em 26/08/2026: chamar de "prefeitura" quem pode
 * ser câmara, autarquia ou consórcio; pedir a unidade administrativa, que não
 * aparecia em lugar nenhum do produto; exibir o identificador da entidade; e
 * desativar entidade que ainda tem servidor vinculado.
 */
const ENTIDADE = {
  id: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
  name: "Prefeitura Municipal de Ecoporanga",
  unit: "Administração Central",
  entityType: "PREFEITURA" as const,
  maxUsers: 10,
  activeUsers: 3,
  status: "ACTIVE" as const,
  version: 1,
}

function comEntidades(entidades = [ENTIDADE]) {
  servidor.use(
    http.get(`${urlDaApi}/me`, () => HttpResponse.json(sessaoAdmin)),
    http.get(`${urlDaApi}/organizations`, () => HttpResponse.json(entidades)),
    http.get(`${urlDaApi}/users`, () => HttpResponse.json([])),
  )
}

describe("cadastro de entidades", () => {
  it("o cadastro pede o nome e o tipo, e nada mais", async () => {
    comEntidades()
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Entidade/ }))

    expect(screen.getByLabelText(/Nome da Entidade/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Tipo da entidade/ })).toBeInTheDocument()
    // Unidade, secretarias, timbre e PCA são configuração de quem opera a
    // entidade; pedi-los aqui seria pedir ao administrador que adivinhasse.
    expect(screen.queryByLabelText(/Unidade/)).not.toBeInTheDocument()
  })

  it("cadastrar manda o nome e o tipo, e nada além disso", async () => {
    comEntidades([])
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...ENTIDADE,
          name: "Câmara Municipal de Ecoporanga",
          entityType: "CAMARA",
          unit: null,
        })
      }),
    )
    renderizar(<AdminEntidades />)
    await screen.findByText(/Nenhuma entidade cadastrada/)

    await userEvent.click(screen.getByRole("button", { name: /Nova Entidade/ }))
    await userEvent.type(
      screen.getByLabelText(/Nome da Entidade/),
      "Câmara Municipal de Ecoporanga",
    )
    await userEvent.click(screen.getByRole("button", { name: /Tipo da entidade/ }))
    await userEvent.click(screen.getByRole("option", { name: "Câmara" }))
    await userEvent.type(screen.getByLabelText(/Limite de Usuários/), "15")
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // Sem `entityType` o servidor grava PREFEITURA: a câmara cadastrada aqui
    // viraria prefeitura no banco, que é o erro que o vocabulário veio desfazer.
    await waitFor(() => expect(corpo.name).toBe("Câmara Municipal de Ecoporanga"))
    expect(corpo.entityType).toBe("CAMARA")
    expect(corpo.maxUsers).toBe(15)
    expect(corpo).not.toHaveProperty("unit")
  })

  it("o tipo gravado aparece na listagem", async () => {
    comEntidades([{ ...ENTIDADE, name: "Câmara Municipal de Vila Velha", entityType: "CAMARA" as unknown as "PREFEITURA" }])
    renderizar(<AdminEntidades />)

    expect(await screen.findByText("Câmara Municipal de Vila Velha")).toBeInTheDocument()
    expect(screen.getByText("Câmara")).toBeInTheDocument()
  })

  it("a tela não chama de prefeitura quem pode ser câmara ou autarquia", async () => {
    comEntidades()
    renderizar(<AdminEntidades />)

    expect(await screen.findByRole("heading", { name: "Entidades" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Nova Prefeitura/ })).not.toBeInTheDocument()
  })

  it("a listagem não exibe o identificador da entidade", async () => {
    comEntidades()
    renderizar(<AdminEntidades />)

    expect(await screen.findByText("Prefeitura Municipal de Ecoporanga")).toBeInTheDocument()
    // O UUID não é digitado em lugar nenhum do produto; ocupava a linha sem
    // servir a ninguém.
    expect(screen.queryByText(ENTIDADE.id)).not.toBeInTheDocument()
  })
})

describe("desativar entidade", () => {
  const servidora = {
    id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
    name: "Maria Costa Andrade",
    cpf: "***.***.***-35",
    email: "maria.costa@ecoporanga.es.gov.br",
    jobTitle: "Servidora de Compras",
    registrationNumber: "MAT-4471",
    appointmentDecree: null,
    profileAccess: "SERVIDOR",
    status: "ACTIVE",
    memberships: [{ organizationId: ENTIDADE.id, departmentId: null, active: true }],
    lastAccessAt: "2026-08-20T14:30:00-03:00",
    version: 1,
  }

  it("entidade com servidor vinculado não pode ser desativada", async () => {
    comEntidades()
    servidor.use(http.get(`${urlDaApi}/users`, () => HttpResponse.json([servidora])))
    renderizar(<AdminEntidades />)

    // Desativá-la deixava os servidores apontando para uma entidade fora da
    // listagem, e os processos daquele órgão sem dono.
    const botao = await screen.findByRole("button", {
      name: /tem 1 servidor\(es\) vinculado\(s\)/,
    })
    expect(botao).toBeDisabled()
  })

  it("entidade sem ninguém vinculado pode ser desativada", async () => {
    comEntidades()
    renderizar(<AdminEntidades />)

    const botao = await screen.findByRole("button", { name: /Desativar Prefeitura Municipal/ })
    expect(botao).toBeEnabled()
    // Escrito, e não uma lixeira: desativar não apaga a entidade.
    expect(botao).toHaveTextContent(/^Desativar$/)
  })

  it("só autarquia e fundação podem ser qualificadas como agência executiva", async () => {
    comEntidades([])
    let enviado: Record<string, unknown> | null = null
    servidor.use(
      http.post(`${urlDaApi}/organizations`, async ({ request }) => {
        enviado = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...ENTIDADE, id: "nova" }, { status: 201 })
      }),
    )
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Entidade/ }))
    await userEvent.type(screen.getByLabelText(/Nome da Entidade/), "Instituto de Previdência")

    // Prefeitura não entra no Art. 75, § 2º de jeito nenhum, e o consórcio já
    // dobra pelo próprio tipo: perguntar ali seria oferecer escolha sem efeito.
    expect(
      screen.queryByLabelText("Qualificada como agência executiva"),
    ).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Tipo da entidade" }))
    await userEvent.click(await screen.findByRole("option", { name: /Autarquia/ }))
    await userEvent.click(screen.getByLabelText("Qualificada como agência executiva"))
    await userEvent.type(screen.getByLabelText(/Limite de Usuários/), "8")
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect(enviado!.executiveAgency).toBe(true)
  })
})

/** O plano da entidade: quantos usuários ela pode ter ativos (ADR-060 do back-end). */
describe("limite de usuários da entidade", () => {
  it("o cadastro só habilita com o limite preenchido, de 1 a 999", async () => {
    comEntidades([])
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Nova Entidade/ }))
    await userEvent.type(screen.getByLabelText(/Nome da Entidade/), "Prefeitura de Vila Velha")
    const cadastrar = screen.getByRole("button", { name: "Cadastrar" })
    expect(cadastrar).toBeDisabled()

    const limite = screen.getByLabelText(/Limite de Usuários/)
    await userEvent.type(limite, "0")
    expect(screen.getByText("O limite deve estar entre 1 e 999.")).toBeInTheDocument()
    expect(cadastrar).toBeDisabled()

    // Só dígitos, e no máximo três: "1000" não chega a ser digitado.
    await userEvent.clear(limite)
    await userEvent.type(limite, "1a000")
    expect(limite).toHaveValue("100")
    expect(cadastrar).toBeEnabled()
  })

  it("a listagem mostra quantos usuários ocupam vaga e o limite do plano", async () => {
    comEntidades([ENTIDADE, { ...ENTIDADE, id: "lotada", name: "Câmara Lotada", maxUsers: 3, activeUsers: 3 }])
    renderizar(<AdminEntidades />)

    expect(await screen.findByRole("columnheader", { name: "Usuários do Plano" })).toBeInTheDocument()
    expect(screen.getByText("3 de 10")).toBeInTheDocument()
    expect(screen.getByText("3 de 3")).toBeInTheDocument()
    // Só a lotada leva a marca.
    expect(screen.getAllByText("Limite atingido")).toHaveLength(1)
  })

  it("o administrador altera o limite pela listagem", async () => {
    comEntidades()
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id`, () => HttpResponse.json(ENTIDADE)),
      http.patch(`${urlDaApi}/organizations/:id`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...ENTIDADE, maxUsers: 20, version: 2 })
      }),
    )
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Alterar o limite de usuários de Prefeitura/ }))
    const campo = screen.getByLabelText(/Limite de usuários de Prefeitura/)
    expect(campo).toHaveValue("10")
    // Abre selecionado: digitar substitui o valor, em vez de anexar a ele.
    await waitFor(() => expect(campo).toHaveFocus())
    expect([(campo as HTMLInputElement).selectionStart, (campo as HTMLInputElement).selectionEnd]).toEqual([0, 2])
    await userEvent.keyboard("15")
    expect(campo).toHaveValue("15")
    await userEvent.clear(campo)
    expect(screen.getByText("Informe o limite de usuários.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await userEvent.type(campo, "20")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(corpo?.maxUsers).toBe(20))
    // O resto da entidade vai como está: o PATCH troca o recurso inteiro.
    expect(corpo).toMatchObject({ name: ENTIDADE.name, entityType: "PREFEITURA" })
    await waitFor(() => expect(avisos).toHaveBeenCalledWith("Limite de Prefeitura Municipal de Ecoporanga atualizado."))
    expect(screen.queryByLabelText(/Limite de usuários de Prefeitura/)).not.toBeInTheDocument()
  })

  it("a recusa do servidor ao reduzir abaixo dos ativos aparece para quem tentou", async () => {
    comEntidades()
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id`, () => HttpResponse.json(ENTIDADE)),
      http.patch(`${urlDaApi}/organizations/:id`, () =>
        HttpResponse.json(
          {
            code: "BUSINESS_RULE_VIOLATION",
            detail: "A entidade tem 3 usuários ativos; o limite não pode ficar abaixo disso. Desative usuários antes de reduzi-lo.",
          },
          { status: 400, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Alterar o limite de usuários de Prefeitura/ }))
    const campo = screen.getByLabelText(/Limite de usuários de Prefeitura/)
    await userEvent.clear(campo)
    await userEvent.type(campo, "2{Enter}")

    await waitFor(() => expect(avisos).toHaveBeenCalledWith(expect.stringContaining("tem 3 usuários ativos")))
    // O campo continua aberto, com o valor, para a pessoa decidir o que fazer.
    expect(screen.getByLabelText(/Limite de usuários de Prefeitura/)).toHaveValue("2")
  })

  it("cancelar a edição devolve a leitura do limite", async () => {
    comEntidades()
    renderizar(<AdminEntidades />)

    await userEvent.click(await screen.findByRole("button", { name: /Alterar o limite de usuários de Prefeitura/ }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByLabelText(/Limite de usuários de Prefeitura/)).not.toBeInTheDocument()
    expect(screen.getByText("3 de 10")).toBeInTheDocument()
  })
})

