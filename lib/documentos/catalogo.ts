/**
 * Catálogo de documentos — fonte única dos metadados por tipo.
 *
 * Substitui os mapas que antes viviam duplicados no hub, no editor, no wizard,
 * na tela de Documentos, na verificação do DFD e no client. Qualquer tela que
 * precise do título, da cor, do slug, da ordem ou das dependências de um
 * documento lê daqui.
 */

import { secoesPorTipoBase } from "@/lib/documentos/secoes"
import type { FundamentoDaDispensa, Modalidade, TipoDocumento } from "@/lib/types"

export interface MetaDocumento {
  tipo: TipoDocumento
  /** Slug do tipo no editor: /processos/documento?id=<id>&tipo=<slug>. */
  slug: string
  titulo: string
  descricao: string
  /** Posição na ordem canônica do fluxo de contratação (1 = primeiro). */
  ordem: number
  /** Fundamento do documento como um todo, citado literalmente. */
  fundamento: string
  /** Classes de token do DS para o chip do tipo. */
  chip: string
  /** Documentos que precisam estar gerados antes que este possa ser elaborado. */
  requer: TipoDocumento[]
  formato: string
  /** Tamanho aproximado do arquivo gerado, em KB. */
  tamanhoKB: number
  /**
   * Documento de que este é anexo, quando é. O anexo continua sendo um
   * documento próprio — com editor, versões e geração independentes —, mas é
   * divulgado como elemento do principal (Art. 25, § 3º).
   */
  anexoDe?: { tipo: TipoDocumento; fundamento: string }
}

/**
 * Ordem canônica: a Cotação embasa a estimativa de valor do ETP (Art. 18, § 1º,
 * VI); o Mapa de Riscos é concomitante ao ETP; o TR se fundamenta no ETP
 * (Art. 6º, XXIII, 'b'); o Edital tem o TR entre os seus elementos (Art. 25,
 * § 3º); na dispensa por valor, o Aviso de Contratação Direta faz o papel de
 * chamamento (Art. 75, § 3º); e a minuta de contrato consta obrigatoriamente
 * como anexo do edital (Art. 18, VI), vinculada a ele (Art. 92, II).
 */
export const CATALOGO: Record<TipoDocumento, MetaDocumento> = {
  "Cotação": {
    tipo: "Cotação",
    slug: "cotacao",
    titulo: "Cotação de Mercado",
    descricao: "Pesquisa de preços que embasa a estimativa de valor da contratação",
    ordem: 1,
    fundamento: "Art. 23, Lei 14.133/21",
    chip: "bg-doc-cotacao-bg text-doc-cotacao",
    requer: [],
    formato: "DOCX + PDF",
    tamanhoKB: 196,
  },
  ETP: {
    tipo: "ETP",
    slug: "etp",
    titulo: "Estudo Técnico Preliminar",
    descricao: "Fundamenta a necessidade, os requisitos e a viabilidade da contratação",
    ordem: 2,
    fundamento: "Art. 18, § 1º, Lei 14.133/21",
    chip: "bg-doc-etp-bg text-doc-etp",
    requer: [],
    formato: "DOCX + PDF",
    tamanhoKB: 312,
  },
  Mapa: {
    tipo: "Mapa",
    slug: "mapa",
    titulo: "Mapa de Riscos",
    descricao: "Identifica e trata os riscos que podem comprometer a contratação",
    ordem: 3,
    fundamento: "Art. 18, X, Lei 14.133/21",
    chip: "bg-doc-mapa-bg text-doc-mapa",
    requer: [],
    formato: "PDF",
    tamanhoKB: 128,
  },
  TR: {
    tipo: "TR",
    slug: "tr",
    titulo: "Termo de Referência",
    descricao: "Define as condições de execução do objeto e se fundamenta no ETP",
    ordem: 4,
    fundamento: "Art. 6º, XXIII, Lei 14.133/21",
    chip: "bg-doc-tr-bg text-doc-tr",
    requer: ["ETP"],
    formato: "DOCX + PDF",
    tamanhoKB: 348,
    anexoDe: { tipo: "Edital", fundamento: "Art. 25, § 3º, Lei 14.133/21" },
  },
  Edital: {
    tipo: "Edital",
    slug: "edital",
    titulo: "Edital de Licitação",
    descricao: "Convoca os interessados e fixa as regras da fase de seleção",
    ordem: 5,
    fundamento: "Art. 25, Lei 14.133/21",
    chip: "bg-doc-edital-bg text-doc-edital",
    requer: ["TR"],
    formato: "DOCX + PDF",
    tamanhoKB: 424,
  },
  Aviso: {
    tipo: "Aviso",
    slug: "aviso",
    titulo: "Aviso de Contratação Direta",
    descricao: "Divulga a dispensa por valor e busca propostas adicionais por no mínimo 3 dias úteis",
    ordem: 6,
    fundamento: "Art. 75, § 3º, Lei 14.133/21",
    // As cores do Edital: o aviso faz na dispensa o papel que o edital faz na
    // licitação, e os dois nunca aparecem no mesmo processo.
    chip: "bg-doc-edital-bg text-doc-edital",
    requer: ["TR"],
    formato: "DOCX + PDF",
    tamanhoKB: 180,
  },
  Contrato: {
    tipo: "Contrato",
    slug: "contrato",
    titulo: "Minuta de Contrato",
    descricao: "Reúne as cláusulas necessárias e integra os anexos do edital",
    ordem: 7,
    fundamento: "Art. 92, Lei 14.133/21",
    chip: "bg-doc-contrato-bg text-doc-contrato",
    requer: ["TR"],
    formato: "DOCX + PDF",
    tamanhoKB: 386,
    anexoDe: { tipo: "Edital", fundamento: "Art. 18, VI, Lei 14.133/21" },
  },
}

/** Todos os tipos na ordem canônica do fluxo. */
export const ORDEM_FLUXO: TipoDocumento[] = (Object.values(CATALOGO) as MetaDocumento[])
  .sort((a, b) => a.ordem - b.ordem)
  .map((m) => m.tipo)

/**
 * Documentos cabíveis a cada modalidade.
 *
 * Contratação direta (Dispensa e Inexigibilidade) não gera edital de licitação:
 * o Art. 72 instrui o processo com DFD, ETP *quando for o caso*, TR, estimativa
 * de despesa, parecer jurídico e autorização. Por isso o ETP é opcional e o
 * Edital não é oferecido. No Credenciamento (Art. 79), o edital é o de
 * chamamento público.
 *
 * `recomendados` são opcionais que já vêm marcados. A minuta de contrato é
 * opcional porque o instrumento pode ser substituído por nota de empenho nas
 * compras com entrega imediata e integral (Art. 95, II) — mas, quando existe,
 * consta obrigatoriamente como anexo do edital (Art. 18, VI), e por isso vem
 * marcada nas licitações em que o contrato é a regra. No Leilão e no Concurso
 * fica desmarcada: a alienação se resolve na arrematação, e o concurso, no
 * prêmio e na cessão dos direitos.
 *
 * O Aviso de Contratação Direta é da dispensa por valor (Art. 75, I e II): é
 * dela que o § 3º fala, e por isso `documentosDaModalidade` só o oferece quando
 * o processo declara um desses incisos. Vem marcado porque a lei pede que a
 * contratação seja "preferencialmente" precedida dele.
 */
export const REGRA_MODALIDADE: Record<
  Modalidade,
  { obrigatorios: TipoDocumento[]; opcionais: TipoDocumento[]; recomendados: TipoDocumento[] }
> = {
  "Pregão Eletrônico": { obrigatorios: ["ETP", "TR", "Edital"], opcionais: ["Cotação", "Mapa", "Contrato"], recomendados: ["Contrato"] },
  "Concorrência": { obrigatorios: ["ETP", "TR", "Edital"], opcionais: ["Cotação", "Mapa", "Contrato"], recomendados: ["Contrato"] },
  "Diálogo Competitivo": { obrigatorios: ["ETP", "TR", "Edital"], opcionais: ["Cotação", "Mapa", "Contrato"], recomendados: ["Contrato"] },
  "Credenciamento": { obrigatorios: ["ETP", "TR", "Edital"], opcionais: ["Cotação", "Mapa", "Contrato"], recomendados: ["Contrato"] },
  "Concurso": { obrigatorios: ["ETP", "Edital"], opcionais: ["Cotação", "Mapa", "TR", "Contrato"], recomendados: [] },
  "Leilão": { obrigatorios: ["Edital"], opcionais: ["Cotação", "Mapa", "ETP", "TR", "Contrato"], recomendados: [] },
  "Dispensa Art. 75": { obrigatorios: ["TR"], opcionais: ["ETP", "Cotação", "Mapa", "Aviso", "Contrato"], recomendados: ["Aviso"] },
  "Inexigibilidade": { obrigatorios: ["TR"], opcionais: ["ETP", "Cotação", "Mapa", "Contrato"], recomendados: [] },
}

/** O Art. 75, § 3º fala das contratações dos incisos I e II: a dispensa por valor. */
export function ehDispensaPorValor(fundamento: FundamentoDaDispensa | undefined): boolean {
  return fundamento === "VALUE_ENGINEERING" || fundamento === "VALUE_GENERAL"
}

/**
 * Tipos cabíveis à modalidade (obrigatórios + opcionais), na ordem do fluxo.
 *
 * @param fundamento o inciso declarado na dispensa; sem ele, o Aviso de
 *                   Contratação Direta não é oferecido, porque só a dispensa
 *                   por valor o prevê (Art. 75, § 3º)
 */
export function documentosDaModalidade(
  modalidade: Modalidade,
  fundamento?: FundamentoDaDispensa
): TipoDocumento[] {
  const regra = REGRA_MODALIDADE[modalidade]
  return ordenar([...regra.obrigatorios, ...regra.opcionais]).filter(
    (tipo) => tipo !== "Aviso" || ehDispensaPorValor(fundamento)
  )
}

export function ehObrigatorio(modalidade: Modalidade, tipo: TipoDocumento): boolean {
  return REGRA_MODALIDADE[modalidade].obrigatorios.includes(tipo)
}

/** Reordena uma lista de tipos segundo a ordem canônica do fluxo. */
export function ordenar(tipos: TipoDocumento[]): TipoDocumento[] {
  return [...tipos].sort((a, b) => CATALOGO[a].ordem - CATALOGO[b].ordem)
}

export interface GrupoDeDocumentos {
  tipo: TipoDocumento
  /** Anexos apresentados sob o documento, na ordem do fluxo. */
  anexos: TipoDocumento[]
}

/**
 * Agrupa os documentos para exibição: o anexo elaborado depois do principal
 * aparece sob ele.
 *
 * A minuta de contrato vem sob o Edital, de que é anexo (Art. 18, VI). O TR
 * também é anexo do Edital, mas é elaborado antes e o fundamenta — sob o Edital
 * ele esconderia a ordem do fluxo, então mantém o próprio lugar. Sem o
 * principal no processo (na Dispensa não há Edital), o anexo fica solto.
 */
export function agruparAnexos(tipos: TipoDocumento[]): GrupoDeDocumentos[] {
  const ordenados = ordenar(tipos)
  const sob = (tipo: TipoDocumento): TipoDocumento | undefined => {
    const principal = CATALOGO[tipo].anexoDe?.tipo
    return principal && ordenados.includes(principal) && CATALOGO[principal].ordem < CATALOGO[tipo].ordem
      ? principal
      : undefined
  }
  return ordenados
    .filter((tipo) => sob(tipo) === undefined)
    .map((tipo) => ({ tipo, anexos: ordenados.filter((t) => sob(t) === tipo) }))
}

/** Numeração romana dos anexos, como o edital os cita. */
function romano(n: number): string {
  const tabela: Array<[number, string]> = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  let resto = n
  let texto = ""
  for (const [valor, simbolo] of tabela) {
    while (resto >= valor) {
      texto += simbolo
      resto -= valor
    }
  }
  return texto
}

export interface AnexoDoArquivo {
  tipo: TipoDocumento
  /** "I", "II" — a numeração com que o anexo sai impresso. */
  numero: string
  versao: number
}

/**
 * Os anexos que saem dentro do arquivo do documento, e os que vão ficar de fora.
 *
 * Espelha a regra do servidor (ADR-040 do back-end): entra o anexo que o
 * processo contém e que já foi gerado, na ordem do fluxo, com a versão vigente;
 * a numeração acompanha o que entrou. O que o processo contém e ainda não foi
 * gerado fica de fora — e a geração não trava, só avisa.
 *
 * @param gerados os documentos do processo que já têm versão gerada
 */
export function anexosDoArquivo(
  tipo: TipoDocumento,
  doProcesso: TipoDocumento[],
  gerados: Array<{ tipo: TipoDocumento; versao: number }>
): { incluidos: AnexoDoArquivo[]; faltando: TipoDocumento[] } {
  const incluidos: AnexoDoArquivo[] = []
  const faltando: TipoDocumento[] = []
  const anexos = ORDEM_FLUXO.filter((t) => CATALOGO[t].anexoDe?.tipo === tipo && doProcesso.includes(t))
  for (const anexo of anexos) {
    const versoes = gerados.filter((g) => g.tipo === anexo).map((g) => g.versao)
    if (versoes.length === 0) {
      faltando.push(anexo)
    } else {
      incluidos.push({ tipo: anexo, numero: romano(incluidos.length + 1), versao: Math.max(...versoes) })
    }
  }
  return { incluidos, faltando }
}

/** Resolve o slug da URL para o tipo. Retorna undefined se o slug não existir. */
export function porSlug(slug: string): TipoDocumento | undefined {
  return ORDEM_FLUXO.find((tipo) => CATALOGO[tipo].slug === slug)
}

/**
 * Dependências que ainda travam o documento. Vazio = liberado para elaborar.
 *
 * Só trava o que o processo de fato contém: no Leilão, por exemplo, o Edital é
 * obrigatório e não há TR (a avaliação do bem faz esse papel), então o Edital
 * não pode ficar esperando um documento que o processo nunca terá.
 */
export function pendencias(
  tipo: TipoDocumento,
  doProcesso: TipoDocumento[],
  gerados: TipoDocumento[]
): TipoDocumento[] {
  return CATALOGO[tipo].requer.filter((dep) => doProcesso.includes(dep) && !gerados.includes(dep))
}

/** Número de seções do documento — usado pelo wizard e pelo painel de fases. */
export function totalSecoes(tipo: TipoDocumento): number {
  return secoesPorTipoBase[tipo].length
}
