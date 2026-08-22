import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import { ordenar } from "@/lib/documentos";
import type {
  Modalidade,
  NovoProcessoInput,
  Processo,
  StatusProcesso,
  TipoDocumento,
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
  status: "DRAFT";
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
    status: "rascunho",
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
    trilha: [],
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
      }),
    },
  );
  return mapear(processo);
}
