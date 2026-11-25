"use client"

import { useEffect } from "react"

import { CHAVE_DO_RETORNO, alvoDoRetorno, lerMarca, marcaDaRolagem, saiDaPagina } from "@/lib/landing/retorno"

/**
 * Quando reaplicar a volta, em ms depois de montar: a página ainda cresce um
 * pouco (palcos de rolagem, imagens). Com timers, e não por quadro de pintura,
 * para funcionar também quando o navegador segura a pintura logo depois do voltar.
 */
const TENTATIVAS_MS = [0, 60, 150, 300, 500, 800, 1200, 1600]

function toposDosBlocos(): number[] {
  const main = document.getElementById("conteudo")
  return main ? Array.from(main.children, (filho) => filho.getBoundingClientRect().top) : []
}

/** Guarda a marca na entrada atual do histórico, sem tirar o que o Next guarda nela. */
function guardar() {
  const marca = marcaDaRolagem(toposDosBlocos())
  if (!marca) return
  const estado: unknown = window.history.state
  window.history.replaceState({ ...(typeof estado === "object" ? estado : {}), [CHAVE_DO_RETORNO]: marca }, "")
}

/**
 * A volta à seção de origem (§131). Ao sair por um link da página, guarda na
 * entrada do histórico o bloco que estava no alto da janela; quando essa
 * entrada volta (o "voltar" do navegador), leva a página de novo até ele, e
 * repete enquanto a página ainda cresce, até a pessoa mexer na rolagem.
 */
export function RetornoASecao() {
  useEffect(() => {
    const aoClicar = (evento: MouseEvent) => {
      const link = (evento.target as Element | null)?.closest?.("a[href]")
      if (link instanceof HTMLAnchorElement && saiDaPagina(new URL(link.href), new URL(window.location.href))) guardar()
    }
    document.addEventListener("click", aoClicar, true)

    const marca = lerMarca(window.history.state)
    if (!marca) return () => document.removeEventListener("click", aoClicar, true)

    let mexeu = false
    const aoMexer = () => {
      mexeu = true
    }
    const levar = () => {
      if (mexeu) return
      const alvo = alvoDoRetorno(marca, toposDosBlocos(), window.scrollY)
      if (alvo !== null && Math.abs(alvo - window.scrollY) > 1) window.scrollTo({ top: alvo, behavior: "instant" })
    }
    const gestos = ["wheel", "touchstart", "keydown", "pointerdown"] as const
    gestos.forEach((g) => window.addEventListener(g, aoMexer, { passive: true }))
    const tentativas = TENTATIVAS_MS.map((ms) => window.setTimeout(levar, ms))

    return () => {
      document.removeEventListener("click", aoClicar, true)
      gestos.forEach((g) => window.removeEventListener(g, aoMexer))
      tentativas.forEach((t) => window.clearTimeout(t))
    }
  }, [])
  return null
}
