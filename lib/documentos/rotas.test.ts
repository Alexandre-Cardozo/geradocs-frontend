import { describe, expect, it } from "vitest"

import {
  agruparPorProcesso,
  rotaDoDocumentoGerado,
  rotaDosDocumentosDoProcesso,
  tiposNoAcervo,
} from "@/lib/documentos/rotas"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

function gerado(processoId: string, tipo: TipoDocumento, geradoEm: string, numero?: string): DocumentoGerado {
  return {
    id: `${processoId}:${tipo}`,
    entidadeId: "",
    processoId,
    ...(numero ? { processoNumero: numero, processoObjeto: `Objeto ${numero}` } : {}),
    titulo: tipo,
    tipo,
    geradoEm,
    status: "final",
    versao: 1,
    arquivos: [],
  }
}

/** O processo e a tela de Documentos se encontram por endereço (ADR-049 do back-end). */
describe("rotas entre o processo e os documentos", () => {
  it("a página do documento gerado, anunciando quando acabou de gerar", () => {
    expect(rotaDoDocumentoGerado("p-1", "TR")).toBe("/documentos/documento?processo=p-1&tipo=tr")
    expect(rotaDoDocumentoGerado("p-1", "Cotação", true)).toBe("/documentos/documento?processo=p-1&tipo=cotacao&gerado=1")
  })

  it("os documentos do processo em Documentos, com a juntada já aberta se pedida", () => {
    expect(rotaDosDocumentosDoProcesso("p-1")).toBe("/documentos?processo=p-1")
    expect(rotaDosDocumentosDoProcesso("p-1", true)).toBe("/documentos?processo=p-1&juntada=1")
  })

  it("agrupa por processo, o mais recente primeiro, e os documentos na ordem do fluxo", () => {
    const grupos = agruparPorProcesso([
      gerado("p-1", "TR", "2026-10-10T10:00:00Z", "PROC-1"),
      gerado("p-2", "ETP", "2026-10-12T10:00:00Z", "PROC-2"),
      gerado("p-1", "ETP", "2026-10-13T10:00:00Z", "PROC-1"),
      gerado("p-3", "Edital", "2026-10-01T10:00:00Z"),
    ])

    expect(grupos.map((grupo) => grupo.numero)).toEqual(["PROC-1", "PROC-2", "p-3"])
    expect(grupos[0]?.documentos.map((documento) => documento.tipo)).toEqual(["ETP", "TR"])
    expect(grupos[0]?.objeto).toBe("Objeto PROC-1")
    expect(grupos[0]?.ultimaGeracao).toBe("2026-10-13T10:00:00Z")
    expect(grupos[2]?.objeto).toBe("")
  })

  it("o filtro de tipo oferece só os tipos do acervo, na ordem do fluxo, com a quantidade", () => {
    const acervo = [
      gerado("p-1", "TR", "2026-10-10T10:00:00Z"),
      gerado("p-2", "ETP", "2026-10-12T10:00:00Z"),
      gerado("p-1", "ETP", "2026-10-13T10:00:00Z"),
    ]

    expect(tiposNoAcervo(acervo)).toEqual([
      { tipo: "ETP", quantidade: 2 },
      { tipo: "TR", quantidade: 1 },
    ])
    expect(tiposNoAcervo([])).toEqual([])
  })
})
