import { describe, expect, it } from "vitest"

import {
  avisoDeLimiteAtingido,
  erroLimiteDeUsuarios,
  limiteDeUsuariosAtingido,
  tipoDaEntidade,
} from "@/lib/dominio/entidade"

/**
 * A tradução do tipo da entidade é lida de dois lugares — a sessão e a listagem
 * de organizações —, e é ela que decide se a câmara aparece como câmara ou como
 * prefeitura na tela.
 */
describe("tipoDaEntidade", () => {
  it("traduz o vocabulário do servidor", () => {
    expect(tipoDaEntidade("CAMARA")).toBe("camara")
    expect(tipoDaEntidade("AUTARQUIA")).toBe("autarquia")
    expect(tipoDaEntidade("FUNDACAO")).toBe("fundacao")
    expect(tipoDaEntidade("CONSORCIO")).toBe("consorcio")
    expect(tipoDaEntidade("OUTRO")).toBe("outro")
    expect(tipoDaEntidade("PREFEITURA")).toBe("prefeitura")
  })

  it("ausência e tipo desconhecido caem em prefeitura, como no servidor", () => {
    // `Organization.entityType == null ? PREFEITURA` é o padrão do backend: os
    // dois lados precisam concordar sobre o que a ausência significa.
    expect(tipoDaEntidade(null)).toBe("prefeitura")
    expect(tipoDaEntidade(undefined)).toBe("prefeitura")
    expect(tipoDaEntidade("CONSORCIO_PUBLICO")).toBe("prefeitura")
  })
})

describe("limite de usuários da entidade", () => {
  it("atinge quando os ativos alcançam o limite", () => {
    expect(limiteDeUsuariosAtingido({ limiteUsuarios: 5, usuariosAtivos: 4 })).toBe(false)
    expect(limiteDeUsuariosAtingido({ limiteUsuarios: 5, usuariosAtivos: 5 })).toBe(true)
    // Acima do limite só por legado ou corrida; continua bloqueado.
    expect(limiteDeUsuariosAtingido({ limiteUsuarios: 5, usuariosAtivos: 6 })).toBe(true)
  })

  it("sem limite ou sem contagem não presume nada e deixa a API decidir", () => {
    expect(limiteDeUsuariosAtingido({ usuariosAtivos: 3 })).toBe(false)
    expect(limiteDeUsuariosAtingido({ limiteUsuarios: 3 })).toBe(false)
    expect(limiteDeUsuariosAtingido({})).toBe(false)
  })

  it("o aviso diz o número do plano, no singular quando é um", () => {
    expect(avisoDeLimiteAtingido(5)).toBe("Limite de 5 usuários atingido, conforme o plano da entidade.")
    expect(avisoDeLimiteAtingido(1)).toBe("Limite de 1 usuário atingido, conforme o plano da entidade.")
  })

  it("aceita inteiros de 1 a 999 e explica o resto", () => {
    expect(erroLimiteDeUsuarios("1")).toBeUndefined()
    expect(erroLimiteDeUsuarios(" 999 ")).toBeUndefined()
    expect(erroLimiteDeUsuarios("")).toBe("Informe o limite de usuários.")
    expect(erroLimiteDeUsuarios("2,5")).toBe("Use apenas números inteiros.")
    expect(erroLimiteDeUsuarios("-3")).toBe("Use apenas números inteiros.")
    expect(erroLimiteDeUsuarios("0")).toBe("O limite deve estar entre 1 e 999.")
    expect(erroLimiteDeUsuarios("1000")).toBe("O limite deve estar entre 1 e 999.")
  })
})
