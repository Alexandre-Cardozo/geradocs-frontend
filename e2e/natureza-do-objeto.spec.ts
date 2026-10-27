import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A natureza do objeto na capa (ADR-053 do back-end): é ela que escolhe a
 * minuta da AGU do TR e do Contrato, e pode ser declarada depois da abertura.
 */
const API = "**/api/v1"

test("a natureza do objeto é declarada na edição da capa e vai ao servidor", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  let enviado: Record<string, unknown> | undefined
  let atual: Record<string, unknown> = { ...processo }
  await page.route(`${API}/procurement-processes/*`, async (r) => {
    if (r.request().method() === "PATCH") {
      enviado = r.request().postDataJSON() as Record<string, unknown>
      atual = { ...atual, objectNature: enviado.objectNature, version: 1 }
    }
    await r.fulfill({ json: atual })
  })

  await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
  await expect(page.getByText("Natureza do Objeto")).toBeVisible()
  await expect(page.getByText("Não informada")).toBeVisible()

  await page.getByRole("button", { name: "Editar Dados" }).click()
  await page.getByRole("button", { name: "Natureza do Objeto" }).click()
  await page.getByRole("option", { name: "Bens" }).click()
  await page.getByRole("button", { name: /^Salvar/ }).click()

  await expect.poll(() => enviado?.objectNature).toBe("GOODS")
  await expect(page.getByText("Bens", { exact: true })).toBeVisible()
})
