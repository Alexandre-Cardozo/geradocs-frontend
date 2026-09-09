"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * As configurações do órgão deixaram de ser uma tela de abas e viraram quatro
 * menus (timbre, secretarias, PCA, usuários). Esta rota permanece para não
 * quebrar links já existentes e leva ao primeiro deles.
 */
export default function RedirectConfiguracoes() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/configuracoes/timbre")
  }, [router])

  return null
}
