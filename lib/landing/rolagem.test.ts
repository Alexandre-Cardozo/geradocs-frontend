import { describe, expect, it } from "vitest"

import {
  deslocamentoDaFaixa,
  etapaDoProgresso,
  opacidadeDaPalavra,
  progressoDaEtapa,
  progressoDaPassagem,
  valorDoContador,
  vooDoCursor,
} from "./rolagem"

describe("progressoDaPassagem", () => {
  it("vale 0 quando a seção ainda está abaixo da janela", () => {
    expect(progressoDaPassagem(900, 600, 800)).toBe(0)
  })
  it("vale 1 quando a seção já saiu por cima", () => {
    expect(progressoDaPassagem(-700, 600, 800)).toBe(1)
  })
  it("cresce de forma linear no meio", () => {
    // topo em 100: já percorreu 700 de 1.400
    expect(progressoDaPassagem(100, 600, 800)).toBeCloseTo(0.5)
  })
})

describe("etapaDoProgresso", () => {
  it("divide o progresso em partes iguais", () => {
    expect(etapaDoProgresso(0, 5)).toBe(0)
    expect(etapaDoProgresso(0.39, 5)).toBe(1)
    expect(etapaDoProgresso(0.81, 5)).toBe(4)
  })
  it("o fim da rolagem é a última etapa, e nada passa dos limites", () => {
    expect(etapaDoProgresso(1, 5)).toBe(4)
    expect(etapaDoProgresso(-0.2, 5)).toBe(0)
  })
  it("volta à mesma etapa pelo progresso que o clique usa", () => {
    for (let etapa = 0; etapa < 5; etapa++) {
      expect(etapaDoProgresso(progressoDaEtapa(etapa, 5), 5)).toBe(etapa)
    }
  })
})

describe("deslocamentoDaFaixa", () => {
  it("desliza o que sobra da faixa além da janela", () => {
    expect(deslocamentoDaFaixa(0, 3000, 1200)).toBe(0)
    expect(deslocamentoDaFaixa(0.5, 3000, 1200)).toBe(-900)
    expect(deslocamentoDaFaixa(1, 3000, 1200)).toBe(-1800)
  })
  it("faixa que cabe na janela não desliza", () => {
    expect(deslocamentoDaFaixa(1, 900, 1200)).toBe(0)
    expect(Object.is(deslocamentoDaFaixa(1, 900, 1200), -0)).toBe(false)
  })
})

describe("opacidadeDaPalavra", () => {
  it("antes do trecho, toda palavra fica no mínimo", () => {
    expect(opacidadeDaPalavra(0.1, 0, 10)).toBeCloseTo(0.22)
  })
  it("acende as palavras em sequência", () => {
    const meio = 0.45 // metade do trecho: 5 de 10 palavras acesas
    expect(opacidadeDaPalavra(meio, 2, 10)).toBe(1)
    expect(opacidadeDaPalavra(meio, 8, 10)).toBeCloseTo(0.22)
  })
  it("no fim do trecho, todas acesas; o mínimo é configurável", () => {
    expect(opacidadeDaPalavra(0.8, 9, 10)).toBe(1)
    expect(opacidadeDaPalavra(0, 0, 10, 0.5)).toBe(0.5)
  })
})

describe("valorDoContador", () => {
  it("parte de zero e chega ao alvo", () => {
    expect(valorDoContador(22, 0)).toBe(0)
    expect(valorDoContador(22, 1)).toBe(22)
  })
  it("desacelera no fim e não passa dos limites", () => {
    expect(valorDoContador(10, 0.5)).toBe(9)
    expect(valorDoContador(10, 2)).toBe(10)
    expect(valorDoContador(10, -1)).toBe(0)
  })
})

describe("vooDoCursor", () => {
  const alvos = [
    { x: 10, y: 20 },
    { x: 90, y: 60 },
    { x: 50, y: 80 },
  ]

  it("na primeira etapa não há de onde voar: fica sobre o primeiro botão", () => {
    expect(vooDoCursor(0, alvos)).toEqual({ etapa: 0, x: 10, y: 20, emVoo: true })
    expect(vooDoCursor(0.2, alvos)).toMatchObject({ x: 10, y: 20, emVoo: false })
  })

  it("no começo da etapa voa em arco do botão anterior até o dela", () => {
    // Etapa 1 começa em 1/3; metade do voo em 1/3 + 0,4/3/2.
    const meio = vooDoCursor(1 / 3 + 0.2 / 3, alvos)
    expect(meio.etapa).toBe(1)
    expect(meio.emVoo).toBe(true)
    expect(meio.x).toBeCloseTo(50)
    // O arco sobe 8 pontos no meio do caminho.
    expect(meio.y).toBeCloseTo(40 - 8)
  })

  it("chega ao botão no fim do voo e fica lá até a próxima etapa", () => {
    expect(vooDoCursor(1 / 3 + 0.4 / 3 + 0.001, alvos)).toMatchObject({ etapa: 1, x: 90, y: 60, emVoo: false })
    expect(vooDoCursor(1, alvos)).toMatchObject({ etapa: 2, x: 50, y: 80, emVoo: false })
  })

  it("sem botões, fica no centro", () => {
    expect(vooDoCursor(0.5, [])).toMatchObject({ x: 50, y: 50 })
  })
})
