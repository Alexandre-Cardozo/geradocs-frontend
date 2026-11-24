import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Os dez valores da GovPro, cada um com a sua prova prática (§125). */
export function Valores() {
  const { valores } = CONTEUDO
  return (
    <section id={valores.id} className="on-dark relative overflow-hidden bg-navy py-16 lg:py-28">
      <div className="pointer-events-none absolute inset-0 landing-grade" aria-hidden />
      <div className="relative mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao tom="escuro" rotulo={valores.rotulo} titulo={valores.titulo} texto={valores.texto} />
        <ol className="m-0 mt-12 grid list-none gap-x-10 p-0 md:grid-cols-2">
          {valores.itens.map((valor, indice) => (
            <li key={valor.titulo} className="border-t border-on-dark-20">
              <Revelar atraso={(indice % 2) * 100} className="grid grid-cols-[3rem_1fr] gap-x-4 py-6">
                <span className="font-mono text-lg font-bold text-electric">{String(indice + 1).padStart(2, "0")}</span>
                <span>
                  <h3 className="m-0 font-display text-xl font-bold text-on-dark">{valor.titulo}</h3>
                  <p className="m-0 mt-2 text-landing-body text-pretty text-on-dark-65">
                    <span className="font-semibold text-on-dark">Na prática: </span>
                    {valor.pratica}
                  </p>
                </span>
              </Revelar>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
