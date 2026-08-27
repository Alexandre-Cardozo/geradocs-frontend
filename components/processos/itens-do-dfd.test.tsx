import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ItensDoDfd } from "@/components/processos/itens-do-dfd"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Informar os itens de um DFD.
 *
 * <p>A tela dizia que o DFD estava anexado e a consolidação ficava vazia para
 * sempre, porque não havia por onde informar item nenhum. Ler item de PDF
 * assinado é OCR — a saída não é adivinhar quantidade em documento que vira
 * edital, é ter onde informá-la.
 *
 * <p>Depois do ADR-036 o formulário também sabe <b>a qual DFD</b> o item
 * pertence: antes só sabia criar, e corrigir uma quantidade registrava outro
 * DFD com o mesmo nome — foi assim que o processo do cliente acumulou seis
 * linhas indistinguíveis.
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

/** Os DFDs já registrados no processo, que é entre eles que o item é vinculado. */
function comDfds(dfds: unknown[] = []) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

const dfdRegistrado = (id: string, fileName: string, items: unknown[]) => ({
  id,
  fileName,
  departmentId: EDUCACAO,
  departmentName: "Secretaria de Educação",
  submittedAt: "2026-03-10T12:00:00Z",
  items,
  file: null,
})

function renderizarFormulario() {
  return renderizar(<ItensDoDfd processoId={PROCESSO} onPronto={() => {}} />)
}

async function escolherSecretaria() {
  await userEvent.click(await screen.findByRole("button", { name: /Secretaria que pediu/ }))
  await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Educação" }))
}

async function identificar(identificacao: string) {
  await userEvent.type(screen.getByLabelText("Identificação do DFD"), identificacao)
}

/**
 * O registro do DFD é multipart (ADR-028): os itens vão na parte `dados` e o
 * arquivo, quando existe, na `file`. Ler o corpo como JSON aqui esconderia uma
 * regressão de contrato — a requisição continuaria "chegando".
 */
function capturarRegistro() {
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
  it("sem secretaria e sem identificação, diz o que falta em vez de só desabilitar", async () => {
    comSecretarias()
    comDfds()
    renderizarFormulario()

    const salvar = await screen.findByRole("button", { name: /Registrar DFD/ })
    expect(salvar).toBeDisabled()
    expect(screen.getByText(/Escolha a secretaria/)).toBeInTheDocument()
    // O motivo precisa ser anunciado junto com o botão, e não só desenhado.
    const descrito = salvar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/Escolha a secretaria/)
  })

  it("com secretaria escolhida, cobra a identificação do DFD", async () => {
    comSecretarias()
    comDfds()
    renderizarFormulario()
    await escolherSecretaria()

    // O nome do arquivo do processo não serve de identificação para todos: era
    // dele que saíam seis linhas iguais na listagem.
    expect(screen.getByText(/número ou o nome do DFD/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Registrar DFD/ })).toBeDisabled()
  })

  it("manda descrição, unidade e quantidade como número", async () => {
    comSecretarias()
    comDfds()
    const registro = capturarRegistro()
    renderizarFormulario()
    await escolherSecretaria()
    await identificar("DFD 003/2026")
    await preencherUmItem("Papel A4 75 g/m2", "RESMA", "1200")

    await userEvent.click(screen.getByRole("button", { name: /Registrar DFD e itens/ }))

    await waitFor(() => expect(registro.dados.departmentId).toBe(EDUCACAO))
    expect(registro.dados.fileName).toBe("DFD 003/2026")
    const itens = registro.dados.items as Array<Record<string, unknown>>
    expect(itens).toHaveLength(1)
    const item = itens[0] as Record<string, unknown>
    expect(item.description).toBe("Papel A4 75 g/m2")
    expect(item.unit).toBe("RESMA")
    // "1.200" precisa chegar como mil e duzentos: mandar a string faria o
    // servidor ler 1,2 — o mesmo defeito que o import do PCA já teve.
    expect(item.quantity).toBe(1200)
  })

  it("o DFD pode ser registrado sem item nenhum, para os itens virem depois", async () => {
    comSecretarias()
    comDfds()
    const registro = capturarRegistro()
    renderizarFormulario()
    await escolherSecretaria()
    await identificar("DFD 004/2026")

    // Registrar o documento é um ato; informar o que ele pede é outro. Exigir
    // item aqui obrigava a inventar quantidade para registrar um DFD que existe.
    await userEvent.click(screen.getByRole("button", { name: "Registrar DFD" }))

    await waitFor(() => expect(registro.dados.fileName).toBe("DFD 004/2026"))
    expect(registro.dados.items).toEqual([])
    expect(registro.arquivo).toBeNull()
  })

  it("linha em branco não vira item", async () => {
    comSecretarias()
    comDfds()
    const registro = capturarRegistro()
    renderizarFormulario()
    await escolherSecretaria()
    await identificar("DFD 003/2026")
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: /Acrescentar item/ }))
    await userEvent.click(screen.getByRole("button", { name: /Registrar DFD e itens/ }))

    await waitFor(() => expect((registro.dados.items as unknown[]).length).toBe(1))
  })

  it("o arquivo escolhido sobe junto, e dá nome ao DFD quando não há outro", async () => {
    comSecretarias()
    comDfds()
    const registro = capturarRegistro()
    renderizarFormulario()
    await escolherSecretaria()
    await preencherUmItem("Caneta", "UN", "50")

    const pdf = new File(["%PDF-1.7 assinado"], "DFD-Educacao-2026.pdf", {
      type: "application/pdf",
    })
    await userEvent.upload(screen.getByLabelText("Arquivo do DFD"), pdf)

    expect(screen.getByText("DFD-Educacao-2026.pdf")).toBeInTheDocument()
    // Com o documento em mãos, o nome dele identifica melhor que um campo
    // obrigatório em branco.
    expect(screen.getByLabelText("Identificação do DFD")).toHaveValue("DFD-Educacao-2026.pdf")
    await userEvent.click(screen.getByRole("button", { name: /Registrar DFD e itens/ }))

    await waitFor(() => expect(registro.arquivo?.name).toBe("DFD-Educacao-2026.pdf"))
    expect(registro.arquivo?.type).toBe("application/pdf")
    expect(registro.dados.fileName).toBe("DFD-Educacao-2026.pdf")
  })

  it("escolhendo um DFD já registrado, os itens dele entram no formulário", async () => {
    comSecretarias()
    comDfds([
      dfdRegistrado("d-1", "DFD 003/2026", [
        { description: "Papel A4", unit: "RESMA", quantity: 1200, specification: null },
      ]),
    ])
    renderizar(<ItensDoDfd processoId={PROCESSO} dfdSelecionado="d-1" onPronto={() => {}} />)

    // Editar é partir do que está lá: um formulário em branco apagaria o resto
    // ao salvar, porque a troca substitui a lista inteira.
    await waitFor(() =>
      expect(screen.getByLabelText(/Descrição do item/)).toHaveValue("Papel A4"),
    )
    expect(screen.getByLabelText(/Quantidade/)).toHaveValue("1.200,00")
    expect(screen.getByText(/Salvar troca os itens deste DFD/)).toBeInTheDocument()
  })

  it("salvar um DFD existente troca os itens dele, e não cria outro DFD", async () => {
    let corpo: Record<string, unknown> = {}
    let criou = false
    comSecretarias()
    comDfds([dfdRegistrado("d-1", "DFD 003/2026", [])])
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/dfds/:dfdId/items`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({})
        },
      ),
      http.post(`${urlDaApi}/procurement-processes/:id/dfds`, () => {
        criou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderizar(<ItensDoDfd processoId={PROCESSO} dfdSelecionado="d-1" onPronto={() => {}} />)
    await screen.findByLabelText(/Descrição do item/)
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: "Salvar itens" }))

    await waitFor(() => expect((corpo.items as unknown[])?.length).toBe(1))
    // Corrigir uma quantidade não pode custar um DFD novo na listagem.
    expect(criou).toBe(false)
  })

  it("editando um DFD, o formulário cobra pelo menos um item", async () => {
    comSecretarias()
    comDfds([dfdRegistrado("d-1", "DFD 003/2026", [])])
    renderizar(<ItensDoDfd processoId={PROCESSO} dfdSelecionado="d-1" onPronto={() => {}} />)

    // Salvar vazio num DFD que já tem itens apagaria todos em silêncio — e
    // registrar sem item já tem caminho próprio, o de registro.
    expect(await screen.findByRole("button", { name: "Salvar itens" })).toBeDisabled()
    expect(screen.getByText(/ao menos um item/)).toBeInTheDocument()
  })

  it("acrescentar e remover linha", async () => {
    comSecretarias()
    comDfds()
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
    comDfds()
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
    await identificar("DFD 003/2026")
    await preencherUmItem("Caneta", "UN", "50")

    await userEvent.click(screen.getByRole("button", { name: /Registrar DFD e itens/ }))

    // O que foi digitado continua ali: limpar seria fazer a pessoa redigitar.
    await waitFor(() => expect(screen.getByLabelText(/Descrição do item/)).toHaveValue("Caneta"))
  })

  it("fecha quando há o que fechar, e não oferece saída quando é o próximo passo", async () => {
    comDfds()
    // Sem nada consolidado o formulário é o passo seguinte, e um "Fechar" ali
    // deixaria a tela sem saída: o bloco reabriria sozinho.
    const fechar = vi.fn()
    const { unmount } = renderizar(<ItensDoDfd processoId={PROCESSO} onPronto={() => {}} />)
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument()
    unmount()

    renderizar(<ItensDoDfd processoId={PROCESSO} onPronto={() => {}} onFechar={fechar} />)
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(fechar).toHaveBeenCalled()
  })

  it("o seletor de DFD lista os registrados e a opção de criar outro", async () => {
    comSecretarias()
    comDfds([dfdRegistrado("d-1", "DFD 003/2026", [])])
    renderizarFormulario()

    await userEvent.click(await screen.findByRole("button", { name: /DFD destes itens/ }))

    // Vincular o item ao DFD é a razão de o seletor existir: é ele que responde
    // de qual documento saiu cada quantidade.
    expect(
      await screen.findByRole("option", { name: /DFD 003\/2026 · Secretaria de Educação/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Registrar um novo DFD/ })).toBeInTheDocument()
  })
})
