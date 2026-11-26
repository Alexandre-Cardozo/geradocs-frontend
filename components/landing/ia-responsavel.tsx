import type { ComponentType } from "react"

import revisaoIa from "@/public/landing/telas/revisao-ia.webp"

import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconCheckCircle, IconLock, IconMessageCircle, IconPencil, IconSparkles, IconUser } from "@/components/ui/icons"
import { CONTEUDO, type IconeDaIa } from "@/lib/landing/conteudo"
import { GovBo } from "@/components/mascotes/mascotes"

/** Ícone e cor de cada garantia: cada uma fala de um cuidado diferente, e o desenho diz isso. */
const VISUAL: Record<IconeDaIa, { Icone: ComponentType<{ size?: number }>; tom: string }> = {
  proposta: { Icone: IconSparkles, tom: "bg-tint-violet-bg text-tint-violet-fg" },
  conferida: { Icone: IconCheckCircle, tom: "bg-tint-success-bg text-tint-success-fg" },
  revisao: { Icone: IconPencil, tom: "bg-tint-royal-bg text-royal" },
  lgpd: { Icone: IconLock, tom: "bg-doc-tr-bg text-doc-tr" },
  orientacao: { Icone: IconMessageCircle, tom: "bg-doc-mapa-bg text-doc-mapa" },
  opcional: { Icone: IconUser, tom: "bg-doc-edital-bg text-doc-edital" },
}

/** As seis garantias da IA, ao lado da captura da proposta (§125). */
export function IaResponsavel() {
  const { ia } = CONTEUDO
  return (
    <section id={ia.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto grid max-w-landing items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:gap-16 lg:px-10 xl:px-14">
        <div className="relative lg:sticky lg:top-28">
          {/* O GovBô é a identidade da IA (§127): pensa junto do título. */}
          <GovBo expressao="pensativo" className="absolute -top-4 right-0 hidden size-28 sm:block xl:size-32" />
          <TituloDeSecao rotulo={ia.rotulo} titulo={ia.titulo} texto={ia.texto} className="sm:pr-32" />
          <Revelar className="mt-8 rounded-card bg-tint-violet-bg p-3 sm:p-4">
            <MolduraDeTela src={revisaoIa} alt={ia.altCaptura} />
            <p className="m-0 mt-3 flex items-center gap-2 px-1 text-md font-semibold text-tint-violet-fg">
              <IconSparkles size={16} />
              {ia.legendaCaptura}
            </p>
          </Revelar>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {ia.garantias.map((item, indice) => {
            const { Icone, tom } = VISUAL[item.icone]
            return (
              <li key={item.titulo}>
                <Revelar
                  atraso={(indice % 2) * 100}
                  className="relative h-full rounded-card border border-border bg-surface p-7 transition-[border-color,transform] duration-200 ease-landing hover:-translate-y-1 hover:border-tint-royal-border lg:p-8"
                >
                  <span className="absolute top-7 right-7 font-mono text-md font-bold text-text-faint lg:top-8 lg:right-8" aria-hidden>
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <span className={`flex size-12 items-center justify-center rounded-card ${tom}`} aria-hidden>
                    <Icone size={22} />
                  </span>
                  <h3 className="m-0 mt-6 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                  <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{item.texto}</p>
                </Revelar>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
