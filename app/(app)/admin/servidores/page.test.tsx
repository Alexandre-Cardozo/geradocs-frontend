import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import AdminServidores from "@/app/(app)/admin/servidores/page"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Cadastro de servidores pelo administrador da plataforma.
 *
 * O caso que originou estes testes: cadastrar gravava o servidor e **não
 * mostrava a senha**. O banner era montado dentro do painel de cadastro, e o
 * mesmo `onSuccess` que o preenchia fechava o painel — ele nascia desmontado. O
 * cadastro ficava no banco sem que ninguém pudesse acessá-lo.
 */
const PREFEITURA = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"
const SORTEADA = "aBcD3fGh4JkLmN5p"

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
  memberships: [{ organizationId: PREFEITURA, departmentId: null, active: true }],
  lastAccessAt: "2026-08-20T14:30:00-03:00",
  version: 5,
}

function comCadastro(usuarios = [servidora]) {
  servidor.use(
    http.get(`${urlDaApi}/organizations`, () =>
      HttpResponse.json([
        {
          id: PREFEITURA,
          name: "Prefeitura Municipal de Ecoporanga",
          unit: "Administração Central",
          status: "ACTIVE",
          version: 1,
        },
      ]),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () => HttpResponse.json([])),
    http.get(`${urlDaApi}/users`, () => HttpResponse.json(usuarios)),
    // Sem foto: a listagem cai para as iniciais.
    http.get(`${urlDaApi}/users/:id/avatar`, () => new HttpResponse(null, { status: 404 })),
  )
}

async function preencherCadastro() {
  await userEvent.click(screen.getByRole("button", { name: /Novo Servidor/ }))
  await userEvent.type(screen.getByLabelText(/Nome Completo/), "Maria Costa Andrade")
  await userEvent.type(screen.getByLabelText(/^CPF/), "11144477735")
  await userEvent.type(screen.getByLabelText(/E-mail/), "maria.costa@ecoporanga.es.gov.br")
  // O Dropdown do DS não é `<select>`: abre uma listbox de botões. E a lista de
  // prefeituras chega do servidor — escolher antes dela seria escolher de um
  // seletor que só tem "Selecione a prefeitura...".
  await userEvent.click(screen.getByRole("button", { name: /^Prefeitura/ }))
  await userEvent.click(
    await screen.findByRole("option", { name: "Prefeitura Municipal de Ecoporanga" }),
  )
}

describe("cadastro de servidores", () => {
  it("a senha sorteada continua na tela depois que o painel de cadastro fecha", async () => {
    comCadastro([])
    servidor.use(
      http.post(`${urlDaApi}/users`, () =>
        HttpResponse.json({ ...servidora, provisionalPassword: SORTEADA }),
      ),
    )
    renderizar(<AdminServidores />)
    await screen.findByText(/Nenhum servidor cadastrado/)

    await preencherCadastro()
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // O painel fecha — e é justamente aí que a senha precisa sobreviver.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cadastrar" })).not.toBeInTheDocument(),
    )
    expect(screen.getByText(SORTEADA)).toBeInTheDocument()
    expect(screen.getByText(/Credenciais de primeiro acesso/)).toBeInTheDocument()
  })

  it("a chave de acesso vem junto da senha", async () => {
    comCadastro([])
    servidor.use(
      http.post(`${urlDaApi}/users`, () =>
        HttpResponse.json({ ...servidora, provisionalPassword: SORTEADA }),
      ),
    )
    renderizar(<AdminServidores />)
    await screen.findByText(/Nenhum servidor cadastrado/)

    await preencherCadastro()
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(await screen.findByText("***.***.***-35")).toBeInTheDocument()
  })

  it("cadastro sem a senha na resposta avisa em vez de dar tudo certo", async () => {
    comCadastro([])
    servidor.use(http.post(`${urlDaApi}/users`, () => HttpResponse.json(servidora)))
    renderizar(<AdminServidores />)
    await screen.findByText(/Nenhum servidor cadastrado/)

    await preencherCadastro()
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    // O cadastro já foi gravado no servidor, mas sem senha não há acesso a
    // entregar: a tela não pode mostrar credenciais que não existem.
    await waitFor(() => expect(screen.queryByText(SORTEADA)).not.toBeInTheDocument())
    expect(screen.queryByText(/Credenciais de primeiro acesso/)).not.toBeInTheDocument()
    // E o painel continua aberto, porque o cadastro não foi concluído com êxito.
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeInTheDocument()
  })
})

describe("ficha do servidor", () => {
  it("abre pela listagem e mostra o cadastro de quem foi escolhido", async () => {
    comCadastro()
    renderizar(<AdminServidores />)

    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))

    expect(await screen.findByText("Decreto 1.234/2026")).toBeInTheDocument()
    expect(screen.getByText("maria.costa@ecoporanga.es.gov.br")).toBeInTheDocument()
    // A matrícula aparece na linha da tabela e na ficha: o e-mail e o decreto
    // só existem aqui.
    expect(screen.getByRole("button", { name: /Redefinir senha/ })).toBeInTheDocument()
  })

  it("o CPF só aparece inteiro quando alguém pede, e o pedido vai ao servidor", async () => {
    comCadastro()
    let pediu = 0
    servidor.use(
      http.get(`${urlDaApi}/users/:id/cpf`, () => {
        pediu += 1
        return HttpResponse.json({ cpf: "11144477735" })
      }),
    )
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))

    // Abrir a ficha não revela nada: o número inteiro nem chega à tela antes do
    // pedido, e cada pedido vira uma linha de auditoria (ADR-023).
    expect(pediu).toBe(0)
    expect(screen.getAllByText("***.***.***-35").length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole("button", { name: /Ver o CPF completo de Maria/ }))

    expect(await screen.findByText("111.444.777-35")).toBeInTheDocument()
    expect(pediu).toBe(1)
    // Revelado, o botão sai: clicar de novo só geraria outra linha na trilha.
    expect(screen.queryByRole("button", { name: /Ver o CPF completo/ })).not.toBeInTheDocument()
  })

  it("fechar a ficha volta a mascarar o CPF", async () => {
    comCadastro()
    servidor.use(
      http.get(`${urlDaApi}/users/:id/cpf`, () => HttpResponse.json({ cpf: "11144477735" })),
    )
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))
    await userEvent.click(screen.getByRole("button", { name: /Ver o CPF completo de Maria/ }))
    await screen.findByText("111.444.777-35")

    await userEvent.click(screen.getByRole("button", { name: "Fechar ficha do servidor" }))
    await userEvent.click(screen.getByRole("button", { name: /^Maria Costa Andrade/ }))

    // O número não fica guardado na aplicação depois que a ficha fecha.
    expect(await screen.findByRole("button", { name: /Ver o CPF completo de Maria/ })).toBeInTheDocument()
    expect(screen.queryByText("111.444.777-35")).not.toBeInTheDocument()
  })

  it("recusa do servidor ao revelar o CPF não inventa número nenhum", async () => {
    comCadastro()
    servidor.use(
      http.get(`${urlDaApi}/users/:id/cpf`, () =>
        HttpResponse.json(
          { detail: "Acesso negado.", status: 403 },
          { status: 403, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))

    await userEvent.click(screen.getByRole("button", { name: /Ver o CPF completo de Maria/ }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Ver o CPF completo de Maria/ })).toBeEnabled(),
    )
    expect(screen.queryByText("111.444.777-35")).not.toBeInTheDocument()
  })

  it("redefinir senha pede confirmação antes de derrubar o acesso", async () => {
    comCadastro()
    let pediu = false
    servidor.use(
      http.post(`${urlDaApi}/users/:id/password-reset`, () => {
        pediu = true
        return HttpResponse.json({ provisionalPassword: SORTEADA })
      }),
    )
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))

    await userEvent.click(screen.getByRole("button", { name: /Redefinir senha/ }))

    // A senha atual dela deixa de valer e as sessões caem: não é clique único.
    expect(pediu).toBe(false)
    expect(screen.getByText(/deixa de valer/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Redefinir senha" }))

    expect(await screen.findByText(SORTEADA)).toBeInTheDocument()
    expect(screen.getByText(/Senha redefinida/)).toBeInTheDocument()
  })

  it("desistir da redefinição não mexe em senha nenhuma", async () => {
    comCadastro()
    let pediu = false
    servidor.use(
      http.post(`${urlDaApi}/users/:id/password-reset`, () => {
        pediu = true
        return HttpResponse.json({ provisionalPassword: SORTEADA })
      }),
    )
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))
    await userEvent.click(screen.getByRole("button", { name: /Redefinir senha/ }))

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(pediu).toBe(false)
    expect(screen.queryByText(/deixa de valer/)).not.toBeInTheDocument()
  })

  it("clicar em qualquer ponto da linha abre a ficha, e não só o nome", async () => {
    comCadastro()
    renderizar(<AdminServidores />)
    await screen.findByRole("button", { name: /^Maria Costa Andrade/ })

    // A matrícula fica na outra ponta da linha: se ela abre a ficha, a linha
    // inteira abre.
    await userEvent.click(screen.getByText("MAT-4471"))

    expect(await screen.findByText("Decreto 1.234/2026")).toBeInTheDocument()
  })

  it("desativar não abre a ficha de quem acabou de ser desativado", async () => {
    comCadastro()
    servidor.use(
      http.post(`${urlDaApi}/users/:id/deactivate`, () => new HttpResponse(null, { status: 204 })),
    )
    renderizar(<AdminServidores />)
    await screen.findByRole("button", { name: /^Maria Costa Andrade/ })

    await userEvent.click(screen.getByRole("button", { name: /Desativar Maria/ }))

    await waitFor(() =>
      expect(screen.queryByText("Decreto 1.234/2026")).not.toBeInTheDocument(),
    )
  })

  it("o nome continua sendo um controle de verdade, para quem usa teclado", async () => {
    comCadastro()
    renderizar(<AdminServidores />)
    const nome = await screen.findByRole("button", { name: /^Maria Costa Andrade/ })

    nome.focus()
    await userEvent.keyboard("{Enter}")

    // `<tr>` não recebe foco: sem este botão, a ficha seria inalcançável pelo
    // teclado.
    expect(await screen.findByText("Decreto 1.234/2026")).toBeInTheDocument()
  })

  it("fecha e volta à listagem", async () => {
    comCadastro()
    renderizar(<AdminServidores />)
    await userEvent.click(await screen.findByRole("button", { name: /^Maria Costa Andrade/ }))
    await screen.findByText("Decreto 1.234/2026")

    await userEvent.click(screen.getByRole("button", { name: "Fechar ficha do servidor" }))

    expect(screen.queryByText("Decreto 1.234/2026")).not.toBeInTheDocument()
  })
})
