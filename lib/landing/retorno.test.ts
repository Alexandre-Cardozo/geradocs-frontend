import { describe, expect, it } from "vitest"

import { CHAVE_DO_RETORNO, alvoDoRetorno, lerMarca, marcaDaRolagem, saiDaPagina } from "./retorno"

describe("volta à seção de origem (§131)", () => {
  it("marca o último bloco que já chegou ao alto da janela", () => {
    expect(marcaDaRolagem([-3000, -120, 480, 1400])).toEqual({ bloco: 1, deslocamento: -120 })
    expect(marcaDaRolagem([0.5, 700])).toEqual({ bloco: 0, deslocamento: 0.5 })
  })

  it("no alto da página, marca o primeiro bloco; sem blocos, nada", () => {
    expect(marcaDaRolagem([64, 900])).toEqual({ bloco: 0, deslocamento: 64 })
    expect(marcaDaRolagem([])).toBeNull()
  })

  it("lê só a marca com o formato certo", () => {
    expect(lerMarca({ __NA: true, [CHAVE_DO_RETORNO]: { bloco: 3, deslocamento: -40 } })).toEqual({ bloco: 3, deslocamento: -40 })
    expect(lerMarca(null)).toBeNull()
    expect(lerMarca("texto")).toBeNull()
    expect(lerMarca({})).toBeNull()
    expect(lerMarca({ [CHAVE_DO_RETORNO]: null })).toBeNull()
    expect(lerMarca({ [CHAVE_DO_RETORNO]: { bloco: "3", deslocamento: 0 } })).toBeNull()
    expect(lerMarca({ [CHAVE_DO_RETORNO]: { bloco: 3 } })).toBeNull()
    expect(lerMarca({ [CHAVE_DO_RETORNO]: { bloco: -1, deslocamento: 0 } })).toBeNull()
  })

  it("leva o bloco de volta ao mesmo lugar, cresça o que crescer acima dele", () => {
    // Saiu com o bloco 40px acima da borda; na volta, a abertura cresceu e o bloco está 900px abaixo.
    expect(alvoDoRetorno({ bloco: 2, deslocamento: -40 }, [0, 300, 900], 1000)).toBe(1940)
    expect(alvoDoRetorno({ bloco: 0, deslocamento: 64 }, [10], 0)).toBe(0)
    expect(alvoDoRetorno({ bloco: 5, deslocamento: 0 }, [0, 1], 0)).toBeNull()
  })

  it("só links para outra rota do site marcam a volta", () => {
    const pagina = new URL("https://govpro.com.br/geradocs-frontend/")
    expect(saiDaPagina(new URL("https://govpro.com.br/geradocs-frontend/onboarding/?origem=contato"), pagina)).toBe(true)
    expect(saiDaPagina(new URL("https://govpro.com.br/geradocs-frontend/#solucoes"), pagina)).toBe(false)
    expect(saiDaPagina(new URL("https://govpro.com.br/geradocs-frontend"), pagina)).toBe(false)
    expect(saiDaPagina(new URL("https://instagram.com/govpro"), pagina)).toBe(false)
  })
})
