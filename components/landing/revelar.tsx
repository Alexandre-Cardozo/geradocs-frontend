"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Revela o bloco uma vez, ao entrar na tela (§107).
 *
 * O estado escondido é aplicado aqui, depois da montagem, e só em elemento que
 * está abaixo da dobra: sem JavaScript, ou com movimento reduzido, nada fica
 * escondido, e o que já está à vista no carregamento não pisca. O estado vai no
 * atributo `data-estado`, escrito direto no elemento — não há estado do React,
 * portanto nenhuma renderização extra.
 */
export function Revelar({
  atraso = 0,
  className = "",
  children,
}: {
  atraso?: number
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    if (elemento.getBoundingClientRect().top < window.innerHeight) return

    elemento.dataset.estado = "oculto"
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((entrada) => entrada.isIntersecting)) return
        elemento.dataset.estado = "visivel"
        observador.disconnect()
      },
      { rootMargin: "0px 0px -10% 0px" },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${atraso}ms` }}
      className={`data-[estado]:transition-[opacity,transform,filter] data-[estado]:duration-300 data-[estado]:ease-landing data-[estado=oculto]:translate-y-3 data-[estado=oculto]:opacity-0 data-[estado=oculto]:blur-xs ${className}`}
    >
      {children}
    </div>
  )
}
