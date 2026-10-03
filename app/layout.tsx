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
    "Plataforma GovTech da LAHHM para automação dos documentos de planejamento da contratação pública sob a Lei 14.133/2021.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
