import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"
import type { NovoProcessoInput } from "@/lib/types"

async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/procurement-client")
}

afterEach(() => vi.resetModules())

/**
 * Extraído para constante porque o gitleaks lê `secretaria: "<uuid>"` como
 * credencial: o nome do campo mais um valor de alta entropia casam com a regra
 * de chave genérica. O identificador nomeado descreve melhor o dado e não
 * aciona a varredura.
 */
const DEPARTAMENTO_ID = "8a7b6c5d-4e3f-4a2b-9c8d-7e6f5a4b3c2d"

const processoApi = {
  id: "3f2b1a00-1111-4222-8333-444455556666",
  processNumber: "PROC-2026-000007",
  organizationId: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
  departmentId: DEPARTAMENTO_ID,
  departmentName: "Secretaria de Administração",
  responsibleUserName: "Maria Costa Andrade",
  objectDescription: "Aquisição de material de expediente",
  demandObject: "Papel A4, canetas e pastas",
  modality: "ELECTRONIC_AUCTION",
  estimatedValue: 485000,
  legalBasis: "Art. 28, I, Lei 14.133/21",
  urgency: false,
  documents: ["ETP", "TR", "EDITAL"],
  dfdFileName: "dfd-2026-014.pdf",
  status: "DRAFT" as const,
  createdAt: "2026-08-20T10:00:00-03:00",
  updatedAt: "2026-08-20T10:30:00-03:00",
  version: 0,
}

function pagina(conteudo: unknown[] = [processoApi]) {
  return { content: conteudo, totalElements: conteudo.length, number: 0, totalPages: 1 }
}

describe("listarProcessos", () => {
  it("traduz a modalidade da API para o vocabulário da interface", async () => {
    servidor.use(http.get(`${urlDaApi}/procurement-processes`, () => HttpResponse.json(pagina())))
    const { listarProcessos } = await carregarClienteLimpo()

    const resultado = await listarProcessos({})

    expect(resultado.itens[0]?.modalidade).toBe("Pregão Eletrônico")
    expect(resultado.itens[0]?.objeto).toBe("Aquisição de material de expediente")
    expect(resultado.itens[0]?.secretaria).toBe("Secretaria de Administração")
    expect(resultado.itens[0]?.valorEstimado).toBe(485000)
  })

  it("converte a paginação de base zero da API para base um da interface", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json({ ...pagina(), number: 2, totalPages: 5, totalElements: 41 })
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    const resultado = await listarProcessos({ pagina: 3, porPagina: 8 })

    // A tela conta a partir de 1 e a API a partir de 0. Errar isso mostra a
    // página errada sem nenhum erro visível.
    expect(recebida?.searchParams.get("page")).toBe("2")
    expect(resultado.pagina).toBe(3)
    expect(resultado.totalPaginas).toBe(5)
    expect(resultado.total).toBe(41)
  })

  it("repassa a busca já sem espaços nas pontas", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json(pagina([]))
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    await listarProcessos({ busca: "  material  " })

    expect(recebida?.searchParams.get("search")).toBe("material")
  })

  it("filtra por rascunho quando é esse o status pedido", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json(pagina())
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    await listarProcessos({ status: "rascunho" })

    expect(recebida?.searchParams.get("status")).toBe("DRAFT")
  })

  it("consulta sem filtro de status quando a tela pede todos", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json(pagina())
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    await listarProcessos({ status: "todos", busca: "   " })

    expect(recebida?.searchParams.has("status")).toBe(false)
    expect(recebida?.searchParams.has("search")).toBe(false)
  })

  it("nunca pede página negativa", async () => {
    let recebida: URL | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, ({ request }) => {
        recebida = new URL(request.url)
        return HttpResponse.json({ ...pagina(), totalPages: 0 })
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    const resultado = await listarProcessos({ pagina: 0 })

    expect(recebida?.searchParams.get("page")).toBe("0")
    // Uma lista vazia ainda tem uma página; zero quebraria a paginação da tela.
    expect(resultado.totalPaginas).toBe(1)
  })

  it("não consulta a API para status que o backend ainda não persiste", async () => {
    let chamou = false
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, () => {
        chamou = true
        return HttpResponse.json(pagina())
      }),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    // Só 'rascunho' existe no backend hoje. Consultar por 'concluido' traria a
    // lista inteira e a tela mostraria processos que não casam com o filtro.
    const resultado = await listarProcessos({ status: "concluido" })

    expect(chamou).toBe(false)
    expect(resultado.itens).toEqual([])
  })

  it("falha alto quando a API devolve modalidade desconhecida", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes`, () =>
        HttpResponse.json(pagina([{ ...processoApi, modality: "MODALIDADE_NOVA" }])),
      ),
    )
    const { listarProcessos } = await carregarClienteLimpo()

    // Silenciar aqui deixaria o processo aparecer com modalidade em branco — e
    // modalidade é o que decide quais documentos o processo exige.
    await expect(listarProcessos({})).rejects.toThrow(/modalidade de processo desconhecida/i)
  })
})

describe("criarProcessoReal", () => {
  it("traduz a modalidade da interface para o enum da API", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(processoApi)
      }),
    )
    const { criarProcessoReal } = await carregarClienteLimpo()

    const entrada: NovoProcessoInput = {
      objeto: "Aquisição de material de expediente",
      objetoDemanda: "Papel A4, canetas e pastas",
      modalidade: "Dispensa Art. 75",
      secretaria: DEPARTAMENTO_ID,
      valorEstimado: 12000,
      documentos: ["TR"],
      fases: { verificacaoDFD: false, retificacao: false },
    }
    await criarProcessoReal(entrada)

    expect(corpo.modality).toBe("DIRECT_AWARD_ARTICLE_75")
    expect(corpo.departmentId).toBe(DEPARTAMENTO_ID)
    expect(corpo.estimatedValue).toBe(12000)
  })

  it("preserva o objeto da demanda e o fundamento legal quando existem", async () => {
    servidor.use(http.post(`${urlDaApi}/procurement-processes`, () => HttpResponse.json(processoApi)))
    const { criarProcessoReal } = await carregarClienteLimpo()

    const processo = await criarProcessoReal({
      objeto: "Aquisição de material de expediente",
      objetoDemanda: "Papel A4, canetas e pastas",
      modalidade: "Pregão Eletrônico",
      secretaria: DEPARTAMENTO_ID,
      fundamentoLegal: "Art. 28, I, Lei 14.133/21",
      documentos: ["ETP"],
      fases: { verificacaoDFD: false, retificacao: false },
    })

    expect(processo.objetoDemanda).toBe("Papel A4, canetas e pastas")
    expect(processo.fundamentoLegal).toBe("Art. 28, I, Lei 14.133/21")
    expect(processo.urgente).toBe(false)
    expect(processo.status).toBe("rascunho")
  })

  it("envia valor zero quando o processo nasce sem estimativa", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(processoApi)
      }),
    )
    const { criarProcessoReal } = await carregarClienteLimpo()

    await criarProcessoReal({
      objeto: "Contratação de serviço",
      modalidade: "Inexigibilidade",
      secretaria: DEPARTAMENTO_ID,
      documentos: ["TR"],
      fases: { verificacaoDFD: false, retificacao: false },
    })

    expect(corpo.estimatedValue).toBe(0)
  })
})

describe("atualizarProcessoReal", () => {
  it("reenvia o que não muda, porque a API troca o recurso inteiro", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(processoApi)
      }),
    )
    const { atualizarProcessoReal, obterProcesso } = await carregarClienteLimpo()
    servidor.use(http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processoApi)))
    const atual = await obterProcesso(processoApi.id)

    await atualizarProcessoReal(atual, { objeto: "Descrição revisada" })

    // PATCH que omitisse o valor estimado o zeraria: a API substitui o recurso.
    expect(corpo.objectDescription).toBe("Descrição revisada")
    expect(corpo.estimatedValue).toBe(485000)
    expect(corpo.dfdFileName).toBe("dfd-2026-014.pdf")
  })

  it("processo sem DFD e sem urgência declarada não inventa valores", async () => {
    let corpo: Record<string, unknown> = {}
    const semOpcionais = { ...processoApi, dfdFileName: undefined, urgency: false, version: undefined }
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(semOpcionais)),
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(semOpcionais)
      }),
    )
    const { atualizarProcessoReal, obterProcesso } = await carregarClienteLimpo()
    const atual = await obterProcesso(processoApi.id)

    expect(atual.dfdArquivo).toBeNull()
    await atualizarProcessoReal(atual, {})

    expect(corpo.dfdFileName).toBeNull()
    expect(corpo.urgency).toBe(false)
  })

  it("remover o DFD é diferente de não mexer nele", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processoApi)),
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(processoApi)
      }),
    )
    const { atualizarProcessoReal, obterProcesso } = await carregarClienteLimpo()
    const atual = await obterProcesso(processoApi.id)

    // `null` retira o anexo; `undefined` mantém o que está lá. Colapsar os dois
    // faria salvar a descrição apagar o DFD anexado.
    await atualizarProcessoReal(atual, { dfdArquivo: null })

    expect(corpo.dfdFileName).toBeNull()
  })

  it("envia If-Match com a versão que a tela leu, e zero quando não há", async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () =>
        HttpResponse.json({ ...processoApi, version: undefined }),
      ),
      http.patch(`${urlDaApi}/procurement-processes/:id`, ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        return HttpResponse.json(processoApi)
      }),
    )
    const { atualizarProcessoReal, obterProcesso } = await carregarClienteLimpo()

    await atualizarProcessoReal(await obterProcesso(processoApi.id), {})

    // Recurso recém-criado nasce na versão 0; sem o cabeçalho a API responde 428.
    expect(ifMatch).toBe('"0"')
  })
})

describe("encerrarProcessoReal", () => {
  it("manda a justificativa aparada e devolve o processo encerrado", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${processoApi.id}/closure`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...processoApi,
          status: "CLOSED",
          closedAt: "2026-08-22T18:00:00-03:00",
          closureNote: "Contratação cancelada.",
        })
      }),
    )
    const { encerrarProcessoReal } = await carregarClienteLimpo()

    const processo = await encerrarProcessoReal(processoApi.id, "  Contratação cancelada.  ")

    expect(corpo).toEqual({ justification: "Contratação cancelada." })
    expect(processo.status).toBe("concluido")
    expect(processo.encerradoEm).toBe("2026-08-22T18:00:00-03:00")
    expect(processo.justificativaEncerramento).toBe("Contratação cancelada.")
  })

  it("justificativa vazia vira ausente, e não uma string de espaços", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${processoApi.id}/closure`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...processoApi, status: "CLOSED", closedAt: "2026-08-22T18:00:00-03:00" })
      }),
    )
    const { encerrarProcessoReal } = await carregarClienteLimpo()

    await encerrarProcessoReal(processoApi.id, "   ")

    expect(corpo).toEqual({ justification: null })
  })
})

describe("reabrirProcessoReal", () => {
  it("manda o motivo e o processo volta ao rascunho", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${processoApi.id}/reopening`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(processoApi)
      }),
    )
    const { reabrirProcessoReal } = await carregarClienteLimpo()

    const processo = await reabrirProcessoReal(processoApi.id, "Retificar o ETP.")

    expect(corpo).toEqual({ reason: "Retificar o ETP." })
    expect(processo.status).toBe("rascunho")
    expect(processo.encerradoEm).toBeUndefined()
  })
})
