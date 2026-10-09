import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { AnexosDoArquivo } from "@/components/documentos/anexos-do-arquivo"
import { processoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O Edital sai com o TR e a minuta no próprio arquivo, e o anexo ainda não
 * gerado fica de fora sem travar a geração. Sem este aviso, a pessoa só
 * descobriria a falta abrindo o arquivo já publicado.
 */
function comProcesso(documents: string[], gerados: Array<{ documentType: string; documentVersion: number }>) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id`, () =>
      HttpResponse.json({ ...processoApi, documents }),
    ),
    http.get(`${urlDaApi}/generated-documents`, () =>
      HttpResponse.json(
        gerados.map((g) => ({
          processId: processoApi.id,
          processNumber: processoApi.processNumber,
          processObject: processoApi.objectDescription,
          documentType: g.documentType,
          documentVersion: g.documentVersion,
          generatedAt: "2026-10-01T10:00:00-03:00",
          files: [],
        })),
      ),
    ),
  )
}

describe("anexos do arquivo do Edital", () => {
  it("diz quais anexos entram, numerados, e qual fica de fora", async () => {
    comProcesso(["TR", "EDITAL", "CONTRATO"], [{ documentType: "TR", documentVersion: 2 }])
    renderizar(<AnexosDoArquivo processoId={processoApi.id} tipo="Edital" />)

    expect(await screen.findByText(/Anexo I — Termo de Referência \(v2\)/)).toBeInTheDocument()
    expect(screen.getByText("Minuta de Contrato")).toBeInTheDocument()
    expect(screen.getByText(/Fica de fora do arquivo do Edital/)).toBeInTheDocument()
  })

  it("com os dois gerados, não há aviso de falta", async () => {
    comProcesso(
      ["TR", "EDITAL", "CONTRATO"],
      [
        { documentType: "TR", documentVersion: 1 },
        { documentType: "CONTRATO", documentVersion: 1 },
      ],
    )
    renderizar(<AnexosDoArquivo processoId={processoApi.id} tipo="Edital" />)

    expect(
      await screen.findByText(/Anexo I — Termo de Referência \(v1\) · Anexo II — Minuta de Contrato \(v1\)/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Ainda sem versão gerada/)).not.toBeInTheDocument()
  })

  it("com os dois faltando, avisa no plural e não promete anexo nenhum", async () => {
    comProcesso(["TR", "EDITAL", "CONTRATO"], [])
    renderizar(<AnexosDoArquivo processoId={processoApi.id} tipo="Edital" />)

    expect(await screen.findByText("Termo de Referência e Minuta de Contrato")).toBeInTheDocument()
    expect(screen.getByText(/Ficam de fora/)).toBeInTheDocument()
    expect(screen.queryByText(/sai com os anexos/)).not.toBeInTheDocument()
  })
})
