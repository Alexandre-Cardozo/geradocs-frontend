import { describe, expect, it } from "vitest"

import {
  type ClausulaCondicional,
  idsSugeridosParaTirar,
  ROTULO_DO_VEREDITO,
  saiComAMae,
  temClausulaCondicional,
  TOM_DO_VEREDITO,
  totalQueSai,
} from "@/lib/documentos/clausulas-condicionais"

const clausula = (sobrescrever: Partial<ClausulaCondicional> & { id: string }): ClausulaCondicional => ({
  previa: "(Se for o caso) Texto.",
  linhaInicial: 1,
  linhaFinal: 1,
  alternativa: false,
  ...sobrescrever,
})

describe("cláusulas condicionais da minuta", () => {
  it("reconhece a marcação em qualquer caixa e ignora o texto sem ela", () => {
    expect(temClausulaCondicional("10.2. (Se for o caso) O custo é sigiloso.")).toBe(true)
    expect(temClausulaCondicional("(SE FOR O CASO) cláusula solta")).toBe(true)
    expect(temClausulaCondicional("10.1. Só obrigatória.")).toBe(false)
    expect(temClausulaCondicional("")).toBe(false)
  })

  it("só a sugestão de não se aplicar chama atenção, e todo veredito tem rótulo", () => {
    expect(TOM_DO_VEREDITO["provavelmente-nao-se-aplica"]).toBe("warning")
    expect(TOM_DO_VEREDITO["provavelmente-se-aplica"]).toBe("success")
    expect(TOM_DO_VEREDITO.indeterminada).toBe("neutral")
    expect(ROTULO_DO_VEREDITO.indeterminada).toBe("Sem Sugestão")
    expect(Object.values(ROTULO_DO_VEREDITO)).toHaveLength(3)
  })

  it("'marcar as sugeridas' seleciona só as que a IA sugere tirar", () => {
    expect(
      idsSugeridosParaTirar([
        { clausulaId: "c2", veredito: "provavelmente-nao-se-aplica", motivo: "Bens." },
        { clausulaId: "c4", veredito: "provavelmente-se-aplica", motivo: "Serviço." },
        { clausulaId: "c6", veredito: "indeterminada", motivo: "Sem dado." },
        { clausulaId: "c8", veredito: "provavelmente-nao-se-aplica", motivo: "Obra." },
      ]),
    ).toEqual(["c2", "c8"])
    expect(idsSugeridosParaTirar([])).toEqual([])
  })

  it("o total que sai inclui os subitens das escolhidas, inclusive os de segundo nível", () => {
    const clausulas = [
      clausula({ id: "c2", numero: "10.2" }),
      clausula({ id: "c3", numero: "10.2.1", paiId: "c2" }),
      clausula({ id: "c4", numero: "10.2.1.1", paiId: "c3" }),
      clausula({ id: "c6", numero: "10.3" }),
    ]

    expect(totalQueSai(clausulas, new Set())).toBe(0)
    expect(totalQueSai(clausulas, new Set(["c6"]))).toBe(1)
    expect(totalQueSai(clausulas, new Set(["c2"]))).toBe(3)
    expect(totalQueSai(clausulas, new Set(["c3"]))).toBe(2)
    expect(totalQueSai(clausulas, new Set(["c2", "c3", "c6"]))).toBe(4)
  })

  it("a cláusula cuja mãe foi escolhida sai junto, e a sem mãe não", () => {
    const filha = clausula({ id: "c3", paiId: "c2" })

    expect(saiComAMae(filha, new Set(["c2"]))).toBe(true)
    expect(saiComAMae(filha, new Set(["c9"]))).toBe(false)
    expect(saiComAMae(clausula({ id: "c2" }), new Set(["c2"]))).toBe(false)
  })
})
