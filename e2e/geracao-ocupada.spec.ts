import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A geração por IA e o clique duplo (ADR-067 do back-end).
 *
 * O servidor recusa com 429 (`AI_BUSY`) a segunda geração da mesma seção
 * enquanto a primeira não termina. A tela precisa nem mandar a segunda e, se o
 * servidor recusar mesmo assim, dizer o motivo — sem travar nem perder o que
 * a pessoa escreveu.
 */
const API = "**/api/v1"
const MENSAGEM = "Já existe uma geração em andamento para esta seção. Aguarde alguns segundos e tente de novo."

test("o clique duplo manda um pedido só, e a recusa por geração em andamento aparece com o motivo", async ({
  page,
}) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.route(`${API}/organizations/*/ai-budget`, (r) =>
    r.fulfill({
      json: { defined: true, available: true, limitAmount: 100, spentAmount: 1, remainingAmount: 99 },
    }),
  )

  let pedidos = 0
  let liberar: () => void = () => {}
  const demora = new Promise<void>((resolve) => {
    liberar = resolve
  })
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, async (r) => {
    pedidos += 1
    if (pedidos === 1) {
      await demora
      await r.fulfill({
        json: {
          documentType: "ETP",
          sectionCode: "1",
          content: "Necessidade descrita pela IA.",
          evidence: [],
          missingFacts: [],
          warnings: [],
        },
      })
      return
    }
    await r.fulfill({
      status: 429,
      headers: { "Retry-After": "3" },
      contentType: "application/problem+json",
      json: { status: 429, title: "Geração de IA em andamento", detail: MENSAGEM, code: "AI_BUSY" },
    })
  })

  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))
  const gerar = page.getByRole("button", { name: /Gerar com IA|Gerando com IA/ })
  // Habilitado só depois de a tela saber que há IA e teto no mês.
  await expect(gerar).toBeEnabled()
  await gerar.click()
  // Com a primeira geração em andamento, o botão não aceita outro clique.
  await expect(gerar).toBeDisabled()
  await gerar.click({ force: true, noWaitAfter: true }).catch(() => {})
  expect(pedidos).toBe(1)

  liberar()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue("Necessidade descrita pela IA.")

  // O servidor ainda ocupado (outra aba, por exemplo): a tela diz o motivo e o texto fica.
  page.once("dialog", (dialog) => dialog.accept())
  await gerar.click()
  await expect(page.getByText(MENSAGEM)).toBeVisible()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue("Necessidade descrita pela IA.")
  await expect(gerar).toBeEnabled()
})
