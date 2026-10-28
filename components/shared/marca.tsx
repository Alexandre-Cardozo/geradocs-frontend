import type { ReactNode } from "react"

/*
 * Elementos da marca GovPro + GeraDocs que a interface repete (decisão §92).
 *
 * A faixa — azul longa, amarelo e verde curtos — é a mesma que sublinha o logo
 * no papel timbrado: é ela que liga a tela ao documento impresso.
 */

/** A faixa tricolor da marca. A largura vem de quem a usa. */
export function FaixaDaMarca({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1 ${className}`} aria-hidden>
      <span className="h-0.5 flex-[7] rounded-full bg-marca-azul-claro" />
      <span className="h-0.5 flex-[1.4] rounded-full bg-marca-amarelo" />
      <span className="h-0.5 flex-1 rounded-full bg-marca-verde" />
    </span>
  )
}

/**
 * As faixas diagonais dos cantos, as do papel timbrado, em versão para o fundo
 * escuro das telas de acesso. Decorativas: fixas, sem clique e fora da leitura.
 */
export function FaixasDeCanto() {
  const canto = (
    <svg viewBox="0 0 100 100" className="size-full" focusable="false">
      <path className="fill-marca-faceta-clara/10" d="M28 0H52L100 48V72Z" />
      <path className="fill-marca-verde" d="M53.5 0H55.5L100 44.5V46.5Z" />
      <path className="fill-marca-amarelo" d="M57.5 0H59.5L100 40.5V42.5Z" />
      <path className="fill-marca-azul/70" d="M61.5 0H74L100 26V38.5Z" />
      <path className="fill-marca-azul" d="M74 0H100V26Z" />
    </svg>
  )
  return (
    <>
      <div className="pointer-events-none fixed top-0 right-0 size-36 sm:size-52" aria-hidden>
        {canto}
      </div>
      <div className="pointer-events-none fixed bottom-0 left-0 size-36 rotate-180 sm:size-52" aria-hidden>
        {canto}
      </div>
    </>
  )
}

/** "uma solução [GovPro]" — a assinatura de endosso, em texto da marca e logo. */
export function UmaSolucao({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 font-marca text-2xs font-semibold tracking-caps text-on-dark-45">
      uma solução
      {children}
    </span>
  )
}
