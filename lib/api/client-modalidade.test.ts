import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { processoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O caso da reunião: um processo montado como Pregão Eletrônico vira Dispensa
 * do Art. 75.
 *
 * O processo em si vive no servidor desde o Bloco 9. O que ainda é do front-end
 * — e é o que se testa aqui — é o **registro na trilha**: qual documento deixou
 * de ser cabível, qual passou a ser obrigatório, e a justificativa de quem
 * decidiu manter a lista assim mesmo.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

/** Responde a leitura com o processo dado e ecoa a edição de volta. */
function servidorComProcesso(processo: Record<string, unknown> = processoApi) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processo)),
    http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
      const corpo = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ ...processo, ...corpo, version: 1 })
    }),
  )
}

const PROCESSO = processoApi.id

describe("troca de modalidade", () => {
  it("envia a modalidade e a lista nova para o servidor", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processoApi)),
      http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...processoApi, version: 1 })
      }),
    )
    const { atualizarProcesso } = await carregarClienteLimpo()

    await atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      documentos: ["ETP", "TR"],
    })

    expect(corpo.modality).toBe("DIRECT_AWARD_ARTICLE_75")
    expect(corpo.documents).toEqual(["ETP", "TR"])
  })

  it("envia If-Match com a versão que a tela leu", async () => {
    let ifMatch: string | null = null
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id`, () =>
        HttpResponse.json({ ...processoApi, version: 7 }),
      ),
      http.patch(`${urlDaApi}/procurement-processes/:id`, ({ request }) => {
        ifMatch = request.headers.get("If-Match")
        return HttpResponse.json({ ...processoApi, version: 8 })
      }),
    )
    const { atualizarProcesso } = await carregarClienteLimpo()

    await atualizarProcesso({ id: PROCESSO, objeto: "Descrição revisada" })

    // Sem isto, duas edições simultâneas se sobrescreveriam em silêncio.
    expect(ifMatch).toBe('"7"')
  })

  it("registra na trilha o que deixou de ser cabível", async () => {
    servidorComProcesso()
    const { atualizarProcesso, getTrilha } = await carregarClienteLimpo()

    await atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      documentos: ["ETP", "TR"],
    })

    const evento = (await getTrilha(PROCESSO))[0]
    expect(evento?.evento).toBe("troca_modalidade")
    expect(evento?.comentario).toContain("Pregão Eletrônico")
    expect(evento?.comentario).toContain("Dispensa Art. 75")
    expect(evento?.comentario).toContain("removidos por deixarem de ser cabíveis: Edital")
  })

  it("mantendo a lista, a justificativa vai literal para a trilha", async () => {
    servidorComProcesso()
    const { atualizarProcesso, getTrilha } = await carregarClienteLimpo()

    await atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      justificativaModalidade: "O edital já foi publicado e será anulado por ato próprio.",
    })

    // É a justificativa que responde ao controle por que o processo ficou com um
    // documento que a modalidade vigente não comporta.
    expect((await getTrilha(PROCESSO))[0]?.comentario).toContain(
      "O edital já foi publicado e será anulado por ato próprio.",
    )
  })

  it("a trilha registra quem trocou e quando", async () => {
    servidorComProcesso()
    const { atualizarProcesso, getTrilha } = await carregarClienteLimpo()

    await atualizarProcesso({ id: PROCESSO, modalidade: "Dispensa Art. 75" })

    const evento = (await getTrilha(PROCESSO))[0]
    expect(evento?.autor).not.toBe("")
    expect(evento?.data).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("salvar sem trocar a modalidade não polui a trilha", async () => {
    servidorComProcesso()
    const { atualizarProcesso, getTrilha } = await carregarClienteLimpo()

    await atualizarProcesso({ id: PROCESSO, objeto: "Descrição revisada" })

    // Evento sem mudança transformaria a trilha em log de cliques, e o que
    // importa deixaria de ser encontrável no meio.
    expect(await getTrilha(PROCESSO)).toEqual([])
  })
})
