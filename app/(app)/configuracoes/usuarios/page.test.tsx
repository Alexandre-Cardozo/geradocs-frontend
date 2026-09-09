import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import Usuarios from "@/app/(app)/configuracoes/usuarios/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

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
    await waitFor(() => expect(screen.getByText(SENHA_DE_TESTE)).toBeInTheDocument())
  })
})
