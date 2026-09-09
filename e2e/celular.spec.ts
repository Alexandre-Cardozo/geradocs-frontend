import { devices, expect, test } from "@playwright/test"

import { comSessao, rota } from "./api"

/**
 * Só a viewport e o toque do iPhone, não o preset inteiro: `devices[...]` traz
 * `defaultBrowserType: "webkit"`, e o projeto roda em Chromium — o preset
 * completo faria o teste tentar abrir um navegador que não está instalado, e
 * falhar por infraestrutura em vez de por responsividade.
 */
test.use({
  viewport: devices["iPhone 13"].viewport,
  userAgent: devices["iPhone 13"].userAgent,
  isMobile: true,
  hasTouch: true,
})

test.describe("no celular", () => {
  test("a página não rola horizontalmente", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/processos"))

    const estouro = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    // Rolagem horizontal na página inteira esconde conteúdo sem avisar. Tabela
    // larga deve rolar dentro do próprio contêiner, não arrastar a tela.
    expect(estouro).toBeLessThanOrEqual(1)
  })

  test("a navegação continua alcançável", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/"))

    // Abaixo de lg a sidebar vira gaveta: o botão precisa existir, senão o
    // celular fica sem navegação nenhuma.
    await expect(page.getByRole("button", { name: /menu|navegação/i }).first()).toBeVisible()
  })
})
