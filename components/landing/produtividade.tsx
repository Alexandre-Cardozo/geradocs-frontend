import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconArrowRight, IconCheck, IconX } from "@/components/ui/icons"
import { CONTEUDO } from "@/lib/landing/conteudo"

/**
 * O ganho estimado e o antes e depois (§125). As estimativas vêm sempre com a
 * nota de que são capacidade estimada, não uso médio medido.
 */
export function Produtividade() {
  const { produtividade } = CONTEUDO
  return (
    <section id={produtividade.id} className="bg-ice py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao rotulo={produtividade.rotulo} titulo={produtividade.titulo} />

        <dl className="m-0 mt-10 grid gap-4 md:grid-cols-3">
          {produtividade.estimativas.map((item, indice) => (
            <Revelar
              key={item.rotulo}
              atraso={indice * 100}
              className={`flex flex-col gap-2 rounded-card p-7 lg:p-8 ${indice === 0 ? "border border-border bg-surface" : "on-dark gradient-hero"}`}
            >
              <dt className={`order-2 text-landing-body text-pretty ${indice === 0 ? "text-text-3" : "text-on-dark-65"}`}>
                {item.rotulo}
              </dt>
              <dd
                className={`order-1 m-0 font-display text-landing-numero font-extrabold ${indice === 0 ? "text-text-1" : "text-on-dark"}`}
              >
                {item.valor}
              </dd>
            </Revelar>
          ))}
        </dl>
        <p className="m-0 mt-4 text-sm text-text-muted">{produtividade.notaEstimativa}</p>

        <Revelar className="mt-12 overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              {produtividade.antes} e {produtividade.depois}
            </caption>
            <thead>
              <tr className="bg-border-soft">
                <th scope="col" className="w-1/2 px-5 py-4 font-display text-lg font-bold text-text-3">
                  {produtividade.antes}
                </th>
                <th scope="col" className="w-1/2 px-5 py-4 font-display text-lg font-bold text-royal">
                  {produtividade.depois}
                </th>
              </tr>
            </thead>
            <tbody>
              {produtividade.comparativo.map(([antes, depois]) => (
                <tr key={antes} className="border-t border-border-soft align-top">
                  <td className="px-5 py-4 text-landing-body text-text-3">
                    <span className="flex gap-3">
                      <span className="mt-0.5 shrink-0 text-text-faint" aria-hidden>
                        <IconX size={16} />
                      </span>
                      {antes}
                    </span>
                  </td>
                  <td className="relative px-5 py-4 text-landing-body font-medium text-text-1">
                    <span className="absolute top-1/2 -left-3 hidden -translate-y-1/2 rounded-full bg-surface text-royal md:block" aria-hidden>
                      <IconArrowRight size={18} />
                    </span>
                    <span className="flex gap-3">
                      <span className="mt-0.5 shrink-0 text-success" aria-hidden>
                        <IconCheck size={16} strokeWidth={3} />
                      </span>
                      {depois}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Revelar>
      </div>
    </section>
  )
}
