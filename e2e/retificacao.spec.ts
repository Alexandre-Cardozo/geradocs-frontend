import { expect, test, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * Retificar acontece no editor, junto da versão nova (§93).
 *
 * <p>A capa pedia a natureza e a descrição mas não deixava mudar o texto — e a
 * versão nova saía igual à anterior. O editor deixava mudar o texto, mas
 * "Regerar" não perguntava nada. O que estes testes cobram é o caminho único:
 * da capa ao editor, a edição, e a declaração indo ao servidor.
 */
const API = "**/api/v1"
const TEXTO_DA_V2 = "Necessidade de 1.200 resmas de papel A4."

/**
 * O ETP gerado na v2, com o servidor dizendo se as seções mudaram desde então
 * — comparadas com o texto que a v2 congelou, como o hash faz no servidor.
 */
async function comEtpGerado(page: Page) {
  await comSessao(page)
  await comProcessoEDocumento(page)
  let texto = TEXTO_DA_V2
  let versao = 2
  const conclusoes: Record<string, unknown>[] = []

  const documento = () => ({
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: "ETP",
    currentVersion: versao,
    finalized: true,
    changedSinceVersion: texto !== TEXTO_DA_V2,
    rectificationRequired: false,
    progress: 100,
    canGenerate: true,
    sections: [
      {
        sectionCode: "1",
        position: 1,
        title: "Seção 1 do ETP",
        legalBasis: "Art. 18, § 1º, I, Lei 14.133/21",
        hint: "Demonstre o que a seção pede.",
        required: true,
        content: texto,
        dispensationJustification: null,
        resolved: true,
      },
    ],
    pendingRequiredSections: [],
    silentGaps: [],
    body: [{ sectionCode: "1", title: "Seção 1 do ETP", text: texto, dispensed: false }],
  })
  const versaoApi = (numero: number, note: string) => ({
    version: numero,
    note,
    generatedAt: `2026-10-0${numero}T12:00:00-03:00`,
    contentHash: String(numero).repeat(64),
    body: [{ sectionCode: "1", title: "Seção 1 do ETP", text: TEXTO_DA_V2, dispensed: false }],
  })

  await page.route(`${API}/generated-documents`, (r) =>
    r.fulfill({
      json: [
        {
          processId: processo.id,
          processNumber: processo.processNumber,
          processObject: processo.objectDescription,
          documentType: "ETP",
          documentVersion: versao,
          generatedAt: "2026-10-02T12:00:00-03:00",
          files: [],
        },
      ],
    }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*`, (r) => r.fulfill({ json: documento() }))
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (r) => {
    texto = (r.request().postDataJSON() as { content: string }).content
    await r.fulfill({ json: documento() })
  })
  await page.route(`${API}/procurement-processes/*/documents/*/versions`, (r) =>
    r.fulfill({ json: [versaoApi(2, "Regeração"), versaoApi(1, "Geração inicial")] }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*/finalize`, async (r) => {
    conclusoes.push(r.request().postDataJSON() as Record<string, unknown>)
    versao += 1
    await r.fulfill({ json: documento() })
  })
  await page.route(`${API}/procurement-processes/*/documents/*/generations`, (r) =>
    r.request().method() === "POST"
      ? r.fulfill({
          json: { id: "g-3", documentVersion: versao, requestedAt: "2026-10-28T12:00:00-03:00", succeeded: true, files: [] },
        })
      : r.fulfill({ json: [] }),
  )
  return { conclusoes }
}

test.describe("retificação de documento já gerado", () => {
  test("da capa ao editor: edita o texto e declara a retificação na versão nova", async ({ page }) => {
    const { conclusoes } = await comEtpGerado(page)

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
    await page.getByRole("button", { name: "Retificar", exact: true }).click()

    // A capa não pergunta mais nada: leva ao editor, que diz o que fazer.
    await expect(page).toHaveURL(/\/processos\/documento\/?\?.*retificar=1/)
    await expect(page.getByText(/Retificando a v2 do ETP/)).toBeVisible()

    // A textarea da seção aberta — o cabeçalho também tem campo (a busca).
    const campo = page.locator("textarea").first()
    await expect(campo).toHaveValue(TEXTO_DA_V2)
    await campo.fill("Necessidade de 1.000 resmas de papel A4.")
    await page.getByRole("button", { name: /Salvar Rascunho/ }).click()
    await expect(page.getByText(/Alterado após a última geração/)).toBeVisible()

    await page.getByRole("button", { name: "Ir para Revisão e Geração" }).click()
    await expect(page.getByText("Nova Versão — v3")).toBeVisible()
    // O texto mudou: o aviso de que a v3 sairia igual à v2 não aparece.
    await expect(page.getByText(/As seções estão como na v2/)).toHaveCount(0)

    const gerar = page.getByRole("button", { name: "Gerar v3" })
    await expect(gerar).toBeDisabled()
    await page.getByText("Retificação: Erro material").click()
    const retificar = page.getByRole("button", { name: "Retificar e Gerar v3" })
    await expect(retificar).toBeDisabled()
    await page.getByLabel("O que está sendo retificado").fill("Quantidade da seção 1: 1.200 → 1.000 resmas.")
    await retificar.click()

    await expect.poll(() => conclusoes.length).toBe(1)
    expect(conclusoes[0]).toMatchObject({
      rectificationKind: "MATERIAL_ERROR",
      rectificationDetail: "Quantidade da seção 1: 1.200 → 1.000 resmas.",
    })
    await expect(page.getByText("ETP retificado — v3 · RETIFICADO.")).toBeVisible()
    await expect(page).toHaveURL(/\/documentos\/documento\/?\?/)
  })

  test("sem editar, avisa que a versão nova sairia com o mesmo texto", async ({ page }) => {
    await comEtpGerado(page)

    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=etp&etapa=revisao`))

    await expect(page.getByText(/As seções estão como na v2/)).toBeVisible()
  })

  test("regeração continua possível, e não vai como retificação", async ({ page }) => {
    const { conclusoes } = await comEtpGerado(page)

    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=etp&etapa=revisao`))
    // Sem `retificar=1`, o editor não fala em retificação fora da etapa final.
    await page.getByText("Regeração", { exact: true }).click()
    await page.getByRole("button", { name: "Regerar ETP" }).click()

    await expect.poll(() => conclusoes.length).toBe(1)
    expect(conclusoes[0]).not.toHaveProperty("rectificationKind")
    await expect(page.getByText("ETP regerado.")).toBeVisible()
  })

  test("a página do documento leva ao editor para retificar, e oferece a errata", async ({ page }) => {
    await comEtpGerado(page)

    await page.goto(rota(`/documentos/documento?processo=${processo.id}&tipo=etp`))
    await expect(page.getByText("Errata — Facultativa")).toBeVisible()
    await expect(page.getByText("Onde se lê (versão)")).toBeVisible()

    await page.getByRole("button", { name: "Retificar", exact: true }).click()
    await expect(page).toHaveURL(/\/processos\/documento\/?\?.*retificar=1/)
  })
})
