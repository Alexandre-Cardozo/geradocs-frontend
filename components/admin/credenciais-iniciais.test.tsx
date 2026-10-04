import { describe, expect, it, vi } from "vitest"

import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { porTextoInteiro, renderizar, screen, userEvent } from "@/lib/teste/renderizar"

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

/** A senha aparece em blocos de quatro: o texto está no `code`, não num nó só. */
function senhaNaTela(senha: string) {
  return screen.getByText(porTextoInteiro(senha))
}

function credenciais(props: Partial<Parameters<typeof CredenciaisIniciais>[0]> = {}) {
  return (
    <CredenciaisIniciais
      nome="Maria Costa"
      chave={CPF}
      senha={SENHA}
      titulo="Credenciais de Primeiro Acesso"
      onFechar={() => {}}
      {...props}
    />
  )
}

describe("credenciais de primeiro acesso", () => {
  it("mostra a chave de acesso junto com a senha", () => {
    renderizar(credenciais())

    // Só a senha não basta: quem cadastra precisa saber que se entra com o CPF.
    expect(screen.getByText("111.444.777-35")).toBeInTheDocument()
    expect(senhaNaTela(SENHA)).toBeInTheDocument()
    expect(screen.getByText(/só agora/)).toBeInTheDocument()
  })

  it("separa a senha em blocos para ditar, sem pôr espaço no texto", () => {
    renderizar(credenciais())

    // Espaço de verdade iria junto numa cópia à mão e a senha deixaria de valer.
    expect(senhaNaTela(SENHA).textContent).not.toContain(" ")
    expect(screen.getByText("aBcD")).toBeInTheDocument()
    expect(screen.getByText("mN5p")).toBeInTheDocument()
  })

  it("título e nome não se misturam", () => {
    renderizar(credenciais())

    expect(screen.getByRole("heading", { name: "Credenciais de Primeiro Acesso" })).toBeInTheDocument()
    expect(screen.getByText("Maria Costa")).toBeInTheDocument()
  })

  it("recebe o foco ao aparecer, porque nasce fora da vista", () => {
    renderizar(credenciais())

    expect(screen.getByRole("region", { name: "Credenciais de Primeiro Acesso" })).toHaveFocus()
  })

  it("copia uma mensagem pronta com endereço, login e senha", async () => {
    const escrever = copiadorFalso()
    renderizar(credenciais())

    await userEvent.click(screen.getByRole("button", { name: /Copiar Mensagem para Envio/ }))

    const mensagem = escrever.mock.calls[0]?.[0] as string
    expect(mensagem).toContain(`${window.location.origin}/login`)
    expect(mensagem).toContain("Login (CPF): 111.444.777-35")
    expect(mensagem).toContain(`Senha provisória: ${SENHA}`)
    expect(await screen.findByRole("button", { name: /Mensagem Copiada/ })).toBeInTheDocument()
  })

  it("copia só a senha quando é o que se quer colar", async () => {
    const escrever = copiadorFalso()
    renderizar(credenciais({ titulo: "Senha Redefinida" }))

    await userEvent.click(screen.getByRole("button", { name: "Copiar Senha" }))

    expect(escrever).toHaveBeenCalledWith(SENHA)
    expect(await screen.findByRole("button", { name: "Senha copiado" })).toBeInTheDocument()
  })

  it("copia só o CPF, formatado", async () => {
    const escrever = copiadorFalso()
    renderizar(credenciais())

    await userEvent.click(screen.getByRole("button", { name: "Copiar CPF" }))

    expect(escrever).toHaveBeenCalledWith("111.444.777-35")
  })

  it("CPF mascarado pelo servidor é mostrado como veio, e não se oferece para copiar", () => {
    renderizar(credenciais({ chave: "***.***.***-35", titulo: "Senha Redefinida" }))

    // Formatar o que já vem mascarado produziria "***.***.***-35" embaralhado.
    expect(screen.getByText("***.***.***-35")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copiar CPF" })).not.toBeInTheDocument()
  })

  it("falha ao copiar é dita, e não engolida", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("sem permissão")) },
    })
    renderizar(credenciais({ titulo: "Senha Redefinida" }))

    await userEvent.click(screen.getByRole("button", { name: /Copiar Mensagem para Envio/ }))

    // Falhar em silêncio deixaria a pessoa achando que copiou, e a senha some
    // ao fechar a caixa.
    expect(screen.queryByRole("button", { name: /Mensagem Copiada/ })).not.toBeInTheDocument()
  })

  it("fecha direto quando algo já foi copiado", async () => {
    copiadorFalso()
    const fechar = vi.fn()
    renderizar(credenciais({ onFechar: fechar }))

    await userEvent.click(screen.getByRole("button", { name: "Copiar Senha" }))
    await userEvent.click(screen.getByRole("button", { name: "Já anotei" }))

    expect(fechar).toHaveBeenCalled()
  })

  it("fechar sem ter copiado nada pede confirmação, mas não impede", async () => {
    const fechar = vi.fn()
    renderizar(credenciais({ onFechar: fechar }))

    await userEvent.click(screen.getByRole("button", { name: "Já anotei" }))
    // Anotar à mão é legítimo; o que se evita é o clique no reflexo.
    expect(fechar).not.toHaveBeenCalled()
    expect(screen.getByText(/Fechar mesmo assim\?/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Fechar sem Copiar" }))
    expect(fechar).toHaveBeenCalled()
  })

  it("voltar da confirmação mantém a senha na tela", async () => {
    const fechar = vi.fn()
    renderizar(credenciais({ onFechar: fechar }))

    await userEvent.click(screen.getByRole("button", { name: "Já anotei" }))
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }))

    expect(fechar).not.toHaveBeenCalled()
    expect(senhaNaTela(SENHA)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Já anotei" })).toBeInTheDocument()
  })
})
