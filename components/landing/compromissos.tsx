import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Os sete compromissos e o que a GovPro não promete (§125). */
export function Compromissos() {
  const { compromissos } = CONTEUDO
  return (
    <section id={compromissos.id} className="bg-ice py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao rotulo={compromissos.rotulo} titulo={compromissos.titulo} />
        <ol className="m-0 mt-12 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {compromissos.itens.map((item, indice) => (
            <li key={item.titulo}>
              <Revelar atraso={(indice % 4) * 80} className="h-full rounded-card border border-border bg-surface p-6 lg:p-7">
                <span className="font-mono text-md font-bold text-royal">{String(indice + 1).padStart(2, "0")}</span>
                <h3 className="m-0 mt-2 font-display text-lg font-bold text-text-1">{item.titulo}</h3>
                <p className="m-0 mt-1 text-md text-pretty text-text-3">{item.texto}</p>
              </Revelar>
            </li>
          ))}
          <li>
            <Revelar atraso={240} className="on-dark h-full rounded-card bg-navy p-6 lg:p-7">
              <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark-65 uppercase">
                {compromissos.naoPrometemos.titulo}
              </p>
              <p className="m-0 mt-3 text-md text-pretty text-on-dark">{compromissos.naoPrometemos.texto}</p>
            </Revelar>
          </li>
        </ol>
      </div>
    </section>
  )
}
