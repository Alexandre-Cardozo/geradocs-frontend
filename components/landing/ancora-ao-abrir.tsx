"use client"

import { useEffect } from "react"

/**
 * Quem abre a página já com uma âncora (`/#solucoes`) precisa chegar à seção
 * certa (§126). O navegador rola antes de os palcos de rolagem crescerem (a
 * abertura passa a 270svh só depois de montar), e a seção desce para longe da
 * janela. Dois quadros depois da montagem, com a altura final, a âncora é
 * aplicada de novo. Sem âncora, nada acontece.
 */
export function AncoraAoAbrir() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    let quadro = requestAnimationFrame(() => {
      quadro = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
    })
    return () => cancelAnimationFrame(quadro)
  }, [])
  return null
}
