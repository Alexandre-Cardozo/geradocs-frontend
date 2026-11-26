"use client"

import { getImageProps, type StaticImageData } from "next/image"
import { Fragment, useEffect, useRef, type CSSProperties } from "react"

import arvoreDireitaAlto from "@/public/landing/abertura/alto/arvore-direita.webp"
import arvoreEsquerdaAlto from "@/public/landing/abertura/alto/arvore-esquerda.webp"
import ceuAlto from "@/public/landing/abertura/alto/ceu.webp"
import jardimAlto from "@/public/landing/abertura/alto/jardim.webp"
import sedeAlto from "@/public/landing/abertura/alto/sede.webp"
import arvoreDireitaLargo from "@/public/landing/abertura/largo/arvore-direita.webp"
import arvoreEsquerdaLargo from "@/public/landing/abertura/largo/arvore-esquerda.webp"
import ceuLargo from "@/public/landing/abertura/largo/ceu.webp"
import jardimLargo from "@/public/landing/abertura/largo/jardim.webp"
import sedeLargo from "@/public/landing/abertura/largo/sede.webp"
import arvoreDireitaMedio from "@/public/landing/abertura/medio/arvore-direita.webp"
import arvoreEsquerdaMedio from "@/public/landing/abertura/medio/arvore-esquerda.webp"
import ceuMedio from "@/public/landing/abertura/medio/ceu.webp"
import jardimMedio from "@/public/landing/abertura/medio/jardim.webp"
import sedeMedio from "@/public/landing/abertura/medio/sede.webp"

import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTEUDO } from "@/lib/landing/conteudo"
import {
  CAMADAS,
  PROFUNDIDADE_DO_TITULO,
  alvoDoPonteiro,
  aproximar,
  progressoDaRolagem,
  quadroDaRolagem,
  type NomeDaCamada,
} from "@/lib/landing/paralaxe"

/**
 * Três enquadramentos da mesma foto (§135): alto (9:16) para celular em pé, médio
 * (3:4) para tablet em pé e telas quase quadradas, largo (16:9) para o resto. A
 * primeira fonte que casa vence, por isso o alto vem antes.
 */
const MIDIA_ALTA = "(max-aspect-ratio: 2/3)"
const MIDIA_MEDIA = "(max-aspect-ratio: 6/5)"

/** Tamanho das fotos. Fixo aqui porque o teste importa a imagem como texto. */
const LARGO = { width: 1670, height: 939 }
const MEDIO = { width: 1085, height: 1447 }
const ALTO = { width: 941, height: 1673 }

const IMAGENS: Record<NomeDaCamada, { largo: StaticImageData; medio: StaticImageData; alto: StaticImageData }> = {
  ceu: { largo: ceuLargo, medio: ceuMedio, alto: ceuAlto },
  sede: { largo: sedeLargo, medio: sedeMedio, alto: sedeAlto },
  jardim: { largo: jardimLargo, medio: jardimMedio, alto: jardimAlto },
  arvoreEsquerda: { largo: arvoreEsquerdaLargo, medio: arvoreEsquerdaMedio, alto: arvoreEsquerdaAlto },
  arvoreDireita: { largo: arvoreDireitaLargo, medio: arvoreDireitaMedio, alto: arvoreDireitaAlto },
}

/**
 * De onde cada camada parte na entrada, e com que atraso (ms). Monta-se a maquete
 * de trás para a frente: o céu acende, a sede assenta, o jardim sobe e as árvores
 * se fecham dos lados.
 */
const ENTRADA: Record<NomeDaCamada, { estilo: Record<string, string>; atraso: number }> = {
  ceu: { estilo: { "--landing-escala-de": "1.06", "--landing-opacidade-de": "0" }, atraso: 0 },
  sede: { estilo: { "--landing-de": "3%", "--landing-opacidade-de": "0" }, atraso: 120 },
  jardim: { estilo: { "--landing-de": "8%", "--landing-opacidade-de": "0" }, atraso: 220 },
  arvoreEsquerda: { estilo: { "--landing-escala-de": "1.15", "--landing-opacidade-de": "0" }, atraso: 320 },
  arvoreDireita: { estilo: { "--landing-escala-de": "1.15", "--landing-opacidade-de": "0" }, atraso: 320 },
}

/**
 * De onde cada camada cresce ao rolar. As árvores crescem a partir do pé, na
 * borda da tela e na linha do chão de cada enquadramento (85% no largo, 70% no
 * médio, 67% no alto): o tronco fica preso ao chão e a copa avança sobre a cena.
 * As outras crescem a partir do centro.
 */
const ORIGEM: Partial<Record<NomeDaCamada, string>> = {
  arvoreEsquerda:
    "origin-[0%_85%] [@media(min-aspect-ratio:2/3)_and_(max-aspect-ratio:6/5)]:origin-[0%_70%] [@media(max-aspect-ratio:2/3)]:origin-[0%_67%]",
  arvoreDireita:
    "origin-[100%_85%] [@media(min-aspect-ratio:2/3)_and_(max-aspect-ratio:6/5)]:origin-[100%_70%] [@media(max-aspect-ratio:2/3)]:origin-[100%_67%]",
}

function Camada({ nome, alt }: { nome: NomeDaCamada; alt: string }) {
  const { largo, medio, alto } = IMAGENS[nome]
  const comum = { alt, sizes: "100vw", loading: "eager" as const, fetchPriority: "high" as const }
  const fonteAlta = getImageProps({ ...comum, ...ALTO, src: alto }).props
  const fonteMedia = getImageProps({ ...comum, ...MEDIO, src: medio }).props
  const { srcSet, ...img } = getImageProps({ ...comum, ...LARGO, src: largo }).props
  const { estilo, atraso } = ENTRADA[nome]

  const imagem = (
    <picture>
      <source media={MIDIA_ALTA} srcSet={fonteAlta.srcSet ?? fonteAlta.src} />
      <source media={MIDIA_MEDIA} srcSet={fonteMedia.srcSet ?? fonteMedia.src} />
      {/* `<picture>` com vários enquadramentos é o caso que o next/image deixa para getImageProps. */}
      <img
        {...img}
        srcSet={srcSet}
        alt={alt}
        className="absolute inset-0 size-full max-w-none object-cover select-none"
        draggable={false}
      />
    </picture>
  )

  return (
    <div data-camada={nome} className={`absolute inset-0 will-change-transform ${ORIGEM[nome] ?? ""}`}>
      <div data-ponteiro className="absolute -inset-[3%] will-change-transform">
        <div
          className="absolute inset-0 animate-landing-camada"
          style={{ ...estilo, animationDelay: `${atraso}ms` } as CSSProperties}
        >
          {imagem}
        </div>
      </div>
    </div>
  )
}

/**
 * Abertura da landing (§124, §135, §136): a foto da sede da GovPro fatiada em
 * camadas (céu, sede, jardim e as árvores de cada lateral) que se movem em
 * profundidades diferentes. Rolar aproxima a câmera e traz o manifesto; o mouse
 * desloca as camadas de leve.
 *
 * O servidor entrega a cena parada, com a altura da tela e o manifesto no fluxo
 * (sem JavaScript, tudo aparece). O palco de 270svh só nasce quando o componente
 * monta e marca `data-movimento="ativo"`. A cada quadro o efeito escreve
 * `transform` e `opacity` direto nos elementos: nenhum estado do React, nenhuma
 * renderização por rolagem.
 */
export function Abertura() {
  const ref = useRef<HTMLElement>(null)
  const { abertura } = CONTEUDO

  useEffect(() => {
    const secao = ref.current
    if (!secao) return
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    secao.dataset.movimento = "ativo"

    const camadas = CAMADAS.map((c) => ({
      ...c,
      rolagem: secao.querySelector<HTMLElement>(`[data-camada="${c.nome}"]`),
      ponteiro: secao.querySelector<HTMLElement>(`[data-camada="${c.nome}"] [data-ponteiro]`),
    }))
    const titulo = secao.querySelector<HTMLElement>("[data-titulo]")
    const tituloPonteiro = secao.querySelector<HTMLElement>("[data-titulo] [data-ponteiro]")
    const seta = secao.querySelector<HTMLElement>("[data-seta]")
    const veu = secao.querySelector<HTMLElement>("[data-veu]")
    const manifesto = secao.querySelector<HTMLElement>("[data-manifesto]")

    let quadroDaRolagemPedido = 0
    const desenharRolagem = () => {
      quadroDaRolagemPedido = 0
      const caixa = secao.getBoundingClientRect()
      const q = quadroDaRolagem(progressoDaRolagem(caixa.top, caixa.height, window.innerHeight), {
        movimento: !reduzido,
      })
      for (const c of camadas) {
        const { escala, subida } = q.camadas[c.nome]
        if (c.rolagem) c.rolagem.style.transform = `translate3d(0, ${subida}%, 0) scale(${escala})`
      }
      if (titulo) {
        titulo.style.transform = `translate3d(0, ${q.titulo.subida}%, 0)`
        titulo.style.opacity = String(q.titulo.opacidade)
      }
      if (seta) seta.style.opacity = String(q.seta)
      if (veu) veu.style.opacity = String(q.veu)
      if (manifesto) {
        manifesto.style.opacity = String(q.manifesto.opacidade)
        manifesto.style.transform = `translate3d(0, ${q.manifesto.deslocamento}px, 0)`
      }
    }
    const pedirRolagem = () => {
      if (!quadroDaRolagemPedido) quadroDaRolagemPedido = requestAnimationFrame(desenharRolagem)
    }
    pedirRolagem()
    window.addEventListener("scroll", pedirRolagem, { passive: true })
    window.addEventListener("resize", pedirRolagem)

    // Ponteiro: só com mouse e sem movimento reduzido. O laço roda enquanto
    // alguma camada ainda não chegou ao alvo e para sozinho depois.
    const comMouse = window.matchMedia?.("(pointer: fine)").matches ?? false
    const alvo = { x: 0, y: 0 }
    const atual = { x: 0, y: 0 }
    let quadroDoPonteiro = 0
    const desenharPonteiro = () => {
      atual.x = aproximar(atual.x, alvo.x)
      atual.y = aproximar(atual.y, alvo.y)
      for (const c of camadas) {
        const d = alvoDoPonteiro(atual.x, atual.y, c.profundidade)
        if (c.ponteiro) c.ponteiro.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`
      }
      if (tituloPonteiro) {
        const d = alvoDoPonteiro(atual.x, atual.y, PROFUNDIDADE_DO_TITULO)
        tituloPonteiro.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`
      }
      quadroDoPonteiro = atual.x === alvo.x && atual.y === alvo.y ? 0 : requestAnimationFrame(desenharPonteiro)
    }
    const mirar = (x: number, y: number) => {
      alvo.x = x
      alvo.y = y
      if (!quadroDoPonteiro) quadroDoPonteiro = requestAnimationFrame(desenharPonteiro)
    }
    const aoMover = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      mirar((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    const aoSair = () => mirar(0, 0)
    const ponteiroAtivo = comMouse && !reduzido
    if (ponteiroAtivo) {
      secao.addEventListener("pointermove", aoMover)
      secao.addEventListener("pointerleave", aoSair)
    }

    return () => {
      cancelAnimationFrame(quadroDaRolagemPedido)
      cancelAnimationFrame(quadroDoPonteiro)
      window.removeEventListener("scroll", pedirRolagem)
      window.removeEventListener("resize", pedirRolagem)
      secao.removeEventListener("pointermove", aoMover)
      secao.removeEventListener("pointerleave", aoSair)
    }
  }, [])

  return (
    <section
      ref={ref}
      aria-label="GovPro"
      className="group/abertura relative -mt-[calc(4rem+1px)] bg-navy data-[movimento=ativo]:h-[270svh]"
    >
      <div className="relative h-svh overflow-hidden bg-navy group-data-[movimento=ativo]/abertura:sticky group-data-[movimento=ativo]/abertura:top-0">
        <Camada nome="ceu" alt="" />

        <div data-titulo className="pointer-events-none absolute inset-0 z-10">
          <div
            data-ponteiro
            className="flex flex-col items-center px-4 pt-[clamp(5.75rem,13vh,9rem)] text-center sm:px-6"
          >
            <p
              className="m-0 animate-landing-entrada font-marca text-sm font-bold tracking-slogan text-on-dark uppercase text-shadow-md text-shadow-navy/40"
              style={{ animationDelay: "600ms" }}
            >
              GovPro
            </p>
            <h1 className="m-0 mt-3 max-w-[15ch] font-display text-landing-abertura font-extrabold text-balance text-on-dark text-shadow-lg text-shadow-navy/45">
              {/* O espaço entre as linhas fica fora delas, para o nome do título não colar as palavras. */}
              {abertura.titulo.map((linha, i) => (
                <Fragment key={linha}>
                  {i > 0 && " "}
                  <span className="block animate-landing-entrada" style={{ animationDelay: `${650 + i * 120}ms` }}>
                    {linha}
                  </span>
                </Fragment>
              ))}
            </h1>
            <p
              className="m-0 mt-4 max-w-[40ch] animate-landing-entrada text-landing-lead font-medium text-balance text-on-dark text-shadow-md text-shadow-navy/55"
              style={{ animationDelay: "900ms" }}
            >
              {abertura.frase}
            </p>
          </div>
        </div>

        {/* O título fica atrás da sede: ao rolar, o prédio sobe por cima dele (§136). */}
        <Camada nome="sede" alt={abertura.altSede} />
        <Camada nome="jardim" alt="" />
        <Camada nome="arvoreEsquerda" alt="" />
        <Camada nome="arvoreDireita" alt="" />

        {/* Escurece o alto para o cabeçalho e o título, e a cena inteira antes do manifesto. */}
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-navy/50 via-navy/15 via-25% to-transparent to-45%"
          aria-hidden
        />
        <div data-veu className="pointer-events-none absolute inset-0 z-10 bg-navy opacity-0" aria-hidden />

        <div
          data-seta
          aria-hidden
          className="pointer-events-none absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center group-not-data-[movimento=ativo]/abertura:hidden"
        >
          <span className="h-10 w-px origin-top animate-landing-gota bg-linear-to-b from-on-dark to-transparent" />
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="-mt-1 text-on-dark">
            <path d="M1 1l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Manifesto: no fluxo sem JavaScript; com o palco ativo, preso no centro da tela. */}
      <div className="z-20 bg-navy group-data-[movimento=ativo]/abertura:pointer-events-none group-data-[movimento=ativo]/abertura:absolute group-data-[movimento=ativo]/abertura:inset-0 group-data-[movimento=ativo]/abertura:bg-transparent">
        <div className="grid place-items-center px-4 py-20 text-center sm:px-6 group-data-[movimento=ativo]/abertura:sticky group-data-[movimento=ativo]/abertura:top-0 group-data-[movimento=ativo]/abertura:h-svh group-data-[movimento=ativo]/abertura:py-0">
          {/* A primeira frase de valor da página: branca e grande, com o destaque na cor da marca. */}
          <p
            data-manifesto
            className="m-0 flex max-w-[26ch] flex-col items-center gap-5 font-display text-landing-manifesto font-extrabold text-balance text-on-dark text-shadow-lg text-shadow-navy/60 group-data-[movimento=ativo]/abertura:opacity-0"
          >
            <span>{abertura.manifesto.inicio}</span>
            <span className="text-marca-amarelo">{abertura.manifesto.destaque}</span>
            <span className="mt-2 flex flex-col items-center gap-4 font-body text-landing-lead font-semibold text-on-dark text-shadow-none">
              <FaixaDaMarca className="w-28" />
              {abertura.manifesto.valor}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
