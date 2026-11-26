"use client"

import { useEffect } from "react"

import { CoreografiaDaIa } from "@/components/mascotes/coreografia-da-ia"
import { registrarPalcoDaIa } from "@/lib/api/acompanhar-ia"

/**
 * O palco do GovBô nas ações com IA (§129), montado uma vez no aplicativo. Não
 * desenha nada até uma ação começar: só registra a coreografia no coordenador.
 */
export function PalcoDaIa() {
  useEffect(() => {
    const coreografia = new CoreografiaDaIa()
    const retirar = registrarPalcoDaIa(coreografia)
    return () => {
      retirar()
      coreografia.destruir()
    }
  }, [])
  return null
}
