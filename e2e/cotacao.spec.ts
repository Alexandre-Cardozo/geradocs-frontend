import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A pesquisa de preços, da coleta ao preço de referência.
 *
 * <p>A pesquisa é **uma só** — a série coletada — e quatro seções da Cotação
 * leem dela: fontes consultadas (Art. 23, § 1º), série de preços (§ 2º), análise
 * crítica e preço de referência (Art. 6º da IN SEGES/ME nº 65/2021). O que esta
 * jornada cobra é a travessia entre elas, que teste de componente não alcança.
 */
const API = "**/api/v1"

const PAINEL = "Painel de Preços do Governo Federal (Compras.gov.br)"

const coleta = (item: string, fonte: string, preco: number) => ({
  id: `${item}-${fonte}-${preco}`,
  item,
  source: fonte,
  unitPrice: preco,
  collectedAt: "2026-08-20T14:30:00Z",
  supplier: "Papelaria Central",
  supplierDocument: "12.345.678/0001-90",
  proposalValidUntil: "2026-10-20",
  note: null,
  registeredAt: "2026-08-28T12:00:00Z",
})

async function comColetas(page: import("@playwright/test").Page, iniciais: unknown[]) {
  const serie = [...iniciais]
  await page.route(`${API}/procurement-processes/*/price-quotes`, async (rota) => {
    if (rota.request().method() === "POST") {
      const corpo = rota.request().postDataJSON() as Record<string, unknown>
      serie.push({ ...coleta("novo", "novo", 1), ...corpo, id: `c-${serie.length + 1}` })
      await rota.fulfill({ status: 201, json: serie[serie.length - 1] })
      return
    }
    await rota.fulfill({ json: serie })
  })
  return serie
}

/** O documento da Cotação com os códigos de seção do catálogo. */
async function comCotacao(page: import("@playwright/test").Page) {
  const secoes = new Map<string, string>()
  const titulos: Record<string, string> = {
    "2": "Fornecedores e Fontes Consultadas",
    "3": "Preços Coletados",
    "4": "Análise Crítica dos Preços Obtidos",
    "5": "Metodologia e Preço de Referência",
  }
  const documento = () => ({
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: "COTACAO",
    currentVersion: 0,
    finalized: false,
    progress: 0,
    canGenerate: false,
    sections: Object.entries(titulos).map(([codigo, titulo], i) => ({
      sectionCode: codigo,
      position: i + 1,
      title: titulo,
      legalBasis: "Art. 23, Lei 14.133/21",
      hint: "Demonstre o que a seção pede.",
      required: true,
      content: secoes.get(codigo) ?? "",
      dispensationJustification: null,
      resolved: false,
    })),
    pendingRequiredSections: [],
    silentGaps: [],
    body: [],
  })
  await page.route(`${API}/procurement-processes/*/documents/*`, (rota) =>
    rota.fulfill({ json: documento() }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (rota) => {
    const corpo = rota.request().postDataJSON() as { content?: string }
    const alvo = new URL(rota.request().url()).pathname.split("/").pop() ?? "2"
    secoes.set(alvo, corpo.content ?? "")
    await rota.fulfill({ json: documento() })
  })
}

async function abrir(page: import("@playwright/test").Page, secao: string) {
  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=cotacao`))
  await page.getByRole("button", { name: new RegExp(secao) }).first().click()
}

test.describe("pesquisa de preços", () => {
  test("a série coletada alimenta as quatro seções da Cotação", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comColetas(page, [
      coleta("Papel A4", PAINEL, 20),
      coleta("Papel A4", "Base nacional de notas fiscais eletrônicas", 30),
      coleta("Papel A4", "Pesquisa direta com no mínimo três fornecedores, mediante solicitação formal", 40),
    ])
    await comCotacao(page)

    // Seção 2: as fontes saem da série, não de uma lista digitada à parte.
    await abrir(page, "Fornecedores e Fontes Consultadas")
    await expect(page.getByText(PAINEL).first()).toBeVisible()
    await expect(page.getByText("Parâmetro prioritário").first()).toBeVisible()

    // Seção 4: a análise crítica compara os preços do mesmo item.
    await page.getByRole("button", { name: /Análise Crítica/ }).first().click()
    await expect(page.getByText("R$ 20,00").first()).toBeVisible()
    await expect(page.getByText("R$ 40,00").first()).toBeVisible()

    // Seção 5: o preço de referência sai do método escolhido.
    await page.getByRole("button", { name: /Metodologia e Preço de Referência/ }).first().click()
    await expect(page.getByRole("button", { name: "Método de Apuração" })).toBeVisible()
  })

  test("o preço que destoa é apontado, e não descartado", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comColetas(page, [
      coleta("Papel A4", PAINEL, 24),
      coleta("Papel A4", "Base nacional de notas fiscais eletrônicas", 25),
      coleta("Papel A4", "Tabela de referência aprovada pelo Poder Executivo federal", 90),
    ])
    await comCotacao(page)

    await abrir(page, "Preços Coletados")

    await expect(page.getByText("Destoa da mediana — examine")).toBeVisible()
    // Continua na série: o Art. 6º, § 3º exige critério fundamentado e descrito
    // no processo, e quem o descreve é quem responde pelos autos.
    await expect(page.getByText("R$ 90,00")).toBeVisible()
  })

  test("sem coleta, as seções mandam registrar em vez de pedir texto solto", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comColetas(page, [])
    await comCotacao(page)

    await abrir(page, "Fornecedores e Fontes Consultadas")
    await expect(page.getByText(/Nenhum preço coletado ainda/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Escrever a partir das fontes/ }),
    ).toHaveCount(0)
  })
})
