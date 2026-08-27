import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BaixarDfd } from "@/components/processos/baixar-dfd"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Rebaixar o DFD anexado.
 *
 * <p>O download passa pela requisição autenticada, e não por uma âncora: `href`
 * direto na rota do arquivo daria 401, e a pessoa veria um download quebrado
 * sem nenhuma explicação.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const PDF = "application/pdf"

const criou = vi.fn(() => "blob:dfd")
const revogou = vi.fn()

beforeEach(() => {
  criou.mockClear()
  revogou.mockClear()
  Object.assign(URL, { createObjectURL: criou, revokeObjectURL: revogou })
})

describe("baixar o DFD", () => {
  it("busca os bytes pela rota autenticada, e devolve a memória depois", async () => {
    let pediu = false
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId/file`, () => {
        pediu = true
        return HttpResponse.text("%PDF-1.7 assinado", { headers: { "Content-Type": PDF } })
      }),
    )
    renderizar(<BaixarDfd processoId={PROCESSO} dfdId="d-1" nomeDoArquivo="DFD-v1.pdf" />)

    await userEvent.click(screen.getByRole("button", { name: /Baixar DFD-v1.pdf/ }))

    await waitFor(() => expect(pediu).toBe(true))
    expect(criou).toHaveBeenCalled()
    // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
    expect(revogou).toHaveBeenCalledWith("blob:dfd")
  })

  it("a recusa não deixa o botão preso em “Baixando...”", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId/file`, () =>
        HttpResponse.json(
          { detail: "Arquivo do DFD não encontrado.", status: 404 },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    renderizar(<BaixarDfd processoId={PROCESSO} dfdId="d-1" nomeDoArquivo="DFD-v1.pdf" />)

    await userEvent.click(screen.getByRole("button", { name: /Baixar DFD-v1.pdf/ }))

    // O aviso vai para o toast (fora deste componente); o que se verifica aqui
    // é que o botão volta ao normal depois da recusa.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Baixar DFD-v1.pdf/ })).toBeEnabled(),
    )
    expect(screen.getByRole("button", { name: /Baixar DFD-v1.pdf/ })).toHaveTextContent("Baixar")
    expect(criou).not.toHaveBeenCalled()
  })
})
