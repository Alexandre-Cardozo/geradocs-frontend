import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { MelhorarRedacao } from "@/components/processos/melhorar-redacao"
import { AvisoDeLimiteDaIa } from "@/components/shared/aviso-de-limite-da-ia"
import { makeQueryClient, Providers } from "@/components/shared/providers"
import { ApiError } from "@/lib/api/auth-client"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const ROTA = `${urlDaApi}/procurement-processes/${PROCESSO}/dfds/improve-problem-description`

/** A IA ligada, e o servidor recusando por limite até o limite ser renovado. */
function comLimiteEsgotadoNoClique() {
  let renovado = false
  let pedidos = 0
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: true })),
    http.post(ROTA, () => {
      pedidos += 1
      if (renovado) return HttpResponse.json({ text: "Os notebooks têm cinco anos." })
      return HttpResponse.json(
        {
          title: "Orçamento de IA indisponível",
          status: 402,
          detail: "O orçamento de IA da organização já foi consumido neste período.",
          code: "AI_BUDGET_EXHAUSTED",
        },
        { status: 402, headers: { "Content-Type": "application/problem+json" } },
      )
    }),
  )
  return { pedidos: () => pedidos, renovar: () => (renovado = true) }
}

/**
 * O aviso flutuante do limite de IA do plano (§109): a recusa por limite não
 * pode passar em silêncio, nem num toast que some.
 */
describe("aviso de limite de IA", () => {
  it("qualquer pedido à IA recusado por limite abre o aviso, com o contato da GovPro", async () => {
    const { pedidos, renovar } = comLimiteEsgotadoNoClique()
    render(
      <Providers>
        <MelhorarRedacao processoId={PROCESSO} texto="os notebooks tem 5 anos" onUsar={vi.fn()} />
      </Providers>,
    )

    const botao = await screen.findByRole("button", { name: "Melhorar a redação" })
    await waitFor(() => expect(botao).toBeEnabled())
    await userEvent.click(botao)

    const aviso = await screen.findByRole("alertdialog", { name: "Limite de IA Atingido" })
    expect(aviso).toHaveAccessibleDescription(/limite de geração por IA do plano contratado/)
    expect(aviso).toHaveTextContent("Para contratar mais limite de uso, fale com a GovPro.")
    expect(aviso).toHaveTextContent("A redação manual continua disponível.")
    const contato = screen.getByRole("link", { name: "Falar com a GovPro" })
    expect(contato).toHaveAttribute("href", expect.stringMatching(/^mailto:contato@govpro\.com\.br\?subject=/))
    // O foco vai para a saída do aviso.
    expect(contato).toHaveFocus()

    await userEvent.click(screen.getByRole("button", { name: "Entendi" }))
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()

    // O botão não desliga: tentar de novo abre o aviso de novo.
    expect(screen.getByRole("button", { name: "Melhorar a redação" })).toBeEnabled()
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))
    expect(await screen.findByRole("alertdialog", { name: "Limite de IA Atingido" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Entendi" }))

    // Com o limite renovado, o clique seguinte já funciona, sem recarregar a tela.
    renovar()
    await userEvent.click(screen.getByRole("button", { name: "Melhorar a redação" }))
    expect(await screen.findByRole("region", { name: "Sugestão de redação" })).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(pedidos()).toBe(3)
  })

  it("outra recusa da IA não abre o aviso: ela tem mensagem própria", async () => {
    servidor.use(
      http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: true })),
      http.post(ROTA, () =>
        HttpResponse.json(
          { title: "Ocupada", status: 429, detail: "Já existe uma geração em andamento.", code: "AI_BUSY" },
          { status: 429, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    render(
      <Providers>
        <MelhorarRedacao processoId={PROCESSO} texto="os notebooks tem 5 anos" onUsar={vi.fn()} />
      </Providers>,
    )

    const botao = await screen.findByRole("button", { name: "Melhorar a redação" })
    await waitFor(() => expect(botao).toBeEnabled())
    await userEvent.click(botao)

    expect(await screen.findByText("Já existe uma geração em andamento.")).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("o cliente avisa só no limite; sem quem ouça, não quebra", async () => {
    const ouvinte = vi.fn()
    const cliente = makeQueryClient(ouvinte)
    const falhar = (erro: Error) =>
      cliente
        .getMutationCache()
        .build(cliente, { mutationFn: () => Promise.reject(erro), retry: false })
        .execute(undefined)
        .catch(() => undefined)

    await falhar(new ApiError("Ocupada.", 429, "AI_BUSY"))
    expect(ouvinte).not.toHaveBeenCalled()
    await falhar(new ApiError("Acabou.", 402, "AI_BUDGET_EXHAUSTED"))
    expect(ouvinte).toHaveBeenCalledTimes(1)

    const semOuvinte = makeQueryClient()
    await semOuvinte
      .getMutationCache()
      .build(semOuvinte, { mutationFn: () => Promise.reject(new ApiError("Acabou.", 402)), retry: false })
      .execute(undefined)
      .catch(() => undefined)
  })

  it("Esc fecha, o fundo fecha, e o Tab não sai do aviso", async () => {
    const fechar = vi.fn()
    const { unmount } = render(<AvisoDeLimiteDaIa onFechar={fechar} />)
    const contato = screen.getByRole("link", { name: "Falar com a GovPro" })
    const entendi = screen.getByRole("button", { name: "Entendi" })

    expect(contato).toHaveFocus()
    await userEvent.tab()
    expect(entendi).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(contato).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(entendi).toHaveFocus()
    await userEvent.tab()
    expect(contato).toHaveFocus()
    // Outra tecla não fecha.
    await userEvent.keyboard("a")
    expect(fechar).not.toHaveBeenCalled()

    await userEvent.keyboard("{Escape}")
    expect(fechar).toHaveBeenCalledTimes(1)

    const fundo = document.querySelector('[aria-hidden="true"].absolute') as HTMLElement
    await userEvent.click(fundo)
    expect(fechar).toHaveBeenCalledTimes(2)
    unmount()
  })
})
