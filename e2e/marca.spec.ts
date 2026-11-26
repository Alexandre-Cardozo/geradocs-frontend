import { expect, test } from "@playwright/test"

import type { Locator, Page } from "@playwright/test"

import { comSessao, prestesALogar, rota, semSessao } from "./api"

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
  await expect(page.locator('img[src*="lahhm"], a[href*="lahhm"]')).toHaveCount(0)
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
  await expect(page.getByRole("link", { name: "contato@govpro.com.br" })).toHaveAttribute(
    "href",
    "mailto:contato@govpro.com.br",
  )
  await semMarcaAntiga(page)
})

test("a barra lateral traz o logo e a assinatura da GovPro", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/painel"))

  const barra = page.locator("aside").first()
  await esperarCarregada(barra.getByRole("img", { name: "GeraDocs" }))
  await esperarCarregada(barra.getByRole("img", { name: "Uma solução GovPro" }))
  await semMarcaAntiga(page)
})

test("login e redefinir senha trazem o slogan da marca", async ({ page }) => {
  await semSessao(page)
  for (const caminho of ["/login", "/redefinir-senha/?token=x"]) {
    await page.goto(rota(caminho))
    await expect(page.getByText("Contratações públicas inteligentes")).toBeVisible()
    await esperarCarregada(page.getByRole("img", { name: "GeraDocs" }))
  }
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

test("os ícones da GovPro e do GeraDocs são servidos", async ({ request }) => {
  for (const [caminho, tipo] of [
    ["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
    ["/icones/govpro/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
    ["/icones/govpro/icon.png", /image\/png/],
    ["/icones/govpro/apple-icon.png", /image\/png/],
    ["/icones/geradocs/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
    ["/icones/geradocs/icon.png", /image\/png/],
    ["/icones/geradocs/apple-icon.png", /image\/png/],
  ] as const) {
    const resposta = await request.get(rota(caminho))
    expect(resposta.status(), caminho).toBe(200)
    expect(resposta.headers()["content-type"], caminho).toMatch(tipo)
    expect((await resposta.body()).byteLength, caminho).toBeGreaterThan(500)
  }
})

/** De que marca são os ícones que a página declara na aba (§137). */
async function marcaDaAba(page: Page) {
  const enderecos = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""))
  const marcas = new Set(enderecos.map((e) => e.match(/\/icones\/(govpro|geradocs)\//)?.[1] ?? e))
  return [...marcas].join(",")
}

test("as páginas públicas mostram a GovPro na aba; login e senha, o GeraDocs", async ({ page }) => {
  await semSessao(page)
  for (const [caminho, marca] of [
    ["/", "govpro"],
    ["/onboarding", "govpro"],
    ["/pagina-que-nao-existe", "govpro"],
    ["/login", "geradocs"],
    ["/redefinir-senha", "geradocs"],
  ] as const) {
    await page.goto(rota(caminho))
    await expect.poll(() => marcaDaAba(page), caminho).toBe(marca)
  }
})

test("da página da GovPro ao login a aba passa ao GeraDocs, e segue nele no sistema", async ({ page }) => {
  await prestesALogar(page)
  await page.route("**/api/v1/auth/logout", (r) => r.fulfill({ status: 204, body: "" }))
  await page.goto(rota("/"))
  await expect.poll(() => marcaDaAba(page)).toBe("govpro")
  // O "Entrar" do cabeçalho leva ao login sem recarregar a página.
  await page.getByRole("link", { name: /^Entrar/ }).first().click()
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect.poll(() => marcaDaAba(page)).toBe("geradocs")

  await page.getByPlaceholder("000.000.000-00").fill("333.333.333-33")
  await page.getByPlaceholder("Sua senha").fill("UmaSenhaSegura!2026")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).not.toHaveURL(/\/login\/?$/)
  await expect.poll(() => marcaDaAba(page)).toBe("geradocs")

  await page.getByRole("button", { name: "Abrir menu do usuário" }).click()
  await page.getByRole("button", { name: "Sair da conta" }).click()
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect.poll(() => marcaDaAba(page)).toBe("geradocs")
})

test("clicar em Entrar antes de a página hidratar não deixa duas marcas na aba", async ({ page }) => {
  // O CI pegou este caso: com a máquina lenta, o clique chega antes da
  // hidratação, o React o repete como navegação interna e os ícones que vieram
  // do servidor ficavam na aba ao lado dos novos. A CPU lenta o reproduz.
  const erros: string[] = []
  page.on("pageerror", (erro) => erros.push(erro.message))
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()))
  await prestesALogar(page)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 })

  await page.goto(rota("/"), { waitUntil: "commit" })
  await page.getByRole("link", { name: /^Entrar/ }).first().click()
  await expect(page).toHaveURL(/\/login\/?$/)
  await expect.poll(() => marcaDaAba(page), { timeout: 15_000 }).toBe("geradocs")
  // O login termina de montar sem o React reclamar dos ícones que saíram.
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible()
  await expect.poll(() => marcaDaAba(page)).toBe("geradocs")
  expect(erros.filter((e) => /removeChild|hydrat|NotFoundError/i.test(e))).toEqual([])
})
