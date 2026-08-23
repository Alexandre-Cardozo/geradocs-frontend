import { describe, expect, it } from "vitest"

import { calcularIndicadores } from "@/lib/dominio"
import type { DocumentoGerado, Processo, StatusProcesso, TipoDocumento } from "@/lib/types"

function processo(id: string, status: StatusProcesso, documentos: TipoDocumento[]): Processo {
  return {
    id,
    prefeituraId: "PREF-001",
    objeto: "Objeto",
    modalidade: "Pregão Eletrônico",
    secretaria: "Secretaria",
    status,
    valorEstimado: 0,
    responsavel: "Maria Costa",
    criadoEm: "2026-08-20",
    atualizadoEm: "2026-08-21",
    etpStatus: "Não iniciado",
    trStatus: "Não iniciado",
    documentos,
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [],
  }
}

function documento(processoId: string, tipo: TipoDocumento): DocumentoGerado {
  return {
    id: `DOC-${processoId}-${tipo}`,
    prefeituraId: "PREF-001",
    processoId,
    titulo: `${tipo}`,
    tipo,
    geradoEm: "2026-08-21T10:00:00",
    status: "final",
    versao: 1,
    arquivos: [],
  }
}

describe("calcularIndicadores", () => {
  it("conta como ativo tudo que não foi encerrado", () => {
    const indicadores = calcularIndicadores(
      [processo("A", "rascunho", []), processo("B", "em_elaboracao", []), processo("C", "concluido", [])],
      [],
    )

    expect(indicadores.processosAtivos).toBe(2)
    expect(indicadores.processosEmElaboracao).toBe(1)
  })

  it("conta como pendente o documento escolhido e não gerado", () => {
    const indicadores = calcularIndicadores(
      [processo("A", "em_elaboracao", ["ETP", "TR"]), processo("B", "rascunho", ["ETP"])],
      [documento("A", "ETP")],
    )

    // A pendência é por processo: o ETP de A está pronto, o de B não.
    expect(indicadores.documentosPendentes).toBe(2)
  })

  it("não deixa documento de um processo cobrir a pendência de outro", () => {
    const indicadores = calcularIndicadores([processo("A", "em_elaboracao", ["ETP"])], [documento("B", "ETP")])

    expect(indicadores.documentosPendentes).toBe(1)
  })

  it("conta os ETPs concluídos entre os documentos gerados", () => {
    const indicadores = calcularIndicadores(
      [processo("A", "em_elaboracao", ["ETP", "TR"])],
      [documento("A", "ETP"), documento("A", "TR")],
    )

    expect(indicadores.documentosGerados).toBe(2)
    expect(indicadores.etpsConcluidos).toBe(1)
  })

  it("base vazia devolve tudo em zero", () => {
    expect(calcularIndicadores([], [])).toEqual({
      processosAtivos: 0,
      processosEmElaboracao: 0,
      documentosPendentes: 0,
      documentosGerados: 0,
      etpsConcluidos: 0,
    })
  })
})
