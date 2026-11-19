import { expect, test, type Locator, type Page } from "@playwright/test"

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
test.use({ viewport: { width: 860, height: 1100 }, deviceScaleFactor: 2, reducedMotion: "reduce" })

const API = "**/api/v1"
const ROTA_DO_ETP = `/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`

const sessaoDeExemplo = {
  ...sessaoServidor,
  organization: { ...sessaoServidor.organization, name: "Prefeitura de Exemplo" },
}

// O indicador de desenvolvimento do Next (a bolinha "N") não pode ir para a imagem pública.
const SEM_INDICADOR_DO_NEXT = "nextjs-portal { display: none !important; }"

/**
 * Sem foto: o app mostra as iniciais. O dublê de `e2e/api.ts` registra a rota da foto
 * antes de `users**`, e o Playwright dá precedência à rota registrada por último —
 * então a foto responde `[]` em JSON com status 200, vira um blob inválido e aparece
 * como imagem quebrada. Registrar de novo aqui, depois dele, devolve o 404 esperado.
 */
async function semFotoDePerfil(page: Page) {
  await page.route(`${API}/users/*/avatar`, (r) => r.fulfill({ status: 404, body: "" }))
}

/** Espera o botão da IA sair da transição de habilitado/desabilitado antes de fotografar. */
async function esperarOBotaoDaIa(page: Page) {
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  await page.waitForTimeout(600)
}

/**
 * Recorta a captura na região que importa: a união das caixas dadas, com folga.
 * A tela inteira do app, encolhida na moldura da landing, fica ilegível.
 */
async function recortar(page: Page, alvos: Locator[], caminho: string, folga = 24) {
  const caixas = []
  for (const alvo of alvos) {
    const caixa = await alvo.boundingBox()
    if (!caixa) throw new Error("alvo da captura sem caixa na tela")
    caixas.push(caixa)
  }
  const x = Math.max(0, Math.min(...caixas.map((c) => c.x)) - folga)
  const y = Math.max(0, Math.min(...caixas.map((c) => c.y)) - folga)
  const direita = Math.max(...caixas.map((c) => c.x + c.width)) + folga
  const base = Math.max(...caixas.map((c) => c.y + c.height)) + folga
  console.log(caminho, { x, y, width: direita - x, height: base - y })
  await page.screenshot({ path: caminho, clip: { x, y, width: direita - x, height: base - y } })
}

const NECESSIDADE =
  "A Secretaria de Administração precisa repor o material de expediente das unidades, hoje com estoque abaixo do consumo mensal."

test("captura o editor do ETP", async ({ page }) => {
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await semFotoDePerfil(page)
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.goto(rota(ROTA_DO_ETP))
  await page.addStyleTag({ content: SEM_INDICADOR_DO_NEXT })

  const campo = page.getByLabel("Descrição da Necessidade")
  await expect(campo).toBeVisible()
  await campo.fill(NECESSIDADE)
  await esperarOBotaoDaIa(page)
  await recortar(
    page,
    [page.getByText("Demonstre o que a seção pede."), page.getByText("Descrição da Necessidade"), campo, page.getByRole("button", { name: "Gerar com IA" })],
    "public/landing/editor-etp.png",
    40,
  )
})

test("captura a proposta da IA", async ({ page }) => {
  // Mais estreito que o editor: o texto quebra e a captura fica mais alta, legível ao lado da lista.
  await page.setViewportSize({ width: 640, height: 1100 })
  await comSessao(page, sessaoDeExemplo)
  await comProcessoEDocumento(page)
  await semFotoDePerfil(page)
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
  // O aviso flutuante cobre o painel: espera sumir.
  await expect(page.getByText("Rascunho gerado.")).toBeHidden({ timeout: 15_000 })
  await recortar(
    page,
    [
      page.getByText("Rascunho com base no DFD, no PCA e no processo. Revise antes de salvar."),
      page.getByText("Dados de Origem Disponíveis"),
    ],
    "public/landing/proposta-ia.png",
    56,
  )
})
