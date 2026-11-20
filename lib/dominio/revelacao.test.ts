import { describe, expect, it, vi } from "vitest"

import {
  DURACAO_MAXIMA_MS,
  DURACAO_MINIMA_MS,
  ETAPAS_DA_MELHORIA,
  ETAPAS_DA_REDACAO,
  duracaoDaRevelacao,
  movimentoReduzido,
  suavizar,
  trechoRevelado,
} from "@/lib/dominio/revelacao"

/** A escrita do texto da IA na tela (§107): só a conta, sem React. */
describe("revelação do texto da IA", () => {
  it("a escrita dura entre o mínimo e o máximo, e o texto curto escreve rápido", () => {
    expect(duracaoDaRevelacao("")).toBe(DURACAO_MINIMA_MS)
    expect(duracaoDaRevelacao("a".repeat(400))).toBe(1000)
    expect(duracaoDaRevelacao("a".repeat(20000))).toBe(DURACAO_MAXIMA_MS)
  })

  it("a suavização começa rápida, assenta no fim e não sai de 0 a 1", () => {
    expect(suavizar(-1)).toBe(0)
    expect(suavizar(0)).toBe(0)
    expect(suavizar(0.5)).toBeCloseTo(0.875)
    expect(suavizar(1)).toBe(1)
    expect(suavizar(2)).toBe(1)
  })

  it("antes do início não há nada, e no fim há o texto inteiro", () => {
    expect(trechoRevelado("Objeto da contratação.", 0)).toBe("")
    expect(trechoRevelado("Objeto da contratação.", -0.5)).toBe("")
    expect(trechoRevelado("Objeto da contratação.", 1)).toBe("Objeto da contratação.")
  })

  it("corta sempre no fim de uma palavra, nunca no meio", () => {
    const texto = "Aquisição de papel A4 para as escolas"
    // 10% de 37 = 3 caracteres, no meio de "Aquisição": vai até o fim dela.
    expect(trechoRevelado(texto, 0.1)).toBe("Aquisição")
    // O corte que cai num espaço fica ali.
    expect(trechoRevelado(texto, 9 / texto.length)).toBe("Aquisição")
    // A última palavra, sem espaço depois, vai até o fim do texto.
    expect(trechoRevelado(texto, 0.99)).toBe(texto)
  })

  it("a linha de tabela aparece inteira, para o editor de tabela não piscar", () => {
    const texto = "Itens:\n| Item | Qtd |\n| --- | --- |\n| Papel | 100 |"
    // O corte no meio da primeira linha da tabela leva a linha toda.
    expect(trechoRevelado(texto, 10 / texto.length)).toBe("Itens:\n| Item | Qtd |")
    // Na última linha da tabela, sem quebra depois, vai até o fim.
    expect(trechoRevelado(texto, (texto.length - 3) / texto.length)).toBe(texto)
    // Fora da tabela, o corte é por palavra.
    expect(trechoRevelado(texto, 2 / texto.length)).toBe("Itens:")
  })

  it("com movimento reduzido, ou fora do navegador, não há animação", () => {
    expect(movimentoReduzido(undefined)).toBe(true)
    expect(movimentoReduzido({} as Window)).toBe(true)
    const pergunta = vi.fn((consulta: string) => ({ matches: consulta.includes("reduce") }) as MediaQueryList)
    expect(movimentoReduzido({ matchMedia: pergunta })).toBe(true)
    expect(pergunta).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)")
    expect(movimentoReduzido({ matchMedia: () => ({ matches: false }) as MediaQueryList })).toBe(false)
  })

  it("cada pedido tem as suas etapas, sem travessão", () => {
    for (const etapa of [...ETAPAS_DA_REDACAO, ...ETAPAS_DA_MELHORIA]) expect(etapa).not.toContain("\u2014")
    expect(ETAPAS_DA_REDACAO).toHaveLength(3)
    expect(ETAPAS_DA_MELHORIA).toHaveLength(3)
  })
})
