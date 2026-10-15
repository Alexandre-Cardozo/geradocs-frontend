/**
 * A estimativa de valor do processo e a memória de cálculo que a descreve.
 *
 * <p>A forma de cálculo e a fonte de pesquisa de preços são do **processo**
 * (ADR-051 do back-end): ETP, TR e Cotação apuram pela mesma escolha. A memória
 * de cálculo continua sendo o texto que cada documento imprime — e por isso
 * pode ficar para trás quando a escolha muda. Estas funções dizem quando isso
 * aconteceu e como pôr o texto em dia, sem reescrever o resto do que a pessoa
 * escreveu.
 */
import { PREFIXO_DA_FONTE, fonteDeclarada, fundamentoDaFonte } from "@/lib/dominio/fontes-de-preco"
import {
  PREFIXO_DO_METODO,
  ROTULO_DO_METODO,
  metodoDeclarado,
} from "@/lib/dominio/pesquisa-de-precos"
import type { MetodoDaEstimativa, TipoDocumento } from "@/lib/types"

const METODOS = Object.keys(ROTULO_DO_METODO) as MetodoDaEstimativa[]

/** O rótulo como ele aparece no meio da frase: "mediana dos preços obtidos". */
function noTexto(metodo: MetodoDaEstimativa): string {
  return ROTULO_DO_METODO[metodo].toLowerCase()
}

/** A linha da fonte, com o fundamento quando ela é um dos parâmetros da lei. */
export function linhaDaFonte(fonte: string): string {
  const fundamento = fundamentoDaFonte(fonte)
  return `${PREFIXO_DA_FONTE} ${fonte}${fundamento ? ` (${fundamento})` : ""}.`
}

/** A frase do método, na forma do Art. 6º da IN SEGES/ME nº 65/2021. */
export function linhaDoMetodo(metodo: MetodoDaEstimativa): string {
  return `${PREFIXO_DO_METODO} ${noTexto(metodo)}, na forma do Art. 6º da IN SEGES/ME nº 65/2021.`
}

/**
 * O método que a memória cita.
 *
 * <p>A frase "Adotou-se como método…" vale primeiro. Sem ela, vale o rótulo que
 * aparece no texto — a memória do ETP o escreve item a item ("mediana dos
 * preços obtidos de 3 preço(s) coletado(s)"). Dois métodos citados não é
 * nenhum: a memória não diz qual prevalece.
 */
export function metodoCitado(memoria: string): MetodoDaEstimativa | null {
  const declarado = metodoDeclarado(memoria)
  if (declarado) return declarado
  const texto = memoria.toLowerCase()
  const [unico, ...outros] = METODOS.filter((metodo) => texto.includes(noTexto(metodo)))
  return unico && outros.length === 0 ? unico : null
}

export type Divergencia = "ausente" | "diferente" | null

export interface DivergenciasDaMemoria {
  fonte: Divergencia
  metodo: Divergencia
}

/**
 * Onde a memória discorda da estimativa do processo.
 *
 * <p>Memória em branco não diverge: ainda não há texto a pôr em dia. O método
 * ausente só conta quando há preços coletados — sem pesquisa, o preço é o
 * preliminar do DFD e o método não muda nada que a memória precise dizer.
 */
export function divergenciasDaMemoria(
  memoria: string,
  estimativa: { metodo?: MetodoDaEstimativa; fonte?: string } | undefined,
  comPesquisa: boolean,
): DivergenciasDaMemoria {
  if (memoria.trim() === "" || !estimativa) return { fonte: null, metodo: null }
  let fonte: Divergencia = null
  if (estimativa.fonte) {
    const declarada = fonteDeclarada(memoria)
    fonte = declarada == null ? "ausente" : declarada === estimativa.fonte ? null : "diferente"
  }
  let metodo: Divergencia = null
  if (estimativa.metodo) {
    const citado = metodoCitado(memoria)
    if (citado != null) metodo = citado === estimativa.metodo ? null : "diferente"
    else if (comPesquisa) metodo = "ausente"
  }
  return { fonte, metodo }
}

/**
 * A memória posta em dia com a estimativa do processo.
 *
 * <p>Só mexe no que diverge: a linha da fonte é trocada (ou acrescentada ao
 * fim), e o método é trocado onde é citado (ou a frase dele é acrescentada).
 * O resto do texto fica como a pessoa escreveu.
 */
export function memoriaEmDia(
  memoria: string,
  estimativa: { metodo?: MetodoDaEstimativa; fonte?: string },
  divergencias: DivergenciasDaMemoria,
): string {
  let texto = memoria
  if (divergencias.metodo === "diferente" && estimativa.metodo) {
    const novo = noTexto(estimativa.metodo)
    for (const metodo of METODOS) {
      if (metodo !== estimativa.metodo) texto = texto.split(noTexto(metodo)).join(novo)
    }
  }
  if (divergencias.metodo === "ausente" && estimativa.metodo) {
    texto = `${texto.trimEnd()}\n\n${linhaDoMetodo(estimativa.metodo)}`
  }
  if (divergencias.fonte && estimativa.fonte) {
    const linha = linhaDaFonte(estimativa.fonte)
    const linhas = texto.split("\n")
    const indice = linhas.findIndex((l) => l.trim().startsWith(PREFIXO_DA_FONTE))
    if (indice >= 0) {
      linhas[indice] = linha
      texto = linhas.join("\n")
    } else {
      texto = `${texto.trimEnd()}\n\n${linha}`
    }
  }
  return texto
}

/** O que a capa e o seletor dizem da estimativa: "Mediana · Painel de Preços". */
export function resumoDaEstimativa(
  estimativa: { metodo?: MetodoDaEstimativa; fonte?: string } | undefined,
): string | null {
  const partes = [
    estimativa?.metodo ? ROTULO_DO_METODO[estimativa.metodo].replace(" dos preços obtidos", "") : null,
    estimativa?.fonte ?? null,
  ].filter((parte): parte is string => parte != null)
  return partes.length === 0 ? null : partes.join(" · ")
}

/** Os documentos que estimam o valor da contratação — e que a escolha alcança. */
export const DOCUMENTOS_DA_ESTIMATIVA: readonly TipoDocumento[] = ["Cotação", "ETP", "TR"]

/** Dos documentos do processo, os que a estimativa alcança, na ordem do processo. */
export function documentosDaEstimativa(doProcesso: readonly TipoDocumento[]): TipoDocumento[] {
  return doProcesso.filter((tipo) => DOCUMENTOS_DA_ESTIMATIVA.includes(tipo))
}

/** "ETP", "ETP e TR", "Cotação, ETP e TR". */
export function enumerar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join("")
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`
}
