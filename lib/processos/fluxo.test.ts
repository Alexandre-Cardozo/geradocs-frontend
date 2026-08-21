import { describe, expect, it } from "vitest"

import { EVENTO_LABEL, TRANSICOES, podeEmitir, proximoStatus, transicaoDe } from "@/lib/processos/fluxo"
import { STATUS_PROCESSO_LABEL } from "@/lib/types"
import type { EventoProcesso, StatusProcesso } from "@/lib/types"

/**
 * A máquina de estados é a única fonte das transições. Guardas de negócio —
 * quais documentos o processo contém e quais foram gerados — ficam fora dela.
 */

describe("grafo de transições", () => {
  it("leva o processo do rascunho à conclusão", () => {
    expect(proximoStatus("rascunho", "geracao_documento")).toBe("em_elaboracao")
    expect(proximoStatus("em_elaboracao", "encerramento")).toBe("concluido")
  })

  it("permite reabrir o processo encerrado para retificar", () => {
    // Corrigir um documento não pode exigir criar outro processo: isso quebraria
    // o histórico do que já foi elaborado.
    expect(proximoStatus("concluido", "reabertura")).toBe("em_elaboracao")
  })

  it("recusa transição que o grafo não declara", () => {
    expect(proximoStatus("rascunho", "encerramento")).toBeUndefined()
    expect(proximoStatus("concluido", "encerramento")).toBeUndefined()
    expect(podeEmitir("rascunho", "reabertura")).toBe(false)
  })

  it("devolve a transição inteira, com o papel que a executa", () => {
    expect(transicaoDe("em_elaboracao", "encerramento")).toEqual({
      evento: "encerramento",
      de: "em_elaboracao",
      para: "concluido",
      papel: "servidor",
    })
  })

  it("não encontra transição inexistente", () => {
    expect(transicaoDe("rascunho", "retificacao")).toBeUndefined()
  })
})

describe("integridade da tabela", () => {
  it("o mesmo par estado+evento não aparece duas vezes", () => {
    // Duas linhas para o mesmo par tornariam o destino dependente da ordem.
    const chaves = TRANSICOES.map((t) => `${t.de}:${t.evento}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it("só usa status do vocabulário normativo", () => {
    const vocabulario = Object.keys(STATUS_PROCESSO_LABEL) as StatusProcesso[]
    for (const transicao of TRANSICOES) {
      expect(vocabulario, `de: ${transicao.de}`).toContain(transicao.de)
      expect(vocabulario, `para: ${transicao.para}`).toContain(transicao.para)
    }
  })

  it("todo evento tem rótulo para a trilha de auditoria", () => {
    const eventos = Object.keys(EVENTO_LABEL) as EventoProcesso[]
    for (const transicao of TRANSICOES) {
      expect(eventos, transicao.evento).toContain(transicao.evento)
    }
  })

  it("registra eventos que não mudam o status", () => {
    // Trocar a modalidade e retificar um documento entram na trilha sem
    // transição: o processo continua onde estava, mas alguém precisa saber que
    // aconteceu.
    const comTransicao = new Set(TRANSICOES.map((t) => t.evento))
    expect(comTransicao.has("troca_modalidade")).toBe(false)
    expect(comTransicao.has("retificacao")).toBe(false)
    expect(EVENTO_LABEL.troca_modalidade).toBeTruthy()
    expect(EVENTO_LABEL.retificacao).toBeTruthy()
  })
})
