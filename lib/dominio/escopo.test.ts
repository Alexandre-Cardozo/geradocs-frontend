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
    ultimoAcesso: "",
    ativo: true,
  }
}

/** @param bytes o que o servidor mediu; zero significa documento sem arquivo. */
function documento(prefeituraId: string, bytes = 0): DocumentoGerado {
  return {
    id: `DOC-${prefeituraId}-${bytes}`,
    prefeituraId,
    processoId: "PROC-2026-001",
    titulo: "ETP",
    tipo: "ETP",
    geradoEm: "2026-08-21T10:00:00",
    arquivos: bytes === 0 ? [] : [{
      id: `ARQ-${bytes}`,
      formato: "PDF",
      nomeDoArquivo: "etp.pdf",
      bytes,
      checksum: "0".repeat(64),
    }],
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
    const documentos = [documento("PREF-001"), documento("PREF-002")]

    expect(noEscopo(documentos, ["PREF-001"])).toHaveLength(1)
  })

  it("escopo nulo devolve tudo", () => {
    const documentos = [documento("PREF-001"), documento("PREF-002")]

    expect(noEscopo(documentos, null)).toHaveLength(2)
  })

  it("escopo vazio não devolve nada", () => {
    // Lista vazia e ausência de filtro são coisas diferentes: a primeira é "não
    // pode ver nada", a segunda é "pode ver tudo".
    expect(noEscopo([documento("PREF-001")], [])).toHaveLength(0)
  })
})

describe("resumirDocumentos", () => {
  it("soma os bytes que o servidor mediu, em megabytes com uma casa", () => {
    const meioMega = 524_288
    const resumo = resumirDocumentos([
      documento("PREF-001", meioMega),
      documento("PREF-001", meioMega),
    ])

    expect(resumo.total).toBe(2)
    expect(resumo.armazenamentoMB).toBe(1)
  })

  it("documento sem arquivo conta no total e não no armazenamento", () => {
    // Documento de fixture, anterior à geração real: existe no acervo e não
    // ocupa espaço nenhum. Antes o indicador interpretava de volta um texto que
    // a própria interface tinha fabricado.
    const resumo = resumirDocumentos([documento("PREF-001", 314_572), documento("PREF-001")])

    expect(resumo.total).toBe(2)
    expect(resumo.armazenamentoMB).toBe(0.3)
  })

  it("repositório vazio é zero", () => {
    expect(resumirDocumentos([])).toEqual({ total: 0, esteMes: 0, armazenamentoMB: 0 })
  })
})
