import { expect, test, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * O GovBô nas ações com IA (§129), no navegador de verdade: começou o pedido, o
 * Bô entra; a resposta chegou, ele comemora e solta confetes; só então o texto é
 * escrito no campo, e o Bô vai embora. Com erro, ele sai sem festa e a mensagem
 * não espera a animação. Com `CAPTURAS_BO=<pasta>`, grava quadros da sequência.
 */
const API = "**/api/v1"
const TEXTO =
  "A contratação atende à necessidade das escolas rurais do município, que hoje não contam com material suficiente para o ano letivo."
const PASTA = process.env.CAPTURAS_BO

async function comIa(page: Page) {
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.route(`${API}/organizations/*/ai-budget`, (r) =>
    r.fulfill({ json: { defined: true, available: true, limitAmount: 100, spentAmount: 1, remainingAmount: 99 } }),
  )
}

async function abrirEditor(page: Page) {
  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))
  const gerar = page.getByRole("button", { name: /Gerar com IA|Gerando com IA/ })
  await expect(gerar).toBeEnabled()
  return gerar
}

async function foto(page: Page, nome: string) {
  if (PASTA) await page.screenshot({ path: `${PASTA}/${nome}.png` })
}

test("gerar com IA: o Bô entra, comemora com confetes, o texto é escrito e ele vai embora", async ({ page }) => {
  // Erro de execução no laço de quadros não derruba o teste sozinho: é preciso ouvir.
  const errosDaPagina: string[] = []
  page.on("pageerror", (erro) => errosDaPagina.push(erro.message))
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIa(page)
  let liberar: () => void = () => {}
  const demora = new Promise<void>((resolve) => {
    liberar = resolve
  })
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, async (r) => {
    await demora
    await r.fulfill({
      json: { documentType: "ETP", sectionCode: "1", content: TEXTO, evidence: [], missingFacts: [], warnings: [] },
    })
  })

  const gerar = await abrirEditor(page)
  const palco = page.locator("[data-palco-da-ia]")
  const campo = page.getByLabel("Descrição da Necessidade")
  // Nada do Bô antes da ação: a camada só existe durante ela.
  await expect(palco).toHaveCount(0)

  await gerar.click()
  await expect(palco.locator('[data-mascote="govbo"]')).toBeVisible()
  // O carregamento padrão continua: o Bô se soma a ele, não o tira.
  await expect(page.getByRole("status").filter({ hasText: "Gerando o rascunho da seção com IA." })).toBeVisible()
  await page.waitForTimeout(350)
  await foto(page, "1-entrando")
  // Enquanto a IA pensa, o balão de pensamento aparece acima dele.
  await page.waitForTimeout(1500)
  await foto(page, "2-pensando")
  await expect(palco.locator(".extra svg")).toBeVisible()
  expect(await campo.inputValue()).toBe("")

  liberar()
  // A comemoração vem antes do texto: os confetes saem, e o campo ainda espera.
  await expect(page.locator("[data-confetes]")).toHaveCount(1)
  expect(await campo.inputValue()).toBe("")
  await foto(page, "3-confetes")
  await page.waitForTimeout(300)
  await foto(page, "4-festa")

  // Depois o texto é escrito, e o Bô vai embora.
  await expect(campo).toHaveValue(TEXTO, { timeout: 8000 })
  await foto(page, "5-saindo")
  await expect(palco).toHaveCount(0)
  await expect(page.locator("[data-confetes]")).toHaveCount(0)
  await page.waitForTimeout(300)
  expect(errosDaPagina).toEqual([])
})

test("resposta imediata: a sequência inteira dura uns 4 segundos, sem travar o fluxo", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIa(page)
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    r.fulfill({
      json: { documentType: "ETP", sectionCode: "1", content: TEXTO, evidence: [], missingFacts: [], warnings: [] },
    }),
  )
  const gerar = await abrirEditor(page)
  const inicio = Date.now()
  await gerar.click()
  await expect(page.locator("[data-palco-da-ia]")).toHaveCount(1)
  await expect(page.locator("[data-palco-da-ia]")).toHaveCount(0, { timeout: 8000 })
  const duracao = Date.now() - inicio
  expect(duracao).toBeGreaterThan(3500)
  expect(duracao).toBeLessThan(6500)
})

test("com erro, o Bô sai triste, sem confetes, e a mensagem aparece na hora", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIa(page)
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/problem+json",
      json: { status: 503, title: "IA indisponível", detail: "O modelo de IA não respondeu. Tente de novo." },
    }),
  )
  const gerar = await abrirEditor(page)
  await gerar.click()
  await expect(page.getByText("O modelo de IA não respondeu. Tente de novo.")).toBeVisible({ timeout: 1500 })
  await foto(page, "6-erro")
  await expect(page.locator("[data-confetes]")).toHaveCount(0)
  await expect(page.locator("[data-palco-da-ia]")).toHaveCount(0, { timeout: 4000 })
})

test("com movimento reduzido, o Bô aparece no lugar, sem voo nem confetes, e o fluxo fica curto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIa(page)
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    r.fulfill({
      json: { documentType: "ETP", sectionCode: "1", content: TEXTO, evidence: [], missingFacts: [], warnings: [] },
    }),
  )
  const gerar = await abrirEditor(page)
  await gerar.click()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(TEXTO, { timeout: 3000 })
  await expect(page.locator("[data-confetes]")).toHaveCount(0)
})
