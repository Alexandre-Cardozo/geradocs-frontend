import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A dotação orçamentária, do cadastro à seção.
 *
 * <p>O crédito é declarado uma vez no processo e serve três seções em três
 * documentos: a Adequação Orçamentária do TR (Art. 6º, XXIII, 'j'), a Dotação
 * do Edital (Art. 150) e a cláusula do contrato (Art. 92, VIII). O que esta
 * jornada cobra é justamente a travessia — declarar num lugar e ver aparecer
 * noutro —, que teste de componente não alcança.
 */
const API = "**/api/v1"

const CREDITO = {
  id: "b1c2d3e4-0000-4111-8222-333344445555",
  budgetUnit: "02.01 — Secretaria Municipal de Educação",
  workProgram: "12.361.0004.2.045",
  expenseNature: "3.3.90.30.00 — Material de Consumo",
  resourceSource: "1.500.1001 — Recursos Ordinários",
  ledgerCode: "1245",
  fiscalYear: 2026,
  amount: 485000,
  registeredAt: "2026-08-28T12:00:00Z",
}

/**
 * O documento do tipo pedido, com o código da seção que carrega o painel.
 *
 * <p>O painel é ligado por **código de seção** dentro do tipo — 9 no Contrato,
 * 12 no Edital —, e o fixture geral devolve as seções do ETP. Sem isto, a seção
 * da dotação simplesmente não existiria na trilha.
 */
async function comDocumentoDe(
  page: import("@playwright/test").Page,
  tipo: string,
  codigo: string,
  titulo: string,
) {
  const secoes = new Map<string, string>()
  const documento = () => ({
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: tipo,
    currentVersion: 0,
    finalized: false,
    progress: 0,
    canGenerate: false,
    sections: [
      {
        sectionCode: "1",
        position: 1,
        title: `Seção 1 do ${tipo}`,
        legalBasis: "Art. 25, caput, Lei 14.133/21",
        hint: "Demonstre o que a seção pede.",
        required: true,
        content: secoes.get("1") ?? "",
        dispensationJustification: null,
        resolved: false,
      },
      {
        sectionCode: codigo,
        position: 2,
        title: titulo,
        legalBasis: "Art. 150, Lei 14.133/21",
        hint: "Indique a dotação orçamentária que suportará a despesa.",
        required: true,
        content: secoes.get(codigo) ?? "",
        dispensationJustification: null,
        resolved: false,
      },
    ],
    pendingRequiredSections: [],
    silentGaps: [],
    body: [],
  })
  await page.route(`${API}/procurement-processes/*/documents/*`, (rota) =>
    rota.fulfill({ json: documento() }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (rota) => {
    const corpo = rota.request().postDataJSON() as { content?: string }
    const alvo = new URL(rota.request().url()).pathname.split("/").pop() ?? "1"
    secoes.set(alvo, corpo.content ?? "")
    await rota.fulfill({ json: documento() })
  })
}

/** O servidor guarda o que recebe: é o que faz a travessia valer. */
async function comDotacoes(page: import("@playwright/test").Page, iniciais = [CREDITO]) {
  const creditos = [...iniciais]
  await page.route(`${API}/procurement-processes/*/budget-appropriations`, async (rota) => {
    if (rota.request().method() === "POST") {
      const corpo = rota.request().postDataJSON() as Record<string, unknown>
      creditos.push({ ...CREDITO, ...corpo, id: `c-${creditos.length + 1}` } as typeof CREDITO)
      await rota.fulfill({ status: 201, json: creditos[creditos.length - 1] })
      return
    }
    await rota.fulfill({ json: creditos })
  })
  await page.route(`${API}/procurement-processes/*/budget-appropriations/*`, async (rota) => {
    if (rota.request().method() === "DELETE") {
      creditos.length = 0
      await rota.fulfill({ status: 204, body: "" })
      return
    }
    await rota.fulfill({ json: creditos[0] })
  })
  return creditos
}

test.describe("dotação orçamentária", () => {
  test("declarada no processo, aparece na seção do contrato", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comDotacoes(page)
    await comDocumentoDe(page, "CONTRATO", "9", "Da Dotação Orçamentária")

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
    await expect(page.getByText("12.361.0004.2.045").first()).toBeVisible()
    // O valor estimado do processo é R$ 485.000,00: o crédito cobre a despesa.
    await expect(page.getByText("A despesa está coberta").first()).toBeVisible()

    // A travessia: o mesmo crédito, na cláusula que o Art. 92, VIII exige.
    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=contrato`))
    await page.getByRole("button", { name: /Da Dotação Orçamentária/ }).first().click()
    await expect(page.getByText("3.3.90.30.00 — Material de Consumo").first()).toBeVisible()
  })

  test("sem crédito, a seção diz que a ausência é causa de nulidade", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comDotacoes(page, [])
    await comDocumentoDe(page, "EDITAL", "12", "Da Dotação Orçamentária")

    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=edital`))
    await page.getByRole("button", { name: /Da Dotação Orçamentária/ }).first().click()

    await expect(page.getByText(/Art. 150 da Lei 14.133\/21/)).toBeVisible()
    // Sem crédito não há rascunho a montar: o parágrafo afirma de onde sai o
    // dinheiro.
    await expect(
      page.getByRole("button", { name: /Escrever a partir dos créditos/ }),
    ).toHaveCount(0)
  })

  test("o rascunho da seção sai dos créditos declarados", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comDotacoes(page)
    await comDocumentoDe(page, "EDITAL", "12", "Da Dotação Orçamentária")

    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=edital`))
    await page.getByRole("button", { name: /Da Dotação Orçamentária/ }).first().click()
    await page.getByRole("button", { name: /Escrever a partir dos créditos/ }).click()

    await expect(page.locator("main textarea")).toHaveValue(/12\.361\.0004\.2\.045/)
    // A IA continua ao lado: um rascunho não substitui o botão de gerar (§66).
    await expect(page.getByRole("button", { name: /Gerar com IA/ })).toBeVisible()
  })
})
