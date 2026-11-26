import Image from "next/image"

import endosso from "@/design_system/assets/geradocs-endosso-govpro-white.svg"
import produto from "@/public/landing/telas/produto.webp"

import { BotaoLink } from "@/components/landing/botao-link"
import { Contador } from "@/components/landing/contador"
import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { Revelar } from "@/components/landing/revelar"
import { FaixaDaMarca, FaixasDeCanto } from "@/components/shared/marca"
import { CONTEUDO, HREF_ENTRAR, hrefOnboarding } from "@/lib/landing/conteudo"

/**
 * O GeraDocs em foco dentro da página da GovPro (§125): a logo com o endosso,
 * a promessa, a captura do editor e os números do produto, que sobem ao entrar
 * na tela.
 */
export function Geradocs() {
  const { geradocs, acoes } = CONTEUDO
  return (
    <section id={geradocs.id} className="on-dark relative overflow-hidden gradient-hero">
      <div className="pointer-events-none absolute inset-0 landing-grade" aria-hidden />
      <div
        className="pointer-events-none absolute top-[-20%] left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-royal/20 blur-3xl"
        aria-hidden
      />
      <FaixasDeCanto posicao="absolute" />

      <div className="relative mx-auto grid max-w-landing items-center gap-12 px-4 pt-20 pb-14 sm:px-6 lg:px-10 xl:px-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-28">
        <div className="flex flex-col items-start gap-6">
          <Revelar>
            <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark-65 uppercase">{geradocs.rotulo}</p>
            <Image
              src={endosso}
              alt="GeraDocs, uma solução GovPro"
              width={300}
              height={45}
              className="mt-4 h-11 w-auto"
            />
            <FaixaDaMarca className="mt-4 w-64" />
          </Revelar>
          <Revelar atraso={100}>
            <h2 className="m-0 font-display text-landing-h1 font-extrabold text-balance text-on-dark">{geradocs.titulo}</h2>
          </Revelar>
          <Revelar atraso={200}>
            <p className="m-0 max-w-xl text-landing-lead text-pretty text-on-dark-65">{geradocs.apoio}</p>
            <p className="m-0 mt-4 font-display text-lg font-bold text-on-dark">{geradocs.frase}</p>
          </Revelar>
          <Revelar atraso={300}>
            <div className="flex flex-wrap gap-3">
              <BotaoLink href={hrefOnboarding("geradocs")} tamanho="lg" seta>
                {acoes.demonstracao}
              </BotaoLink>
              <BotaoLink href={HREF_ENTRAR} tamanho="lg" variante="secundario-escuro">
                {acoes.acessar}
              </BotaoLink>
            </div>
          </Revelar>
        </div>

        <Revelar atraso={150} className="lg:translate-x-6">
          <MolduraDeTela src={produto} alt={geradocs.altCaptura} />
        </Revelar>
      </div>

      <div className="relative mx-auto max-w-landing px-4 pb-20 sm:px-6 lg:px-10 xl:px-14 lg:pb-28">
        <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-on-dark-border bg-on-dark-border sm:grid-cols-3 lg:grid-cols-5">
          {geradocs.numeros.map((numero) => (
            <div key={numero.rotulo} className="flex flex-col gap-3 bg-navy/80 p-6 last:col-span-2 sm:last:col-span-1 lg:p-7">
              <dt className="order-2 text-md text-pretty text-on-dark-65">{numero.rotulo}</dt>
              <dd className="order-1 m-0 flex items-baseline font-display text-landing-numero font-extrabold text-on-dark">
                <Contador valor={numero.valor} />
                {/* "%" acompanha o número; "de 5" diz que é tudo o que existe, em tom de apoio. */}
                {numero.sufixo === "%" && <span>%</span>}
                {numero.sufixo && numero.sufixo !== "%" && (
                  <span className="ml-2 text-3xl text-on-dark-65">{numero.sufixo.trim()}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
