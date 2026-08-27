import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { geracaoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A impressão do arquivo, vista da tela.
 *
 * O que este cliente traduz é o que o Bloco 11 tornou real: identificador,
 * formato, tamanho e checksum deixaram de ser constantes por tipo de documento e
 * passaram a ser o que o servidor mediu.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/generation-client")
}

afterEach(() => vi.resetModules())

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

describe("gerarArquivos", () => {
  it("pede os dois formatos numa requisição só", async () => {
    let corpo: Record<string, unknown> | undefined
    let caminho = ""
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          caminho = new URL(request.url).pathname
          return HttpResponse.json(geracaoApi)
        },
      ),
    )
    const { gerarArquivos } = await carregarClienteLimpo()

    const geracao = await gerarArquivos(PROCESSO, "ETP")

    // Numa requisição só, os dois saem da mesma versão. Em duas, uma retificação
    // no meio produziria arquivos que dizem coisas diferentes e parecem irmãos.
    expect(corpo).toEqual({ formats: ["DOCX", "PDF"] })
    expect(caminho).toContain("/documents/ETP/generations")
    expect(geracao.arquivos).toHaveLength(2)
  })

  it("traduz o arquivo inteiro: formato, nome, bytes e checksum", async () => {
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/documents/:tipo/generations`, () =>
        HttpResponse.json(geracaoApi),
      ),
    )
    const { gerarArquivos } = await carregarClienteLimpo()

    const geracao = await gerarArquivos(PROCESSO, "ETP")

    expect(geracao.versaoDoDocumento).toBe(1)
    expect(geracao.concluida).toBe(true)
    expect(geracao.arquivos[0]).toEqual({
      id: "a1b2c3d4-1111-4222-8333-444455556666",
      formato: "DOCX",
      nomeDoArquivo: "PROC-2026-000007-ETP-v1.docx",
      bytes: 14_336,
      checksum: "1".repeat(64),
      versaoDoDocumento: 1,
      versaoDoTemplate: 1,
      geradoEm: "2026-08-23T10:00:01-03:00",
    })
  })

  it("o tipo da tela vira o do contrato", async () => {
    let caminho = ""
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations`,
        ({ request }) => {
          caminho = new URL(request.url).pathname
          return HttpResponse.json(geracaoApi)
        },
      ),
    )
    const { gerarArquivos } = await carregarClienteLimpo()

    await gerarArquivos(PROCESSO, "Cotação", ["PDF"])

    // "Cotação" com acento na tela, COTACAO no contrato: trocar isso pediria a
    // impressão de um tipo que o servidor não conhece.
    expect(caminho).toContain("/documents/COTACAO/generations")
  })
})

describe("geracoesDoDocumento", () => {
  it("traz o histórico de impressões", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/generations`, () =>
        HttpResponse.json([geracaoApi]),
      ),
    )
    const { geracoesDoDocumento } = await carregarClienteLimpo()

    const geracoes = await geracoesDoDocumento(PROCESSO, "ETP")

    expect(geracoes).toHaveLength(1)
    expect(geracoes[0]?.arquivos.map((a) => a.formato)).toEqual(["DOCX", "PDF"])
  })
})

describe("baixarArquivo", () => {
  it("busca os bytes autenticado e devolve o nome que o servidor sugeriu", async () => {
    let autorizacao: string | null = null
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        ({ request }) => {
          autorizacao = request.headers.get("Authorization")
          return new HttpResponse("%PDF-1.6", {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'attachment; filename="PROC-2026-000007-ETP-v1.pdf"',
            },
          })
        },
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    const baixado = await baixarArquivo(PROCESSO, "ETP", "a1b2c3d4")

    // Uma âncora comum não leva o cabeçalho: `href` direto na rota daria 401, e
    // a pessoa veria um download quebrado sem explicação.
    expect(autorizacao).toContain("Bearer")
    expect(baixado.nomeSugerido).toBe("PROC-2026-000007-ETP-v1.pdf")
    expect(await baixado.conteudo.text()).toBe("%PDF-1.6")
  })

  it("Content-Disposition sem nome de arquivo também deixa o nome a cargo da tela", async () => {
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        () => new HttpResponse("%PDF-1.6", { headers: { "Content-Disposition": "attachment" } }),
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    // Cabeçalho presente e sem `filename`: forçar um nome daqui produziria
    // "download.pdf" onde o servidor sabia dizer o número do processo.
    expect((await baixarArquivo(PROCESSO, "ETP", "a1b2c3d4")).nomeSugerido).toBeNull()
  })

  it("sem Content-Disposition, o nome fica a cargo de quem chamou", async () => {
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        () => new HttpResponse("%PDF-1.6"),
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    expect((await baixarArquivo(PROCESSO, "ETP", "a1b2c3d4")).nomeSugerido).toBeNull()
  })

  it("arquivo que não existe vira erro com a mensagem do servidor", async () => {
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        () => HttpResponse.json({ detail: "Arquivo gerado não encontrado." }, { status: 404 }),
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    await expect(baixarArquivo(PROCESSO, "ETP", "sumiu")).rejects.toThrow(/não encontrado/)
  })
})

describe("download com sessão expirada", () => {
  it("renova o token e tenta de novo, uma vez", async () => {
    let tentativas = 0
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        () => {
          tentativas += 1
          return tentativas === 1
            ? HttpResponse.json({ detail: "expirado" }, { status: 401 })
            : new HttpResponse("%PDF-1.6")
        },
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    const baixado = await baixarArquivo(PROCESSO, "ETP", "a1b2c3d4")

    // Uma vez, e não em laço: com o refresh também expirado, repetir daria um
    // ciclo infinito em vez de mandar a pessoa entrar de novo.
    expect(tentativas).toBe(2)
    expect(await baixado.conteudo.text()).toBe("%PDF-1.6")
  })

  it("com o servidor fora do ar, diz isso em vez de erro cru", async () => {
    servidor.use(
      http.get(
        `${urlDaApi}/procurement-processes/:id/documents/:tipo/generations/files/:arquivo`,
        () => HttpResponse.error(),
      ),
    )
    const { baixarArquivo } = await carregarClienteLimpo()

    await expect(baixarArquivo(PROCESSO, "ETP", "a1b2c3d4")).rejects.toThrow(
      /Não foi possível conectar/,
    )
  })
})

describe("acervo do órgão", () => {
  const documentoDoAcervo = {
    processId: "3f2b1a00-1111-4222-8333-444455556666",
    processNumber: "PROC-2026-000007",
    processObject: "Aquisição de material de expediente",
    documentType: "ETP",
    documentVersion: 2,
    generatedAt: "2026-08-25T14:00:00-03:00",
    files: [
      {
        id: "f1",
        format: "PDF" as const,
        fileName: "etp-v2.pdf",
        byteSize: 4096,
        sha256: "a".repeat(64),
        documentVersion: 2,
        templateVersion: 1,
        generatedAt: "2026-08-25T14:00:00-03:00",
      },
    ],
  }

  it("traz o documento com os arquivos da geração vigente", async () => {
    servidor.use(
      http.get(`${urlDaApi}/generated-documents`, () => HttpResponse.json([documentoDoAcervo])),
    )
    const { acervoDoNome } = await carregarClienteLimpo()

    const [documento] = await acervoDoNome()

    expect(documento?.tipo).toBe("ETP")
    expect(documento?.versao).toBe(2)
    expect(documento?.titulo).toContain("PROC-2026-000007")
    expect(documento?.arquivos[0]?.bytes).toBe(4096)
  })

  it("tipo que a interface não conhece não vira linha sem rótulo", async () => {
    servidor.use(
      http.get(`${urlDaApi}/generated-documents`, () =>
        HttpResponse.json([
          { ...documentoDoAcervo, documentType: "ALGO_QUE_AINDA_NAO_EXISTE" },
          documentoDoAcervo,
        ]),
      ),
    )
    const { acervoDoNome } = await carregarClienteLimpo()

    // O servidor pode ganhar um tipo de documento antes desta tela.
    expect(await acervoDoNome()).toHaveLength(1)
  })

  it("o resumo vem contado do servidor, e não deduzido da lista", async () => {
    let pediuALista = false
    servidor.use(
      http.get(`${urlDaApi}/generated-documents`, () => {
        pediuALista = true
        return HttpResponse.json([])
      }),
      http.get(`${urlDaApi}/generated-documents/summary`, () =>
        HttpResponse.json({
          total: 141,
          thisMonth: 14,
          lastSevenDays: 3,
          storageBytes: 53_477_376,
          finishedEtps: 27,
        }),
      ),
    )
    const { resumoDoAcervo } = await carregarClienteLimpo()

    const resumo = await resumoDoAcervo()

    // A lista é o que cabe mostrar; o acervo é o que existe.
    expect(pediuALista).toBe(false)
    expect(resumo.total).toBe(141)
    expect(resumo.bytesArmazenados).toBe(53_477_376)
    expect(resumo.etpsConcluidos).toBe(27)
  })
})
