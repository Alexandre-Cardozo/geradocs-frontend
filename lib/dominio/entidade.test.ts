import { describe, expect, it } from "vitest"

import { tipoDaEntidade } from "@/lib/dominio/entidade"

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
