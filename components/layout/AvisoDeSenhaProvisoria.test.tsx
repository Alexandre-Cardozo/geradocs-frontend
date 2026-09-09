import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { AvisoDeSenhaProvisoria } from "@/components/layout/AvisoDeSenhaProvisoria"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O aviso de senha provisória.
 *
 * A versão anterior substituía a aplicação inteira por um formulário. Avisar em
 * vez de travar é decisão registrada (ADR-022), e o que estes testes cobram é o
 * que a troca implica: quem tem a senha sorteada continua trabalhando, e o
 * caminho da troca fica a um clique.
 */
const rota = vi.hoisted(() => ({ atual: "/processos" }))
vi.mock("next/navigation", () => ({ usePathname: () => rota.atual }))

/** @returns uma promessa que resolve quando a sessão foi de fato pedida */
function comSessao(precisaTrocar: boolean) {
  rota.atual = "/processos"
  let respondeu: () => void = () => {}
  const pedida = new Promise<void>((resolve) => {
    respondeu = resolve
  })
  servidor.use(
    http.get(`${urlDaApi}/me`, () => {
      respondeu()
      return HttpResponse.json({
        ...sessaoServidor,
        user: { ...sessaoServidor.user, passwordChangeRequired: precisaTrocar },
      })
    }),
  )
  return pedida
}

describe("aviso de senha provisória", () => {
  it("aparece para quem ainda está com a senha do sistema", async () => {
    void comSessao(true)
    renderizar(<AvisoDeSenhaProvisoria />)

    expect(await screen.findByText(/foi gerada pelo sistema/)).toBeInTheDocument()
    // O caminho da troca precisa estar aqui: sem ele o aviso vira cobrança sem
    // endereço, e a pessoa procura em Configurações.
    expect(screen.getByRole("link", { name: "Trocar senha" })).toHaveAttribute("href", "/perfil")
  })

  it("não aparece para quem já escolheu a sua", async () => {
    const sessaoPedida = comSessao(false)
    renderizar(<AvisoDeSenhaProvisoria />)

    // Sem esperar a resposta, "não apareceu" seria só "ainda não carregou".
    await sessaoPedida
    await waitFor(() =>
      expect(screen.queryByText(/foi gerada pelo sistema/)).not.toBeInTheDocument(),
    )
  })

  it("some ao ser dispensado, sem impedir o uso da plataforma", async () => {
    void comSessao(true)
    renderizar(<AvisoDeSenhaProvisoria />)
    await screen.findByText(/foi gerada pelo sistema/)

    await userEvent.click(screen.getByRole("button", { name: "Agora não" }))

    expect(screen.queryByText(/foi gerada pelo sistema/)).not.toBeInTheDocument()
  })

  it("não duplica o recado na própria tela de perfil", async () => {
    const sessaoPedida = comSessao(true)
    rota.atual = "/perfil"
    renderizar(<AvisoDeSenhaProvisoria />)

    // Mesma sessão do primeiro teste, onde o aviso aparece: o que muda é a rota.
    await sessaoPedida
    await waitFor(() =>
      expect(screen.queryByText(/foi gerada pelo sistema/)).not.toBeInTheDocument(),
    )
  })
})
