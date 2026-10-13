import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"
import type { DadosDaNorma } from "@/lib/api/regulation-client"

async function cliente() {
  vi.resetModules()
  return import("@/lib/api/regulation-client")
}

afterEach(() => vi.resetModules())

const ID = "0b4f1c2e-1111-4222-8333-444455556666"

const arquivoApi = {
  version: 1,
  fileName: "decreto.pdf",
  mediaType: "application/pdf",
  byteSize: 1024,
  sha256: "a".repeat(64),
  textAvailable: true,
  textCharacters: 300,
  uploadedAt: "2026-10-13T12:00:00Z",
  current: true,
}

const normaApi = {
  id: ID,
  kind: "DECREE",
  kindLabel: "Decreto",
  number: "10.210",
  publishedOn: "2025-03-05",
  title: "Regulamenta a Lei 14.133/21",
  notes: "Só obras",
  status: "IN_FORCE",
  revokedAt: null,
  revocationNote: null,
  currentFile: arquivoApi,
  updatedAt: "2026-10-13T12:00:00Z",
  version: 2,
}

const dados: DadosDaNorma = {
  especie: "DECREE",
  numero: " 10.210 ",
  publicadaEm: "2025-03-05",
  ementa: "Regulamenta a Lei 14.133/21",
  observacao: "  ",
}

describe("cliente das normas do órgão", () => {
  it("traduz a norma para o vocabulário da interface", async () => {
    servidor.use(http.get(`${urlDaApi}/regulations`, () => HttpResponse.json([normaApi])))
    const { listarNormas } = await cliente()

    expect(await listarNormas()).toEqual([
      {
        id: ID,
        especie: "DECREE",
        rotuloDaEspecie: "Decreto",
        numero: "10.210",
        publicadaEm: "2025-03-05",
        ementa: "Regulamenta a Lei 14.133/21",
        observacao: "Só obras",
        vigente: true,
        revogadaEm: null,
        observacaoDaRevogacao: null,
        arquivo: {
          versao: 1,
          nomeDoArquivo: "decreto.pdf",
          tipo: "application/pdf",
          bytes: 1024,
          checksum: "a".repeat(64),
          textoDisponivel: true,
          caracteresDeTexto: 300,
          enviadoEm: "2026-10-13T12:00:00Z",
          vigente: true,
        },
        atualizadaEm: "2026-10-13T12:00:00Z",
        versao: 2,
      },
    ])
  })

  it("o que o servidor omite vira ausência, e a revogada não é vigente", async () => {
    const enxuta = {
      ...normaApi,
      status: "REVOKED",
      number: undefined,
      publishedOn: undefined,
      notes: undefined,
      revokedAt: "2026-10-10T12:00:00Z",
      revocationNote: "Revogada",
    }
    servidor.use(http.get(`${urlDaApi}/regulations`, () => HttpResponse.json([enxuta])))
    const { listarNormas } = await cliente()

    const [norma] = await listarNormas()
    expect(norma).toMatchObject({
      numero: null,
      publicadaEm: null,
      observacao: null,
      vigente: false,
      revogadaEm: "2026-10-10T12:00:00Z",
      observacaoDaRevogacao: "Revogada",
    })
    servidor.use(
      http.get(`${urlDaApi}/regulations`, () =>
        HttpResponse.json([{ ...enxuta, revokedAt: undefined, revocationNote: undefined }]),
      ),
    )
    expect((await (await cliente()).listarNormas())[0]).toMatchObject({ revogadaEm: null, observacaoDaRevogacao: null })
  })

  it("cadastra em multipart, com os dados num JSON e o arquivo ao lado", async () => {
    let recebido: FormData | undefined
    servidor.use(
      http.post(`${urlDaApi}/regulations`, async ({ request }) => {
        recebido = await request.formData()
        return HttpResponse.json(normaApi, { status: 201 })
      }),
    )
    const { cadastrarNorma } = await cliente()

    await cadastrarNorma({ dados, arquivo: new File(["%PDF"], "decreto.pdf", { type: "application/pdf" }) })

    const json = JSON.parse(await (recebido!.get("dados") as Blob).text())
    // Vazio vai como ausente; o número vai aparado.
    expect(json).toEqual({
      kind: "DECREE",
      number: "10.210",
      publishedOn: "2025-03-05",
      title: "Regulamenta a Lei 14.133/21",
      notes: null,
    })
    expect((recebido!.get("file") as File).name).toBe("decreto.pdf")
  })

  it("corrige devolvendo a versão lida, e manda vazio como ausente", async () => {
    let corpo: unknown
    servidor.use(
      http.put(`${urlDaApi}/regulations/:id`, async ({ request }) => {
        corpo = await request.json()
        return HttpResponse.json(normaApi)
      }),
    )
    const { corrigirNorma } = await cliente()

    await corrigirNorma({
      id: ID,
      versao: 2,
      dados: { ...dados, numero: "", publicadaEm: "", observacao: "Só obras" },
    })

    expect(corpo).toEqual({
      kind: "DECREE",
      number: null,
      publishedOn: null,
      title: "Regulamenta a Lei 14.133/21",
      notes: "Só obras",
      version: 2,
    })
  })

  it("troca o arquivo, lista as versões e baixa uma delas", async () => {
    let metodo = ""
    servidor.use(
      http.put(`${urlDaApi}/regulations/:id/file`, ({ request }) => {
        metodo = request.method
        return HttpResponse.json({ ...normaApi, currentFile: { ...arquivoApi, version: 2 } })
      }),
      http.get(`${urlDaApi}/regulations/:id/files`, () =>
        HttpResponse.json([{ ...arquivoApi, version: 2 }, { ...arquivoApi, current: false }]),
      ),
      http.get(`${urlDaApi}/regulations/:id/files/:versao`, ({ params }) =>
        new HttpResponse(`versao ${String(params.versao)}`, {
          headers: { "Content-Disposition": 'attachment; filename="decreto.pdf"' },
        }),
      ),
    )
    const { baixarNorma, trocarArquivoDaNorma, versoesDaNorma } = await cliente()

    const trocada = await trocarArquivoDaNorma({ id: ID, arquivo: new File(["x"], "novo.pdf") })
    expect(metodo).toBe("PUT")
    expect(trocada.arquivo.versao).toBe(2)
    expect((await versoesDaNorma(ID)).map((v) => v.vigente)).toEqual([true, false])
    const baixado = await baixarNorma(ID, 1)
    expect(await baixado.conteudo.text()).toBe("versao 1")
    expect(baixado.nomeSugerido).toBe("decreto.pdf")
  })

  it("revoga com observação, ou sem ela", async () => {
    const corpos: unknown[] = []
    servidor.use(
      http.post(`${urlDaApi}/regulations/:id/revocation`, async ({ request }) => {
        corpos.push(await request.json())
        return HttpResponse.json({ ...normaApi, status: "REVOKED", revokedAt: "2026-10-13T12:00:00Z" })
      }),
    )
    const { revogarNorma } = await cliente()

    await revogarNorma({ id: ID, observacao: " Revogada pelo Decreto 11.002 " })
    await revogarNorma({ id: ID, observacao: "   " })

    expect(corpos).toEqual([{ text: "Revogada pelo Decreto 11.002" }, { text: null }])
  })

  it("desfaz a revogação e exclui com justificativa", async () => {
    let justificativa: unknown
    let restabeleceu = false
    servidor.use(
      http.delete(`${urlDaApi}/regulations/:id/revocation`, () => {
        restabeleceu = true
        return HttpResponse.json(normaApi)
      }),
      http.post(`${urlDaApi}/regulations/:id/removal`, async ({ request }) => {
        justificativa = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { excluirNorma, restabelecerNorma } = await cliente()

    expect((await restabelecerNorma(ID)).vigente).toBe(true)
    expect(restabeleceu).toBe(true)
    await excluirNorma({ id: ID, justificativa: "Cadastrada no órgão errado" })
    expect(justificativa).toEqual({ text: "Cadastrada no órgão errado" })
  })
})
