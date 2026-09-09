import { describe, expect, it } from "vitest"

import { totalDeBytes } from "@/lib/dominio"

describe("totalDeBytes", () => {
  it("soma o que o servidor mediu em cada arquivo", () => {
    expect(
      totalDeBytes([
        { id: "a", formato: "PDF", nomeDoArquivo: "etp.pdf", bytes: 1024, checksum: "a" },
        { id: "b", formato: "DOCX", nomeDoArquivo: "etp.docx", bytes: 2048, checksum: "b" },
      ]),
    ).toBe(3072)
  })

  it("documento sem arquivo pesa zero, e não indefinido", () => {
    // A tela mostra "—" nesse caso; devolver `undefined` faria a formatação
    // decidir sozinha o que exibir.
    expect(totalDeBytes([])).toBe(0)
  })
})
