import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A orientação do servidor à IA (§91, ADR-057 do back-end): vai só no pedido
 * da seção, os avisos da curadoria aparecem no campo, a recusa diz o motivo, e
 * trocar de seção deixa a orientação para trás.
 */
const API = "**/api/v1"

test("a orientação vai só no pedido da seção, com os avisos e a recusa no campo", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  const pedidos: { secao: string; corpo: Record<string, unknown> }[] = []
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*/generate`, async (r) => {
    const corpo = r.request().postDataJSON() as Record<string, unknown>
    const secao = new URL(r.request().url()).pathname.split("/").at(-2) ?? ""
    pedidos.push({ secao, corpo })
    if (String(corpo.guidance ?? "").includes("CPF")) {
      await r.fulfill({
        status: 400,
        json: { status: 400, title: "Requisição inválida", detail: "A orientação tem dado pessoal (CPF, e-mail, telefone ou RG). Retire-o." },
      })
      return
    }
    await r.fulfill({
      json: {
        text: "Necessidade com entrega em lotes mensais.",
        guidanceWarnings: corpo.guidance ? ["Indicação de marca só com justificativa técnica no processo (Art. 41, I, Lei 14.133/21)."] : [],
      },
    })
  })

  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))
  await page.getByText("Orientar a IA (opcional)").click()
  await page.getByRole("textbox", { name: "Orientação para esta seção" }).fill("Enfatizar entrega em lotes; indicar a marca.")
  await page.getByRole("button", { name: "Gerar com IA" }).click()

  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue("Necessidade com entrega em lotes mensais.")
  await expect(page.getByText(/Art. 41, I/)).toBeVisible()
  expect(pedidos[0]).toEqual({
    secao: "1",
    corpo: expect.objectContaining({ guidance: "Enfatizar entrega em lotes; indicar a marca." }),
  })

  // A recusa da curadoria aparece no campo, com o motivo.
  await page.getByRole("textbox", { name: "Orientação para esta seção" }).fill("O fiscal é o CPF 529.982.247-25.")
  await page.getByRole("button", { name: "Gerar com IA" }).click()
  await expect(page.getByText(/A orientação tem dado pessoal/)).toBeVisible()

  // Outra seção não leva a orientação desta.
  await page.getByRole("button", { name: /Seção 2 do ETP/ }).first().click()
  await page.getByRole("button", { name: "Gerar com IA" }).click()
  await expect.poll(() => pedidos.length).toBe(3)
  expect(pedidos[2]?.secao).toBe("2")
  expect(pedidos[2]?.corpo).not.toHaveProperty("guidance")
})
