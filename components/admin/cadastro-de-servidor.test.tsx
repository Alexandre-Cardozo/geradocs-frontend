import { describe, expect, it, vi } from "vitest"

import {
  CadastroDeServidor,
  SEM_RECUSAS,
  type EntidadeDoCadastro,
  type PerfisDoCadastro,
  type RecusasDoCadastro,
} from "@/components/admin/cadastro-de-servidor"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * O cadastro de servidor é um só para o administrador e para o coordenador.
 *
 * Eram dois formulários, e o do coordenador perdeu matrícula e decreto de
 * nomeação — que o mesmo `POST /users` aceita de qualquer um.
 */
const ENTIDADE = { id: "org-1", nome: "Prefeitura Municipal de Ecoporanga" }

function cadastro({
  entidade = { fixa: ENTIDADE },
  perfis,
  recusas = SEM_RECUSAS,
  onCadastrar = () => {},
}: {
  entidade?: EntidadeDoCadastro
  perfis?: PerfisDoCadastro
  recusas?: RecusasDoCadastro
  onCadastrar?: Parameters<typeof CadastroDeServidor>[0]["onCadastrar"]
} = {}) {
  return (
    <CadastroDeServidor
      titulo="Cadastrar Servidor"
      entidade={entidade}
      perfis={perfis}
      salvando={false}
      recusas={recusas}
      onCadastrar={onCadastrar}
      onCancelar={() => {}}
    />
  )
}

async function preencherObrigatorios() {
  await userEvent.type(screen.getByLabelText(/Nome Completo/), "Maria Costa Andrade")
  await userEvent.type(screen.getByLabelText(/^CPF/), "11144477735")
  await userEvent.type(screen.getByLabelText(/E-mail/), "maria.costa@ecoporanga.es.gov.br")
}

describe("cadastro de servidor", () => {
  it.each<[string, EntidadeDoCadastro]>([
    ["administrador", { opcoes: [ENTIDADE] }],
    ["coordenador", { fixa: ENTIDADE }],
  ])("o %s vê matrícula e decreto de nomeação", (_, entidade) => {
    renderizar(cadastro({ entidade }))

    expect(screen.getByLabelText(/Matrícula/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Decreto de Nomeação/)).toBeInTheDocument()
  })

  it("a entidade do coordenador aparece travada, com o nome dela", () => {
    renderizar(cadastro())

    const campo = screen.getByLabelText(/^Entidade/)
    expect(campo).toHaveValue(ENTIDADE.nome)
    expect(campo).toBeDisabled()
    // Campo travado sem dizer por quê é beco: a explicação fica à vista.
    expect(screen.getByText(/Fixa: a sua entidade/)).toBeInTheDocument()
  })

  it("com a entidade travada, cadastra nela sem pedir escolha", async () => {
    const cadastrar = vi.fn()
    renderizar(cadastro({ onCadastrar: cadastrar }))

    await preencherObrigatorios()
    await userEvent.type(screen.getByLabelText(/Matrícula/), "MAT-4471")
    await userEvent.type(screen.getByLabelText(/Decreto de Nomeação/), "Decreto 1.234/2026")
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidadeId: ENTIDADE.id,
        matricula: "MAT-4471",
        decretoNomeacao: "Decreto 1.234/2026",
      }),
    )
  })

  it("o administrador precisa escolher a entidade", async () => {
    renderizar(cadastro({ entidade: { opcoes: [ENTIDADE] } }))

    await preencherObrigatorios()

    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled()
  })

  it("a recusa do servidor some quando a pessoa mexe no campo", async () => {
    renderizar(cadastro({ recusas: { registrationNumber: "Matrícula já cadastrada." } }))

    expect(screen.getByText("Matrícula já cadastrada.")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Matrícula/), "MAT-9")

    expect(screen.queryByText("Matrícula já cadastrada.")).not.toBeInTheDocument()
  })

  it("o coordenador cadastra só servidor: o perfil vem travado e explica quem cadastra coordenador", async () => {
    const cadastrar = vi.fn()
    renderizar(cadastro({ perfis: "apenasServidor", onCadastrar: cadastrar }))

    expect(screen.queryByRole("button", { name: /Perfil de acesso/ })).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("Servidor")).toBeDisabled()
    expect(screen.getByText(/Coordenadores são cadastrados pelo administrador/)).toBeInTheDocument()

    await preencherObrigatorios()
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(cadastrar).toHaveBeenCalledWith(expect.objectContaining({ perfilAcesso: "servidor" }))
  })

  it("o administrador escolhe entre servidor e coordenador", async () => {
    const cadastrar = vi.fn()
    renderizar(cadastro({ onCadastrar: cadastrar }))

    await preencherObrigatorios()
    await userEvent.click(screen.getByRole("button", { name: /Perfil de acesso/ }))
    await userEvent.click(screen.getByRole("option", { name: "Coordenador" }))
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(cadastrar).toHaveBeenCalledWith(expect.objectContaining({ perfilAcesso: "coordenador" }))
  })

  it("entidade fixa no limite do plano: não cadastra e diz o limite", async () => {
    renderizar(cadastro({ entidade: { fixa: { ...ENTIDADE, limiteUsuarios: 5, usuariosAtivos: 5 } } }))

    await preencherObrigatorios()

    expect(screen.getByText("Limite de 5 usuários atingido, conforme o plano da entidade.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled()
  })

  it("entidade fixa com vaga cadastra normalmente", async () => {
    const cadastrar = vi.fn()
    renderizar(
      cadastro({ entidade: { fixa: { ...ENTIDADE, limiteUsuarios: 5, usuariosAtivos: 4 } }, onCadastrar: cadastrar }),
    )

    await preencherObrigatorios()
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }))

    expect(cadastrar).toHaveBeenCalled()
    expect(screen.queryByText(/Limite de/)).not.toBeInTheDocument()
  })

  it("o administrador vê na lista qual entidade está lotada, e escolhê-la bloqueia o cadastro", async () => {
    const lotada = { id: "org-2", nome: "Câmara Lotada", limiteUsuarios: 2, usuariosAtivos: 2 }
    renderizar(cadastro({ entidade: { opcoes: [ENTIDADE, lotada] } }))

    await preencherObrigatorios()
    await userEvent.click(screen.getByRole("button", { name: /^Entidade/ }))
    await userEvent.click(screen.getByRole("option", { name: "Câmara Lotada (limite atingido)" }))

    expect(screen.getByText("Limite de 2 usuários atingido, conforme o plano da entidade.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: /^Entidade/ }))
    await userEvent.click(screen.getByRole("option", { name: ENTIDADE.nome }))

    expect(screen.queryByText(/Limite de/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeEnabled()
  })
})
