import { describe, expect, it } from "vitest"

import {
  CAMADAS,
  alvoDoPonteiro,
  aproximar,
  progressoDaRolagem,
  quadroDaRolagem,
  trecho,
} from "./paralaxe"

describe("trecho", () => {
  it("vai de 0 a 1 entre o início e o fim, e fica preso fora deles", () => {
    expect(trecho(0.2, 0.2, 0.6)).toBe(0)
    expect(trecho(0.4, 0.2, 0.6)).toBeCloseTo(0.5)
    expect(trecho(0.6, 0.2, 0.6)).toBe(1)
    expect(trecho(-1, 0.2, 0.6)).toBe(0)
    expect(trecho(2, 0.2, 0.6)).toBe(1)
  })
})

describe("progressoDaRolagem", () => {
  it("é 0 com a seção no topo e 1 quando o fim dela chega ao fim da janela", () => {
    expect(progressoDaRolagem(0, 2700, 1000)).toBe(0)
    expect(progressoDaRolagem(-850, 2700, 1000)).toBeCloseTo(0.5)
    expect(progressoDaRolagem(-1700, 2700, 1000)).toBe(1)
    expect(progressoDaRolagem(-5000, 2700, 1000)).toBe(1)
  })

  it("seção que cabe na janela não tem percurso", () => {
    expect(progressoDaRolagem(-200, 800, 1000)).toBe(0)
    expect(progressoDaRolagem(0, 1000, 1000)).toBe(0)
  })
})

describe("quadroDaRolagem", () => {
  it("no topo, tudo no lugar: título visível, sem véu e sem manifesto", () => {
    const q = quadroDaRolagem(0, { movimento: true })
    for (const c of CAMADAS) expect(q.camadas[c.nome]).toEqual({ escala: 1, subida: 0 })
    expect(q.titulo).toEqual({ subida: 0, opacidade: 1 })
    expect(q.seta).toBe(1)
    expect(q.veu).toBe(0)
    expect(q.manifesto.opacidade).toBe(0)
  })

  it("a câmera avança: o que está mais perto cresce mais", () => {
    const q = quadroDaRolagem(1, { movimento: true })
    const escalas = CAMADAS.map((c) => q.camadas[c.nome].escala)
    expect(escalas).toEqual([...escalas].sort((a, b) => a - b))
    expect(q.camadas.arvoreEsquerda.escala).toBeCloseTo(1.2)
    expect(q.camadas.arvoreEsquerda.subida).toBe(0)
    expect(q.camadas.ceu.subida).toBe(0)
  })

  it("o jardim nunca desce abaixo do pé da sede: não abre fresta entre os dois", () => {
    // Um ponto à fração `f` da altura, com escala a partir do centro, vai para
    // 0,5 + (f - 0,5)·escala + subida. O pé da sede fica entre 60% e 100% da tela.
    const onde = (c: { escala: number; subida: number }, f: number) => 0.5 + (f - 0.5) * c.escala + c.subida / 100
    for (let p = 0; p <= 1; p += 0.05) {
      const { sede, jardim } = quadroDaRolagem(p, { movimento: true }).camadas
      for (let f = 0.6; f <= 1; f += 0.05) expect(onde(jardim, f)).toBeLessThanOrEqual(onde(sede, f) + 1e-9)
    }
  })

  it("no meio do percurso o título já saiu e o manifesto está à vista sobre a cena escura", () => {
    const q = quadroDaRolagem(0.8, { movimento: true })
    expect(q.titulo.opacidade).toBe(0)
    expect(q.seta).toBe(0)
    expect(q.veu).toBeCloseTo(0.92)
    expect(q.manifesto).toEqual({ opacidade: 1, deslocamento: 0 })
  })

  it("no fim, o véu cobre a cena e o manifesto continua à vista", () => {
    const q = quadroDaRolagem(1, { movimento: true })
    expect(q.veu).toBeCloseTo(1)
    expect(q.manifesto).toEqual({ opacidade: 1, deslocamento: 0 })
  })

  it("com movimento reduzido nada se desloca, mas o manifesto ainda aparece", () => {
    const q = quadroDaRolagem(0.7, { movimento: false })
    for (const c of CAMADAS) expect(q.camadas[c.nome]).toEqual({ escala: 1, subida: 0 })
    expect(q.titulo.subida).toBe(0)
    expect(q.manifesto.deslocamento).toBe(0)
    expect(q.manifesto.opacidade).toBeGreaterThan(0.5)
  })
})

describe("ponteiro", () => {
  it("leva a camada para o lado oposto, menos na vertical", () => {
    expect(alvoDoPonteiro(1, -1, 20)).toEqual({ x: -20, y: 9 })
    expect(alvoDoPonteiro(0, 0, 20)).toEqual({ x: 0, y: 0 })
  })

  it("aproxima aos poucos e encosta no alvo quando a diferença é desprezível", () => {
    expect(aproximar(0, 10)).toBeCloseTo(0.8)
    expect(aproximar(0, 10, 0.5)).toBe(5)
    expect(aproximar(9.96, 10)).toBe(10)
  })
})
