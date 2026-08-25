import { describe, expect, it } from "vitest"

import {
  documentosPendentes,
  statusDoDocumentoNoProcesso,
  motivoDoEncerramento,
  tiposGerados,
} from "@/lib/dominio"
import type { DocumentoGerado, Processo, TipoDocumento } from "@/lib/types"

function processo(documentos: TipoDocumento[]): Processo {
  return {
    id: "PROC-2026-001",
    prefeituraId: "PREF-001",
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
    prefeituraId: "PREF-001",
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

describe("documentosPendentes", () => {
  it("devolve o que falta na ordem canônica do fluxo", () => {
    // A ordem importa na tela: o servidor lê a lista como roteiro do que ainda
    // precisa elaborar.
    const pendentes = documentosPendentes(processo(["Edital", "ETP", "TR"]), [])

    expect(pendentes).toEqual(["ETP", "TR", "Edital"])
  })

  it("ignora o que já foi gerado", () => {
    expect(documentosPendentes(processo(["ETP", "TR"]), ["ETP"])).toEqual(["TR"])
  })

  it("processo com tudo gerado não tem pendência", () => {
    expect(documentosPendentes(processo(["ETP"]), ["ETP"])).toEqual([])
  })

  it("não conta documento gerado que não pertence ao processo", () => {
    // O Edital pode existir no repositório de outro processo; aqui ele não conta.
    expect(documentosPendentes(processo(["ETP"]), ["ETP", "Edital"])).toEqual([])
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
