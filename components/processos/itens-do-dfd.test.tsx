import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ItensDoDfd } from "@/components/processos/itens-do-dfd"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Informar os itens do DFD.
 *
 * <p>A tela dizia que o DFD estava anexado e a consolidação ficava vazia para
 * sempre, porque não havia por onde informar item nenhum. Ler item de PDF
 * assinado é OCR — a saída não é adivinhar quantidade em documento que vira
 * edital, é ter onde informá-la.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
/**
 * O id da secretaria de teste.
 *
 * Não se chama `SECRETARIA` porque o gitleaks lê "SECRET" + string de alta
 * entropia como credencial vazada e recusa o commit — o mesmo motivo pelo qual
 * as senhas de teste vivem em constantes nomeadas.
 */
const EDUCACAO = "02753761-6201-45f7-a9d9-2a1abf6d4f3c"

function comSecretarias() {
  servidor.use(
    http.get(`${urlDaApi}/organizations/:id`, () =>
      HttpResponse.json({ ...sessaoServidor.organization, version: 1 }),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () =>
      HttpResponse.json([
        {
          id: EDUCACAO,
          organizationId: sessaoServidor.organization.id,
          name: "Secretaria de Educação",
          acronym: null,
          active: true,
          version: 0,
        },
      ]),
    ),
  )
}

function renderizarFormulario() {
  return renderizar(
    <ItensDoDfd processoId={PROCESSO} nomeDoArquivo="DFD-CE-003.2026.pdf" onPronto={() => {}} />,
  )
}

async function escolherSecretaria() {
  await userEvent.click(await screen.findByRole("button", { name: /Secretaria que pediu/ }))
  await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Educação" }))
}

/**
 * O anexo do DFD deixou de ser JSON (ADR-028): os itens vão na parte `dados` e
 * o arquivo, quando existe, na `file`. Ler o corpo como JSON aqui esconderia
 * uma regressão de contrato — a requisição continuaria "chegando".
 */
function capturarAnexo() {
  const capturado: { dados: Record<string, unknown>; arquivo: File | null } = {
    dados: {},
    arquivo: null,
  }
  servidor.use(
    http.post(`${urlDaApi}/procurement-processes/:id/dfds`, async ({ request }) => {
      const corpo = await request.formData()
      capturado.dados = JSON.parse(await (corpo.get("dados") as Blob).text()) as Record<
        string,
        unknown
      >
      const arquivo = corpo.get("file")
      capturado.arquivo = arquivo instanceof File ? arquivo : null
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  return capturado
}

async function preencherUmItem(descricao: string, unidade: string, quantidade: string) {
  await userEvent.type(screen.getByLabelText(/Descrição do item/), descricao)
  await userEvent.type(screen.getByLabelText(/Unidade/), unidade)
  await userEvent.type(screen.getByLabelText(/Quantidade/), quantidade)
}

describe("itens do DFD", () => {
  it("sem secretaria e sem item, diz o que falta em vez de só desabilitar", async () => {
    comSecretarias()
    renderizarFormulario()

    const salvar = await screen.findByRole("button", { name: /Salvar itens/ })
    expect(salvar).toBeDisabled()
    expect(screen.getByText(/Escolha a secretaria/)).toBeInTheDocument()
    // O motivo precisa ser anunciado junto com o botão, e não só desenhado.
    const descrito = salvar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/Escolha a secretaria/)
  })

  it("com secretaria escolhida, cobra o item", async () => {
    comSecretarias()
    renderizarFormulario()
    await escolherSecretaria()

    expect(screen.getByText(/ao menos um item/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Salvar itens/ })).toBeDisabled()
  })

  it("manda descrição, unidade e quantidade como número", async () => {
    comSecretarias()
    const anexo = capturarAnexo()
    renderizarFormulario()
    await escolherSecretaria()

    await preencherUmItem("Papel A4 75 g/m2", "RESMA", "1200")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect(anexo.dados.departmentId).toBe(EDUCACAO))
    const itens = anexo.dados.items as Array<Record<string, unknown>>
    expect(itens).toHaveLength(1)
    const item = itens[0] as Record<string, unknown>
    expect(item.description).toBe("Papel A4 75 g/m2")
    expect(item.unit).toBe("RESMA")
    // "1.200" precisa chegar como mil e duzentos: mandar a string faria o
    // servidor ler 1,2 — o mesmo defeito que o import do PCA já teve.
    expect(item.quantity).toBe(1200)
  })

  it("o DFD informado é o que está registrado no processo", async () => {
    comSecretarias()
    const anexo = capturarAnexo()
    renderizarFormulario()
    await escolherSecretaria()
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect(anexo.dados.fileName).toBe("DFD-CE-003.2026.pdf"))
    // Sem arquivo escolhido, nada de parte `file`: registrar o DFD só pelo
    // número é caso legítimo, e não pendência.
    expect(anexo.arquivo).toBeNull()
  })

  it("linha em branco não vira item", async () => {
    comSecretarias()
    const anexo = capturarAnexo()
    renderizarFormulario()
    await escolherSecretaria()
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: /Acrescentar item/ }))
    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    await waitFor(() => expect((anexo.dados.items as unknown[]).length).toBe(1))
  })

  it("o arquivo escolhido sobe junto, e dá nome ao anexo", async () => {
    comSecretarias()
    const anexo = capturarAnexo()
    renderizarFormulario()
    await escolherSecretaria()
    await preencherUmItem("Caneta", "UN", "50")

    const pdf = new File(["%PDF-1.7 assinado"], "DFD-Educacao-2026.pdf", {
      type: "application/pdf",
    })
    await userEvent.upload(screen.getByLabelText("Arquivo do DFD"), pdf)

    expect(screen.getByText("DFD-Educacao-2026.pdf")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    // Até o 13.2 só o nome era anotado e os bytes eram descartados: quem fosse
    // conferir o processo depois não tinha como rebaixar o DFD.
    await waitFor(() => expect(anexo.arquivo?.name).toBe("DFD-Educacao-2026.pdf"))
    expect(anexo.arquivo?.type).toBe("application/pdf")
    // O nome do anexo passa a ser o do arquivo enviado: mostrar o nome antigo
    // ao lado do PDF novo seria a tela se desmentindo.
    expect(anexo.dados.fileName).toBe("DFD-Educacao-2026.pdf")
  })

  it("acrescentar e remover linha", async () => {
    comSecretarias()
    renderizarFormulario()
    await screen.findByLabelText(/Descrição do item/)

    await userEvent.click(screen.getByRole("button", { name: /Acrescentar item/ }))
    expect(screen.getAllByPlaceholderText(/Papel A4/)).toHaveLength(2)

    await userEvent.click(screen.getByRole("button", { name: "Remover item 2" }))
    expect(screen.getAllByPlaceholderText(/Papel A4/)).toHaveLength(1)
    // A última linha não some: um formulário sem linha nenhuma não teria como
    // voltar a ter.
    expect(screen.getByRole("button", { name: "Remover item 1" })).toBeDisabled()
  })

  it("a recusa do servidor aparece, e o formulário não se dá por salvo", async () => {
    comSecretarias()
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
        HttpResponse.json(
          { detail: "A secretaria não pertence à organização do processo.", status: 400 },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    )
    renderizarFormulario()
    await escolherSecretaria()
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: /Salvar itens/ }))

    // O que foi digitado continua ali: limpar seria fazer a pessoa redigitar.
    await waitFor(() =>
      expect(screen.getByLabelText(/Descrição do item/)).toHaveValue("Caneta"),
    )
  })

  it("fecha quando há o que fechar, e não oferece saída quando é o próximo passo", async () => {
    // Sem nada consolidado o formulário é o passo seguinte, e um "Fechar" ali
    // deixaria a tela sem saída: o bloco reabriria sozinho.
    const fechar = vi.fn()
    const { unmount } = renderizar(
      <ItensDoDfd processoId={PROCESSO} nomeDoArquivo="dfd.pdf" onPronto={() => {}} />,
    )
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument()
    unmount()

    renderizar(
      <ItensDoDfd
        processoId={PROCESSO}
        nomeDoArquivo="dfd.pdf"
        onPronto={() => {}}
        onFechar={fechar}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(fechar).toHaveBeenCalled()
  })

  it("o campo de arquivo diz que é o único lugar onde o DFD fica guardado", () => {
    renderizar(
      <ItensDoDfd processoId={PROCESSO} nomeDoArquivo="dfd.pdf" onPronto={() => {}} />,
    )

    // Parecia campo repetido porque o cadastro do processo também fala em "DFD"
    // — e lá entra só o nome, não o arquivo.
    expect(screen.getByText(/único lugar onde o arquivo fica guardado/)).toBeInTheDocument()
  })
})
