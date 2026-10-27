import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import NovoProcesso from "@/app/(app)/processos/novo/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Abertura de processo de contratação.
 *
 * Um servidor tentou abrir processo num órgão sem secretaria cadastrada. O
 * seletor tinha só o texto de instrução, "Continuar" ficava desabilitado, e a
 * tela não dizia por quê nem quem resolve — um beco. O servidor **exige** a
 * secretaria (é dela que sai a lotação do processo), então a saída não é
 * liberar o passo: é dizer de quem é a próxima ação.
 */
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const ORGANIZACAO = sessaoServidor.organization.id

function comSecretarias(secretarias: Array<{ id: string; name: string }>) {
  servidor.use(
    http.get(`${urlDaApi}/organizations/:id`, () =>
      HttpResponse.json({ ...sessaoServidor.organization, version: 1 }),
    ),
    http.get(`${urlDaApi}/organizations/:id/departments`, () =>
      HttpResponse.json(
        secretarias.map((s) => ({
          ...s,
          organizationId: ORGANIZACAO,
          acronym: null,
          active: true,
          version: 0,
        })),
      ),
    ),
  )
}

async function irParaIdentificacao() {
  await userEvent.click(await screen.findByRole("button", { name: /Pregão Eletrônico/ }))
  await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
}

describe("novo processo: a secretaria requisitante", () => {
  it("sem secretaria no órgão, diz o que falta e de quem é a ação", async () => {
    comSecretarias([])
    renderizar(<NovoProcesso />)
    await irParaIdentificacao()

    expect(await screen.findByText(/Nenhuma secretaria cadastrada/)).toBeInTheDocument()
    // Um servidor não cadastra secretaria: mandá-lo a Configurações sozinho
    // seria mandá-lo a uma tela que ele não acessa.
    expect(screen.getByText(/Peça ao coordenador/)).toBeInTheDocument()
    expect(screen.queryByText(/Selecione a secretaria requisitante para continuar/))
      .not.toBeInTheDocument()
  })

  it("o coordenador recebe o caminho, e não o recado de pedir a alguém", async () => {
    comSecretarias([])
    servidor.use(
      http.get(`${urlDaApi}/me`, () =>
        HttpResponse.json({
          ...sessaoServidor,
          user: { ...sessaoServidor.user, profileAccess: "COORDENADOR" },
        }),
      ),
    )
    renderizar(<NovoProcesso />)
    await irParaIdentificacao()

    const link = await screen.findByRole("link", { name: "Configurações" })
    expect(link).toHaveAttribute("href", "/configuracoes/secretarias")
    expect(screen.queryByText(/Peça ao coordenador/)).not.toBeInTheDocument()
  })

  it("com secretaria cadastrada, ela aparece para escolher", async () => {
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    await irParaIdentificacao()

    await userEvent.click(screen.getByRole("button", { name: /Secretaria requisitante/ }))

    expect(
      await screen.findByRole("option", { name: "Secretaria de Meio Ambiente" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Nenhuma secretaria cadastrada/)).not.toBeInTheDocument()
  })

  it("escolhida a secretaria, o resumo lateral deixa de dizer 'Não definido'", async () => {
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    await irParaIdentificacao()

    await userEvent.click(screen.getByRole("button", { name: /Secretaria requisitante/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Meio Ambiente" }))

    // Duas ocorrências: o próprio seletor e o resumo ao lado.
    expect(await screen.findAllByText("Secretaria de Meio Ambiente")).toHaveLength(2)
  })
})

describe("novo processo: o número", () => {
  it("não é apresentado como se já existisse", async () => {
    comSecretarias([])
    renderizar(<NovoProcesso />)

    // "Será definido pelo servidor" era ambíguo — nesta plataforma "servidor" é
    // a pessoa — e vinha em monoespaçada destacada, a formatação reservada a
    // identificador de verdade.
    const numero = await screen.findByText("Gerado na criação")
    expect(numero.className).not.toMatch(/font-mono/)
    expect(numero.className).not.toMatch(/text-royal/)
  })
})

/**
 * A minuta de contrato consta obrigatoriamente como anexo do edital (Art. 18,
 * VI). Listada como mais um documento solto, ela parecia peça à parte — e vinha
 * desmarcada até no Pregão, em que o contrato é a regra.
 */
describe("novo processo: a minuta de contrato como anexo do edital", () => {
  async function irParaDocumentos(modalidade: RegExp, forma?: RegExp) {
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    await userEvent.click(await screen.findByRole("button", { name: modalidade }))
    if (forma) await userEvent.click(screen.getByRole("button", { name: forma }))
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    await userEvent.click(screen.getByRole("button", { name: /Secretaria requisitante/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Meio Ambiente" }))
    await userEvent.type(screen.getByPlaceholderText(/Modernização dos laboratórios/), "Aquisição de computadores")
    await userEvent.type(screen.getByPlaceholderText(/Aquisição de 150 microcomputadores/), "150 desktops")
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
  }

  it("no Pregão, vem sob o Edital, já marcada", async () => {
    await irParaDocumentos(/Pregão Eletrônico/)

    const minuta = await screen.findByRole("button", { name: /Minuta de Contrato/ })
    expect(minuta).toHaveAttribute("aria-pressed", "true")
    expect(minuta).toHaveTextContent("Anexo do Edital")
    expect(minuta).toHaveTextContent("Art. 18, VI, Lei 14.133/21")
    // Numerada como subitem do Edital, e não como o sexto documento.
    const edital = screen.getByRole("button", { name: /Edital de Licitação/ })
    expect(edital).toHaveTextContent("5.")
    expect(minuta).toHaveTextContent("5.1")
  })

  it("continua opcional: dá para desmarcar", async () => {
    await irParaDocumentos(/Pregão Eletrônico/)

    const minuta = await screen.findByRole("button", { name: /Minuta de Contrato/ })
    await userEvent.click(minuta)
    expect(minuta).toHaveAttribute("aria-pressed", "false")
  })

  it("na Dispensa, sem edital, fica solta — e marcada, porque o contrato é a regra (Art. 95)", async () => {
    await irParaDocumentos(/Dispensa de Licitação/, /^Dispensa Direta/)

    const minuta = await screen.findByRole("button", { name: /Minuta de Contrato/ })
    expect(minuta).toHaveAttribute("aria-pressed", "true")
    expect(minuta).toHaveTextContent("Recomendado")
    expect(minuta).not.toHaveTextContent("Anexo do Edital")
  })
})

/**
 * Na dispensa por valor, a contratação é "preferencialmente precedida" de aviso
 * com prazo mínimo de 3 dias úteis (Art. 75, § 3º). Só os incisos I e II.
 */
/**
 * A dispensa é direta ou com disputa (ADR-046 do back-end), e cada forma tem os
 * seus documentos: a com disputa, as opções do pregão com o Aviso no lugar do
 * edital; a direta, sem aviso nem edital.
 */
describe("novo processo: as duas formas da dispensa", () => {
  async function irParaDocumentosDaDispensa(forma: RegExp, inciso?: RegExp) {
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    await userEvent.click(await screen.findByRole("button", { name: /Dispensa de Licitação/ }))
    await userEvent.click(screen.getByRole("button", { name: forma }))
    if (inciso) {
      await userEvent.click(screen.getByRole("button", { name: "Fundamento da Dispensa" }))
      await userEvent.click(await screen.findByRole("option", { name: inciso }))
    }
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    await userEvent.click(screen.getByRole("button", { name: /Secretaria requisitante/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Meio Ambiente" }))
    await userEvent.type(screen.getByPlaceholderText(/Modernização dos laboratórios/), "Aquisição de toner")
    await userEvent.type(screen.getByPlaceholderText(/Aquisição de 150 microcomputadores/), "Toner")
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
  }

  it("sem escolher a forma, não segue — é ela que decide os documentos", async () => {
    comSecretarias([])
    renderizar(<NovoProcesso />)
    await userEvent.click(await screen.findByRole("button", { name: /Dispensa de Licitação/ }))

    expect(screen.getByRole("button", { name: /Continuar/ })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: /^Dispensa com Disputa/ }))
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeEnabled()
  })

  it("com disputa: as opções do pregão, com o aviso obrigatório no lugar do edital", async () => {
    await irParaDocumentosDaDispensa(/^Dispensa com Disputa/, /Art\. 75, II/)

    const aviso = await screen.findByRole("button", { name: /Aviso de Contratação Direta/ })
    expect(aviso).toHaveAttribute("aria-pressed", "true")
    expect(aviso).toHaveTextContent("Obrigatório")
    expect(screen.getByRole("button", { name: /Estudo Técnico Preliminar/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Minuta de Contrato/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Mapa de Riscos/ })).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByRole("button", { name: /Edital de Licitação/ })).not.toBeInTheDocument()
    expect(screen.getByText(/faz o papel do edital/)).toBeInTheDocument()
    // O resumo diz a forma, e não só "Dispensa de Licitação".
    expect(screen.getAllByText("Dispensa com Disputa").length).toBeGreaterThan(0)
  })

  it("direta: sem aviso, com a cotação marcada — e na dispensa por valor lembra o aviso", async () => {
    await irParaDocumentosDaDispensa(/^Dispensa Direta/, /Art\. 75, II/)

    await screen.findByRole("button", { name: /Termo de Referência/ })
    expect(screen.queryByRole("button", { name: /Aviso de Contratação Direta/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cotação de Mercado/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Estudo Técnico Preliminar/ })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText(/precedida de aviso \(Art\. 75, § 3º\)/)).toBeInTheDocument()
  })

  it("a forma vai ao servidor com o processo", async () => {
    let dados: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes`, async ({ request }) => {
        const corpo = await request.formData()
        dados = JSON.parse(await (corpo.get("dados") as Blob).text()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    await irParaDocumentosDaDispensa(/^Dispensa com Disputa/)
    await userEvent.click(await screen.findByRole("button", { name: /Criar Processo/ }))

    await waitFor(() => expect(dados.dispensationForm).toBe("DISPUTE"))
    expect(dados.documents).toEqual(expect.arrayContaining(["TR", "AVISO", "ETP", "CONTRATO"]))
  })
})

describe("novo processo: a inexigibilidade", () => {
  it("cita o Art. 74 na escolha e na explicação dos documentos", async () => {
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    const card = await screen.findByRole("button", { name: /Inexigibilidade/ })
    expect(card).toHaveTextContent("Art. 74 da Lei 14.133/21")
  })
})

/** A natureza do objeto escolhe a minuta da AGU do TR e do Contrato (ADR-053). */
describe("novo processo: a natureza do objeto", () => {
  it("é opcional e, escolhida, vai ao servidor com o processo", async () => {
    let dados: Record<string, unknown> = {}
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes`, async ({ request }) => {
        const corpo = await request.formData()
        dados = JSON.parse(await (corpo.get("dados") as Blob).text()) as Record<string, unknown>
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    comSecretarias([{ id: "02753761-6201-45f7-a9d9-2a1abf6d4f3c", name: "Secretaria de Meio Ambiente" }])
    renderizar(<NovoProcesso />)
    await irParaIdentificacao()
    await userEvent.click(screen.getByRole("button", { name: /Secretaria requisitante/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Secretaria de Meio Ambiente" }))
    await userEvent.type(screen.getByPlaceholderText(/Modernização dos laboratórios/), "Reforma da escola")
    await userEvent.type(screen.getByPlaceholderText(/Aquisição de 150 microcomputadores/), "Reforma")

    expect(screen.getByRole("button", { name: "Natureza do Objeto" })).toHaveTextContent("Não informar agora")
    await userEvent.click(screen.getByRole("button", { name: "Natureza do Objeto" }))
    await userEvent.click(await screen.findByRole("option", { name: "Obras e serviços de engenharia" }))
    await userEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    await userEvent.click(await screen.findByRole("button", { name: /Criar Processo/ }))

    await waitFor(() => expect(dados.objectNature).toBe("WORKS_AND_ENGINEERING"))
  })
})

