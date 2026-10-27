import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A revisão da IA na etapa final (§87, ADR-054 do back-end): a sugestão
 * aparece marcada sobre o texto da seção, e só entra se for aceita.
 */
const API = "**/api/v1"

test("a revisão marca a sugestão e grava só a aceita", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  const pedidos: unknown[] = []
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*/generate`, async (r) => {
    pedidos.push(r.request().postDataJSON())
    await r.fulfill({ json: { text: "Necessidade de 500 resmas descrita pela Secretaria de Educação." } })
  })

  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))
  await page.getByLabel("Descrição da Necessidade").fill("Necessidade descrita pela secretaria.")
  await page.getByRole("button", { name: /Salvar Rascunho/ }).click()

  await page.getByRole("button", { name: /Revisão e Geração/ }).click()
  await page.getByRole("button", { name: "Revisar com IA" }).click()

  // Só a seção escrita vai à revisão, com o texto dela e o modo declarado.
  await expect(page.getByText(/1 com sugestão/)).toBeVisible()
  expect(pedidos).toEqual([{ draft: "Necessidade descrita pela secretaria.", mode: "REVIEW" }])
  await expect(page.locator("ins").filter({ hasText: "de 500 resmas" })).toBeVisible()

  const salvo = page.waitForRequest(
    (req) => req.method() === "PUT" && /\/sections\/1$/.test(new URL(req.url()).pathname),
  )
  await page.getByRole("button", { name: "Aceitar" }).click()
  expect((await salvo).postDataJSON()).toMatchObject({
    content: "Necessidade de 500 resmas descrita pela Secretaria de Educação.",
  })
  await expect(page.getByRole("button", { name: "Aceitar" })).toHaveCount(0)
})
