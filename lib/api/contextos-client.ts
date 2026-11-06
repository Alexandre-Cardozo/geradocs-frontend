import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { NaturezaDoObjeto, TipoDocumento } from "@/lib/types";

/**
 * Os contextos da contratação de um processo (ADR-061 do back-end).
 *
 * O que o objeto tem de específico (motorista, locação, mão de obra dedicada)
 * e os tópicos que isso exige dos documentos. Quem declara é o servidor: a
 * plataforma não sugere nem marca nada, e o tópico do contexto marcado entra
 * sozinho no documento.
 */

type TipoDaApi = "COTACAO" | "ETP" | "MAPA" | "TR" | "EDITAL" | "AVISO" | "CONTRATO";

const TIPO: Record<TipoDaApi, TipoDocumento> = {
  COTACAO: "Cotação",
  ETP: "ETP",
  MAPA: "Mapa",
  TR: "TR",
  EDITAL: "Edital",
  AVISO: "Aviso",
  CONTRATO: "Contrato",
};

interface ContextoApi {
  code: string;
  title: string;
  description: string;
  confirmed: boolean;
  confirmedAt?: string | null;
  topics: { code: string; documentType: TipoDaApi; anchorSectionCode: string; title: string; legalBasis: string }[];
}

type TopicoApi = ContextoApi["topics"][number];

interface ContextosApi {
  catalogVersion: string;
  contexts: ContextoApi[];
  natures?: { nature: NaturezaDoObjeto; label: string; topics: TopicoApi[] }[];
}

/** Um tópico que o contexto exige, e onde ele entra. */
export interface TopicoDoContexto {
  codigo: string;
  documento: TipoDocumento;
  /** A seção do catálogo sob a qual o tópico entra, como subtópico. */
  ancora: string;
  titulo: string;
  fundamentoLegal: string;
}

export interface ContextoDaContratacao {
  codigo: string;
  titulo: string;
  descricao: string;
  confirmado: boolean;
  /** ISO-8601; ausente quando não está confirmado. */
  confirmadoEm?: string;
  topicos: TopicoDoContexto[];
}

export interface ContextosDoProcesso {
  /** A versão do catálogo curado, que vai junto com cada confirmação. */
  versaoDoCatalogo: string;
  /** Todo o catálogo, na ordem dele. */
  contextos: ContextoDaContratacao[];
  /**
   * Os tópicos que cada natureza do objeto traz sozinha ao documento: a
   * natureza também é contexto, e não se declara duas vezes.
   */
  topicosDaNatureza: Partial<Record<NaturezaDoObjeto, TopicoDoContexto[]>>;
}

function topico(topico: TopicoApi): TopicoDoContexto {
  return {
    codigo: topico.code,
    documento: TIPO[topico.documentType],
    ancora: topico.anchorSectionCode,
    titulo: topico.title,
    fundamentoLegal: topico.legalBasis,
  };
}

function rota(processoId: string): string {
  return `/procurement-processes/${encodeURIComponent(processoId)}/contracting-contexts`;
}

function mapear(resposta: ContextosApi): ContextosDoProcesso {
  return {
    versaoDoCatalogo: resposta.catalogVersion,
    contextos: resposta.contexts.map((contexto) => ({
      codigo: contexto.code,
      titulo: contexto.title,
      descricao: contexto.description,
      confirmado: contexto.confirmed,
      ...(contexto.confirmedAt ? { confirmadoEm: contexto.confirmedAt } : {}),
      topicos: contexto.topics.map(topico),
    })),
    topicosDaNatureza: Object.fromEntries(
      (resposta.natures ?? []).map((natureza) => [natureza.nature, natureza.topics.map(topico)]),
    ),
  };
}

/** O catálogo de contextos visto do processo, com os declarados. */
export async function contextosDoProcesso(processoId: string): Promise<ContextosDoProcesso> {
  return mapear(await requisicaoProtegida<ContextosApi>(rota(processoId)));
}

/**
 * Passa a valer exatamente a lista informada; vazia retira todos. Vai para a
 * trilha do processo quando muda alguma coisa.
 */
export async function confirmarContextos(processoId: string, codigos: string[]): Promise<ContextosDoProcesso> {
  return mapear(
    await requisicaoProtegida<ContextosApi>(rota(processoId), {
      method: "PUT",
      body: JSON.stringify({ codes: codigos }),
    }),
  );
}
