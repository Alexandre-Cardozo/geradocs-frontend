import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { rota, semSessao } from "./api";

/**
 * A landing (§109): estática, sem sessão, sem chamada à API. A varredura de
 * acessibilidade **não** exclui os tokens sobre navy, como faz a do aplicativo —
 * a landing só usa `on-dark`, `-65`, `-60` e `-55`, todos acima de 4,5:1.
 */
const ROTA = "/landing-page";

test("abre sem sessão, sem redirecionar para o login", async ({ page }) => {
  await semSessao(page);
  await page.goto(rota(ROTA));

  await expect(page).toHaveURL(new RegExp(`${ROTA}/?$`));
  await expect(page).toHaveTitle("GovPro | GeraDocs — Contratações públicas inteligentes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Documentos da Contratação Pública, Conforme a Lei 14.133/21" }),
  ).toBeVisible();
});

test("o pedido de demonstração é um mailto com assunto", async ({ page }) => {
  await page.goto(rota(ROTA));
  const cta = page.getByRole("link", { name: "Solicitar Demonstração" }).first();
  const href = (await cta.getAttribute("href")) ?? "";
  expect(href.startsWith("mailto:contato@govpro.com.br?subject=")).toBe(true);
  await expect(page.getByRole("link", { name: "Acessar o GeraDocs" }).first()).toHaveAttribute("href", /\/login\/?$/);
});

test("as âncoras levam à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(rota(ROTA));
  await page.getByRole("navigation", { name: "Seções da página" }).getByRole("link", { name: "Confiança" }).click();
  await expect(page).toHaveURL(/#confianca$/);
  await expect(page.getByRole("heading", { level: 2, name: "Feito para o Controle da Contratação" })).toBeInViewport();
});

test("o fluxo mostra os seis documentos na ordem", async ({ page }) => {
  await page.goto(rota(ROTA));
  const itens = page.getByRole("list", { name: "Documentos gerados, na ordem do fluxo" }).getByRole("listitem");
  await expect(itens).toHaveCount(6);
  await expect(itens.first()).toContainText("Cotação de Mercado");
  await expect(itens.last()).toContainText("Minuta de Contrato");
});

test("a lacuna de Quem Somos fica visível", async ({ page }) => {
  await page.goto(rota(ROTA));
  await expect(page.getByRole("note")).toContainText("[LACUNA:");
});

test("não rola na horizontal em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(rota(ROTA));
  const estoura = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(estoura).toBe(false);
});

test("o menu móvel abre e leva às âncoras", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(rota(ROTA));
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.locator("#menu-landing");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "IA", exact: true }).click();
  await expect(page).toHaveURL(/#ia$/);
  await expect(menu).toHaveCount(0);
});

test("o menu móvel não passa da janela: em janela baixa (400% de zoom) o último botão é alcançável", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto(rota(ROTA));
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.locator("#menu-landing");
  await expect(menu).toBeVisible();
  const caixa = await menu.boundingBox();
  expect(caixa).not.toBeNull();
  expect((caixa?.y ?? 0) + (caixa?.height ?? 0)).toBeLessThanOrEqual(256);
  // O cabeçalho é fixo: rolar a página não aproxima o painel. Só a rolagem do
  // próprio painel leva o último botão à janela.
  const ultimo = menu.getByRole("link", { name: "Acessar o GeraDocs" });
  await ultimo.scrollIntoViewIfNeeded();
  await expect(ultimo).toBeInViewport();
});

test("o link para pular a navegação aparece ao receber foco", async ({ page }) => {
  await page.goto(rota(ROTA));
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeInViewport();
});

test("ao rolar, tudo que estava escondido é revelado", async ({ page }) => {
  await page.goto(rota(ROTA));
  await expect(page.locator('[data-estado="oculto"]').first()).toBeAttached();
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= altura; y += 400) {
    await page.evaluate((posicao) => window.scrollTo(0, posicao), y);
    await page.waitForTimeout(60);
  }
  await expect(page.locator('[data-estado="oculto"]')).toHaveCount(0);
});

test.describe("com movimento reduzido", () => {
  // `test.use({ reducedMotion })` não chega ao contexto neste Chromium (a media
  // query seguia em `no-preference`); emular na página, antes do `goto`, vale.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("nada é escondido", async ({ page }) => {
    await page.goto(rota(ROTA));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-estado="oculto"]')).toHaveCount(0);
  });

  test("não tem violação grave de acessibilidade, nem de contraste", async ({ page }) => {
    await page.goto(rota(ROTA));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(graves.map((v) => ({ regra: v.id, nos: v.nodes.map((n) => n.target) }))).toEqual([]);
  });
});
