import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Três cards sobre o que o fluxo guiado resolve. `scroll-mt-20` compensa o cabeçalho fixo (64px). */
export function Problema() {
  const { problema } = CONTEUDO
  return (
    <section id={problema.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {problema.titulo}
          </h2>
        </Revelar>
        <ul className="m-0 mt-10 grid list-none gap-4 p-0 md:grid-cols-3">
          {problema.itens.map((item, indice) => (
            <li key={item.titulo}>
              <Revelar atraso={indice * 100} className="h-full rounded-card border border-border bg-surface p-6">
                <h3 className="m-0 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{item.texto}</p>
              </Revelar>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
