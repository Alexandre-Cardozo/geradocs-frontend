import { describe, expect, it } from "vitest"

import { EVENTO_LABEL, TRANSICOES, podeEmitir, proximoStatus, transicaoDe } from "@/lib/processos/fluxo"
import type { EventoAprovacao, StatusProcesso } from "@/lib/types"

/**
 * A máquina de estados é a única fonte das transições. Guardas de negócio
 * (documentos gerados, parecer) ficam fora dela de propósito — aqui só o grafo.
 */

describe("grafo de transições", () => {
  it("leva o processo do rascunho à conclusão pelo caminho previsto", () => {
    expect(proximoStatus("rascunho", "envio")).toBe("em_revisao")
    expect(proximoStatus("em_revisao", "envio")).toBe("aguardando")
    expect(proximoStatus("aguardando", "aprovacao")).toBe("aprovado")
    expect(proximoStatus("aprovado", "conclusao")).toBe("concluido")
  })

  it("a retificação devolve para a revisão, não para o rascunho", () => {
    // Voltar ao rascunho descartaria a submissão e o histórico dela.
    expect(proximoStatus("aguardando", "retificacao")).toBe("em_revisao")
  })

  it("a rejeição é terminal", () => {
    expect(proximoStatus("aguardando", "rejeicao")).toBe("rejeitado")
    for (const evento of Object.keys(EVENTO_LABEL) as EventoAprovacao[]) {
      expect(podeEmitir("rejeitado", evento), `rejeitado + ${evento}`).toBe(false)
    }
  })

  it("recusa transição que o grafo não declara", () => {
    expect(proximoStatus("rascunho", "aprovacao")).toBeUndefined()
    expect(proximoStatus("concluido", "envio")).toBeUndefined()
    expect(podeEmitir("rascunho", "conclusao")).toBe(false)
  })

  it("devolve a transição inteira, com o papel que a executa", () => {
    expect(transicaoDe("aguardando", "aprovacao")).toEqual({
      evento: "aprovacao",
      de: "aguardando",
      para: "aprovado",
      papel: "gestor_aprovador",
    })
  })

  it("não encontra transição inexistente", () => {
    expect(transicaoDe("concluido", "rejeicao")).toBeUndefined()
  })
})

describe("integridade da tabela", () => {
  it("o mesmo par estado+evento não aparece duas vezes", () => {
    // Duas linhas para o mesmo par tornariam o destino dependente da ordem.
    const chaves = TRANSICOES.map((t) => `${t.de}:${t.evento}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it("todo evento declarado tem rótulo para a trilha de auditoria", () => {
    for (const transicao of TRANSICOES) {
      expect(EVENTO_LABEL[transicao.evento], transicao.evento).toBeTruthy()
    }
  })

  it("nenhuma transição sai de um estado terminal", () => {
    const terminais: StatusProcesso[] = ["rejeitado", "concluido"]
    expect(TRANSICOES.filter((t) => terminais.includes(t.de))).toEqual([])
  })
})
