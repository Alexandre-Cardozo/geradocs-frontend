import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconCheck } from "@/components/ui/icons"
import { CONTEUDO } from "@/lib/landing/conteudo"

const ACENTO = ["border-t-royal", "border-t-petroleum", "border-t-marca-verde", "border-t-marca-amarelo"] as const

/** O que cada pessoa da contratação ganha (§125). */
export function Perfis() {
  const { perfis } = CONTEUDO
  return (
    <section id={perfis.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao titulo={perfis.titulo} centro />
        <ul className="m-0 mt-12 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {perfis.itens.map((perfil, indice) => (
            <li key={perfil.titulo}>
              <Revelar
                atraso={indice * 100}
                className={`h-full rounded-card border border-t-4 border-border bg-surface p-7 lg:p-8 ${ACENTO[indice]}`}
              >
                <p className="m-0 text-sm font-semibold tracking-caps text-text-muted uppercase">{perfil.rotulo}</p>
                <h3 className="m-0 mt-2 font-display text-xl font-bold text-text-1">{perfil.titulo}</h3>
                <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                  {perfil.lista.map((item) => (
                    <li key={item} className="flex gap-2 text-md text-pretty text-text-2">
                      <span className="mt-0.5 shrink-0 text-success" aria-hidden>
                        <IconCheck size={14} strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Revelar>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
