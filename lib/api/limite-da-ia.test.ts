import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/auth-client"
import {
  CONTATO_DA_GOVPRO,
  LINK_PARA_AMPLIAR_O_LIMITE,
  MOTIVO_DO_LIMITE_ESGOTADO,
  ehLimiteDaIa,
} from "@/lib/api/limite-da-ia"

/** O limite de IA do plano contratado (§109). */
describe("limite de IA do plano", () => {
  it("é a recusa 402 do servidor, pelo código ou só pelo status", () => {
    expect(ehLimiteDaIa(new ApiError("O orçamento acabou.", 402, "AI_BUDGET_EXHAUSTED"))).toBe(true)
    expect(ehLimiteDaIa(new ApiError("Orçamento.", 402))).toBe(true)
    expect(ehLimiteDaIa(new ApiError("Outro status, mesmo código.", 400, "AI_BUDGET_EXHAUSTED"))).toBe(true)
  })

  it("não confunde com a geração em andamento, a IA fora do ar ou outro erro", () => {
    expect(ehLimiteDaIa(new ApiError("Aguarde.", 429, "AI_BUSY"))).toBe(false)
    expect(ehLimiteDaIa(new ApiError("Sem modelo.", 503, "AI_PROVIDER_UNAVAILABLE"))).toBe(false)
    expect(ehLimiteDaIa(new Error("Falhou."))).toBe(false)
    expect(ehLimiteDaIa(undefined)).toBe(false)
  })

  it("o contato leva à GovPro, com o assunto já escrito", () => {
    expect(CONTATO_DA_GOVPRO).toBe("contato@govpro.com.br")
    expect(LINK_PARA_AMPLIAR_O_LIMITE).toBe(
      "mailto:contato@govpro.com.br?subject=Amplia%C3%A7%C3%A3o%20do%20limite%20de%20IA%20do%20GeraDocs",
    )
    expect(MOTIVO_DO_LIMITE_ESGOTADO).toMatch(/plano contratado.*GovPro/)
  })
})
