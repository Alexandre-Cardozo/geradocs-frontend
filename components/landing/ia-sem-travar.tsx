import propostaIa from "@/public/landing/proposta-ia.png"

import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/** Quatro pontos sobre o papel da IA, ao lado da captura da proposta. */
export function IaSemTravar() {
  const { ia } = CONTEUDO
  return (
    <section id={ia.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto grid max-w-landing items-start gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14">
        <div>
          <Revelar>
            <h2 className="m-0 font-display text-landing-h2 font-extrabold text-balance text-text-1">{ia.titulo}</h2>
          </Revelar>
          <ul className="m-0 mt-8 flex list-none flex-col gap-6 p-0">
            {ia.itens.map((item, indice) => (
              <li key={item.titulo}>
                <Revelar atraso={indice * 100}>
                  <h3 className="m-0 font-display text-xl font-bold text-text-1">{item.titulo}</h3>
                  <p className="m-0 mt-1 text-landing-body text-pretty text-text-3">{item.texto}</p>
                </Revelar>
              </li>
            ))}
          </ul>
        </div>
        <Revelar>
          <MolduraDeTela src={propostaIa} alt={ia.altCaptura} />
        </Revelar>
      </div>
    </section>
  )
}
