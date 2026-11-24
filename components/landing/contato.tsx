import { BotaoLink } from "@/components/landing/botao-link"
import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { FaixasDeCanto } from "@/components/shared/marca"
import { CONTEUDO, EMAIL_CONTATO, HREF_CONTATO, HREF_DEMONSTRACAO } from "@/lib/landing/conteudo"
import { GovBo, GovPri } from "@/components/mascotes/mascotes"

/** A chamada final: três passos e o pedido de demonstração (§125). */
export function Contato() {
  const { contato, acoes } = CONTEUDO
  return (
    <section id={contato.id} className="on-dark relative overflow-hidden gradient-hero py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-0 landing-grade" aria-hidden />
      <FaixasDeCanto posicao="absolute" />
      {/* No convite final, a GovPri acena de um canto e o GovBô pula no outro (§127). Só em tela larga. */}
      <GovPri
        expressao="sorridente"
        acao="acenar"
        manter
        className="absolute bottom-0 left-[3%] hidden aspect-[480/496] h-60 lg:block xl:left-[6%]"
      />
      <GovBo
        expressao="alegre"
        acao="pular"
        repetir
        className="absolute right-[4%] bottom-6 hidden size-36 lg:block xl:right-[7%]"
      />
      <div className="relative mx-auto flex max-w-landing flex-col items-center px-4 text-center sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao tom="escuro" centro rotulo={contato.rotulo} titulo={contato.titulo} texto={contato.texto} />

        <ol className="m-0 mt-12 grid w-full list-none gap-4 p-0 text-left md:grid-cols-3">
          {contato.passos.map((passo, indice) => (
            <li key={passo.titulo}>
              <Revelar atraso={indice * 100} className="h-full rounded-card border border-on-dark-border bg-on-dark-fill p-7 lg:p-8">
                <span className="font-mono text-md font-bold text-electric">{String(indice + 1).padStart(2, "0")}</span>
                <h3 className="m-0 mt-2 font-display text-xl font-bold text-on-dark">{passo.titulo}</h3>
                <p className="m-0 mt-1 text-landing-body text-pretty text-on-dark-65">{passo.texto}</p>
              </Revelar>
            </li>
          ))}
        </ol>

        <Revelar className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg" seta>
              {acoes.demonstracao}
            </BotaoLink>
            <BotaoLink href={HREF_CONTATO} tamanho="lg" variante="secundario-escuro">
              {acoes.conversar}
            </BotaoLink>
          </div>
          <a href={HREF_CONTATO} className="font-mono text-landing-body text-on-dark-65 no-underline hover:text-on-dark">
            {EMAIL_CONTATO}
          </a>
        </Revelar>
      </div>
    </section>
  )
}
