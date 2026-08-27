import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { documentoApi, secaoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O mapeamento entre o contrato e o vocabulário da interface.
 *
 * As **regras** — o que trava a geração, o que vira parágrafo de dispensa —
 * moram no servidor desde o Bloco 9. O que se testa aqui é a tradução: usar
 * `sectionCode` e `required` nas telas espalharia inglês pela interface e
 * amarraria os componentes ao formato do contrato.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/authoring-client")
}

const PROCESSO = documentoApi.processId

describe("abrir documento", () => {
  it("traduz o vocabulário do contrato para o da interface", async () => {
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    expect(documento.tipo).toBe("ETP")
    expect(documento.secoes[0]?.id).toBe("1")
    expect(documento.secoes[0]?.obrigatoria).toBe(true)
    expect(documento.secoes[0]?.fundamentoLegal).toContain("Art. 18")
  })

  it("o status da seção vem do que o servidor considera resolvido", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          sections: [secaoApi("1", 1, true, "Necessidade descrita."), secaoApi("2", 2, false)],
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    // Quem decide o que está resolvido é o servidor; a interface só traduz para
    // o vocabulário que as telas já usam.
    expect(documento.secoes[0]?.status).toBe("Completo")
    expect(documento.secoes[1]?.status).toBe("Não iniciado")
  })

  it("ordena pela posição do catálogo, não pela ordem do banco", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          sections: [secaoApi("3", 3, true), secaoApi("1", 1, true), secaoApi("2", 2, false)],
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    // É a ordem em que o documento sai impresso.
    expect((await abrirDocumento(PROCESSO, "ETP")).secoes.map((s) => s.id)).toEqual(["1", "2", "3"])
  })

  it("traz a justificativa de dispensa quando existe, e a omite quando não", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          sections: [secaoApi("2", 2, false, "", "Item único, sem métrica.")],
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    expect(documento.secoes[0]?.justificativaDispensa).toBe("Item único, sem métrica.")
  })

  it("traduz o tipo de documento para o formato do contrato", async () => {
    let rota = ""
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, ({ request }) => {
        rota = new URL(request.url).pathname
        return HttpResponse.json(documentoApi)
      }),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    await abrirDocumento(PROCESSO, "Cotação")

    // "Cotação" com acento na URL quebraria a rota; o contrato usa COTACAO.
    expect(rota).toContain("/documents/COTACAO")
  })
})

describe("salvar seção", () => {
  it("envia conteúdo e justificativa no formato do contrato", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(documentoApi)
        },
      ),
    )
    const { salvarSecao } = await carregarClienteLimpo()

    await salvarSecao(PROCESSO, "ETP", "2", "", "Item único, sem métrica.")

    expect(corpo.content).toBe("")
    expect(corpo.dispensationJustification).toBe("Item único, sem métrica.")
  })
})

describe("gerar texto da seção", () => {
  it("devolve o texto proposto, sem gravá-lo", async () => {
    let gravou = false
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`, () => {
        gravou = true
        return HttpResponse.json(documentoApi)
      }),
    )
    const { gerarTextoDaSecao } = await carregarClienteLimpo()

    const texto = await gerarTextoDaSecao(PROCESSO, "ETP", "1")

    // Quem decide se aquilo entra no documento é quem assina.
    expect(texto).toBe("Texto proposto pelo servidor.")
    expect(gravou).toBe(false)
  })

  it("o que já está escrito vai junto — e branco não vira rascunho", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/generate`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ text: "Texto proposto." })
        },
      ),
    )
    const { gerarTextoDaSecao } = await carregarClienteLimpo()

    // Pedir ajuda não pode custar o que já foi feito: rascunho da plataforma ou
    // texto do servidor, o modelo parte dele.
    await gerarTextoDaSecao(PROCESSO, "ETP", "1", "A rede tem 30 escolas.")
    expect(corpo?.draft).toBe("A rede tem 30 escolas.")

    // Espaços não são rascunho: mandá-los seria dizer ao modelo que há algo.
    await gerarTextoDaSecao(PROCESSO, "ETP", "1", "   ")
    expect(corpo?.draft).toBeNull()

    await gerarTextoDaSecao(PROCESSO, "ETP", "1")
    expect(corpo?.draft).toBeNull()
  })
})

describe("concluir documento", () => {
  it("devolve a versão e o corpo que o servidor congelou", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/finalize`, () =>
        HttpResponse.json({
          ...documentoApi,
          finalized: true,
          currentVersion: 2,
          body: [
            { sectionCode: "1", title: "Seção 1", text: "Necessidade.", dispensed: false },
            { sectionCode: "2", title: "Seção 2", text: "Dispensado...", dispensed: true },
          ],
        }),
      ),
    )
    const { concluirDocumento } = await carregarClienteLimpo()

    const documento = await concluirDocumento(PROCESSO, "ETP")

    // A versão vem do servidor: contá-la aqui faria duas abas divergirem sobre
    // qual é a versão vigente.
    expect(documento.versao).toBe(2)
    expect(documento.concluido).toBe(true)
    expect(documento.corpo[1]?.dispensada).toBe(true)
  })
})

describe("histórico de versões", () => {
  it("traduz nota, data e o texto congelado", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
        HttpResponse.json([
          {
            version: 2,
            note: "Retificação (Erro material): Valor trocado.",
            generatedAt: "2026-08-22T12:00:00-03:00",
            body: [{ sectionCode: "1", title: "Seção 1", text: "Necessidade.", dispensed: false }],
          },
        ]),
      ),
    )
    const { historicoDeVersoes, corpoDaVersaoVigente } = await carregarClienteLimpo()

    const historico = await historicoDeVersoes(PROCESSO, "ETP")
    expect(historico[0]?.versao).toBe(2)
    expect(historico[0]?.nota).toContain("Erro material")

    // O corpo é o congelado da versão vigente, não o rascunho de agora.
    expect((await corpoDaVersaoVigente(PROCESSO, "ETP"))[0]?.texto).toBe("Necessidade.")
  })

  it("documento nunca gerado não tem corpo nem histórico", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
        HttpResponse.json([]),
      ),
    )
    const { historicoDeVersoes, corpoDaVersaoVigente } = await carregarClienteLimpo()

    // Não há retrato de algo que não aconteceu — e a tela precisa de uma lista
    // vazia, não de um erro.
    expect(await historicoDeVersoes(PROCESSO, "ETP")).toEqual([])
    expect(await corpoDaVersaoVigente(PROCESSO, "ETP")).toEqual([])
  })

  it("a retificação vai ao servidor com a natureza traduzida", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/finalize`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({ ...documentoApi, finalized: true, currentVersion: 2 })
        },
      ),
    )
    const { concluirDocumento } = await carregarClienteLimpo()

    await concluirDocumento(PROCESSO, "ETP", {
      motivo: "alteracao_substancial",
      detalhe: "Prazo alterado.",
    })

    expect(corpo.rectificationKind).toBe("SUBSTANTIAL_CHANGE")
    expect(corpo.rectificationDetail).toBe("Prazo alterado.")
  })
})

describe("comparação entre versões", () => {
  it("traduz o diff e a errata para o vocabulário da interface", async () => {
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/versions/comparison`,
        ({ request }) => {
          const url = new URL(request.url)
          return HttpResponse.json({
            from: Number(url.searchParams.get("from")),
            to: Number(url.searchParams.get("to")),
            sections: [
              {
                sectionCode: "1",
                title: "Necessidade",
                change: "UNCHANGED",
                previousText: "Igual.",
                currentText: "Igual.",
              },
              {
                sectionCode: "4",
                title: "Prazo",
                change: "CHANGED",
                previousText: "30 dias.",
                currentText: "45 dias.",
              },
            ],
            errata: [
              { sectionCode: "4", title: "Prazo", ondeSeLe: "30 dias.", leiaSe: "45 dias." },
            ],
          })
        },
      ),
    )
    const { compararVersoes } = await carregarClienteLimpo()

    const comparacao = await compararVersoes(PROCESSO, "ETP", 1, 2)

    expect(comparacao.de).toBe(1)
    expect(comparacao.para).toBe(2)
    // O diff traz tudo, para quem quer conferir seção a seção...
    expect(comparacao.secoes.map((s) => s.mudanca)).toEqual(["UNCHANGED", "CHANGED"])
    expect(comparacao.secoes[1]?.textoAnterior).toBe("30 dias.")
    // ...e a errata, só o que mudou.
    expect(comparacao.errata).toHaveLength(1)
    expect(comparacao.errata[0]?.leiaSe).toBe("45 dias.")
  })
})

describe("seções criadas pelo servidor", () => {
  it("traduz a origem e omite fundamento e orientação", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          sections: [
            {
              sectionCode: "2.1",
              position: 3,
              title: "Memória de cálculo",
              required: false,
              origin: "AD_HOC",
              content: "",
              resolved: false,
            },
          ],
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const secao = (await abrirDocumento(PROCESSO, "ETP")).secoes[0]

    // A lei não conhece esta seção: fundamento e orientação simplesmente não
    // existem nela, e inventá-los seria mentir sobre o que a norma diz.
    expect(secao?.origem).toBe("servidor")
    expect(secao?.fundamentoLegal).toBeUndefined()
    expect(secao?.hint).toBeUndefined()
  })

  it("acrescentar envia título, âncora e tipo", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(documentoApi)
      }),
    )
    const { acrescentarSecao } = await carregarClienteLimpo()

    await acrescentarSecao(PROCESSO, "ETP", "Memória de cálculo", "2", true)

    expect(corpo).toEqual({
      title: "Memória de cálculo",
      anchorSectionCode: "2",
      nested: true,
    })
  })

  it("excluir e reordenar falam com as rotas certas", async () => {
    let excluida = ""
    let ordem: unknown = null
    servidor.use(
      http.delete(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`,
        ({ request }) => {
          excluida = new URL(request.url).pathname
          return HttpResponse.json(documentoApi)
        },
      ),
      http.put(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections-order`,
        async ({ request }) => {
          ordem = ((await request.json()) as Record<string, unknown>).sectionCodesInOrder
          return HttpResponse.json(documentoApi)
        },
      ),
    )
    const { excluirSecao, reordenarSecoes } = await carregarClienteLimpo()

    await excluirSecao(PROCESSO, "ETP", "2.1")
    await reordenarSecoes(PROCESSO, "ETP", ["2.2", "2.1"])

    expect(excluida).toContain("/sections/2.1")
    expect(ordem).toEqual(["2.2", "2.1"])
  })
})
