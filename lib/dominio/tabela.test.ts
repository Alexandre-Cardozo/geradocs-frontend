import { describe, expect, it } from "vitest"

import { colunaNumerica, linhaTotalizadora, partesDoTexto, tabelaEmTexto } from "./tabela"

describe("partesDoTexto", () => {
  it("texto sem barra continua um parágrafo por linha", () => {
    expect(partesDoTexto("Primeira.\n\nSegunda.")).toEqual([
      { tipo: "paragrafo", texto: "Primeira." },
      { tipo: "paragrafo", texto: "" },
      { tipo: "paragrafo", texto: "Segunda." },
    ])
  })

  it("linhas seguidas com barra formam uma tabela com cabeçalho", () => {
    expect(partesDoTexto("Quantidades:\nItem | Quantidade\nPapel | 120\n\nFim.")).toEqual([
      { tipo: "paragrafo", texto: "Quantidades:" },
      {
        tipo: "tabela",
        linhas: [
          ["Item", "Quantidade"],
          ["Papel", "120"],
        ],
      },
      { tipo: "paragrafo", texto: "" },
      { tipo: "paragrafo", texto: "Fim." },
    ])
  })

  it("a linha da minuta da AGU guarda a coluna vazia do fim", () => {
    const [parte] = partesDoTexto("ITEM | ESPECIFICAÇÃO | VALOR TOTAL\n1 |  | ")
    expect(parte).toEqual({
      tipo: "tabela",
      linhas: [
        ["ITEM", "ESPECIFICAÇÃO", "VALOR TOTAL"],
        ["1", "", ""],
      ],
    })
  })

  it("o cabeçalho sozinho vira tabela, mas duas colunas sozinhas são texto", () => {
    expect(partesDoTexto("Parcela | Composição | Prazo")).toMatchObject([{ tipo: "tabela" }])
    expect(partesDoTexto("Fonte: Painel | PNCP")).toEqual([{ tipo: "paragrafo", texto: "Fonte: Painel | PNCP" }])
  })

  it("o Markdown perde as barras das pontas e a linha de traços", () => {
    expect(partesDoTexto("| Item | Valor |\n|:---|---:|\n| Caneta | R$ 2,50 |")).toEqual([
      {
        tipo: "tabela",
        linhas: [
          ["Item", "Valor"],
          ["Caneta", "R$ 2,50"],
        ],
      },
    ])
    expect(partesDoTexto("| A | B")).toEqual([{ tipo: "paragrafo", texto: "| A | B" }])
  })

  it("só traços não formam tabela, e a linha curta ganha células vazias", () => {
    expect(partesDoTexto("|---|---|---|")).toEqual([{ tipo: "paragrafo", texto: "|---|---|---|" }])
    expect(partesDoTexto("A | B | C\nx | y")).toEqual([
      {
        tipo: "tabela",
        linhas: [
          ["A", "B", "C"],
          ["x", "y", ""],
        ],
      },
    ])
  })
})

describe("colunaNumerica e linhaTotalizadora", () => {
  const papel = ["Papel", "05/11/2026", "1.200", "R$ 1.234,56", ""]
  const total = ["Total", "", "1.200", "R$ 1.234,56", ""]
  const linhas = [
    ["Item", "Data", "Quantidade", "Valor", "Obs"],
    papel,
    ["Caneta", "06/11/2026", "", "12,5%", ""],
    total,
  ]

  it("código com pontos não é número", () => {
    const creditos = [
      ["Programa", "Natureza", "Ficha"],
      ["12.361.0004.2.045", "3.3.90.30.00", "1245"],
    ]
    expect([0, 1, 2].map((c) => colunaNumerica(creditos, c))).toEqual([false, false, true])
  })

  it("alinha à direita só a coluna de números", () => {
    expect([0, 1, 2, 3, 4].map((c) => colunaNumerica(linhas, c))).toEqual([false, false, true, true, false])
  })

  it("reconhece a linha de total", () => {
    expect(linhaTotalizadora(total)).toBe(true)
    expect(linhaTotalizadora(papel)).toBe(false)
    expect(linhaTotalizadora([])).toBe(false)
  })
})

describe("tabelaEmTexto", () => {
  it("escreve o que a leitura devolve igual", () => {
    const linhas = [
      ["Item", "Unidade", "Total"],
      ["Papel  A4", "caixa | pacote", "R$ 10,00"],
      ["", "", "R$ 10,00"],
    ]
    const texto = tabelaEmTexto(linhas)
    expect(texto).toBe("Item | Unidade | Total\nPapel A4 | caixa / pacote | R$ 10,00\n|  |  | R$ 10,00 |")
    expect(partesDoTexto(texto)).toEqual([
      {
        tipo: "tabela",
        linhas: [
          ["Item", "Unidade", "Total"],
          ["Papel A4", "caixa / pacote", "R$ 10,00"],
          ["", "", "R$ 10,00"],
        ],
      },
    ])
  })
})

describe("linhas com barra que não formam tabela", () => {
  it("voltam a ser parágrafos, uma a uma, entre o texto", () => {
    expect(partesDoTexto("Antes\na | b\n|---|\nDepois")).toEqual([
      { tipo: "paragrafo", texto: "Antes" },
      { tipo: "paragrafo", texto: "a | b" },
      { tipo: "paragrafo", texto: "|---|" },
      { tipo: "paragrafo", texto: "Depois" },
    ])
  })
})
