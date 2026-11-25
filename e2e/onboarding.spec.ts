import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { rota } from "./api"

/**
 * O onboarding da GovPri (§130) no navegador de verdade: as perguntas, o lead
 * que chega ao back-end (ADR-082 do back-end), o plano B por e-mail quando o
 * envio falha e a origem que os botões da página levam.
 */
const LEADS = "**/api/v1/public/leads"
const IBGE = "https://servicodados.ibge.gov.br/**"

async function comIbge(page: Page) {
  await page.route(IBGE, (r) =>
    r.fulfill({
      json: [
        { id: 3201506, nome: "Colatina" },
        { id: 3205309, nome: "Vitória" },
      ],
    }),
  )
}

async function semViolacaoGrave(page: Page) {
  // Mede com a tela parada: no meio da entrada animada, o texto ainda está semitransparente.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"))
  const { violations } = await new AxeBuilder({ page }).analyze()
  const graves = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}

async function responderAteOContato(page: Page) {
  await page.getByRole("button", { name: "Começar" }).click()
  await page.getByRole("radio", { name: "Prefeitura" }).click()
  await page.getByLabel("Estado").selectOption("ES")
  await page.getByLabel("Município").fill("colat")
  await page.getByRole("button", { name: "Colatina" }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("radio", { name: /Agente de contratação/ }).click()
  // A tela de valor fala com quem é agente de contratação, com os textos da página da GovPro.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mais Segurança, Menos Digitação")
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("radio", { name: "2 a 5 pessoas" }).click()
  await page.getByRole("radio", { name: "51 a 200" }).click()
  await page.getByRole("radio", { name: "4 a 10" }).click()
  // A rotina é de múltipla escolha: sem nada marcado, não avança.
  const continuar = page.getByRole("button", { name: "Continuar" })
  await expect(continuar).toBeDisabled()
  await page.getByRole("checkbox", { name: /No Word/ }).click()
  await page.getByRole("checkbox", { name: /ferramentas de IA/ }).click()
  await continuar.click()
  await page.getByRole("checkbox", { name: /Tempo para escrever/ }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("radio", { name: /Nos próximos 3 meses/ }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Como podemos falar com você?")
}

async function preencherContato(page: Page) {
  await page.getByLabel("Seu nome").fill("Ana Teste")
  await page.getByLabel("E-mail").fill("ana.teste@colatina.es.gov.br")
  await page.getByLabel("WhatsApp ou telefone").fill("27999990000")
  await page.getByLabel("Nome do órgão").fill("Prefeitura Municipal de Colatina")
  await page.getByLabel(/Concordo que a GovPro/).check()
}

test("do começo ao pedido enviado: o lead chega ao back-end completo e com a origem", async ({ page }) => {
  await comIbge(page)
  let enviado: Record<string, unknown> | null = null
  await page.route(LEADS, async (r) => {
    enviado = r.request().postDataJSON() as Record<string, unknown>
    await r.fulfill({ status: 202, json: { id: "11111111-2222-4333-8444-555555555555" } })
  })
  await page.goto(rota("/onboarding?origem=instagram"))
  await expect(page.getByText(/Oi, eu sou a Pri/).first()).toBeAttached()
  await semViolacaoGrave(page)

  await responderAteOContato(page)
  // O nome do órgão fica em branco: o exemplo do tipo e da cidade é só placeholder.
  await expect(page.getByLabel("Nome do órgão")).toHaveValue("")
  await expect(page.getByLabel("Nome do órgão")).toHaveAttribute("placeholder", "Ex.: Prefeitura Municipal de Colatina")

  // Enviar vazio aponta o que falta, e o foco vai ao primeiro campo.
  await page.getByRole("button", { name: "Enviar" }).last().click()
  await expect(page.getByText("Informe seu nome.")).toBeVisible()
  await expect(page.getByLabel("Seu nome")).toBeFocused()
  await semViolacaoGrave(page)

  await preencherContato(page)
  await expect(page.getByLabel("WhatsApp ou telefone")).toHaveValue("(27) 99999-0000")
  await page.getByRole("button", { name: "Enviar" }).last().click()

  // A análise fica na tela o bastante para ler o resumo: uma linha por vez, e só depois segue.
  await expect(page.getByRole("heading", { name: "Analisando suas respostas" })).toBeVisible()
  const inicio = Date.now()
  await expect(page.getByText("Combina 2 jeitos de fazer os documentos")).toBeVisible()
  await expect(page.getByText("Quer começar nos próximos 3 meses")).toHaveCSS("opacity", "0")
  await expect(page.getByRole("heading", { name: "Pedido enviado!" })).toBeVisible({ timeout: 15000 })
  expect(Date.now() - inicio).toBeGreaterThan(6000)
  await expect(page.getByText("ana.teste@colatina.es.gov.br")).toBeVisible()
  // O WhatsApp leva a mensagem pronta, com o nome e o órgão.
  const whatsapp = page.getByRole("link", { name: "Falar no WhatsApp" })
  await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/5527996495615\?text=.*Ana%20Teste/)
  expect(enviado).toMatchObject({
    origin: "instagram",
    organizationType: "PREFEITURA",
    organizationName: "Prefeitura Municipal de Colatina",
    uf: "ES",
    municipality: "Colatina",
    ibgeCode: "3201506",
    role: "AGENTE_CONTRATACAO",
    teamSize: "DE_2_A_5",
    annualVolume: "DE_51_A_200",
    requestingUnits: "DE_4_A_10",
    currentPractices: ["WORD_E_MODELOS", "IA_GENERICA"],
    pains: ["TEMPO_ETP_TR"],
    timing: "TRES_MESES",
    contactName: "Ana Teste",
    contactPhone: "(27) 99999-0000",
    consent: true,
    website: null,
  })
})

test("se o envio falha, as respostas ficam e saem num e-mail pronto", async ({ page }) => {
  await comIbge(page)
  await page.route(LEADS, (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/problem+json",
      json: { status: 503, title: "Indisponível", detail: "O servidor está em manutenção." },
    }),
  )
  await page.goto(rota("/onboarding"))
  await responderAteOContato(page)
  await preencherContato(page)
  await page.getByRole("button", { name: "Enviar" }).last().click()

  await expect(page.getByRole("heading", { name: "Não consegui enviar agora" })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole("main").getByRole("alert")).toContainText("O servidor está em manutenção.")
  const email = page.getByRole("link", { name: "Enviar por E-mail" })
  const href = (await email.getAttribute("href")) ?? ""
  expect(href.startsWith("mailto:govpro.admin@gmail.com?subject=")).toBe(true)
  expect(decodeURIComponent(href)).toContain("Nome: Ana Teste")
  expect(decodeURIComponent(href)).toContain("Colatina/ES")
  await expect(page.getByRole("button", { name: "Tentar de Novo" })).toBeVisible()
})

test("o Governo do Estado responde só a UF", async ({ page }) => {
  await page.goto(rota("/onboarding"))
  await page.getByRole("button", { name: "Começar" }).click()
  await page.getByRole("radio", { name: "Governo do Estado" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Em qual estado?")
  const continuar = page.getByRole("button", { name: "Continuar" })
  await expect(continuar).toBeDisabled()
  await page.getByLabel("Estado").selectOption("ES")
  await expect(page.getByLabel("Município")).toHaveCount(0)
  await expect(continuar).toBeEnabled()
})

test("a demonstração da página da GovPro abre o onboarding com a origem do botão", async ({ page }) => {
  await page.goto(rota("/"))
  const demonstracao = page.getByRole("link", { name: "Solicitar demonstração" }).first()
  await expect(demonstracao).toHaveAttribute("href", /\/onboarding\/?\?origem=cabecalho$/)
})
