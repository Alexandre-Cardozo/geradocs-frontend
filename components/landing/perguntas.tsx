import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconPlus } from "@/components/ui/icons"
import { CONTEUDO } from "@/lib/landing/conteudo"
import { GovBo } from "@/components/mascotes/mascotes"

/** Perguntas frequentes em `<details>`: abrem sem JavaScript e pelo teclado (§125). */
export function Perguntas() {
  const { faq } = CONTEUDO
  return (
    <section id={faq.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto grid max-w-landing gap-10 px-4 sm:px-6 lg:px-10 xl:px-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <TituloDeSecao titulo={faq.titulo} />
          {/* O GovBô com a dúvida de quem chega (§127), no espaço ao lado das perguntas. */}
          <GovBo expressao="em-duvida" acao="inclinar" repetir className="mt-12 hidden size-44 lg:block" />
        </div>
        <Revelar className="border-t border-border">
          {faq.itens.map((item) => (
            <details key={item.pergunta} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold text-text-1 [&::-webkit-details-marker]:hidden">
                {item.pergunta}
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint-royal-bg text-royal transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                >
                  <IconPlus size={16} />
                </span>
              </summary>
              <p className="m-0 pb-5 text-landing-body text-pretty text-text-3">{item.resposta}</p>
            </details>
          ))}
        </Revelar>
      </div>
    </section>
  )
}
