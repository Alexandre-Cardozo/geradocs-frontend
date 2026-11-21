import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { useEstadoDaIa } from "@/lib/api/hooks"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O que a tela pode prometer da IA agora (ADR-029 e ADR-064): um estado só,
 * que o "Gerar com IA" da seção e o "Melhorar a redação" do DFD compartilham.
 */
function Estado() {
  return <span data-testid="estado">{useEstadoDaIa()}</span>
}

function comIa(disponivel: boolean) {
  servidor.use(http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: disponivel })))
}

function comTeto(corpo: Record<string, unknown>) {
  servidor.use(http.get(`${urlDaApi}/organizations/:id/ai-budget`, () => HttpResponse.json(corpo)))
}

describe("estado da IA", () => {
  it("começa verificando, e sem modelo configurado é sem-modelo", async () => {
    comIa(false)
    renderizar(<Estado />)

    expect(screen.getByTestId("estado")).toHaveTextContent("verificando")
    expect(await screen.findByText("sem-modelo")).toBeInTheDocument()
  })

  it("com modelo e sem teto definido é sem-teto; com o teto consumido continua disponível (§109)", async () => {
    comIa(true)
    comTeto({ spentAmount: 0, defined: false, available: false })
    const { unmount } = renderizar(<Estado />)
    expect(await screen.findByText("sem-teto")).toBeInTheDocument()
    unmount()

    comTeto({ period: "2026-11", limitAmount: 10, spentAmount: 10, remainingAmount: 0, defined: true, available: false })
    renderizar(<Estado />)
    // O clique vai ao servidor, e a recusa abre o aviso do limite.
    expect(await screen.findByText("disponivel")).toBeInTheDocument()
  })

  it("com modelo e teto com saldo, está disponível", async () => {
    comIa(true)
    comTeto({ period: "2026-11", limitAmount: 10, spentAmount: 1, remainingAmount: 9, defined: true, available: true })
    renderizar(<Estado />)

    expect(await screen.findByText("disponivel")).toBeInTheDocument()
  })

  it("sem a sessão da pessoa ainda, não pergunta o teto — e não bloqueia por isso", async () => {
    comIa(true)
    servidor.use(http.get(`${urlDaApi}/me`, () => HttpResponse.json({ title: "Não autenticado", status: 401 }, { status: 401 })))
    renderizar(<Estado />)

    // Sem entidade não há teto a consultar: o estado é o do modelo.
    expect(await screen.findByText("disponivel")).toBeInTheDocument()
  })
})
