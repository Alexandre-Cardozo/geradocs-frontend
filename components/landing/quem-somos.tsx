import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO } from "@/lib/landing/conteudo"

/**
 * A estrutura existe; o texto sobre a GovPro, não: não há fato sobre a empresa no
 * material do produto, e inventá-lo numa página pública seria pior que a lacuna.
 * A lacuna aparece tracejada e legível, para ninguém publicar sem preencher.
 */
export function QuemSomos() {
  const { quemSomos } = CONTEUDO
  return (
    <section id={quemSomos.id} className="scroll-mt-20 bg-surface py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 font-display text-landing-h2 font-extrabold text-balance text-text-1">{quemSomos.titulo}</h2>
          <div
            role="note"
            className="mt-6 max-w-xl rounded-card border-2 border-dashed border-tint-royal-border bg-tint-royal-bg p-6 font-mono text-md text-text-1"
          >
            {quemSomos.lacuna}
          </div>
        </Revelar>
      </div>
    </section>
  )
}
