import type { Metadata } from "next"
import { Suspense } from "react"

import { Onboarding } from "@/components/onboarding/onboarding"

/**
 * O onboarding da GovPri (§130): fora de `(app)` e de `(auth)`, sem sessão.
 * Abre pelos botões de demonstração e contato da página da GovPro e por link
 * direto (Instagram, com `?origem=instagram`).
 */
export const metadata: Metadata = {
  title: { absolute: "Conheça o GeraDocs com a Pri | GovPro" },
  description:
    "Responda a perguntas rápidas com a Pri, da GovPro, e veja como o GeraDocs entra na rotina de contratações do seu órgão.",
}

export default function PaginaDoOnboarding() {
  return (
    // `useSearchParams` lê a origem no navegador: no export estático, ele pede um Suspense em volta.
    <Suspense fallback={<div className="min-h-svh bg-navy" />}>
      <Onboarding />
    </Suspense>
  )
}
