import "client-only";

import { baixarProtegido, requisicaoProtegida } from "@/lib/api/auth-client";
import { ordenar } from "@/lib/documentos";
import { formatNumeroBR, parseValorBR } from "@/lib/format";
import type {
  FundamentoDaDispensa,
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
  dispensationGround?: FundamentoDaDispensa | null;
  estimatedValue: number;
  legalBasis?: string;
  urgency: boolean;
  documents: TipoDocumento[];
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
    numero: item.processNumber,
    entidadeId: item.organizationId,
    objeto: item.objectDescription,
    objetoDemanda: item.demandObject,
    modalidade,
    secretaria: item.departmentName,
    status: item.status === "CLOSED" ? "concluido" : "rascunho",
    encerradoEm: item.closedAt,
    justificativaEncerramento: item.closureNote,
    valorEstimado: Number(item.estimatedValue),
    ...(item.dispensationGround
      ? { fundamentoDaDispensa: item.dispensationGround as FundamentoDaDispensa }
      : {}),
    responsavel: item.responsibleUserName,
    criadoEm: item.createdAt,
    atualizadoEm: item.updatedAt,
    etpStatus: "Não iniciado",
    trStatus: "Não iniciado",
    documentos: ordenar(item.documents.map((tipo) => tiposDaApi[tipo] as TipoDocumento)),
    fundamentoLegal: item.legalBasis,
    ata: null,
    fases: { verificacaoDFD: false, retificacao: false },
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

/**
 * Abre o processo, com o DFD que o formaliza.
 *
 * <p>Multipart porque o DFD é arquivo (ADR-035). Até 27/08/2026 subia só o
 * **nome**: o assistente pedia o PDF assinado, o navegador o entregava, e o
 * processo nascia dizendo ter um DFD que ninguém conseguia baixar.
 */
export async function criarProcessoReal(input: NovoProcessoInput): Promise<Processo> {
  const corpo = new FormData();
  corpo.append(
    "dados",
    new Blob(
      [
        JSON.stringify({
          objectDescription: input.objeto,
          demandObject: input.objetoDemanda,
          modality: modalidades[input.modalidade],
          departmentId: input.secretaria,
          dispensationGround: input.fundamentoDaDispensa ?? null,
          estimatedValue: input.valorEstimado ?? 0,
          legalBasis: input.fundamentoLegal,
          urgency: false,
          documents: input.documentos.map((tipo) => tipos[tipo]),
        }),
      ],
      { type: "application/json" },
    ),
  );
  if (input.dfdConteudo) {
    corpo.append("file", input.dfdConteudo);
  }
  const processo = await requisicaoProtegida<ProcessoApi>("/procurement-processes", {
    method: "POST",
    body: corpo,
  });
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
    /**
     * O valor estimado, no formato do formulário.
     *
     * <p>Passou a ser editável com a conciliação (§75): ele era digitado na
     * abertura e nunca mais conversava com a demanda, e adotar o valor que os
     * DFDs ou a pesquisa sustentam exigia abrir o processo de novo.
     */
    valorEstimado?: string;
    /** O inciso do Art. 75; `null` retira a declaração. */
    fundamentoDaDispensa?: FundamentoDaDispensa | null;
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
        // Reenviado como o resto: o PATCH troca o recurso inteiro, e omiti-lo
        // apagaria o inciso declarado ao salvar qualquer outro campo.
        dispensationGround:
          mudancas.fundamentoDaDispensa === undefined
            ? (atual.fundamentoDaDispensa ?? null)
            : mudancas.fundamentoDaDispensa,
        estimatedValue:
          mudancas.valorEstimado === undefined
            ? atual.valorEstimado
            : parseValorBR(mudancas.valorEstimado),
        legalBasis: atual.fundamentoLegal,
        // `Boolean` e não `?? false`: o campo é opcional no tipo, mas o
        // mapeador sempre o define — o fallback seria um caminho sem entrada.
        urgency: Boolean(atual.urgente),
        documents: (mudancas.documentos ?? atual.documentos).map((tipo) => tipos[tipo]),
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
  /**
   * O preço unitário que a secretaria estimou, quando ela o estimou.
   *
   * <p>Opcional de propósito: a secretaria pede o item, e nem sempre tem preço
   * de referência na hora do DFD. Quando tem, é dele que a Estimativa do Valor
   * (Art. 18, § 1º, VI) sai calculada em vez de digitada.
   */
  valorUnitario?: string;
}

/**
 * Registra um DFD no processo — e, quando houver, o arquivo assinado.
 *
 * <p><b>Sem itens.</b> Registrar o documento é uma operação; informar o que ele
 * pede é outra, e é lá que o vínculo entre item e DFD é declarado (ADR-036).
 *
 * <p>O arquivo é opcional de propósito (ADR-028): há processo em que o servidor
 * sabe o número do DFD e ainda não tem o PDF em mãos, e travar aqui seria
 * transformar um facilitador em bloqueio.
 */
export async function registrarDfd(
  processoId: string,
  secretariaId: string,
  identificacao: string,
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
          fileName: identificacao,
          items: [],
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

/** Um DFD do processo, como a tela o mostra. */
export interface DfdAnexado {
  id: string;
  nomeDoArquivo: string;
  secretaria: string;
  /** A secretaria de origem pelo id: é por ela que o formulário abre no DFD certo. */
  secretariaId: string;
  anexadoEm: string;
  /**
   * O que esta secretaria pediu neste DFD.
   *
   * <p>A listagem descartava os itens, e a tela não tinha como dizer o que cada
   * DFD contribuiu para a consolidação — nem por onde corrigi-lo.
   */
  itens: ItemDoDfd[];
  /** Nulo quando o DFD foi registrado só pelo número: não há download a oferecer. */
  arquivo: { tipo: string; bytes: number; resumo: string } | null;
}

interface DfdDaApi {
  id: string;
  fileName: string;
  departmentId: string;
  departmentName: string;
  submittedAt: string;
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    specification?: string | null;
    unitPrice?: number | null;
  }>;
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
    secretariaId: dfd.departmentId,
    anexadoEm: dfd.submittedAt,
    itens: dfd.items.map((item) => ({
      descricao: item.description,
      unidade: item.unit,
      // De volta ao formato do formulário: é lá que ele vai ser editado.
      quantidade: formatNumeroBR(item.quantity),
      especificacao: item.specification ?? undefined,
      // `formatNumeroBR`, e não `formatBRL`: o campo de dinheiro do formulário
      // recebe "3.233,33" — com o símbolo ele leria outro número.
      valorUnitario: item.unitPrice == null ? undefined : formatNumeroBR(item.unitPrice),
    })),
    arquivo: dfd.file
      ? { tipo: dfd.file.mediaType, bytes: dfd.file.byteSize, resumo: dfd.file.sha256 }
      : null,
  }));
}

/**
 * Troca os itens de um DFD já registrado.
 *
 * <p>O item pertence ao DFD — é o documento que a secretaria assinou —, e
 * corrigir uma quantidade não pode custar um DFD novo na listagem.
 */
export async function atualizarItensDoDfd(
  processoId: string,
  dfdId: string,
  itens: ItemDoDfd[],
): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/${encodeURIComponent(dfdId)}/items`,
    {
      method: "PUT",
      body: JSON.stringify({
        items: itens.map((item) => ({
          description: item.descricao.trim(),
          unit: item.unidade.trim(),
          quantity: parseValorBR(item.quantidade),
          specification: item.especificacao?.trim() || null,
          // Sem preço informado o campo não vai como zero: zero é um preço, e
          // "não estimado" é outra coisa.
          unitPrice: item.valorUnitario ? parseValorBR(item.valorUnitario) : null,
        })),
      }),
    },
  );
}

/**
 * Guarda o arquivo de um DFD já registrado, no lugar do que houvesse.
 *
 * <p>O DFD nem sempre chega no começo do processo: o número é registrado, os
 * itens são informados e o PDF assinado aparece depois — às vezes só no fim
 * (ADR-036). A substituição fica na trilha com o nome do arquivo trocado.
 */
export async function anexarArquivoAoDfd(
  processoId: string,
  dfdId: string,
  arquivo: File,
): Promise<void> {
  const corpo = new FormData();
  corpo.append("file", arquivo);
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/${encodeURIComponent(dfdId)}/file`,
    { method: "PUT", body: corpo },
  );
}

/** Tira um DFD do processo, com os itens e o arquivo dele. */
export async function removerDfd(processoId: string, dfdId: string): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/${encodeURIComponent(dfdId)}`,
    { method: "DELETE" },
  );
}

/** Os bytes de um DFD anexado, autenticados. */
export function baixarDfd(processoId: string, dfdId: string) {
  return baixarProtegido(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/${encodeURIComponent(dfdId)}/file`,
  );
}

/**
 * Uma dotação orçamentária do processo.
 *
 * <p>Os valores vêm no formato do formulário — "1.250.000,00" —, como os do
 * DFD: é lá que eles vão ser editados, e converter duas vezes é como o número
 * perde uma casa pelo caminho.
 */
export interface DotacaoOrcamentaria {
  id: string;
  unidadeOrcamentaria: string;
  /** A classificação funcional programática do Art. 92, VIII. */
  programaDeTrabalho: string;
  /** A natureza da despesa, de onde sai a categoria econômica do Art. 92, VIII. */
  naturezaDaDespesa: string;
  fonteDeRecurso: string;
  /** Nulo quando o ente não usa ficha. */
  ficha?: string;
  exercicio: number;
  valor: string;
  declaradaEm: string;
}

/** Os campos que a declaração e a correção enviam — os mesmos, porque é o mesmo crédito. */
export type DadosDaDotacao = Omit<DotacaoOrcamentaria, "id" | "declaradaEm">;

interface DotacaoDaApi {
  id: string;
  budgetUnit: string;
  workProgram: string;
  expenseNature: string;
  resourceSource: string;
  ledgerCode?: string | null;
  fiscalYear: number;
  amount: number;
  registeredAt: string;
}

function dotacaoDaApi(dotacao: DotacaoDaApi): DotacaoOrcamentaria {
  return {
    id: dotacao.id,
    unidadeOrcamentaria: dotacao.budgetUnit,
    programaDeTrabalho: dotacao.workProgram,
    naturezaDaDespesa: dotacao.expenseNature,
    fonteDeRecurso: dotacao.resourceSource,
    ficha: dotacao.ledgerCode ?? undefined,
    exercicio: dotacao.fiscalYear,
    // Formato do formulário, e não do texto: o campo de dinheiro recebe
    // "1.250.000,00" — com o símbolo ele leria outro número.
    valor: formatNumeroBR(dotacao.amount),
    declaradaEm: dotacao.registeredAt,
  };
}

function corpoDaDotacao(dados: DadosDaDotacao) {
  return JSON.stringify({
    budgetUnit: dados.unidadeOrcamentaria.trim(),
    workProgram: dados.programaDeTrabalho.trim(),
    expenseNature: dados.naturezaDaDespesa.trim(),
    resourceSource: dados.fonteDeRecurso.trim(),
    ledgerCode: dados.ficha?.trim() || null,
    fiscalYear: dados.exercicio,
    amount: parseValorBR(dados.valor),
  });
}

/** As dotações do processo, por exercício. */
export async function listarDotacoes(processoId: string): Promise<DotacaoOrcamentaria[]> {
  const dotacoes = await requisicaoProtegida<DotacaoDaApi[]>(
    `/procurement-processes/${encodeURIComponent(processoId)}/budget-appropriations`,
  );
  return dotacoes.map(dotacaoDaApi);
}

/**
 * Declara uma dotação no processo.
 *
 * <p>Uma vez aqui, três seções: TR 'j', Edital (Art. 150) e a cláusula do
 * contrato (Art. 92, VIII).
 */
export async function declararDotacao(
  processoId: string,
  dados: DadosDaDotacao,
): Promise<DotacaoOrcamentaria> {
  return dotacaoDaApi(
    await requisicaoProtegida<DotacaoDaApi>(
      `/procurement-processes/${encodeURIComponent(processoId)}/budget-appropriations`,
      { method: "POST", body: corpoDaDotacao(dados) },
    ),
  );
}

/** Corrige uma dotação já declarada — o mesmo registro, com o crédito certo. */
export async function atualizarDotacao(
  processoId: string,
  dotacaoId: string,
  dados: DadosDaDotacao,
): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/budget-appropriations/${encodeURIComponent(dotacaoId)}`,
    { method: "PUT", body: corpoDaDotacao(dados) },
  );
}

/** Retira uma dotação do processo. */
export async function removerDotacao(processoId: string, dotacaoId: string): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/budget-appropriations/${encodeURIComponent(dotacaoId)}`,
    { method: "DELETE" },
  );
}

/**
 * Um preço coletado na pesquisa (IN SEGES/ME nº 65/2021, Art. 3º).
 *
 * <p>O preço viaja no formato do formulário, como os do DFD e da dotação: é lá
 * que ele será editado.
 */
export interface ColetaDePreco {
  id: string;
  /** O item pesquisado — liga a coleta à consolidação da demanda. */
  item: string;
  /** A fonte consultada, entre os parâmetros do Art. 23, § 1º. */
  fonte: string;
  valorUnitario: string;
  /** Data e hora: a hora é exigida para mídia e sítio eletrônico (Art. 5º, III). */
  coletadoEm: string;
  fornecedor?: string;
  /** CNPJ ou CPF, na pesquisa direta (Art. 5º, § 2º). */
  documentoDoFornecedor?: string;
  /** Validade da proposta, na pesquisa direta (Art. 5º, § 2º). */
  validaAte?: string;
  observacao?: string;
  /**
   * O documento que dá suporte a este preço.
   *
   * <p>O Art. 3º da IN SEGES/ME nº 65/2021 exige os "documentos que lhe dão
   * suporte". Nulo é caso legítimo: o preço é anotado na hora da consulta e o
   * comprovante às vezes chega depois.
   */
  documento: { nome: string; tipo: string; bytes: number; resumo: string } | null;
  registradaEm: string;
}

/** Os campos que o registro e a correção enviam — é a mesma coleta. */
export type DadosDaColeta = Omit<ColetaDePreco, "id" | "registradaEm" | "documento">;

interface ColetaDaApi {
  id: string;
  item: string;
  source: string;
  unitPrice: number;
  collectedAt: string;
  supplier?: string | null;
  supplierDocument?: string | null;
  proposalValidUntil?: string | null;
  note?: string | null;
  file?: { fileName: string; mediaType: string; byteSize: number; sha256: string } | null;
  registeredAt: string;
}

function coletaDaApi(coleta: ColetaDaApi): ColetaDePreco {
  return {
    id: coleta.id,
    item: coleta.item,
    fonte: coleta.source,
    valorUnitario: formatNumeroBR(coleta.unitPrice),
    coletadoEm: coleta.collectedAt,
    fornecedor: coleta.supplier ?? undefined,
    documentoDoFornecedor: coleta.supplierDocument ?? undefined,
    validaAte: coleta.proposalValidUntil ?? undefined,
    observacao: coleta.note ?? undefined,
    documento: coleta.file
      ? {
          nome: coleta.file.fileName,
          tipo: coleta.file.mediaType,
          bytes: coleta.file.byteSize,
          resumo: coleta.file.sha256,
        }
      : null,
    registradaEm: coleta.registeredAt,
  };
}

function corpoDaColeta(dados: DadosDaColeta) {
  return JSON.stringify({
    item: dados.item.trim(),
    source: dados.fonte.trim(),
    unitPrice: parseValorBR(dados.valorUnitario),
    collectedAt: dados.coletadoEm,
    supplier: dados.fornecedor?.trim() || null,
    supplierDocument: dados.documentoDoFornecedor?.trim() || null,
    proposalValidUntil: dados.validaAte || null,
    note: dados.observacao?.trim() || null,
  });
}

/** Os preços coletados do processo, por item. */
export async function listarColetas(processoId: string): Promise<ColetaDePreco[]> {
  const coletas = await requisicaoProtegida<ColetaDaApi[]>(
    `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes`,
  );
  return coletas.map(coletaDaApi);
}

/** Registra um preço obtido — uma linha da série do Art. 3º. */
export async function registrarColeta(
  processoId: string,
  dados: DadosDaColeta,
): Promise<ColetaDePreco> {
  return coletaDaApi(
    await requisicaoProtegida<ColetaDaApi>(
      `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes`,
      { method: "POST", body: corpoDaColeta(dados) },
    ),
  );
}

/** Corrige uma coleta já registrada. */
export async function atualizarColeta(
  processoId: string,
  coletaId: string,
  dados: DadosDaColeta,
): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes/${encodeURIComponent(coletaId)}`,
    { method: "PUT", body: corpoDaColeta(dados) },
  );
}

/** Retira uma coleta da pesquisa. */
export async function removerColeta(processoId: string, coletaId: string): Promise<void> {
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes/${encodeURIComponent(coletaId)}`,
    { method: "DELETE" },
  );
}

/**
 * Guarda o documento de suporte de um preço já registrado.
 *
 * <p>Substituir é permitido e a trilha nomeia o documento trocado: sobrescrever
 * o lastro de um preço em silêncio é o que não pode acontecer.
 */
export async function anexarDocumentoDaColeta(
  processoId: string,
  coletaId: string,
  arquivo: File,
): Promise<void> {
  const corpo = new FormData();
  corpo.append("file", arquivo);
  await requisicaoProtegida<unknown>(
    `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes/${encodeURIComponent(coletaId)}/file`,
    { method: "PUT", body: corpo },
  );
}

/** Os bytes do documento de suporte, autenticados. */
export function baixarDocumentoDaColeta(processoId: string, coletaId: string) {
  return baixarProtegido(
    `/procurement-processes/${encodeURIComponent(processoId)}/price-quotes/${encodeURIComponent(coletaId)}/file`,
  );
}

/**
 * A conferência do valor contra o limite da dispensa (Art. 75, I e II).
 *
 * <p>Três estados que não são o mesmo, e a tela precisa distingui-los: o valor
 * ultrapassa o limite, o fundamento ainda não foi declarado, e o exercício não
 * tem limites cadastrados. Fundi-los num "ok/não ok" faria a pessoa procurar um
 * problema de valor onde falta um cadastro.
 */
export interface ConferenciaDaDispensa {
  /** A modalidade do processo é a dispensa do Art. 75. */
  ehDispensa: boolean;
  /** Há limite a conferir: só nos incisos I e II, e só em dispensa. */
  aplicavel: boolean;
  fundamento?: FundamentoDaDispensa;
  /** O inciso citado literalmente, para o documento. */
  fundamentoLegal?: string;
  limite?: number;
  /** O limite vale em dobro para esta entidade (Art. 75, § 2º). */
  limiteDobrado: boolean;
  /** O decreto que fixou o limite — sem ele o documento não tem o que citar. */
  decretoDoLimite?: string;
  valorEstimado: number;
  exercicio: number;
  ultrapassa: boolean;
  /** Dispensa que ainda não disse com que inciso. */
  fundamentoPendente: boolean;
  /** Exercício sem limites cadastrados — acontece na virada do ano. */
  limitePendente: boolean;
}

interface ConferenciaApi {
  dispensation: boolean;
  applicable: boolean;
  ground?: FundamentoDaDispensa | null;
  legalBasis?: string | null;
  limitAmount?: number | null;
  doubledLimit: boolean;
  limitSource?: string | null;
  estimatedValue: number;
  fiscalYear: number;
  exceeds: boolean;
  pendingGround: boolean;
  pendingLimit: boolean;
}

export async function conferenciaDaDispensa(
  processoId: string,
): Promise<ConferenciaDaDispensa> {
  const conferencia = await requisicaoProtegida<ConferenciaApi>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dispensation-check`,
  );
  return {
    ehDispensa: conferencia.dispensation,
    aplicavel: conferencia.applicable,
    fundamento: conferencia.ground ?? undefined,
    fundamentoLegal: conferencia.legalBasis ?? undefined,
    limite: conferencia.limitAmount ?? undefined,
    limiteDobrado: conferencia.doubledLimit,
    decretoDoLimite: conferencia.limitSource ?? undefined,
    valorEstimado: Number(conferencia.estimatedValue),
    exercicio: conferencia.fiscalYear,
    ultrapassa: conferencia.exceeds,
    fundamentoPendente: conferencia.pendingGround,
    limitePendente: conferencia.pendingLimit,
  };
}
