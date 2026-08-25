import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import MeuPerfil from "@/app/(app)/perfil/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Meu Perfil.
 *
 * Antes de 25/08/2026 esta tela editava um objeto em memória: recarregar
 * apagava tudo, e o administrador nem chegava até ela — o menu escondia o link
 * para o perfil dele. Agora o que é da pessoa (foto e senha) fala com o
 * servidor, e o que é do registro (nome, CPF, matrícula) é leitura.
 */
const ID = sessaoServidor.user.id

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => "blob:foto"),
    revokeObjectURL: vi.fn(),
  })
})

function semFoto() {
  servidor.use(
    http.get(`${urlDaApi}/users/:id/avatar`, () => new HttpResponse(null, { status: 404 })),
  )
}

function comFoto() {
  servidor.use(
    http.get(`${urlDaApi}/users/:id/avatar`, () =>
      HttpResponse.arrayBuffer(new Uint8Array([1, 2]).buffer, {
        headers: { "Content-Type": "image/png" },
      }),
    ),
  )
}

const png = () => new File([new Uint8Array([137, 80])], "rosto.png", { type: "image/png" })

describe("meu perfil", () => {
  it("mostra o cadastro como leitura, e diz quem o altera", async () => {
    semFoto()
    renderizar(<MeuPerfil />)

    // O nome aparece duas vezes: no cartão de identidade e na lista de dados.
    expect(await screen.findAllByText("Maria Costa Andrade")).toHaveLength(2)
    expect(screen.getByText("MAT-4471")).toBeInTheDocument()
    expect(screen.getByText(/Quem os altera é a administração/)).toBeInTheDocument()
    // Sem campo editável de cadastro: prometer edição que não existe foi o
    // defeito da versão anterior.
    expect(screen.queryByRole("button", { name: /Salvar Alterações/ })).not.toBeInTheDocument()
  })

  it("quem não tem foto vê 'Adicionar foto' e nenhum botão de remover", async () => {
    semFoto()
    renderizar(<MeuPerfil />)

    expect(await screen.findByRole("button", { name: /Adicionar foto/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remover/ })).not.toBeInTheDocument()
  })

  it("envia a foto escolhida e passa a oferecer a troca", async () => {
    semFoto()
    let enviou = false
    servidor.use(
      http.put(`${urlDaApi}/me/avatar`, () => {
        enviou = true
        return HttpResponse.json({
          mediaType: "image/png",
          byteSize: 2,
          updatedAt: "2026-08-25T12:00:00Z",
        })
      }),
    )
    renderizar(<MeuPerfil />)
    await screen.findByRole("button", { name: /Adicionar foto/ })

    await userEvent.upload(screen.getByLabelText(/Escolher foto de perfil/), png())

    await waitFor(() => expect(enviou).toBe(true))
  })

  it("recusa arquivo grande antes de gastar a subida", async () => {
    semFoto()
    let enviou = false
    servidor.use(
      http.put(`${urlDaApi}/me/avatar`, () => {
        enviou = true
        return HttpResponse.json({ mediaType: "image/png", byteSize: 1, updatedAt: "" })
      }),
    )
    renderizar(<MeuPerfil />)
    await screen.findByRole("button", { name: /Adicionar foto/ })

    const gigante = new File([new Uint8Array(512 * 1024 + 1)], "grande.png", { type: "image/png" })
    await userEvent.upload(screen.getByLabelText(/Escolher foto de perfil/), gigante)

    // Num escritório de prefeitura a subida não é rápida: mandar para o servidor
    // recusar custaria a viagem inteira.
    await waitFor(() => expect(enviou).toBe(false))
  })

  it("quem tem foto pode removê-la", async () => {
    comFoto()
    let removeu = false
    servidor.use(
      http.delete(`${urlDaApi}/me/avatar`, () => {
        removeu = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar(<MeuPerfil />)

    await userEvent.click(await screen.findByRole("button", { name: /Remover/ }))

    await waitFor(() => expect(removeu).toBe(true))
  })

  it("a foto guardada aparece no círculo", async () => {
    comFoto()
    renderizar(<MeuPerfil />)

    const imagem = await screen.findByAltText(/Foto de perfil de/)
    expect(imagem).toHaveAttribute("src", expect.stringContaining("blob:foto"))
  })

  it("o formulário de troca de senha fica na própria tela", async () => {
    semFoto()
    renderizar(<MeuPerfil />)

    expect(await screen.findByRole("button", { name: /Salvar nova senha/ })).toBeInTheDocument()
  })

  it("quem ainda está com a senha do sistema é avisado aqui também", async () => {
    semFoto()
    servidor.use(
      http.get(`${urlDaApi}/me`, () =>
        HttpResponse.json({
          ...sessaoServidor,
          user: { ...sessaoServidor.user, passwordChangeRequired: true },
        }),
      ),
    )
    renderizar(<MeuPerfil />)

    expect(await screen.findByText(/Escolha uma senha só sua abaixo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha recebida/)).toBeInTheDocument()
  })

  it("busca a foto da própria pessoa, e não de outra", async () => {
    let pedido = ""
    servidor.use(
      http.get(`${urlDaApi}/users/:id/avatar`, ({ params }) => {
        pedido = String(params.id)
        return new HttpResponse(null, { status: 404 })
      }),
    )
    renderizar(<MeuPerfil />)

    await waitFor(() => expect(pedido).toBe(ID))
  })
})
