import { describe, expect, it } from "vitest"

import { LIMITE_DA_ORIENTACAO, sobraDaOrientacao } from "@/lib/documentos/orientacao"

describe("orientação à IA (§91)", () => {
  it("conta como o servidor conta: sem as bordas e com os espaços juntados", () => {
    expect(sobraDaOrientacao("  Entrega   em lotes.  ")).toBe(LIMITE_DA_ORIENTACAO - "Entrega em lotes.".length)
    expect(sobraDaOrientacao("a".repeat(LIMITE_DA_ORIENTACAO + 3))).toBe(-3)
  })
})
