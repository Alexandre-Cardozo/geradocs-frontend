import { describe, expect, it } from "vitest"

import {
  anoBrasilia,
  dataBrasiliaISO,
  dataHoraBrasiliaISO,
  dataPorExtenso,
  formatBRL,
  formatData,
  formatarBytes,
  formatDataHora,
  formatNumeroBR,
  horaBrasilia,
  mascaraValorBR,
  normalizaValorBR,
  parseValorBR,
  saudacao,
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

  it("assume zero quando a digitação começa pela vírgula", () => {
    // Quem digita ",50" quer meio real, não um campo sem parte inteira.
    expect(mascaraValorBR(",50")).toBe("0,50")
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

/**
 * Tudo aqui é ancorado no fuso de Brasília, não no relógio de quem roda o teste.
 *
 * A data de um processo é dado de documento oficial: rodar a suíte em outra
 * máquina não pode mudar o dia registrado. Por isso os instantes são declarados
 * em UTC e a expectativa é o que Brasília veria naquele momento.
 */
describe("fuso de Brasília", () => {
  const meiaNoiteEMeiaEmBrasilia = new Date("2024-07-08T03:30:00Z")
  const vinteETresEmBrasilia = new Date("2024-07-07T02:00:00Z")

  it("lê a hora no fuso de Brasília, não no local", () => {
    // 03:30 UTC é 00:30 em Brasília — e já é outro dia.
    expect(horaBrasilia(meiaNoiteEMeiaEmBrasilia)).toBe(0)
    expect(horaBrasilia(vinteETresEmBrasilia)).toBe(23)
  })

  it("saúda conforme o período do dia", () => {
    expect(saudacao(new Date("2024-07-08T11:00:00Z"))).toBe("Bom dia") // 08:00 BRT
    expect(saudacao(new Date("2024-07-08T18:00:00Z"))).toBe("Boa tarde") // 15:00 BRT
    expect(saudacao(new Date("2024-07-08T23:00:00Z"))).toBe("Boa noite") // 20:00 BRT
    expect(saudacao(meiaNoiteEMeiaEmBrasilia)).toBe("Boa noite")
  })

  it("trata as bordas exatas dos períodos", () => {
    expect(saudacao(new Date("2024-07-08T08:00:00Z"))).toBe("Bom dia") // 05:00 BRT
    expect(saudacao(new Date("2024-07-08T07:59:00Z"))).toBe("Boa noite") // 04:59 BRT
    expect(saudacao(new Date("2024-07-08T15:00:00Z"))).toBe("Boa tarde") // 12:00 BRT
    expect(saudacao(new Date("2024-07-08T21:00:00Z"))).toBe("Boa noite") // 18:00 BRT
  })

  it("devolve o ano vigente em Brasília", () => {
    // 03:00 UTC de 1º de janeiro ainda é 31 de dezembro em Brasília.
    expect(anoBrasilia(new Date("2025-01-01T02:00:00Z"))).toBe(2024)
    expect(anoBrasilia(new Date("2025-01-01T04:00:00Z"))).toBe(2025)
  })

  it("registra a data no formato ISO do fuso de Brasília", () => {
    expect(dataBrasiliaISO(meiaNoiteEMeiaEmBrasilia)).toBe("2024-07-08")
    expect(dataBrasiliaISO(new Date("2024-07-08T02:59:00Z"))).toBe("2024-07-07")
  })

  it("registra data e hora sem sufixo de fuso", () => {
    expect(dataHoraBrasiliaISO(new Date("2024-07-08T19:42:07Z"))).toBe("2024-07-08T16:42:07")
  })

  it("escreve a data por extenso com inicial maiúscula", () => {
    // O Intl devolve "segunda-feira, ..." em minúscula; o documento oficial não.
    expect(dataPorExtenso(new Date("2024-07-08T15:00:00Z"))).toBe("Segunda-feira, 08 de julho de 2024")
  })

  it("usa o relógio atual quando nenhum instante é informado", () => {
    expect(horaBrasilia()).toBeGreaterThanOrEqual(0)
    expect(anoBrasilia()).toBeGreaterThanOrEqual(2024)
    expect(dataBrasiliaISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dataHoraBrasiliaISO()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    expect(dataPorExtenso()).toMatch(/de \d{4}$/)
    expect(saudacao()).toMatch(/^(Bom dia|Boa tarde|Boa noite)$/)
  })
})

describe("formatarBytes", () => {
  it("mostra bytes, quilobytes e megabytes em pt-BR", () => {
    // O tamanho vem do que o servidor mediu; formatar é trabalho da tela.
    expect(formatarBytes(512)).toBe("512 B")
    // Uma casa só abaixo de 10 KB: "14,0 KB" numa coluna de acervo é ruído.
    expect(formatarBytes(1_024)).toBe("1,0 KB")
    expect(formatarBytes(14_336)).toBe("14 KB")
    expect(formatarBytes(524_288)).toBe("512 KB")
    expect(formatarBytes(1_572_864)).toBe("1,5 MB")
  })

  it("arquivo vazio não quebra a coluna", () => {
    expect(formatarBytes(0)).toBe("0 B")
  })
})
