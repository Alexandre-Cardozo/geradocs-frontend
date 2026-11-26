import type { Metadata } from "next"

/**
 * O ícone da aba diz em que lugar a pessoa está (§137): a GovPro no site da
 * empresa, no onboarding e nas demais páginas públicas; o GeraDocs do login
 * para dentro do sistema.
 *
 * O layout raiz declara a GovPro, e os layouts do login, `app/(auth)`, e do
 * sistema, `app/(app)`, trocam pelo GeraDocs: o Next substitui o campo `icons`
 * inteiro no segmento mais interno.
 * Por isso os ícones não ficam nos arquivos `app/icon.png` e `app/favicon.ico`,
 * que valem para o site todo e vencem a configuração.
 */
export type MarcaDaAba = "govpro" | "geradocs"

/**
 * O Next não põe o `basePath` nos endereços da metadata; a publicação sob
 * caminho (`/geradocs-frontend` no CI) precisa dele.
 */
const PREFIXO = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** Os ícones da aba e da tela inicial do iPhone de uma marca, em `public/icones/<marca>/`. */
export function iconesDaAba(marca: MarcaDaAba): NonNullable<Metadata["icons"]> {
  const pasta = `${PREFIXO}/icones/${marca}`
  return {
    icon: [
      { url: `${pasta}/favicon.ico`, sizes: "32x32" },
      { url: `${pasta}/icon.png`, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: `${pasta}/apple-icon.png`, type: "image/png", sizes: "180x180" }],
  }
}

/** A marca de um endereço de ícone da aba, ou `null` se não for um deles. */
export function marcaDoIcone(endereco: string): MarcaDaAba | null {
  return (endereco.match(/\/icones\/(govpro|geradocs)\//)?.[1] as MarcaDaAba | undefined) ?? null
}

/**
 * Quais ícones sobraram de outra marca, dados os endereços na ordem em que estão
 * no `<head>`. Vale a marca do último: é o que o React acabou de inserir.
 *
 * Isto acontece quando a pessoa clica em "Entrar" antes de a página terminar de
 * hidratar: o React repete o clique como navegação interna, mas os ícones que
 * vieram do servidor ainda não eram dele e ficam na aba, ao lado dos novos.
 */
export function iconesDeOutraMarca(enderecos: readonly string[]): number[] {
  const marcas = enderecos.map(marcaDoIcone)
  const atual = marcas.findLast((m) => m !== null)
  return marcas.flatMap((m, indice) => (m !== null && m !== atual ? [indice] : []))
}
