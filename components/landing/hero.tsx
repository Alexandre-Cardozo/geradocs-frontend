import editorEtp from "@/public/landing/editor-etp.png"

import { BotaoLink } from "@/components/landing/botao-link"
import { Entrada } from "@/components/landing/entrada"
import { MolduraDeTela } from "@/components/landing/moldura-de-tela"
import { FaixaDaMarca, FaixasDeCanto } from "@/components/shared/marca"
import { CONTEUDO, HREF_DEMONSTRACAO, HREF_ENTRAR } from "@/lib/landing/conteudo"

/**
 * Hero do GeraDocs em navy, logo depois da abertura da GovPro (§120): o título é
 * `h2`, porque o `h1` da página é o slogan da abertura. Entrada escalonada por CSS (`Entrada`), sem observador: a captura
 * é o maior elemento da dobra e não pode esperar JavaScript (LCP). Os efeitos
 * decorativos têm `pointer-events-none`.
 */
export function Hero() {
  const { hero } = CONTEUDO
  return (
    <section className="on-dark relative overflow-hidden gradient-hero">
      <div
        className="pointer-events-none absolute top-[-18%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-royal/10 blur-3xl"
        aria-hidden
      />
      <FaixasDeCanto posicao="absolute" />

      <div className="relative z-10 mx-auto grid max-w-landing items-center gap-10 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-start gap-6">
          <Entrada indice={0}>
            <p className="m-0 font-marca text-sm font-semibold tracking-slogan text-on-dark-65 uppercase">
              {hero.eyebrow}
            </p>
            <FaixaDaMarca className="mt-3 w-64" />
          </Entrada>
          <Entrada indice={1}>
            <h2 className="m-0 font-display text-landing-h1 font-extrabold text-balance text-on-dark">{hero.titulo}</h2>
          </Entrada>
          <Entrada indice={2}>
            <p className="m-0 max-w-xl text-landing-lead text-pretty text-on-dark-65">{hero.apoio}</p>
          </Entrada>
          <Entrada indice={3}>
            <div className="flex flex-wrap gap-3">
              <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg" seta>
                {hero.ctaPrimario}
              </BotaoLink>
              <BotaoLink href={HREF_ENTRAR} tamanho="lg" variante="secundario-escuro">
                {hero.ctaSecundario}
              </BotaoLink>
            </div>
          </Entrada>
        </div>

        <Entrada indice={2}>
          <MolduraDeTela src={editorEtp} alt={hero.altCaptura} prioridade />
        </Entrada>
      </div>
    </section>
  )
}
