import { expect, test } from "@playwright/test"

import { comSessao, processo, rota } from "./api"

/**
 * Uma rolagem só, e nada de faixa branca no fim.
 *
 * O shell é `h-dvh overflow-hidden` com o conteúdo rolando dentro do `main`.
 * Isso deveria dar **uma** barra de rolagem; dava duas, e a página terminava
 * numa faixa branca.
 *
 * A causa era sutil: `sr-only` é `position: absolute`, e sem ancestral
 * posicionado o bloco de contenção dele é a página inteira. Um aviso de leitor
 * de tela no fim de um formulário longo escapava do `main`, aterrissava na sua
 * posição estática — centenas de pixels abaixo da dobra — e esticava o
 * documento. Nada disso aparece em teste de componente: precisa de layout.
 */
const TEXTO_SEM_ESPACO = "a".repeat(120)

async function medir(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const de = document.documentElement
    const main = document.querySelector("main")
    return {
      estouroVertical: de.scrollHeight - de.clientHeight,
      estouroHorizontalDaPagina: de.scrollWidth - de.clientWidth,
      estouroHorizontalDoConteudo: main ? main.scrollWidth - main.clientWidth : 0,
    }
  })
}

test.describe("rolagem do shell", () => {
  test("o documento não rola: quem rola é o conteúdo", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/processos/novo"))
    await page.getByRole("button", { name: /Pregão Eletrônico/ }).click()
    await page.getByRole("button", { name: /Continuar/ }).click()

    const { estouroVertical } = await medir(page)

    // Um documento mais alto que a janela produz a segunda barra, e o espaço
    // sobrando abaixo do shell é a faixa branca.
    expect(estouroVertical).toBeLessThanOrEqual(1)
  })

  test("texto longo sem espaços não arrasta a tela para o lado", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/processos/novo"))
    await page.getByRole("button", { name: /Pregão Eletrônico/ }).click()
    await page.getByRole("button", { name: /Continuar/ }).click()
    await page.getByRole("textbox").nth(1).fill(`Descrição ${TEXTO_SEM_ESPACO}`)

    const medida = await medir(page)

    // O resumo lateral repete o que foi digitado. Sem quebra de palavra, uma
    // palavra de 120 caracteres empurrava o painel para fora da tela.
    expect(medida.estouroHorizontalDoConteudo).toBeLessThanOrEqual(1)
    expect(medida.estouroHorizontalDaPagina).toBeLessThanOrEqual(1)
  })

  test("o fim do formulário continua sendo o fim da página", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/processos/novo"))
    await page.getByRole("button", { name: /Pregão Eletrônico/ }).click()
    await page.getByRole("button", { name: /Continuar/ }).click()

    await page.mouse.wheel(0, 4000)
    const { estouroVertical } = await medir(page)

    // Rolar até o fim não pode revelar área fora do shell.
    expect(estouroVertical).toBeLessThanOrEqual(1)
  })

  test("objeto longo não arrasta a listagem de processos", async ({ page }) => {
    await comSessao(page)
    await page.route("**/api/v1/procurement-processes**", (rotaApi) =>
      rotaApi.fulfill({
        json: {
          content: [{ ...processo, objectDescription: `Objeto ${TEXTO_SEM_ESPACO}` }],
          totalElements: 1,
          number: 0,
          totalPages: 1,
        },
      }),
    )
    await page.goto(rota("/processos"))
    const celula = page.getByText(/Objeto aaa/)
    await celula.waitFor()

    const estouroDaCelula = await celula.evaluate((e) => e.scrollWidth - e.clientWidth)

    // Medir o `main` não bastava: a tabela tem rolagem própria, então o
    // transbordo não chegava a mexer no contêiner de fora — ele aparecia
    // **dentro** da célula, escrevendo por cima da coluna vizinha.
    expect(estouroDaCelula).toBeLessThanOrEqual(1)
    expect((await medir(page)).estouroHorizontalDaPagina).toBeLessThanOrEqual(1)
  })
})
