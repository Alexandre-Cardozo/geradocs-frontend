import type { Page } from "@playwright/test"

/**
 * Dublê da API para a jornada de ponta a ponta.
 *
 * Nunca aponte o e2e para a API real: além de exigir backend no ar, ele passaria
 * a depender de dados de gente de verdade — e a suíte deixaria de ser executável
 * por qualquer pessoa a qualquer hora.
 */

const API = "**/api/v1"

/** Prefixo do app no GitHub Pages. Toda navegação do e2e passa por aqui. */
export const APP = "/GeraDocsFrontend"

/** Caminho absoluto de uma rota do app. `rota("/processos")` → "/GeraDocsFrontend/processos". */
export function rota(caminho = "/") {
  return `${APP}${caminho}`.replace(/\/$/, "") || APP
}

export const sessaoServidor = {
  user: {
    id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
    name: "Maria Costa Andrade",
    cpf: "33333333333",
    email: "maria.costa@ecoporanga.es.gov.br",
    jobTitle: "Servidora de Compras",
    profileAccess: "SERVIDOR",
    status: "ACTIVE",
    lastAccessAt: "2026-08-20T14:30:00-03:00",
  },
  organization: {
    id: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
    name: "Prefeitura Municipal de Ecoporanga",
    unit: "Administração Central",
    status: "ACTIVE",
  },
  activeMembership: {
    organizationId: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
    departmentId: null,
    active: true,
  },
  permissions: [],
}

export const sessaoAdmin = {
  ...sessaoServidor,
  user: { ...sessaoServidor.user, name: "Ana Paula Ribeiro", profileAccess: "ADMIN_GERAL" },
  organization: null,
  activeMembership: null,
}

type Sessao = typeof sessaoServidor

/** Deixa a API responder como se ninguém estivesse autenticado. */
export async function semSessao(page: Page) {
  await page.route(`${API}/auth/refresh`, (rota) =>
    rota.fulfill({ status: 401, contentType: "application/problem+json", body: JSON.stringify({ detail: "Sem sessão." }) }),
  )
  await page.route(`${API}/auth/login`, (rota) =>
    rota.fulfill({
      status: 401,
      contentType: "application/problem+json",
      body: JSON.stringify({ detail: "Credenciais inválidas." }),
    }),
  )
}

/**
 * Estado de quem chega deslogado e digita a credencial certa: a renovação falha
 * (não há cookie ainda) e só o POST de login responde.
 *
 * Existe porque `comSessao` autentica antes da tela aparecer — a guarda leva
 * direto ao painel, e o formulário de login nunca fica clicável.
 */
export async function prestesALogar(page: Page, sessao: Sessao = sessaoServidor) {
  await page.route(`${API}/auth/refresh`, (rota) =>
    rota.fulfill({ status: 401, contentType: "application/problem+json", body: JSON.stringify({ detail: "Sem sessão." }) }),
  )
  await page.route(`${API}/auth/login`, (rota) =>
    rota.fulfill({
      json: {
        accessToken: "token-de-teste",
        tokenType: "Bearer",
        expiresIn: 600,
        expiresAt: "2099-01-01T00:00:00-03:00",
        session: sessao,
      },
    }),
  )
  await page.route(`${API}/me`, (rota) => rota.fulfill({ json: sessao }))
}

/** Deixa a API responder como se a pessoa já estivesse autenticada. */
export async function comSessao(page: Page, sessao: Sessao = sessaoServidor) {
  const autenticacao = {
    accessToken: "token-de-teste",
    tokenType: "Bearer",
    expiresIn: 600,
    expiresAt: "2099-01-01T00:00:00-03:00",
    session: sessao,
  }
  await page.route(`${API}/auth/refresh`, (rota) => rota.fulfill({ json: autenticacao }))
  await page.route(`${API}/auth/login`, (rota) => rota.fulfill({ json: autenticacao }))
  await page.route(`${API}/me`, (rota) => rota.fulfill({ json: sessao }))
  await page.route(`${API}/auth/logout`, (rota) => rota.fulfill({ status: 204, body: "" }))
  await page.route(`${API}/procurement-processes**`, (rota) =>
    rota.fulfill({ json: { content: [], totalElements: 0, number: 0, totalPages: 1 } }),
  )
  await page.route(`${API}/organizations**`, (rota) => rota.fulfill({ json: [] }))
  await page.route(`${API}/users**`, (rota) => rota.fulfill({ json: [] }))
}

/** Um processo com ETP previsto, como o servidor o devolve. */
export const processo = {
  id: "3f2b1a00-1111-4222-8333-444455556666",
  processNumber: "PROC-2026-000007",
  organizationId: sessaoServidor.organization.id,
  departmentId: "8a7b6c5d-4e3f-4a2b-9c8d-7e6f5a4b3c2d",
  departmentName: "Secretaria de Administração",
  responsibleUserName: "Maria Costa Andrade",
  objectDescription: "Aquisição de material de expediente",
  demandObject: "Papel A4, canetas e pastas",
  modality: "ELECTRONIC_AUCTION",
  estimatedValue: 485000,
  legalBasis: "Art. 28, I, Lei 14.133/21",
  urgency: false,
  documents: ["ETP", "TR"],
  dfdFileName: "dfd-2026-014.pdf",
  status: "DRAFT",
  createdAt: "2026-08-20T10:00:00-03:00",
  updatedAt: "2026-08-20T10:30:00-03:00",
  version: 0,
}

function secao(sectionCode: string, position: number, required: boolean, content = "") {
  return {
    sectionCode,
    position,
    title: `Seção ${sectionCode} do ETP`,
    legalBasis: `Art. 18, § 1º, ${sectionCode}, Lei 14.133/21`,
    hint: "Demonstre o que a seção pede.",
    required,
    content,
    resolved: content !== "",
  }
}

/**
 * O processo e o ETP servidos pela API, com o texto sobrevivendo à edição.
 *
 * O dublê guarda o que foi escrito porque é justamente isso que a jornada
 * verifica: o que a pessoa digitou continua lá depois de recarregar a página.
 */
export async function comProcessoEDocumento(page: Page) {
  // `comSessao` registra a listagem vazia. Sem retirá-la, ela também casa com
  // `/procurement-processes/{id}` e o processo volta no formato de página — o
  // mapeamento então reclama de uma modalidade que nunca veio.
  await page.unroute(`${API}/procurement-processes**`)
  const escrito = new Map<string, string>()

  const documento = () => ({
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: "ETP",
    currentVersion: 0,
    finalized: false,
    progress: escrito.size > 0 ? 50 : 0,
    canGenerate: escrito.has("1"),
    sections: [
      secao("1", 1, true, escrito.get("1") ?? ""),
      secao("2", 2, false, escrito.get("2") ?? ""),
    ],
    pendingRequiredSections: escrito.has("1") ? [] : ["Seção 1 do ETP"],
    silentGaps: escrito.has("2") ? [] : ["Seção 2 do ETP"],
    body: [...escrito.entries()].map(([codigo, texto]) => ({
      sectionCode: codigo,
      title: `Seção ${codigo} do ETP`,
      text: texto,
      dispensed: false,
    })),
  })

  // Da mais genérica para a mais específica: no Playwright a rota registrada
  // por último vence, então a listagem precisa vir primeiro — senão o `**`
  // engoliria também o detalhe do processo e o documento.
  await page.route(`${API}/procurement-processes**`, (rota) =>
    rota.fulfill({
      json: { content: [processo], totalElements: 1, number: 0, totalPages: 1 },
    }),
  )
  await page.route(`${API}/procurement-processes/*`, (rota) => rota.fulfill({ json: processo }))
  await page.route(`${API}/procurement-processes/*/documents/*`, (rota) =>
    rota.fulfill({ json: documento() }),
  )
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (rota) => {
    const corpo = rota.request().postDataJSON() as { content?: string }
    const codigo = new URL(rota.request().url()).pathname.split("/").pop() ?? "1"
    escrito.set(codigo, corpo.content ?? "")
    await rota.fulfill({ json: documento() })
  })

  // A seção 2 do ETP é a do inciso II e carrega o painel do PCA. Sem estas
  // rotas, abrir o editor deixaria o painel em erro em toda jornada.
  let informado: string | null = null
  const verificacao = () => ({
    plan: {
      year: 2026,
      sourceFileName: "pca-2026.csv",
      importedAt: "2026-08-22T12:00:00-03:00",
      indexedItems: 247,
    },
    foreseen: false,
    citable: true,
    citation: CITACAO_PCA,
    declaredNote: informado,
    findings: [
      {
        demand: "Papel A4 75 g/m2",
        foreseen: true,
        kind: "TERMS",
        code: "2026-0142",
        description: "Papel A4 75 g/m2, resma com 500 folhas",
        unit: "RESMA",
        quantity: 1200,
        estimatedValue: 28800,
      },
      { demand: "Cimento CP-II 50 kg", foreseen: false },
    ],
  })
  await page.route(`${API}/procurement-processes/*/pca`, (rota) =>
    rota.fulfill({ json: verificacao() }),
  )
  await page.route(`${API}/procurement-processes/*/pca/declaration`, async (rota) => {
    const corpo = rota.request().postDataJSON() as { note?: string | null }
    informado = corpo.note ?? null
    await rota.fulfill({ json: verificacao() })
  })
  await page.route(`${API}/procurement-processes/*/pca/citation`, async (rota) => {
    // É o servidor que grava a citação na seção; o dublê faz o mesmo, para que
    // a jornada possa conferir que o texto ficou no documento.
    escrito.set("2", CITACAO_PCA)
    await rota.fulfill({ json: verificacao() })
  })
}

/** A citação como o servidor a compõe, com o item previsto e o que ficou de fora. */
export const CITACAO_PCA = [
  "A presente contratação está prevista no Plano de Contratações Anual de 2026, nos seguintes itens:",
  "- Item 2026-0142 — Papel A4 75 g/m2, resma com 500 folhas (quantidade prevista: 1200 RESMA; valor estimado: R$ 28.800,00).",
  "Os itens a seguir não constam do plano:",
  "- Cimento CP-II 50 kg.",
  "Quanto a eles, registra-se: [justificar a contratação não prevista no Plano de Contratações Anual].",
].join("\n\n")
