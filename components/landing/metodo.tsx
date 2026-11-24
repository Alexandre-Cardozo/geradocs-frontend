"use client"

import { useEffect, useRef } from "react"

import { Revelar } from "@/components/landing/revelar"
import { assinarRolagem, movimentoReduzido } from "@/components/landing/rolagem"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { trecho } from "@/lib/landing/paralaxe"
import { progressoDaPassagem } from "@/lib/landing/rolagem"

/**
 * Como a GovPro trabalha, em seis passos numa linha do tempo (§125). A linha se
 * preenche conforme a rolagem; sem JavaScript ou com movimento reduzido, ela já
 * vem cheia.
 */
export function Metodo() {
  const { metodo } = CONTEUDO
  const linha = useRef<HTMLSpanElement>(null)
  const lista = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const barra = linha.current
    const elemento = lista.current
    if (!barra || !elemento || movimentoReduzido()) return
    return assinarRolagem(() => {
      const caixa = elemento.getBoundingClientRect()
      const p = progressoDaPassagem(caixa.top, caixa.height, window.innerHeight)
      barra.style.transform = `scaleY(${trecho(p, 0.2, 0.75)})`
    })
  }, [])

  return (
    <section id={metodo.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto grid max-w-landing gap-12 px-4 sm:px-6 lg:px-10 xl:px-14 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <TituloDeSecao rotulo={metodo.rotulo} titulo={metodo.titulo} />
          <Revelar className="rounded-card border-l-4 border-royal bg-tint-royal-bg p-7 lg:p-8">
            <p className="m-0 font-display text-lg font-bold text-text-1">{metodo.integracao.titulo}</p>
            <p className="m-0 mt-2 text-landing-body text-pretty text-text-2">{metodo.integracao.texto}</p>
          </Revelar>
        </div>

        <div className="relative">
          <span className="absolute top-4 bottom-4 left-[19px] w-0.5 rounded-full bg-border" aria-hidden />
          <span ref={linha} className="absolute top-4 bottom-4 left-[19px] w-0.5 origin-top rounded-full bg-royal" aria-hidden />
          <ol ref={lista} className="relative m-0 flex list-none flex-col gap-8 p-0">
            {metodo.passos.map((passo, indice) => (
              <li key={passo.titulo}>
                <Revelar className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="flex size-10 items-center justify-center rounded-full border-2 border-royal bg-surface font-mono text-md font-bold text-royal">
                    {indice + 1}
                  </span>
                  <span className="pt-1.5">
                    <h3 className="m-0 font-display text-xl font-bold text-text-1">{passo.titulo}</h3>
                    <p className="m-0 mt-1 text-landing-body text-pretty text-text-3">{passo.texto}</p>
                  </span>
                </Revelar>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
