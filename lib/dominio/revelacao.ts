/**
 * A escrita do texto da IA na tela (§107).
 *
 * <p>O texto que a IA devolve não aparece de uma vez: ele é escrito no campo,
 * palavra por palavra, em pouco mais de um segundo. Aqui fica só a conta, sem
 * React: quanto do texto já aparece em cada momento e quanto tempo a escrita
 * leva. Quem anima é `useRevelacaoDaIa`, em `components/shared/ia-magica.tsx`.
 */

/** O mínimo e o máximo da escrita: curta o bastante para não fazer esperar. */
export const DURACAO_MINIMA_MS = 700
export const DURACAO_MAXIMA_MS = 1600

/** Milissegundos por caractere antes dos limites: texto curto escreve rápido. */
const MS_POR_CARACTERE = 2.5

/** Quanto a escrita dura para este texto, dentro dos limites. */
export function duracaoDaRevelacao(texto: string): number {
  return Math.min(DURACAO_MAXIMA_MS, Math.max(DURACAO_MINIMA_MS, Math.round(texto.length * MS_POR_CARACTERE)))
}

/** Começa rápido e assenta no fim, como quem escreve e confere. */
export function suavizar(fracao: number): number {
  const limitada = Math.min(1, Math.max(0, fracao))
  return 1 - (1 - limitada) ** 3
}

/**
 * O pedaço do texto que já aparece quando `fracao` da escrita passou.
 *
 * <p>Corta sempre no fim de uma palavra, para não mostrar meia palavra. A linha
 * de tabela (`| a | b |`) aparece inteira: meia linha seria lida pelo editor de
 * tabela como uma tabela quebrada, e ele piscaria durante a escrita.
 */
export function trechoRevelado(texto: string, fracao: number): string {
  if (fracao >= 1) return texto
  if (fracao <= 0) return ""
  let fim = Math.floor(texto.length * fracao)
  // Avança até o fim da palavra em que o corte caiu.
  while (fim < texto.length && !/\s/.test(texto.charAt(fim))) fim++
  const inicioDaLinha = texto.lastIndexOf("\n", fim - 1) + 1
  if (texto.charAt(inicioDaLinha) === "|") {
    const fimDaLinha = texto.indexOf("\n", fim)
    fim = fimDaLinha === -1 ? texto.length : fimDaLinha
  }
  return texto.slice(0, fim)
}

/**
 * Quem pediu menos movimento no sistema vê o texto de uma vez, como antes.
 * Sem `matchMedia` (fora do navegador), também: não há o que animar.
 */
export function movimentoReduzido(janela: Pick<Window, "matchMedia"> | undefined): boolean {
  if (!janela || typeof janela.matchMedia !== "function") return true
  return janela.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** O que a tela diz enquanto a IA trabalha, em cada tipo de pedido. */
export const ETAPAS_DA_REDACAO = [
  "Lendo o processo e o DFD",
  "Redigindo a seção",
  "Conferindo fatos e normas",
] as const

export const ETAPAS_DA_MELHORIA = [
  "Lendo o seu texto",
  "Melhorando a redação",
  "Conferindo se nenhum fato mudou",
] as const
