import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

/**
 * A liberdade de decisão ao longo do fluxo.
 *
 * <p>Três travas que a auditoria do fluxo encontrou (§80): documento dependente
 * sem botão nenhum, documento que entrava no processo e não saía, e o rascunho
 * divergindo da versão gerada em silêncio. A plataforma orienta; quem decide é
 * quem responde pelo processo.
 */
const API = "**/api/v1"

test.describe("liberdade no fluxo do processo", () => {
  test("documento que depende de outro pode ser aberto e elaborado", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))

    // O TR se fundamenta no ETP e nada impede redigi-lo antes: a ordem é do
    // fluxo, não da lei. A dependência continua dita, e deixou de ser trava.
    await expect(page.getByText(/Fundamenta-se em Estudo Técnico Preliminar/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Elaborar TR|Continuar TR/ }),
    ).toBeVisible()
  })

  test("documento sai do processo quando entrou por engano", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    let enviado: Record<string, unknown> | null = null
    await page.route(`${API}/procurement-processes/*`, async (rota) => {
      if (rota.request().method() === "PATCH") {
        enviado = rota.request().postDataJSON() as Record<string, unknown>
        await rota.fulfill({ json: { ...processo, documents: ["ETP"] } })
        return
      }
      await rota.fulfill({ json: processo })
    })

    await page.goto(rota(`/processos/detalhe?id=${processo.id}`))
    await page.getByRole("button", { name: "Retirar do processo" }).last().click()

    // Enquanto ficava na lista, contava como pendência no encerramento para
    // sempre.
    await expect.poll(() => enviado).not.toBeNull()
  })

  test("alteração depois da versão gerada aparece no editor", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)
    await page.route(`${API}/procurement-processes/*/documents/*`, (rota) =>
      rota.fulfill({
        json: {
          id: "5c4d3e2f-1111-4222-8333-444455556666",
          processId: processo.id,
          documentType: "ETP",
          currentVersion: 1,
          finalized: true,
          changedSinceVersion: true,
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
              content: "Texto trocado depois de concluir.",
              dispensationJustification: null,
              resolved: true,
            },
          ],
          pendingRequiredSections: [],
          silentGaps: [],
          body: [],
        },
      }),
    )

    await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=etp`))

    // O arquivo anexado ao processo diz uma coisa e a tela mostra outra: o que
    // não pode é ninguém avisar.
    await expect(page.getByText(/Há alterações depois da versão gerada/)).toBeVisible()
  })
})
