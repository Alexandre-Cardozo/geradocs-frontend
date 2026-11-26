"use client"

import { useEffect, useRef } from "react"

import { movimentoReduzido } from "@/components/landing/rolagem"
import { valorDoContador } from "@/lib/landing/rolagem"

/** Duração da subida, em ms. */
const DURACAO = 1200

/**
 * Número que sobe de zero ao valor uma vez, ao entrar na tela (§125). O servidor
 * entrega o valor final; só um contador abaixo da dobra, com movimento, começa
 * do zero. O leitor de tela lê sempre o valor final, numa cópia escondida.
 */
export function Contador({ valor, className = "" }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof IntersectionObserver === "undefined" || movimentoReduzido()) return
    if (elemento.getBoundingClientRect().top < window.innerHeight) return

    elemento.textContent = "0"
    let quadro = 0
    const observador = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return
      observador.disconnect()
      const inicio = performance.now()
      const passo = (agora: number) => {
        const p = (agora - inicio) / DURACAO
        elemento.textContent = String(valorDoContador(valor, p))
        if (p < 1) quadro = requestAnimationFrame(passo)
      }
      quadro = requestAnimationFrame(passo)
    })
    observador.observe(elemento)
    return () => {
      observador.disconnect()
      cancelAnimationFrame(quadro)
      elemento.textContent = String(valor)
    }
  }, [valor])

  return (
    <span className={`relative tabular-nums ${className}`}>
      <span ref={ref} aria-hidden>
        {valor}
      </span>
      <span className="sr-only">{valor}</span>
    </span>
  )
}
