import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { processoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O caso da reunião: um processo montado como Pregão Eletrônico vira Dispensa
 * do Art. 75.
 *
 * O processo vive no servidor desde o Bloco 9, e a trilha desde o 12.1. O que
 * continua sendo do front-end — e é o que se testa aqui — é **calcular o porquê**:
 * o que a troca acrescentou e o que ficou sem estar previsto (ADR-047). O texto
 * acompanha a edição como `changeNote`, e é o servidor que o registra.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

/**
 * Responde a leitura com o processo dado e ecoa a edição de volta.
 *
 * @returns o que a tela enviou no PATCH, para conferir o `changeNote`
 */
function servidorComProcesso(processo: Record<string, unknown> = processoApi) {
  const enviado: { corpo: Record<string, unknown> } = { corpo: {} }
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processo)),
    http.patch(`${urlDaApi}/procurement-processes/:id`, async ({ request }) => {
      enviado.corpo = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ ...processo, ...enviado.corpo, version: 1 })
    }),
  )
  return enviado
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

  it("o que ficou sem estar previsto acompanha a edição, para o servidor registrar", async () => {
    const enviado = servidorComProcesso()
    const { atualizarProcesso } = await carregarClienteLimpo()

    await atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      formaDaDispensa: "DISPUTE",
      documentos: ["ETP", "TR", "Edital", "Aviso"],
    })

    const motivo = String(enviado.corpo.changeNote)
    expect(motivo).toContain("Pregão Eletrônico para Dispensa Art. 75 (com disputa)")
    expect(motivo).toContain("Incluídos para elaboração: Aviso")
    expect(motivo).toContain("Mantidos, embora a nova modalidade não os preveja: Edital")
  })

  it("o documento já gerado que fica sem estar previsto vem do servidor, não da memória da aba", async () => {
    const enviado = servidorComProcesso()
    servidor.use(
      http.get(`${urlDaApi}/generated-documents`, () =>
        HttpResponse.json([
          {
            processId: PROCESSO,
            processNumber: "PROC-2026-000007",
            processObject: "Aquisição de material de expediente",
            documentType: "EDITAL",
            documentVersion: 1,
            generatedAt: "2026-08-20T12:00:00Z",
            files: [],
          },
        ]),
      ),
    )
    const { atualizarProcesso } = await carregarClienteLimpo()

    await atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      formaDaDispensa: "DIRECT",
    })

    // Até 26/08/2026 esta lista vinha do acervo em memória do protótipo:
    // recarregada a página, ela era vazia para todo processo real.
    expect(String(enviado.corpo.changeNote)).toContain("(já gerados: Edital)")
  })

  it("salvar sem trocar a modalidade não inventa motivo", async () => {
    const enviado = servidorComProcesso()
    const { atualizarProcesso } = await carregarClienteLimpo()

    await atualizarProcesso({ id: PROCESSO, objeto: "Descrição revisada" })

    // Motivo em toda edição transformaria a trilha em log de cliques, e o que
    // importa deixaria de ser encontrável no meio.
    expect(enviado.corpo.changeNote).toBeNull()
  })
})
