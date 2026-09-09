import { describe, expect, it, vi } from "vitest"

import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * As credenciais de primeiro acesso.
 *
 * A senha existe fora do hash só neste instante. Quem fecha a caixa sem anotar
 * deixa a pessoa sem acesso — foi o que aconteceu no primeiro uso real, porque
 * o aviso vivia dentro do painel de cadastro e o sucesso fechava o painel.
 */
const SENHA = "aBcD3fGh4JkLmN5p"
const CPF = "11144477735"

function copiadorFalso() {
  const escrever = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText: escrever } })
  return escrever
}

describe("credenciais de primeiro acesso", () => {
  it("mostra a chave de acesso junto com a senha", () => {
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave={CPF}
        senha={SENHA}
        titulo="Credenciais de primeiro acesso"
        onFechar={() => {}}
      />,
    )

    // Só a senha não basta: quem cadastra precisa saber que se entra com o CPF.
    expect(screen.getByText("111.444.777-35")).toBeInTheDocument()
    expect(screen.getByText(SENHA)).toBeInTheDocument()
    expect(screen.getByText(/uma única vez/)).toBeInTheDocument()
  })

  it("copia as duas coisas de uma vez", async () => {
    const escrever = copiadorFalso()
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave={CPF}
        senha={SENHA}
        titulo="Credenciais de primeiro acesso"
        onFechar={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Copiar acesso e senha/ }))

    expect(escrever).toHaveBeenCalledWith(`Acesso: 111.444.777-35\nSenha: ${SENHA}`)
    expect(await screen.findByRole("button", { name: "Copiadas" })).toBeInTheDocument()
  })

  it("copia só a senha quando é o que se quer colar", async () => {
    const escrever = copiadorFalso()
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave={CPF}
        senha={SENHA}
        titulo="Senha redefinida"
        onFechar={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Copiar só a senha/ }))

    expect(escrever).toHaveBeenCalledWith(SENHA)
  })

  it("CPF mascarado pelo servidor é mostrado como veio", () => {
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave="***.***.***-35"
        senha={SENHA}
        titulo="Senha redefinida"
        onFechar={() => {}}
      />,
    )

    // Formatar o que já vem mascarado produziria "***.***.***-35" embaralhado.
    expect(screen.getByText("***.***.***-35")).toBeInTheDocument()
  })

  it("falha ao copiar é dita, e não engolida", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("sem permissão")) },
    })
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave={CPF}
        senha={SENHA}
        titulo="Senha redefinida"
        onFechar={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Copiar acesso e senha/ }))

    // Falhar em silêncio deixaria a pessoa achando que copiou, e a senha some
    // ao fechar a caixa.
    expect(screen.queryByRole("button", { name: "Copiadas" })).not.toBeInTheDocument()
  })

  it("fecha quando quem cadastrou já anotou", async () => {
    const fechar = vi.fn()
    renderizar(
      <CredenciaisIniciais
        nome="Maria Costa"
        chave={CPF}
        senha={SENHA}
        titulo="Senha redefinida"
        onFechar={fechar}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Já anotei" }))

    expect(fechar).toHaveBeenCalled()
  })
})
