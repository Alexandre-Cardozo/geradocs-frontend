import { describe, expect, it } from "vitest"

import {
  ESCOLHA_INICIAL,
  cpfMascarado,
  elaboracaoDe,
  errosDaElaboracao,
  filtrarServidores,
  rotuloDoAto,
} from "@/lib/documentos/elaboracao"

describe("elaboração do documento", () => {
  it("só o ETP e o Edital citam ato: a portaria e o decreto", () => {
    expect(rotuloDoAto("ETP")).toBe("Portaria")
    expect(rotuloDoAto("Edital")).toBe("Decreto")
    expect(rotuloDoAto("TR")).toBeNull()
  })

  it("mascara o CPF como sai no documento", () => {
    expect(cpfMascarado("529.982.247-25")).toBe("***.982.247-**")
  })

  it("o padrão não envia nada: o servidor usa quem conclui e mantém o ato anterior", () => {
    expect(errosDaElaboracao(ESCOLHA_INICIAL)).toEqual({})
    expect(elaboracaoDe(ESCOLHA_INICIAL, "ETP")).toEqual({})
  })

  it("outra pessoa precisa de nome completo e CPF válido", () => {
    const outra = { ...ESCOLHA_INICIAL, responsavel: "outra" as const, nome: "Jo", cpf: "123" }
    expect(errosDaElaboracao(outra)).toEqual({
      nome: "Informe o nome completo de quem elaborou.",
      cpf: "Informe um CPF válido.",
    })
    const ok = { ...outra, nome: " José Pereira ", cpf: "529.982.247-25" }
    expect(errosDaElaboracao(ok)).toEqual({})
    expect(elaboracaoDe(ok, "TR")).toEqual({ responsavel: { nome: "José Pereira", cpf: "52998224725" } })
  })

  it("o ato vem do acervo ou digitado — e só no ETP e no Edital", () => {
    const norma = { ...ESCOLHA_INICIAL, ato: "norma" as const, normaId: "n-1" }
    expect(elaboracaoDe(norma, "ETP")).toEqual({ ato: { normaId: "n-1" } })
    expect(elaboracaoDe(norma, "TR")).toEqual({})
    const digitado = { ...ESCOLHA_INICIAL, ato: "digitado" as const, citacao: " 10.210/2025 " }
    expect(elaboracaoDe(digitado, "Edital")).toEqual({ ato: { citacao: "10.210/2025" } })
    expect(elaboracaoDe(digitado, "Mapa")).toEqual({})
  })

  it("aponta a escolha incompleta do ato", () => {
    expect(errosDaElaboracao({ ...ESCOLHA_INICIAL, ato: "norma" })).toEqual({ norma: "Escolha a norma no acervo." })
    expect(errosDaElaboracao({ ...ESCOLHA_INICIAL, ato: "digitado", citacao: "7" })).toEqual({
      citacao: "Informe o número e a data do ato.",
    })
  })

  it("outro servidor do órgão vai pelo id — o CPF vem do cadastro, no servidor", () => {
    const servidor = { ...ESCOLHA_INICIAL, responsavel: "servidor" as const }
    expect(errosDaElaboracao(servidor)).toEqual({ servidor: "Escolha o servidor que elaborou." })

    const escolhido = { ...servidor, servidorId: "u-jose" }
    expect(errosDaElaboracao(escolhido)).toEqual({})
    expect(elaboracaoDe(escolhido, "TR")).toEqual({ responsavel: { servidorId: "u-jose" } })
  })

  it("acha o servidor pelo nome, cargo ou matrícula, sem ligar para acento e caixa", () => {
    const jose = { id: "1", nome: "José Pereira", cargo: "Analista", matricula: null, cpf: "***.982.247-**" }
    const ana = { id: "2", nome: "Ana Souza", cargo: null, matricula: "MAT-0042", cpf: "***.533.447-**" }

    expect(filtrarServidores([jose, ana], "  ")).toEqual([jose, ana])
    expect(filtrarServidores([jose, ana], "JOSE")).toEqual([jose])
    expect(filtrarServidores([jose, ana], "analis")).toEqual([jose])
    expect(filtrarServidores([jose, ana], "0042")).toEqual([ana])
    expect(filtrarServidores([jose, ana], "Carlos")).toEqual([])
  })
})
