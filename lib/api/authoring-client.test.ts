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

  /*
    O que a próxima versão imprime antes da primeira seção (ADR-059 do
    back-end): a tela mostra na prévia, e diz quando o objeto que vai ao papel
    é a descrição do processo, e não o Objeto da Demanda.
  */
  it("traduz a abertura do documento, e diz quando o objeto vem da descrição", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          opening: {
            title: "ESTUDO TÉCNICO PRELIMINAR",
            introduction: "O presente documento caracteriza a primeira etapa.",
            processNumber: "PROC-2026-000006",
            objectText: "Aquisição de materiais de expediente",
            objectSource: "OBJECT_DESCRIPTION",
          },
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    expect((await abrirDocumento(PROCESSO, "ETP")).abertura).toEqual({
      titulo: "ESTUDO TÉCNICO PRELIMINAR",
      introducao: "O presente documento caracteriza a primeira etapa.",
      processo: "PROC-2026-000006",
      objeto: "Aquisição de materiais de expediente",
      objetoDaDescricao: true,
    })
  })

  it("nas minutas da AGU a abertura é só o título; sem ela, nada", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          documentType: "EDITAL",
          opening: {
            title: "EDITAL DE LICITAÇÃO",
            introduction: null,
            processNumber: null,
            objectText: null,
            objectSource: "DEMAND_OBJECT",
          },
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    expect((await abrirDocumento(PROCESSO, "Edital")).abertura).toEqual({
      titulo: "EDITAL DE LICITAÇÃO",
      objetoDaDescricao: false,
    })

    // Servidor anterior à abertura: o campo não existe, e a prévia segue como era.
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () => HttpResponse.json(documentoApi)),
    )
    expect((await abrirDocumento(PROCESSO, "ETP")).abertura).toBeUndefined()
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

  it("os avisos da curadoria da orientação voltam à parte dos avisos da seção (§91)", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({
          documentType: "ETP", sectionCode: "1", content: "Texto.",
          warnings: ["Aviso da seção."], guidanceWarnings: ["Marca só com justificativa."],
        }),
      ),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    expect(await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "", "Indicar a marca.")).toMatchObject({
      warnings: ["Aviso da seção."],
      guidanceWarnings: ["Marca só com justificativa."],
    })
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

describe("rascunho com fontes de qualquer seção", () => {
  it("preserva seção e documento da rota e devolve lacunas sem salvar", async () => {
    let gravou = false
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({
          documentType: "TR", sectionCode: "1", content: "Texto para revisão.",
          missingFacts: ["Preço não informado."],
          evidence: [{ source: "Processo", fact: "Objeto cadastrado." }],
        }),
      ),
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`, () => {
        gravou = true
        return HttpResponse.json(documentoApi)
      }),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()
    const resultado = await gerarRascunhoDaSecaoComFontes(PROCESSO, "TR", "1", "texto anterior")
    expect(resultado).toEqual({
      content: "Texto para revisão.", missingFacts: ["Preço não informado."],
      evidence: [{ source: "Processo", fact: "Objeto cadastrado." }], warnings: [], guidanceWarnings: [],
    })
    expect(gravou).toBe(false)
  })

  it("recusa resposta de outra seção antes de mostrá-la no editor", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({ documentType: "TR", sectionCode: "2", content: "Texto de outra seção." }),
      ),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()
    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "TR", "1", ""))
      .rejects.toThrow(/rascunho válido para esta seção/)
  })

  it("preserva aviso de fonte não integrada sem apresentá-lo como fato ausente", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({
          documentType: "ETP", sectionCode: "6", content: "Valor pendente de pesquisa.",
          missingFacts: [], warnings: ["Preços referenciais não integram o contexto enviado à IA."],
          evidence: [],
        }),
      ),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()
    const resultado = await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "6", "")
    expect(resultado.warnings).toEqual(["Preços referenciais não integram o contexto enviado à IA."])
    expect(resultado.missingFacts).toEqual([])
  })
})

describe("a orientação do servidor na redação com fontes (ADR-068)", () => {
  it("vai junto só quando há, no mesmo pedido que traz o rascunho, e não grava a seção", async () => {
    const corpos: Record<string, unknown>[] = []
    let gravou = false
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/ETP/sections/1/ai-draft-with-sources`,
        async ({ request }) => {
          corpos.push((await request.json()) as Record<string, unknown>)
          return HttpResponse.json({
            documentType: "ETP", sectionCode: "1", content: "Rascunho da necessidade.",
            missingFacts: ["Problema não informado."], evidence: [{ source: "DFD 1", fact: "10 notebooks" }],
          })
        },
      ),
      http.put(`${urlDaApi}/procurement-processes/:id/documents/ETP/sections/1`, () => {
        gravou = true
        return HttpResponse.json(documentoApi)
      }),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    expect(await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "Texto atual.")).toEqual({
      content: "Rascunho da necessidade.", missingFacts: ["Problema não informado."],
      warnings: [], evidence: [{ source: "DFD 1", fact: "10 notebooks" }], guidanceWarnings: [],
    })
    await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "Texto.", "Enfatizar lotes.")
    await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "Texto.", "   ")

    expect(corpos).toEqual([
      { draft: "Texto atual." },
      { draft: "Texto.", guidance: "Enfatizar lotes." },
      { draft: "Texto." },
    ])
    expect(gravou).toBe(false)
  })

  it("rejeita resposta vazia ou de outra seção", async () => {
    const rota = `${urlDaApi}/procurement-processes/:id/documents/ETP/sections/1/ai-draft-with-sources`
    servidor.use(http.post(rota, () => HttpResponse.json({ documentType: "TR", sectionCode: "2", content: "Texto errado." })))
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()
    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "")).rejects.toThrow("rascunho válido")

    servidor.use(http.post(rota, () => HttpResponse.json({ documentType: "ETP", sectionCode: "1", content: "   " })))
    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", " ")).rejects.toThrow("rascunho válido")
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

  it("cada versão traz o próprio texto, com hash e seções traduzidas", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
        HttpResponse.json([
          {
            version: 1,
            note: "Geração inicial",
            generatedAt: "2026-08-22T12:00:00-03:00",
            contentHash: "a".repeat(64),
            body: [
              { sectionCode: "1", title: "Necessidade", text: "Texto da v1.", dispensed: false },
              { sectionCode: "3", title: "Requisitos", text: "", dispensed: true },
            ],
          },
        ]),
      ),
    )
    const { versoesComTexto } = await carregarClienteLimpo()

    // É o texto de cada versão que responde "o que estava escrito antes" —
    // a pergunta que antecede a retificação e que a errata cita.
    const [versao] = await versoesComTexto(PROCESSO, "ETP")
    expect(versao?.hash).toBe("a".repeat(64))
    expect(versao?.corpo).toEqual([
      { id: "1", titulo: "Necessidade", texto: "Texto da v1.", dispensada: false },
      { id: "3", titulo: "Requisitos", texto: "", dispensada: true },
    ])
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

  it("renomear manda o título novo para a rota da seção", async () => {
    let caminho = ""
    let corpo: unknown
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/title`,
        async ({ request }) => {
          caminho = new URL(request.url).pathname
          corpo = await request.json()
          return HttpResponse.json(documentoApi)
        },
      ),
    )
    const { renomearSecao } = await carregarClienteLimpo()

    const documento = await renomearSecao(PROCESSO, "ETP", "1+1", "Memória de cálculo")

    expect(caminho).toContain("/sections/1%2B1/title")
    expect(corpo).toEqual({ title: "Memória de cálculo" })
    expect(documento.tipo).toBe("ETP")
  })
})

/** Os tópicos que os contextos da contratação exigem (ADR-061 do back-end). */
describe("tópicos do contexto da contratação", () => {
  const topicoApi = {
    code: "CONVENCAO_COLETIVA",
    title: "Convenção ou Acordo Coletivo de Trabalho Aplicável",
    legalBasis: "Art. 135, II, Lei 14.133/21",
    hint: "Indique a convenção.",
    anchorSectionCode: "3",
    contexts: ["Serviço com Condutor de Veículo"],
  }

  it("traduz os tópicos, diz onde o incluído está e marca a seção que veio dele", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...documentoApi,
          sections: [
            secaoApi("3", 3, false),
            {
              sectionCode: "3.1",
              position: 4,
              title: topicoApi.title,
              legalBasis: topicoApi.legalBasis,
              hint: topicoApi.hint,
              required: false,
              origin: "AD_HOC",
              content: "",
              resolved: false,
              parentSectionCode: "3",
            },
            {
              sectionCode: "3.2",
              position: 5,
              title: "Memória de cálculo",
              required: false,
              origin: "AD_HOC",
              content: "",
              resolved: false,
            },
          ],
          contextTopics: [
            { ...topicoApi, sectionCode: "3.1" },
            { ...topicoApi, code: "HABILITACAO_DO_CONDUTOR", title: "Habilitação", sectionCode: null },
          ],
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    expect(documento.topicosDoContexto).toEqual([
      {
        codigo: "CONVENCAO_COLETIVA",
        titulo: "Convenção ou Acordo Coletivo de Trabalho Aplicável",
        fundamentoLegal: "Art. 135, II, Lei 14.133/21",
        orientacao: "Indique a convenção.",
        ancora: "3",
        contextos: ["Serviço com Condutor de Veículo"],
        secao: "3.1",
      },
      {
        codigo: "HABILITACAO_DO_CONDUTOR",
        titulo: "Habilitação",
        fundamentoLegal: "Art. 135, II, Lei 14.133/21",
        orientacao: "Indique a convenção.",
        ancora: "3",
        contextos: ["Serviço com Condutor de Veículo"],
      },
    ])
    // O tópico tem fundamento do catálogo curado; a criada à mão, não.
    expect(documento.secoes.find((s) => s.id === "3.1")).toMatchObject({
      origem: "servidor",
      doContexto: true,
      fundamentoLegal: "Art. 135, II, Lei 14.133/21",
    })
    expect(documento.secoes.find((s) => s.id === "3.2")?.doContexto).toBeUndefined()
    // O subtópico diz a seção-mãe; a seção do catálogo não tem mãe.
    expect(documento.secoes.find((s) => s.id === "3.1")?.secaoPai).toBe("3")
    expect(documento.secoes.find((s) => s.id === "3")?.secaoPai).toBeUndefined()
  })

  it("documento sem contexto confirmado não tem tópico", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () => HttpResponse.json(documentoApi)),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    expect((await abrirDocumento(PROCESSO, "ETP")).topicosDoContexto).toEqual([])
  })

  it("incluir o tópico fala com a rota do tópico", async () => {
    let caminho = ""
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/context-topics/:codigo`, ({ request }) => {
        caminho = new URL(request.url).pathname
        return HttpResponse.json({ ...documentoApi, contextTopics: [{ ...topicoApi, sectionCode: "3.1" }] })
      }),
    )
    const { incluirTopicoDoContexto } = await carregarClienteLimpo()

    const documento = await incluirTopicoDoContexto(PROCESSO, "ETP", "CONVENCAO_COLETIVA")

    expect(caminho).toContain("/documents/ETP/context-topics/CONVENCAO_COLETIVA")
    expect(documento.topicosDoContexto[0]?.secao).toBe("3.1")
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
    structureTitle: "Minuta AGU: Pregão (nov/2025)",
    availableModels: [
      {
        code: "AGU-EDITAL-PC",
        version: "2025-11",
        title: "Minuta AGU: Pregão",
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

    expect(documento.estrutura).toEqual({ titulo: "Minuta AGU: Pregão (nov/2025)", codigoDoModelo: "AGU-EDITAL-PC" })
    expect(documento.modelos).toEqual([
      {
        codigo: "AGU-EDITAL-PC",
        versao: "2025-11",
        titulo: "Minuta AGU: Pregão",
        descricao: "Menor preço.",
        publicadoEm: "nov/2025",
        quantidadeDeSecoes: 17,
        atual: true,
        doOrgao: false,
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

  it("traz o afastamento da minuta, as justificativas, o modelo do órgão e a versão nova (§88)", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo`, () =>
        HttpResponse.json({
          ...comMinuta,
          sections: [
            {
              ...comMinuta.sections[0],
              modelDeviation: { clauses: 3, missing: ["1.5. O critério de julgamento..."] },
              modelDeviationJustification: "Lei municipal.",
            },
            { ...comMinuta.sections[1], modelDeviation: null, modelDeviationJustification: null },
          ],
          structureModel: { ...comMinuta.structureModel, source: "Órgão", justification: "Lei 1.234/2024." },
          availableModels: [{ ...comMinuta.availableModels[0], source: "Órgão" }],
          modelJustificationRequired: true,
          modelJustification: "Iniciado antes das minutas.",
          newerModel: { code: "AGU-EDITAL-PC", version: "2026-04", title: "Minuta AGU", publishedIn: "abr/2026" },
        }),
      ),
    )
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "Edital")

    expect(documento.secoes[0]).toMatchObject({
      desvioDaMinuta: { clausulas: 3, faltam: ["1.5. O critério de julgamento..."] },
      justificativaDoDesvio: "Lei municipal.",
    })
    expect(documento.secoes[1]?.desvioDaMinuta).toBeUndefined()
    expect(documento.secoes[1]?.justificativaDoDesvio).toBeUndefined()
    expect(documento.modelos[0]?.doOrgao).toBe(true)
    expect(documento.justificativaDoModelo).toEqual({
      pedida: true,
      texto: "Iniciado antes das minutas.",
      doModelo: "Lei 1.234/2024.",
    })
    expect(documento.versaoMaisNova).toEqual({
      codigo: "AGU-EDITAL-PC",
      versao: "2026-04",
      titulo: "Minuta AGU",
      publicadoEm: "abr/2026",
    })
  })

  it("as justificativas vão às rotas delas, e em branco retiram", async () => {
    const pedidos: { url: string; corpo: unknown }[] = []
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/model-justification`, async ({ request }) => {
        pedidos.push({ url: new URL(request.url).pathname, corpo: await request.json() })
        return HttpResponse.json(comMinuta)
      }),
      http.put(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/model-deviation`,
        async ({ request }) => {
          pedidos.push({ url: new URL(request.url).pathname, corpo: await request.json() })
          return HttpResponse.json(comMinuta)
        },
      ),
    )
    const { justificarDesvio, justificarModelo } = await carregarClienteLimpo()

    expect((await justificarModelo(PROCESSO, "Edital", "Motivo.")).tipo).toBe("Edital")
    await justificarDesvio(PROCESSO, "Edital", "PC01", "")

    expect(pedidos).toEqual([
      { url: expect.stringMatching(/\/documents\/EDITAL\/model-justification$/), corpo: { text: "Motivo." } },
      { url: expect.stringMatching(/\/sections\/PC01\/model-deviation$/), corpo: { text: "" } },
    ])
  })

  it("sem minuta, a Estrutura GeraDocs, sem escolha nem textos guardados", async () => {
    const { abrirDocumento } = await carregarClienteLimpo()

    const documento = await abrirDocumento(PROCESSO, "ETP")

    expect(documento.estrutura).toEqual({ titulo: "Estrutura GeraDocs (Lei 14.133/21)" })
    expect(documento.modelos).toEqual([])
    expect(documento.escolhaDeModeloPendente).toBe(false)
    expect(documento.retificacaoExigida).toBe(false)
    expect(documento.textosDeOutroModelo).toEqual([])
    expect(documento.justificativaDoModelo).toEqual({ pedida: false })
    expect(documento.versaoMaisNova).toBeUndefined()
    expect(documento.secoes[0]?.numero).toBeUndefined()
  })

  it("a prévia e a troca falam com as rotas do modelo", async () => {
    let pedido: { metodo: string; url: string; corpo?: unknown } | undefined
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model/preview`, ({ request }) => {
        pedido = { metodo: "GET", url: request.url }
        return HttpResponse.json({
          kept: ["Do Objeto"],
          merged: [],
          blank: ["Dos Recursos"],
          unplaced: ["Da Dotação"],
          restored: ["Da Habilitação"],
        })
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
      restauradas: ["Da Habilitação"],
    })
    expect(pedido?.url).toContain("/documents/EDITAL/structure-model/preview?code=AGU-EDITAL-TP")

    const trocado = await trocarModeloDoDocumento(PROCESSO, "Edital", "AGU-EDITAL-TP")
    expect(pedido).toMatchObject({ metodo: "PUT", corpo: { code: "AGU-EDITAL-TP" } })
    expect(trocado.estrutura.codigoDoModelo).toBe("AGU-EDITAL-PC")
  })
})

describe("propostas de IA (ADR-066)", () => {
  it("o rascunho traz o id da proposta, para salvar ou rejeitar depois", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({ documentType: "ETP", sectionCode: "4", content: "Texto.", proposalId: "p-1" }),
      ),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    expect((await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "4", "")).proposalId).toBe("p-1")
  })

  it("a redação com orientação também devolve o id da proposta", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`, () =>
        HttpResponse.json({ documentType: "ETP", sectionCode: "1", content: "Texto.", proposalId: "p-2" }),
      ),
    )
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    expect(
      (await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "", "Ênfase nas escolas rurais.")).proposalId,
    ).toBe("p-2")
  })

  it("salvar a seção leva a proposta de onde o texto veio, e só quando veio de uma", async () => {
    const corpos: Record<string, unknown>[] = []
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao`, async ({ request }) => {
        corpos.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json(documentoApi)
      }),
    )
    const { salvarSecao } = await carregarClienteLimpo()

    await salvarSecao(PROCESSO, "ETP", "1", "Texto.", undefined, "p-1")
    await salvarSecao(PROCESSO, "ETP", "1", "Texto.")

    expect(corpos[0]).toMatchObject({ content: "Texto.", aiProposalId: "p-1" })
    expect(corpos[1]).not.toHaveProperty("aiProposalId")
  })

  it("lê a proposta pendente da seção e devolve nada quando não há (204)", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-proposal`, ({ params }) =>
        params.secao === "4"
          ? HttpResponse.json({
              documentType: "ETP", sectionCode: "4", content: "Rascunho pendente.", proposalId: "p-9",
              missingFacts: ["Sem histórico de consumo."], warnings: [],
              evidence: [{ source: "DFD", fact: "1.200 pacotes" }], guidanceWarnings: [],
            })
          : new HttpResponse(null, { status: 204 }),
      ),
    )
    const { lerPropostaPendenteDaSecao } = await carregarClienteLimpo()

    expect(await lerPropostaPendenteDaSecao(PROCESSO, "ETP", "4")).toEqual({
      proposalId: "p-9", content: "Rascunho pendente.", missingFacts: ["Sem histórico de consumo."], warnings: [],
      evidence: [{ source: "DFD", fact: "1.200 pacotes" }], guidanceWarnings: [],
    })
    expect(await lerPropostaPendenteDaSecao(PROCESSO, "ETP", "1")).toBeNull()
  })

  it("uma proposta restaurada sem lacunas, avisos nem evidências volta com listas vazias", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-proposal`, () =>
        HttpResponse.json({ content: "Só o texto.", proposalId: "p-3" }),
      ),
    )
    const { lerPropostaPendenteDaSecao } = await carregarClienteLimpo()

    expect(await lerPropostaPendenteDaSecao(PROCESSO, "ETP", "4")).toEqual({
      proposalId: "p-3", content: "Só o texto.", missingFacts: [], warnings: [], evidence: [], guidanceWarnings: [],
    })
  })

  it("rejeitar manda o motivo só quando há motivo", async () => {
    const corpos: Record<string, unknown>[] = []
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-proposals/:proposta/reject`,
        async ({ request }) => {
          corpos.push((await request.json()) as Record<string, unknown>)
          return new HttpResponse(null, { status: 204 })
        },
      ),
    )
    const { rejeitarPropostaDeIa } = await carregarClienteLimpo()

    await rejeitarPropostaDeIa(PROCESSO, "ETP", "4", "p-1", "  Não reflete a necessidade.  ")
    await rejeitarPropostaDeIa(PROCESSO, "ETP", "4", "p-2")

    expect(corpos).toEqual([{ reason: "Não reflete a necessidade." }, {}])
  })
})

describe("quando o servidor recusa a geração por IA", () => {
  const rotaDaGeracao = `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/ai-draft-with-sources`

  function recusa(status: number, code: string, detail: string, cabecalhos?: Record<string, string>) {
    servidor.use(
      http.post(
        rotaDaGeracao,
        () =>
          HttpResponse.json(
            { title: "Recusada", status, detail, code },
            { status, headers: { "Content-Type": "application/problem+json", ...cabecalhos } },
          ),
      ),
    )
  }

  it("geração em andamento (429): a mensagem do servidor chega inteira, com o código para a tela decidir", async () => {
    recusa(429, "AI_BUSY", "Já existe uma geração em andamento para esta seção. Aguarde alguns segundos.", {
      "Retry-After": "3",
    })
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "Texto.")).rejects.toMatchObject({
      status: 429,
      code: "AI_BUSY",
      message: "Já existe uma geração em andamento para esta seção. Aguarde alguns segundos.",
    })
  })

  it("teto do mês esgotado (402) e IA não configurada (503) também chegam com o código e o motivo", async () => {
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    recusa(402, "AI_BUDGET_EXHAUSTED", "O teto de IA do mês acabou. A escrita manual segue disponível.")
    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "")).rejects.toMatchObject({
      status: 402,
      code: "AI_BUDGET_EXHAUSTED",
      message: expect.stringContaining("escrita manual"),
    })

    recusa(503, "AI_PROVIDER_NOT_CONFIGURED", "A IA não está configurada neste ambiente.")
    await expect(gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "")).rejects.toMatchObject({
      status: 503,
      code: "AI_PROVIDER_NOT_CONFIGURED",
    })
  })

  it("o 429 da geração não é tratado como bloqueio de login nem derruba a sessão", async () => {
    recusa(429, "AI_BUSY", "Já existe uma geração em andamento.")
    const { gerarRascunhoDaSecaoComFontes } = await carregarClienteLimpo()

    const erro = await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "").catch((falha: unknown) => falha)

    expect(erro).toMatchObject({ status: 429 })
    // Quem pediu continua autenticado: o servidor só pede para esperar.
    servidor.use(
      http.post(rotaDaGeracao, () => HttpResponse.json({ documentType: "ETP", sectionCode: "1", content: "Texto." })),
    )
    expect(await gerarRascunhoDaSecaoComFontes(PROCESSO, "ETP", "1", "")).toMatchObject({ content: "Texto." })
  })
})
