import { describe, expect, it, vi } from "vitest"

/**
 * O "Fecha quando" do passo 8.3: gerar um ETP com seção dispensável vazia e
 * justificada produz o parágrafo.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

const PROCESSO = "PROC-2024-089"

/** Índice de uma seção dispensável do ETP — as do § 2º são obrigatórias. */
async function primeiraDispensavel(processoId: string) {
  const { getSecoes } = await import("@/lib/api/client")
  const secoes = await getSecoes(processoId, "ETP")
  const dispensavel = secoes.find((s) => !s.obrigatoria)
  if (!dispensavel) throw new Error("O ETP precisa ter ao menos uma seção dispensável.")
  return dispensavel
}

describe("dispensa de seção do ETP", () => {
  it("a justificativa fica gravada e a seção conta como resolvida", async () => {
    const { atualizarSecao } = await carregarClienteLimpo()
    const alvo = await primeiraDispensavel(PROCESSO)

    const salva = await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "  Contratação de item único, sem métrica aplicável.  ",
    })

    expect(salva.justificativaDispensa).toBe("Contratação de item único, sem métrica aplicável.")
    // Deixá-la pendente faria o progresso do documento nunca fechar por causa de
    // uma seção que já foi decidida.
    expect(salva.status).toBe("Completo")
  })

  it("gerar o ETP produz o parágrafo no lugar da seção", async () => {
    const { atualizarSecao, gerarDocumento, getCorpoDocumento } = await carregarClienteLimpo()
    const alvo = await primeiraDispensavel(PROCESSO)
    await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "Não se aplica: aquisição de item único.",
    })

    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })
    const bloco = (await getCorpoDocumento(PROCESSO, "ETP")).find((b) => b.id === alvo.id)

    // Sem isto a seção sumiria do documento, e quem audita não distinguiria o
    // inciso que não se aplica daquele que ninguém preencheu.
    expect(bloco?.dispensada).toBe(true)
    expect(bloco?.texto).toContain("Art. 18, § 2º, da Lei 14.133/21")
    expect(bloco?.texto).toContain("Não se aplica: aquisição de item único.")
  })

  it("o documento gerado é um retrato: editar a seção depois não o altera", async () => {
    const { atualizarSecao, gerarDocumento, getCorpoDocumento } = await carregarClienteLimpo()
    const alvo = await primeiraDispensavel(PROCESSO)
    await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "Motivo do dia da geração.",
    })
    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "Texto escrito depois da geração.",
    })

    // É por isso que regerar incrementa a versão: o arquivo que já foi anexado
    // ao processo não pode mudar de conteúdo pelas costas de quem o anexou.
    const bloco = (await getCorpoDocumento(PROCESSO, "ETP")).find((b) => b.id === alvo.id)
    expect(bloco?.texto).toContain("Motivo do dia da geração.")
    expect(bloco?.texto).not.toContain("Texto escrito depois da geração.")
  })

  it("antes de gerar, não há retrato nenhum", async () => {
    const { getCorpoDocumento } = await carregarClienteLimpo()

    expect(await getCorpoDocumento("PROC-2024-084", "Edital")).toEqual([])
  })

  it("preencher a seção retira a dispensa", async () => {
    const { atualizarSecao } = await carregarClienteLimpo()
    const alvo = await primeiraDispensavel(PROCESSO)
    await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "Não se aplica.",
    })

    const preenchida = await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "Resultados pretendidos descritos.",
    })

    // As duas juntas produziriam um documento que traz o conteúdo e, logo
    // abaixo, diz que ele foi dispensado.
    expect(preenchida.justificativaDispensa).toBeUndefined()
    expect(preenchida.status).toBe("Completo")
  })

  it("justificativa em branco desfaz a dispensa", async () => {
    const { atualizarSecao } = await carregarClienteLimpo()
    const alvo = await primeiraDispensavel(PROCESSO)
    await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "Não se aplica.",
    })

    const desfeita = await atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: alvo.id,
      conteudo: "",
      justificativaDispensa: "   ",
    })

    expect(desfeita.justificativaDispensa).toBeUndefined()
    expect(desfeita.status).toBe("Não iniciado")
  })
})
