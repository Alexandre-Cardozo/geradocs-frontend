import { describe, expect, it, vi } from "vitest"

/**
 * O caso que fecha o passo 8.1: um processo montado como Pregão Eletrônico vira
 * Dispensa do Art. 75.
 *
 * Cada teste precisa de um módulo novo porque o `client` guarda o banco em
 * memória em variável de módulo — sem isso, a troca de um teste vaza para o
 * seguinte e a suíte passa a testar a ordem em que os testes rodam.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

const PREGAO_COM_EDITAL = "PROC-2024-089"

describe("troca de modalidade", () => {
  it("ajustando a lista, remove o que deixou de ser cabível e registra o ajuste", async () => {
    const { atualizarProcesso, getProcesso } = await carregarClienteLimpo()
    const antes = await getProcesso(PREGAO_COM_EDITAL)
    expect(antes?.documentos).toContain("Edital")

    const depois = await atualizarProcesso({
      id: PREGAO_COM_EDITAL,
      modalidade: "Dispensa Art. 75",
      documentos: ["ETP", "TR"],
    })

    expect(depois.modalidade).toBe("Dispensa Art. 75")
    expect(depois.documentos).not.toContain("Edital")
    const evento = depois.trilha[0]
    expect(evento?.evento).toBe("troca_modalidade")
    expect(evento?.comentario).toContain("Pregão Eletrônico")
    expect(evento?.comentario).toContain("Dispensa Art. 75")
    expect(evento?.comentario).toContain("removidos por deixarem de ser cabíveis: Edital")
  })

  it("mantendo a lista, a justificativa vai literal para a trilha", async () => {
    const { atualizarProcesso } = await carregarClienteLimpo()

    const depois = await atualizarProcesso({
      id: PREGAO_COM_EDITAL,
      modalidade: "Dispensa Art. 75",
      justificativaModalidade: "O edital já foi publicado e será anulado por ato próprio.",
    })

    // É a justificativa que responde ao controle por que o processo ficou com um
    // documento que a modalidade vigente não comporta.
    expect(depois.documentos).toContain("Edital")
    expect(depois.trilha[0]?.comentario).toContain(
      "O edital já foi publicado e será anulado por ato próprio.",
    )
  })

  it("a trilha registra quem trocou e quando", async () => {
    const { atualizarProcesso } = await carregarClienteLimpo()

    const evento = (
      await atualizarProcesso({ id: PREGAO_COM_EDITAL, modalidade: "Dispensa Art. 75" })
    ).trilha[0]

    // Sem autor e data, a trilha não serve ao controle: ela existe justamente
    // para dizer quem fez o quê dentro da plataforma.
    expect(evento?.autor).not.toBe("")
    expect(evento?.data).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("salvar sem trocar a modalidade não polui a trilha", async () => {
    const { atualizarProcesso, getProcesso } = await carregarClienteLimpo()
    const antes = await getProcesso(PREGAO_COM_EDITAL)

    const depois = await atualizarProcesso({
      id: PREGAO_COM_EDITAL,
      modalidade: "Pregão Eletrônico",
      objeto: "Descrição revisada",
    })

    // Evento sem mudança transformaria a trilha em log de cliques, e o que
    // importa deixaria de ser encontrável no meio.
    expect(depois.trilha.length).toBe(antes?.trilha.length)
  })
})
