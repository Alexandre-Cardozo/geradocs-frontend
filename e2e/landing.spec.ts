import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { rota, semSessao } from "./api";

/**
 * A página da GovPro (§123, §125): estática, sem sessão, sem chamada à API. A varredura de
 * acessibilidade **não** exclui os tokens sobre navy, como faz a do aplicativo —
 * a landing só usa `on-dark`, `-65`, `-60` e `-55`, todos acima de 4,5:1.
 */
const ROTA = "/";

/**
 * Espera o React assumir a página. No CI esta suíte roda contra um `next dev`
 * recém-iniciado: a página chega pronta do servidor, mas um clique antes da
 * hidratação cai num HTML sem reação (o botão não muda o estado, o link não
 * navega pela âncora). A abertura marca `data-movimento="ativo"` ao montar, e a
 * página hidrata de uma vez só: com a marca, todos os componentes já respondem.
 */
async function esperarHidratacao(page: Page) {
  await expect(page.locator("section[aria-label=GovPro]")).toHaveAttribute("data-movimento", "ativo");
}

async function abrir(page: Page) {
  await page.goto(rota(ROTA));
  await esperarHidratacao(page);
}

test("abre sem sessão, sem redirecionar para o login", async ({ page }) => {
  await semSessao(page);
  await abrir(page);

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveTitle("GovPro | Inteligência para a Gestão Pública");
  await expect(page.getByRole("heading", { level: 1, name: "Inteligência para Gestão Pública" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "A Contratação Pública Bem Planejada Começa Aqui" }),
  ).toBeAttached();
});

test.describe("abertura em paralaxe (§124)", () => {
  test("mostra a sede da GovPro e o slogan na primeira tela", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 810 });
    await abrir(page);
    await expect(page.getByRole("img", { name: /Sede da GovPro/ })).toBeInViewport();
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    // As imagens chegam com o basePath, também no modo publicado.
    const carregadas = await page.locator("section[aria-label=GovPro] img").evaluateAll((imgs) =>
      imgs.map((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
    );
    expect(carregadas).toEqual([true, true, true, true, true]);
  });

  test("a abertura encosta no topo, sem fresta acima do cabeçalho", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrir(page);
    const topo = await page.locator("section[aria-label=GovPro]").evaluate((s) => s.getBoundingClientRect().top);
    expect(topo).toBeLessThanOrEqual(0);
  });

  test("em tela em pé usa o enquadramento alto", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await abrir(page);
    const sede = page.getByRole("img", { name: /Sede da GovPro/ });
    await expect.poll(() => sede.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(1080);
  });

  test("ao rolar, a câmera avança, o título sai e o manifesto aparece", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 810 });
    await abrir(page);
    const secao = page.locator("section[aria-label=GovPro]");
    await expect(secao).toHaveAttribute("data-movimento", "ativo");
    const percurso = await secao.evaluate((s) => s.getBoundingClientRect().height - window.innerHeight);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(percurso * 0.82));
    await expect(page.getByText(/A GovPro nasceu para estar ao lado dessas pessoas/)).toBeInViewport();
    await expect.poll(() => page.locator("[data-manifesto]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
    await expect.poll(() => page.locator("[data-titulo]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
    const escala = await page.locator('[data-camada="frente"]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(escala).toBeGreaterThan(1.3);
  });

  test("sem JavaScript, a cena aparece parada e o manifesto vem no fluxo", async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    const pagina = await contexto.newPage();
    await pagina.goto(rota(ROTA));
    await expect(pagina.getByRole("heading", { level: 1, name: "Inteligência para Gestão Pública" })).toBeVisible();
    const manifesto = pagina.getByText(/A GovPro nasceu para estar ao lado dessas pessoas/);
    await manifesto.scrollIntoViewIfNeeded();
    await expect(manifesto).toBeVisible();
    await contexto.close();
  });
});

test("o pedido de demonstração é um mailto com assunto", async ({ page }) => {
  await abrir(page);
  const cta = page.getByRole("link", { name: "Solicitar Demonstração" }).first();
  const href = (await cta.getAttribute("href")) ?? "";
  expect(href.startsWith("mailto:contato@govpro.com.br?subject=")).toBe(true);
  // O e-mail já vem escrito: quem pede só preenche os próprios dados.
  const corpo = new URL(href).searchParams.get("body") ?? "";
  for (const campo of ["Nome:", "Setor:", "Cargo:", "Instituição pública:"]) expect(corpo).toContain(campo);
  await expect(page.getByRole("link", { name: "Acessar o GeraDocs" }).first()).toHaveAttribute("href", /\/login\/?$/);
});

test("a marca do cabeçalho volta à abertura", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrir(page);
  await page.getByRole("navigation", { name: "Seções da página" }).getByRole("link", { name: "Contato" }).click();
  await expect(page).toHaveURL(/#contato$/);
  await page.getByRole("link", { name: "GovPro, voltar ao início" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page).not.toHaveURL(/#/);
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});

test("o conteúdo ocupa a largura da tela larga", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await abrir(page);
  const marca = await page.getByRole("link", { name: "GovPro, voltar ao início" }).boundingBox();
  expect(marca?.x ?? 999).toBeLessThan(80);
});

test("as âncoras levam à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await abrir(page);
  await page.getByRole("navigation", { name: "Seções da página" }).getByRole("link", { name: "Confiança" }).click();
  await expect(page).toHaveURL(/#confianca$/);
  await expect(page.getByRole("heading", { level: 2, name: "Segurança Jurídica Para Quem Assina" })).toBeInViewport();
});

test("a vitrine mostra os sete tipos na ordem do fluxo, a juntada e a errata", async ({ page }) => {
  await abrir(page);
  const legendas = page.getByRole("region", { name: "Documentos gerados pelo GeraDocs" }).locator("figcaption");
  await expect(legendas).toHaveCount(9);
  await expect(legendas.first()).toContainText("Cotação de Mercado");
  await expect(legendas.nth(6)).toContainText("Minuta de Contrato");
  await expect(legendas.nth(7)).toContainText("Juntada dos Autos");
  await expect(legendas.last()).toContainText("Errata");
});

test("a âncora do cabeçalho põe a seção logo abaixo dele, sem sobra da anterior", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrir(page);
  await page.getByRole("navigation", { name: "Seções da página" }).getByRole("link", { name: "Soluções" }).click();
  const topo = await page.locator("#solucoes").evaluate((s) => s.getBoundingClientRect().top);
  expect(Math.abs(topo - 64)).toBeLessThanOrEqual(2);
});

test("abrir a página já com a âncora leva à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(rota(ROTA) + "#solucoes");
  await esperarHidratacao(page);
  await expect(page.getByRole("heading", { level: 2, name: "Um Portfólio Que Nasce da Rotina de Quem Contrata" })).toBeInViewport();
});

test("o portfólio leva à seção do GeraDocs", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await abrir(page);
  await page.getByRole("link", { name: /Conhecer o GeraDocs/ }).click();
  await expect(page).toHaveURL(/#geradocs$/);
  await expect(page.getByRole("heading", { level: 2, name: "A Contratação Pública Bem Planejada Começa Aqui" })).toBeInViewport();
});

test.describe("palcos de rolagem em tela larga (§125)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("a demonstração avança as etapas conforme a rolagem", async ({ page }) => {
    await abrir(page);
    const secao = page.locator("#poucos-cliques");
    await expect(secao).toHaveAttribute("data-movimento", "ativo");
    const ir = (fracao: number) =>
      secao.evaluate((s, f) => {
        const topo = s.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, topo + (s.offsetHeight - window.innerHeight) * f);
      }, fracao);
    await ir(0.05);
    await expect(page.getByRole("button", { name: /Abra o Processo/ })).toHaveAttribute("aria-current", "step");
    await ir(0.95);
    await expect(page.getByRole("button", { name: /Gere DOCX e PDF/ })).toHaveAttribute("aria-current", "step");
  });

  test("a vitrine desliza as folhas na horizontal", async ({ page }) => {
    await abrir(page);
    const secao = page.locator("#documentos");
    await expect(secao).toHaveAttribute("data-movimento", "ativo");
    await secao.evaluate((s) => {
      const topo = s.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, topo + (s.offsetHeight - window.innerHeight) * 0.9);
    });
    const faixa = page.getByRole("region", { name: "Documentos gerados pelo GeraDocs" }).locator("ol");
    await expect.poll(() => faixa.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)).toBeLessThan(-200);
  });
});

test("o seletor de modalidade mostra os documentos da forma escolhida", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: "Dispensa com Disputa" }).click();
  const lista = page.getByRole("list", { name: /Documentos do processo: Dispensa com Disputa/ });
  await expect(lista.getByRole("listitem").filter({ hasText: "Aviso de Contratação Direta" })).toContainText("Obrigatório");
  await expect(lista.getByRole("listitem").filter({ hasText: "Edital de Licitação" })).toContainText("Não se aplica");
});

test("em tela estreita a demonstração é um seletor por clique", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrir(page);
  await expect(page.locator("#poucos-cliques")).not.toHaveAttribute("data-movimento", "ativo");
  await page.getByRole("button", { name: /Revise e Aceite/ }).click();
  await expect(page.getByRole("button", { name: /Revise e Aceite/ })).toHaveAttribute("aria-current", "step");
});

test("não rola na horizontal em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await abrir(page);
  const estoura = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(estoura).toBe(false);
});

test("o menu móvel abre e leva às âncoras", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await abrir(page);
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.locator("#menu-landing");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Documentos", exact: true }).click();
  await expect(page).toHaveURL(/#documentos$/);
  await expect(menu).toHaveCount(0);
});

test("o menu móvel não passa da janela: em janela baixa (400% de zoom) o último botão é alcançável", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await abrir(page);
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
  await abrir(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeInViewport();
});

test("ao rolar, tudo que estava escondido é revelado", async ({ page }) => {
  await abrir(page);
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

  test("as camadas da abertura não se movem ao rolar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 810 });
    await abrir(page);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect.poll(() => page.locator("[data-manifesto]").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
    const transformacoes = await page.locator("[data-camada]").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
    expect(transformacoes.every((t) => t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)")).toBe(true);
  });

  test("os palcos de rolagem não prendem a página", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrir(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#poucos-cliques")).not.toHaveAttribute("data-movimento", "ativo");
    await expect(page.locator("#documentos")).not.toHaveAttribute("data-movimento", "ativo");
  });

  test("nada é escondido", async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-estado="oculto"]')).toHaveCount(0);
  });

  test("não tem violação grave de acessibilidade, nem de contraste", async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(graves.map((v) => ({ regra: v.id, nos: v.nodes.map((n) => n.target) }))).toEqual([]);
  });
});
