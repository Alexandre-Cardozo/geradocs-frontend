import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * O Edital na minuta da AGU (§85, ADR-052 do back-end).
 *
 * <p>Na concorrência há duas minutas: a escolha vem antes da primeira seção, e
 * a estrutura do editor passa a ser a da minuta escolhida — com o texto dela
 * como ponto de partida e as notas da AGU recolhidas.
 */
const API = "**/api/v1"

const MODELOS = [
  {
    code: "AGU-EDITAL-PC",
    version: "2025-11",
    title: "Minuta AGU — Pregão e Concorrência (menor preço ou maior desconto)",
    description: "Pregão ou concorrência julgados por menor preço ou maior desconto.",
    publishedIn: "nov/2025",
    sectionCount: 2,
  },
  {
    code: "AGU-EDITAL-TP",
    version: "2026-04",
    title: "Minuta AGU — Concorrência (técnica e preço)",
    description: "Concorrência julgada por técnica e preço.",
    publishedIn: "abr/2026",
    sectionCount: 2,
  },
]

function edital(modelo: string | null) {
  const secoes =
    modelo === null
      ? [{ code: "1", title: "Preâmbulo e Identificação da Licitação" }]
      : [
          { code: "TP00", title: "Preâmbulo", number: "", text: "Torna-se público que o órgão realizará licitação." },
          { code: "TP01", title: "Do Objeto", number: "1", text: "1.1. O objeto da presente licitação é [objeto]." },
        ]
  return {
    id: "5c4d3e2f-2222-4222-8333-444455556666",
    processId: processo.id,
    documentType: "EDITAL",
    currentVersion: 0,
    finalized: false,
    changedSinceVersion: false,
    progress: 0,
    canGenerate: false,
    sections: secoes.map((secao, i) => ({
      sectionCode: secao.code,
      position: i + 1,
      title: secao.title,
      legalBasis: "Art. 25, caput, Lei 14.133/21",
      hint: "Siga a minuta.",
      required: true,
      origin: "CATALOG",
      content: "",
      resolved: false,
      ...("number" in secao ? { number: secao.number, topics: ["OBJETO"], modelText: secao.text, modelNotes: ["Nota explicativa: adapte ao órgão."] } : {}),
    })),
    pendingRequiredSections: [],
    silentGaps: [],
    body: [],
    structureModel: modelo === null ? null : { code: modelo, version: "2026-04", title: "Minuta AGU", publishedIn: "abr/2026" },
    structureTitle: modelo === null ? "Estrutura GeraDocs (Lei 14.133/21)" : "Minuta AGU — Concorrência (técnica e preço) (abr/2026)",
    availableModels: MODELOS.map((m) => ({ ...m, current: m.code === modelo })),
    modelChoiceRequired: modelo === null,
    rectificationRequired: false,
    otherModelTexts:
      modelo === null
        ? []
        : [
            { sectionCode: "PC01", title: "Do Objeto", content: "Objeto escrito na outra minuta.", targetSectionCode: "TP01" },
            { sectionCode: "PC12", title: "Da Formação do Cadastro de Reserva", content: "Reserva.", targetSectionCode: null },
          ],
  }
}

test("na concorrência, a minuta é escolhida antes e estrutura o Edital", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  let modelo: string | null = null
  await page.route(`${API}/procurement-processes/*`, (r) =>
    r.fulfill({ json: { ...processo, modality: "COMPETITION", documents: ["ETP", "TR", "EDITAL"] } }),
  )
  await page.route(`${API}/procurement-processes/*/documents/EDITAL`, (r) => r.fulfill({ json: edital(modelo) }))
  await page.route(`${API}/procurement-processes/*/documents/EDITAL/structure-model`, async (r) => {
    modelo = (r.request().postDataJSON() as { code: string }).code
    await r.fulfill({ json: edital(modelo) })
  })

  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=edital`))

  await expect(page.getByRole("heading", { name: "Modelo do Documento" })).toBeVisible()
  await page.getByRole("button", { name: /Concorrência \(técnica e preço\)/ }).click()
  await page.getByRole("button", { name: "Usar Esta Minuta" }).click()

  // O editor abre na primeira seção da minuta, e o preâmbulo não tem número.
  await expect(page.getByText("Minuta AGU — Concorrência (técnica e preço) (abr/2026)")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Preâmbulo", level: 2 })).toBeVisible()
  await expect(page.getByText("Seção 1 de 2 · Art. 25, caput, Lei 14.133/21")).toBeVisible()

  await page.getByRole("button", { name: "Usar o Texto da Minuta" }).click()
  await expect(page.getByPlaceholder("Preencha o conteúdo desta seção...")).toHaveValue(
    "Torna-se público que o órgão realizará licitação.",
  )
  await page.getByText("Notas da AGU (1)").click()
  await expect(page.getByText("Nota explicativa: adapte ao órgão.")).toBeVisible()

  // O texto de outra minuta aparece só na seção do mesmo assunto.
  await expect(page.getByText(/Textos de Outro Modelo/)).toHaveCount(0)
  await page.getByRole("button", { name: /Do Objeto/ }).first().click()
  await expect(page.getByText("Textos de Outro Modelo (1)")).toBeVisible()
  await page.getByText("Textos de Outro Modelo (1)").click()
  await expect(page.getByText("Objeto escrito na outra minuta.")).toBeVisible()

  // O que não tem seção correspondente fica na etapa final.
  await page.getByRole("button", { name: /Revisão e Geração/ }).click()
  await expect(page.getByText("Textos Sem Seção Correspondente (1)")).toBeVisible()
})

test("a seção que se afasta da minuta pede a justificativa, e a etapa final a resume (§88)", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  let justificativa: string | null = null
  const documento = () => {
    const base = edital("AGU-EDITAL-TP")
    return {
      ...base,
      sections: base.sections.map((secao, i) =>
        i === 1
          ? {
              ...secao,
              content: "Objeto escrito pelo município.",
              resolved: true,
              modelDeviation: { clauses: 1, missing: ["1.1. O objeto da presente licitação é [objeto]."] },
              modelDeviationJustification: justificativa,
            }
          : secao,
      ),
      newerModel: { code: "AGU-EDITAL-TP", version: "2026-09", title: "Minuta AGU", publishedIn: "set/2026" },
    }
  }
  await page.route(`${API}/procurement-processes/*`, (r) =>
    r.fulfill({ json: { ...processo, modality: "COMPETITION", documents: ["ETP", "TR", "EDITAL"] } }),
  )
  await page.route(`${API}/procurement-processes/*/documents/EDITAL`, (r) => r.fulfill({ json: documento() }))
  await page.route(`${API}/procurement-processes/*/documents/EDITAL/sections/TP01/model-deviation`, async (r) => {
    justificativa = (r.request().postDataJSON() as { text: string }).text
    await r.fulfill({ json: documento() })
  })

  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=edital`))

  // A versão nova da minuta aparece na linha do modelo.
  await expect(page.getByText("Versão set/2026 disponível")).toBeVisible()

  await page.getByRole("button", { name: /Do Objeto/ }).first().click()
  await expect(page.getByText(/deixa de fora 1 de 1 cláusula da minuta/)).toBeVisible()
  await page.getByText("Cláusulas Fora do Texto").click()
  await expect(page.getByText("1.1. O objeto da presente licitação é [objeto].")).toBeVisible()
  await page.getByRole("textbox", { name: "Justificativa da Alteração" }).fill("A lei municipal define o objeto.")
  await page.getByRole("button", { name: "Salvar Justificativa" }).click()
  await expect(page.getByText(/Alteração justificada/)).toBeVisible()
  expect(justificativa).toBe("A lei municipal define o objeto.")

  await page.getByRole("button", { name: /Revisão e Geração/ }).click()
  await expect(page.getByRole("heading", { name: "Minuta da AGU" })).toBeVisible()
  await expect(page.getByText("Alteração Justificada")).toBeVisible()
})
