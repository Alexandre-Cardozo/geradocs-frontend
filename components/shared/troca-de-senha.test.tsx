import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { TrocaDeSenha } from "@/components/shared/troca-de-senha"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Trocar a própria senha.
 *
 * O piso caiu de 12 para 8 caracteres por decisão do cliente (ADR-022). O teste
 * fixa os dois lados do limite: enfraquecer um parâmetro de segurança sem
 * verificação é como ele acaba enfraquecido de novo, sem ninguém decidir.
 */
const RECEBIDA = "sorteada-16-chars"
const ESCOLHIDA = "EscolhidaPorMim2026"
const CURTA = "Curta12"

function preencher(atual: string, nova: string, confirmacao = nova) {
  return async () => {
    await userEvent.type(screen.getByLabelText(/Senha recebida/), atual)
    await userEvent.type(screen.getByLabelText(/^Nova senha/), nova)
    await userEvent.type(screen.getByLabelText(/Repita a nova senha/), confirmacao)
  }
}

const botao = () => screen.getByRole("button", { name: /Salvar nova senha/ })

describe("troca da própria senha", () => {
  it("oito caracteres bastam, e sete não", async () => {
    renderizar(<TrocaDeSenha provisoria />)

    await preencher(RECEBIDA, CURTA)()
    expect(botao()).toBeDisabled()
    expect(screen.getByText(/ao menos 8 caracteres/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^Nova senha/), "3")
    await userEvent.type(screen.getByLabelText(/Repita a nova senha/), "3")
    expect(botao()).toBeEnabled()
  })

  it("repetir a senha recebida não é trocar", async () => {
    renderizar(<TrocaDeSenha provisoria />)

    await preencher(RECEBIDA, RECEBIDA)()

    // Satisfaria a exigência sem trocar nada, e a senha continuaria sendo a que
    // outra pessoa entregou.
    expect(screen.getByText(/diferente da atual/)).toBeInTheDocument()
    expect(botao()).toBeDisabled()
  })

  it("confirmação diferente não passa", async () => {
    renderizar(<TrocaDeSenha provisoria />)

    await preencher(RECEBIDA, ESCOLHIDA, `${ESCOLHIDA}x`)()

    expect(screen.getByText(/igual à nova senha/)).toBeInTheDocument()
    expect(botao()).toBeDisabled()
  })

  it("o motivo do bloqueio é anunciado junto com o botão", async () => {
    renderizar(<TrocaDeSenha provisoria />)

    // Sem isto, quem navega por teclado ouve "desabilitado" e não descobre o
    // que falta.
    const descrito = botao().getAttribute("aria-describedby")
    expect(descrito).toBeTruthy()
    expect(document.getElementById(descrito as string)).toHaveTextContent(/senha que você recebeu/)
  })

  it("troca e limpa os campos, sem deixar a senha na tela", async () => {
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/auth/password-change`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...sessaoServidor,
          user: { ...sessaoServidor.user, passwordChangeRequired: false },
        })
      }),
    )
    renderizar(<TrocaDeSenha provisoria />)
    await preencher(RECEBIDA, ESCOLHIDA)()

    await userEvent.click(botao())

    await waitFor(() => expect(corpo.newPassword).toBe(ESCOLHIDA))
    expect(corpo.currentPassword).toBe(RECEBIDA)
    await waitFor(() => expect(screen.getByLabelText(/^Nova senha/)).toHaveValue(""))
  })

  it("a recusa do servidor aparece na tela", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/password-change`, () =>
        HttpResponse.json(
          { detail: "Credenciais inválidas.", status: 401 },
          { status: 401, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    renderizar(<TrocaDeSenha provisoria />)
    await preencher(RECEBIDA, ESCOLHIDA)()

    await userEvent.click(botao())

    expect(await screen.findByText(/Credenciais inválidas/)).toBeInTheDocument()
  })

  it("quem já tem senha própria vê o rótulo do caso dele", () => {
    renderizar(<TrocaDeSenha provisoria={false} />)

    expect(screen.getByLabelText(/Senha atual/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Senha recebida/)).not.toBeInTheDocument()
  })
})
