import Image, { type StaticImageData } from "next/image"

import geradocsLogo from "@/public/geradocs-logo-white.svg"

import { BotaoLink } from "@/components/landing/botao-link"
import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconCheck, IconPlus } from "@/components/ui/icons"
import { FaixasDeCanto } from "@/components/shared/marca"
import { CONTEUDO, PRODUTOS, type IdDoProduto } from "@/lib/landing/conteudo"

/** A logo branca de cada solução. Uma solução nova pede uma entrada aqui. */
const LOGOS: Record<IdDoProduto, { src: StaticImageData; largura: number }> = {
  geradocs: { src: geradocsLogo, largura: 151 },
}

/**
 * O portfólio da GovPro (§125), lido de `PRODUTOS`. A primeira solução ocupa o
 * cartão largo; as demais, se houver, entram em cartões menores ao lado. O
 * último espaço diz que o portfólio cresce, sem anunciar produto que não existe.
 */
export function Solucoes() {
  const { solucoes } = CONTEUDO
  const [principal, ...demais] = PRODUTOS
  const logo = LOGOS[principal.id]

  return (
    <section id={solucoes.id} className="bg-ice py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao rotulo={solucoes.rotulo} titulo={solucoes.titulo} texto={solucoes.texto} />

        <ul className="m-0 mt-12 grid list-none gap-4 p-0 lg:grid-cols-3">
          <li className="lg:col-span-2">
            <Revelar className="on-dark relative h-full overflow-hidden rounded-card gradient-hero p-7 lg:p-8 sm:p-10">
              <FaixasDeCanto posicao="absolute" />
              <div className="relative flex h-full flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Image src={logo.src} alt={principal.nome} width={logo.largura} height={32} className="h-8 w-auto" />
                  <span className="rounded-full bg-on-dark-electric-chip px-3 py-1 text-sm font-semibold text-on-dark">
                    {principal.area}
                  </span>
                </div>
                <div>
                  <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark-65 uppercase">
                    {principal.slogan}
                  </p>
                  <p className="m-0 mt-3 max-w-xl text-landing-lead text-pretty text-on-dark">{principal.resumo}</p>
                </div>
                <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {principal.destaques.map((destaque) => (
                    <li key={destaque} className="flex items-center gap-2 text-landing-body text-on-dark-65">
                      <span className="flex size-5 items-center justify-center rounded-full bg-marca-verde text-navy" aria-hidden>
                        <IconCheck size={12} strokeWidth={3} />
                      </span>
                      {destaque}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-3 pt-2">
                  <BotaoLink href={principal.ancora} tamanho="lg" seta>
                    {solucoes.conhecer}
                  </BotaoLink>
                  <BotaoLink href={principal.acesso} tamanho="lg" variante="secundario-escuro">
                    {CONTEUDO.acoes.acessar}
                  </BotaoLink>
                </div>
              </div>
            </Revelar>
          </li>

          {demais.map((produto, indice) => (
            <li key={produto.id}>
              <Revelar atraso={(indice + 1) * 100} className="h-full rounded-card border border-border bg-surface p-7 lg:p-8">
                <h3 className="m-0 font-display text-2xl font-extrabold text-text-1">{produto.nome}</h3>
                <p className="m-0 mt-1 font-marca text-sm font-bold tracking-slogan text-royal uppercase">{produto.slogan}</p>
                <p className="m-0 mt-3 text-landing-body text-pretty text-text-3">{produto.resumo}</p>
                <a href={produto.ancora} className="mt-4 inline-flex font-semibold text-royal">
                  {produto.nome}
                </a>
              </Revelar>
            </li>
          ))}

          <li>
            <Revelar
              atraso={100}
              className="flex h-full flex-col justify-between gap-6 rounded-card border-2 border-dashed border-tint-royal-border bg-surface p-7 lg:p-8 sm:p-8"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-tint-royal-bg text-royal" aria-hidden>
                <IconPlus size={22} />
              </span>
              <div>
                <h3 className="m-0 font-display text-2xl font-extrabold text-text-1">{solucoes.proximas.titulo}</h3>
                <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{solucoes.proximas.texto}</p>
                <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
                  {solucoes.proximas.metodo.map((passo) => (
                    <li key={passo} className="rounded-full bg-tint-royal-bg px-3 py-1 text-sm font-semibold text-royal">
                      {passo}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          </li>
        </ul>
      </div>
    </section>
  )
}
