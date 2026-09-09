import { describe, expect, it } from "vitest"

import { formatCPF, limpaCPF, validaCPF } from "@/lib/auth/cpf"

describe("limpaCPF", () => {
  it("remove máscara e espaços", () => {
    expect(limpaCPF("529.982.247-25")).toBe("52998224725")
    expect(limpaCPF("  529 982 247 25 ")).toBe("52998224725")
  })
})

describe("formatCPF", () => {
  it("aplica a máscara oficial", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25")
  })

  it("mascara parcialmente enquanto se digita", () => {
    expect(formatCPF("52")).toBe("52")
    expect(formatCPF("529982")).toBe("529.982")
    expect(formatCPF("529982247")).toBe("529.982.247")
  })

  it("descarta dígitos além dos onze", () => {
    // Colar um número maior não pode produzir um CPF com cauda inválida.
    expect(formatCPF("5299822472599")).toBe("529.982.247-25")
  })
})

describe("validaCPF", () => {
  it("aceita CPF com dígitos verificadores corretos", () => {
    expect(validaCPF("529.982.247-25")).toBe(true)
    expect(validaCPF("11144477735")).toBe(true)
  })

  it("recusa dígito verificador errado", () => {
    expect(validaCPF("529.982.247-26")).toBe(false)
  })

  it("aceita os CPFs de demonstração da fase mockada", () => {
    // São sequências repetidas que a validação real reprova; entram como exceção
    // declarada em CPFS_DEMO enquanto existirem atalhos de acesso.
    expect(validaCPF("111.111.111-11")).toBe(true)
    expect(validaCPF("55555555555")).toBe(true)
  })

  it("recusa sequência repetida", () => {
    // 000.000.000-00 e afins passam no cálculo dos dígitos e não são CPF.
    expect(validaCPF("00000000000")).toBe(false)
    expect(validaCPF("99999999999")).toBe(false)
  })

  it("aceita CPF cujo dígito verificador vem de resto 10", () => {
    // Quando o resto do cálculo dá 10, a regra manda usar 0. Sem esse caso, um
    // CPF válido em cada onze seria recusado no cadastro.
    expect(validaCPF("526.018.159-06")).toBe(true)
  })

  it("recusa quando só o segundo dígito verificador está errado", () => {
    // O primeiro dígito confere e o segundo não: sem checar os dois, um erro de
    // digitação no fim do número passaria.
    expect(validaCPF("52998224724")).toBe(false)
  })

  it("recusa comprimento diferente de onze dígitos", () => {
    expect(validaCPF("5299822472")).toBe(false)
    expect(validaCPF("529982247251")).toBe(false)
    expect(validaCPF("")).toBe(false)
  })
})
