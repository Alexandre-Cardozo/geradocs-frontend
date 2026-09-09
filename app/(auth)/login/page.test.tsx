import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TipoIdentificador } from "@/lib/auth/identificador"
import { DESCRITORES } from "@/lib/auth/identificador"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A tela de login não sabe qual é a chave de identificação — ela renderiza o
 * descritor (ADR-015). Este teste troca a chave e verifica que rótulo,
 * placeholder, teclado e o valor enviado à API acompanham, sem que uma linha da
 * tela mude. É o que sustenta a promessa de que trocar a chave custa uma
 * variável de ambiente.
 */
const configurado = vi.hoisted(() => ({ tipo: "CPF" as TipoIdentificador }))

vi.mock("@/lib/auth/identificador", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("@/lib/auth/identificador")>()
  return {
    ...real,
    get IDENTIFICADOR() {
      return real.DESCRITORES[configurado.tipo]
    },
    mensagemCredencialRecusada: (descritor = real.DESCRITORES[configurado.tipo]) =>
      `${descritor.rotulo} ou senha inválida.`,
  }
})

const replace = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

const DIGITADO: Record<TipoIdentificador, { valor: string; enviado: string }> = {
  CPF: { valor: "52998224725", enviado: "52998224725" },
  EMAIL: {
    valor: "Maria.Costa@Ecoporanga.ES.GOV.BR",
    enviado: "maria.costa@ecoporanga.es.gov.br",
  },
  REGISTRATION_NUMBER: { valor: "mat-4471", enviado: "MAT-4471" },
}

const TIPOS = Object.keys(DESCRITORES) as TipoIdentificador[]

async function importarTela() {
  const { default: Login } = await import("./page")
  return Login
}

describe("tela de login", () => {
  beforeEach(() => {
    replace.mockClear()
    // Sem sessão: com o /me feliz do handler padrão a tela redirecionaria antes
    // de renderizar o formulário.
    servidor.use(http.get(`${urlDaApi}/me`, () => new HttpResponse(null, { status: 401 })))
  })

  it.each(TIPOS)("renderiza o campo a partir do descritor de %s", async (tipo) => {
    configurado.tipo = tipo
    const descritor = DESCRITORES[tipo]
    const Login = await importarTela()

    renderizar(<Login />)

    const campo = await screen.findByPlaceholderText(descritor.placeholder)
    expect(screen.getByText(descritor.rotulo)).toBeInTheDocument()
    expect(campo).toHaveAttribute("inputmode", descritor.inputMode)
    expect(campo).toHaveAttribute("autocomplete", descritor.autoComplete)
  })

  it.each(TIPOS)("envia à API o valor normalizado da chave %s", async (tipo) => {
    configurado.tipo = tipo
    const descritor = DESCRITORES[tipo]
    const { valor, enviado } = DIGITADO[tipo]
    let corpo: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return new HttpResponse(null, { status: 401 })
      }),
    )
    const Login = await importarTela()

    renderizar(<Login />)
    await userEvent.type(await screen.findByPlaceholderText(descritor.placeholder), valor)
    await userEvent.type(screen.getByPlaceholderText("Sua senha"), "UmaSenhaSegura!2026")
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }))

    // `identifier`, e não `cpf`: o contrato antigo continua aceito no back-end
    // durante a transição, mas o front já migrou.
    await waitFor(() => expect(corpo.identifier).toBe(enviado))
  })

  it.each(TIPOS)("recusa credencial citando %s, e não CPF", async (tipo) => {
    configurado.tipo = tipo
    const descritor = DESCRITORES[tipo]
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () => new HttpResponse(null, { status: 401 })),
    )
    const Login = await importarTela()

    renderizar(<Login />)
    await userEvent.type(
      await screen.findByPlaceholderText(descritor.placeholder),
      DIGITADO[tipo].valor,
    )
    await userEvent.type(screen.getByPlaceholderText("Sua senha"), "senha-errada")
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }))

    expect(await screen.findByText(`${descritor.rotulo} ou senha inválida.`)).toBeInTheDocument()
  })
})
