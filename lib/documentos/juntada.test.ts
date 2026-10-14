import { describe, expect, it } from "vitest"

import { aindaNaoGerados, anexosRepetidos, itensDaJuntada, mover } from "@/lib/documentos/juntada"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

const PROCESSO = "p-1"

function gerado(tipo: TipoDocumento, versao: number, formatos: Array<"PDF" | "DOCX">, processoId = PROCESSO) {
  return {
    id: `${processoId}-${tipo}`,
    entidadeId: "e",
    processoId,
    titulo: tipo,
    tipo,
    geradoEm: "2026-10-14T12:00:00Z",
    status: "final",
    versao,
    arquivos: formatos.map((formato) => ({
      id: `${tipo}-${formato}`,
      formato,
      nomeDoArquivo: `${tipo}.${formato.toLowerCase()}`,
      bytes: 1,
      checksum: "a",
    })),
  } satisfies DocumentoGerado
}

describe("juntada", () => {
  it("oferece os gerados do processo, na ordem do fluxo, dizendo quais têm o formato", () => {
    const documentos = [
      gerado("Edital", 1, ["PDF", "DOCX"]),
      gerado("ETP", 2, ["PDF"]),
      gerado("TR", 1, ["DOCX"]),
      gerado("ETP", 1, ["PDF"], "outro-processo"),
    ]

    expect(itensDaJuntada(documentos, PROCESSO, "PDF")).toEqual([
      { tipo: "ETP", versao: 2, disponivel: true },
      { tipo: "TR", versao: 1, disponivel: false },
      { tipo: "Edital", versao: 1, disponivel: true },
    ])
    expect(itensDaJuntada(documentos, PROCESSO, "DOCX").map((item) => item.disponivel)).toEqual([false, true, true])
  })

  it("diz o que o processo pede e ainda não foi gerado", () => {
    const itens = itensDaJuntada([gerado("ETP", 1, ["PDF"])], PROCESSO, "PDF")

    expect(aindaNaoGerados(["Edital", "ETP", "TR"], itens)).toEqual(["TR", "Edital"])
  })

  it("sobe e desce na ordem, e na ponta fica onde está", () => {
    const ordem: TipoDocumento[] = ["ETP", "TR", "Edital"]

    expect(mover(ordem, "TR", -1)).toEqual(["TR", "ETP", "Edital"])
    expect(mover(ordem, "TR", 1)).toEqual(["ETP", "Edital", "TR"])
    expect(mover(ordem, "ETP", -1)).toBe(ordem)
    expect(mover(ordem, "Edital", 1)).toBe(ordem)
    expect(mover(ordem, "Mapa", 1)).toBe(ordem)
  })

  it("aponta o TR e a minuta juntados com o Edital, que já os traz como anexos", () => {
    expect(anexosRepetidos(["ETP", "TR", "Edital", "Contrato"])).toEqual(["TR", "Contrato"])
    expect(anexosRepetidos(["ETP", "TR", "Contrato"])).toEqual([])
    expect(anexosRepetidos(["Edital"])).toEqual([])
  })
})
