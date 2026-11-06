import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A capa do processo se edita num lugar só: "Editar Dados" abre todos os
 * campos do bloco principal, e um "Salvar" grava tudo junto, a troca de
 * modalidade e os contextos da contratação inclusive.
 */
const API = "**/api/v1"

test("Editar Dados muda modalidade, responsável, natureza e contextos, e um Salvar grava tudo", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  const COLEGA = "9d8c7b6a-1111-4222-8333-444455556666"
  await page.route(`${API}/staff`, (r) =>
    r.fulfill({ json: [{ id: COLEGA, name: "Ana Paula Ribeiro", cpf: "***.456.789-**" }] }),
  )
  let patch: Record<string, unknown> | undefined
  let put: unknown
  let atual: Record<string, unknown> = { ...processo }
  await page.route(`${API}/procurement-processes/*`, async (r) => {
    if (r.request().method() === "PATCH") {
      patch = r.request().postDataJSON() as Record<string, unknown>
      atual = { ...atual, ...patch, version: 1 }
    }
    await r.fulfill({ json: atual })
  })
  let confirmados: string[] = []
  const contextos = () => ({
    catalogVersion: "2026-11",
    contexts: [
      {
        code: "REGISTRO_DE_PRECOS",
        title: "Registro de Preços",
        description: "A contratação será por ata de registro de preços.",
        confirmed: confirmados.includes("REGISTRO_DE_PRECOS"),
        confirmedAt: null,
        topics: [],
      },
    ],
    natures: [],
  })
  await page.route(`${API}/procurement-processes/*/contracting-contexts`, async (r) => {
    if (r.request().method() === "PUT") {
      put = r.request().postDataJSON()
      confirmados = (put as { codes: string[] }).codes
    }
    await r.fulfill({ json: contextos() })
  })

  await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
  // Tudo é campo: status e modalidade em etiqueta, a movimentação com a hora.
  await expect(page.getByText("Status", { exact: true })).toBeVisible()
  await expect(page.getByText("Modalidade", { exact: true })).toBeVisible()
  await expect(page.getByText(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/).first()).toBeVisible()
  // Nenhum campo tem edição própria: nem lápis na modalidade, nem nos contextos.
  await expect(page.getByRole("button", { name: "Trocar modalidade" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Editar contextos da contratação" })).toHaveCount(0)

  await page.getByRole("button", { name: "Editar Dados" }).click()
  await page.getByRole("button", { name: "Modalidade do processo" }).click()
  await page.getByRole("option", { name: "Concorrência", exact: true }).click()
  await expect(page.getByText(/Entram para elaboração|Nenhum documento novo/)).toBeVisible()
  // Responsável e Última Movimentação continuam à vista na edição.
  await expect(page.getByText("Última Movimentação", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Responsável pelo processo" }).click()
  await page.getByRole("option", { name: "Ana Paula Ribeiro" }).click()
  // O valor se edita aqui também: moeda em reais, positiva, com duas casas.
  const valor = page.getByRole("textbox", { name: "Valor estimado" })
  await valor.fill("0")
  await expect(page.getByRole("button", { name: /^Salvar/ })).toBeDisabled()
  await valor.fill("")
  await valor.pressSequentially("-12a34,567")
  await expect(valor).toHaveValue("1.234,56")
  await page.getByRole("radiogroup", { name: "Natureza do Objeto" }).getByRole("radio", { name: "Bens" }).click()
  await page.getByRole("checkbox", { name: /Registro de Preços/ }).click()
  await page.getByRole("button", { name: /^Salvar/ }).click()

  await expect.poll(() => patch?.modality).toBe("COMPETITION")
  expect(patch?.objectNature).toBe("GOODS")
  expect(patch?.responsibleUserId).toBe(COLEGA)
  expect(patch?.estimatedValue).toBe(1234.56)
  await expect.poll(() => put).toEqual({ codes: ["REGISTRO_DE_PRECOS"] })
  await expect(page.getByRole("button", { name: "Editar Dados" })).toBeVisible()
  await expect(page.getByText("Registro de Preços", { exact: true })).toBeVisible()
  // Em Documentos do Processo, os obrigatórios da modalidade levam o asterisco.
  await expect(page.getByText("obrigatório nesta modalidade")).toBeVisible()
  await expect(page.getByText("(obrigatório)").first()).toBeAttached()
})
