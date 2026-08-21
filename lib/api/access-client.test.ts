import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/access-client")
}

afterEach(() => vi.resetModules())

const organizacao = {
  id: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
  name: "Prefeitura Municipal de Ecoporanga",
  unit: "Administração Central",
  status: "ACTIVE" as const,
  version: 3,
}

const usuarioApi = {
  id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
  name: "Maria Costa Andrade",
  cpf: "33333333333",
  email: "maria.costa@ecoporanga.es.gov.br",
  jobTitle: "Servidora de Compras",
  profileAccess: "SERVIDOR" as const,
  status: "ACTIVE" as const,
  memberships: [
    {
      organizationId: organizacao.id,
      departmentId: null,
      workflowRoles: ["SERVIDOR_COMPRAS" as const],
      active: true,
    },
  ],
  lastAccessAt: "2026-08-20T14:30:00-03:00",
  version: 5,
}

describe("listarPrefeituras", () => {
  it("mapeia a organização do backend para o tenant da interface", async () => {
    servidor.use(http.get(`${urlDaApi}/organizations`, () => HttpResponse.json([organizacao])))
    const { listarPrefeituras } = await carregarClienteLimpo()

    const [prefeitura] = await listarPrefeituras()

    expect(prefeitura?.orgao).toBe("Prefeitura Municipal de Ecoporanga")
    expect(prefeitura?.unidade).toBe("Administração Central")
    expect(prefeitura?.id).toBe(organizacao.id)
  })
})

describe("listarUsuarios", () => {
  it("filtra por organização quando ela é informada", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/users`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json([usuarioApi])
      }),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    await listarUsuarios(organizacao.id)

    // Sem o filtro, um coordenador veria servidores de outra prefeitura na tela
    // — o backend barra, mas a tela pediria o que não pode ver.
    expect(recebida?.searchParams.get("organizationId")).toBe(organizacao.id)
  })

  it("não envia filtro nenhum quando a organização é omitida", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/users`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json([usuarioApi])
      }),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    await listarUsuarios()

    expect(recebida?.searchParams.has("organizationId")).toBe(false)
  })

  it("mapeia perfil e papel de workflow para o vocabulário da interface", async () => {
    servidor.use(http.get(`${urlDaApi}/users`, () => HttpResponse.json([usuarioApi])))
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    expect(usuario?.perfilAcesso).toBe("servidor")
    expect(usuario?.papel).toBe("servidor_compras")
    expect(usuario?.prefeituraId).toBe(organizacao.id)
    expect(usuario?.ativo).toBe(true)
  })
})

describe("criarUsuario", () => {
  it("não vincula o administrador geral a organização nenhuma", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/users`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...usuarioApi, profileAccess: "ADMIN_GERAL", memberships: [] })
      }),
    )
    const { criarUsuario } = await carregarClienteLimpo()

    await criarUsuario({
      nome: "Ana Paula Ribeiro",
      cpf: "11144477735",
      email: "ana@geradocs.local",
      cargo: "Administradora",
      senha: "UmaSenhaSegura!2026",
      perfilAcesso: "admin_geral",
      prefeituraId: organizacao.id,
    })

    // O admin geral é global. Amarrá-lo a uma prefeitura o transformaria em
    // coordenador com nome de administrador.
    expect(corpo.organizationId).toBeNull()
    expect(corpo.departmentId).toBeNull()
    expect(corpo.profileAccess).toBe("ADMIN_GERAL")
  })

  it("deriva o papel de workflow do perfil quando ele não é informado", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/users`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(usuarioApi)
      }),
    )
    const { criarUsuario } = await carregarClienteLimpo()

    await criarUsuario({
      nome: "  Maria Costa Andrade  ",
      cpf: "33333333333",
      email: "  maria.costa@ecoporanga.es.gov.br  ",
      cargo: "Servidora de Compras",
      senha: "UmaSenhaSegura!2026",
      perfilAcesso: "servidor",
      prefeituraId: organizacao.id,
    })

    expect(corpo.workflowRoles).toEqual(["SERVIDOR_COMPRAS"])
    expect(corpo.name).toBe("Maria Costa Andrade")
    expect(corpo.email).toBe("maria.costa@ecoporanga.es.gov.br")
  })
})

describe("desativarUsuario", () => {
  it("lê a versão atual e a envia em If-Match", async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.get(`${urlDaApi}/users/:id`, () => HttpResponse.json(usuarioApi)),
      http.post(`${urlDaApi}/users/:id/deactivate`, ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { desativarUsuario } = await carregarClienteLimpo()

    await desativarUsuario(usuarioApi.id)

    // Sem If-Match, desativar sobrescreveria uma edição concorrente sem aviso.
    expect(ifMatch).toContain("5")
  })

  it("recusa desativar quando a resposta não traz a versão", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users/:id`, () => HttpResponse.json({ ...usuarioApi, version: undefined })),
    )
    const { desativarUsuario } = await carregarClienteLimpo()

    await expect(desativarUsuario(usuarioApi.id)).rejects.toThrow(/versão atual do usuário/i)
  })
})
