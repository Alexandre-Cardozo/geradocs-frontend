import { describe, expect, it } from "vitest"

import {
  apurar,
  chaveDoItem,
  fontesConsultadas,
  fornecedoresIdentificados,
  MINIMO_DE_PRECOS,
  metodoDeclarado,
  porItem,
  textoDaAnaliseCritica,
  textoDasFontes,
  textoDaSerie,
  textoDoPrecoDeReferencia,
} from "@/lib/dominio/pesquisa-de-precos"
import type { ColetaDePreco } from "@/lib/api/procurement-client"

/**
 * A pesquisa de preços (IN SEGES/ME nº 65/2021).
 *
 * <p>O que se cobra aqui é o tratamento que o Art. 6º admite — média, mediana e
 * menor valor sobre conjunto de três ou mais preços — e a fronteira que a
 * plataforma não atravessa: ela aponta o que merece exame, mas não descarta
 * nada sozinha, porque o § 3º exige critério "fundamentado e descrito no
 * processo".
 */
const coleta = (
  item: string,
  fonte: string,
  valorUnitario: string,
  extras: Partial<ColetaDePreco> = {},
): ColetaDePreco => ({
  id: `${item}-${fonte}-${valorUnitario}`,
  item,
  fonte,
  valorUnitario,
  coletadoEm: "2026-08-20T14:30:00Z",
  documento: null,
  registradaEm: "2026-08-28T12:00:00Z",
  ...extras,
})

describe("a série agrupada por item", () => {
  it("compara preços do mesmo item, e não a lista inteira", () => {
    const itens = porItem([
      coleta("Papel A4", "Painel de Preços", "24,00"),
      coleta("Caneta", "Painel de Preços", "1,80"),
      coleta("papel  a4", "Notas fiscais", "26,00"),
    ])

    // "Papel A4" e "papel  a4" são o mesmo item — a mesma chave da consolidação.
    expect(itens.map((i) => i.item)).toEqual(["Caneta", "Papel A4"])
    expect(itens[1]?.precos).toHaveLength(2)
  })

  it("apura média, mediana e menor — os três métodos do Art. 6º", () => {
    const [papel] = porItem([
      coleta("Papel A4", "Painel", "20,00"),
      coleta("Papel A4", "Notas fiscais", "30,00"),
      coleta("Papel A4", "Mídia", "40,00"),
    ])

    expect(papel?.media).toBe(30)
    expect(papel?.mediana).toBe(30)
    expect(papel?.menor).toBe(20)
    expect(papel?.maior).toBe(40)
    expect(apurar(papel!, "media")).toBe(30)
    expect(apurar(papel!, "mediana")).toBe(30)
    expect(apurar(papel!, "menor")).toBe(20)
  })

  it("com quatro preços, a mediana é a média dos dois centrais", () => {
    const [papel] = porItem([
      coleta("Papel A4", "A", "10,00"),
      coleta("Papel A4", "B", "20,00"),
      coleta("Papel A4", "C", "30,00"),
      coleta("Papel A4", "D", "60,00"),
    ])

    // Conjunto par não tem termo central: usar um deles enviesaria a apuração.
    expect(papel?.mediana).toBe(25)
  })

  it("marca para exame o preço distante da mediana — e não o descarta", () => {
    const [papel] = porItem([
      coleta("Papel A4", "Painel", "24,00"),
      coleta("Papel A4", "Notas fiscais", "25,00"),
      coleta("Papel A4", "Fornecedor", "90,00"),
    ])

    // O Art. 6º, § 3º exige critério "fundamentado e descrito no processo":
    // sumir com o preço sozinha seria a plataforma decidindo no lugar de quem
    // responde pelos autos.
    expect(papel?.paraExame.map((c) => c.valorUnitario)).toEqual(["90,00"])
    expect(papel?.precos).toHaveLength(3)
  })

  it("série curta é sinalizada — o Art. 6º pede três ou mais preços", () => {
    const [papel] = porItem([
      coleta("Papel A4", "Painel", "24,00"),
      coleta("Papel A4", "Notas fiscais", "25,00"),
    ])

    expect(MINIMO_DE_PRECOS).toBe(3)
    expect(papel?.serieCurta).toBe(true)
    // Mediana zero não pode marcar tudo para exame por divisão por zero.
    expect(porItem([coleta("Papel A4", "Painel", "0,00")])[0]?.paraExame).toEqual([])
  })
})

describe("as fontes consultadas", () => {
  const coletas = [
    coleta("Papel A4", "Painel de Preços", "24,00", {
      fornecedor: "Papelaria Central",
      documentoDoFornecedor: "12.345.678/0001-90",
    }),
    coleta("Papel A4", "Painel de Preços", "25,00"),
    coleta("Caneta", "Notas fiscais", "1,80", { fornecedor: "Distribuidora Norte" }),
  ]

  it("lista cada fonte uma vez e identifica quem deu o preço", () => {
    expect(fontesConsultadas(coletas)).toEqual(["Painel de Preços", "Notas fiscais"])
    expect(fornecedoresIdentificados(coletas)).toEqual([
      "Papelaria Central (12.345.678/0001-90)",
      "Distribuidora Norte",
    ])
  })

  it("sem parâmetro prioritário, o parágrafo cobra a justificativa da IN", () => {
    const texto = textoDasFontes(coletas, false)

    expect(texto).toContain("Art. 23, § 1º")
    expect(texto).toContain("Papelaria Central (12.345.678/0001-90)")
    // O Art. 5º, § 1º manda priorizar os incisos I e II e justificar quando não
    // for possível.
    expect(texto).toContain("[Justificar a impossibilidade")
  })

  it("com parâmetro prioritário, não há o que justificar", () => {
    const texto = textoDasFontes(coletas, true)

    expect(texto).not.toContain("[Justificar")
  })

  it("sem fornecedor identificado, o parágrafo não inventa a lista", () => {
    const texto = textoDasFontes([coleta("Papel A4", "Painel de Preços", "24,00")], true)

    expect(texto).not.toContain("fornecedores consultados")
  })
})

describe("o parágrafo da série de preços", () => {
  it("traz fonte, data, quem deu o preço e a validade da proposta", () => {
    const texto = textoDaSerie(
      porItem([
        coleta("Papel A4", "Pesquisa direta", "24,00", {
          fornecedor: "Papelaria Central",
          documentoDoFornecedor: "12.345.678/0001-90",
          validaAte: "2026-10-20",
        }),
        coleta("Papel A4", "Painel de Preços", "25,00"),
      ]),
    )

    expect(texto).toContain("Art. 3º da IN SEGES/ME nº 65/2021")
    expect(texto).toContain("Papel A4 (2 preço(s) obtido(s))")
    expect(texto).toContain("Papelaria Central (12.345.678/0001-90)")
    expect(texto).toContain("20/08/2026")
    expect(texto).toContain("proposta válida até 20/10/2026")
    expect(texto).toContain("R$ 24,00")
  })
})

describe("a chave do item", () => {
  it("é a mesma da consolidação da demanda", () => {
    expect(chaveDoItem("  Papel   A4 ")).toBe("papel a4")
  })
})

describe("a análise crítica", () => {
  it("retrata a variação e cobra o critério do descarte — sem descartar", () => {
    const texto = textoDaAnaliseCritica(
      porItem([
        coleta("Papel A4", "Painel", "24,00"),
        coleta("Papel A4", "Notas fiscais", "25,00"),
        coleta("Papel A4", "Fornecedor", "90,00"),
      ]),
    )

    expect(texto).toContain("Art. 6º da IN SEGES/ME nº 65/2021")
    expect(texto).toContain("3 preço(s) obtido(s)")
    expect(texto).toContain("Variação entre o menor e o maior: 275,0%")
    // O § 3º exige critério "fundamentado e descrito no processo": a plataforma
    // aponta, quem decide escreve.
    expect(texto).toContain("[Descrever o critério adotado")
    expect(texto).toContain("R$ 90,00 (Fornecedor)")
  })

  it("série curta pede a justificativa do § 5º", () => {
    const texto = textoDaAnaliseCritica(porItem([coleta("Papel A4", "Painel", "24,00")]))

    expect(texto).toContain("§ 5º")
    expect(texto).toContain("[Justificar a apuração sobre conjunto de menos de três preços")
  })

  it("sem preço destoante e com série suficiente, não há colchete a preencher", () => {
    const texto = textoDaAnaliseCritica(
      porItem([
        coleta("Papel A4", "A", "24,00"),
        coleta("Papel A4", "B", "25,00"),
        coleta("Papel A4", "C", "26,00"),
      ]),
    )

    expect(texto).not.toContain("[")
  })

  it("com menor zero a variação não estoura", () => {
    // Não deveria acontecer — o domínio recusa preço zero —, mas dividir por
    // zero na memória de cálculo produziria "Infinity%" numa peça de processo.
    const texto = textoDaAnaliseCritica(porItem([coleta("Papel A4", "A", "0,00")]))

    expect(texto).toContain("0,0%")
  })
})

describe("a memória de cálculo do preço de referência", () => {
  const serie = porItem([
    coleta("Papel A4", "Painel", "20,00"),
    coleta("Papel A4", "Notas fiscais", "30,00"),
    coleta("Papel A4", "Mídia", "40,00"),
  ])

  it("multiplica o preço apurado pela quantidade consolidada", () => {
    const texto = textoDoPrecoDeReferencia(serie, "mediana", () => 100)

    expect(texto).toContain("mediana dos preços obtidos")
    expect(texto).toContain("R$ 30,00")
    expect(texto).toContain("× 100 = R$ 3.000,00")
    expect(texto).toContain("Preço de referência total da contratação: R$ 3.000,00")
  })

  it("sem quantidade conhecida, deixa a lacuna em vez de somar zero", () => {
    const texto = textoDoPrecoDeReferencia(serie, "menor", () => undefined)

    // Somar zero faria a estimativa mentir; a lacuna diz o que falta.
    expect(texto).toContain("[Informar a quantidade deste item")
    expect(texto).toContain("Preço de referência total da contratação: R$ 0,00")
  })
})

describe("o método escolhido", () => {
  it("volta do texto já gravado na seção — não vive na memória da aba", () => {
    const texto = textoDoPrecoDeReferencia(
      porItem([coleta("Papel A4", "Painel", "20,00")]),
      "menor",
      () => 10,
    )

    expect(metodoDeclarado(texto)).toBe("menor")
    expect(metodoDeclarado(textoDoPrecoDeReferencia(serieMedia, "media", () => 1))).toBe("media")
    expect(metodoDeclarado(textoDoPrecoDeReferencia(serieMedia, "mediana", () => 1))).toBe(
      "mediana",
    )
  })

  it("sem a linha do método, não há escolha a restaurar", () => {
    expect(metodoDeclarado("Texto escrito à mão pelo servidor.")).toBeNull()
    // A linha existe mas não nomeia nenhum dos três métodos da IN.
    expect(
      metodoDeclarado("Adotou-se como método de apuração a moda dos preços obtidos."),
    ).toBeNull()
  })
})

const serieMedia = porItem([
  coleta("Papel A4", "Painel", "20,00"),
  coleta("Papel A4", "Notas", "30,00"),
])
