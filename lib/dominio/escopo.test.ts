import { describe, expect, it } from "vitest"

import { noEscopo, prefeiturasVisiveis, resumirDocumentos } from "@/lib/dominio"
import type { DocumentoGerado, Usuario } from "@/lib/types"

function usuario(prefeituraId: string | null): Usuario {
  return {
    id: "USR-001",
    nome: "Maria Costa",
    primeiroNome: "Maria",
    iniciais: "MC",
    cpf: "52998224725",
    email: "maria@x.gov.br",
    cargo: "Servidora",
    perfilAcesso: prefeituraId ? "servidor" : "admin_geral",
    prefeituraId,
    avatarDataUrl: null,
    ultimoAcesso: "",
    ativo: true,
  }
}

function documento(prefeituraId: string, tamanho: string): DocumentoGerado {
  return {
    id: `DOC-${prefeituraId}-${tamanho}`,
    prefeituraId,
    processoId: "PROC-2026-001",
    titulo: "ETP",
    tipo: "ETP",
    formato: "DOCX",
    geradoEm: "2026-08-21T10:00:00",
    tamanho,
    status: "final",
    versao: 1,
  }
}

describe("prefeiturasVisiveis", () => {
  it("o servidor enxerga só a própria prefeitura", () => {
    expect(prefeiturasVisiveis(usuario("PREF-001"))).toEqual(["PREF-001"])
  })

  it("o administrador geral enxerga todas", () => {
    // Escopo nulo é "sem filtro": ele não pertence a prefeitura nenhuma.
    expect(prefeiturasVisiveis(usuario(null))).toBeNull()
  })

  it("sem sessão, não há escopo definido", () => {
    expect(prefeiturasVisiveis(null)).toBeNull()
  })
})

describe("noEscopo", () => {
  it("filtra pelo escopo informado", () => {
    const documentos = [documento("PREF-001", "100 KB"), documento("PREF-002", "200 KB")]

    expect(noEscopo(documentos, ["PREF-001"])).toHaveLength(1)
  })

  it("escopo nulo devolve tudo", () => {
    const documentos = [documento("PREF-001", "100 KB"), documento("PREF-002", "200 KB")]

    expect(noEscopo(documentos, null)).toHaveLength(2)
  })

  it("escopo vazio não devolve nada", () => {
    // Lista vazia e ausência de filtro são coisas diferentes: a primeira é "não
    // pode ver nada", a segunda é "pode ver tudo".
    expect(noEscopo([documento("PREF-001", "100 KB")], [])).toHaveLength(0)
  })
})

describe("resumirDocumentos", () => {
  it("soma o armazenamento em megabytes com uma casa", () => {
    const resumo = resumirDocumentos([documento("PREF-001", "512 KB"), documento("PREF-001", "512 KB")])

    expect(resumo.total).toBe(2)
    expect(resumo.armazenamentoMB).toBe(1)
  })

  it("ignora tamanho não numérico em vez de estourar", () => {
    // Um documento sem tamanho registrado não pode derrubar o indicador inteiro.
    const resumo = resumirDocumentos([documento("PREF-001", "312 KB"), documento("PREF-001", "—")])

    expect(resumo.total).toBe(2)
    expect(resumo.armazenamentoMB).toBe(0.3)
  })

  it("repositório vazio é zero", () => {
    expect(resumirDocumentos([])).toEqual({ total: 0, esteMes: 0, armazenamentoMB: 0 })
  })
})
