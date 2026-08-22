import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { documentoApi, processoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Retificação: v2 marcada, histórico com o motivo, trilha com a natureza.
 *
 * A conclusão e a versão são do servidor desde o Bloco 9 — é ele que valida as
 * seções indispensáveis e conta as conclusões. O que ainda é do front-end é o
 * **acervo**: título com o rótulo RETIFICADO, histórico de versões e o registro
 * na trilha do processo.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/client")
}

/**
 * O servidor conta as conclusões e guarda o histórico, como faz de verdade:
 * cada `finalize` devolve a versão seguinte e empilha a nota correspondente.
 */
function servidorQueConclui() {
  const versoes: { version: number; note: string; generatedAt: string; body: unknown[] }[] = []
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id`, () => HttpResponse.json(processoApi)),
    http.post(
      `${urlDaApi}/procurement-processes/:id/documents/:tipo/finalize`,
      async ({ request }) => {
        const corpo = (await request.json()) as { rectificationKind?: string; rectificationDetail?: string }
        const versao = versoes.length + 1
        const nota = corpo.rectificationKind
          ? `Retificação (${
              corpo.rectificationKind === "MATERIAL_ERROR" ? "Erro material" : "Alteração substancial"
            }): ${corpo.rectificationDetail}`
          : versao === 1
            ? "Geração inicial"
            : "Regeração"
        versoes.unshift({
          version: versao,
          note: nota,
          generatedAt: "2026-08-22T12:00:00-03:00",
          body: [{ sectionCode: "1", title: "Seção 1", text: "Necessidade.", dispensed: false }],
        })
        return HttpResponse.json({ ...documentoApi, finalized: true, currentVersion: versao })
      },
    ),
    http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
      HttpResponse.json(versoes),
    ),
  )
}

const PROCESSO = processoApi.id

describe("retificação de documento", () => {
  it("a versão vem do servidor e o título ganha o rótulo", async () => {
    servidorQueConclui()
    const { gerarDocumento } = await carregarClienteLimpo()
    // Retificar pressupõe documento gerado: não se retifica o que nunca saiu.
    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    const documento = await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Valor da seção 5 trocado." },
    })

    // Contar a versão aqui faria duas abas divergirem sobre qual é a vigente.
    expect(documento.versao).toBe(2)
    // O rótulo vai no título porque o arquivo sai da plataforma: anexado ao
    // processo no sistema da prefeitura, o badge da tela não viaja junto.
    expect(documento.titulo).toContain("RETIFICADO")
  })

  it("o histórico registra a natureza e o que foi corrigido", async () => {
    servidorQueConclui()
    const { gerarDocumento, getHistoricoVersoes } = await carregarClienteLimpo()
    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Valor da seção 5 trocado." },
    })

    expect((await getHistoricoVersoes(PROCESSO, "ETP"))[0]?.nota).toBe(
      "Retificação (Erro material): Valor da seção 5 trocado.",
    )
  })

  it("a retificação entra na trilha do processo", async () => {
    servidorQueConclui()
    const { gerarDocumento, getTrilha } = await carregarClienteLimpo()
    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    await gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "alteracao_substancial", detalhe: "Prazo de entrega alterado." },
    })

    const evento = (await getTrilha(PROCESSO))[0]
    expect(evento?.evento).toBe("retificacao")
    expect(evento?.comentario).toContain("Alteração substancial")
    expect(evento?.comentario).toContain("Prazo de entrega alterado.")
  })

  it("regerar sem declarar retificação não vira retificação", async () => {
    servidorQueConclui()
    const { gerarDocumento, getHistoricoVersoes, getTrilha } = await carregarClienteLimpo()

    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })
    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    // Regeração acontece enquanto o documento ainda está sendo elaborado.
    // Marcá-la como retificação esvaziaria a palavra onde ela tem peso.
    expect((await getHistoricoVersoes(PROCESSO, "ETP"))[0]?.nota).toBe("Regeração")
    expect(await getTrilha(PROCESSO)).toEqual([])
  })

  it("o corpo guardado é o que o servidor congelou", async () => {
    servidorQueConclui()
    const { gerarDocumento, getCorpoDocumento } = await carregarClienteLimpo()

    await gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    // O documento gerado é um retrato: quem congela é o servidor, no momento em
    // que valida as seções.
    expect((await getCorpoDocumento(PROCESSO, "ETP"))[0]?.texto).toBe("Necessidade.")
  })
})
