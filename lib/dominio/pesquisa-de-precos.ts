/**
 * A pesquisa de preços: da série coletada ao preço de referência.
 *
 * <p>A <b>IN SEGES/ME nº 65/2021</b> é quem manda aqui. O Art. 3º diz o que a
 * pesquisa precisa conter — caracterização das fontes, série de preços, método
 * estatístico e memória de cálculo. O Art. 6º diz como tratar os preços: média,
 * mediana ou menor valor, "desde que o cálculo incida sobre um conjunto de três
 * ou mais preços".
 *
 * <p>O que este módulo <b>não</b> faz é decidir o que descartar. O Art. 6º, § 2º
 * admite desconsiderar valores inexequíveis, inconsistentes ou excessivamente
 * elevados, mas o § 3º exige que o critério seja "fundamentado e descrito no
 * processo" — ou seja, é do servidor, e não da plataforma. O que a plataforma
 * faz é <b>apontar o que merece exame</b> e dizer que o critério precisa ser
 * escrito.
 */

import type { ColetaDePreco } from "@/lib/api/procurement-client"
import { formatBRL, parseValorBR } from "@/lib/format"

/** O conjunto mínimo que o Art. 6º exige para média, mediana ou menor valor. */
export const MINIMO_DE_PRECOS = 3

/**
 * A distância da mediana a partir da qual um preço merece ser olhado.
 *
 * <p><b>Não é critério legal</b> — a IN não fixa percentual. É uma peneira de
 * triagem, na faixa que a prática de controle costuma usar, e a tela diz isso:
 * quem decide o descarte é o servidor, e o § 3º exige que ele escreva por quê.
 */
export const DESVIO_PARA_EXAME = 0.25

export type MetodoDeApuracao = "media" | "mediana" | "menor"

export const ROTULO_DO_METODO: Record<MetodoDeApuracao, string> = {
  media: "Média dos preços obtidos",
  mediana: "Mediana dos preços obtidos",
  menor: "Menor dos preços obtidos",
}

export interface ItemPesquisado {
  /** A descrição como ela foi pesquisada. */
  item: string
  coletas: ColetaDePreco[]
  precos: number[]
  media: number
  mediana: number
  menor: number
  maior: number
  /** Preços distantes da mediana — para exame, não para descarte automático. */
  paraExame: ColetaDePreco[]
  /** Menos de três preços: o Art. 6º só admite isso com justificativa (§ 5º). */
  serieCurta: boolean
}

/** A chave que liga a coleta ao item da demanda — a mesma da consolidação. */
export function chaveDoItem(descricao: string): string {
  return descricao.trim().toLowerCase().replace(/\s+/g, " ")
}

function media(precos: number[]): number {
  return precos.reduce((soma, p) => soma + p, 0) / precos.length
}

function mediana(precos: number[]): number {
  const ordenados = [...precos].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  // Conjunto par não tem termo central: a mediana é a média dos dois do meio.
  // Recortar em vez de indexar deixa a expressão sem ramo impossível de
  // alcançar — e um ramo que nenhum teste pode cobrir é ramo que ninguém
  // conferiu.
  const centrais =
    ordenados.length % 2 === 0
      ? ordenados.slice(meio - 1, meio + 1)
      : ordenados.slice(meio, meio + 1)
  return media(centrais)
}

/**
 * A série agrupada por item.
 *
 * <p>Agrupar é o que permite a análise crítica: o Art. 6º compara preços do
 * <b>mesmo</b> item, e uma lista única misturaria resma de papel com caneta.
 */
export function porItem(coletas: ColetaDePreco[]): ItemPesquisado[] {
  // O grupo guarda a descrição da primeira coleta: o agrupamento é pela chave
  // normalizada, mas o que vai ao documento é como a pessoa escreveu.
  const grupos = new Map<string, { item: string; coletas: ColetaDePreco[] }>()
  for (const coleta of coletas) {
    const chave = chaveDoItem(coleta.item)
    const grupo = grupos.get(chave)
    if (grupo) grupo.coletas.push(coleta)
    else grupos.set(chave, { item: coleta.item, coletas: [coleta] })
  }
  return [...grupos.values()]
    .map(({ item, coletas: doItem }) => {
      const precos = doItem.map((c) => parseValorBR(c.valorUnitario))
      const central = mediana(precos)
      return {
        item,
        coletas: doItem,
        precos,
        media: media(precos),
        mediana: central,
        menor: Math.min(...precos),
        maior: Math.max(...precos),
        paraExame: doItem.filter(
          (c) =>
            central > 0
            && Math.abs(parseValorBR(c.valorUnitario) - central) / central > DESVIO_PARA_EXAME,
        ),
        serieCurta: precos.length < MINIMO_DE_PRECOS,
      }
    })
    .sort((a, b) => a.item.localeCompare(b.item, "pt-BR"))
}

/** O preço apurado de um item pelo método escolhido. */
export function apurar(item: ItemPesquisado, metodo: MetodoDeApuracao): number {
  if (metodo === "mediana") return item.mediana
  if (metodo === "menor") return item.menor
  return item.media
}

/** As fontes efetivamente consultadas, sem repetição e na ordem em que aparecem. */
export function fontesConsultadas(coletas: ColetaDePreco[]): string[] {
  return [...new Set(coletas.map((c) => c.fonte.trim()))].filter((f) => f !== "")
}

/** Quem deu os preços, quando a fonte identificou alguém. */
export function fornecedoresIdentificados(coletas: ColetaDePreco[]): string[] {
  return [
    ...new Set(
      coletas
        .filter((c) => (c.fornecedor ?? "").trim() !== "")
        .map((c) =>
          c.documentoDoFornecedor
            ? `${c.fornecedor} (${c.documentoDoFornecedor})`
            : String(c.fornecedor),
        ),
    ),
  ]
}

/**
 * O parágrafo das fontes consultadas — Cotação, seção 2 (Art. 23, § 1º).
 *
 * <p>Cita as fontes efetivamente usadas e os fornecedores identificados. Quando
 * a pesquisa não tocou nos parâmetros prioritários, deixa a justificativa em
 * colchetes: o Art. 5º, § 1º da IN manda priorizar os incisos I e II e
 * justificar quando não for possível.
 */
export function textoDasFontes(
  coletas: ColetaDePreco[],
  /** Se alguma das fontes usadas é um dos parâmetros prioritários (incisos I e II). */
  usouPrioritaria: boolean,
): string {
  const fontes = fontesConsultadas(coletas)
  const fornecedores = fornecedoresIdentificados(coletas)
  return [
    "A pesquisa de preços foi realizada com base nos parâmetros do Art. 23, § 1º, da"
      + " Lei 14.133/21, detalhados pela IN SEGES/ME nº 65/2021, tendo sido consultadas as"
      + " seguintes fontes:",
    fontes.map((fonte) => `- ${fonte}`).join("\n"),
    ...(fornecedores.length > 0
      ? [
          "Foram identificados os seguintes fornecedores consultados:\n"
            + fornecedores.map((f) => `- ${f}`).join("\n"),
        ]
      : []),
    ...(usouPrioritaria
      ? []
      : [
          "[Justificar a impossibilidade de utilizar os parâmetros dos incisos I e II do"
            + " Art. 23, § 1º — sistemas oficiais de preços e contratações similares da"
            + " Administração —, cuja preferência o Art. 5º, § 1º da IN SEGES/ME nº 65/2021"
            + " estabelece.]",
        ]),
  ].join("\n\n")
}

/**
 * O parágrafo da série de preços — Cotação, seção 3 (Art. 23, § 2º).
 *
 * <p>É a "série de preços coletados" que o Art. 3º da IN exige que conste do
 * documento da pesquisa, item a item, com a fonte, a data e quem deu o preço.
 */
export function textoDaSerie(itens: ItemPesquisado[]): string {
  const blocos = itens.map((item) => {
    const linhas = item.coletas.map((c) => {
      const quando = c.coletadoEm.slice(0, 10).split("-").reverse().join("/")
      const quem = c.fornecedor ? ` · ${c.fornecedor}` : ""
      const doc = c.documentoDoFornecedor ? ` (${c.documentoDoFornecedor})` : ""
      const validade = c.validaAte
        ? ` · proposta válida até ${c.validaAte.split("-").reverse().join("/")}`
        : ""
      return `  - ${c.fonte}${quem}${doc} · ${quando} · ${formatBRL(parseValorBR(c.valorUnitario))}${validade}`
    })
    return `${item.item} (${item.precos.length} preço(s) obtido(s)):\n${linhas.join("\n")}`
  })
  return [
    "Os preços a seguir foram obtidos das fontes consultadas, com a identificação da"
      + " origem e a data da coleta, na forma do Art. 3º da IN SEGES/ME nº 65/2021:",
    blocos.join("\n\n"),
  ].join("\n\n")
}

/**
 * O parágrafo da análise crítica — Cotação, seção 4 (Art. 6º da IN).
 *
 * <p>O § 4º torna a análise crítica <b>obrigatória</b>, "especialmente" quando
 * há grande variação. O que a plataforma escreve é o retrato: quantos preços,
 * qual a variação, quais destoam. O juízo sobre descartar fica em colchetes,
 * porque o § 3º exige critério "fundamentado e descrito no processo" — e quem o
 * fundamenta é quem responde pelos autos.
 */
export function textoDaAnaliseCritica(itens: ItemPesquisado[]): string {
  const blocos = itens.map((item) => {
    const variacao =
      item.menor > 0 ? ((item.maior - item.menor) / item.menor) * 100 : 0
    const linhas = [
      `${item.item}: ${item.precos.length} preço(s) obtido(s).`
        + ` Menor ${formatBRL(item.menor)}, maior ${formatBRL(item.maior)},`
        + ` média ${formatBRL(item.media)}, mediana ${formatBRL(item.mediana)}.`
        + ` Variação entre o menor e o maior: ${variacao.toFixed(1).replace(".", ",")}%.`,
    ]
    if (item.serieCurta) {
      linhas.push(
        `  [Justificar a apuração sobre conjunto de menos de três preços: o Art. 6º da`
          + ` IN SEGES/ME nº 65/2021 exige três ou mais, e o § 5º admite menos apenas`
          + ` mediante justificativa do gestor responsável aprovada pela autoridade`
          + ` competente.]`,
      )
    }
    if (item.paraExame.length > 0) {
      const destoantes = item.paraExame
        .map((c) => `${formatBRL(parseValorBR(c.valorUnitario))} (${c.fonte})`)
        .join("; ")
      linhas.push(
        `  Preços que destoam da mediana e merecem exame: ${destoantes}.`
          + ` [Descrever o critério adotado para mantê-los ou desconsiderá-los —`
          + ` o Art. 6º, § 3º exige critério fundamentado e descrito no processo.]`,
      )
    }
    return linhas.join("\n")
  })
  return [
    "Procedeu-se à análise crítica dos preços obtidos, na forma do Art. 6º da"
      + " IN SEGES/ME nº 65/2021:",
    blocos.join("\n\n"),
  ].join("\n\n")
}

/**
 * O parágrafo da metodologia e do preço de referência — Cotação, seção 5.
 *
 * <p>Traz o método aplicado, o preço apurado por item e o total. É a "memória de
 * cálculo do valor estimado" que o Art. 3º exige, e é dela que a estimativa do
 * ETP (Art. 18, § 1º, VI) e a do TR (Art. 6º, XXIII, 'i') passam a sair.
 */
export function textoDoPrecoDeReferencia(
  itens: ItemPesquisado[],
  metodo: MetodoDeApuracao,
  /** A quantidade de cada item, quando a consolidação da demanda a conhece. */
  quantidadePor: (item: string) => number | undefined,
): string {
  let total = 0
  const linhas = itens.map((item) => {
    const unitario = apurar(item, metodo)
    const quantidade = quantidadePor(item.item)
    if (quantidade != null) total += unitario * quantidade
    return (
      `- ${item.item}: ${formatBRL(unitario)}`
      + ` (${ROTULO_DO_METODO[metodo].toLowerCase()}, sobre ${item.precos.length} preço(s))`
      + (quantidade != null
        ? ` × ${quantidade} = ${formatBRL(unitario * quantidade)}`
        : " · [Informar a quantidade deste item na consolidação da demanda.]")
    )
  })
  return [
    `Adotou-se como método de apuração a ${ROTULO_DO_METODO[metodo].toLowerCase()},`
      + " na forma do Art. 6º da IN SEGES/ME nº 65/2021, resultando nos seguintes preços"
      + " de referência:",
    linhas.join("\n"),
    `Preço de referência total da contratação: ${formatBRL(total)}.`,
  ].join("\n\n")
}

/** A linha que a memória de cálculo guarda — e de onde o método volta. */
const PREFIXO_DO_METODO = "Adotou-se como método de apuração a"

/**
 * O método escolhido, lido da memória de cálculo já gravada.
 *
 * <p>Mesma escolha da fonte de pesquisa (§70): o método não tem armazenamento
 * próprio, ele **é** o texto da seção. Guardá-lo em outro lugar criaria um
 * segundo registro da mesma decisão, e os dois divergiriam.
 */
export function metodoDeclarado(memoria: string): MetodoDeApuracao | null {
  const linha = memoria.split("\n").find((l) => l.trim().startsWith(PREFIXO_DO_METODO))
  if (!linha) return null
  const texto = linha.toLowerCase()
  for (const metodo of ["mediana", "menor", "media"] as MetodoDeApuracao[]) {
    if (texto.includes(ROTULO_DO_METODO[metodo].toLowerCase())) return metodo
  }
  return null
}
