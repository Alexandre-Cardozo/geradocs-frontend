import { describe, expect, it } from "vitest"

import { iniciaisDe, primeiroNome } from "@/lib/dominio"

/**
 * Esta regra existia em três cópias — mock, cliente de autenticação e de acesso —
 * e elas divergiam para nome de uma palavra só. O mesmo servidor aparecia com
 * avatares diferentes conforme a tela que carregou o dado.
 */

describe("primeiroNome", () => {
  it("devolve a primeira palavra", () => {
    expect(primeiroNome("Maria Costa Andrade")).toBe("Maria")
  })

  it("tolera espaços em excesso", () => {
    expect(primeiroNome("   Maria   Costa  ")).toBe("Maria")
  })

  it("nome de uma palavra é ele mesmo", () => {
    expect(primeiroNome("Madonna")).toBe("Madonna")
  })

  it("nome vazio devolve o que recebeu, sem inventar", () => {
    expect(primeiroNome("")).toBe("")
    expect(primeiroNome("   ")).toBe("   ")
  })
})

describe("iniciaisDe", () => {
  it("usa a primeira letra do nome e a do último sobrenome", () => {
    expect(iniciaisDe("Maria Costa Andrade")).toBe("MA")
  })

  it("nome de uma palavra rende uma inicial, não a letra repetida", () => {
    // Era exatamente aqui que as três implementações discordavam: duas devolviam
    // "MM" e uma devolvia "M".
    expect(iniciaisDe("Madonna")).toBe("M")
  })

  it("dois nomes rendem duas iniciais", () => {
    expect(iniciaisDe("Ana Ribeiro")).toBe("AR")
  })

  it("sempre em maiúscula", () => {
    expect(iniciaisDe("maria costa")).toBe("MC")
  })

  it("nome vazio vira interrogação, não avatar em branco", () => {
    // "?" diz que falta dado; um avatar vazio parece defeito de renderização.
    expect(iniciaisDe("")).toBe("?")
    expect(iniciaisDe("   ")).toBe("?")
  })
})
