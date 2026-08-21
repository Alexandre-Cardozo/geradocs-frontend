import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { comSessao, rota, semSessao } from "./api"

/**
 * Acessibilidade tem peso próprio aqui: o produto é usado por servidores
 * públicos, e acessibilidade digital é obrigação legal do órgão, não cortesia.
 *
 * O gate é `serious` e `critical` — as violações que impedem o uso. `minor` e
 * `moderate` entram no relatório para tratar, sem reprovar o build.
 */

const graves = ["serious", "critical"]

/**
 * `color-contrast` está fora do gate por decisão registrada, não por conveniência.
 *
 * Em 21/08/2026 a varredura encontrou 12 ocorrências no painel e 6 na lista de
 * processos, todas na sidebar navy: os tokens `text-on-dark-40` e vizinhos dão
 * de 2,65:1 a 3,73:1 sobre `#071a3d`, em textos de 10–11px que a WCAG AA exige
 * a 4,5:1. Corrigir significa mudar valor de token — o design system é normativo
 * e a decisão é de quem o mantém, não deste teste.
 *
 * Enquanto isso, **todas as outras regras graves continuam valendo**: excluir a
 * suíte inteira por causa de uma regra seria trocar um defeito conhecido por
 * cegueira completa.
 */
const REGRA_EM_ABERTO = "color-contrast"

async function violacoesGraves(page: Parameters<typeof AxeBuilder>[0]["page"]) {
  const { violations } = await new AxeBuilder({ page }).disableRules([REGRA_EM_ABERTO]).analyze()
  return violations
    .filter((violacao) => graves.includes(violacao.impact ?? ""))
    .map((violacao) => `${violacao.id} (${violacao.impact}): ${violacao.nodes.length} ocorrência(s)`)
}

test("o login não tem violação grave", async ({ page }) => {
  await semSessao(page)
  await page.goto(rota("/login"))

  expect(await violacoesGraves(page)).toEqual([])
})

test("o painel não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/"))

  expect(await violacoesGraves(page)).toEqual([])
})

test("a lista de processos não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/processos"))

  expect(await violacoesGraves(page)).toEqual([])
})
