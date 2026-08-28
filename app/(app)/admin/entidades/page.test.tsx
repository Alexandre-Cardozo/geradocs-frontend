import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import AdminEntidades from "@/app/(app)/admin/entidades/page"
import { sessaoAdmin } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

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
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // Sem `entityType` o servidor grava PREFEITURA: a câmara cadastrada aqui
    // viraria prefeitura no banco, que é o erro que o vocabulário veio desfazer.
    await waitFor(() => expect(corpo.name).toBe("Câmara Municipal de Ecoporanga"))
    expect(corpo.entityType).toBe("CAMARA")
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
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect(enviado!.executiveAgency).toBe(true)
  })
})
