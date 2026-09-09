import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { autenticacao } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

async function carregarClienteLimpo() {
  vi.resetModules()
  servidor.use(http.post(`${urlDaApi}/auth/refresh`, () => HttpResponse.json(autenticacao)))
  return import("@/lib/api/avatar-client")
}

afterEach(() => vi.resetModules())

const PNG = new File([new Uint8Array([137, 80, 78, 71])], "rosto.png", { type: "image/png" })

describe("enviarFotoDePerfil", () => {
  it("manda o arquivo no campo `file`, sem Content-Type nosso", async () => {
    servidor.use(
      http.put(`${urlDaApi}/me/avatar`, () =>
        HttpResponse.json({
          mediaType: "image/png",
          byteSize: 4,
          updatedAt: "2026-08-25T12:00:00Z",
        }),
      ),
    )
    const { enviarFotoDePerfil } = await carregarClienteLimpo()
    // O corpo é inspecionado aqui, e não no handler: consumir um corpo
    // multipart com File no jsdom trava a leitura e o teste estoura o prazo.
    const espiao = vi.spyOn(globalThis, "fetch")

    const meta = await enviarFotoDePerfil(PNG)

    const enviado = espiao.mock.calls.at(-1)?.[1]?.body as FormData
    expect(enviado).toBeInstanceOf(FormData)
    expect((enviado.get("file") as File).name).toBe("rosto.png")
    expect(meta.byteSize).toBe(4)
    // Quem escreve o `boundary` é o navegador. Fixar "application/json" aqui
    // quebraria todo envio de arquivo, e o erro só apareceria em uso.
    const cabecalhos = espiao.mock.calls.at(-1)?.[1]?.headers as Record<string, string>
    expect(cabecalhos).not.toHaveProperty("Content-Type")
    espiao.mockRestore()
  })

  it("erro do servidor chega com a mensagem dele", async () => {
    servidor.use(
      http.put(`${urlDaApi}/me/avatar`, () =>
        HttpResponse.json(
          { detail: "A foto precisa ser PNG, JPEG ou WebP.", status: 400 },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    const { enviarFotoDePerfil } = await carregarClienteLimpo()

    await expect(enviarFotoDePerfil(PNG)).rejects.toThrow(/PNG, JPEG ou WebP/)
  })
})

describe("removerFotoDePerfil", () => {
  it("apaga e não devolve corpo", async () => {
    let metodo = ""
    servidor.use(
      http.delete(`${urlDaApi}/me/avatar`, ({ request }) => {
        metodo = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { removerFotoDePerfil } = await carregarClienteLimpo()

    await expect(removerFotoDePerfil()).resolves.toBeUndefined()
    expect(metodo).toBe("DELETE")
  })
})

describe("obterFotoDePerfil", () => {
  it("busca a foto da pessoa indicada", async () => {
    let caminho = ""
    servidor.use(
      http.get(`${urlDaApi}/users/:id/avatar`, ({ request, params }) => {
        caminho = String(params.id)
        void request
        return HttpResponse.arrayBuffer(new Uint8Array([1]).buffer)
      }),
    )
    const { obterFotoDePerfil } = await carregarClienteLimpo()

    expect(await obterFotoDePerfil("u-42")).toBeInstanceOf(Blob)
    expect(caminho).toBe("u-42")
  })

  it("quem não pôs foto devolve nulo, e a tela cai para as iniciais", async () => {
    servidor.use(
      http.get(`${urlDaApi}/users/:id/avatar`, () => new HttpResponse(null, { status: 404 })),
    )
    const { obterFotoDePerfil } = await carregarClienteLimpo()

    expect(await obterFotoDePerfil("u-42")).toBeNull()
  })
})
