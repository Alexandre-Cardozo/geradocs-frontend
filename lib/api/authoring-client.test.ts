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
    expect(corpo).not.toHaveProperty("mode")

    // Na revisão, o texto é o que se revisa, e o modo vai declarado (§87).
    await gerarTextoDaSecao(PROCESSO, "ETP", "1", "Texto a revisar.", "revisao")
    expect(corpo).toEqual({ draft: "Texto a revisar.", mode: "REVIEW" })
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

/** Quem elaborou e o ato normativo (ADR-044 do back-end). */
describe("elaboração na conclusão", () => {
  function capturar() {
    const corpos: Record<string, unknown>[] = []
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/finalize`, async ({ request }) => {
        corpos.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ ...documentoApi, finalized: true, currentVersion: 1 })
      }),
    )
    return corpos
  }

  it("sem elaboração não envia nada: o servidor usa quem conclui e mantém o ato", async () => {
    const corpos = capturar()
    const { concluirDocumento } = await carregarClienteLimpo()

    await concluirDocumento(PROCESSO, "ETP")

    expect(corpos[0]).toEqual({})
  })

  it("envia outra pessoa, a norma do acervo ou o ato digitado", async () => {
    const corpos = capturar()
    const { concluirDocumento } = await carregarClienteLimpo()

    await concluirDocumento(PROCESSO, "ETP", undefined, {
      responsavel: { nome: "José Pereira", cpf: "52998224725" },
      ato: { normaId: "n-1" },
    })
    await concluirDocumento(PROCESSO, "Edital", undefined, { ato: { citacao: "10.210/2025" } })
    await concluirDocumento(PROCESSO, "TR", undefined, { responsavel: { servidorId: "u-jose" } })

    // O colega do órgão vai pelo id: o CPF inteiro dele não passa pela tela.
    expect(corpos[2]).toEqual({ preparedByUserId: "u-jose" })
    expect(corpos[0]).toEqual({
      preparedByName: "José Pereira",
      preparedByCpf: "52998224725",
      legalActRegulationId: "n-1",
    })
    expect(corpos[1]).toEqual({ legalActCitation: "10.210/2025" })
  })

  it("a versão traz quem elaborou e o ato — ou nada, nas anteriores", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
        HttpResponse.json([
          {
            version: 2,
            note: "Regeração",
            generatedAt: "2026-10-14T12:00:00Z",
            contentHash: "a".repeat(64),
            preparedBy: { name: "Maria Costa", cpf: "***.982.247-**" },
            legalActCitation: "Portaria nº 77/2026",
            body: [],
          },
          { version: 1, note: "Geração inicial", generatedAt: "2026-10-01T12:00:00Z", contentHash: "b".repeat(64), body: [] },
        ]),
      ),
    )
    const { versoesComTexto } = await carregarClienteLimpo()

    const [atual, anterior] = await versoesComTexto(PROCESSO, "ETP")
    expect(atual?.responsavel).toEqual({ nome: "Maria Costa", cpf: "***.982.247-**" })
    expect(atual?.atoNormativo).toBe("Portaria nº 77/2026")
    expect(anterior?.responsavel).toBeNull()
    expect(anterior?.atoNormativo).toBeNull()
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

/**
 * A minuta da AGU como estrutura do documento (§85, ADR-052 do back-end).
 */
describe("modelo de estrutura", () => {
  const comMinuta = {
    ...documentoApi,
    documentType: "EDITAL",
    currentVersion: 1,
    sections: [
      {
        ...secaoApi("PC00", 1, true, "Torna-se público."),
        number: "",
        topics: ["PREAMBULO"],
        modelText: "Torna-se público que...",
        modelNotes: ["Nota explicativa: adapte."],
      },
      { ...secaoApi("PC12", 2, false), number: "12", topics: ["DOTACAO"], modelText: null, modelNotes: [] },
      { ...secaoApi("PC12.1", 3, false), origin: "AD_HOC", number: "12.1", topics: [] },
    ],
    body: [
      { sectionCode: "PC00", title: "Preâmbulo", text: "Torna-se público.", dispensed: false, headingNumber: "" },
      { sectionCode: "7", title: "Antiga", text: "Texto.", dispensed: false, headingNumber: "7" },
    ],
    structureModel: { code: "AGU-EDITAL-PC", version: "2025-11", title: "Minuta AGU", publishedIn: "nov/2025" },
    structureTitle: "Minuta AGU — Pregão (nov/2025)",
    availableModels: [
      {
        code: "AGU-EDITAL-PC",
        version: "2025-11",
        title: "Minuta AGU — Pregão",
        description: "Menor preço.",
        publishedIn: "nov/2025",
        sectionCount: 17,
        current: true,
      },
    ],
    modelChoiceRequired: false,
    rectificationRequired: true,
    otherModelTexts: [
      { sectionCode: "12", title: "Da Dotação Orçamentária", content: "02.01.", targetSectionCode: "PC12" },
      { sectionCode: "14", title: "Da Matriz de Riscos", content: "Riscos.", targetSectionCode: null },
    ],
  }

  it("traz a minuta, o número, os assuntos, o texto e as notas, e liga o painel pelo assunto", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () => HttpResponse.json(comMinuta)),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "Edital")

    expect(documento.estrutura).toEqual({ titulo: "Minuta AGU — Pregão (nov/2025)", codigoDoModelo: "AGU-EDITAL-PC" })
    expect(documento.modelos).toEqual([
      {
        codigo: "AGU-EDITAL-PC",
        versao: "2025-11",
        titulo: "Minuta AGU — Pregão",
        descricao: "Menor preço.",
        publicadoEm: "nov/2025",
        quantidadeDeSecoes: 17,
        atual: true,
      },
    ])
    expect(documento.retificacaoExigida).toBe(true)
    expect(documento.escolhaDeModeloPendente).toBe(false)
    expect(documento.textosDeOutroModelo).toEqual([
      { secao: "12", titulo: "Da Dotação Orçamentária", texto: "02.01.", secaoAlvo: "PC12" },
      { secao: "14", titulo: "Da Matriz de Riscos", texto: "Riscos." },
    ])
    expect(documento.secoes[0]).toMatchObject({
      numero: "",
      assuntos: ["PREAMBULO"],
      textoDaMinuta: "Torna-se público que...",
      notasDaMinuta: ["Nota explicativa: adapte."],
    })
    // O código da minuta não está no catálogo da tela: é o assunto que liga o painel.
    expect(documento.secoes[1]?.painel).toBe("dotacao")
    expect(documento.secoes[1]?.textoDaMinuta).toBeUndefined()
    expect(documento.secoes[2]?.painel).toBeUndefined()
    expect(documento.corpo[0]?.numero).toBe("")
    // Número igual ao código é o da Estrutura GeraDocs: não vira campo.
    expect(documento.corpo[1]?.numero).toBeUndefined()
  })

  it("sem minuta, a Estrutura GeraDocs, sem escolha nem textos guardados", async () => {
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    expect(documento.estrutura).toEqual({ titulo: "Estrutura GeraDocs (Lei 14.133/21)" })
    expect(documento.modelos).toEqual([])
    expect(documento.escolhaDeModeloPendente).toBe(false)
    expect(documento.retificacaoExigida).toBe(false)
    expect(documento.textosDeOutroModelo).toEqual([])
    expect(documento.secoes[0]?.numero).toBeUndefined()
  })

  it("a prévia e a troca falam com as rotas do modelo", async () => {
    let pedido: { metodo: string; url: string; corpo?: unknown } | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model/preview`, ({ request }) => {
        pedido = { metodo: "GET", url: request.url }
        return HttpResponse.json({ kept: ["Do Objeto"], merged: [], blank: ["Dos Recursos"], unplaced: ["Da Dotação"] })
      }),
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model`, async ({ request }) => {
        pedido = { metodo: "PUT", url: request.url, corpo: await request.json() }
        return HttpResponse.json(comMinuta)
      }),
    )
    const { previaDaTrocaDeModelo, trocarModeloDoDocumento } = await carregarClienteLimpo()

    expect(await previaDaTrocaDeModelo(PROCESSO, "Edital", "AGU-EDITAL-TP")).toEqual({
      mantidas: ["Do Objeto"],
      reunidas: [],
      emBranco: ["Dos Recursos"],
      semLugar: ["Da Dotação"],
    })
    expect(pedido?.url).toContain("/documents/EDITAL/structure-model/preview?code=AGU-EDITAL-TP")

    const trocado = await trocarModeloDoDocumento(PROCESSO, "Edital", "AGU-EDITAL-TP")
    expect(pedido).toMatchObject({ metodo: "PUT", corpo: { code: "AGU-EDITAL-TP" } })
    expect(trocado.estrutura.codigoDoModelo).toBe("AGU-EDITAL-PC")
  })
})
