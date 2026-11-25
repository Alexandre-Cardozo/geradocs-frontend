import { describe, expect, it } from "vitest"

import { ETAPAS, FASES, ORGAOS, PAPEIS, faseDa, perfilDoPapel, rotuloDe } from "./roteiro"

describe("roteiro do onboarding (§130)", () => {
  it("as perguntas caem nas quatro fases; início, análise e envio ficam fora do progresso", () => {
    expect(ETAPAS.map(faseDa)).toEqual([null, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 3, null, null])
    expect(FASES).toHaveLength(4)
  })

  it("cada papel encontra o seu perfil da página da GovPro", () => {
    expect(perfilDoPapel("AGENTE_CONTRATACAO")).toBe(0)
    expect(perfilDoPapel("AREA_REQUISITANTE")).toBe(0)
    expect(perfilDoPapel("OUTRO")).toBe(0)
    expect(perfilDoPapel("COORDENACAO_COMPRAS")).toBe(1)
    expect(perfilDoPapel("GESTOR_MAXIMO")).toBe(2)
    expect(perfilDoPapel("JURIDICO")).toBe(3)
    expect(perfilDoPapel("CONTROLE_INTERNO")).toBe(3)
    expect(PAPEIS).toHaveLength(7)
  })

  it("o rótulo de uma opção, ou vazio quando não há resposta", () => {
    expect(rotuloDe(ORGAOS, "CAMARA")).toBe("Câmara Municipal")
    expect(rotuloDe(ORGAOS, undefined)).toBe("")
  })
})
