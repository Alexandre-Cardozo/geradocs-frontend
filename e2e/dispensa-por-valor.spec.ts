import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A conferência do valor contra o limite da dispensa (Art. 75, I e II).
 *
 * <p>Ela informa e **não impede**: contratação direta fora das hipóteses legais
 * é nulidade do ato, mas quem escolhe o fundamento é quem responde pelo
 * processo. O que a jornada cobra é que o alerta apareça onde a decisão é
 * tomada, e que nada trave por causa dele.
 */
const API = "**/api/v1"

const conferencia = (sobrescrever: Record<string, unknown> = {}) => ({
  dispensation: true,
  applicable: true,
  ground: "VALUE_GENERAL",
  legalBasis: "Art. 75, II, Lei 14.133/21",
  limitAmount: 65492.11,
  limitSource: "Decreto nº 12.807/2025",
  estimatedValue: 485000,
  fiscalYear: 2026,
  exceeds: true,
  pendingGround: false,
  pendingLimit: false,
  ...sobrescrever,
})

async function comConferencia(
  page: import("@playwright/test").Page,
  corpo: Record<string, unknown>,
) {
  await page.route(`${API}/procurement-processes/*/dispensation-check`, (rota) =>
    rota.fulfill({ json: corpo }),
  )
}

test.describe("dispensa em razão do valor", () => {
  test("acima do limite, o processo avisa sem travar nada", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comConferencia(page, conferencia())

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))

    await expect(page.getByText(/ultrapassa o limite/)).toBeVisible()
    await expect(page.getByText(/Decreto nº 12.807\/2025/)).toBeVisible()
    // Informa e não impede: os documentos continuam acessíveis.
    await expect(page.getByRole("heading", { name: "Documentos do Processo" })).toBeVisible()
  })

  test("dentro do limite, confirma sem alarde", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comConferencia(page, conferencia({ estimatedValue: 12500, exceeds: false }))

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))

    await expect(page.getByText("Valor dentro do limite da dispensa")).toBeVisible()
  })

  test("fora da dispensa, a tela não diz nada sobre limite", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comConferencia(
      page,
      conferencia({ dispensation: false, applicable: false, ground: null, exceeds: false }),
    )

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))

    await expect(page.getByText("Documentos do Processo")).toBeVisible()
    await expect(page.getByText(/limite da dispensa/)).toHaveCount(0)
  })

  test("sem inciso declarado, o processo oferece declará-lo", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await comConferencia(
      page,
      conferencia({ applicable: false, ground: null, pendingGround: true, exceeds: false }),
    )

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))

    await expect(page.getByText(/ainda não diz com que inciso/)).toBeVisible()
    // Nasce travado: declarar sem escolher seria declarar o quê?
    await expect(page.getByRole("button", { name: "Declarar" })).toBeDisabled()
  })
})
