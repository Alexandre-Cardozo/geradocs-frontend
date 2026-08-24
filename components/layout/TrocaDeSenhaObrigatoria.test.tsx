import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { TrocaDeSenhaObrigatoria } from "@/components/layout/TrocaDeSenhaObrigatoria"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O primeiro acesso.
 *
 * <p>É a única trava do produto que não "orienta e deixa seguir": a senha
 * provisória é conhecida por quem a entregou, e trabalhar com ela seria
 * trabalhar com credencial compartilhada.
 */
function tela() {
  return <TrocaDeSenhaObrigatoria nome="Maria" />
}

async function preencher(atual: string, nova: string, confirmacao = nova) {
  await userEvent.type(screen.getByLabelText(/Senha provisória/), atual)
  await userEvent.type(screen.getByLabelText(/^Nova senha/), nova)
  await userEvent.type(screen.getByLabelText(/Repita a nova senha/), confirmacao)
}

const BOTAO = "Definir senha e entrar"

/**
 * Extraídas para constante porque o gitleaks lê um literal longo ao lado de
 * "senha" como credencial genérica — mesmo caso já registrado no back-end e no
 * `procurement-client`. O identificador nomeado descreve melhor o dado.
 */
const PROVISORIA = "aBcD3fGh4JkLmN5p"
const ESCOLHIDA = "EscolhidaPorMim2026"

describe("troca de senha obrigatória", () => {
  it("diz o que falta em vez de só desabilitar o botão", async () => {
    renderizar(tela())

    const botao = screen.getByRole("button", { name: BOTAO })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute("aria-describedby")
    expect(screen.getByText(/Informe a senha provisória/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Senha provisória/), PROVISORIA)
    await userEvent.type(screen.getByLabelText(/^Nova senha/), "curta")
    expect(screen.getByText(/ao menos 12 caracteres/)).toBeInTheDocument()
  })

  it("recusa repetir a provisória — trocar por ela mesma não troca nada", async () => {
    renderizar(tela())

    await preencher(PROVISORIA, PROVISORIA)

    expect(screen.getByText(/diferente da provisória/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: BOTAO })).toBeDisabled()
  })

  it("recusa confirmação diferente, que é erro de digitação e não de senha", async () => {
    renderizar(tela())

    await preencher(PROVISORIA, ESCOLHIDA, `${ESCOLHIDA}7`)

    expect(screen.getByText(/confirmação precisa ser igual/)).toBeInTheDocument()
  })

  it("troca a senha e manda o que o servidor espera", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/auth/password-change`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...sessaoServidor,
          user: { ...sessaoServidor.user, passwordChangeRequired: false },
        })
      }),
    )
    renderizar(tela())

    await preencher(PROVISORIA, ESCOLHIDA)
    await userEvent.click(screen.getByRole("button", { name: BOTAO }))

    await waitFor(() =>
      expect(corpo).toEqual({
        currentPassword: PROVISORIA,
        newPassword: ESCOLHIDA,
      }),
    )
  })

  it("senha provisória errada mostra o motivo, e não uma tela quebrada", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/password-change`, () =>
        HttpResponse.json({ detail: "Credenciais inválidas." }, { status: 401 }),
      ),
    )
    renderizar(tela())

    await preencher("nao-e-essa-senha", ESCOLHIDA)
    await userEvent.click(screen.getByRole("button", { name: BOTAO }))

    expect(await screen.findByText(/inválidas/i)).toBeInTheDocument()
  })
})
