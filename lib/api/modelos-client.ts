import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { TipoDocumento } from "@/lib/types";

/**
 * As minutas da AGU e os modelos próprios do órgão (ADR-056 do back-end).
 *
 * <p>O modelo do órgão parte de uma minuta da AGU: as seções são as dela, e o
 * órgão escreve o texto-padrão de cada uma e a justificativa de não segui-la
 * como publicada (Art. 19, § 2º, Lei 14.133/21). Todo servidor consulta; só o
 * coordenador publica, cria versão e desativa.
 */

/** Os tipos do contrato são maiúsculos sem acento; a interface usa o rótulo. */
const TIPOS: Record<string, TipoDocumento> = {
  COTACAO: "Cotação",
  ETP: "ETP",
  MAPA: "Mapa",
  TR: "TR",
  EDITAL: "Edital",
  AVISO: "Aviso",
  CONTRATO: "Contrato",
};

interface ResumoApi {
  code: string;
  version: string;
  documentType: string;
  title: string;
  description: string;
  publishedIn: string;
  source: string;
  sectionCount: number;
}

interface DoOrgaoApi {
  code: string;
  version: string;
  documentType: string;
  title: string;
  description: string;
  publishedIn: string;
  justification: string;
  baseCode: string;
  baseVersion: string;
  active: boolean;
  createdByName: string;
  createdAt: string;
  newerBase?: ResumoApi | null;
}

interface DetalheApi {
  code: string;
  version: string;
  documentType: string;
  title: string;
  description: string;
  publishedIn: string;
  source: string;
  justification?: string | null;
  sections: {
    code: string;
    number: string;
    title: string;
    legalBasis: string;
    hint: string;
    required: boolean;
    modelText?: string | null;
    notes: string[];
  }[];
}

export interface MinutaDaAgu {
  codigo: string;
  versao: string;
  tipo: TipoDocumento;
  titulo: string;
  descricao: string;
  publicadoEm: string;
  quantidadeDeSecoes: number;
}

export interface ModeloDoOrgao {
  codigo: string;
  versao: string;
  tipo: TipoDocumento;
  titulo: string;
  descricao: string;
  publicadoEm: string;
  justificativa: string;
  codigoDaBase: string;
  versaoDaBase: string;
  ativo: boolean;
  publicadoPor: string;
  /** A AGU publicou versão mais nova da minuta de base depois deste modelo. */
  baseMaisNova?: MinutaDaAgu;
}

export interface DetalheDoModelo {
  codigo: string;
  versao: string;
  tipo: TipoDocumento;
  titulo: string;
  descricao: string;
  publicadoEm: string;
  doOrgao: boolean;
  justificativa?: string;
  secoes: {
    /** O código da seção na minuta da AGU — é por ele que o texto do órgão é gravado. */
    codigo: string;
    numero: string;
    titulo: string;
    fundamentoLegal: string;
    texto: string;
    notas: string[];
  }[];
}

/** O que o coordenador escreve no modelo do órgão. */
export interface DadosDoModelo {
  titulo: string;
  descricao: string;
  justificativa: string;
  /** O texto-padrão de cada seção, pelo código da seção da AGU. */
  textos: Record<string, string>;
}

function minuta(api: ResumoApi): MinutaDaAgu {
  return {
    codigo: api.code,
    versao: api.version,
    tipo: TIPOS[api.documentType] as TipoDocumento,
    titulo: api.title,
    descricao: api.description,
    publicadoEm: api.publishedIn,
    quantidadeDeSecoes: api.sectionCount,
  };
}

/**
 * O código da seção na minuta da AGU.
 *
 * <p>No modelo do órgão a seção ganha um "O" na frente (`OPC01`), para o texto
 * dele não cair em cima do da AGU; o pedido de gravação usa o código da AGU.
 * Nenhuma minuta da AGU tem código que comece com "O".
 */
export function codigoNaMinuta(codigo: string, doOrgao: boolean): string {
  return doOrgao && codigo.startsWith("O") ? codigo.slice(1) : codigo;
}

export async function listarModelos(): Promise<{ agu: MinutaDaAgu[]; doOrgao: ModeloDoOrgao[] }> {
  const catalogo = await requisicaoProtegida<{ agu: ResumoApi[]; organization: DoOrgaoApi[] }>("/structure-models");
  return {
    agu: catalogo.agu.map(minuta),
    doOrgao: catalogo.organization.map((modelo) => ({
      codigo: modelo.code,
      versao: modelo.version,
      tipo: TIPOS[modelo.documentType] as TipoDocumento,
      titulo: modelo.title,
      descricao: modelo.description,
      publicadoEm: modelo.publishedIn,
      justificativa: modelo.justification,
      codigoDaBase: modelo.baseCode,
      versaoDaBase: modelo.baseVersion,
      ativo: modelo.active,
      publicadoPor: modelo.createdByName,
      ...(modelo.newerBase ? { baseMaisNova: minuta(modelo.newerBase) } : {}),
    })),
  };
}

export async function detalheDoModelo(codigo: string): Promise<DetalheDoModelo> {
  const modelo = await requisicaoProtegida<DetalheApi>(`/structure-models/${encodeURIComponent(codigo)}`);
  const doOrgao = modelo.source !== "AGU";
  return {
    codigo: modelo.code,
    versao: modelo.version,
    tipo: TIPOS[modelo.documentType] as TipoDocumento,
    titulo: modelo.title,
    descricao: modelo.description,
    publicadoEm: modelo.publishedIn,
    doOrgao,
    ...(modelo.justification ? { justificativa: modelo.justification } : {}),
    secoes: modelo.sections.map((secao) => ({
      codigo: codigoNaMinuta(secao.code, doOrgao),
      numero: secao.number,
      titulo: secao.title,
      fundamentoLegal: secao.legalBasis,
      texto: secao.modelText ?? "",
      notas: secao.notes,
    })),
  };
}

function corpo(dados: DadosDoModelo) {
  return {
    title: dados.titulo,
    description: dados.descricao,
    justification: dados.justificativa,
    sections: Object.entries(dados.textos).map(([code, text]) => ({ code, text })),
  };
}

/** Publica o modelo do órgão sobre a minuta da AGU. */
export async function publicarModelo(entrada: { base: string; dados: DadosDoModelo }): Promise<void> {
  await requisicaoProtegida<DetalheApi>("/structure-models", {
    method: "POST",
    body: JSON.stringify({ baseCode: entrada.base, ...corpo(entrada.dados) }),
  });
}

/** Publica a versão seguinte; os documentos que usam a anterior continuam nela. */
export async function publicarVersaoDoModelo(entrada: { codigo: string; dados: DadosDoModelo }): Promise<void> {
  await requisicaoProtegida<DetalheApi>(`/structure-models/${encodeURIComponent(entrada.codigo)}`, {
    method: "PUT",
    body: JSON.stringify(corpo(entrada.dados)),
  });
}

/** Tira o modelo das opções; quem já o usa continua com ele. */
export async function desativarModelo(codigo: string): Promise<void> {
  await requisicaoProtegida<void>(`/structure-models/${encodeURIComponent(codigo)}`, { method: "DELETE" });
}
