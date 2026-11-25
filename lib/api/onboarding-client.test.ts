import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RESPOSTAS_VAZIAS } from "@/lib/onboarding/respostas"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function cliente() {
  vi.resetModules()
  return import("@/lib/api/onboarding-client")
}

afterEach(() => vi.resetModules())

const IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/:uf/municipios"

describe("onboarding-client (§130)", () => {
  it("envia o lead sem sessão, no formato do back-end", async () => {
    let corpo: Record<string, unknown> = {}
    let autorizacao: string | null = "nao-lida"
    servidor.use(
      http.post(`${urlDaApi}/public/leads`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        autorizacao = request.headers.get("Authorization")
        return HttpResponse.json({ id: "11111111-2222-4333-8444-555555555555" }, { status: 202 })
      }),
    )
    const { enviarLead } = await cliente()
    await enviarLead({ ...RESPOSTAS_VAZIAS, orgao: "CAMARA", nome: "Ana", consentimento: true }, "instagram")
    expect(corpo).toMatchObject({ origin: "instagram", organizationType: "CAMARA", contactName: "Ana", consent: true })
    expect(autorizacao).toBeNull()
  })

  it("o 429 do back-end chega com a mensagem dele", async () => {
    servidor.use(
      http.post(`${urlDaApi}/public/leads`, () =>
        HttpResponse.json(
          { status: 429, title: "Muitos envios", detail: "Recebemos vários envios seguidos daqui.", code: "TOO_MANY_LEAD_SUBMISSIONS" },
          { status: 429, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    const { enviarLead } = await cliente()
    await expect(enviarLead(RESPOSTAS_VAZIAS, "direto")).rejects.toMatchObject({
      status: 429,
      message: "Recebemos vários envios seguidos daqui.",
    })
  })

  it("lista os municípios da UF com o código IBGE", async () => {
    let ufPedida = ""
    servidor.use(
      http.get(IBGE, ({ params }) => {
        ufPedida = String(params.uf)
        return HttpResponse.json([
          { id: 3201506, nome: "Colatina" },
          { id: 3205309, nome: "Vitória" },
        ])
      }),
    )
    const { municipiosDaUf } = await cliente()
    await expect(municipiosDaUf("ES")).resolves.toEqual([
      { nome: "Colatina", codigoIbge: "3201506" },
      { nome: "Vitória", codigoIbge: "3205309" },
    ])
    expect(ufPedida).toBe("ES")
  })

  it("IBGE fora do ar vira erro, e a tela segue com o nome digitado", async () => {
    servidor.use(http.get(IBGE, () => new HttpResponse(null, { status: 503 })))
    const { municipiosDaUf } = await cliente()
    await expect(municipiosDaUf("ES")).rejects.toThrow("O IBGE não respondeu.")
  })
})
