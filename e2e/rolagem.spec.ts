import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota } from "./api"

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

/**
 * A largura acompanha a janela.
 *
 * <p>Cada página do aplicativo era `max-w-content` (1200px) **sem** centragem:
 * em tela larga — ou com o zoom do navegador reduzido, que é a mesma coisa para
 * a página — o conteúdo travava em 1200px e ficava colado à esquerda, deixando
 * o resto da janela em branco. Não aparece em teste de componente: precisa de
 * uma janela de verdade.
 */
test.describe("largura do conteúdo", () => {
  const larguraDoConteudo = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const main = document.querySelector("main")
      const pagina = main?.firstElementChild
      return {
        main: main?.clientWidth ?? 0,
        pagina: pagina ? pagina.getBoundingClientRect().width : 0,
      }
    })

  for (const [nome, caminho] of [
    ["o painel", "/"],
    ["a listagem de processos", "/processos"],
    ["os documentos", "/documentos"],
  ] as const) {
    test(`${nome} ocupa a largura da janela`, async ({ page }) => {
      await page.setViewportSize({ width: 1900, height: 900 })
      await comSessao(page)
      await page.goto(rota(caminho))
      await page.waitForLoadState("networkidle")

      const { main, pagina } = await larguraDoConteudo(page)

      // Sobrar mais que um arredondamento é a faixa branca de volta.
      expect(main).toBeGreaterThan(1200)
      expect(main - pagina).toBeLessThanOrEqual(1)
    })
  }
})

/**
 * A rolagem para onde o conteúdo acaba.
 *
 * <p>Rolar além do conteúdo — a tela desce e termina num vazio — vem de
 * elemento absoluto colocado na sua posição estática lá embaixo, tipicamente um
 * `sr-only` no fim de um formulário longo ou dentro de um painel que rola. O
 * bloco de contenção dele quase nunca é o painel, então a área rolável do
 * ancestral cresce sem que nada visível ocupe o espaço.
 *
 * <p>A varredura cobre as telas do aplicativo: é barata, e o defeito reaparece
 * em qualquer uma que ganhe um aviso invisível novo.
 */
test.describe("a rolagem termina no conteúdo", () => {
  const TELAS = [
    ["o painel", "/"],
    ["a listagem", "/processos"],
    ["os documentos", "/documentos"],
    ["o novo processo", "/processos/novo"],
    ["o perfil", "/perfil"],
    ["o timbre", "/configuracoes/timbre"],
    ["as secretarias", "/configuracoes/secretarias"],
    ["o PCA", "/configuracoes/pca"],
    ["os usuários", "/configuracoes/usuarios"],
    ["o processo", `/processos/detalhe?id=${processo.id}`],
    ["o editor", `/processos/documento?id=${processo.id}&tipo=etp`],
    ["a verificação do DFD", `/processos/dfd?id=${processo.id}`],
  ] as const

  for (const [nome, caminho] of TELAS) {
    test(`${nome} não rola além do que mostra`, async ({ page }) => {
      await page.setViewportSize({ width: 1500, height: 800 })
      await comSessao(page)
      await comProcessoEDocumento(page)
      await page.goto(rota(caminho))
      await page.waitForLoadState("networkidle")

      const medida = await page.evaluate(() => {
        const main = document.querySelector("main") as HTMLElement
        const topo = main.getBoundingClientRect().top
        let fundo = 0
        for (const el of Array.from(main.querySelectorAll("*")) as HTMLElement[]) {
          const caixa = el.getBoundingClientRect()
          // Ignora o que está escondido: não é ele que deveria dar altura.
          if (caixa.width === 0 && caixa.height === 0) continue
          fundo = Math.max(fundo, caixa.bottom - topo + main.scrollTop)
        }
        return {
          sobra: main.scrollHeight - Math.max(fundo, main.clientHeight),
          documento: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        }
      })

      // Mais que um arredondamento de sobra é rolagem para o vazio.
      expect(medida.sobra).toBeLessThanOrEqual(1)
      // E o documento continua sem rolar: quem rola é o conteúdo.
      expect(medida.documento).toBeLessThanOrEqual(1)
    })
  }
})
