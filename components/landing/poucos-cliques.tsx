"use client"

import Image, { type StaticImageData } from "next/image"
import { useEffect, useRef, useState, type RefObject } from "react"

import ALVOS from "@/lib/landing/alvos-das-telas.json"
import telaAbertura from "@/public/landing/telas/abertura.webp"
import telaDemanda from "@/public/landing/telas/demanda.webp"
import telaEditor from "@/public/landing/telas/editor.webp"
import telaGeracao from "@/public/landing/telas/geracao.webp"
import telaProposta from "@/public/landing/telas/proposta.webp"

import { ALTURA_DO_CABECALHO, assinarRolagem, palcoPermitido, progressoDoTrilho } from "@/components/landing/rolagem"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconCheck } from "@/components/ui/icons"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { etapaDoProgresso, progressoDaEtapa, vooDoCursor } from "@/lib/landing/rolagem"

const { poucosCliques } = CONTEUDO
const { exemplo } = poucosCliques
const TOTAL = poucosCliques.etapas.length
const ULTIMA = TOTAL - 1

/**
 * Do processo ao documento em poucos cliques (§125). À esquerda, as cinco
 * etapas; à direita, uma janela do aplicativo desenhada em HTML, que mostra a
 * tela de cada uma e o cursor clicando.
 *
 * Em tela larga e com movimento, a seção cresce e prende o palco: a rolagem
 * avança as etapas. Nos demais casos, as etapas são botões. O servidor entrega a
 * última etapa à vista (sem JavaScript, mostra o documento gerado).
 */
export function PoucosCliques() {
  const secao = useRef<HTMLElement>(null)
  const trilho = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLSpanElement>(null)
  const [etapa, setEtapa] = useState(ULTIMA)
  const [palco, setPalco] = useState(false)
  const cursor = useRef<HTMLDivElement>(null)
  const [cliques, setCliques] = useState(0)

  useEffect(() => {
    const elemento = secao.current
    const percurso = trilho.current
    if (!elemento || !percurso) return
    // O estado muda num quadro, não no corpo do efeito: a primeira pintura é a do servidor.
    if (!palcoPermitido()) {
      const quadro = requestAnimationFrame(() => setEtapa(0))
      return () => cancelAnimationFrame(quadro)
    }
    elemento.dataset.movimento = "ativo"
    // O cursor anda com a rolagem: a posição sai do progresso a cada quadro,
    // e ele clica ao chegar ao botão, só rolando para a frente.
    let anterior: { etapa: number; emVoo: boolean } | null = null
    const desligar = assinarRolagem(() => {
      setPalco(true)
      const p = progressoDoTrilho(percurso)
      setEtapa(etapaDoProgresso(p, TOTAL))
      if (barra.current) barra.current.style.transform = `scaleY(${p})`
      const voo = vooDoCursor(p, ALVOS_DAS_ETAPAS, 0.5)
      if (cursor.current) cursor.current.style.transform = `translate(${voo.x}cqw, ${voo.y}cqh)`
      const chegou =
        anterior !== null && !voo.emVoo && voo.etapa >= anterior.etapa && (anterior.emVoo || voo.etapa !== anterior.etapa)
      anterior = voo
      if (chegou) setCliques((n) => n + 1)
    })
    return () => {
      desligar()
      delete elemento.dataset.movimento
    }
  }, [])

  const irPara = (alvo: number) => {
    const percurso = trilho.current
    if (!palco || !percurso) {
      setEtapa(alvo)
      return
    }
    const topo = percurso.getBoundingClientRect().top + window.scrollY - ALTURA_DO_CABECALHO
    const curso = percurso.offsetHeight - (window.innerHeight - ALTURA_DO_CABECALHO)
    window.scrollTo({ top: topo + curso * progressoDaEtapa(alvo, TOTAL), behavior: "smooth" })
  }

  return (
    <section
      ref={secao}
      id={poucosCliques.id}
      className="group/palco relative bg-ice py-16 lg:py-28"
    >
      {/* O trilho dá o percurso da rolagem; o palco fica preso logo abaixo do cabeçalho. */}
      <div ref={trilho} className="group-data-[movimento=ativo]/palco:h-[420svh]">
      <div className="group-data-[movimento=ativo]/palco:sticky group-data-[movimento=ativo]/palco:top-16 group-data-[movimento=ativo]/palco:flex group-data-[movimento=ativo]/palco:h-[calc(100svh-4rem)] group-data-[movimento=ativo]/palco:items-center">
        <div className="mx-auto grid w-full max-w-landing items-center gap-10 px-4 sm:px-6 lg:px-10 xl:px-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <TituloDeSecao rotulo={poucosCliques.rotulo} titulo={poucosCliques.titulo} texto={poucosCliques.texto} />
            <div className="relative mt-8">
              <span className="absolute top-2 bottom-2 left-[15px] w-0.5 rounded-full bg-border" aria-hidden />
              <span
                ref={barra}
                className="absolute top-2 bottom-2 left-[15px] hidden w-0.5 origin-top scale-y-0 rounded-full bg-royal group-data-[movimento=ativo]/palco:block"
                aria-hidden
              />
              <ol className="relative m-0 flex list-none flex-col gap-1 p-0" aria-label="Etapas do processo ao documento">
                {poucosCliques.etapas.map((item, i) => {
                  const atual = i === etapa
                  const feita = i < etapa
                  return (
                    <li key={item.titulo}>
                      <button
                        type="button"
                        onClick={() => irPara(i)}
                        aria-current={atual ? "step" : undefined}
                        className="group/etapa flex w-full cursor-pointer gap-4 rounded-md border-0 bg-transparent p-2 text-left"
                      >
                        <span
                          className={`relative flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold transition-colors duration-200 ${
                            atual || feita ? "bg-royal text-on-dark" : "border border-border bg-surface text-text-3"
                          }`}
                          aria-hidden
                        >
                          {feita ? <IconCheck size={14} strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="flex flex-col">
                          <span
                            className={`font-display text-lg font-bold transition-colors duration-200 ${atual ? "text-text-1" : "text-text-3"}`}
                          >
                            {item.titulo}
                          </span>
                          <span
                            className={`text-md text-pretty text-text-3 ${atual ? "" : "lg:hidden"} group-hover/etapa:block`}
                          >
                            {item.texto}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
            <p className="m-0 mt-6 text-sm text-text-muted">{exemplo.nota}</p>
          </div>

          <JanelaDoApp etapa={etapa} palco={palco} cliques={cliques} cursor={cursor} />
        </div>
      </div>
      </div>
    </section>
  )
}

/**
 * As telas reais do aplicativo, uma por etapa (§126), fotografadas por
 * `e2e/capturas-landing.spec.ts`. O mesmo gerador mede onde fica o botão que
 * cada etapa clica, em % da tela: é para lá que o cursor anda.
 */
const TELAS: { imagem: StaticImageData; alvo: { x: number; y: number } }[] = [
  { imagem: telaAbertura, alvo: ALVOS.abertura },
  { imagem: telaDemanda, alvo: ALVOS.demanda },
  { imagem: telaEditor, alvo: ALVOS.editor },
  { imagem: telaProposta, alvo: ALVOS.proposta },
  { imagem: telaGeracao, alvo: ALVOS.geracao },
]

const ALVOS_DAS_ETAPAS = TELAS.map((tela) => tela.alvo)

/**
 * A janela do aplicativo com a tela da etapa. Decorativa: o que ela mostra está
 * na lista de etapas. A cada etapa o cursor anda até o botão (700ms), aperta e o
 * clique fica marcado com um anel; a tela troca por opacidade.
 */
function JanelaDoApp({
  etapa,
  palco,
  cliques,
  cursor,
}: {
  etapa: number
  palco: boolean
  cliques: number
  cursor: RefObject<HTMLDivElement | null>
}) {
  const alvo = (TELAS[etapa] ?? TELAS[ULTIMA])?.alvo ?? { x: 50, y: 50 }

  return (
    <div aria-hidden data-etapa={etapa} className="relative overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex h-9 items-center gap-1.5 border-b border-border bg-border-soft px-3">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-3 truncate rounded-sm bg-surface px-3 py-0.5 font-mono text-xs text-text-muted">
          geradocs · {exemplo.processo}
        </span>
        <span className="ml-auto font-mono text-xs text-text-muted">
          {etapa + 1}/{TOTAL}
        </span>
      </div>
      <div className="relative aspect-[16/10]" style={{ containerType: "size" }}>
        {TELAS.map((tela, i) => (
          <Image
            key={i}
            src={tela.imagem}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className={`object-cover object-top transition-opacity duration-500 ease-landing ${i === etapa ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {/* A ponta da seta vai até o alvo, no centro do anel do clique.
            Sem palco, a camada de fora anda por transição a cada etapa; com o palco preso, a
            de dentro recebe a posição do voo a cada quadro de rolagem. */}
        <div
          className={`pointer-events-none absolute top-0 left-0 ${palco ? "" : "transition-transform duration-700 ease-landing"}`}
          style={palco ? undefined : { transform: `translate(${alvo.x}cqw, ${alvo.y}cqh)` }}
        >
          <div ref={cursor}>
            <span
              key={palco ? `clique-${cliques}` : `anel-${etapa}`}
              className="absolute -top-4 -left-4 size-8 animate-landing-clique rounded-full border-2 border-royal bg-royal/15"
              style={palco ? { animationDelay: "0ms" } : undefined}
            />
            <span
              key={palco ? `seta-${cliques}` : `seta-${etapa}`}
              className="block origin-top-left animate-landing-pressiona"
              style={palco ? { animationDelay: "0ms" } : undefined}
            >
              <svg width="20" height="24" viewBox="0 0 18 22" className="-translate-x-px -translate-y-px text-navy">
                <path
                  d="M1 1v17l4.5-4.2 3 6.7 3-1.4-3-6.6H15L1 1z"
                  fill="currentColor"
                  className="stroke-surface"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
