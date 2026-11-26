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
