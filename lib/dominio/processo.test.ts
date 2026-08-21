import { describe, expect, it } from "vitest"

import {
  documentosPendentes,
  exigeJustificativaParaEncerrar,
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
    trilha: [],
  }
}

function documento(processoId: string, tipo: TipoDocumento): DocumentoGerado {
  return {
    id: `DOC-2026-000${tipo.length}`,
    prefeituraId: "PREF-001",
    processoId,
    titulo: `${tipo} — Aquisição`,
    tipo,
    formato: "DOCX + PDF",
    geradoEm: "2026-08-21T10:00:00",
    tamanho: "312 KB",
    status: "final",
    versao: 1,
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
  it("exige justificativa quando falta documento", () => {
    expect(exigeJustificativaParaEncerrar(["TR"])).toBe(true)
  })

  it("não exige nada quando está tudo pronto", () => {
    expect(exigeJustificativaParaEncerrar([])).toBe(false)
  })

  it("registra na trilha o motivo de encerrar com pendência", () => {
    // Registrar o porquê é o que separa uma decisão do servidor de um descuido.
    expect(motivoDoEncerramento(["TR"], "  O TR será elaborado no processo apenso.  ")).toBe(
      "Encerrado com pendências. O TR será elaborado no processo apenso.",
    )
  })

  it("registra a conclusão normal quando não há pendência", () => {
    expect(motivoDoEncerramento([], "")).toBe("Todos os documentos foram gerados.")
  })
})
