import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/pca-client")
}

afterEach(() => vi.resetModules())

const PROCESSO_ID = "3f2b1a00-1111-4222-8333-444455556666"

const planoApi = {
  year: 2026,
  sourceFileName: "pca-2026.csv",
  importedAt: "2026-08-22T12:00:00-03:00",
  indexedItems: 247,
}

function verificacaoApi(sobrescrever: Record<string, unknown> = {}) {
  return {
    plan: planoApi,
    foreseen: true,
    citable: true,
    citation: "A presente contratação está prevista...",
    findings: [
      {
        demand: "Papel A4 75 g/m2",
        foreseen: true,
        kind: "TERMS",
        code: "2026-0142",
        description: "Papel A4 75 g/m2, resma com 500 folhas",
        unit: "RESMA",
        quantity: 1200,
        estimatedValue: 28800,
      },
    ],
    ...sobrescrever,
  }
}

describe("planoVigente", () => {
  it("traduz o plano do contrato para o vocabulário da interface", async () => {
    servidor.use(http.get(`${urlDaApi}/pca-plan`, () => HttpResponse.json(planoApi)))
    const { planoVigente } = await carregarClienteLimpo()

    expect(await planoVigente()).toEqual({
      ano: 2026,
      arquivo: "pca-2026.csv",
      importadoEm: "2026-08-22T12:00:00-03:00",
      itensIndexados: 247,
    })
  })

  it("órgão sem plano responde 204, e isso vira null e não um plano vazio", async () => {
    // "Nenhum plano" e "plano com zero itens" são estados diferentes: o segundo
    // significaria que alguém importou um arquivo que não trouxe item nenhum.
    servidor.use(http.get(`${urlDaApi}/pca-plan`, () => new HttpResponse(null, { status: 204 })))
    const { planoVigente } = await carregarClienteLimpo()

    expect(await planoVigente()).toBeNull()
  })
})

describe("importarPlano", () => {
  it("envia o exercício, o nome e o conteúdo do arquivo", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...planoApi, indexedItems: 2 })
      }),
    )
    const { importarPlano } = await carregarClienteLimpo()

    const plano = await importarPlano({
      ano: 2026,
      arquivo: "pca-2026.csv",
      conteudo: "2026-0142;Papel A4",
    })

    expect(corpo).toEqual({
      year: 2026,
      fileName: "pca-2026.csv",
      content: "2026-0142;Papel A4",
    })
    expect(plano.itensIndexados).toBe(2)
  })
})

describe("verificacaoDoProcesso", () => {
  it("traduz o achado inteiro, com item, unidade, quantidade e valor", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca`, () =>
        HttpResponse.json(verificacaoApi()),
      ),
    )
    const { verificacaoDoProcesso } = await carregarClienteLimpo()

    const verificacao = await verificacaoDoProcesso(PROCESSO_ID)

    expect(verificacao.plano?.ano).toBe(2026)
    expect(verificacao.previsto).toBe(true)
    expect(verificacao.citavel).toBe(true)
    expect(verificacao.achados[0]).toEqual({
      demanda: "Papel A4 75 g/m2",
      previsto: true,
      forma: "TERMOS",
      codigo: "2026-0142",
      descricao: "Papel A4 75 g/m2, resma com 500 folhas",
      unidade: "RESMA",
      quantidade: 1200,
      valorEstimado: 28800,
    })
  })

  it("distingue o que a plataforma encontrou do que o servidor informou", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca`, () =>
        HttpResponse.json(
          verificacaoApi({
            declaredNote: "Conferido no portal.",
            findings: [
              { demand: "Cimento", foreseen: true, kind: "DECLARED", code: "2026-0731" },
            ],
          }),
        ),
      ),
    )
    const { verificacaoDoProcesso, FORMA_DA_PREVISAO } = await carregarClienteLimpo()

    const verificacao = await verificacaoDoProcesso(PROCESSO_ID)

    // Fundir os dois faria a tela parecer ter conferido algo que ninguém
    // conferiu — e é o documento do servidor que vai ao controle depois.
    expect(verificacao.achados[0]?.forma).toBe("DECLARADA")
    expect(FORMA_DA_PREVISAO.DECLARADA.rotulo).toBe("Informado por você")
    expect(FORMA_DA_PREVISAO.TERMOS.rotulo).toBe("Encontrado no PCA")
    expect(verificacao.notaDeclarada).toBe("Conferido no portal.")
  })

  it("item sem previsão chega sem forma e sem código", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca`, () =>
        HttpResponse.json(
          verificacaoApi({
            plan: null,
            foreseen: false,
            citable: false,
            citation: undefined,
            findings: [{ demand: "Cimento CP-II 50 kg", foreseen: false }],
          }),
        ),
      ),
    )
    const { verificacaoDoProcesso } = await carregarClienteLimpo()

    const verificacao = await verificacaoDoProcesso(PROCESSO_ID)

    expect(verificacao.plano).toBeNull()
    expect(verificacao.citavel).toBe(false)
    expect(verificacao.citacao).toBeUndefined()
    expect(verificacao.achados[0]?.forma).toBeUndefined()
    expect(verificacao.achados[0]?.codigo).toBeUndefined()
  })
})

describe("declararPrevisao", () => {
  it("envia o item e a nota aparada", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca/declaration`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(verificacaoApi())
      }),
    )
    const { declararPrevisao } = await carregarClienteLimpo()

    await declararPrevisao(PROCESSO_ID, { codigo: "2026-0731", nota: "  no portal  " })

    expect(corpo).toEqual({ itemCode: "2026-0731", note: "no portal" })
  })

  it("nota em branco vira ausente, e não uma anotação com espaços", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca/declaration`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(verificacaoApi())
      }),
    )
    const { declararPrevisao } = await carregarClienteLimpo()

    await declararPrevisao(PROCESSO_ID, { codigo: "2026-0731", nota: "   " })
    expect(corpo).toEqual({ itemCode: "2026-0731", note: null })

    await declararPrevisao(PROCESSO_ID, { codigo: "2026-0731" })
    expect(corpo).toEqual({ itemCode: "2026-0731", note: null })
  })
})

describe("citarNaSecao", () => {
  it("grava a citação e devolve o painel atualizado", async () => {
    let metodo: string | undefined
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${PROCESSO_ID}/pca/citation`, ({ request }) => {
        metodo = request.method
        return HttpResponse.json(verificacaoApi())
      }),
    )
    const { citarNaSecao } = await carregarClienteLimpo()

    const verificacao = await citarNaSecao(PROCESSO_ID)

    expect(metodo).toBe("POST")
    expect(verificacao.citacao).toContain("está prevista")
  })
})
