"use client"

import { useEffect, useRef } from "react"

import { Folha, FolhaExtra } from "@/components/landing/folha"
import { assinarRolagem, palcoPermitido, progressoDoTrilho } from "@/components/landing/rolagem"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { DOCUMENTOS_DA_VITRINE, EXTRAS_DA_VITRINE } from "@/lib/landing/documentos"
import { deslocamentoDaFaixa } from "@/lib/landing/rolagem"

/** Os sete tipos e o que mais a plataforma gera: a juntada e a errata. */
const TOTAL = DOCUMENTOS_DA_VITRINE.length + EXTRAS_DA_VITRINE.length

/**
 * Os sete documentos que o GeraDocs gera, como folhas (§125). Em tela larga e
 * com movimento, o palco fica preso e a rolagem desliza a faixa na horizontal.
 * Nos demais casos, e sem JavaScript, a faixa tem rolagem horizontal própria,
 * com encaixe, e pode ser rolada pelo teclado.
 */
export function VitrineDeDocumentos() {
  const { documentos } = CONTEUDO
  const secao = useRef<HTMLElement>(null)
  const percurso = useRef<HTMLDivElement>(null)
  const faixa = useRef<HTMLOListElement>(null)
  const contador = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const elemento = secao.current
    const curso = percurso.current
    const trilho = faixa.current
    if (!elemento || !curso || !trilho || !palcoPermitido()) return
    elemento.dataset.movimento = "ativo"
    const total = TOTAL
    const desligar = assinarRolagem(() => {
      const p = progressoDoTrilho(curso)
      trilho.style.transform = `translate3d(${deslocamentoDaFaixa(p, trilho.scrollWidth, window.innerWidth)}px, 0, 0)`
      if (contador.current) contador.current.textContent = String(Math.min(total, Math.floor(p * total) + 1)).padStart(2, "0")
    })
    return () => {
      desligar()
      trilho.style.transform = ""
      delete elemento.dataset.movimento
    }
  }, [])

  return (
    <section
      ref={secao}
      id={documentos.id}
      className="group/vitrine on-dark relative bg-navy py-16 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 landing-grade" aria-hidden />
      {/* O trilho dá o percurso da rolagem; o palco fica preso logo abaixo do cabeçalho. */}
      <div ref={percurso} className="relative group-data-[movimento=ativo]/vitrine:h-[440svh]">
      <div className="relative overflow-hidden group-data-[movimento=ativo]/vitrine:sticky group-data-[movimento=ativo]/vitrine:top-16 group-data-[movimento=ativo]/vitrine:flex group-data-[movimento=ativo]/vitrine:h-[calc(100svh-4rem)] group-data-[movimento=ativo]/vitrine:flex-col group-data-[movimento=ativo]/vitrine:justify-center group-data-[movimento=ativo]/vitrine:py-6">
        <div className="relative mx-auto flex w-full max-w-landing flex-wrap items-end justify-between gap-6 px-4 sm:px-6 lg:px-10 xl:px-14">
          <TituloDeSecao tom="escuro" rotulo={documentos.rotulo} titulo={documentos.titulo} texto={documentos.texto} />
          <p className="m-0 hidden font-mono text-lg text-on-dark-65 group-data-[movimento=ativo]/vitrine:block" aria-hidden>
            <span ref={contador} className="text-on-dark">
              01
            </span>{" "}
            / {String(TOTAL).padStart(2, "0")}
          </p>
        </div>

        {/* Sem o palco, a faixa rola sozinha; com ele, quem a move é a rolagem da página. */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Documentos gerados pelo GeraDocs"
          className="relative mt-10 snap-x snap-mandatory overflow-x-auto pb-4 outline-none group-data-[movimento=ativo]/vitrine:overflow-visible lg:mt-8"
        >
          <ol
            ref={faixa}
            className="m-0 flex w-max list-none gap-6 p-0 px-4 will-change-transform sm:px-6 lg:gap-8 lg:px-[max(2.5rem,calc((100vw-var(--container-landing))/2+2.5rem))] xl:px-[max(3.5rem,calc((100vw-var(--container-landing))/2+3.5rem))]"
          >
            {DOCUMENTOS_DA_VITRINE.map((documento, indice) => (
              <li key={documento.tipo} className="w-64 shrink-0 snap-start sm:w-72 lg:w-[min(14rem,23svh)] xl:w-[min(15rem,24svh)] 2xl:w-[min(17rem,25svh)]">
                <figure className="group/folha m-0">
                  <div className="transition-transform duration-300 ease-landing group-hover/folha:-translate-y-2 group-hover/folha:-rotate-1">
                    <Folha documento={documento} />
                  </div>
                  <figcaption className="mt-5">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-electric">{String(indice + 1).padStart(2, "0")}</span>
                      <span className="text-sm font-semibold text-on-dark-55">{documento.formato}</span>
                    </span>
                    <span className="mt-1 block font-display text-xl font-bold text-on-dark">{documento.titulo}</span>
                    <span className="mt-0.5 block font-mono text-sm text-on-dark-65">{documento.fundamento}</span>
                    <span className="mt-2 block text-md text-pretty text-on-dark-65">{documento.entrega}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
            {EXTRAS_DA_VITRINE.map((extra, indice) => (
              <li key={extra.id} className="w-64 shrink-0 snap-start sm:w-72 lg:w-[min(14rem,23svh)] xl:w-[min(15rem,24svh)] 2xl:w-[min(17rem,25svh)]">
                <figure className="group/folha m-0">
                  <div className="transition-transform duration-300 ease-landing group-hover/folha:-translate-y-2 group-hover/folha:-rotate-1">
                    <FolhaExtra extra={extra} />
                  </div>
                  <figcaption className="mt-5">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-electric">
                        {String(DOCUMENTOS_DA_VITRINE.length + indice + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold text-on-dark-55">{extra.formato}</span>
                    </span>
                    <span className="mt-1 block font-display text-xl font-bold text-on-dark">{extra.titulo}</span>
                    <span className="mt-0.5 block font-mono text-sm text-on-dark-65">{extra.fundamento}</span>
                    <span className="mt-2 block text-md text-pretty text-on-dark-65">{extra.entrega}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </div>
      </div>
      </div>
      {/* A nota fica fora do palco preso: aparece quando a faixa termina. */}
      <p className="relative mx-auto mt-8 mb-0 w-full max-w-landing px-4 text-md text-on-dark-55 sm:px-6 lg:px-10 xl:px-14">
        {documentos.nota}
      </p>
    </section>
  )
}
