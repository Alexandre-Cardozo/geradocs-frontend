import { expect, test, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota, sessaoServidor } from "./api"

/**
 * Gera as capturas da landing a partir do aplicativo real, com os dados fictícios
 * dos dublês de `e2e/api.ts`. Não é teste: só roda quando pedido —
 *
 *     CAPTURAS_LANDING=1 npx playwright test e2e/capturas-landing.spec.ts
 *
 * O órgão da sessão é trocado por um nome genérico: o fixture usa um município
 * real, e uma página pública com o nome dele sugeriria um endosso que não existe.
 */
test.skip(!process.env.CAPTURAS_LANDING, "Só roda quando se pedem as capturas da landing.")
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })

const API = "**/api/v1"
const ROTA_DO_ETP = `/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`

const sessaoDeExemplo = {
  ...sessaoServidor,
  organization: { ...sessaoServidor.organization, name: "Prefeitura Municipal de Exemplo" },
}

// O indicador de desenvolvimento do Next (a bolinha "N") não pode ir para a imagem pública.
const SEM_INDICADOR_DO_NEXT = "nextjs-portal { display: none !important; }"

/** Espera o botão da IA sair da transição de habilitado/desabilitado antes de fotografar. */
async function esperarOBotaoDaIa(page: Page) {
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  await page.waitForTimeout(600)
}

const NECESSIDADE =
  "A Secretaria de Administração precisa repor o material de expediente das unidades, hoje com estoque abaixo do consumo mensal."

test("captura o editor do ETP", async ({ page }) => {
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.goto(rota(ROTA_DO_ETP))
  await page.addStyleTag({ content: SEM_INDICADOR_DO_NEXT })

  const campo = page.getByLabel("Descrição da Necessidade")
  await expect(campo).toBeVisible()
  await campo.fill(NECESSIDADE)
  await esperarOBotaoDaIa(page)
  await page.screenshot({ path: "public/landing/editor-etp.png" })
})

test("captura a proposta da IA", async ({ page }) => {
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  // Na seção 1 do ETP o botão "Gerar com IA" chama `/sections/1/ai-draft` (gerarRascunhoDaNecessidadeEtp).
  await page.route(`${API}/procurement-processes/*/documents/*/sections/1/ai-draft`, (r) =>
    r.fulfill({
      json: {
        documentType: "ETP",
        sectionCode: "1",
        content: NECESSIDADE,
        evidence: [],
        missingFacts: [],
        warnings: [],
      },
    }),
  )

  await page.goto(rota(ROTA_DO_ETP))
  await page.addStyleTag({ content: SEM_INDICADOR_DO_NEXT })
  await esperarOBotaoDaIa(page)
  await page.getByRole("button", { name: "Gerar com IA" }).click()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(NECESSIDADE)
  await esperarOBotaoDaIa(page)
  await page.screenshot({ path: "public/landing/proposta-ia.png" })
})
