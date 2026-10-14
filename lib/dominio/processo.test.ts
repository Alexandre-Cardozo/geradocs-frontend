import { describe, expect, it } from "vitest"

import {
  documentosPendentes,
  documentosPorFazerSemCobranca,
  statusDoDocumentoNoProcesso,
  motivoDoEncerramento,
  tiposGerados,
} from "@/lib/dominio"
import type { DocumentoGerado, Processo, TipoDocumento } from "@/lib/types"

function processo(documentos: TipoDocumento[]): Processo {
  return {
    id: "PROC-2026-001",
    numero: "PROC-2026-000001",
    entidadeId: "PREF-001",
    objeto: "Aquisição de material de expediente",
    modalidade: "Pregão Eletrônico",
    secretaria: "Secretaria de Administração",
    status: "em_elaboracao",
    valorEstimado: 100000,
    responsavel: "Maria Costa",
    criadoEm: "2026-08-20",
    atualizadoEm: "2026-08-21",
    etpStatus: "Não iniciado",
    trStatus: "Não iniciado",
    documentos,
    fases: { verificacaoDFD: false, retificacao: false },
  }
}

function documento(processoId: string, tipo: TipoDocumento): DocumentoGerado {
  return {
    id: `DOC-2026-000${tipo.length}`,
    entidadeId: "PREF-001",
    processoId,
    titulo: `${tipo} — Aquisição`,
    tipo,
    geradoEm: "2026-08-21T10:00:00",
    status: "final",
    versao: 1,
    arquivos: [],
  }
}

describe("tiposGerados", () => {
  it("considera apenas os documentos do processo consultado", () => {
    const documentos = [documento("PROC-2026-001", "ETP"), documento("PROC-2026-999", "TR")]

    expect(tiposGerados("PROC-2026-001", documentos)).toEqual(["ETP"])
  })
})

/**
 * O encerramento cobra os obrigatórios da modalidade atual (ADR-047 do
 * back-end): o opcional por fazer não pede justificativa, e o obrigatório que
 * nem estava na lista pede.
 */
describe("documentosPendentes", () => {
  it("devolve os obrigatórios que faltam, na ordem canônica do fluxo", () => {
    // A ordem importa na tela: o servidor lê a lista como roteiro.
    expect(documentosPendentes(processo(["Edital", "ETP", "TR"]), [])).toEqual(["ETP", "TR", "Edital"])
  })

  it("ignora o que já foi gerado", () => {
    expect(documentosPendentes(processo(["ETP", "TR", "Edital"]), ["ETP"])).toEqual(["TR", "Edital"])
  })

  it("com os obrigatórios gerados não há pendência, mesmo com opcional por fazer", () => {
    const comMapa = processo(["ETP", "Mapa", "TR", "Edital"])

    expect(documentosPendentes(comMapa, ["ETP", "TR", "Edital"])).toEqual([])
    expect(documentosPorFazerSemCobranca(comMapa, ["ETP", "TR", "Edital"])).toEqual(["Mapa"])
  })

  it("cobra o obrigatório que nem está na lista", () => {
    expect(documentosPendentes(processo(["ETP"]), ["ETP"])).toEqual(["TR", "Edital"])
  })

  it("é a modalidade de agora que conta: o Edital de quem virou dispensa não é cobrado", () => {
    const virouDispensa = { ...processo(["ETP", "TR", "Edital"]), modalidade: "Dispensa Art. 75" as const }

    expect(documentosPendentes(virouDispensa, ["TR"])).toEqual([])
    expect(documentosPorFazerSemCobranca(virouDispensa, ["TR"])).toEqual(["ETP", "Edital"])
    // A dispensa com disputa cobra o Aviso.
    expect(documentosPendentes({ ...virouDispensa, formaDaDispensa: "DISPUTE" }, ["TR"])).toEqual(["Aviso"])
  })
})

describe("encerramento", () => {
  it("registra na trilha o motivo de encerrar com pendência", () => {
    // Registrar o porquê é o que separa uma decisão do servidor de um descuido.
    expect(motivoDoEncerramento("  O TR será elaborado no processo apenso.  ")).toBe(
      "Encerrado com pendências. O TR será elaborado no processo apenso.",
    )
  })

  it("registra a conclusão normal quando não há pendência", () => {
    // Quem cobra a justificativa é o servidor, e ele só aceita encerrar sem ela
    // quando não falta documento — justificativa vazia significa isso.
    expect(motivoDoEncerramento("")).toBe("Todos os documentos foram gerados.")
    expect(motivoDoEncerramento("   ")).toBe("Todos os documentos foram gerados.")
  })
})

describe("statusDoDocumentoNoProcesso", () => {
  it("gerar o ETP marca o status do ETP no processo", () => {
    // ETP e TR têm coluna própria na listagem: o servidor precisa ver, sem abrir
    // o processo, se os dois documentos centrais já existem.
    expect(statusDoDocumentoNoProcesso("ETP")).toEqual({ etpStatus: "Completo" })
  })

  it("gerar o TR marca o status do TR", () => {
    expect(statusDoDocumentoNoProcesso("TR")).toEqual({ trStatus: "Completo" })
  })

  it("os demais tipos não mexem em status nenhum", () => {
    expect(statusDoDocumentoNoProcesso("Edital")).toEqual({})
    expect(statusDoDocumentoNoProcesso("Cotação")).toEqual({})
  })
})
