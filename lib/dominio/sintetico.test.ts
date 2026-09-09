import { describe, expect, it } from "vitest"

import { CAMPOS_SINTETICOS, DADOS_SINTETICOS } from "@/lib/dominio"

/**
 * Configuração inventada exibida como real é pior que campo vazio: campo vazio
 * a pessoa preenche; valor plausível ela confere uma vez, aceita, e o documento
 * sai com um cabeçalho que ninguém decidiu.
 */
describe("dados sintéticos declarados", () => {
  it.each(CAMPOS_SINTETICOS)("%s diz de onde vem e quando sai", (campo) => {
    const dado = DADOS_SINTETICOS[campo]

    expect(dado.rotulo).not.toBe("")
    // A origem é o que impede a marca de virar decoração: sem ela, o aviso diz
    // "não é real" e não diz o que está no lugar.
    expect(dado.origem).not.toBe("")
    // A data de saída é o que impede a lista de virar permanente.
    expect(dado.saiEm).toMatch(/^Bloco \d+/)
  })

  it("a lista não está vazia enquanto tenantDa fabricar configuração", () => {
    // Zerada, esta lista significa que o back-end passou a fornecer tudo — e o
    // teste vira o lembrete de conferir se é verdade antes de apagar a marca.
    expect(CAMPOS_SINTETICOS.length).toBeGreaterThan(0)
  })

  it("cada campo aparece uma vez só", () => {
    expect(new Set(CAMPOS_SINTETICOS).size).toBe(CAMPOS_SINTETICOS.length)
  })
})
