"use client"

import { getImageProps, type StaticImageData } from "next/image"
import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from "react"

import ceuAlto from "@/public/landing/abertura/alto/ceu.webp"
import edificioAlto from "@/public/landing/abertura/alto/edificio.webp"
import frenteAlto from "@/public/landing/abertura/alto/frente.webp"
import meioAlto from "@/public/landing/abertura/alto/meio.webp"
import nuvensAlto from "@/public/landing/abertura/alto/nuvens.webp"
import ceuLargo from "@/public/landing/abertura/largo/ceu.webp"
import edificioLargo from "@/public/landing/abertura/largo/edificio.webp"
import frenteLargo from "@/public/landing/abertura/largo/frente.webp"
import meioLargo from "@/public/landing/abertura/largo/meio.webp"
import nuvensLargo from "@/public/landing/abertura/largo/nuvens.webp"

import { GovBo, GovPri } from "@/components/mascotes/mascotes"
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

/** Enquadramento alto para tela em pé (até 4:5); largo para o resto. */
const MIDIA_ALTA = "(max-aspect-ratio: 4/5)"

/** Tamanho das renderizações. Fixo aqui porque o teste importa a imagem como texto. */
const LARGO = { width: 2400, height: 1350 }
const ALTO = { width: 1080, height: 1920 }

const IMAGENS: Record<NomeDaCamada, { largo: StaticImageData; alto: StaticImageData }> = {
  ceu: { largo: ceuLargo, alto: ceuAlto },
  nuvens: { largo: nuvensLargo, alto: nuvensAlto },
  edificio: { largo: edificioLargo, alto: edificioAlto },
  meio: { largo: meioLargo, alto: meioAlto },
  frente: { largo: frenteLargo, alto: frenteAlto },
}

/** De onde cada camada parte na entrada, e com que atraso (ms). */
const ENTRADA: Record<NomeDaCamada, { estilo: Record<string, string>; atraso: number }> = {
  ceu: { estilo: { "--landing-escala-de": "1.08", "--landing-opacidade-de": "0" }, atraso: 0 },
  nuvens: { estilo: { "--landing-de": "2%", "--landing-opacidade-de": "0" }, atraso: 50 },
  edificio: { estilo: { "--landing-de": "7%", "--landing-opacidade-de": "0" }, atraso: 150 },
  meio: { estilo: { "--landing-de": "12%" }, atraso: 250 },
  frente: { estilo: { "--landing-de": "18%" }, atraso: 300 },
}

function Camada({ nome, alt, children }: { nome: NomeDaCamada; alt: string; children?: ReactNode }) {
  const { largo, alto } = IMAGENS[nome]
  const comum = { alt, sizes: "100vw", loading: "eager" as const, fetchPriority: "high" as const }
  const fonteAlta = getImageProps({ ...comum, ...ALTO, src: alto }).props
  const { srcSet, ...img } = getImageProps({ ...comum, ...LARGO, src: largo }).props
  const { estilo, atraso } = ENTRADA[nome]

  const imagem = (
    <picture>
      <source media={MIDIA_ALTA} srcSet={fonteAlta.srcSet ?? fonteAlta.src} />
      {/* `<picture>` com dois enquadramentos é o caso que o next/image deixa para getImageProps. */}
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
    <div data-camada={nome} className="absolute inset-0 will-change-transform">
      <div data-ponteiro className="absolute -inset-[3%] will-change-transform">
        <div
          className="absolute inset-0 animate-landing-camada"
          style={{ ...estilo, animationDelay: `${atraso}ms` } as CSSProperties}
        >
          {nome === "nuvens" ? <div className="absolute inset-0 animate-landing-deriva">{imagem}</div> : imagem}
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Abertura da landing (§124): a sede da GovPro em cinco camadas que se movem em
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
        <Camada nome="nuvens" alt="" />

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

        <Camada nome="edificio" alt={abertura.altSede} />
        <Camada nome="meio" alt="" />
        <Camada nome="frente" alt="">
          {/* Os mascotes (§127) no gramado, na camada da frente: andam com a paralaxe da cena. A escala é de
              primeiro plano: a GovPri com a cabeça na linha do térreo da sede, o GovBô com uns 40% da altura dela. */}
          <GovPri
            corpo="inteiro"
            expressao="alegre"
            acao="acenar"
            manter
            className="absolute bottom-[3%] left-[14%] aspect-[480/910] h-[26%] portrait:bottom-[9%] portrait:left-[7%] portrait:h-[16%]"
          />
          <GovBo
            expressao="alegre"
            acao="pular"
            repetir
            className="absolute right-[16%] bottom-[14%] aspect-[320/340] h-[11%] portrait:right-[9%] portrait:bottom-[19%] portrait:h-[7%]"
          />
        </Camada>

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
