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
