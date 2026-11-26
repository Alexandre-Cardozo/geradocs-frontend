import { CATALOGO, ORDEM_FLUXO, regraDe } from "@/lib/documentos"
import { rotuloDaModalidade } from "@/lib/dominio"
import type { FormaDaDispensa, Modalidade, TipoDocumento } from "@/lib/types"

/**
 * Os documentos que a landing desenha (§125). Título, fundamento e cor
 * vêm do catálogo; aqui só entra o que é da vitrine: a frase do que o documento
 * entrega e o miolo que a folha desenha.
 */

/** O que a folha desenha no corpo, conforme o tipo. */
export type MioloDaFolha = "precos" | "incisos" | "matriz" | "alineas" | "anexos" | "clausulas" | "aviso"

const VITRINE: Record<TipoDocumento, { entrega: string; miolo: MioloDaFolha }> = {
  "Cotação": {
    entrega: "Série de preços com fonte, data e comprovante, e o preço de referência pela média, mediana ou menor valor.",
    miolo: "precos",
  },
  ETP: {
    entrega: "Treze seções, uma por inciso, com quantidades, estimativa de valor e previsão no PCA lidas do processo.",
    miolo: "incisos",
  },
  Mapa: {
    entrega: "Riscos identificados, avaliados e tratados, com a matriz que alimenta a cláusula do contrato.",
    miolo: "matriz",
  },
  TR: {
    entrega: "As dez alíneas da lei ou a minuta da AGU de compras ou de serviços e obras, fundamentadas no ETP.",
    miolo: "alineas",
  },
  Edital: {
    entrega: "A minuta da AGU da modalidade, já com o TR e a minuta de contrato anexados, cada um em folha própria.",
    miolo: "anexos",
  },
  Aviso: {
    entrega: "O chamamento da dispensa com disputa, com base na minuta da AGU e fundamentado no TR.",
    miolo: "aviso",
  },
  Contrato: {
    entrega: "As cláusulas do Art. 92 ou a minuta da AGU adequada à natureza do objeto, como anexo do Edital.",
    miolo: "clausulas",
  },
}

export type DocumentoDaVitrine = {
  tipo: TipoDocumento
  titulo: string
  fundamento: string
  chip: string
  formato: string
  entrega: string
  miolo: MioloDaFolha
}

/** Todo documento da fase preparatória pode ser gerado nos dois formatos, com o timbre da entidade. */
export const FORMATO_DOS_DOCUMENTOS = "DOCX + PDF"

/** Um documento como a vitrine o desenha. */
export function documentoDaVitrine(tipo: TipoDocumento): DocumentoDaVitrine {
  const { titulo, fundamento, chip } = CATALOGO[tipo]
  return { tipo, titulo, fundamento, chip, formato: FORMATO_DOS_DOCUMENTOS, ...VITRINE[tipo] }
}

/** Os sete documentos, na ordem do fluxo. */
export const DOCUMENTOS_DA_VITRINE: DocumentoDaVitrine[] = ORDEM_FLUXO.map(documentoDaVitrine)

/**
 * O que a plataforma gera além dos sete tipos (§125): a juntada dos autos, que
 * reúne os documentos gerados num arquivo só, e a errata da retificação.
 */
export type ExtraDaVitrine = { id: "juntada" | "errata"; titulo: string; fundamento: string; formato: string; entrega: string }

export const EXTRAS_DA_VITRINE: ExtraDaVitrine[] = [
  {
    id: "juntada",
    titulo: "Juntada dos Autos",
    fundamento: "Arquivo único para o protocolo",
    formato: FORMATO_DOS_DOCUMENTOS,
    entrega: "Os documentos gerados que o servidor escolhe, na ordem dos autos, reunidos num arquivo pronto para instruir o processo.",
  },
  {
    id: "errata",
    titulo: "Errata",
    fundamento: "Retificação declarada",
    formato: "Onde se lê / Leia-se",
    entrega: "A comparação entre duas versões geradas, linha a linha, para publicar a correção quando o documento é retificado.",
  },
]

/** O papel de cada documento numa modalidade. `fora` é o que a modalidade não comporta. */
export type PapelNaModalidade = "obrigatorio" | "recomendado" | "opcional" | "fora"

/** Uma forma de contratar, como o processo a declara. */
export type FormaDeContratar = { modalidade: Modalidade; forma?: FormaDaDispensa }

/**
 * Uma opção do seletor. Formas que recebem exatamente os mesmos documentos
 * viram uma opção só, para que cada clique mude o que se vê.
 */
export type OpcaoDeModalidade = { id: string; rotulo: string; formas: FormaDeContratar[] }

/** As formas de contratar, na ordem em que o seletor as apresenta. */
const FORMAS: FormaDeContratar[] = [
  { modalidade: "Pregão Eletrônico" },
  { modalidade: "Concorrência" },
  { modalidade: "Diálogo Competitivo" },
  { modalidade: "Dispensa Art. 75", forma: "DISPUTE" },
  { modalidade: "Dispensa Art. 75", forma: "DIRECT" },
  { modalidade: "Inexigibilidade" },
  { modalidade: "Credenciamento" },
  { modalidade: "Concurso" },
  { modalidade: "Leilão" },
]

/** "A", "A e B", "A, B e C". */
function juntar(rotulos: string[]): string {
  return rotulos.length > 1 ? `${rotulos.slice(0, -1).join(", ")} e ${rotulos[rotulos.length - 1]}` : rotulos.join("")
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Agrupa as formas pela lista de documentos que recebem, na ordem da primeira de cada grupo. */
export function agruparFormas(formas: FormaDeContratar[]): OpcaoDeModalidade[] {
  const grupos = new Map<string, FormaDeContratar[]>()
  for (const f of formas) {
    const chave = papeisNaModalidade(f.modalidade, f.forma)
      .map((d) => d.papel)
      .join()
    grupos.set(chave, [...(grupos.get(chave) ?? []), f])
  }
  return [...grupos.values()].map((grupo) => {
    const rotulo = juntar(grupo.map((f) => rotuloDaModalidade(f.modalidade, f.forma)))
    return { id: slug(rotulo), rotulo, formas: grupo }
  })
}

export const OPCOES_DE_MODALIDADE = agruparFormas(FORMAS) as [OpcaoDeModalidade, ...OpcaoDeModalidade[]]

/** A opção que o seletor mostra antes da escolha: a do pregão, a mais comum. */
export const OPCAO_INICIAL = OPCOES_DE_MODALIDADE[0]

/** O papel de cada um dos sete documentos na forma de contratar escolhida, na ordem do fluxo. */
export function papeisNaModalidade(
  modalidade: Modalidade,
  forma?: FormaDaDispensa,
): { tipo: TipoDocumento; titulo: string; papel: PapelNaModalidade }[] {
  const regra = regraDe(modalidade, forma)
  return ORDEM_FLUXO.map((tipo) => {
    const papel: PapelNaModalidade = regra.obrigatorios.includes(tipo)
      ? "obrigatorio"
      : regra.recomendados.includes(tipo)
        ? "recomendado"
        : regra.opcionais.includes(tipo)
          ? "opcional"
          : "fora"
    return { tipo, titulo: CATALOGO[tipo].titulo, papel }
  })
}
