import "client-only";

import { baixarProtegido, requisicaoProtegida } from "@/lib/api/auth-client";
import { ordenar } from "@/lib/documentos";
import { parseValorBR } from "@/lib/format";
import type {
  Modalidade,
  NovoProcessoInput,
  Processo,
  StatusProcesso,
  TipoDocumento,
  EventoDoProcesso,
  EventoProcesso,
} from "@/lib/types";

const modalidades: Record<Modalidade, string> = {
  "Pregão Eletrônico": "ELECTRONIC_AUCTION",
  Concorrência: "COMPETITION",
  Concurso: "CONTEST",
  Leilão: "AUCTION",
  "Diálogo Competitivo": "COMPETITIVE_DIALOGUE",
  "Dispensa Art. 75": "DIRECT_AWARD_ARTICLE_75",
  Inexigibilidade: "SOLE_SOURCE",
  Credenciamento: "ACCREDITATION",
};

const modalidadesDaApi = Object.fromEntries(
  Object.entries(modalidades).map(([chave, valor]) => [valor, chave]),
) as Record<string, Modalidade>;

interface ProcessoApi {
  id: string;
  processNumber: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  responsibleUserName: string;
  objectDescription: string;
  demandObject?: string;
  modality: string;
  estimatedValue: number;
  legalBasis?: string;
  urgency: boolean;
  documents: TipoDocumento[];
  dfdFileName?: string;
  status: "DRAFT" | "CLOSED";
  closedAt?: string;
  closureNote?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Os tipos do contrato são maiúsculos sem acento; a interface usa o rótulo. */
const tipos: Record<TipoDocumento, string> = {
  "Cotação": "COTACAO",
  ETP: "ETP",
  Mapa: "MAPA",
  TR: "TR",
  Edital: "EDITAL",
  Contrato: "CONTRATO",
};

const tiposDaApi = Object.fromEntries(
  Object.entries(tipos).map(([chave, valor]) => [valor, chave]),
) as Record<string, TipoDocumento>;

interface PaginaApi {
  content: ProcessoApi[];
  totalElements: number;
  number: number;
  totalPages: number;
}

function mapear(item: ProcessoApi): Processo {
  const modalidade = modalidadesDaApi[item.modality];
  if (!modalidade) {
    throw new Error("A API retornou uma modalidade de processo desconhecida.");
  }

  return {
    id: item.id,
    prefeituraId: item.organizationId,
    objeto: item.objectDescription,
    objetoDemanda: item.demandObject,
    modalidade,
    secretaria: item.departmentName,
    status: item.status === "CLOSED" ? "concluido" : "rascunho",
    encerradoEm: item.closedAt,
    justificativaEncerramento: item.closureNote,
    valorEstimado: Number(item.estimatedValue),
    responsavel: item.responsibleUserName,
    criadoEm: item.createdAt,
    atualizadoEm: item.updatedAt,
    etpStatus: "Não iniciado",
    trStatus: "Não iniciado",
    documentos: ordenar(item.documents.map((tipo) => tiposDaApi[tipo] as TipoDocumento)),
    fundamentoLegal: item.legalBasis,
    ata: null,
    fases: { verificacaoDFD: false, retificacao: false },
    dfdArquivo: item.dfdFileName ?? null,
    urgente: item.urgency,
    versao: item.version,
  };
}

export async function listarProcessos(params: {
  busca?: string;
  status?: StatusProcesso | "todos";
  pagina?: number;
  porPagina?: number;
}) {
  const status = params.status;
  if (status && status !== "todos" && status !== "rascunho") {
    return { itens: [], total: 0, pagina: 1, totalPaginas: 1 };
  }

  const query = new URLSearchParams({
    page: String(Math.max((params.pagina ?? 1) - 1, 0)),
    size: String(params.porPagina ?? 8),
  });
  if (params.busca?.trim()) query.set("search", params.busca.trim());
  if (status === "rascunho") query.set("status", "DRAFT");

  const pagina = await requisicaoProtegida<PaginaApi>(
    `/procurement-processes?${query}`,
  );
  return {
    itens: pagina.content.map(mapear),
    total: pagina.totalElements,
    pagina: pagina.number + 1,
    totalPaginas: Math.max(pagina.totalPages, 1),
  };
}

export async function criarProcessoReal(input: NovoProcessoInput): Promise<Processo> {
  const processo = await requisicaoProtegida<ProcessoApi>(
    "/procurement-processes",
    {
      method: "POST",
      body: JSON.stringify({
        objectDescription: input.objeto,
        demandObject: input.objetoDemanda,
        modality: modalidades[input.modalidade],
        departmentId: input.secretaria,
        estimatedValue: input.valorEstimado ?? 0,
        legalBasis: input.fundamentoLegal,
        urgency: false,
        documents: input.documentos.map((tipo) => tipos[tipo]),
        dfdFileName: input.dfdArquivo,
      }),
    },
  );
  return mapear(processo);
}

export async function obterProcesso(id: string): Promise<Processo> {
  return mapear(
    await requisicaoProtegida<ProcessoApi>(`/procurement-processes/${encodeURIComponent(id)}`),
  );
}

/**
 * @param atual o processo como a tela o tem — a API troca o recurso inteiro,
 *              então o que não muda precisa ser reenviado como está
 */
export async function atualizarProcessoReal(
  atual: Processo,
  mudancas: {
    objeto?: string;
    objetoDemanda?: string;
    modalidade?: Modalidade;
    documentos?: TipoDocumento[];
    dfdArquivo?: string | null;
    /** Por que mudou; vai literal para a trilha do servidor (ADR-024). */
    motivo?: string;
  },
): Promise<Processo> {
  const processo = await requisicaoProtegida<ProcessoApi>(
    `/procurement-processes/${encodeURIComponent(atual.id)}`,
    {
      method: "PATCH",
      // If-Match com a versão que a tela leu: sem isso, duas edições
      // simultâneas se sobrescreveriam em silêncio.
      headers: { "If-Match": `"${atual.versao ?? 0}"` },
      body: JSON.stringify({
        objectDescription: mudancas.objeto ?? atual.objeto,
        demandObject: mudancas.objetoDemanda ?? atual.objetoDemanda,
        modality: modalidades[mudancas.modalidade ?? atual.modalidade],
        estimatedValue: atual.valorEstimado,
        legalBasis: atual.fundamentoLegal,
        // `Boolean` e não `?? false`: o campo é opcional no tipo, mas o
        // mapeador sempre o define — o fallback seria um caminho sem entrada.
        urgency: Boolean(atual.urgente),
        documents: (mudancas.documentos ?? atual.documentos).map((tipo) => tipos[tipo]),
        dfdFileName:
          mudancas.dfdArquivo !== undefined ? mudancas.dfdArquivo : atual.dfdArquivo,
        changeNote: mudancas.motivo ?? null,
      }),
    },
  );
  return mapear(processo);
}

/**
 * Encerra o processo.
 *
 * <p>Documento pendente não trava — o servidor exige justificativa e devolve
 * 400 dizendo o que falta. Quem decide encerrar assim mesmo é o servidor.
 */
export async function encerrarProcessoReal(
  id: string,
  justificativa: string,
): Promise<Processo> {
  return mapear(
    await requisicaoProtegida<ProcessoApi>(
      `/procurement-processes/${encodeURIComponent(id)}/closure`,
      {
        method: "POST",
        body: JSON.stringify({
          justification: justificativa.trim() === "" ? null : justificativa.trim(),
        }),
      },
    ),
  );
}

/** Reabre o processo encerrado. O motivo é obrigatório e vai para a trilha. */
export async function reabrirProcessoReal(id: string, motivo: string): Promise<Processo> {
  return mapear(
    await requisicaoProtegida<ProcessoApi>(
      `/procurement-processes/${encodeURIComponent(id)}/reopening`,
      { method: "POST", body: JSON.stringify({ reason: motivo }) },
    ),
  );
}

/** O que pode divergir entre DFDs consolidados no mesmo processo. */
export type TipoDeIncongruencia = "UNIT" | "SPECIFICATION" | "UNIT_PRICE" | "DELIVERY_DEADLINE";

/** O rótulo e o porquê de cada divergência — a consequência é diferente em cada. */
export const INCONGRUENCIA: Record<TipoDeIncongruencia, { rotulo: string; consequencia: string }> = {
  UNIT: {
    rotulo: "Unidades divergentes",
    consequencia: "Não é possível somar as quantidades enquanto as unidades diferirem.",
  },
  SPECIFICATION: {
    rotulo: "Especificações divergentes",
    consequencia: "Pode não ser o mesmo item — comprá-los como um só entregaria o errado para alguém.",
  },
  UNIT_PRICE: {
    rotulo: "Preços unitários divergentes",
    consequencia: "A estimativa de valor fica inconsistente entre as secretarias.",
  },
  DELIVERY_DEADLINE: {
    rotulo: "Prazos de entrega divergentes",
    consequencia: "O contrato não pode cumprir os dois prazos ao mesmo tempo.",
  },
};

interface ConsolidacaoApi {
  items: {
    description: string;
    unit: string;
    total: number;
    summable: boolean;
    byDepartment: { departmentName: string; quantity: number; unit: string }[];
  }[];
  incongruences: {
    kind: TipoDeIncongruencia;
    itemDescription: string;
    values: { departmentName: string; value: string }[];
  }[];
}

export interface ItemConsolidado {
  descricao: string;
  unidade: string;
  total: number;
  /** `false` quando as unidades divergem: o total não pode ser usado como está. */
  somavel: boolean;
  porSecretaria: { secretaria: string; quantidade: number; unidade: string }[];
}

export interface Incongruencia {
  tipo: TipoDeIncongruencia;
  item: string;
  valores: { secretaria: string; valor: string }[];
}

export interface DemandaConsolidada {
  itens: ItemConsolidado[];
  incongruencias: Incongruencia[];
}

/**
 * A demanda consolidada dos DFDs do processo.
 *
 * Calculada pelo servidor a cada leitura: guardá-la criaria um segundo lugar
 * onde a mesma verdade mora — que envelhece assim que alguém anexa mais um DFD.
 */
export async function consolidacaoDaDemanda(processoId: string): Promise<DemandaConsolidada> {
  const consolidacao = await requisicaoProtegida<ConsolidacaoApi>(
    `/procurement-processes/${encodeURIComponent(processoId)}/demand-consolidation`,
  );
  return {
    itens: consolidacao.items.map((item) => ({
      descricao: item.description,
      unidade: item.unit,
      total: item.total,
      somavel: item.summable,
      porSecretaria: item.byDepartment.map((d) => ({
        secretaria: d.departmentName,
        quantidade: d.quantity,
        unidade: d.unit,
      })),
    })),
    incongruencias: consolidacao.incongruences.map((i) => ({
      tipo: i.kind,
      item: i.itemDescription,
      valores: i.values.map((v) => ({ secretaria: v.departmentName, valor: v.value })),
    })),
  };
}

/** A ação como a auditoria a nomeia → o evento que a trilha exibe. */
const EVENTOS_DA_TRILHA: Record<string, EventoProcesso> = {
  PROCUREMENT_PROCESS_CREATED: "criacao",
  PROCUREMENT_PROCESS_UPDATED: "edicao",
  PROCUREMENT_PROCESS_CLOSED: "encerramento",
  PROCUREMENT_PROCESS_REOPENED: "reabertura",
  SECTION_WRITTEN: "secao_escrita",
  SECTION_DISPENSED: "secao_dispensada",
  DOCUMENT_FINALIZED: "documento_concluido",
  DOCUMENT_GENERATED: "geracao_documento",
  DOCUMENT_DOWNLOADED: "documento_baixado",
  DFD_ATTACHED: "dfd_anexado",
}

interface TrilhaDaApi {
  event: string
  occurredAt: string
  actorName?: string | null
  reason?: string | null
}

/**
 * A trilha do processo, como o servidor a registrou.
 *
 * <p>Eventos que a plataforma ainda não audita simplesmente não aparecem — a
 * trilha mostra o que foi registrado, e não o que esta aba viu acontecer
 * (ADR-024).
 */
export async function trilhaDoProcesso(processoId: string): Promise<EventoDoProcesso[]> {
  const eventos = await requisicaoProtegida<TrilhaDaApi[]>(
    `/procurement-processes/${processoId}/trail`,
  )
  return eventos.flatMap((evento) => {
    const conhecido = EVENTOS_DA_TRILHA[evento.event]
    return conhecido === undefined
      ? []
      : [
          {
            evento: conhecido,
            autor: evento.actorName ?? null,
            data: evento.occurredAt,
            comentario: evento.reason ?? null,
          },
        ]
  })
}

/** Os números de processo do painel, contados pelo servidor (ADR-025). */
export interface EstatisticasDeProcesso {
  ativos: number
  encerrados: number
  criadosNoMes: number
  iniciados: number
  documentosPendentes: number
  taxaConclusao: number
}

interface EstatisticasDaApi {
  active: number
  closed: number
  createdThisMonth: number
  started: number
  pendingDocuments: number
  completionRate: number
}

export async function estatisticasDeProcesso(): Promise<EstatisticasDeProcesso> {
  const numeros = await requisicaoProtegida<EstatisticasDaApi>(
    "/procurement-processes/statistics",
  )
  return {
    ativos: numeros.active,
    encerrados: numeros.closed,
    criadosNoMes: numeros.createdThisMonth,
    iniciados: numeros.started,
    documentosPendentes: numeros.pendingDocuments,
    taxaConclusao: numeros.completionRate,
  }
}

/**
 * Um item pedido por uma secretaria, como a tela o informa.
 *
 * <p>Quantidade e preço vêm formatados em pt-BR do formulário (`1.200,00`), e a
 * conversão para número acontece aqui: mandar a string ao servidor faria
 * `1.200` virar 1,2 — o mesmo defeito que o import do PCA já teve.
 */
export interface ItemDoDfd {
  descricao: string;
  unidade: string;
  quantidade: string;
  especificacao?: string;
}

/**
 * Anexa um DFD com os itens que a secretaria pediu — e, quando houver, o arquivo.
 *
 * <p>Itens não saem de um PDF assinado: leitura automática de PDF é OCR, e a
 * plataforma não faz. Eles são informados, e é deles que saem a consolidação, o
 * painel de quantidades do ETP e a Cotação.
 *
 * <p>O arquivo é opcional de propósito (ADR-028): há processo em que o servidor
 * sabe o número do DFD e ainda não tem o PDF em mãos, e travar aqui seria
 * transformar um facilitador em bloqueio.
 */
export async function anexarDfdComItens(
  processoId: string,
  secretariaId: string,
  nomeDoArquivo: string,
  itens: ItemDoDfd[],
  arquivo?: File | null,
): Promise<void> {
  const corpo = new FormData();
  // `Blob` com tipo, e não string: sem o `Content-Type` da parte, o servidor
  // não sabe que `dados` é JSON e recusa a requisição inteira.
  corpo.append(
    "dados",
    new Blob(
      [
        JSON.stringify({
          departmentId: secretariaId,
          fileName: nomeDoArquivo,
          items: itens.map((item) => ({
            description: item.descricao.trim(),
            unit: item.unidade.trim(),
            quantity: parseValorBR(item.quantidade),
            specification: item.especificacao?.trim() || null,
          })),
        }),
      ],
      { type: "application/json" },
    ),
  );
  if (arquivo) corpo.append("file", arquivo);
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds`,
    { method: "POST", body: corpo },
  );
}

/** Um DFD anexado ao processo, como a tela o mostra. */
export interface DfdAnexado {
  id: string;
  nomeDoArquivo: string;
  secretaria: string;
  anexadoEm: string;
  /** Nulo quando o DFD foi registrado só pelo nome: não há download a oferecer. */
  arquivo: { tipo: string; bytes: number; resumo: string } | null;
}

interface DfdDaApi {
  id: string;
  fileName: string;
  departmentName: string;
  submittedAt: string;
  file?: { mediaType: string; byteSize: number; sha256: string } | null;
}

/**
 * Os DFDs anexados, na ordem em que foram anexados.
 *
 * <p>Vários por processo é como nasce uma contratação compartilhada — e anexar
 * de novo versiona, em vez de substituir: o processo precisa responder "qual
 * DFD embasou o ETP daquela data" (ADR-028).
 */
export async function listarDfds(processoId: string): Promise<DfdAnexado[]> {
  const dfds = await requisicaoProtegida<DfdDaApi[]>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds`,
  );
  return dfds.map((dfd) => ({
    id: dfd.id,
    nomeDoArquivo: dfd.fileName,
    secretaria: dfd.departmentName,
    anexadoEm: dfd.submittedAt,
    arquivo: dfd.file
      ? { tipo: dfd.file.mediaType, bytes: dfd.file.byteSize, resumo: dfd.file.sha256 }
      : null,
  }));
}

/** Os bytes de um DFD anexado, autenticados. */
export function baixarDfd(processoId: string, dfdId: string) {
  return baixarProtegido(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/${encodeURIComponent(dfdId)}/file`,
  );
}
