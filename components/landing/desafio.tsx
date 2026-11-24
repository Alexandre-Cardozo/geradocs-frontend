import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** O que se perde quando o planejamento atrasa, e a frase que leva ao GeraDocs (§125). */
export function Desafio() {
  const { desafio } = CONTEUDO
  return (
    <section id={desafio.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto grid max-w-landing gap-12 px-4 sm:px-6 lg:px-10 xl:px-14 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <TituloDeSecao rotulo={desafio.rotulo} titulo={desafio.titulo} texto={desafio.texto} />
          <Revelar className="rounded-card border-l-4 border-marca-verde bg-tint-success-bg p-7 lg:p-8">
            <p className="m-0 font-display text-lg font-bold text-tint-success-fg">{desafio.destaque.titulo}</p>
            <p className="m-0 mt-2 text-landing-body text-pretty text-text-2">{desafio.destaque.texto}</p>
          </Revelar>
        </div>

        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {desafio.itens.map((item, indice) => (
            <li key={item.titulo}>
              <Revelar atraso={(indice % 2) * 100} className="h-full rounded-card border border-border bg-surface p-7 lg:p-8">
                <span className="font-mono text-md font-bold text-royal">{String(indice + 1).padStart(2, "0")}</span>
                <h3 className="m-0 mt-3 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{item.texto}</p>
              </Revelar>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
