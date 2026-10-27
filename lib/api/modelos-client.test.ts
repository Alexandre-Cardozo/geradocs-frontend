import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function cliente() {
  vi.resetModules()
  return import("@/lib/api/modelos-client")
}

afterEach(() => vi.resetModules())

const minutaApi = {
  code: "AGU-EDITAL-PC",
  version: "2025-11",
  documentType: "EDITAL",
  title: "Minuta AGU — Pregão",
  description: "Menor preço.",
  publishedIn: "nov/2025",
  source: "AGU",
  sectionCount: 17,
}

const doOrgaoApi = {
  code: "ORG-0A1B2C3D",
  version: "002",
  documentType: "EDITAL",
  title: "Edital do Município",
  description: "Cota ampliada.",
  publishedIn: "out/2026",
  justification: "Lei Municipal 1.234/2024.",
  baseCode: "AGU-EDITAL-PC",
  baseVersion: "2025-11",
  active: true,
  createdByName: "Maria Costa",
  createdAt: "2026-10-27T12:00:00Z",
}

const minuta = {
  codigo: "AGU-EDITAL-PC",
  versao: "2025-11",
  tipo: "Edital",
  titulo: "Minuta AGU — Pregão",
  descricao: "Menor preço.",
  publicadoEm: "nov/2025",
  quantidadeDeSecoes: 17,
}

/** As minutas da AGU e os modelos do órgão (ADR-056 do back-end). */
describe("modelos do órgão", () => {
  it("lista as minutas da AGU e os modelos do órgão, com o aviso da minuta mais nova", async () => {
    servidor.use(
      http.get(`${urlDaApi}/structure-models`, () =>
        HttpResponse.json({
          agu: [minutaApi],
          organization: [
            doOrgaoApi,
            { ...doOrgaoApi, code: "ORG-11111111", active: false, newerBase: { ...minutaApi, version: "2026-04" } },
          ],
        }),
      ),
    )
    const { listarModelos } = await cliente()

    const { agu, doOrgao } = await listarModelos()

    expect(agu).toEqual([minuta])
    expect(doOrgao[0]).toEqual({
      codigo: "ORG-0A1B2C3D",
      versao: "002",
      tipo: "Edital",
      titulo: "Edital do Município",
      descricao: "Cota ampliada.",
      publicadoEm: "out/2026",
      justificativa: "Lei Municipal 1.234/2024.",
      codigoDaBase: "AGU-EDITAL-PC",
      versaoDaBase: "2025-11",
      ativo: true,
      publicadoPor: "Maria Costa",
    })
    expect(doOrgao[1]).toMatchObject({ ativo: false, baseMaisNova: { ...minuta, versao: "2026-04" } })
  })

  it("o detalhe do modelo do órgão volta com os códigos da minuta, e o da AGU como veio", async () => {
    const secao = {
      code: "OPC01",
      number: "1",
      title: "Do Objeto",
      legalBasis: "Art. 25",
      hint: "Enuncie.",
      required: true,
      modelText: "Objeto do município.",
      notes: ["Nota."],
    }
    servidor.use(
      http.get(`${urlDaApi}/structure-models/:codigo`, ({ params }) =>
        HttpResponse.json(
          params.codigo === "ORG-0A1B2C3D"
            ? { ...doOrgaoApi, source: "Órgão", sections: [secao, { ...secao, code: "OPC02", modelText: null }] }
            : { ...minutaApi, justification: null, sections: [{ ...secao, code: "PC01" }] },
        ),
      ),
    )
    const { detalheDoModelo } = await cliente()

    const doOrgao = await detalheDoModelo("ORG-0A1B2C3D")
    const daAgu = await detalheDoModelo("AGU-EDITAL-PC")

    expect(doOrgao).toMatchObject({ doOrgao: true, justificativa: "Lei Municipal 1.234/2024.", tipo: "Edital" })
    expect(doOrgao.secoes).toEqual([
      { codigo: "PC01", numero: "1", titulo: "Do Objeto", fundamentoLegal: "Art. 25", texto: "Objeto do município.", notas: ["Nota."] },
      { codigo: "PC02", numero: "1", titulo: "Do Objeto", fundamentoLegal: "Art. 25", texto: "", notas: ["Nota."] },
    ])
    expect(daAgu.doOrgao).toBe(false)
    expect(daAgu.justificativa).toBeUndefined()
    expect(daAgu.secoes[0]?.codigo).toBe("PC01")
  })

  it("publicar, publicar a versão seguinte e desativar falam com as rotas do modelo", async () => {
    const pedidos: { metodo: string; url: string; corpo?: unknown }[] = []
    const registrar = async ({ request }: { request: Request }) => {
      pedidos.push({
        metodo: request.method,
        url: new URL(request.url).pathname,
        ...(request.method === "DELETE" ? {} : { corpo: await request.json() }),
      })
      return request.method === "DELETE"
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json({ ...minutaApi, sections: [] })
    }
    servidor.use(
      http.post(`${urlDaApi}/structure-models`, registrar),
      http.put(`${urlDaApi}/structure-models/:codigo`, registrar),
      http.delete(`${urlDaApi}/structure-models/:codigo`, registrar),
    )
    const { desativarModelo, publicarModelo, publicarVersaoDoModelo } = await cliente()
    const dados = { titulo: "Edital", descricao: "", justificativa: "Lei.", textos: { PC01: "Objeto." } }

    await publicarModelo({ base: "AGU-EDITAL-PC", dados })
    await publicarVersaoDoModelo({ codigo: "ORG-0A1B2C3D", dados })
    await desativarModelo("ORG-0A1B2C3D")

    const corpo = { title: "Edital", description: "", justification: "Lei.", sections: [{ code: "PC01", text: "Objeto." }] }
    expect(pedidos).toEqual([
      { metodo: "POST", url: expect.stringMatching(/\/structure-models$/), corpo: { baseCode: "AGU-EDITAL-PC", ...corpo } },
      { metodo: "PUT", url: expect.stringMatching(/\/structure-models\/ORG-0A1B2C3D$/), corpo },
      { metodo: "DELETE", url: expect.stringMatching(/\/structure-models\/ORG-0A1B2C3D$/) },
    ])
  })

  it("o código da seção do órgão volta ao da minuta", async () => {
    const { codigoNaMinuta } = await cliente()
    expect(codigoNaMinuta("OPC01", true)).toBe("PC01")
    expect(codigoNaMinuta("PC01", true)).toBe("PC01")
    expect(codigoNaMinuta("OPC01", false)).toBe("OPC01")
  })
})
