import { describe, expect, it } from "vitest"

import { concluidas, obrigatoriasPendentes, podeGerar, progresso, statusAposEditar } from "@/lib/dominio"
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
