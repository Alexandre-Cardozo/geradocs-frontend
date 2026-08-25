import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { comProcessoEDocumento, comSessao, processo, rota, sessaoAdmin, semSessao } from "./api"

/**
 * Acessibilidade tem peso próprio aqui: o produto é usado por servidores
 * públicos, e acessibilidade digital é obrigação legal do órgão, não cortesia.
 *
 * O gate é `serious` e `critical` — as violações que impedem o uso. `minor` e
 * `moderate` entram no relatório para tratar, sem reprovar o build.
 */

const graves = ["serious", "critical"]

/**
 * A varredura roda com movimento reduzido, e não é preferência de estilo: o axe
 * compõe a cor de um elemento **no instante em que olha**, e um card ainda a
 * meio caminho da transição de opacidade tem contraste menor que o do repouso.
 *
 * Sem isto, o teste do detalhe do processo reprovava em duas de cada três
 * execuções da suíte inteira — e passava sempre quando rodava sozinho, que é o
 * pior formato de defeito de teste: some justamente quando se vai investigá-lo.
 *
 * De quebra, exercita o produto no modo que a própria folha de estilo declara
 * respeitar.
 */
test.use({ reducedMotion: "reduce" })

/**
 * `color-contrast` **entrou no gate em 22/08/2026**, para superfície clara.
 *
 * A exceção anterior tirava a regra inteira e dizia que as violações eram "todas
 * na sidebar navy". A parte da sidebar era verdade; o "todas" não — a varredura
 * nunca tinha visitado uma tela de formulário. Ao visitar, apareceu
 * `text-faint` a **1,35:1** sobre `#F1F5F9`, em texto de conteúdo.
 *
 * Os três cinzas de texto foram escurecidos (ver `app/globals.css`) e a regra
 * passou a valer. O que continua fora é **só o que está sobre o navy**: os
 * tokens `text-on-dark-*` dão de 2,65:1 a 3,73:1 sobre `#071a3d`, e corrigi-los
 * é mudar a paleta da sidebar — decisão de quem mantém o design system, com o
 * problema medido e registrado no plano.
 *
 * A exclusão é por token, e não por seletor de página: excluir a `<nav>` inteira
 * apagaria também as outras regras graves justamente onde fica a navegação.
 */
const TOKENS_SOBRE_NAVY = /text-on-dark-\d+/

async function violacoesGraves(page: Parameters<typeof AxeBuilder>[0]["page"]) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((violacao) => graves.includes(violacao.impact ?? ""))
    .map((violacao) => ({
      ...violacao,
      nodes: violacao.nodes.filter(
        (no) => !(violacao.id === "color-contrast" && TOKENS_SOBRE_NAVY.test(no.html ?? "")),
      ),
    }))
    .filter((violacao) => violacao.nodes.length > 0)
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

/**
 * As telas de formulário entraram em 22/08/2026, e não deviam ter demorado: até
 * então a varredura visitava login, painel e lista — **nenhuma com formulário**.
 *
 * O que estas quatro **não** guardam é a associação entre rótulo e campo. Isso
 * foi medido, e não suposto: com a associação removida de propósito, o axe
 * relata exatamente o mesmo, porque aceita `placeholder` como nome acessível.
 * Quem guarda aquela regra é `components/ui/forms.test.tsx`, controle a
 * controle. Registrar isso aqui evita que alguém leia estas quatro linhas como
 * cobertura que elas não dão.
 */
test("o cadastro de processo não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/processos/novo"))

  expect(await violacoesGraves(page)).toEqual([])
})

test("as configurações não têm violação grave", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/configuracoes"))

  expect(await violacoesGraves(page)).toEqual([])
})

test("a administração de servidores não tem violação grave", async ({ page }) => {
  await comSessao(page, sessaoAdmin)
  await page.goto(rota("/admin/servidores"))

  // Tabela com linha clicável: é onde "abre no clique mas não no teclado"
  // passaria despercebido.
  expect(await violacoesGraves(page)).toEqual([])
})

test("o meu perfil não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await page.goto(rota("/perfil"))

  // Tela de formulário com campos de senha e um seletor de arquivo escondido —
  // é exatamente onde rótulo sem associação passa despercebido.
  expect(await violacoesGraves(page)).toEqual([])
})

test("o editor de documento não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.goto(rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`))

  expect(await violacoesGraves(page)).toEqual([])
})

test("o detalhe do processo não tem violação grave", async ({ page }) => {
  await comSessao(page)
  await comProcessoEDocumento(page)
  await page.goto(rota(`/processos/detalhe?id=${encodeURIComponent(processo.id)}`))

  expect(await violacoesGraves(page)).toEqual([])
})
