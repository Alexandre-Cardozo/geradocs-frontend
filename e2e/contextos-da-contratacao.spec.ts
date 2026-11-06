import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * Os contextos da contratação de ponta a ponta na tela (ADR-061 do back-end):
 * nada vem marcado nem sugerido; o servidor marca "Motorista" na capa, os
 * subtópicos dele entram sozinhos no ETP, e o que ele tira aparece numa linha
 * para restaurar.
 */
const API = "**/api/v1"

const CONVENCAO = {
  code: "CONVENCAO_COLETIVA",
  title: "Convenção ou Acordo Coletivo de Trabalho Aplicável",
  legalBasis: "Art. 7º, XXVI, Constituição Federal; Art. 135, II, Lei 14.133/21",
  hint: "Indique a categoria profissional, o sindicato e a convenção, com a data-base e o piso salarial.",
  anchorSectionCode: "3",
}
const HABILITACAO = {
  code: "HABILITACAO_DO_CONDUTOR",
  title: "Habilitação e Qualificação dos Condutores",
  legalBasis: "Art. 143 e Art. 145, Lei 9.503/1997 (Código de Trânsito Brasileiro)",
  hint: "Exija a categoria de CNH compatível com os veículos.",
  anchorSectionCode: "3",
}

function secao(sectionCode: string, position: number, title: string, extra: Record<string, unknown> = {}) {
  return {
    sectionCode,
    position,
    title,
    legalBasis: `Art. 18, § 1º, ${sectionCode}, Lei 14.133/21`,
    hint: "Demonstre o que a seção pede.",
    required: sectionCode === "1",
    origin: "CATALOG",
    content: "",
    resolved: false,
    ...extra,
  }
}

test("o contexto marcado na capa traz os subtópicos ao ETP, e o tirado pode ser restaurado", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)

  let confirmados: string[] = []
  let presentes: string[] = []
  const motorista = { ...processo, objectDescription: "Locação de veículos com motorista" }
  await page.route(`${API}/procurement-processes/*`, (r) => r.fulfill({ json: motorista }))

  const contextos = () => ({
    catalogVersion: "2026-11",
    contexts: [
      {
        code: "CONDUTOR_DE_VEICULO",
        title: "Motorista",
        description: "A contratação inclui quem conduz o veículo.",
        confirmed: confirmados.includes("CONDUTOR_DE_VEICULO"),
        confirmedAt: confirmados.includes("CONDUTOR_DE_VEICULO") ? "2026-11-05T12:00:00Z" : null,
        topics: [CONVENCAO, HABILITACAO].map((t) => ({
          code: t.code,
          documentType: "ETP",
          anchorSectionCode: t.anchorSectionCode,
          title: t.title,
          legalBasis: t.legalBasis,
        })),
      },
    ],
  })
  let enviado: unknown
  await page.route(`${API}/procurement-processes/*/contracting-contexts`, async (r) => {
    if (r.request().method() === "PUT") {
      enviado = r.request().postDataJSON()
      confirmados = (enviado as { codes: string[] }).codes
      // Como o servidor faz na próxima abertura: o contexto marcado traz os tópicos.
      presentes = confirmados.length === 0 ? [] : [CONVENCAO.code, HABILITACAO.code]
    }
    await r.fulfill({ json: contextos() })
  })

  const documento = () => {
    const topicos = confirmados.length === 0 ? [] : [CONVENCAO, HABILITACAO]
    const sections = [secao("1", 1, "Descrição da Necessidade"), secao("3", 2, "Requisitos da Contratação")]
    presentes.forEach((codigo, i) => {
      const topico = topicos.find((t) => t.code === codigo)!
      sections.push(
        secao(`3.${i + 1}`, 3 + i, topico.title, {
          legalBasis: topico.legalBasis,
          hint: topico.hint,
          required: false,
          origin: "AD_HOC",
          parentSectionCode: "3",
        }),
      )
    })
    return {
      id: "5c4d3e2f-1111-4222-8333-444455556666",
      processId: processo.id,
      documentType: "ETP",
      currentVersion: 0,
      finalized: false,
      changedSinceVersion: false,
      progress: 0,
      canGenerate: false,
      sections,
      pendingRequiredSections: ["Descrição da Necessidade"],
      silentGaps: [],
      body: [],
      contextTopics: topicos.map((t) => ({
        ...t,
        contexts: ["Motorista"],
        sectionCode: presentes.includes(t.code) ? `3.${presentes.indexOf(t.code) + 1}` : null,
      })),
    }
  }
  await page.route(`${API}/procurement-processes/*/documents/*`, (r) => r.fulfill({ json: documento() }))
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (r) => {
    if (r.request().method() !== "DELETE") return r.fallback()
    const codigo = new URL(r.request().url()).pathname.split("/").pop()!
    presentes = presentes.filter((_, i) => `3.${i + 1}` !== codigo)
    await r.fulfill({ json: documento() })
  })
  await page.route(`${API}/procurement-processes/*/documents/*/context-topics/*`, async (r) => {
    presentes.push(new URL(r.request().url()).pathname.split("/").pop()!)
    await r.fulfill({ status: 201, json: documento() })
  })

  // Nada vem marcado nem sugerido: a capa diz "Nenhum informado". Editar é
  // da capa inteira, e o Salvar dela grava os contextos junto.
  await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
  await expect(page.getByText("Nenhum informado")).toBeVisible()
  await expect(page.getByText(/Sugerid/)).toHaveCount(0)
  await page.getByRole("button", { name: "Editar Dados" }).click()
  const pilula = page.getByRole("checkbox", { name: /Motorista/ })
  await expect(pilula).toHaveAttribute("aria-checked", "false")
  await pilula.click()
  await expect(pilula).toHaveAttribute("aria-checked", "true")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect.poll(() => enviado).toEqual({ codes: ["CONDUTOR_DE_VEICULO"] })
  await expect(page.getByText("Nenhum informado")).toHaveCount(0)

  // No ETP os subtópicos já estão lá, e contam no progresso.
  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=etp`))
  await expect(page.getByText("0 de 4 seções e subtópicos concluídos")).toBeVisible()
  const painel = page.getByRole("region", { name: "Subtópicos removidos do contexto da contratação" })
  await expect(painel).toHaveCount(0)
  await page.getByRole("button", { name: new RegExp(`3\\.1\\s*${CONVENCAO.title}`) }).click()
  await expect(page.getByText(`Subtópico 3.1 de Requisitos da Contratação · ${CONVENCAO.legalBasis}`)).toBeVisible()
  await expect(page.getByText(CONVENCAO.hint)).toBeVisible()

  // Tirar um faz aparecer a linha para restaurar; restaurar traz de volta.
  await page.getByRole("button", { name: "Revisão e Geração" }).click()
  await page.getByRole("button", { name: "Excluir" }).first().click()
  await expect(painel.getByText("1 subtópico do contexto da contratação foi removido.")).toBeVisible()
  await painel.getByRole("button", { name: "Restaurar" }).click()
  await expect(painel).toHaveCount(0)
  expect(presentes).toEqual([HABILITACAO.code, CONVENCAO.code])
})
