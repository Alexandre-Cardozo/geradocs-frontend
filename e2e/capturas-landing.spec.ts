import { writeFileSync } from "node:fs"

import { expect, test, type Locator, type Page } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota, sessaoServidor } from "./api"

/**
 * Gera as capturas da landing a partir do aplicativo real, com dados fictícios
 * (§125, §126). Não é teste: só roda quando pedido:
 *
 *     CAPTURAS_LANDING=1 npx playwright test e2e/capturas-landing.spec.ts
 *     node scripts/capturas-para-webp.mjs
 *
 * Fotografa a tela inteira do aplicativo (menu, cabeçalho e conteúdo), como o
 * servidor a vê. Para as cinco etapas da demonstração, grava também onde fica o
 * botão que cada etapa clica (`lib/landing/alvos-das-telas.json`): o cursor da
 * landing anda até ali. O órgão é um nome genérico, para não sugerir endosso.
 */
test.skip(!process.env.CAPTURAS_LANDING, "Só roda quando se pedem as capturas da landing.")
test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: "reduce" })

const API = "**/api/v1"
const PASTA = "public/landing/telas"
const EDITOR = `/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`

const sessao = { ...sessaoServidor, organization: { ...sessaoServidor.organization, name: "Prefeitura de Exemplo" } }

const NECESSIDADE =
  "A Secretaria de Administração precisa repor o material de expediente das unidades, hoje com estoque abaixo do consumo mensal. A demanda consolida os DFDs de três secretarias e está prevista no PCA do exercício."

const SECOES = [
  ["1", "Descrição da Necessidade", "Art. 18, § 1º, I, Lei 14.133/21", true, NECESSIDADE],
  ["2", "Previsão no Plano de Contratações Anual", "Art. 18, § 1º, II, Lei 14.133/21", false, "O objeto está previsto no PCA 2026, item 2026-0142."],
  ["3", "Requisitos da Contratação", "Art. 18, § 1º, III, Lei 14.133/21", false, "Os materiais devem atender às especificações do Termo de Referência, com entrega parcelada."],
  ["5", "Levantamento de Mercado", "Art. 18, § 1º, V, Lei 14.133/21", false, "Foram analisadas a aquisição direta e o registro de preços; o registro atende melhor à demanda variável."],
] as const

function documento(preenchido: boolean) {
  return {
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: "ETP",
    currentVersion: 0,
    finalized: false,
    changedSinceVersion: false,
    progress: preenchido ? 100 : 0,
    canGenerate: preenchido,
    sections: SECOES.map(([sectionCode, title, legalBasis, required, texto], i) => ({
      sectionCode,
      position: i + 1,
      title,
      legalBasis,
      hint: "Demonstre o que a seção pede.",
      required,
      content: preenchido ? texto : "",
      dispensationJustification: null,
      resolved: preenchido,
    })),
    pendingRequiredSections: preenchido ? [] : ["Descrição da Necessidade"],
    silentGaps: [],
    body: preenchido ? SECOES.map(([sectionCode, title, , , text]) => ({ sectionCode, title, text, dispensed: false })) : [],
    opening: {
      title: "ESTUDO TÉCNICO PRELIMINAR",
      introduction: "O presente documento caracteriza a primeira etapa da fase de planejamento.",
      processNumber: processo.processNumber,
      objectText: processo.objectDescription,
      objectSource: "DEMAND_OBJECT",
    },
  }
}

const ITENS = [
  ["Papel A4, 75 g/m²", "RESMA", 1200],
  ["Caneta esferográfica azul", "UNIDADE", 3600],
  ["Grampeador de mesa", "UNIDADE", 150],
] as const
const SECRETARIAS = ["Secretaria de Educação", "Secretaria de Saúde", "Secretaria de Administração"]

async function prepararApp(page: Page, preenchido = false) {
  await comSessao(page, sessao)
  await comProcessoEDocumento(page)
  // Sem foto: o app mostra as iniciais (o dublê responderia uma imagem quebrada).
  await page.route(`${API}/users/*/avatar`, (r) => r.fulfill({ status: 404, body: "" }))
  await page.route(`${API}/ai/status`, (r) => r.fulfill({ json: { available: true } }))
  await page.route(`${API}/organizations/*/ai-budget`, (r) =>
    r.fulfill({ json: { limitAmount: 500, spentAmount: 42.3, defined: true, available: true } }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*`, (r) => r.fulfill({ json: documento(preenchido) }))
  await page.route(`${API}/procurement-processes/*/dfds`, (r) =>
    r.fulfill({
      json: SECRETARIAS.map((departmentName, i) => ({
        id: `dfd-${i}`,
        fileName: `dfd-2026-0${14 + i}.pdf`,
        departmentName,
        departmentId: `secretaria-${i}`,
        submittedAt: `2026-08-1${i}T10:00:00-03:00`,
        items: ITENS.map(([description, unit, total]) => ({ description, unit, quantity: total / 3, catalogCode: "CATMAT" })),
        file: null,
        expectedCompletionDate: null,
        problemDescription: null,
      })),
    }),
  )
  await page.route(`${API}/procurement-processes/*/demand-consolidation`, (r) =>
    r.fulfill({
      json: {
        items: ITENS.map(([description, unit, total], i) => ({
          id: `item-${i}`,
          description,
          unit,
          total,
          summable: true,
          catalogCode: "CATMAT",
          byDepartment: SECRETARIAS.map((departmentName) => ({ departmentName, quantity: total / 3, unit })),
        })),
        incongruences: [],
      },
    }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*/ai-draft-with-sources`, (r) =>
    r.fulfill({
      json: {
        documentType: "ETP",
        sectionCode: "1",
        content: NECESSIDADE,
        proposalId: "proposta-1",
        evidence: [
          { source: "DFD", fact: "Três secretarias pediram material de expediente para o exercício." },
          { source: "PCA", fact: "Item 2026-0142 do PCA 2026: papel A4, 1.200 resmas." },
        ],
        missingFacts: [],
        warnings: [],
        guidanceWarnings: [],
      },
    }),
  )
}

/** Sem o indicador de desenvolvimento do Next, e com as animações já terminadas. */
async function estabilizar(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" })
  await page.waitForLoadState("load")
  // Animação cancelada no meio rejeita o `finished`: basta que todas tenham assentado.
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map((a) => a.finished)))
  await page.waitForTimeout(600)
}

const alvos: Record<string, { x: number; y: number }> = {}

/** Fotografa a janela e guarda o centro do alvo, em % da janela. */
async function fotografar(page: Page, nome: string, alvo?: Locator) {
  await estabilizar(page)
  if (alvo) {
    const caixa = await alvo.boundingBox()
    if (!caixa) throw new Error(`alvo de ${nome} sem caixa na tela`)
    const janela = page.viewportSize() ?? { width: 1280, height: 800 }
    alvos[nome] = {
      x: Math.round(((caixa.x + caixa.width / 2) / janela.width) * 1000) / 10,
      y: Math.round(((caixa.y + caixa.height / 2) / janela.height) * 1000) / 10,
    }
  }
  await page.screenshot({ path: `${PASTA}/${nome}.png` })
}

test.describe.configure({ mode: "serial" })

test("etapa 1: abrir o processo", async ({ page }) => {
  await prepararApp(page)
  await page.goto(rota("/processos/novo"))
  await fotografar(page, "abertura", page.getByText("Pregão Eletrônico", { exact: true }).first())
})

test("etapa 2: a demanda consolidada", async ({ page }) => {
  await prepararApp(page)
  await page.goto(rota(`/processos/detalhe?id=${encodeURIComponent(processo.id)}`))
  const titulo = page.getByRole("heading", { name: "Demanda Consolidada" })
  await expect(titulo).toBeVisible()
  // O app rola dentro do contêiner do conteúdo, não na janela: `scrollIntoView` acha o contêiner certo.
  await titulo.evaluate((el) => el.scrollIntoView({ block: "start" }))
  await fotografar(page, "demanda", page.getByRole("button", { name: /Registrar DFD/ }))
})

test("etapa 3: gerar com IA", async ({ page }) => {
  await prepararApp(page)
  await page.goto(rota(EDITOR))
  await page.getByLabel("Descrição da Necessidade").fill("Repor o material de expediente das unidades.")
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await fotografar(page, "editor", page.getByRole("button", { name: "Gerar com IA" }))
})

test("etapa 4: revisar a proposta", async ({ page }) => {
  await prepararApp(page)
  await page.goto(rota(EDITOR))
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await page.getByRole("button", { name: "Gerar com IA" }).click()
  await expect(page.getByLabel("Descrição da Necessidade")).toHaveValue(NECESSIDADE)
  await expect(page.getByText("Rascunho gerado.")).toBeHidden({ timeout: 15_000 })
  await fotografar(page, "proposta", page.getByRole("button", { name: /Salvar Rascunho/ }))
})

test("etapa 5: gerar o arquivo", async ({ page }) => {
  await prepararApp(page, true)
  await page.goto(rota(`${EDITOR}&etapa=revisao`))
  const gerar = page.getByRole("button", { name: /Finalizar e Gerar/ })
  await expect(gerar).toBeEnabled()
  await gerar.evaluate((el) => el.scrollIntoView({ block: "end" }))
  await page.evaluate(() => window.scrollBy(0, 24))
  await fotografar(page, "geracao", gerar)
  writeFileSync("lib/landing/alvos-das-telas.json", `${JSON.stringify(alvos, null, 2)}\n`)
})

test("o editor para a seção do GeraDocs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepararApp(page)
  await page.goto(rota(EDITOR))
  await page.getByLabel("Descrição da Necessidade").fill(NECESSIDADE)
  await expect(page.getByRole("button", { name: "Gerar com IA" })).toBeEnabled()
  await fotografar(page, "produto")
})

test("a revisão com IA para a seção da IA", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepararApp(page, true)
  // Uma sugestão pequena por seção, como a revisão de fato propõe: precisão, não reescrita.
  const SUGESTOES: Record<string, string> = {
    "1": "A Secretaria de Administração precisa repor o material de expediente das unidades, hoje com estoque abaixo do consumo mensal de 100 resmas. A demanda consolida os DFDs de três secretarias e está prevista no item 2026-0142 do PCA do exercício.",
    "2": "O objeto está previsto no PCA 2026, item 2026-0142, com quantidade compatível com a demanda consolidada.",
    "3": "Os materiais devem atender às especificações do Termo de Referência, com entrega parcelada em lotes mensais.",
    "5": "Foram analisadas a aquisição direta e o registro de preços; o registro atende melhor à demanda variável das secretarias.",
  }
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*/generate`, (r) => {
    const codigo = new URL(r.request().url()).pathname.split("/").at(-2) ?? "1"
    return r.fulfill({ json: { text: SUGESTOES[codigo] ?? SUGESTOES["1"] } })
  })
  await page.goto(rota(`${EDITOR}&etapa=revisao`))
  await page.getByRole("button", { name: "Revisar com IA" }).click()
  await expect(page.locator("ins").first()).toBeVisible()
  await fotografar(page, "revisao-ia")
})
