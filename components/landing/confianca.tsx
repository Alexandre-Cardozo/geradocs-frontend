import { Folha } from "@/components/landing/folha"
import { IconeDoItemQuadro } from "@/components/landing/icones"
import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { documentoDaVitrine } from "@/lib/landing/documentos"

/** A folha do ETP serve de exemplo da identificação do documento gerado. */
const ETP = documentoDaVitrine("ETP")

/**
 * Segurança jurídica para quem assina (§125), em grade: os alertas da lei, a
 * identificação do documento gerado, desenhada na folha, e as proteções.
 */
export function Confianca() {
  const { confianca } = CONTEUDO
  const { identificacao } = confianca
  return (
    <section id={confianca.id} className="bg-ice py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao rotulo={confianca.rotulo} titulo={confianca.titulo} texto={confianca.texto} />

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:col-span-2">
            {confianca.alertas.map((alerta, indice) => (
              <li key={alerta.titulo}>
                <Revelar atraso={(indice % 2) * 100} className="h-full rounded-card border border-border bg-surface p-7 lg:p-8">
                  <span className="inline-flex rounded-sm bg-tint-royal-bg px-2 py-1 font-mono text-sm font-semibold text-royal">
                    {alerta.fundamento}
                  </span>
                  <h3 className="m-0 mt-4 font-display text-xl font-bold text-text-1">{alerta.titulo}</h3>
                  <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{alerta.texto}</p>
                </Revelar>
              </li>
            ))}
          </ul>

          <Revelar className="on-dark relative row-span-2 flex flex-col gap-6 overflow-hidden rounded-card gradient-hero p-7 lg:p-8 sm:p-8">
            <h3 className="m-0 font-display text-2xl font-extrabold text-on-dark">{identificacao.titulo}</h3>
            <div className="mx-auto w-full max-w-60 -rotate-2">
              <Folha documento={ETP} />
            </div>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {identificacao.itens.map((item, indice) => (
                <li key={item.titulo} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-on-dark-electric-chip font-mono text-sm font-bold text-on-dark">
                    {indice + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold tracking-caps text-on-dark-55 uppercase">{item.rotulo}</span>
                    <span className="block text-landing-body font-semibold text-on-dark">{item.titulo}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-md text-pretty text-on-dark-65">{identificacao.nota}</p>
          </Revelar>

          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:col-span-2">
            {confianca.protecoes.map((item, indice) => (
              <li key={item.titulo}>
                <Revelar atraso={(indice % 2) * 100} className="flex h-full gap-4 rounded-card border border-border bg-surface p-6 lg:p-7">
                  <IconeDoItemQuadro icone={item.icone} />
                  <span>
                    <h3 className="m-0 font-display text-lg font-bold text-text-1">{item.titulo}</h3>
                    <p className="m-0 mt-1 text-landing-body text-pretty text-text-3">{item.texto}</p>
                  </span>
                </Revelar>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
