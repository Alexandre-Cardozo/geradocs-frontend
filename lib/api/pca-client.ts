import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";

/**
 * Como a previsão foi estabelecida — e a tela mostra a diferença.
 *
 * `DECLARADA` é o servidor afirmando; as outras três são a plataforma tendo
 * encontrado. Exibir os quatro casos com a mesma cara faria a tela parecer ter
 * conferido algo que ninguém conferiu (ADR-019 do back-end).
 */
export type FormaDaPrevisao = "EXATA" | "TERMOS" | "ALARGADA" | "DECLARADA";

const formas: Record<string, FormaDaPrevisao> = {
  EXACT: "EXATA",
  TERMS: "TERMOS",
  WIDENED: "ALARGADA",
  DECLARED: "DECLARADA",
};

export const FORMA_DA_PREVISAO: Record<FormaDaPrevisao, { rotulo: string; explicacao: string }> = {
  EXATA: {
    rotulo: "Encontrado no PCA",
    explicacao: "A descrição do item bate com a do plano anexado.",
  },
  TERMOS: {
    rotulo: "Encontrado no PCA",
    explicacao: "Os termos que distinguem este item aparecem no item do plano.",
  },
  ALARGADA: {
    rotulo: "Encontrado no PCA",
    explicacao:
      "A busca por termos não alcançou, e o item foi apontado por aproximação — confira se é mesmo este.",
  },
  DECLARADA: {
    rotulo: "Informado por você",
    explicacao:
      "A plataforma não conferiu este item: quem afirma a previsão aqui é você, e é assim que ela entra no documento.",
  },
};

export interface PlanoPca {
  ano: number;
  arquivo: string;
  importadoEm: string;
  itensIndexados: number;
}

export interface AchadoDoPca {
  demanda: string;
  previsto: boolean;
  forma?: FormaDaPrevisao;
  codigo?: string;
  descricao?: string;
  unidade?: string;
  quantidade?: number;
  valorEstimado?: number;
}

export interface VerificacaoPca {
  /** O plano do exercício do processo; `null` quando não há um importado. */
  plano: PlanoPca | null;
  /**
   * O exercício do processo — o ano em que ele foi aberto.
   *
   * É o PCA **deste** ano que a plataforma consulta, e é ele que precisa
   * existir. Um plano de outro exercício não demonstra a previsão desta
   * contratação, e a tela diz isso em vez de usar o que tiver à mão.
   */
  exercicio: number;
  /** Toda a demanda tem item no plano. */
  previsto: boolean;
  /** Há ao menos um item a citar — é o que habilita o botão. */
  citavel: boolean;
  /** O parágrafo que entra na seção, para a pessoa ler antes de gravar. */
  citacao?: string;
  notaDeclarada?: string;
  achados: AchadoDoPca[];
}

interface PlanoApi {
  year: number;
  sourceFileName: string;
  importedAt: string;
  indexedItems: number;
}

interface VerificacaoApi {
  plan?: PlanoApi | null;
  exerciseYear: number;
  foreseen: boolean;
  citable: boolean;
  citation?: string;
  declaredNote?: string;
  findings: {
    demand: string;
    foreseen: boolean;
    kind?: string;
    code?: string;
    description?: string;
    unit?: string;
    quantity?: number;
    estimatedValue?: number;
  }[];
}

function mapearPlano(plano: PlanoApi): PlanoPca {
  return {
    ano: plano.year,
    arquivo: plano.sourceFileName,
    importadoEm: plano.importedAt,
    itensIndexados: plano.indexedItems,
  };
}

function mapear(resposta: VerificacaoApi): VerificacaoPca {
  return {
    plano: resposta.plan ? mapearPlano(resposta.plan) : null,
    exercicio: resposta.exerciseYear,
    previsto: resposta.foreseen,
    citavel: resposta.citable,
    citacao: resposta.citation,
    notaDeclarada: resposta.declaredNote,
    achados: resposta.findings.map((achado) => ({
      demanda: achado.demand,
      previsto: achado.foreseen,
      forma: achado.kind ? formas[achado.kind] : undefined,
      codigo: achado.code,
      descricao: achado.description,
      unidade: achado.unit,
      quantidade: achado.quantity,
      valorEstimado: achado.estimatedValue,
    })),
  };
}

/**
 * O plano do **exercício corrente**; `null` quando não há um importado.
 *
 * O servidor responde 204 nesse caso, e a requisição devolve `undefined` — que
 * é diferente de um plano com zero itens, e a tela precisa dessa diferença.
 */
export async function planoVigente(): Promise<PlanoPca | null> {
  const plano = await requisicaoProtegida<PlanoApi | undefined>("/pca-plan");
  return plano ? mapearPlano(plano) : null;
}

/** Todos os planos do órgão, do exercício mais recente para o mais antigo. */
export async function planosDoOrgao(): Promise<PlanoPca[]> {
  const planos = await requisicaoProtegida<PlanoApi[]>("/pca-plans");
  return planos.map(mapearPlano);
}

export async function importarPlano(entrada: {
  ano: number;
  arquivo: string;
  conteudo: string;
}): Promise<PlanoPca> {
  return mapearPlano(
    await requisicaoProtegida<PlanoApi>("/pca-plan", {
      method: "POST",
      body: JSON.stringify({
        year: entrada.ano,
        fileName: entrada.arquivo,
        content: entrada.conteudo,
      }),
    }),
  );
}

export async function verificacaoDoProcesso(processoId: string): Promise<VerificacaoPca> {
  return mapear(
    await requisicaoProtegida<VerificacaoApi>(
      `/procurement-processes/${encodeURIComponent(processoId)}/pca`,
    ),
  );
}

/** O servidor informa o item do PCA que a busca não encontrou. */
export async function declararPrevisao(
  processoId: string,
  entrada: { codigo: string; nota?: string },
): Promise<VerificacaoPca> {
  return mapear(
    await requisicaoProtegida<VerificacaoApi>(
      `/procurement-processes/${encodeURIComponent(processoId)}/pca/declaration`,
      {
        method: "POST",
        body: JSON.stringify({
          itemCode: entrada.codigo,
          note: entrada.nota?.trim() ? entrada.nota.trim() : null,
        }),
      },
    ),
  );
}

/** Escreve a citação na seção do inciso II do ETP. */
export async function citarNaSecao(processoId: string): Promise<VerificacaoPca> {
  return mapear(
    await requisicaoProtegida<VerificacaoApi>(
      `/procurement-processes/${encodeURIComponent(processoId)}/pca/citation`,
      { method: "POST" },
    ),
  );
}
