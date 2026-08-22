import { describe, expect, it } from "vitest"

import {
  concluidas,
  dispensadasSemJustificativa,
  foiDispensada,
  obrigatoriasPendentes,
  paragrafoDeDispensa,
  podeGerar,
  progresso,
  statusAposDispensar,
  statusAposEditar,
} from "@/lib/dominio"
import type { SecaoDocumento } from "@/lib/types"

function secao(id: string, obrigatoria: boolean, status: SecaoDocumento["status"]): SecaoDocumento {
  return {
    id,
    titulo: `Seção ${id}`,
    status,
    obrigatoria,
    conteudo: status === "Completo" ? "texto" : "",
    hint: "orientação",
    fundamentoLegal: "Art. 18, § 1º, Lei 14.133/21",
  }
}

describe("statusAposEditar", () => {
  it("marca como completa a seção que ganhou texto", () => {
    expect(statusAposEditar("Descrição da necessidade...")).toBe("Completo")
  })

  it("volta para não iniciada a seção esvaziada", () => {
    // Sem isso, o trilho e o percentual contariam como pronta uma seção em
    // branco, e o documento seria dado por completo sem estar.
    expect(statusAposEditar("")).toBe("Não iniciado")
    expect(statusAposEditar("   \n  ")).toBe("Não iniciado")
  })

  it("respeita o status informado explicitamente", () => {
    expect(statusAposEditar("", "Em revisão")).toBe("Em revisão")
  })
})

describe("progresso", () => {
  it("conta só as seções concluídas", () => {
    const secoes = [secao("1", true, "Completo"), secao("2", false, "Não iniciado")]

    expect(concluidas(secoes)).toHaveLength(1)
    expect(progresso(secoes)).toBe(50)
  })

  it("arredonda para inteiro", () => {
    const secoes = [secao("1", true, "Completo"), secao("2", true, "Não iniciado"), secao("3", true, "Não iniciado")]

    expect(progresso(secoes)).toBe(33)
  })

  it("documento sem seção é zero, não cem", () => {
    // Cem por cento de nada é a mesma tela de um documento pronto — e não é.
    expect(progresso([])).toBe(0)
  })
})

describe("obrigatoriasPendentes e podeGerar", () => {
  it("seção dispensável em branco não trava a geração", () => {
    // Art. 18, § 2º: no ETP só cinco incisos são indispensáveis; os demais podem
    // ser dispensados mediante justificativa.
    const secoes = [secao("1", true, "Completo"), secao("2", false, "Não iniciado")]

    expect(obrigatoriasPendentes(secoes)).toEqual([])
    expect(podeGerar(secoes)).toBe(true)
  })

  it("seção indispensável em branco trava", () => {
    const secoes = [secao("1", true, "Não iniciado"), secao("2", false, "Completo")]

    expect(obrigatoriasPendentes(secoes).map((s) => s.id)).toEqual(["1"])
    expect(podeGerar(secoes)).toBe(false)
  })

  it("documento sem seção nenhuma não pode ser gerado", () => {
    expect(podeGerar([])).toBe(false)
  })

  it("seção em revisão ainda não conta como concluída", () => {
    expect(podeGerar([secao("1", true, "Em revisão")])).toBe(false)
  })
})

/**
 * O Art. 18, § 2º admite dispensar incisos do ETP **mediante justificativa**.
 * Sem registrar a justificativa, a seção em branco simplesmente some do
 * documento gerado — e quem audita não distingue o inciso que não se aplica
 * daquele que ninguém preencheu.
 */
describe("dispensa de seção", () => {
  const dispensavel = (justificativa?: string): SecaoDocumento => ({
    id: "7",
    titulo: "Resultados Pretendidos",
    status: "Não iniciado",
    obrigatoria: false,
    conteudo: "",
    hint: "Descreva os resultados esperados.",
    fundamentoLegal: "Art. 18, § 1º, VII, Lei 14.133/21",
    ...(justificativa === undefined ? {} : { justificativaDispensa: justificativa }),
  })

  it("dispensa exige as três condições juntas", () => {
    expect(foiDispensada(dispensavel("Contratação de item único, sem métrica aplicável."))).toBe(true)

    // Obrigatória não se dispensa: são os incisos indispensáveis do § 2º.
    expect(foiDispensada({ ...dispensavel("Justificativa."), obrigatoria: true })).toBe(false)
    // Seção preenchida não foi dispensada — foi respondida.
    expect(foiDispensada({ ...dispensavel("Justificativa."), conteudo: "texto" })).toBe(false)
    // Em branco sem justificativa é lacuna, não dispensa.
    expect(foiDispensada(dispensavel())).toBe(false)
    expect(foiDispensada(dispensavel("   "))).toBe(false)
  })

  it("aponta as lacunas silenciosas antes de gerar", () => {
    const lista = [
      { ...dispensavel(), id: "3" },
      dispensavel("Não se aplica a esta contratação."),
      { ...dispensavel(), id: "9", obrigatoria: true },
      { ...dispensavel(), id: "11", conteudo: "preenchida" },
    ]

    // Só a que está em branco, é dispensável e não tem justificativa.
    expect(dispensadasSemJustificativa(lista).map((s) => s.id)).toEqual(["3"])
  })

  it("o parágrafo cita o fundamento e a justificativa literalmente", () => {
    const secao = dispensavel("  Contratação de item único, sem métrica aplicável.  ")
    // A guarda estreita o tipo: o parágrafo só é alcançável por ela, e é isso
    // que dispensa um fallback para justificativa ausente.
    if (!foiDispensada(secao)) throw new Error("A seção deveria estar dispensada.")
    const paragrafo = paragrafoDeDispensa(secao)

    expect(paragrafo).toContain("Resultados Pretendidos")
    expect(paragrafo).toContain("Art. 18, § 2º, da Lei 14.133/21")
    expect(paragrafo).toContain("Art. 18, § 1º, VII, Lei 14.133/21")
    expect(paragrafo).toContain("Contratação de item único, sem métrica aplicável.")
  })

  it("seção dispensada conta como resolvida no trilho", () => {
    // "Em revisão" seria mentira: não há o que revisar. A dispensa é decisão
    // tomada, e deixá-la como pendente faria o progresso nunca fechar.
    expect(statusAposDispensar("Não se aplica.")).toBe("Completo")
    expect(statusAposDispensar("   ")).toBe("Não iniciado")
  })

  it("dispensar não libera a geração de seção indispensável", () => {
    const lista = [
      { ...dispensavel("Justificativa."), id: "1", obrigatoria: true },
      dispensavel("Justificativa."),
    ]

    // A justificativa é a porta de saída do § 2º, e ela não alcança os incisos
    // que o próprio § 2º torna indispensáveis.
    expect(podeGerar(lista)).toBe(false)
  })
})
