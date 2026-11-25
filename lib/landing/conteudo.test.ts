import { describe, expect, it } from "vitest"

import {
  CONTEUDO,
  EMAIL_CONTATO,
  HREF_CONTATO,
  HREF_ENTRAR,
  PRODUTOS,
  ROTA_ONBOARDING,
  WHATSAPP_GOVPRO,
  hrefOnboarding,
} from "./conteudo"

describe("links da página", () => {
  it("o pedido de demonstração abre o onboarding da GovPri, com a origem (§130)", () => {
    expect(ROTA_ONBOARDING).toBe("/onboarding")
    expect(hrefOnboarding("cabecalho")).toBe("/onboarding?origem=cabecalho")
    expect(hrefOnboarding("a b")).toBe("/onboarding?origem=a%20b")
  })

  it("o contato por e-mail continua à mão; o WhatsApp espera o número da GovPro", () => {
    expect(EMAIL_CONTATO).toBe("contato@govpro.com.br")
    expect(HREF_CONTATO).toBe("mailto:contato@govpro.com.br")
    expect(WHATSAPP_GOVPRO).toMatch(/^(\d{12,13})?$/)
  })

  it("entrar leva ao login do aplicativo", () => {
    expect(HREF_ENTRAR).toBe("/login")
  })
})

describe("portfólio", () => {
  it("o GeraDocs é a primeira solução e aponta para a própria seção", () => {
    expect(PRODUTOS[0].id).toBe("geradocs")
    expect(PRODUTOS[0].ancora).toBe(`#${CONTEUDO.geradocs.id}`)
    expect(PRODUTOS[0].slogan).toBe("Contratações públicas inteligentes")
  })

  it("toda solução tem nome, resumo, destaques e acesso", () => {
    for (const p of PRODUTOS) {
      expect(p.nome.length).toBeGreaterThan(0)
      expect(p.resumo.length).toBeGreaterThan(40)
      expect(p.destaques.length).toBeGreaterThan(0)
      expect(p.acesso.startsWith("/")).toBe(true)
    }
  })
})

/** O travessão, escrito pelo código para não aparecer no texto do teste. */
const TRAVESSAO = String.fromCharCode(0x2014)

describe("copy", () => {
  const texto = JSON.stringify(CONTEUDO)

  it("não tem emoji", () => {
    // `©` é sinal tipográfico (copyright do rodapé), embora o Unicode o inclua em Extended_Pictographic.
    expect(texto.replace(/[©]/gu, "")).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it("não usa travessão", () => {
    expect(texto).not.toContain(TRAVESSAO)
    expect(JSON.stringify(PRODUTOS)).not.toContain(TRAVESSAO)
  })

  it("não anuncia número de clientes nem depoimento", () => {
    expect(texto).not.toMatch(/clientes atendidos|órgãos atendidos|depoimento/i)
  })

  it("a produtividade aparece como estimativa", () => {
    expect(CONTEUDO.produtividade.notaEstimativa.startsWith("Estimativas da GovPro")).toBe(true)
  })

  it("cita o fundamento legal literalmente", () => {
    expect(texto).toContain("Art. 18, § 1º")
    expect(texto).toContain("Art. 75, § 1º")
    expect(texto).toContain("Lei 14.133/21")
  })

  it("a demonstração tem cinco etapas e o exemplo se declara ilustrativo", () => {
    expect(CONTEUDO.poucosCliques.etapas).toHaveLength(5)
    expect(CONTEUDO.poucosCliques.exemplo.nota).toContain("ilustrativos")
  })

  it("os dez valores e os sete compromissos da apresentação institucional", () => {
    expect(CONTEUDO.valores.itens).toHaveLength(10)
    expect(CONTEUDO.compromissos.itens).toHaveLength(7)
  })

  it("as âncoras da navegação são ids de seção, e nenhum parece cor hexadecimal", () => {
    const secoes = Object.values(CONTEUDO)
      .map((s) => (typeof s === "object" && "id" in s ? s.id : null))
      .filter(Boolean)
    for (const item of CONTEUDO.navegacao) expect(secoes).toContain(item.id)
    for (const id of [...secoes, "conteudo"]) expect(`#${id}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
