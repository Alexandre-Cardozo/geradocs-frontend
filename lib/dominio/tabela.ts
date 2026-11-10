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

/** Uma tabela do texto e as linhas do texto que ela ocupa (`fim` exclusivo). */
export interface TabelaNoTexto {
  inicio: number
  fim: number
  linhas: string[][]
}

/** As tabelas do texto, na ordem, com o trecho que cada uma ocupa: é o que o editor troca. */
export function tabelasDoTexto(texto: string): TabelaNoTexto[] {
  const linhas = texto.split("\n")
  const achadas: TabelaNoTexto[] = []
  let inicio = 0
  linhas.forEach((linha, i) => {
    if (!linha.includes("|")) return
    if (i === 0 || !linhas[i - 1]?.includes("|")) inicio = i
    if (linhas[i + 1]?.includes("|")) return
    const achada = tabela(linhas.slice(inicio, i + 1))
    if (achada) achadas.push({ inicio, fim: i + 1, linhas: achada })
  })
  return achadas
}

/**
 * Troca a tabela de número `indice` por outra, ou a tira do texto (`null`).
 * O resto do texto fica como a pessoa escreveu; ao tirar, some também a linha
 * em branco que a separava, para não sobrar um buraco.
 */
export function substituirTabela(texto: string, indice: number, novas: string[][] | null): string {
  const alvo = tabelasDoTexto(texto)[indice]
  if (!alvo) return texto
  const linhas = texto.split("\n")
  let antes = linhas.slice(0, alvo.inicio)
  let depois = linhas.slice(alvo.fim)
  if (novas) return [...antes, ...tabelaEmTexto(novas).split("\n"), ...depois].join("\n")
  if (antes.at(-1) === "" && (depois.length === 0 || depois[0] === "")) antes = antes.slice(0, -1)
  else if (antes.length === 0 && depois[0] === "") depois = depois.slice(1)
  return [...antes, ...depois].join("\n")
}

/**
 * Põe a tabela no texto depois da linha em que está o cursor (`posicao`, em
 * caracteres), ou no fim. Vai entre linhas em branco, senão grudaria no
 * parágrafo vizinho; com o cursor dentro de outra tabela, entra depois dela,
 * em vez de parti-la em duas.
 */
export function inserirTabela(texto: string, linhas: string[][], posicao?: number): string {
  const tabelaNova = tabelaEmTexto(linhas).split("\n")
  if (texto.trim() === "") return tabelaNova.join("\n")
  const existentes = texto.split("\n")
  let ultima = posicao == null ? existentes.length - 1 : texto.slice(0, posicao).split("\n").length - 1
  const dentro = tabelasDoTexto(texto).find((t) => ultima >= t.inicio && ultima < t.fim)
  if (dentro) ultima = dentro.fim - 1
  const antes = existentes.slice(0, ultima + 1)
  const depois = existentes.slice(ultima + 1)
  return [
    ...antes,
    ...(antes.at(-1) === "" ? [] : [""]),
    ...tabelaNova,
    ...(depois.length === 0 || depois[0] === "" ? [] : [""]),
    ...depois,
  ].join("\n")
}

/** A tabela nova do editor: três colunas, o cabeçalho a renomear e uma linha. */
export function tabelaEmBranco(): string[][] {
  return [
    ["Coluna 1", "Coluna 2", "Coluna 3"],
    ["", "", ""],
  ]
}

/**
 * O que impede a tabela de ser lida como tabela, ou nada. Uma coluna só não é
 * tabela, e o cabeçalho em branco deixaria quem lê sem saber o que é cada
 * coluna.
 */
export function problemaDaTabela(linhas: string[][]): string | null {
  const [cabecalho = [], ...corpo] = linhas
  if (cabecalho.length < 2) return "A tabela precisa de pelo menos duas colunas."
  if (corpo.length === 0) return "A tabela precisa de pelo menos uma linha além do cabeçalho."
  if (cabecalho.every((celula) => celula.trim() === "")) return "Dê nome às colunas no cabeçalho."
  return null
}

/**
 * Quantas tabelas de `antes` não voltaram iguais em `depois` (§101).
 *
 * <p>É a conferência do que a IA devolve. As instruções pedem que ela mantenha
 * cada tabela com as mesmas colunas e números (ADR-062 do back-end), mas pedido
 * não é garantia: a memória de cálculo que some ou muda um número no caminho é
 * o erro que não pode passar em silêncio para dentro do processo.
 */
export function tabelasNaoMantidas(antes: string, depois: string): number {
  const assinatura = (linhas: string[][]) => JSON.stringify(linhas)
  const restantes = tabelasDoTexto(depois).map((t) => assinatura(t.linhas))
  return tabelasDoTexto(antes).filter((t) => {
    const i = restantes.indexOf(assinatura(t.linhas))
    if (i < 0) return true
    restantes.splice(i, 1)
    return false
  }).length
}

/** O aviso, ou nada quando todas as tabelas voltaram iguais. */
export function avisoDasTabelas(antes: string, depois: string): string | null {
  const n = tabelasNaoMantidas(antes, depois)
  if (n === 0) return null
  return n === 1
    ? "A IA alterou ou tirou 1 tabela do texto. Confira os números antes de seguir."
    : `A IA alterou ou tirou ${n} tabelas do texto. Confira os números antes de seguir.`
}
