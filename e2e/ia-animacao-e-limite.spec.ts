import { expect, test, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A IA no editor de seção, no navegador de verdade:
 *
 * - §107: o texto da IA é escrito no campo, e não colado de uma vez, com a IA
 *   trabalhando nas cores da marca enquanto o pedido corre; salvar no meio da
 *   escrita grava o texto inteiro, nunca a metade;
 * - §109: o limite de IA do plano esgotado abre o aviso flutuante com o
 *   contato da GovPro; o botão não desliga, e quando o limite é renovado o
 *   clique seguinte funciona.
 */
const API = "**/api/v1"
const TEXTO =
  "A contratação atende à necessidade das escolas rurais do município, que hoje não contam com material suficiente " +
  "para o ano letivo. A entrega será feita em lotes mensais, para que as unidades sem espaço de armazenamento recebam " +
  "apenas o necessário a cada período. O quantitativo considera o número de alunos matriculados e o consumo médio dos " +
  "últimos três exercícios, conforme os registros da secretaria. A solução escolhida é a aquisição por registro de " +
  "preços, que permite contratar conforme a demanda efetiva, sem compromisso de compra integral."

const recusaPorLimite = {
  status: 402,
  contentType: "application/problem+json",
  json: {
    status: 402,
    title: "Orçamento de IA indisponível",
    detail: "O orçamento de IA da organização já foi consumido neste período. A redação manual continua disponível.",
    code: "AI_BUDGET_EXHAUSTED",
  },
}

async function comIaETeto(page: Page) {
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

test("o texto da IA é escrito no campo, e salvar no meio da escrita grava o texto inteiro", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIaETeto(page)

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
  const gravados: string[] = []
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1`, async (r) => {
    if (r.request().method() === "PUT") gravados.push((r.request().postDataJSON() as { content: string }).content)
    await r.fallback()
  })

  const gerar = await abrirEditor(page)
  await gerar.click()

  // Enquanto o pedido corre, a IA aparece trabalhando: o símbolo da marca e a
  // borda nas cores dela, no lugar do antigo "aguarde".
  const trabalhando = page.getByRole("status").filter({ hasText: "Gerando o rascunho da seção com IA." })
  await expect(trabalhando).toBeVisible()
  await expect(trabalhando.locator('[data-marca="carregando"]')).toBeVisible()

  liberar()
  const campo = page.getByLabel("Descrição da Necessidade")
  // O texto vai aparecendo: há um momento em que só o começo dele está no campo.
  await expect
    .poll(async () => {
      const valor = await campo.inputValue()
      return valor.length > 0 && valor.length < TEXTO.length && TEXTO.startsWith(valor)
    }, { intervals: [20] })
    .toBe(true)
  await expect(page.locator("[data-ia-escrevendo]")).toHaveCount(1)

  // Escrever a orientação enquanto a IA escreve: o texto digitado fica, e a
  // escrita da IA segue. Na captura, o React re-renderizava antes e apagava.
  const orientacao = page.getByRole("textbox", { name: "Orientação para a IA (opcional)" })
  await orientacao.fill("Enfatizar a entrega em lotes.")
  await expect(orientacao).toHaveValue("Enfatizar a entrega em lotes.")

  // Salvar no meio da escrita: o clique completa o texto antes de gravar.
  await page.getByRole("button", { name: "Salvar Rascunho" }).click()
  await expect.poll(() => gravados.length).toBe(1)
  expect(gravados[0]).toBe(TEXTO)
  await expect(campo).toHaveValue(TEXTO)
  await expect(page.locator("[data-ia-escrevendo]")).toHaveCount(0)
})

test("com movimento reduzido, o texto entra de uma vez, como antes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIaETeto(page)
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    r.fulfill({
      json: { documentType: "ETP", sectionCode: "1", content: TEXTO, evidence: [], missingFacts: [], warnings: [] },
    }),
  )

  const gerar = await abrirEditor(page)
  await gerar.click()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(TEXTO)
  await expect(page.locator("[data-ia-escrevendo]")).toHaveCount(0)
})

test("o limite de IA do plano esgotado abre o aviso com o contato da GovPro, e o limite renovado volta a gerar", async ({
  page,
}) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIaETeto(page)
  let renovado = false
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    renovado
      ? r.fulfill({
          json: { documentType: "ETP", sectionCode: "1", content: TEXTO, evidence: [], missingFacts: [], warnings: [] },
        })
      : r.fulfill(recusaPorLimite),
  )

  const gerar = await abrirEditor(page)
  const campo = page.getByLabel("Descrição da Necessidade")
  await campo.fill("Texto que a pessoa já escreveu.")
  page.once("dialog", (dialog) => dialog.accept())
  await gerar.click()

  const aviso = page.getByRole("alertdialog", { name: "Limite de IA Atingido" })
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText("limite de geração por IA do plano contratado")
  await expect(aviso).toContainText("fale com a GovPro")
  await expect(aviso.getByRole("link", { name: "Falar com a GovPro" })).toHaveAttribute(
    "href",
    /^mailto:contato@govpro\.com\.br\?subject=/,
  )
  // O texto da pessoa fica, e a recusa não vira também um toast.
  await expect(campo).toHaveValue("Texto que a pessoa já escreveu.")
  await expect(page.getByText(/orçamento de IA da organização já foi consumido/)).toHaveCount(0)

  await page.keyboard.press("Escape")
  await expect(aviso).toHaveCount(0)
  // O botão não desliga: tentar de novo abre o aviso de novo.
  await expect(gerar).toBeEnabled()
  page.once("dialog", (dialog) => dialog.accept())
  await gerar.click()
  await expect(aviso).toBeVisible()
  await aviso.getByRole("button", { name: "Entendi" }).click()

  // Limite renovado: o clique seguinte gera normalmente, sem recarregar a tela.
  renovado = true
  page.once("dialog", (dialog) => dialog.accept())
  await gerar.click()
  await expect(campo).toHaveValue(TEXTO)
  await expect(aviso).toHaveCount(0)
})

test("sem popup do navegador: gerar sobre texto escrito tem Desfazer, e trocar de seção salva o rascunho da IA (§114)", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await comSessao(page)
  await comProcessoEDocumento(page)
  await comIaETeto(page)
  const dialogos: string[] = []
  page.on("dialog", async (dialog) => {
    dialogos.push(dialog.message())
    await dialog.dismiss()
  })
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft-with-sources`, (r) =>
    r.fulfill({
      json: {
        documentType: "ETP",
        sectionCode: "1",
        content: TEXTO,
        evidence: [{ source: "Processo", fact: "Objeto: Papel A4" }],
        missingFacts: [],
        warnings: [],
        proposalId: "11111111-2222-4333-8444-555555555555",
      },
    }),
  )
  const rejeitadas: string[] = []
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*/ai-proposals/*/reject`, async (r) => {
    rejeitadas.push(r.request().url())
    await r.fulfill({ status: 204 })
  })
  const gravados: Record<string, unknown>[] = []
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1`, async (r) => {
    if (r.request().method() === "PUT") gravados.push(r.request().postDataJSON() as Record<string, unknown>)
    await r.fallback()
  })

  const gerar = await abrirEditor(page)
  const campo = page.getByLabel("Descrição da Necessidade")
  await campo.fill("Texto que a pessoa escreveu.")

  // Gerar com texto na seção não pergunta nada: o rodapé oferece desfazer.
  await gerar.click()
  await expect(campo).toHaveValue(TEXTO)
  await page.getByRole("button", { name: "Desfazer" }).click()
  await expect(campo).toHaveValue("Texto que a pessoa escreveu.")
  // Desfazer o rascunho da IA é rejeitá-lo.
  await expect.poll(() => rejeitadas.length).toBe(1)

  // Gera de novo, e sai da seção sem salvar: o rascunho é salvo (e aceito) sozinho.
  await gerar.click()
  await expect(campo).toHaveValue(TEXTO)
  await page.getByRole("button", { name: /Seção 2 do ETP/ }).first().click()
  await expect.poll(() => gravados.length).toBe(1)
  expect(gravados[0]).toMatchObject({ content: TEXTO, aiProposalId: "11111111-2222-4333-8444-555555555555" })

  expect(dialogos).toEqual([])
})
