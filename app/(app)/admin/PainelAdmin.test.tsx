import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import PainelAdmin from "@/app/(app)/admin/PainelAdmin"
import { sessaoAdmin } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Painel do administrador geral.
 *
 * A lista de entidades dizia o nome e a contagem; para saber **quem** eram os
 * dois servidores era preciso ir a outra tela e filtrar. Desde 26/08/2026 a
 * linha abre no clique e mostra quem está cadastrado — os usuários já estão em
 * memória, e abrir não custa requisição nenhuma.
 */
const ECOPORANGA = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"
const VILA_VELHA = "2c8d9f21-3e4a-5b6c-9d0e-1f2a3b4c5d6e"

const entidades = [
  { id: ECOPORANGA, name: "Prefeitura Municipal de Ecoporanga", unit: "Administração Central", entityType: "PREFEITURA", status: "ACTIVE", version: 1 },
  { id: VILA_VELHA, name: "Câmara Municipal de Vila Velha", unit: null, entityType: "CAMARA", status: "ACTIVE", version: 1 },
]

const usuario = (nome: string, organizationId: string, profileAccess: string) => ({
  id: `${organizationId}-${nome}`,
  name: nome,
  cpf: "***.***.***-35",
  email: `${nome.toLowerCase().replaceAll(" ", ".")}@ecoporanga.es.gov.br`,
  jobTitle: "Servidora de Compras",
  registrationNumber: "MAT-4471",
  appointmentDecree: null,
  profileAccess,
  status: "ACTIVE",
  memberships: [{ organizationId, departmentId: null, active: true }],
  lastAccessAt: "2026-08-20T14:30:00-03:00",
  version: 1,
})

function comSistema(usuarios: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/me`, () => HttpResponse.json(sessaoAdmin)),
    http.get(`${urlDaApi}/organizations`, () => HttpResponse.json(entidades)),
    http.get(`${urlDaApi}/users`, () => HttpResponse.json(usuarios)),
    http.get(`${urlDaApi}/users/:id/avatar`, () => new HttpResponse(null, { status: 404 })),
  )
}

describe("painel do administrador geral", () => {
  it("lista as entidades com o resumo de quem trabalha nelas", async () => {
    comSistema([
      usuario("Maria Costa Andrade", ECOPORANGA, "COORDENADOR"),
      usuario("João da Silva", ECOPORANGA, "SERVIDOR"),
    ])
    renderizar(<PainelAdmin />)

    expect(await screen.findByText("Prefeitura Municipal de Ecoporanga")).toBeInTheDocument()
    expect(screen.getByText(/^Prefeitura · 2 servidor\(es\) · 1 coordenador\(es\)/)).toBeInTheDocument()
    // O tipo sai do que o servidor gravou: a câmara não é chamada de prefeitura.
    expect(screen.getByText(/^Câmara · 0 servidor\(es\)/)).toBeInTheDocument()
  })

  it("clicar na entidade abre os usuários cadastrados nela", async () => {
    comSistema([
      usuario("Maria Costa Andrade", ECOPORANGA, "COORDENADOR"),
      usuario("Pedro Alves", VILA_VELHA, "SERVIDOR"),
    ])
    renderizar(<PainelAdmin />)

    // Fechada, a linha não revela ninguém.
    const linha = await screen.findByRole("button", { name: /Prefeitura Municipal de Ecoporanga/ })
    expect(screen.queryByText("Maria Costa Andrade")).not.toBeInTheDocument()

    await userEvent.click(linha)

    expect(await screen.findByText("Maria Costa Andrade")).toBeInTheDocument()
    // Só os da entidade aberta: o servidor da outra entidade continua fora.
    expect(screen.queryByText("Pedro Alves")).not.toBeInTheDocument()
    expect(linha).toHaveAttribute("aria-expanded", "true")
  })

  it("entidade sem servidor diz o que fazer em vez de abrir uma lista vazia", async () => {
    comSistema([usuario("Maria Costa Andrade", ECOPORANGA, "COORDENADOR")])
    renderizar(<PainelAdmin />)

    await userEvent.click(await screen.findByRole("button", { name: /Câmara Municipal de Vila Velha/ }))

    expect(await screen.findByText(/Nenhum servidor cadastrado nesta entidade/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Cadastrar servidor" })).toHaveAttribute(
      "href",
      "/admin/servidores",
    )
  })

  it("o administrador geral não é contado como servidor de entidade", async () => {
    comSistema([
      usuario("Maria Costa Andrade", ECOPORANGA, "COORDENADOR"),
      { ...usuario("Ana Paula Ribeiro", ECOPORANGA, "ADMIN_GERAL"), memberships: [] },
    ])
    renderizar(<PainelAdmin />)

    // A contagem é de quem opera as entidades; o admin da plataforma não opera
    // nenhuma, e some também da lista aberta da entidade.
    expect(await screen.findByText(/1 usuário\(s\) nas entidades/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Prefeitura Municipal de Ecoporanga/ }))
    expect(await screen.findByText("Maria Costa Andrade")).toBeInTheDocument()
    expect(screen.queryByText("Ana Paula Ribeiro")).not.toBeInTheDocument()
  })
})
