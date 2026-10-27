import { expect, test } from "@playwright/test"

import { comSessao, rota } from "./api"

/**
 * Modelos do Órgão (§88, ADR-056 do back-end): a lista na navegação, com a
 * justificativa do Art. 19, § 2º, e o aviso da minuta da AGU mais nova.
 */
const API = "**/api/v1"

test("o modelo do órgão aparece com a justificativa e o aviso da minuta nova", async ({ page }) => {
  await comSessao(page)
  await page.route(`${API}/structure-models`, (r) =>
    r.fulfill({
      json: {
        agu: [
          {
            code: "AGU-EDITAL-PC",
            version: "2025-11",
            documentType: "EDITAL",
            title: "Minuta AGU — Pregão",
            description: "Menor preço.",
            publishedIn: "nov/2025",
            source: "AGU",
            sectionCount: 17,
          },
        ],
        organization: [
          {
            code: "ORG-0A1B2C3D",
            version: "001",
            documentType: "EDITAL",
            title: "Edital do Município",
            description: "",
            publishedIn: "out/2026",
            justification: "Lei Municipal 1.234/2024.",
            baseCode: "AGU-EDITAL-PC",
            baseVersion: "2025-11",
            active: true,
            createdByName: "Maria Costa",
            createdAt: "2026-10-27T12:00:00Z",
            newerBase: {
              code: "AGU-EDITAL-PC",
              version: "2026-04",
              documentType: "EDITAL",
              title: "Minuta AGU — Pregão",
              description: "",
              publishedIn: "abr/2026",
              source: "AGU",
              sectionCount: 17,
            },
          },
        ],
      },
    }),
  )

  await page.goto(rota("/"))
  await page.getByRole("link", { name: "Modelos do Órgão" }).first().click()

  await expect(page.getByRole("heading", { name: "Edital do Município" })).toBeVisible()
  await page.getByText("Justificativa (Art. 19, § 2º, Lei 14.133/21)").click()
  await expect(page.getByText("Lei Municipal 1.234/2024.")).toBeVisible()
  await expect(page.getByText(/A AGU publicou a versão abr\/2026 desta minuta/)).toBeVisible()
})
