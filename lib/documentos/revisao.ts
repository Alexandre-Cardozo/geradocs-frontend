/**
 * A comparação entre o texto da seção e a revisão sugerida pela IA (§87).
 *
 * <p>Por palavras, e não por caractere: quem assina lê frases, e a marcação de
 * cada letra trocada tornaria a sugestão ilegível. Os espaços acompanham a
 * palavra que vem antes deles, para o texto remontado ficar igual ao original.
 */

export type TrechoDaRevisao = { tipo: "igual" | "removido" | "incluido"; texto: string }

/** Acima disto a comparação palavra a palavra pesaria na tela: mostra-se o todo trocado. */
export const LIMITE_DE_PALAVRAS = 4000

function palavras(texto: string): string[] {
  return texto.match(/\S+\s*/g) ?? []
}

/** O texto mudou de fato — diferença só de espaços não é sugestão. */
export function revisaoMudouOTexto(atual: string, sugerido: string): boolean {
  const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ")
  return normalizar(sugerido) !== "" && normalizar(atual) !== normalizar(sugerido)
}

/** Os trechos iguais, removidos e incluídos, na ordem do texto. */
export function compararRevisao(atual: string, sugerido: string): TrechoDaRevisao[] {
  const a = palavras(atual)
  const b = palavras(sugerido)
  if (a.length + b.length > LIMITE_DE_PALAVRAS) {
    return juntar([
      { tipo: "removido", texto: atual },
      { tipo: "incluido", texto: sugerido },
    ])
  }
  // Maior subsequência comum, de trás para a frente, para a reconstrução ir
  // da primeira palavra à última.
  const comum: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      comum[i]![j] =
        a[i]!.trim() === b[j]!.trim()
          ? comum[i + 1]![j + 1]! + 1
          : Math.max(comum[i + 1]![j]!, comum[i]![j + 1]!)
    }
  }
  const trechos: TrechoDaRevisao[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i]!.trim() === b[j]!.trim()) {
      trechos.push({ tipo: "igual", texto: b[j]! })
      i++
      j++
    } else if (comum[i + 1]![j]! >= comum[i]![j + 1]!) {
      trechos.push({ tipo: "removido", texto: a[i]! })
      i++
    } else {
      trechos.push({ tipo: "incluido", texto: b[j]! })
      j++
    }
  }
  for (; i < a.length; i++) trechos.push({ tipo: "removido", texto: a[i]! })
  for (; j < b.length; j++) trechos.push({ tipo: "incluido", texto: b[j]! })
  return juntar(trechos)
}

/** Trechos vizinhos do mesmo tipo viram um só: menos marcação, mesma leitura. */
function juntar(trechos: TrechoDaRevisao[]): TrechoDaRevisao[] {
  const juntos: TrechoDaRevisao[] = []
  for (const trecho of trechos) {
    if (trecho.texto === "") continue
    const ultimo = juntos[juntos.length - 1]
    if (ultimo && ultimo.tipo === trecho.tipo) ultimo.texto += trecho.texto
    else juntos.push({ ...trecho })
  }
  return juntos
}
