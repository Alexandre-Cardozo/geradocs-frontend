import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import type { ReactNode } from "react"

import { Providers } from "@/components/shared/providers"

import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
