import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ClausulasCondicionais } from "@/components/documentos/clausulas-condicionais"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

const PROCESSO = documentoApi.processId

const TEXTO = [
  "10.1. O custo estimado total da contratação é de R$ 48.000,00.",
  "10.2. (Se for o caso) O custo estimado possui caráter sigiloso.",
  "10.2.1. (Se for o caso) Quando as propostas ficarem acima do orçamento, o custo será público.",
  "10.3. (Se for o caso) Em obras e serviços de engenharia, aplica-se o BDI.",
].join("\n")

const CLAUSULAS = [
  { id: "c2", number: "10.2", preview: "10.2. (Se for o caso) O custo estimado possui caráter sigiloso.", firstLine: 2, lastLine: 3, alternative: false },
  { id: "c3", number: "10.2.1", preview: "10.2.1. (Se for o caso) Quando as propostas ficarem acima do orçamento, o custo será público.", firstLine: 3, lastLine: 3, parentId: "c2", alternative: false },
  { id: "c4", number: "10.3", preview: "10.3. (Se for o caso) Em obras e serviços de engenharia, aplica-se o BDI.", firstLine: 4, lastLine: 4, alternative: true },
]

type Pedido = { rota: "analysis" | "suggestions" | "removal"; corpo: Record<string, unknown> }

function comServidor(opcoes: { ia?: boolean; sugestoes?: object[]; texto?: string; clausulas?: object[] } = {}) {
  const pedidos: Pedido[] = []
  const registrar = (rota: Pedido["rota"]) => async ({ request }: { request: Request }) => {
    pedidos.push({ rota, corpo: (await request.json()) as Record<string, unknown> })
    return null
  }
  const base = `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/conditional-clauses`
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: opcoes.ia ?? true })),
    http.post(`${base}/analysis`, async (info) => {
      await registrar("analysis")(info)
      return HttpResponse.json({ clauses: opcoes.clausulas ?? CLAUSULAS })
    }),
    http.post(`${base}/suggestions`, async (info) => {
      await registrar("suggestions")(info)
      return HttpResponse.json({
        suggestions: opcoes.sugestoes ?? [
          { clauseId: "c2", verdict: "UNDETERMINED", reason: "Sem dado sobre sigilo." },
          { clauseId: "c3", verdict: "UNDETERMINED", reason: "Sem dado." },
          { clauseId: "c4", verdict: "LIKELY_NOT_APPLICABLE", reason: "O objeto é aquisição de bens, e a cláusula trata de obra." },
        ],
      })
    }),
    http.post(`${base}/removal`, async (info) => {
      await registrar("removal")(info)
      return HttpResponse.json({ content: opcoes.texto ?? "10.1. O custo estimado total da contratação é de R$ 48.000,00." })
    }),
  )
  return pedidos
}

function renderizarPainel(texto = TEXTO) {
  const aoMudar = vi.fn()
  renderizar(
    <ClausulasCondicionais processoId={PROCESSO} tipo="TR" secaoId="TC10" texto={texto} onTextoChange={aoMudar} />,
  )
  return { aoMudar }
}

/**
 * As cláusulas "(Se for o caso)" no editor (ADR 117): a plataforma lista, a IA sugere, e quem decide é quem assina.
 * Nada sai sem o clique, o texto só é gravado quando a pessoa salva a seção, e dá para desfazer.
 */
describe("cláusulas condicionais da minuta", () => {
  it("a seção sem a marcação não mostra o painel nem chama o servidor", async () => {
    const pedidos = comServidor()
    renderizarPainel("10.1. Só cláusulas obrigatórias.")

    expect(screen.queryByRole("heading", { name: /Cláusulas Condicionais/ })).not.toBeInTheDocument()
    await new Promise((resolver) => setTimeout(resolver, 800))
    expect(pedidos).toEqual([])
  })

  it("lista as cláusulas do texto da tela, com numeração, alternativa e a contagem", async () => {
    const pedidos = comServidor()
    renderizarPainel()

    expect(await screen.findByText("3 cláusulas")).toBeInTheDocument()
    expect(screen.getByText(/^10\.2\.1\. \(Se for o caso\) Quando as propostas/)).toBeInTheDocument()
    expect(screen.getByText(/Em obras e serviços de engenharia/)).toBeInTheDocument()
    expect(screen.getByText("Alternativa: escolha uma")).toBeInTheDocument()
    // A análise é sobre o texto do editor, e não sobre o gravado.
    expect(pedidos).toEqual([{ rota: "analysis", corpo: { content: TEXTO } }])
  })

  it("sem escolha o botão de tirar vem desabilitado com o motivo antes do clique", async () => {
    comServidor()
    renderizarPainel()

    const botao = await screen.findByRole("button", { name: /Tirar 0 Cláusulas/ })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAccessibleDescription("Marque as cláusulas que não se aplicam a esta contratação.")
  })

  it("veredito que o front não conhece vale como indeterminado: sem motivo e sem marcar nada", async () => {
    comServidor({ sugestoes: [{ clauseId: "c4", verdict: "VEREDITO_NOVO", reason: "Motivo que não deve aparecer." }] })
    renderizarPainel()

    await userEvent.click(await screen.findByRole("button", { name: "Sugerir com IA" }))

    expect(await screen.findByRole("button", { name: "Sugerir de Novo com IA" })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText("Motivo que não deve aparecer.")).not.toBeInTheDocument())
    expect(screen.queryByRole("button", { name: /Marcar as Sugeridas/ })).not.toBeInTheDocument()
  })

  it("a IA sugere, mostra o motivo só do que sugere tirar, e marcar as sugeridas não tira nada", async () => {
    const pedidos = comServidor()
    const { aoMudar } = renderizarPainel()

    await userEvent.click(await screen.findByRole("button", { name: "Sugerir com IA" }))

    expect(await screen.findByText("Provavelmente Não Se Aplica")).toBeInTheDocument()
    expect(screen.getByText("O objeto é aquisição de bens, e a cláusula trata de obra.")).toBeInTheDocument()
    // Indeterminada não carrega motivo: "sem dado" não é informação para decidir.
    expect(screen.queryByText("Sem dado sobre sigilo.")).not.toBeInTheDocument()
    expect(pedidos.at(-1)).toEqual({ rota: "suggestions", corpo: { content: TEXTO } })

    await userEvent.click(screen.getByRole("button", { name: "Marcar as Sugeridas (1)" }))

    expect(screen.getByRole("checkbox", { name: /^10\.3\./ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /^10\.2\. / })).not.toBeChecked()
    expect(aoMudar).not.toHaveBeenCalled()
    expect(pedidos.some((pedido) => pedido.rota === "removal")).toBe(false)
  })

  it("tira as escolhidas, entrega o texto novo sem gravar e permite desfazer", async () => {
    const pedidos = comServidor({ texto: "10.1. O custo estimado total da contratação é de R$ 48.000,00.\n\n10.3. Obras." })
    const { aoMudar } = renderizarPainel()

    await userEvent.click(await screen.findByRole("checkbox", { name: /^10\.3\./ }))
    await userEvent.click(screen.getByRole("button", { name: "Tirar 1 Cláusula" }))

    await waitFor(() => expect(aoMudar).toHaveBeenCalledTimes(1))
    // O editor grava o texto sem linhas em branco (§102).
    expect(aoMudar).toHaveBeenCalledWith(
      "10.1. O custo estimado total da contratação é de R$ 48.000,00.\n10.3. Obras.",
    )
    expect(pedidos.at(-1)).toEqual({ rota: "removal", corpo: { content: TEXTO, clauseIds: ["c4"] } })
  })

  it("escolher a cláusula-mãe mostra que os subitens saem junto e conta todos", async () => {
    comServidor()
    renderizarPainel()

    await userEvent.click(await screen.findByRole("checkbox", { name: /^10\.2\. / }))

    expect(screen.getByRole("button", { name: "Tirar 2 Cláusulas" })).toBeEnabled()
    expect(screen.getByText("Sai junto com a cláusula-mãe")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /^10\.2\.1\./ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /^10\.2\.1\./ })).toBeDisabled()
    expect(screen.getByText(/Os subitens das cláusulas marcadas saem junto/)).toBeInTheDocument()
  })

  it("sem modelo de IA, a sugestão vem desabilitada com o motivo, e tirar à mão continua possível", async () => {
    comServidor({ ia: false })
    renderizarPainel()

    const sugerir = await screen.findByRole("button", { name: "Sugerir com IA" })
    await waitFor(() => expect(sugerir).toBeDisabled())
    expect(sugerir).toHaveAccessibleDescription("Nenhum modelo de IA configurado nesta instalação.")
    // A IA é facilitadora, nunca bloqueadora.
    expect(screen.getByRole("checkbox", { name: /^10\.3\./ })).toBeEnabled()
  })

  it("quando a IA não acha nenhuma que claramente não se aplique, avisa e não marca nada", async () => {
    comServidor({
      sugestoes: [
        { clauseId: "c2", verdict: "UNDETERMINED", reason: "Sem dado." },
        { clauseId: "c3", verdict: "UNDETERMINED", reason: "Sem dado." },
        { clauseId: "c4", verdict: "UNDETERMINED", reason: "Sem dado." },
      ],
    })
    renderizarPainel()

    await userEvent.click(await screen.findByRole("button", { name: "Sugerir com IA" }))

    expect(await screen.findByRole("button", { name: "Sugerir de Novo com IA" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Marcar as Sugeridas/ })).not.toBeInTheDocument()
    expect(screen.getAllByText("Sem Sugestão")).toHaveLength(3)
  })

  it("falha na listagem mostra o erro e deixa tentar de novo", async () => {
    const base = `${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/conditional-clauses`
    servidor.use(
      http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: true })),
      http.post(`${base}/analysis`, () => HttpResponse.json({ detail: "Falhou." }, { status: 500 })),
    )
    renderizarPainel()

    expect(await screen.findByText("Não foi possível listar as cláusulas condicionais.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tentar de Novo" })).toBeInTheDocument()
  })

  it("texto que já não tem cláusula condicional avisa e não oferece ações", async () => {
    comServidor({ clausulas: [] })
    renderizarPainel()

    expect(await screen.findByText("Este texto já não tem cláusulas condicionais.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Sugerir com IA/ })).not.toBeInTheDocument()
  })
})
