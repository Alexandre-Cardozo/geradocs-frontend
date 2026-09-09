import { describe, expect, it } from "vitest"

import { numeroDeDocumento, numeroDeProcesso, tituloDoDocumento } from "@/lib/dominio"

/**
 * O formato é institucional: `PROC-AAAA-NNN` aparece no protocolo, em ofício e
 * na capa do processo. Mudá-lo por engano quebra a correspondência com o acervo
 * do município.
 */

describe("numeroDeProcesso", () => {
  it("usa três dígitos com zero à esquerda", () => {
    expect(numeroDeProcesso(2026, 7)).toBe("PROC-2026-007")
    expect(numeroDeProcesso("2026", 89)).toBe("PROC-2026-089")
  })

  it("não trunca quando a sequência passa de três dígitos", () => {
    // Um município grande passa de mil processos no ano; cortar o número
    // produziria duas contratações com o mesmo identificador.
    expect(numeroDeProcesso(2026, 1234)).toBe("PROC-2026-1234")
  })
})

describe("numeroDeDocumento", () => {
  it("usa quatro dígitos com zero à esquerda", () => {
    expect(numeroDeDocumento(2026, 42)).toBe("DOC-2026-0042")
  })
})

describe("tituloDoDocumento", () => {
  it("junta tipo e objeto com travessão", () => {
    expect(tituloDoDocumento("ETP", "Aquisição de material")).toBe("ETP — Aquisição de material")
  })
})
