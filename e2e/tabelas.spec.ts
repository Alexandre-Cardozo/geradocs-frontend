import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A tabela da seção, do editor ao papel (§100 e §101): inserida em grade,
 * devolvida ao texto no formato de sempre, gravada e desenhada na prévia.
 */
test.use({ reducedMotion: "reduce" })

test("a tabela inserida pelo editor vai ao texto, grava e aparece como tabela na prévia", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))

  const editor = page.getByLabel("Descrição da Necessidade")
  await editor.fill("Necessidade com memória.")
  await page.getByRole("button", { name: "Inserir tabela" }).click()
  await page.getByLabel("Cabeçalho da coluna 1").fill("Item")
  await page.getByLabel("Cabeçalho da coluna 2").fill("Quantidade")
  await page.getByRole("button", { name: "Tirar a coluna 3" }).click()
  await page.getByLabel("Linha 1, coluna 1").fill("Papel A4")
  await page.getByLabel("Linha 1, coluna 2").fill("120")

  // Aberto, o editor também passa no gate de acessibilidade do produto.
  await page.waitForLoadState("networkidle")
  const { violations } = await new AxeBuilder({ page }).include("main").analyze()
  expect(
    violations
      .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
      .filter((v) => v.id !== "color-contrast")
      .map((v) => v.id),
  ).toEqual([])

  await page.getByRole("button", { name: "Inserir no texto" }).click()
  await expect(editor).toHaveValue("Necessidade com memória.\nItem | Quantidade\nPapel A4 | 120")
  await expect(page.getByRole("button", { name: "Editar tabela 1" })).toBeVisible()

  await page.getByRole("button", { name: /Salvar Rascunho/ }).click()
  await page.reload()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(/Item \| Quantidade\nPapel A4 \| 120/)

  await page.getByRole("button", { name: /Revisão e Geração/ }).click()
  await expect(page.getByRole("columnheader", { name: "Quantidade" })).toBeVisible()
  await expect(page.getByRole("cell", { name: "Papel A4" })).toBeVisible()
})
