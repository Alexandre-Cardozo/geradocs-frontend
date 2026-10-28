import { expect, test } from "@playwright/test"

import type { Locator, Page } from "@playwright/test"

import { comSessao, rota, semSessao } from "./api"

/**
 * A marca GovPro + GeraDocs (opção A · Faceta, decisão §92). O que se cobra aqui
 * é que cada arte chega inteira ao navegador — inclusive sob o prefixo do
 * GitHub Pages, onde um caminho errado vira imagem quebrada sem erro nenhum — e
 * que a marca antiga não volta por descuido.
 */

/** Imagem carregada de verdade: o navegador decodificou e ela tem tamanho. */
async function esperarCarregada(imagem: Locator) {
  await expect(imagem).toBeVisible()
  await expect
    .poll(() => imagem.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))
    .toBe(true)
}

async function semMarcaAntiga(page: Page) {
  await expect(page.locator("body")).not.toContainText("LAHHM")
  await expect(page.locator('img[src*="lahhm"]')).toHaveCount(0)
}

test("o login mostra o logo oficial do GeraDocs e o crédito da GovPro", async ({ page }) => {
  await semSessao(page)
  await page.goto(rota("/login"))

  const logo = page.getByRole("img", { name: "GeraDocs" })
  await esperarCarregada(logo)
  await expect(logo).toHaveAttribute("src", /geradocs-logo-white.*\.svg/)

  const credito = page.getByRole("img", { name: "GovPro" })
  await esperarCarregada(credito)
  await expect(page.getByText("GeraDocs é uma solução")).toBeVisible()
  await expect(page.getByText("© 2026 GovPro. Todos os direitos reservados.")).toBeVisible()
  await semMarcaAntiga(page)
})

test("a barra lateral traz o logo e a assinatura da GovPro", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/"))

  const barra = page.locator("aside").first()
  await esperarCarregada(barra.getByRole("img", { name: "GeraDocs" }))
  await expect(barra.getByText("Uma solução GovPro")).toBeVisible()
  await semMarcaAntiga(page)
})

test("enquanto a sessão resolve, o símbolo animado da marca aparece", async ({ page }) => {
  await semSessao(page)
  let liberar: () => void = () => {}
  const segurando = new Promise<void>((resolve) => (liberar = resolve))
  await page.route("**/api/v1/auth/refresh", async (r) => {
    await segurando
    await r.fulfill({ status: 401, contentType: "application/problem+json", body: JSON.stringify({ detail: "Sem sessão." }) })
  })

  await page.goto(rota("/processos"))

  await expect(page.locator('[data-marca="carregando"]')).toBeVisible()
  await expect(page.getByRole("status")).toHaveText("Carregando…")
  liberar()
  await expect(page).toHaveURL(/\/login\/?$/)
})

test("favicon, ícone e ícone da Apple são servidos", async ({ request }) => {
  for (const [caminho, tipo] of [
    ["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
    ["/icon.png", /image\/png/],
    ["/apple-icon.png", /image\/png/],
  ] as const) {
    const resposta = await request.get(rota(caminho))
    expect(resposta.status(), caminho).toBe(200)
    expect(resposta.headers()["content-type"], caminho).toMatch(tipo)
    expect((await resposta.body()).byteLength, caminho).toBeGreaterThan(500)
  }
})
