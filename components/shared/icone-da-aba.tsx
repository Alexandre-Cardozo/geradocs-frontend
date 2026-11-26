"use client"

import { useEffect } from "react"

import { iconesDeOutraMarca } from "@/lib/marca/icones-da-aba"

const SELETOR = 'link[rel="icon"], link[rel="apple-touch-icon"]'

/**
 * Garante uma marca só na aba (§137). Se a navegação deixou para trás os ícones
 * da página anterior (clique antes de a página hidratar), tira os que não são da
 * marca atual. Observa o `<head>` porque a metadata da página nova pode chegar
 * depois da troca de rota. Não desenha nada.
 */
export function IconeDaAba() {
  useEffect(() => {
    const conferir = () => {
      const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>(SELETOR))
      for (const indice of iconesDeOutraMarca(links.map((l) => l.getAttribute("href") ?? ""))) links[indice]?.remove()
    }
    conferir()
    const observador = new MutationObserver(conferir)
    observador.observe(document.head, { childList: true })
    return () => observador.disconnect()
  }, [])
  return null
}
