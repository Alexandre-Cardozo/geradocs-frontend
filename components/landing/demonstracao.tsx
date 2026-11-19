import { BotaoLink } from "@/components/landing/botao-link"
import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO, HREF_DEMONSTRACAO } from "@/lib/landing/conteudo"

/** Chamada final, em navy, com o mesmo pedido de demonstração do topo. */
export function Demonstracao() {
  const { demonstracao } = CONTEUDO
  return (
    <section id={demonstracao.id} className="on-dark scroll-mt-20 gradient-hero py-16 lg:py-24">
      <div className="mx-auto flex max-w-landing flex-col items-center px-4 text-center sm:px-6">
        <Revelar className="flex flex-col items-center">
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-on-dark">
            {demonstracao.titulo}
          </h2>
          <p className="m-0 mt-4 max-w-xl text-landing-lead text-pretty text-on-dark-65">{demonstracao.texto}</p>
          <div className="mt-8">
            <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg">
              {demonstracao.cta}
            </BotaoLink>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
