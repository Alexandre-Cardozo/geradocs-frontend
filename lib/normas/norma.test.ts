import { describe, expect, it } from "vitest"

import {
  DADOS_VAZIOS,
  citacaoDaNorma,
  dadosDe,
  dataDaNorma,
  errosDaNorma,
} from "@/lib/normas/norma"
import type { Norma } from "@/lib/api/regulation-client"

const norma: Norma = {
  id: "n1",
  especie: "DECREE",
  rotuloDaEspecie: "Decreto",
  numero: "10.210",
  publicadaEm: "2025-03-05",
  ementa: "Regulamenta a Lei 14.133/21",
  observacao: null,
  vigente: true,
  revogadaEm: null,
  observacaoDaRevogacao: null,
  arquivo: {
    versao: 1,
    nomeDoArquivo: "decreto.pdf",
    tipo: "application/pdf",
    bytes: 1024,
    checksum: "a".repeat(64),
    textoDisponivel: true,
    caracteresDeTexto: 100,
    enviadoEm: "2026-10-13T12:00:00Z",
    vigente: true,
  },
  atualizadaEm: "2026-10-13T12:00:00Z",
  versao: 0,
}

const arquivo = (bytes: number) => ({ size: bytes }) as File

describe("citação da norma", () => {
  it("cita espécie, número e data", () => {
    expect(citacaoDaNorma(norma)).toBe("Decreto nº 10.210, de 05/03/2025")
  })

  it("dispensa o que a norma não tem", () => {
    expect(citacaoDaNorma({ ...norma, numero: null, publicadaEm: null })).toBe("Decreto")
  })

  it("lê a data sem fuso: 05/03 não vira 04/03 em Brasília", () => {
    expect(dataDaNorma("2025-03-05")).toBe("05/03/2025")
  })
})

describe("formulário da norma", () => {
  it("parte dos dados existentes na correção", () => {
    expect(dadosDe(norma)).toEqual({
      especie: "DECREE",
      numero: "10.210",
      publicadaEm: "2025-03-05",
      ementa: "Regulamenta a Lei 14.133/21",
      observacao: "",
    })
    expect(dadosDe({ ...norma, numero: null, publicadaEm: null, observacao: "obs" })).toMatchObject({
      numero: "",
      publicadaEm: "",
      observacao: "obs",
    })
  })

  it("aponta o que falta, campo a campo", () => {
    expect(errosDaNorma(DADOS_VAZIOS, null)).toEqual({
      ementa: "Informe a ementa ou o assunto da norma.",
      arquivo: "Anexe o arquivo da norma (PDF, DOCX ou TXT).",
    })
  })

  it("aponta o que passa dos limites do servidor", () => {
    expect(
      errosDaNorma(
        {
          especie: "LAW",
          numero: "1".repeat(61),
          publicadaEm: "1899-12-31",
          ementa: "e".repeat(501),
          observacao: "o".repeat(2001),
        },
        arquivo(10 * 1024 * 1024 + 1),
      ),
    ).toEqual({
      ementa: "A ementa tem no máximo 500 caracteres.",
      numero: "O número tem no máximo 60 caracteres.",
      observacao: "A observação tem no máximo 2.000 caracteres.",
      publicadaEm: "A data de publicação parece errada.",
      arquivo: "O arquivo precisa ter no máximo 10 MB.",
    })
  })

  it("com tudo certo, não há erro — e a correção não pede arquivo", () => {
    const dados = dadosDe(norma)
    expect(errosDaNorma(dados, arquivo(1024))).toEqual({})
    expect(errosDaNorma(dados)).toEqual({})
  })
})
