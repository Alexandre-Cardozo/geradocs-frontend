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

const departamento = {
  id: "8a7b6c5d-4e3f-4a2b-9c8d-7e6f5a4b3c2d",
  organizationId: organizacao.id,
  name: "Secretaria de Administração",
  acronym: "SMA",
  active: true,
  version: 2,
}

describe("criarPrefeitura", () => {
  it("apara os nomes antes de enviar", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(organizacao)
      }),
    )
    const { criarPrefeitura } = await carregarClienteLimpo()

    const prefeitura = await criarPrefeitura({ orgao: "  Prefeitura de Ecoporanga  ", unidade: "  Sede  " })

    expect(corpo.name).toBe("Prefeitura de Ecoporanga")
    expect(corpo.unit).toBe("Sede")
    expect(prefeitura.orgao).toBe(organizacao.name)
  })

  it("envia unidade nula quando ela não é informada", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(organizacao)
      }),
    )
    const { criarPrefeitura } = await carregarClienteLimpo()

    await criarPrefeitura({ orgao: "Prefeitura", unidade: "   " })

    // String vazia e ausência são coisas diferentes para o backend: "" passaria
    // na validação de obrigatoriedade e gravaria unidade em branco.
    expect(corpo.unit).toBeNull()
  })
})

describe("listarPrefeituras", () => {
  it("esconde organização desativada", async () => {
    servidor.use(
      http.get(`${urlDaApi}/organizations`, () =>
        HttpResponse.json([organizacao, { ...organizacao, id: "outra", status: "INACTIVE" }]),
      ),
    )
    const { listarPrefeituras } = await carregarClienteLimpo()

    expect(await listarPrefeituras()).toHaveLength(1)
  })
})

describe("desativarPrefeitura", () => {
  it("lê a versão atual e a envia em If-Match", async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id`, () => HttpResponse.json(organizacao)),
      http.post(`${urlDaApi}/organizations/:id/deactivate`, ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { desativarPrefeitura } = await carregarClienteLimpo()

    await desativarPrefeitura(organizacao.id)

    expect(ifMatch).toContain("3")
  })
})

describe("obterTenant", () => {
  it("junta a organização e as secretarias ativas", async () => {
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id`, () => HttpResponse.json(organizacao)),
      http.get(`${urlDaApi}/organizations/:id/departments`, () =>
        HttpResponse.json([departamento, { ...departamento, id: "inativa", name: "Extinta", active: false }]),
      ),
    )
    const { obterTenant } = await carregarClienteLimpo()

    const tenant = await obterTenant(organizacao.id)

    // Secretaria extinta não pode continuar aparecendo como opção de lotação.
    expect(tenant.secretarias).toEqual([{ id: departamento.id, nome: "Secretaria de Administração", sigla: "SMA" }])
  })
})

describe("criarDepartamento", () => {
  it("apara nome e sigla", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(departamento)
      }),
    )
    const { criarDepartamento } = await carregarClienteLimpo()

    await criarDepartamento(organizacao.id, "  Secretaria de Educação  ", "  SME  ")

    expect(corpo.name).toBe("Secretaria de Educação")
    expect(corpo.acronym).toBe("SME")
  })

  it("aceita secretaria sem sigla", async () => {
    servidor.use(
      http.post(`${urlDaApi}/organizations/:id/departments`, () =>
        HttpResponse.json({ ...departamento, acronym: null }),
      ),
    )
    const { criarDepartamento } = await carregarClienteLimpo()

    const secretaria = await criarDepartamento(organizacao.id, "Secretaria de Saúde")

    expect(secretaria.sigla).toBeUndefined()
  })
})

describe("desativarDepartamento", () => {
  it("localiza a secretaria na lista para descobrir a versão", async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([departamento])),
      http.post(`${urlDaApi}/organizations/:id/departments/:dep/deactivate`, ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { desativarDepartamento } = await carregarClienteLimpo()

    await desativarDepartamento(organizacao.id, departamento.id)

    expect(ifMatch).toContain("2")
  })

  it("recusa desativar secretaria que não está na organização", async () => {
    servidor.use(http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([departamento])))
    const { desativarDepartamento } = await carregarClienteLimpo()

    await expect(desativarDepartamento(organizacao.id, "de-outra-prefeitura")).rejects.toThrow(
      /Secretaria não encontrada/i,
    )
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

  it("envia cargo nulo quando ele vem vazio", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/users`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(usuarioApi)
      }),
    )
    const { criarUsuario } = await carregarClienteLimpo()

    await criarUsuario({
      nome: "Maria Costa Andrade",
      cpf: "33333333333",
      email: "maria@ecoporanga.es.gov.br",
      cargo: "   ",
      senha: "UmaSenhaSegura!2026",
      perfilAcesso: "servidor",
      prefeituraId: organizacao.id,
    })

    expect(corpo.jobTitle).toBeNull()
  })

  it("vincula o coordenador ao departamento informado", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/users`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(usuarioApi)
      }),
    )
    const { criarUsuario } = await carregarClienteLimpo()

    await criarUsuario({
      nome: "Carlos Ribeiro",
      cpf: "11144477735",
      email: "carlos@ecoporanga.es.gov.br",
      cargo: "Procurador",
      senha: "UmaSenhaSegura!2026",
      perfilAcesso: "coordenador",
      prefeituraId: organizacao.id,
      departamentoId: departamento.id,
    })

    expect(corpo.departmentId).toBe(departamento.id)
    expect(corpo.organizationId).toBe(organizacao.id)
    expect(corpo.profileAccess).toBe("COORDENADOR")
  })

  it("monta as iniciais do primeiro e do último nome", async () => {
    servidor.use(http.get(`${urlDaApi}/users`, () => HttpResponse.json([usuarioApi])))
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    expect(usuario?.iniciais).toBe("MA")
    expect(usuario?.primeiroNome).toBe("Maria")
  })

  it("aceita nome de uma palavra só", async () => {
    servidor.use(http.get(`${urlDaApi}/users`, () => HttpResponse.json([{ ...usuarioApi, name: "Madonna" }])))
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    // Uma inicial, não a mesma letra repetida. Este teste afirmava "MM" e
    // passava porque exercitava uma de três implementações divergentes da mesma
    // regra; a unificação em lib/dominio o corrigiu.
    expect(usuario?.iniciais).toBe("M")
  })

  it("cai para interrogação quando o nome vem vazio", async () => {
    servidor.use(http.get(`${urlDaApi}/users`, () => HttpResponse.json([{ ...usuarioApi, name: "  " }])))
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    // Avatar em branco é pior que avatar com "?": o segundo diz que falta dado.
    expect(usuario?.iniciais).toBe("?")
  })

  it("marca como inativo quem está pendente de ativação", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users`, () => HttpResponse.json([{ ...usuarioApi, status: "PENDING_ACTIVATION" }])),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    expect(usuario?.ativo).toBe(false)
  })

  it("mapeia usuário cujo vínculo não tem papel de workflow", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users`, () =>
        HttpResponse.json([
          { ...usuarioApi, memberships: [{ ...usuarioApi.memberships[0] }] },
        ]),
      ),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    // Papel de workflow virou opcional (ADR §26): vínculo sem papel é o caso
    // comum, e quem define o que a pessoa pode fazer é o perfil de acesso.
    expect(usuario?.perfilAcesso).toBe("servidor")
    expect(usuario?.prefeituraId).toBe(organizacao.id)
  })

  it("ignora vínculo revogado ao descobrir a prefeitura", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users`, () =>
        HttpResponse.json([
          { ...usuarioApi, memberships: [{ ...usuarioApi.memberships[0], active: false }] },
        ]),
      ),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    expect(usuario?.prefeituraId).toBeNull()
  })

  it("trata cargo e último acesso ausentes", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users`, () =>
        HttpResponse.json([{ ...usuarioApi, jobTitle: null, lastAccessAt: null }]),
      ),
    )
    const { listarUsuarios } = await carregarClienteLimpo()

    const [usuario] = await listarUsuarios()

    expect(usuario?.cargo).toBe("")
    expect(usuario?.ultimoAcesso).toBe("")
  })

  it("preenche a unidade vazia quando a organização não a informa", async () => {
    servidor.use(http.get(`${urlDaApi}/organizations`, () => HttpResponse.json([{ ...organizacao, unit: null }])))
    const { listarPrefeituras } = await carregarClienteLimpo()

    const [prefeitura] = await listarPrefeituras()

    expect(prefeitura?.unidade).toBe("")
    expect(prefeitura?.cabecalho).toBe("PREFEITURA MUNICIPAL DE ECOPORANGA")
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
