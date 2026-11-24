import { progressoDaRolagem } from "@/lib/landing/paralaxe"

/**
 * Ligação da rolagem ao desenho (§125), igual à da abertura (§124): um quadro
 * por `requestAnimationFrame`, só quando a página rola ou a janela muda de
 * tamanho. Quem desenha escreve `transform` e `opacity` direto no elemento.
 */

/** Chama `desenhar` agora e a cada quadro de rolagem. Devolve quem desliga. */
export function assinarRolagem(desenhar: () => void): () => void {
  let pedido = 0
  const pedir = () => {
    if (pedido) return
    pedido = requestAnimationFrame(() => {
      pedido = 0
      desenhar()
    })
  }
  pedir()
  window.addEventListener("scroll", pedir, { passive: true })
  window.addEventListener("resize", pedir)
  return () => {
    cancelAnimationFrame(pedido)
    window.removeEventListener("scroll", pedir)
    window.removeEventListener("resize", pedir)
  }
}

/** Altura do cabeçalho fixo, em px: o palco preso começa logo abaixo dele. */
export const ALTURA_DO_CABECALHO = 64

/**
 * O progresso de um trilho que prende o palco logo abaixo do cabeçalho (§126):
 * o palco tem a altura da janela menos o cabeçalho, e o percurso é o que sobra.
 */
export function progressoDoTrilho(trilho: HTMLElement): number {
  const caixa = trilho.getBoundingClientRect()
  return progressoDaRolagem(caixa.top - ALTURA_DO_CABECALHO, caixa.height, window.innerHeight - ALTURA_DO_CABECALHO)
}

export function movimentoReduzido(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

/** O palco preso só existe em tela larga (`lg`) e sem movimento reduzido. */
export function palcoPermitido(): boolean {
  return !movimentoReduzido() && (window.matchMedia?.("(min-width: 1024px)").matches ?? false)
}
