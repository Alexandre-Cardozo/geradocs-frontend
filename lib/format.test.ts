import { describe, expect, it } from "vitest"

import {
  formatBRL,
  formatData,
  formatDataHora,
  formatNumeroBR,
  mascaraValorBR,
  normalizaValorBR,
  parseValorBR,
} from "@/lib/format"

/**
 * Valor no GeraDocs vai para dentro de documento oficial. Um separador errado
 * não é detalhe estético: muda a estimativa que fundamenta a contratação.
 */
describe("formatBRL", () => {
  it("formata com separador de milhar e duas casas", () => {
    expect(formatBRL(485000)).toBe("R$ 485.000,00")
  })

  it("mantém as duas casas em valores redondos e em centavos", () => {
    expect(formatBRL(0)).toBe("R$ 0,00")
    expect(formatBRL(1234.5)).toBe("R$ 1.234,50")
    expect(formatBRL(0.07)).toBe("R$ 0,07")
  })

  it("usa espaço comum, não espaço estreito, depois do símbolo", () => {
    // O Intl devolve U+00A0 por padrão; o protótipo usa espaço comum, e a
    // diferença aparece em busca, em cópia e no texto gerado do documento.
    expect(formatBRL(10)).not.toContain(" ")
  })

  it("formata valor negativo sem perder o padrão", () => {
    expect(formatBRL(-1500)).toContain("1.500,00")
  })
})

describe("formatNumeroBR", () => {
  it("é o mesmo formato de formatBRL sem o símbolo", () => {
    expect(formatNumeroBR(485000)).toBe("485.000,00")
  })
})

describe("parseValorBR", () => {
  it("lê o texto que a interface exibe", () => {
    expect(parseValorBR("R$ 485.000,00")).toBe(485000)
    expect(parseValorBR("1.234,56")).toBe(1234.56)
  })

  it("devolve zero para texto vazio ou sem número", () => {
    expect(parseValorBR("")).toBe(0)
    expect(parseValorBR("abc")).toBe(0)
  })
})

describe("mascaraValorBR", () => {
  it("agrupa milhares enquanto se digita", () => {
    expect(mascaraValorBR("485000")).toBe("485.000")
  })

  it("corta em duas casas decimais", () => {
    expect(mascaraValorBR("12,3456")).toBe("12,34")
  })

  it("não completa as casas durante a digitação", () => {
    // Completar aqui empurraria o cursor e atrapalharia quem ainda está digitando.
    expect(mascaraValorBR("12,")).toBe("12,")
  })

  it("remove zero à esquerda mas preserva o zero sozinho", () => {
    expect(mascaraValorBR("0012")).toBe("12")
    expect(mascaraValorBR("0")).toBe("0")
  })

  it("descarta o que não é dígito nem vírgula", () => {
    expect(mascaraValorBR("R$ 1.5a0,0b")).toBe("150,0")
  })
})

describe("normalizaValorBR", () => {
  it("fecha o campo no formato canônico", () => {
    expect(normalizaValorBR("500.000")).toBe("500.000,00")
  })

  it("deixa o campo vazio continuar vazio", () => {
    // Preencher "0,00" sozinho faria o formulário afirmar uma estimativa que
    // ninguém informou.
    expect(normalizaValorBR("")).toBe("")
    expect(normalizaValorBR("   ")).toBe("")
  })
})

describe("datas", () => {
  it("converte ISO para o formato brasileiro", () => {
    expect(formatData("2024-07-05")).toBe("05/07/2024")
  })

  it("ignora a parte de hora ao formatar só a data", () => {
    expect(formatData("2024-07-05T16:42:00-03:00")).toBe("05/07/2024")
  })

  it("separa data e hora com travessão", () => {
    expect(formatDataHora("2024-07-03T16:42:00")).toBe("03/07/2024 — 16:42")
  })
})
