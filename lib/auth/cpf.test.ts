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
    expect(formatCPF("529982")).toBe("529.982")
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

  it("recusa sequência repetida", () => {
    // 000.000.000-00 e afins passam no cálculo dos dígitos e não são CPF.
    expect(validaCPF("00000000000")).toBe(false)
    expect(validaCPF("99999999999")).toBe(false)
  })

  it("recusa comprimento diferente de onze dígitos", () => {
    expect(validaCPF("5299822472")).toBe(false)
    expect(validaCPF("529982247251")).toBe(false)
    expect(validaCPF("")).toBe(false)
  })
})
