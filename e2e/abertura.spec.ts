import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A prévia abre como o papel (§97, ADR-059 do back-end): nome por extenso,
 * introdução, processo e OBJETO em destaque — e, sem Objeto da Demanda, o
 * aviso de que vale a descrição do processo, com o caminho até a capa.
 */
const API = "**/api/v1"

test("a etapa final mostra a abertura e leva à capa quando o objeto é a descrição", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.route(`${API}/procurement-processes/*/documents/*`, (r) =>
    r.fulfill({
      json: {
        id: "5c4d3e2f-1111-4222-8333-444455556666",
        processId: processo.id,
        documentType: "ETP",
        currentVersion: 0,
        finalized: false,
        changedSinceVersion: false,
        progress: 100,
        canGenerate: true,
        sections: [
          {
            sectionCode: "1",
            position: 1,
            title: "Seção 1 do ETP",
            legalBasis: "Art. 18, § 1º, I, Lei 14.133/21",
            hint: "Demonstre o que a seção pede.",
            required: true,
            content: "Conteúdo da seção.",
            dispensationJustification: null,
            resolved: true,
          },
        ],
        pendingRequiredSections: [],
        silentGaps: [],
        body: [{ sectionCode: "1", title: "Seção 1 do ETP", text: "Conteúdo da seção.", dispensed: false }],
        opening: {
          title: "ESTUDO TÉCNICO PRELIMINAR",
          introduction: "O presente documento caracteriza a primeira etapa da fase de planejamento.",
          processNumber: processo.processNumber,
          objectText: processo.objectDescription,
          objectSource: "OBJECT_DESCRIPTION",
        },
      },
    }),
  )

  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=etp&etapa=revisao`))

  await expect(page.getByText("ESTUDO TÉCNICO PRELIMINAR", { exact: true })).toBeVisible()
  await expect(page.getByText(/O presente documento caracteriza/)).toBeVisible()
  await expect(page.getByText("OBJETO:", { exact: true })).toBeVisible()
  await expect(page.getByText(/Objeto da Demanda em branco/)).toBeVisible()

  await page.getByRole("button", { name: "Preencher na capa" }).click()
  await expect(page).toHaveURL(/\/processos\/detalhe\/?\?id=/)
})
