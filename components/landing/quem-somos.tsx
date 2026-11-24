"use client"

import { useEffect, useRef } from "react"

import { IconeDoItemQuadro } from "@/components/landing/icones"
import { Revelar } from "@/components/landing/revelar"
import { assinarRolagem, movimentoReduzido } from "@/components/landing/rolagem"
import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { opacidadeDaPalavra, progressoDaPassagem } from "@/lib/landing/rolagem"

/** Azul, verde e amarelo: as cores da faixa da marca, uma para cada resposta. */
const ACENTO = ["bg-marca-azul-claro", "bg-marca-verde", "bg-marca-amarelo"] as const

/**
 * Quem Somos, em navy, logo depois do manifesto da abertura (§125). A frase de
 * crença acende palavra por palavra conforme a rolagem; o servidor a entrega
 * acesa, e com movimento reduzido ela fica assim.
 */
export function QuemSomos() {
  const { quemSomos } = CONTEUDO
  const frase = useRef<HTMLParagraphElement>(null)
  const palavras = quemSomos.manifesto.split(" ")

  useEffect(() => {
    const elemento = frase.current
    if (!elemento || movimentoReduzido()) return
    const spans = Array.from(elemento.querySelectorAll<HTMLElement>("[data-palavra]"))
    return assinarRolagem(() => {
      const caixa = elemento.getBoundingClientRect()
      // A frase acende enquanto atravessa a metade de baixo da janela.
      const p = progressoDaPassagem(caixa.top, caixa.height, window.innerHeight * 0.9)
      spans.forEach((span, i) => {
        span.style.opacity = String(opacidadeDaPalavra(p, i, spans.length))
      })
    })
  }, [])

  return (
    <section id={quemSomos.id} className="on-dark relative overflow-hidden bg-navy py-20 lg:py-32">
      <div className="pointer-events-none absolute inset-0 landing-grade" aria-hidden />
      <div className="relative mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex flex-col gap-2">
          <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark-65 uppercase">{quemSomos.rotulo}</p>
          <FaixaDaMarca className="w-20" />
        </div>
        <p
          ref={frase}
          className="m-0 mt-8 max-w-4xl font-display text-landing-manifesto font-extrabold text-balance text-on-dark"
        >
          {palavras.map((palavra, i) => (
            <span key={`${palavra}-${i}`} data-palavra className="transition-opacity duration-150 ease-linear">
              {palavra}
              {i < palavras.length - 1 ? " " : ""}
            </span>
          ))}
        </p>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Revelar>
            <p className="m-0 text-landing-lead text-pretty text-on-dark-65">{quemSomos.texto}</p>
            <ul className="m-0 mt-6 flex list-none flex-wrap gap-2 p-0" aria-label="Para quem trabalhamos">
              {quemSomos.publico.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-on-dark-20 px-3 py-1 text-md font-medium text-on-dark"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Revelar>
          <Revelar atraso={100}>
            <dl className="m-0 grid gap-0 border-t border-on-dark-20">
              {quemSomos.ficha.map((linha) => (
                <div key={linha.rotulo} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-on-dark-20 py-4">
                  <dt className="font-marca text-sm font-bold tracking-caps text-on-dark-55 uppercase">{linha.rotulo}</dt>
                  <dd className="m-0 text-landing-body font-medium text-on-dark">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>

        {/* Propósito, missão e visão: as três respostas que orientam a GovPro. */}
        <ol className="m-0 mt-16 grid list-none gap-0 border-t border-on-dark-20 p-0 lg:grid-cols-3">
          {quemSomos.essencia.map((item, indice) => (
            <li
              key={item.rotulo}
              className="border-b border-on-dark-20 lg:border-b-0 lg:px-10 lg:first:pl-0 lg:last:pr-0 lg:not-first:border-l"
            >
              <Revelar atraso={indice * 120} className="flex h-full flex-col gap-3 py-10">
                <span className={`h-1 w-12 rounded-full ${ACENTO[indice]}`} aria-hidden />
                <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark-65 uppercase">{item.rotulo}</p>
                <h3 className="m-0 font-display text-3xl font-extrabold text-balance text-on-dark">{item.titulo}</h3>
                <p className="m-0 text-landing-body text-pretty text-on-dark-65">{item.texto}</p>
              </Revelar>
            </li>
          ))}
        </ol>

        <ul className="m-0 mt-8 grid list-none gap-4 p-0 md:grid-cols-3">
          {quemSomos.pilares.map((pilar, indice) => (
            <li key={pilar.titulo}>
              <Revelar
                atraso={indice * 100}
                className="h-full rounded-card border border-on-dark-border bg-on-dark-fill p-7 lg:p-8"
              >
                <IconeDoItemQuadro icone={pilar.icone} tom="escuro" />
                <h3 className="m-0 mt-5 font-display text-xl font-bold text-on-dark">{pilar.titulo}</h3>
                <p className="m-0 mt-2 text-landing-body text-pretty text-on-dark-65">{pilar.texto}</p>
              </Revelar>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
