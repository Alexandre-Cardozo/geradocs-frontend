import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TetoDeIa } from "@/components/admin/teto-de-ia"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O teto mensal de IA na tela das entidades (ADR-064).
 *
 * <p>Entidade sem teto não consegue gerar com IA, e esta é a única tela em que
 * isso se resolve — então o estado "sem teto" diz o que acontece, e não é um
 * traço.
 */
// O toast vive no provider do layout, fora deste componente: confere-se o que
// foi pedido para exibir.
const avisos = vi.hoisted(() => vi.fn())
vi.mock("@/components/shared/providers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/shared/providers")>()),
  useToast: () => avisos,
}))

beforeEach(() => avisos.mockClear())

const ENTIDADE = "615aa89a-215e-4591-add9-0264c0b4639e"

function comTeto(corpo: Record<string, unknown>) {
  servidor.use(http.get(`${urlDaApi}/organizations/${ENTIDADE}/ai-budget`, () => HttpResponse.json(corpo)))
}

describe("teto de IA da entidade", () => {
  it("sem teto, diz que a IA fica indisponível até definir", async () => {
    comTeto({ spentAmount: 0, defined: false, available: false })
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    expect(await screen.findByText("Sem teto")).toBeInTheDocument()
    expect(screen.getByText(/indisponível até definir/)).toBeInTheDocument()
  })

  it("com teto, mostra o valor por mês e o gasto, em reais", async () => {
    comTeto({ period: "2026-11", limitAmount: 25.5, spentAmount: 3, remainingAmount: 22.5, defined: true, available: true })
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    expect(await screen.findByText("R$ 25,50 por mês")).toBeInTheDocument()
    expect(screen.getByText("gasto R$ 3,00")).toBeInTheDocument()
    expect(screen.queryByText("Esgotado")).not.toBeInTheDocument()
  })

  it("teto consumido aparece como esgotado", async () => {
    comTeto({ period: "2026-11", limitAmount: 10, spentAmount: 10, remainingAmount: 0, defined: true, available: false })
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    expect(await screen.findByText("Esgotado")).toBeInTheDocument()
  })

  it("define o teto: manda o valor em reais e avisa que atualizou", async () => {
    comTeto({ spentAmount: 0, defined: false, available: false })
    let enviado: unknown
    servidor.use(
      http.put(`${urlDaApi}/organizations/${ENTIDADE}/ai-budget`, async ({ request }) => {
        enviado = await request.json()
        return HttpResponse.json({
          period: "2026-11",
          limitAmount: 25.5,
          spentAmount: 0,
          remainingAmount: 25.5,
          defined: true,
          available: true,
        })
      }),
    )
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    await userEvent.click(await screen.findByRole("button", { name: /Definir o teto mensal de IA de Prefeitura de Teste/ }))
    await userEvent.type(screen.getByRole("textbox", { name: /Teto mensal de IA de Prefeitura de Teste/ }), "25,50")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(enviado).toEqual({ limitAmount: 25.5 }))
    await waitFor(() => expect(avisos).toHaveBeenCalledWith("Teto de IA de Prefeitura de Teste atualizado."))
  })

  it("não salva com o campo vazio", async () => {
    comTeto({ spentAmount: 0, defined: false, available: false })
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    await userEvent.click(await screen.findByRole("button", { name: /Definir o teto mensal/ }))

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  it("mostra o motivo do servidor quando a definição é recusada", async () => {
    comTeto({ spentAmount: 0, defined: false, available: false })
    servidor.use(
      http.put(`${urlDaApi}/organizations/${ENTIDADE}/ai-budget`, () =>
        HttpResponse.json({ detail: "Acesso negado." }, { status: 403 }),
      ),
    )
    renderizar(<TetoDeIa entidadeId={ENTIDADE} nome="Prefeitura de Teste" />)

    await userEvent.click(await screen.findByRole("button", { name: /Definir o teto mensal/ }))
    await userEvent.type(screen.getByRole("textbox", { name: /Teto mensal de IA/ }), "10")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(avisos).toHaveBeenCalledWith("Acesso negado."))
  })
})
