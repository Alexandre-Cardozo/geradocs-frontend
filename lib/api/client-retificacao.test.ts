import { describe, expect, it, vi } from "vitest"

/**
 * O "Fecha quando" do passo 8.2: regerar produz `v2` marcada e o histórico
 * mostra o motivo.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

const PROCESSO = "PROC-2024-089"

describe("retificação de documento", () => {
  it("gera v2 marcada e registra o motivo no histórico", async () => {
    const { gerarDocumento, getDocumentos, getHistoricoVersoes } = await carregarClienteLimpo()
    // O processo já tem o ETP na versão 1 — é desse estado que parte quem
    // retifica: o documento existe e já saiu para o processo.
    const primeira = (await getDocumentos()).find(
      (d) => d.processoId === PROCESSO && d.tipo === "ETP",
    )
    expect(primeira?.versao).toBe(1)
    expect(primeira?.titulo).not.toContain("RETIFICADO")

    const segunda = await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Valor da seção 5 trocado." },
    })

    expect(segunda.versao).toBe(2)
    // O rótulo vai no título porque o arquivo sai da plataforma: anexado ao
    // processo no sistema da prefeitura, o badge da tela não viaja junto.
    expect(segunda.titulo).toContain("RETIFICADO")

    expect((await getHistoricoVersoes(PROCESSO, "ETP"))[0]?.nota).toBe(
      "Retificação (Erro material): Valor da seção 5 trocado.",
    )
  })

  it("a retificação entra na trilha do processo", async () => {
    const { gerarDocumento, getProcesso } = await carregarClienteLimpo()

    await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "alteracao_substancial", detalhe: "Prazo de entrega alterado." },
    })

    const evento = (await getProcesso(PROCESSO))?.trilha[0]
    expect(evento?.evento).toBe("retificacao")
    expect(evento?.comentario).toContain("Alteração substancial")
    expect(evento?.comentario).toContain("Prazo de entrega alterado.")
  })

  it("regerar sem declarar retificação não vira retificação", async () => {
    const { gerarDocumento, getHistoricoVersoes, getProcesso } = await carregarClienteLimpo()
    const antes = await getProcesso(PROCESSO)

    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    // Regeração acontece enquanto o documento ainda está sendo elaborado dentro
    // da plataforma. Marcá-la como retificação esvaziaria a palavra onde ela
    // tem peso — e encheria a trilha de eventos sem consequência.
    expect((await getHistoricoVersoes(PROCESSO, "ETP"))[0]?.nota).toBe("Regeração")
    expect((await getProcesso(PROCESSO))?.trilha.length).toBe(antes?.trilha.length)
  })

  it("cada retificação empilha uma versão nova, sem sobrescrever", async () => {
    const { gerarDocumento, getHistoricoVersoes } = await carregarClienteLimpo()
    await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Primeira correção." },
    })
    const terceira = await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Segunda correção." },
    })

    // Documento que instrui contratação precisa poder mostrar o que mudou e
    // quando; sobrescrever apagaria exatamente a pergunta do controle.
    expect(terceira.versao).toBe(3)
    const historico = await getHistoricoVersoes(PROCESSO, "ETP")
    expect(historico.map((v) => v.versao)).toEqual([3, 2, 1])
    expect(historico[1]?.nota).toContain("Primeira correção.")
  })
})
