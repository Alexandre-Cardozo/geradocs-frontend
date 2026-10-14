import { describe, expect, it } from "vitest"

import { opcoesDeSecretaria } from "@/lib/secretarias/opcoes"
import type { Secretaria } from "@/lib/types"

const ficha = { email: null, endereco: null, ug: null, secretario: null, cpfDoSecretario: null, decretoDeNomeacao: null }
const saude: Secretaria = { id: "s-saude", nome: "Secretaria de Saúde", ficha }
const obras: Secretaria = { id: "s-obras", nome: "Secretaria de Obras", ficha }

describe("secretarias oferecidas na capa do processo", () => {
  it("o valor é o id, e o rótulo o nome", () => {
    expect(opcoesDeSecretaria([saude, obras], { secretaria: "Secretaria de Saúde", secretariaId: "s-saude" })).toEqual([
      { value: "s-saude", label: "Secretaria de Saúde" },
      { value: "s-obras", label: "Secretaria de Obras" },
    ])
  })

  it("a atual entra mesmo desativada, para o campo não abrir em branco", () => {
    expect(opcoesDeSecretaria([obras], { secretaria: "Secretaria Extinta", secretariaId: "s-extinta" })).toEqual([
      { value: "s-extinta", label: "Secretaria Extinta (desativada)" },
      { value: "s-obras", label: "Secretaria de Obras" },
    ])
    expect(opcoesDeSecretaria([obras], { secretaria: "Secretaria de Obras" })).toHaveLength(1)
  })
})
