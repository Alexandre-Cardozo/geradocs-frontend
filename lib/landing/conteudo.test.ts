import { describe, expect, it } from "vitest"

import { CATALOGO } from "@/lib/documentos"

import {
  ASSUNTO_DA_DEMONSTRACAO,
  CONTEUDO,
  DOCUMENTOS_DO_FLUXO,
  EMAIL_CONTATO,
  HREF_DEMONSTRACAO,
  HREF_ENTRAR,
} from "./conteudo"

describe("links da landing", () => {
  it("o pedido de demonstração é um mailto para a GovPro, com assunto", () => {
    expect(EMAIL_CONTATO).toBe("contato@govpro.com.br")
    expect(HREF_DEMONSTRACAO.startsWith("mailto:contato@govpro.com.br?subject=")).toBe(true)
    const assunto = new URL(HREF_DEMONSTRACAO).searchParams.get("subject")
    expect(assunto).toBe(ASSUNTO_DA_DEMONSTRACAO)
  })

  it("entrar leva ao login do aplicativo", () => {
    expect(HREF_ENTRAR).toBe("/login")
  })
})

describe("fluxo dos documentos", () => {
  it("são os seis documentos geráveis, na ordem do catálogo, sem o Aviso", () => {
    expect(DOCUMENTOS_DO_FLUXO.map((d) => d.titulo)).toEqual([
      "Cotação de Mercado",
      "Estudo Técnico Preliminar",
      "Mapa de Riscos",
      "Termo de Referência",
      "Edital de Licitação",
      "Minuta de Contrato",
    ])
    expect(DOCUMENTOS_DO_FLUXO).toHaveLength(6)
    // O filtro já estreitou o tipo e tirou "Aviso" dele; o `string` deixa o teste
    // perguntar ao valor em execução, e não ao compilador.
    expect(DOCUMENTOS_DO_FLUXO.some((d) => (d.tipo as string) === "Aviso")).toBe(false)
  })

  it("título, fundamento e chip vêm do catálogo, sem cópia", () => {
    for (const doc of DOCUMENTOS_DO_FLUXO) {
      expect(doc.titulo).toBe(CATALOGO[doc.tipo].titulo)
      expect(doc.fundamento).toBe(CATALOGO[doc.tipo].fundamento)
      expect(doc.chip).toBe(CATALOGO[doc.tipo].chip)
    }
  })
})

describe("copy", () => {
  const texto = JSON.stringify(CONTEUDO)

  it("não tem emoji", () => {
    // Mesma regra do guarda-corpo nº 3: `©` é sinal tipográfico (copyright do
    // rodapé), embora o Unicode o inclua em Extended_Pictographic.
    const semSinaisTipograficos = texto.replace(/[✓✕©]/gu, "")
    expect(semSinaisTipograficos).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it("usa o slogan e o subtítulo oficiais da marca", () => {
    expect(CONTEUDO.hero.eyebrow).toBe("Contratações públicas inteligentes")
    expect(CONTEUDO.hero.titulo).toBe("Documentos da Contratação Pública, Conforme a Lei 14.133/21")
  })

  it("cita o fundamento legal literalmente", () => {
    expect(texto).toContain("Art. 75, II, Lei 14.133/21")
  })

  it("as âncoras da navegação têm uma seção com o mesmo id", () => {
    const ids = [
      CONTEUDO.problema.id,
      CONTEUDO.fluxo.id,
      CONTEUDO.ia.id,
      CONTEUDO.confianca.id,
    ]
    expect(CONTEUDO.navegacao.map((n) => n.id)).toEqual(ids)
  })

  it("nenhum id de âncora parece cor hexadecimal", () => {
    const ids = [
      ...CONTEUDO.navegacao.map((n) => n.id),
      CONTEUDO.quemSomos.id,
      CONTEUDO.demonstracao.id,
      "conteudo",
    ]
    for (const id of ids) expect(`#${id}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

describe("lacunas de conteúdo", () => {
  it("só existem em Quem Somos, marcadas e visíveis", () => {
    const { quemSomos, ...resto } = CONTEUDO
    expect(JSON.stringify(resto)).not.toContain("[LACUNA")
    expect(quemSomos.lacuna.startsWith("[LACUNA:")).toBe(true)
  })
})
