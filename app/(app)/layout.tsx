import type { ReactNode } from "react"

import AppShell from "@/components/layout/AppShell"
import GuardaSessao from "@/components/layout/GuardaSessao"
import { PalcoDaIa } from "@/components/mascotes/palco-da-ia"

/** Shell autenticado: guarda de sessão/RBAC + sidebar 240px navy + header 60px + conteúdo. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <GuardaSessao>
      <AppShell>{children}</AppShell>
      {/* O GovBô que acompanha cada ação com IA (§129). */}
      <PalcoDaIa />
    </GuardaSessao>
  )
}
