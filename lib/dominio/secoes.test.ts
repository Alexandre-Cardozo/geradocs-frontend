import { describe, expect, it } from "vitest"

import {
  pendenciasDaGeracao,
  concluidas,
  dispensadasSemJustificativa,
  foiDispensada,
  obrigatoriasPendentes,
  paragrafoDeDispensa,
  podeGerar,
  progresso,
  secoesPrincipais,
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
    origem: "catalogo",
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
    origem: "catalogo",
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

  it("fora do ETP, a dispensa sai como não aplicável e não cita o Art. 18, § 2º", () => {
    const secao = {
      id: "18",
      titulo: "Da Subcontratação",
      fundamentoLegal: "Art. 122, Lei 14.133/21",
      obrigatoria: false,
      origem: "catalogo" as const,
      status: "Completo" as const,
      conteudo: "",
      justificativaDispensa: "  A execução é pessoal.  ",
    }

    expect(paragrafoDeDispensa(secao, "Contrato")).toBe(
      "Da Subcontratação: não se aplica a esta contratação. Fundamento da seção: Art. 122, Lei 14.133/21. Justificativa: A execução é pessoal.",
    )
    // No ETP, o texto de sempre.
    expect(paragrafoDeDispensa(secao, "ETP")).toBe(paragrafoDeDispensa(secao))
    expect(paragrafoDeDispensa(secao)).toContain("dispensado nos termos do Art. 18, § 2º")
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

/** O subtópico complementa a seção-mãe e não conta como seção (ADR-061 do back-end). */
describe("subtópicos", () => {
  const base = { obrigatoria: false, origem: "servidor" as const, conteudo: "" }
  const secoes = [
    { ...base, id: "1", titulo: "Necessidade", status: "Completo" as const, origem: "catalogo" as const },
    { ...base, id: "3", titulo: "Requisitos", status: "Não iniciado" as const, origem: "catalogo" as const },
    { ...base, id: "3.1", titulo: "Convenção", status: "Não iniciado" as const, secaoPai: "3" },
    { ...base, id: "3.2", titulo: "Habilitação", status: "Completo" as const, secaoPai: "3" },
  ]

  it("ficam fora das seções, mas contam no progresso", () => {
    expect(secoesPrincipais(secoes).map((s) => s.id)).toEqual(["1", "3"])
    // 2 de 4: o subtópico vai ao papel, e em branco é trabalho por fazer.
    expect(progresso(secoes)).toBe(50)
    expect(progresso(secoes.slice(2))).toBe(50)
  })

  it("sem seção nenhuma, o progresso é zero", () => {
    expect(progresso([])).toBe(0)
  })
})

describe("pendências da geração", () => {
  const base = { obrigatoria: false, origem: "catalogo" as const, conteudo: "", status: "Não iniciado" as const }
  it("separa o que trava, o que sai sem registro e o acrescentado em branco", () => {
    const pendencias = pendenciasDaGeracao([
      { ...base, id: "1", titulo: "Necessidade", obrigatoria: true },
      { ...base, id: "2", titulo: "PCA" },
      { ...base, id: "3", titulo: "Requisitos", justificativaDispensa: "Não se aplica.", status: "Completo" },
      { ...base, id: "3.1", titulo: "Convenção", origem: "servidor", secaoPai: "3" },
      { ...base, id: "3.2", titulo: "Escrita", origem: "servidor", secaoPai: "3", conteudo: "Texto." },
    ])

    expect(pendencias.obrigatorias.map((s) => s.id)).toEqual(["1"])
    // A dispensada não é lacuna; a acrescentada não se dispensa.
    expect(pendencias.semDispensa.map((s) => s.id)).toEqual(["2"])
    expect(pendencias.acrescentadasEmBranco.map((s) => s.id)).toEqual(["3.1"])
  })
})
