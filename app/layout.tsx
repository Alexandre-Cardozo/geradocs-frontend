import type { Metadata } from "next"
import localFont from "next/font/local"
import type { ReactNode } from "react"

import { Providers } from "@/components/shared/providers"

import "./globals.css"

/*
 * As fontes moram no repositório, e não no Google Fonts.
 *
 * Com `next/font/google`, o build e o `next dev` baixam a CSS e os arquivos de
 * fonte a cada execução. De vez em quando o Google responde com URLs sem
 * extensão, o Turbopack não as resolve ("next/font/google queries have exactly
 * one entry") e o servidor do e2e não sobe — o CI reprovava um commit que só
 * mudava o título da página (issue 99114 do vercel/next.js, sem correção publicada).
 *
 * Os arquivos são as versões variáveis do Fontsource 5.3.0, subconjunto latin,
 * sob a SIL Open Font License (LICENSE-*.txt ao lado). Um arquivo por família
 * cobre todos os pesos que a interface usa.
 */
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
})

const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
})

/*
 * Montserrat é a fonte da marca (manual de 28/10/2026): títulos, números dos
 * indicadores, rótulos em caixa-alta e o slogan (§94). O corpo segue em Inter.
 * Fontsource 5.0.19, subconjunto latin, três pesos estáticos (OFL,
 * LICENSE-montserrat.txt) — o 800 é o dos títulos de página.
 */
const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/montserrat-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/montserrat-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-montserrat",
})

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: {
    default: "GeraDocs | Homologação",
    template: "%s | GeraDocs - Homologação",
  },
  description:
    "Plataforma GovTech da GovPro para automação dos documentos de planejamento da contratação pública sob a Lei 14.133/2021.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${inter.variable} ${montserrat.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
