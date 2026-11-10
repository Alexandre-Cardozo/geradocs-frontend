import { describe, expect, it } from "vitest"

import {
  avisoDasTabelas,
  colunaNumerica,
  inserirTabela,
  linhaTotalizadora,
  partesDoTexto,
  problemaDaTabela,
  semLinhasEmBranco,
  substituirTabela,
  tabelaEmBranco,
  tabelaEmTexto,
  tabelasDoTexto,
  tabelasNaoMantidas,
} from "./tabela"

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

describe("o editor de tabela (§101)", () => {
  const texto = "Abertura.\n\nA | B\n1 | 2\n\nFonte: X | Y\n\nC | D | E\n\nFim."

  it("acha cada tabela e o trecho do texto que ela ocupa", () => {
    expect(tabelasDoTexto(texto)).toEqual([
      {
        inicio: 2,
        fim: 4,
        linhas: [
          ["A", "B"],
          ["1", "2"],
        ],
      },
      { inicio: 7, fim: 8, linhas: [["C", "D", "E"]] },
    ])
    // A tabela que abre o texto também.
    expect(tabelasDoTexto("A | B | C\nx")).toEqual([{ inicio: 0, fim: 1, linhas: [["A", "B", "C"]] }])
  })

  it("troca só a tabela escolhida, e o resto fica como estava", () => {
    expect(
      substituirTabela(texto, 0, [
        ["A", "B"],
        ["3", "4"],
        ["5", "6"],
      ]),
    ).toBe("Abertura.\n\nA | B\n3 | 4\n5 | 6\n\nFonte: X | Y\n\nC | D | E\n\nFim.")
    expect(substituirTabela(texto, 5, [["x", "y"]])).toBe(texto)
  })

  it("tirar a tabela leva junto a linha em branco que a separava", () => {
    expect(substituirTabela(texto, 0, null)).toBe("Abertura.\n\nFonte: X | Y\n\nC | D | E\n\nFim.")
    expect(substituirTabela("A | B\n1 | 2\n\nFim.", 0, null)).toBe("Fim.")
    expect(substituirTabela("Fim.\n\nA | B\n1 | 2", 0, null)).toBe("Fim.")
    expect(substituirTabela("Fim.\nA | B\n1 | 2\nDepois", 0, null)).toBe("Fim.\nDepois")
  })

  it("insere no fim, ou depois da linha do cursor, sempre entre linhas em branco", () => {
    const nova = [
      ["X", "Y"],
      ["1", "2"],
    ]
    expect(inserirTabela("", nova)).toBe("X | Y\n1 | 2")
    expect(inserirTabela("Texto.", nova)).toBe("Texto.\nX | Y\n1 | 2")
    expect(inserirTabela("Texto.\n", nova)).toBe("Texto.\nX | Y\n1 | 2")
    expect(inserirTabela("Um.\nDois.", nova, 1)).toBe("Um.\nX | Y\n1 | 2\nDois.")
    expect(inserirTabela("Um.\n\nDois.", nova, 1)).toBe("Um.\nX | Y\n1 | 2\nDois.")
  })

  it("com o cursor dentro de outra tabela, entra depois dela em vez de parti-la", () => {
    const comTabela = "A | B\n1 | 2\n3 | 4\nFim."
    expect(
      inserirTabela(
        comTabela,
        [
          ["X", "Y"],
          ["5", "6"],
        ],
        7,
      ),
    ).toBe("A | B\n1 | 2\n3 | 4\n\nX | Y\n5 | 6\nFim.")
    expect(
      tabelasDoTexto(
        inserirTabela(
          comTabela,
          [
            ["X", "Y"],
            ["5", "6"],
          ],
          7,
        ),
      ),
    ).toHaveLength(2)
  })

  it("a tabela nova vem com cabeçalho a renomear, e o editor recusa o que não seria tabela", () => {
    expect(problemaDaTabela(tabelaEmBranco())).toBeNull()
    expect(problemaDaTabela([["Só uma"], [""]])).toMatch(/duas colunas/)
    expect(problemaDaTabela([])).toMatch(/duas colunas/)
    expect(problemaDaTabela([["A", "B"]])).toMatch(/uma linha além do cabeçalho/)
    expect(
      problemaDaTabela([
        [" ", ""],
        ["1", "2"],
      ]),
    ).toMatch(/nome às colunas/)
  })
})

describe("a conferência das tabelas que a IA devolve (§101)", () => {
  const antes = "Memória:\n\nItem | Total\nPapel | R$ 10,00\n\nA | B\n1 | 2"

  it("tabela mantida igual, mesmo com o texto em volta reescrito, não avisa", () => {
    expect(avisoDasTabelas(antes, "Texto revisto.\n\nA | B\n1 | 2\n\nItem | Total\nPapel | R$ 10,00")).toBeNull()
    expect(avisoDasTabelas("Sem tabela.", "Outro texto.")).toBeNull()
  })

  it("número mudado ou tabela tirada avisa, uma ou várias", () => {
    expect(tabelasNaoMantidas(antes, "Item | Total\nPapel | R$ 11,00\n\nA | B\n1 | 2")).toBe(1)
    expect(avisoDasTabelas(antes, "Item | Total\nPapel | R$ 11,00\n\nA | B\n1 | 2")).toMatch(
      /alterou ou tirou 1 tabela /,
    )
    expect(avisoDasTabelas(antes, "Tudo em texto corrido.")).toMatch(/alterou ou tirou 2 tabelas/)
    // Duas tabelas iguais em antes contam as duas: uma só em depois não cobre ambas.
    expect(tabelasNaoMantidas("A | B\n1 | 2\n\nA | B\n1 | 2", "A | B\n1 | 2")).toBe(1)
  })
})

describe("semLinhasEmBranco", () => {
  it("tira as linhas em branco, inclusive as de espaços, do começo e do fim", () => {
    expect(semLinhasEmBranco("\nUm.\n\n  \nDois.\n\n")).toBe("Um.\nDois.")
    expect(semLinhasEmBranco("")).toBe("")
  })

  it("tira a linha em branco entre texto e tabela, que continua tabela", () => {
    const limpo = semLinhasEmBranco("Quantidades:\n\nItem | Qtd\nPapel | 1\n\nFim.")
    expect(limpo).toBe("Quantidades:\nItem | Qtd\nPapel | 1\nFim.")
    expect(tabelasDoTexto(limpo)).toHaveLength(1)
  })

  it("guarda uma linha em branco entre duas tabelas, que senão virariam uma", () => {
    const limpo = semLinhasEmBranco("A | B\n1 | 2\n\n\nX | Y\n3 | 4")
    expect(limpo).toBe("A | B\n1 | 2\n\nX | Y\n3 | 4")
    expect(tabelasDoTexto(limpo)).toHaveLength(2)
  })
})
