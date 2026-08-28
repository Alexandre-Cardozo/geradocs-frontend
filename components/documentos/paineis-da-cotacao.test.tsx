import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import {
  PainelDaAnaliseCritica,
  PainelDasColetas,
  PainelDasFontes,
  PainelDoPrecoDeReferencia,
} from "@/components/documentos/paineis-da-cotacao"
import { secoesPorTipoBase } from "@/lib/documentos"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * As quatro seções da Cotação que dependem da pesquisa de preços.
 *
 * <p>A pesquisa é uma só — a série coletada —, e as quatro leem dela. O que se
 * cobra aqui é isso e a fronteira do Art. 6º, § 3º: a plataforma aponta o preço
 * que destoa e <b>não o descarta</b>, porque o critério precisa ser fundamentado
 * e descrito por quem responde pelos autos.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const PAINEL = "Painel de Preços do Governo Federal (Compras.gov.br)"

const coleta = (item: string, fonte: string, preco: number, extras = {}) => ({
  id: `${item}-${fonte}-${preco}`,
  item,
  source: fonte,
  unitPrice: preco,
  collectedAt: "2026-08-20T14:30:00Z",
  registeredAt: "2026-08-28T12:00:00Z",
  ...extras,
})

function comColetas(coletas: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/price-quotes`, () =>
      HttpResponse.json(coletas),
    ),
  )
}

function comConsolidacao(itens: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/demand-consolidation`, () =>
      HttpResponse.json({ items: itens, incongruences: [] }),
    ),
  )
}

const secao = (titulo: string) => {
  const encontrada = secoesPorTipoBase["Cotação"].find((s) => s.titulo === titulo)
  if (!encontrada) throw new Error(`Cotação não tem a seção ${titulo}`)
  return encontrada
}

function renderizarPainel(
  Painel: typeof PainelDasFontes,
  titulo: string,
  rascunho = "",
  setRascunho = vi.fn(),
) {
  renderizar(
    <Painel
      secao={secao(titulo)}
      processoId={PROCESSO}
      rascunho={rascunho}
      setRascunho={setRascunho}
      gerando={false}
      onGerarComIa={vi.fn()}
    />,
  )
  return setRascunho
}

describe("fornecedores e fontes consultadas", () => {
  it("lista as fontes efetivamente usadas, com quantos preços vieram de cada", async () => {
    comColetas([
      coleta("Papel A4", PAINEL, 24),
      coleta("Papel A4", PAINEL, 25),
      coleta("Caneta", "Base nacional de notas fiscais eletrônicas", 1.8),
    ])
    renderizarPainel(PainelDasFontes, "Fornecedores e Fontes Consultadas")

    expect(await screen.findByText(PAINEL)).toBeInTheDocument()
    expect(screen.getByText("2 preço(s)")).toBeInTheDocument()
    expect(screen.getAllByText("Parâmetro prioritário")).toHaveLength(1)
  })

  it("sem parâmetro prioritário, cobra a justificativa do Art. 5º, § 1º", async () => {
    comColetas([coleta("Papel A4", "Base nacional de notas fiscais eletrônicas", 24)])
    renderizarPainel(PainelDasFontes, "Fornecedores e Fontes Consultadas")

    expect(await screen.findByText(/Art. 5º, § 1º da IN SEGES\/ME nº 65\/2021/)).toBeInTheDocument()
  })

  it("sem coleta, manda registrar em vez de pedir uma lista digitada à parte", async () => {
    comColetas([])
    renderizarPainel(PainelDasFontes, "Fornecedores e Fontes Consultadas")

    expect(await screen.findByText(/Nenhum preço coletado ainda/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Escrever a partir das fontes/ }),
    ).not.toBeInTheDocument()
  })

  it("o rascunho cita o artigo e as fontes", async () => {
    comColetas([coleta("Papel A4", PAINEL, 24, { supplier: "Papelaria Central" })])
    const setRascunho = renderizarPainel(
      PainelDasFontes,
      "Fornecedores e Fontes Consultadas",
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /Escrever a partir das fontes/ }),
    )

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Art. 23, § 1º")
    expect(texto).toContain(PAINEL)
  })
})

describe("preços coletados", () => {
  it("agrupa por item e marca a série curta do Art. 6º", async () => {
    comColetas([coleta("Papel A4", PAINEL, 24), coleta("Papel A4", "Mídia", 25)])
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    expect(await screen.findByText("Papel A4")).toBeInTheDocument()
    expect(
      screen.getByText("Menos de três preços — Art. 6º, § 5º exige justificativa"),
    ).toBeInTheDocument()
  })

  it("marca o preço que destoa da mediana, sem tirá-lo da série", async () => {
    comColetas([
      coleta("Papel A4", PAINEL, 24),
      coleta("Papel A4", "Mídia", 25),
      coleta("Papel A4", "Fornecedor", 90),
    ])
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    expect(await screen.findByText("Destoa da mediana — examine")).toBeInTheDocument()
    // Continua na lista: descartar exige critério descrito (Art. 6º, § 3º).
    expect(screen.getByText("R$ 90,00")).toBeInTheDocument()
  })

  it("registra um preço com fonte, data e hora", async () => {
    comColetas([])
    comConsolidacao([
      { description: "Papel A4", unit: "RESMA", total: 100, summable: true, byDepartment: [] },
    ])
    let enviado: Record<string, unknown> | null = null
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/:id/price-quotes`, async ({ request }) => {
        enviado = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(coleta("Papel A4", PAINEL, 24), { status: 201 })
      }),
    )
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    await userEvent.click(await screen.findByRole("button", { name: "Registrar Preço" }))

    const registrar = screen.getByRole("button", { name: "Registrar Preço" })
    expect(registrar).toBeDisabled()

    await userEvent.click(await screen.findByRole("button", { name: "Item Pesquisado" }))
    await userEvent.click(await screen.findByRole("option", { name: "Papel A4" }))
    await userEvent.click(screen.getByRole("button", { name: "Fonte Consultada" }))
    await userEvent.click(await screen.findByRole("option", { name: /Painel de Preços/ }))
    await userEvent.type(screen.getByLabelText(/Preço Obtido/), "2490")
    await userEvent.click(screen.getByRole("button", { name: "Registrar Preço" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect(enviado!.item).toBe("Papel A4")
    expect(enviado!.unitPrice).toBe(2490)
    // A hora vai junto: o Art. 5º, III a exige para mídia e sítio eletrônico.
    expect(String(enviado!.collectedAt)).toMatch(/T\d{2}:\d{2}/)
  })

  it("retirar um preço pede confirmação", async () => {
    comColetas([coleta("Papel A4", PAINEL, 24)])
    let removida = ""
    servidor.use(
      http.delete(
        `${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId`,
        ({ params }) => {
          removida = String(params.coletaId)
          return new HttpResponse(null, { status: 204 })
        },
      ),
    )
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    await userEvent.click(await screen.findByRole("button", { name: /Retirar/ }))
    expect(screen.getByText("Retirar da pesquisa?")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(removida).toBe("")

    await userEvent.click(screen.getByRole("button", { name: /Retirar/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(removida).not.toBe(""))
  })

  it("corrige um preço no mesmo registro", async () => {
    comColetas([coleta("Papel A4", PAINEL, 24)])
    let corpo: Record<string, unknown> | null = null
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/price-quotes/:coletaId`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(coleta("Papel A4", PAINEL, 25))
        },
      ),
    )
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    await userEvent.click(await screen.findByRole("button", { name: "Corrigir" }))
    // Correção usa campo livre para o item: a coleta já existe e o texto dela é
    // o que precisa ser ajustado.
    const item = screen.getByLabelText(/Item Pesquisado/)
    expect(item).toHaveValue("Papel A4")
    await userEvent.click(screen.getByRole("button", { name: "Salvar Correção" }))

    await waitFor(() => expect(corpo).not.toBeNull())
    expect(corpo!.item).toBe("Papel A4")
  })

  it("quando a consulta falha, a seção diz isso", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/price-quotes`, () =>
        HttpResponse.json({ detail: "erro" }, { status: 500 }),
      ),
    )
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    expect(await screen.findByText("Não foi possível listar os preços coletados.")).toBeInTheDocument()
  })

  it("sem coleta, explica de onde saem as outras seções", async () => {
    comColetas([])
    renderizarPainel(PainelDasColetas, "Preços Coletados")

    expect(await screen.findByText(/Nenhum preço coletado\./)).toBeInTheDocument()
  })
})

describe("análise crítica", () => {
  it("mostra menor, média, mediana e maior por item", async () => {
    comColetas([
      coleta("Papel A4", PAINEL, 20),
      coleta("Papel A4", "Mídia", 30),
      coleta("Papel A4", "Fornecedor", 40),
    ])
    renderizarPainel(PainelDaAnaliseCritica, "Análise Crítica dos Preços Obtidos")

    expect(await screen.findByText("R$ 20,00")).toBeInTheDocument()
    expect(screen.getAllByText("R$ 30,00")).toHaveLength(2)
    expect(screen.getByText("R$ 40,00")).toBeInTheDocument()
  })

  it("diz que não descarta preço sozinha", async () => {
    comColetas([
      coleta("Papel A4", PAINEL, 24),
      coleta("Papel A4", "Mídia", 25),
      coleta("Papel A4", "Fornecedor", 90),
    ])
    renderizarPainel(PainelDaAnaliseCritica, "Análise Crítica dos Preços Obtidos")

    expect(await screen.findByText(/não os descarta/)).toBeInTheDocument()
  })

  it("avisa da série curta e escreve a análise", async () => {
    comColetas([coleta("Papel A4", PAINEL, 24)])
    const setRascunho = renderizarPainel(
      PainelDaAnaliseCritica,
      "Análise Crítica dos Preços Obtidos",
    )

    expect(await screen.findByText(/§ 5º admite menos apenas mediante justificativa/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /Escrever a análise/ }))
    expect(setRascunho.mock.calls[0]?.[0]).toContain("Art. 6º da IN SEGES/ME nº 65/2021")
  })

  it("sem coleta, manda registrar", async () => {
    comColetas([])
    renderizarPainel(PainelDaAnaliseCritica, "Análise Crítica dos Preços Obtidos")

    expect(await screen.findByText(/A análise crítica compara os preços obtidos/)).toBeInTheDocument()
  })
})

describe("metodologia e preço de referência", () => {
  const serie = [
    coleta("Papel A4", PAINEL, 20),
    coleta("Papel A4", "Mídia", 30),
    coleta("Papel A4", "Fornecedor", 40),
  ]
  const consolidado = [
    { description: "Papel A4", unit: "RESMA", total: 100, summable: true, byDepartment: [] },
  ]

  it("apura pelo método escolhido e multiplica pela quantidade consolidada", async () => {
    comColetas(serie)
    comConsolidacao(consolidado)
    renderizarPainel(PainelDoPrecoDeReferencia, "Metodologia e Preço de Referência")

    // Média de 20, 30 e 40 = 30; × 100 resmas = 3.000,00 — na linha do item e
    // no total, que aqui coincidem porque há um item só.
    expect(await screen.findAllByText("R$ 3.000,00")).toHaveLength(2)

    await userEvent.click(screen.getByRole("button", { name: "Método de Apuração" }))
    await userEvent.click(await screen.findByRole("option", { name: /Menor dos preços/ }))

    // Menor = 20; × 100 = 2.000,00.
    expect(await screen.findAllByText("R$ 2.000,00")).toHaveLength(2)
  })

  it("o método volta do texto já gravado na seção", async () => {
    comColetas(serie)
    comConsolidacao(consolidado)
    renderizarPainel(
      PainelDoPrecoDeReferencia,
      "Metodologia e Preço de Referência",
      "Adotou-se como método de apuração a mediana dos preços obtidos, na forma do Art. 6º.",
    )

    // A escolha não vive na memória da aba: ela é a linha do texto da seção.
    const campo = await screen.findByRole("button", { name: "Método de Apuração" })
    expect(campo).toHaveTextContent("Mediana dos preços obtidos")
  })

  it("escreve a memória de cálculo com o método e o total", async () => {
    comColetas(serie)
    comConsolidacao(consolidado)
    const setRascunho = renderizarPainel(
      PainelDoPrecoDeReferencia,
      "Metodologia e Preço de Referência",
    )

    await userEvent.click(
      await screen.findByRole("button", { name: /Escrever a memória de cálculo/ }),
    )

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Art. 6º da IN SEGES/ME nº 65/2021")
    expect(texto).toContain("Preço de referência total da contratação: R$ 3.000,00")
  })

  it("sem coleta, o preço de referência não é inventado", async () => {
    comColetas([])
    renderizarPainel(PainelDoPrecoDeReferencia, "Metodologia e Preço de Referência")

    expect(await screen.findByText(/O preço de referência sai da série da pesquisa/)).toBeInTheDocument()
  })
})
