import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { MelhorarRedacao } from "@/components/processos/melhorar-redacao"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * "Melhorar a redação" da situação-problema do DFD (ADR-072).
 *
 * <p>A IA só reescreve o que a pessoa escreveu. A tela mostra a sugestão, e a
 * pessoa decide: usar ou descartar. Nada é gravado aqui, e o texto da pessoa
 * nunca é trocado sem o clique dela.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const ROTA = `${urlDaApi}/procurement-processes/${PROCESSO}/dfds/improve-problem-description`
const ESCRITO = "os notebooks tem mais de 5 anos e nao rodam o diario, sao 30 maquinas"
const MELHORADO = "Os notebooks têm mais de 5 anos e não executam o diário eletrônico. São 30 máquinas."

function comIa(disponivel: boolean) {
  servidor.use(http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: disponivel })))
}

function comSugestao(texto: string) {
  const corpos: unknown[] = []
  servidor.use(
    http.post(ROTA, async ({ request }) => {
      corpos.push(await request.json())
      return HttpResponse.json({ text: texto })
    }),
  )
  return corpos
}

function recusa(status: number, code: string, detail: string) {
  servidor.use(
    http.post(ROTA, () =>
      HttpResponse.json(
        { title: "Recusada", status, detail, code },
        { status, headers: { "Content-Type": "application/problem+json" } },
      ),
    ),
  )
}

function renderizarMelhoria(texto = ESCRITO) {
  const usar = vi.fn()
  renderizar(<MelhorarRedacao processoId={PROCESSO} texto={texto} onUsar={usar} />)
  return { usar }
}

describe("melhorar a redação", () => {
  it("sem modelo de IA, o botão vem desligado com o motivo escrito antes do clique", async () => {
    comIa(false)
    renderizarMelhoria()

    const botao = await screen.findByRole("button", { name: "Melhorar a redação" })
    await waitFor(() => expect(botao).toBeDisabled())
    expect(screen.getByText(/Nenhum modelo de IA configurado/)).toBeInTheDocument()
    // O motivo é anunciado, e não só desenhado.
    expect(document.getElementById(botao.getAttribute("aria-describedby") as string)).toHaveTextContent(
      /Nenhum modelo de IA configurado/,
    )
  })

  it("enquanto não sabe se há IA, o botão fica desligado dizendo que está verificando", async () => {
    let responder: () => void = () => {}
    const espera = new Promise<void>((resolve) => {
      responder = resolve
    })
    servidor.use(
      http.get(`${urlDaApi}/ai/status`, async () => {
        await espera
        return HttpResponse.json({ available: true })
      }),
    )
    renderizarMelhoria()

    expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeDisabled()
    expect(screen.getByText("Verificando a IA...")).toBeInTheDocument()

    responder()
    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
  })

  it("sem teto definido, diz por quê; com o teto esgotado, o botão segue clicável (§109)", async () => {
    comIa(true)
    servidor.use(
      http.get(`${urlDaApi}/organizations/:id/ai-budget`, () =>
        HttpResponse.json({ spentAmount: 0, defined: false, available: false }),
      ),
    )
    const { unmount } = renderizar(<MelhorarRedacao processoId={PROCESSO} texto={ESCRITO} onUsar={vi.fn()} />)
    expect(await screen.findByText(/A IA não está liberada para esta entidade/)).toBeInTheDocument()
    unmount()

    servidor.use(
      http.get(`${urlDaApi}/organizations/:id/ai-budget`, () =>
        HttpResponse.json({ period: "2026-11", limitAmount: 10, spentAmount: 10, remainingAmount: 0, defined: true, available: false }),
      ),
    )
    renderizar(<MelhorarRedacao processoId={PROCESSO} texto={ESCRITO} onUsar={vi.fn()} />)
    // O clique vai ao servidor, e a recusa abre o aviso do limite.
    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    expect(screen.getByText("A IA só melhora a escrita. Você decide o que usar.")).toBeInTheDocument()
  })

  it("com IA, mas sem texto ou com texto maior que o campo, o botão fica desligado e diz por quê", async () => {
    comIa(true)
    const { unmount } = renderizar(<MelhorarRedacao processoId={PROCESSO} texto="   " onUsar={vi.fn()} />)
    expect(await screen.findByText("Escreva a situação-problema para poder melhorar a redação.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeDisabled()
    unmount()

    renderizar(<MelhorarRedacao processoId={PROCESSO} texto={"x".repeat(2001)} onUsar={vi.fn()} />)
    expect(await screen.findByText("O texto passa de 2000 caracteres.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeDisabled()
  })

  it("mostra a sugestão sem trocar o texto: só entra no campo quando a pessoa clica em usar", async () => {
    comIa(true)
    const corpos = comSugestao(MELHORADO)
    const { usar } = renderizarMelhoria()

    const botao = await screen.findByRole("button", { name: "Melhorar a redação" })
    await waitFor(() => expect(botao).toBeEnabled())
    await userEvent.click(botao)

    expect(await screen.findByText(MELHORADO)).toBeInTheDocument()
    expect(corpos).toEqual([{ text: ESCRITO }])
    expect(screen.getByText("Confira se nenhum fato mudou antes de usar.")).toBeInTheDocument()
    // Nada foi trocado ainda.
    expect(usar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Usar sugestão" }))

    expect(usar).toHaveBeenCalledExactlyOnceWith(MELHORADO)
    expect(screen.queryByText(MELHORADO)).not.toBeInTheDocument()
  })

  it("descartar fecha a sugestão e deixa o texto como está", async () => {
    comIa(true)
    comSugestao(MELHORADO)
    const { usar } = renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))
    await userEvent.click(await screen.findByRole("button", { name: "Descartar" }))

    expect(screen.queryByText(MELHORADO)).not.toBeInTheDocument()
    expect(usar).not.toHaveBeenCalled()
  })

  it("quando a sugestão é igual ao que foi escrito, diz que a IA não mudou nada, sem afirmar que o texto está bom, e não oferece trocar", async () => {
    comIa(true)
    // Só espaço e quebra de linha mudam: para quem lê, é o mesmo texto.
    comSugestao(`  ${ESCRITO}\n`)
    renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))

    expect(await screen.findByText(/A IA não sugeriu mudanças/)).toBeInTheDocument()
    // Não afirma que o texto está bom: o modelo pode só não ter conseguido melhorar (gírias, abreviações).
    expect(screen.getByText(/Isso não quer dizer que ele esteja bem escrito/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Usar sugestão" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(screen.queryByText(/A IA não sugeriu mudanças/)).not.toBeInTheDocument()
  })

  it("a recusa do servidor por não conseguir manter os fatos mantém o texto e diz isso com palavras de quem escreve", async () => {
    comIa(true)
    recusa(502, "AI_GENERATED_DRAFT_REJECTED", "O rascunho gerado não pôde ser aceito com segurança.")
    const { usar } = renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))

    expect(
      await screen.findByText("Não foi possível melhorar este texto sem mudar o que ele diz. O seu texto foi mantido."),
    ).toBeInTheDocument()
    expect(usar).not.toHaveBeenCalled()
  })

  it("as demais recusas chegam com a mensagem do servidor, e um novo pedido limpa a anterior", async () => {
    comIa(true)
    recusa(429, "AI_BUSY", "Já existe uma geração em andamento. Aguarde alguns segundos.")
    renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))
    expect(await screen.findByText("Já existe uma geração em andamento. Aguarde alguns segundos.")).toBeInTheDocument()

    comSugestao(MELHORADO)
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))

    expect(await screen.findByText(MELHORADO)).toBeInTheDocument()
    expect(screen.queryByText(/Já existe uma geração em andamento/)).not.toBeInTheDocument()
  })

  it("enquanto a IA responde, o botão diz que está melhorando e não aceita outro clique", async () => {
    comIa(true)
    let liberar: () => void = () => {}
    const espera = new Promise<void>((resolve) => {
      liberar = resolve
    })
    let pedidos = 0
    servidor.use(
      http.post(ROTA, async () => {
        pedidos += 1
        await espera
        return HttpResponse.json({ text: MELHORADO })
      }),
    )
    renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))
    const ocupado = await screen.findByRole("button", { name: "Melhorando..." })
    expect(ocupado).toBeDisabled()
    // A IA trabalhando, nas cores da marca, no lugar de só o rótulo do botão (§107).
    expect(screen.getByRole("status")).toHaveTextContent("Melhorando a redação com IA.")
    await userEvent.click(ocupado)
    expect(pedidos).toBe(1)

    liberar()
    expect(await screen.findByText(MELHORADO)).toBeInTheDocument()
  })

  it("com o limite do plano esgotado, a linha de erro não repete o aviso, que abre sozinho (§109)", async () => {
    comIa(true)
    recusa(402, "AI_BUDGET_EXHAUSTED", "O orçamento de IA da organização já foi consumido neste período.")
    renderizarMelhoria()

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled())
    expect(screen.queryByText(/orçamento de IA/)).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Sugestão de redação" })).not.toBeInTheDocument()
  })
})
