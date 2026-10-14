import { describe, expect, it } from "vitest"

import { emEdicao, errosDaFicha, pendenciasDaFicha, type FichaEmEdicao } from "@/lib/secretarias/ficha"
import type { FichaDaSecretaria } from "@/lib/types"

const vazia: FichaDaSecretaria = {
  email: null,
  endereco: null,
  ug: null,
  secretario: null,
  cpfDoSecretario: null,
  decretoDeNomeacao: null,
}

const completa: FichaDaSecretaria = {
  email: "saude@ecoporanga.es.gov.br",
  endereco: "Rua Central, 10",
  ug: "020101",
  secretario: "Ana Souza",
  cpfDoSecretario: "***.982.247-**",
  decretoDeNomeacao: "Decreto nº 1.234/2025",
}

describe("ficha da secretaria", () => {
  it("a edição parte da ficha guardada, sem o CPF (que só existe mascarado)", () => {
    expect(emEdicao(completa)).toEqual({
      email: "saude@ecoporanga.es.gov.br",
      endereco: "Rua Central, 10",
      ug: "020101",
      secretario: "Ana Souza",
      cpfNovo: "",
      decretoDeNomeacao: "Decreto nº 1.234/2025",
    })
    expect(emEdicao(vazia)).toEqual({
      email: "",
      endereco: "",
      ug: "",
      secretario: "",
      cpfNovo: "",
      decretoDeNomeacao: "",
    })
  })

  it("ficha vazia é válida — tudo é opcional", () => {
    expect(errosDaFicha(emEdicao(vazia))).toEqual({})
    expect(errosDaFicha({ ...emEdicao(completa), cpfNovo: "529.982.247-25" })).toEqual({})
  })

  it("aponta o que não confere", () => {
    const ruim: FichaEmEdicao = {
      email: "nao-e-email",
      endereco: "r".repeat(301),
      ug: "u".repeat(41),
      secretario: "Al",
      cpfNovo: "123.456.789-00",
      decretoDeNomeacao: "d".repeat(161),
    }
    expect(errosDaFicha(ruim)).toEqual({
      email: "Informe um e-mail institucional válido.",
      endereco: "O endereço tem no máximo 300 caracteres.",
      ug: "A UG tem no máximo 40 caracteres.",
      secretario: "Informe o nome completo do secretário.",
      cpfNovo: "CPF inválido.",
      decretoDeNomeacao: "O decreto de nomeação tem no máximo 160 caracteres.",
    })
  })

  it("CPF ou decreto sem o nome não dizem de quem são", () => {
    expect(errosDaFicha({ ...emEdicao(vazia), cpfNovo: "529.982.247-25" }).secretario).toMatch(/nome do secretário/)
    expect(errosDaFicha({ ...emEdicao(vazia), decretoDeNomeacao: "Decreto 1" }).secretario).toMatch(/nome do secretário/)
  })

  it("diz o que falta para o DFD sair completo", () => {
    expect(pendenciasDaFicha(vazia)).toEqual(["e-mail", "endereço", "UG", "secretário"])
    expect(pendenciasDaFicha(completa)).toEqual([])
  })
})
