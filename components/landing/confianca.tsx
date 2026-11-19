import type { ComponentType } from "react"

import { Revelar } from "@/components/landing/revelar"
import { IconBuilding, IconClipboardList, IconLock, IconScale, IconSettings } from "@/components/ui/icons"
import { CONTEUDO, type IconeDaConfianca } from "@/lib/landing/conteudo"

/** Um ícone por item. O `Record` sobre a união garante que nenhum item fique sem ícone. */
const ICONES: Record<IconeDaConfianca, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  auditoria: IconClipboardList,
  lgpd: IconLock,
  teto: IconSettings,
  fundamento: IconScale,
  entidade: IconBuilding,
}

export function Confianca() {
  const { confianca } = CONTEUDO
  return (
    <section id={confianca.id} className="scroll-mt-20 bg-ice py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {confianca.titulo}
          </h2>
        </Revelar>
        <ul className="m-0 mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {confianca.itens.map((item, indice) => {
            const Icone = ICONES[item.icone]
            return (
              <li key={item.titulo}>
                <Revelar atraso={indice * 100} className="h-full rounded-card border border-border bg-surface p-6">
                  <span className="flex size-10 items-center justify-center rounded-md bg-tint-royal-bg text-royal" aria-hidden>
                    <Icone size={20} />
                  </span>
                  <h3 className="m-0 mt-4 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
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
