/**
 * A tabela no texto da seção (§100).
 *
 * A tabela mora no próprio texto: uma linha por linha da tabela, as células
 * separadas por "|" e a primeira linha como cabeçalho. É o formato que as
 * minutas da AGU já trazem e o que o servidor consegue corrigir no editor sem
 * ferramenta própria. O back-end lê as mesmas regras (`TextoDaSecao`, ADR-062)
 * e desenha a tabela no PDF e no DOCX; aqui ela serve à prévia e aos painéis
 * que escrevem a memória de cálculo.
 *
 * - linhas seguidas que contêm "|" formam uma tabela;
 * - uma linha sozinha só vira tabela com três colunas ou mais;
 * - a linha que começa por "|" perde a barra das pontas (Markdown); a que não
 *   começa guarda a célula vazia do fim, a coluna em branco da minuta;
 * - a linha de traços do Markdown é ignorada;
 * - a linha curta ganha células vazias até a largura da tabela.
 */

export type ParteDoTexto = { tipo: "paragrafo"; texto: string } | { tipo: "tabela"; linhas: string[][] }

const TRACOS = /^:?-{3,}:?$/
/**
 * Valor, quantidade, percentual: o que se alinha à direita para somar de olho.
 * O milhar vai de três em três; código como "12.361.0004.2.045" não é número.
 */
const NUMERO = /^(R\$\s?)?-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?\s?%?$/

function celulas(linha: string): string[] {
  let limpa = linha.trim()
  if (limpa.startsWith("|")) {
    limpa = limpa.slice(1)
    if (limpa.endsWith("|")) limpa = limpa.slice(0, -1)
  }
  return limpa.split("|").map((c) => c.trim())
}

function soTracos(linha: string[]): boolean {
  const preenchidas = linha.filter((c) => c !== "")
  return preenchidas.length > 0 && preenchidas.every((c) => TRACOS.test(c))
}

function tabela(linhas: string[]): string[][] | null {
  const tabela = linhas.map(celulas).filter((l) => !soTracos(l))
  if (tabela.length === 0) return null
  const colunas = Math.max(...tabela.map((l) => l.length))
  if (tabela.length === 1 && colunas < 3) return null
  return tabela.map((l) => [...l, ...Array<string>(colunas - l.length).fill("")])
}

/** As partes do texto, na ordem; texto sem tabela sai um parágrafo por linha, como antes. */
export function partesDoTexto(texto: string): ParteDoTexto[] {
  const partes: ParteDoTexto[] = []
  let grupo: string[] = []
  // As linhas com barra que não formam tabela voltam a ser parágrafos, uma a uma.
  const fechar = () => {
    const achada = grupo.length > 0 ? tabela(grupo) : null
    if (achada) partes.push({ tipo: "tabela", linhas: achada })
    else partes.push(...grupo.map((linha) => ({ tipo: "paragrafo" as const, texto: linha })))
    grupo = []
  }
  for (const linha of texto.split("\n")) {
    if (linha.includes("|")) {
      grupo.push(linha)
    } else {
      fechar()
      partes.push({ tipo: "paragrafo", texto: linha })
    }
  }
  fechar()
  return partes
}

/** A coluna é numérica quando toda célula preenchida do corpo é número ou valor. */
export function colunaNumerica(linhas: string[][], coluna: number): boolean {
  const corpo = linhas.slice(1).flatMap((l) => {
    const celula = l[coluna]
    return celula ? [celula] : []
  })
  return corpo.length > 0 && corpo.every((c) => NUMERO.test(c))
}

/** A linha de total sai em negrito, como nas planilhas de preço. */
export function linhaTotalizadora(linha: string[]): boolean {
  return (linha[0] ?? "").toLowerCase().startsWith("total")
}

/**
 * Escreve a tabela no formato do texto. A barra dentro da célula vira "/", que
 * é o que ela costuma significar ali ("caixa | pacote"): uma barra solta
 * criaria coluna que ninguém pediu. A linha que começa por célula vazia ganha
 * as barras das pontas, senão a leitura tomaria a primeira barra pela do
 * Markdown e a célula vazia sumiria.
 */
export function tabelaEmTexto(linhas: string[][]): string {
  return linhas
    .map((linha) => {
      const limpas = linha.map((c) => c.replaceAll("|", "/").replace(/\s+/g, " ").trim())
      const texto = limpas.join(" | ")
      return limpas[0] === "" ? `| ${texto} |` : texto
    })
    .join("\n")
}
