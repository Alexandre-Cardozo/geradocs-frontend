import type { Metadata } from "next"
import type { ReactNode } from "react"

import { iconesDaAba } from "@/lib/marca/icones-da-aba"

/** Do login para dentro, a aba mostra o GeraDocs (§137). */
export const metadata: Metadata = { icons: iconesDaAba("geradocs") }

/** Shell mínimo das telas de autenticação — sem sidebar/header. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>
}
