import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import Usuarios from "@/app/(app)/configuracoes/usuarios/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor, porTextoInteiro } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

// O toast vive no provider do layout, fora destas telas: confere-se o que foi
// mandado para ele.
const avisos = vi.hoisted(() => vi.fn())
vi.mock("@/components/shared/providers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/shared/providers")>()),
  useToast: () => avisos,
}))

/**
 * Usuários e permissões do órgão — rota própria desde 26/08/2026.
 *
 * A senha de primeiro acesso é sorteada pelo servidor e aparece uma única vez;
 * o aviso vive fora do painel de cadastro, que fecha no sucesso.
 */
const ENTIDADE = sessaoServidor.organization.id

/**
 * Senha de mentira, escrita como tal: o varredor de segredos do hook não
 * distingue fixture de credencial, e uma cadeia aleatória num teste faz o
 * commit parar por um alarme que não é alarme nenhum.
 */
const SENHA_DE_TESTE = "senha-provisoria-de-teste"

const servidora = {
  id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
  name: "Maria Costa Andrade",
  cpf: "***.***.***-35",
  email: "maria.costa@ecoporanga.es.gov.br",
  jobTitle: "Servidora de Compras",
  registrationNumber: "MAT-4471",
  appointmentDecree: "Decreto 1.234/2026",
  profileAccess: "SERVIDOR" as const,
  status: "ACTIVE" as const,
  memberships: [{ organizationId: ENTIDADE, departmentId: null, active: true }],
  lastAccessAt: "2026-08-20T14:30:00-03:00",
  version: 5,
}

function comCoordenador(usuarios: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/me`, () =>
      HttpResponse.json({
        ...sessaoServidor,
        user: { ...sessaoServidor.user, profileAccess: "COORDENADOR" },
      }),
    ),
    http.get(`${urlDaApi}/users`, () => HttpResponse.json(usuarios)),
    // Sem foto: a listagem cai para as iniciais.
    http.get(`${urlDaApi}/users/:id/avatar`, () => new HttpResponse(null, { status: 404 })),
  )
}

describe("usuários da entidade", () => {
  it("lista os servidores vinculados ao órgão", async () => {
    comCoordenador([servidora])
    renderizar(<Usuarios />)

    expect(await screen.findByText("Maria Costa Andrade")).toBeInTheDocument()
  })

  it("mostra a matrícula de cada servidor, que o coordenador também cadastra", async () => {
    comCoordenador([servidora, { ...servidora, id: "outro", name: "João da Silva", registrationNumber: null }])
    renderizar(<Usuarios />)

    expect(await screen.findByRole("columnheader", { name: "Matrícula" })).toBeInTheDocument()
    expect(screen.getByText("MAT-4471")).toBeInTheDocument()
    // Sem matrícula, diz isso, e não uma célula vazia que parece erro de carga.
    expect(screen.getByText("Não informada", { selector: "td" })).toBeInTheDocument()
  })

  it("a senha de primeiro acesso aparece depois de cadastrar", async () => {
    comCoordenador([])
    servidor.use(
      http.post(`${urlDaApi}/users`, () =>
        HttpResponse.json({
          ...servidora,
          id: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f",
          name: "João da Silva",
          provisionalPassword: SENHA_DE_TESTE,
        }),
      ),
    )
    renderizar(<Usuarios />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar Servidor/ }))
    await userEvent.type(screen.getByPlaceholderText("Nome do servidor"), "João da Silva")
    await userEvent.type(screen.getByPlaceholderText("000.000.000-00"), "52998224725")
    await userEvent.type(
      screen.getByPlaceholderText("email@prefeitura.gov.br"),
      "joao@ecoporanga.es.gov.br",
    )
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // Fora do painel de cadastro: ele fecha no sucesso, e o aviso nascia
    // desmontado — o servidor era gravado e a senha nunca aparecia.
    await waitFor(() => expect(screen.getByText(porTextoInteiro(SENHA_DE_TESTE))).toBeInTheDocument())
  })

  it("o cadastro do coordenador tem os mesmos campos do administrador, com a entidade travada", async () => {
    comCoordenador([])
    renderizar(<Usuarios />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar Servidor/ }))

    expect(screen.getByLabelText(/Matrícula/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Decreto de Nomeação/)).toBeInTheDocument()
    // Ele só cadastra na própria entidade: ela aparece, mas não se troca.
    const entidade = screen.getByLabelText(/^Entidade/)
    await waitFor(() => expect(entidade).toHaveValue(sessaoServidor.organization.name))
    expect(entidade).toBeDisabled()
  })

  it("o coordenador cadastra só servidor: o perfil vem travado", async () => {
    comCoordenador([])
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/users`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...servidora, provisionalPassword: SENHA_DE_TESTE })
      }),
    )
    renderizar(<Usuarios />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar Servidor/ }))

    // Coordenadores são nomeados pelo administrador da plataforma (ADR-060 do back-end).
    expect(screen.queryByRole("button", { name: /Perfil de acesso/ })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("Servidor")).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText("Nome do servidor"), "João da Silva")
    await userEvent.type(screen.getByPlaceholderText("000.000.000-00"), "52998224725")
    await userEvent.type(screen.getByPlaceholderText("email@prefeitura.gov.br"), "joao@ecoporanga.es.gov.br")
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    await waitFor(() => expect(corpo?.profileAccess).toBe("SERVIDOR"))
  })

  it("mostra quantos usuários do plano estão em uso", async () => {
    comCoordenador([servidora])
    comEntidadeDoCoordenador({ maxUsers: 5, activeUsers: 2 })
    renderizar(<Usuarios />)

    expect(await screen.findByText("2 de 5 usuários do plano")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Adicionar Servidor/ })).toBeEnabled()
  })

  it("no limite do plano, o botão de adicionar fica desabilitado e diz o limite", async () => {
    comCoordenador([servidora])
    comEntidadeDoCoordenador({ maxUsers: 5, activeUsers: 5 })
    renderizar(<Usuarios />)

    const aviso = await screen.findByText(/Limite de 5 usuários atingido, conforme o plano da entidade/)
    const botao = screen.getByRole("button", { name: /Adicionar Servidor/ })
    expect(botao).toBeDisabled()
    // O motivo fica ligado ao botão, para quem navega com leitor de tela.
    expect(botao).toHaveAttribute("aria-describedby", aviso.id)
  })

  it("se o servidor recusar por limite, a mensagem dele aparece", async () => {
    comCoordenador([])
    comEntidadeDoCoordenador({ maxUsers: 5, activeUsers: 4 })
    servidor.use(
      http.post(`${urlDaApi}/users`, () =>
        HttpResponse.json(
          {
            code: "USER_LIMIT_REACHED",
            maxUsers: 5,
            detail: "A entidade atingiu o limite de 5 usuários do plano.",
          },
          { status: 409, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    renderizar(<Usuarios />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar Servidor/ }))
    await userEvent.type(screen.getByPlaceholderText("Nome do servidor"), "João da Silva")
    await userEvent.type(screen.getByPlaceholderText("000.000.000-00"), "52998224725")
    await userEvent.type(screen.getByPlaceholderText("email@prefeitura.gov.br"), "joao@ecoporanga.es.gov.br")
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // Outro cadastro pode ter ocupado a última vaga entre a leitura e o clique.
    await waitFor(() => expect(avisos).toHaveBeenCalledWith(expect.stringContaining("atingiu o limite de 5 usuários")))
  })
})

function comEntidadeDoCoordenador(plano: { maxUsers: number; activeUsers: number }) {
  servidor.use(
    http.get(`${urlDaApi}/organizations/:id`, () =>
      HttpResponse.json({ ...sessaoServidor.organization, ...plano, version: 1 }),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([])),
  )
}
