import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import { painelDaSecao } from "@/lib/documentos";
import type { BlocoDoDocumento } from "@/lib/dominio";
import type { MotivoRetificacao, Retificacao } from "@/lib/dominio"
import type {
  SecaoDocumento,
  StatusDocumento,
  TipoDocumento,
  VersaoDocumento,
} from "@/lib/types";

/**
 * A elaboração de documento, servida pelo back-end.
 *
 * O mapeamento é anticorrupção de propósito: o contrato fala `sectionCode`,
 * `required` e `resolved`; a interface fala `id`, `obrigatoria` e `status`. Usar
 * o vocabulário do servidor nas telas espalharia inglês pela interface e
 * amarraria os componentes ao formato do contrato.
 */

/** Os tipos do contrato são maiúsculos sem acento; a interface usa o rótulo. */
const tipos: Record<TipoDocumento, string> = {
  "Cotação": "COTACAO",
  ETP: "ETP",
  Mapa: "MAPA",
  TR: "TR",
  Edital: "EDITAL",
  Contrato: "CONTRATO",
};

interface SecaoApi {
  sectionCode: string;
  position: number;
  title: string;
  legalBasis?: string;
  hint?: string;
  required: boolean;
  origin: "CATALOG" | "AD_HOC";
  content: string;
  dispensationJustification?: string;
  resolved: boolean;
}

interface DocumentoApi {
  id: string;
  processId: string;
  documentType: string;
  currentVersion: number;
  finalized: boolean;
  progress: number;
  canGenerate: boolean;
  sections: SecaoApi[];
  pendingRequiredSections: string[];
  silentGaps: string[];
  body: { sectionCode: string; title: string; text: string; dispensed: boolean }[];
}

export interface DocumentoEmElaboracao {
  processoId: string;
  tipo: TipoDocumento;
  versao: number;
  concluido: boolean;
  progresso: number;
  podeGerar: boolean;
  secoes: SecaoDocumento[];
  /** Títulos das seções indispensáveis ainda não resolvidas. */
  pendentes: string[];
  /** Dispensáveis em branco sem justificativa: somem do documento sem registro. */
  lacunas: string[];
  corpo: BlocoDoDocumento[];
}

function rota(processoId: string, tipo: TipoDocumento): string {
  return `/procurement-processes/${encodeURIComponent(processoId)}/documents/${tipos[tipo]}`;
}

/**
 * O status vem derivado do que foi respondido, e não guardado.
 *
 * O servidor decide o que está resolvido; a interface só traduz para o
 * vocabulário que as telas já usam.
 */
function status(secao: SecaoApi): StatusDocumento {
  return secao.resolved ? "Completo" : "Não iniciado";
}

/**
 * @param tipo necessário para achar o painel do editor: ele é declarado no
 *             catálogo da tela, não no contrato, e a junção é pelo código
 */
function mapearSecao(secao: SecaoApi, tipo: TipoDocumento): SecaoDocumento {
  // Seção criada pelo servidor não tem painel: painel assiste inciso da lei,
  // e a lei não conhece a seção que ele inventou.
  const painel = secao.origin === "AD_HOC" ? undefined : painelDaSecao(tipo, secao.sectionCode);
  return {
    id: secao.sectionCode,
    titulo: secao.title,
    status: status(secao),
    obrigatoria: secao.required,
    origem: secao.origin === "AD_HOC" ? "servidor" : "catalogo",
    conteudo: secao.content,
    ...(secao.hint ? { hint: secao.hint } : {}),
    ...(secao.legalBasis ? { fundamentoLegal: secao.legalBasis } : {}),
    ...(secao.dispensationJustification
      ? { justificativaDispensa: secao.dispensationJustification }
      : {}),
    ...(painel ? { painel } : {}),
  };
}

function mapear(documento: DocumentoApi, tipo: TipoDocumento): DocumentoEmElaboracao {
  return {
    processoId: documento.processId,
    tipo,
    versao: documento.currentVersion,
    concluido: documento.finalized,
    progresso: documento.progress,
    podeGerar: documento.canGenerate,
    // Ordenadas pela posição do catálogo: é a ordem em que o documento sai
    // impresso, e não a ordem em que o banco devolveu.
    secoes: [...documento.sections].sort((a, b) => a.position - b.position).map((secao) => mapearSecao(secao, tipo)),
    pendentes: documento.pendingRequiredSections,
    lacunas: documento.silentGaps,
    corpo: documento.body.map((bloco) => ({
      id: bloco.sectionCode,
      titulo: bloco.title,
      texto: bloco.text,
      dispensada: bloco.dispensed,
    })),
  };
}

/** Abre o documento do processo, criando-o na primeira vez. */
export async function abrirDocumento(
  processoId: string,
  tipo: TipoDocumento,
): Promise<DocumentoEmElaboracao> {
  return mapear(await requisicaoProtegida<DocumentoApi>(rota(processoId, tipo)), tipo);
}

/**
 * @param justificativaDispensa por que a seção fica em branco (Art. 18, § 2º);
 *                              ignorada quando há conteúdo
 */
export async function salvarSecao(
  processoId: string,
  tipo: TipoDocumento,
  secaoId: string,
  conteudo: string,
  justificativaDispensa?: string,
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(
      `${rota(processoId, tipo)}/sections/${encodeURIComponent(secaoId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ content: conteudo, dispensationJustification: justificativaDispensa }),
      },
    ),
    tipo,
  );
}

/**
 * Pede à IA a redação da seção.
 *
 * O texto volta para o rascunho e não é gravado: quem decide se aquilo entra no
 * documento é quem assina.
 */
export async function gerarTextoDaSecao(
  processoId: string,
  tipo: TipoDocumento,
  secaoId: string,
): Promise<string> {
  const gerada = await requisicaoProtegida<{ text: string }>(
    `${rota(processoId, tipo)}/sections/${encodeURIComponent(secaoId)}/generate`,
    { method: "POST" },
  );
  return gerada.text;
}

/** Natureza da retificação, no vocabulário do contrato. */
const naturezas: Record<MotivoRetificacao, string> = {
  erro_material: "MATERIAL_ERROR",
  alteracao_substancial: "SUBSTANTIAL_CHANGE",
};

/**
 * Conclui o documento, se as indispensáveis estiverem resolvidas.
 *
 * @param retificacao presente quando a conclusão é uma retificação declarada;
 *                    ausente, é regeração — e a diferença vai para o histórico
 */
export async function concluirDocumento(
  processoId: string,
  tipo: TipoDocumento,
  retificacao?: Retificacao,
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(`${rota(processoId, tipo)}/finalize`, {
      method: "POST",
      body: JSON.stringify(
        retificacao
          ? {
              rectificationKind: naturezas[retificacao.motivo],
              rectificationDetail: retificacao.detalhe,
            }
          : {},
      ),
    }),
    tipo,
  );
}

interface VersaoApi {
  version: number;
  note: string;
  generatedAt: string;
  contentHash: string;
  body: { sectionCode: string; title: string; text: string; dispensed: boolean }[];
}

/** Uma versão gerada, com o texto como ele saiu. */
export interface VersaoComTexto {
  versao: number;
  nota: string;
  geradoEm: string;
  /** SHA-256 do snapshot: prova que o texto guardado é o texto que saiu. */
  hash: string;
  corpo: BlocoDoDocumento[];
}

function mapearVersao(versao: VersaoApi): VersaoComTexto {
  return {
    versao: versao.version,
    nota: versao.note,
    geradoEm: versao.generatedAt,
    hash: versao.contentHash,
    corpo: versao.body.map((bloco) => ({
      id: bloco.sectionCode,
      titulo: bloco.title,
      texto: bloco.text,
      dispensada: bloco.dispensed,
    })),
  };
}

/**
 * As versões com o texto de cada uma, da mais recente para a mais antiga.
 *
 * É o que permite responder "o que mudou entre a v1 e a v2" — a pergunta que a
 * errata responde, e que versionar só o metadado do arquivo deixava sem
 * resposta.
 */
export async function versoesComTexto(
  processoId: string,
  tipo: TipoDocumento,
): Promise<VersaoComTexto[]> {
  const versoes = await requisicaoProtegida<VersaoApi[]>(`${rota(processoId, tipo)}/versions`);
  return versoes.map(mapearVersao);
}

/**
 * O histórico de versões do documento, da mais recente para a mais antiga.
 *
 * Vem do servidor desde o Bloco 9: guardá-lo na memória do navegador o perderia
 * justamente para quem abre o processo depois — e é exigência de controle poder
 * mostrar o que mudou e quando.
 */
export async function historicoDeVersoes(
  processoId: string,
  tipo: TipoDocumento,
): Promise<VersaoDocumento[]> {
  const versoes = await requisicaoProtegida<VersaoApi[]>(`${rota(processoId, tipo)}/versions`);
  return versoes.map((versao) => ({
    versao: versao.version,
    geradoEm: versao.generatedAt,
    // O tamanho do arquivo só existe quando o arquivo existir (Bloco 11).
    tamanho: "—",
    nota: versao.note,
  }));
}

/** O texto congelado da versão vigente. Vazio antes da primeira geração. */
export async function corpoDaVersaoVigente(
  processoId: string,
  tipo: TipoDocumento,
): Promise<BlocoDoDocumento[]> {
  const versoes = await requisicaoProtegida<VersaoApi[]>(`${rota(processoId, tipo)}/versions`);
  const vigente = versoes[0];
  if (!vigente) return [];
  return vigente.body.map((bloco) => ({
    id: bloco.sectionCode,
    titulo: bloco.title,
    texto: bloco.text,
    dispensada: bloco.dispensed,
  }));
}

/** O que aconteceu com uma seção entre duas versões. */
export type MudancaDaSecao = "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";

interface ComparacaoApi {
  from: number;
  to: number;
  sections: {
    sectionCode: string;
    title: string;
    change: MudancaDaSecao;
    previousText?: string;
    currentText?: string;
  }[];
  errata: {
    sectionCode: string;
    title: string;
    ondeSeLe?: string;
    leiaSe?: string;
  }[];
}

export interface ComparacaoDeVersoes {
  de: number;
  para: number;
  secoes: {
    id: string;
    titulo: string;
    mudanca: MudancaDaSecao;
    textoAnterior?: string;
    textoAtual?: string;
  }[];
  /** Só o que mudou, no formato "onde se lê / leia-se". */
  errata: { id: string; titulo: string; ondeSeLe?: string; leiaSe?: string }[];
}

/**
 * Compara duas versões geradas e traz a errata.
 *
 * A errata vem junto do diff, e não em chamada própria, porque ela é derivada
 * dele: separá-las faria a tela pedir a mesma comparação duas vezes para montar
 * uma página só.
 */
export async function compararVersoes(
  processoId: string,
  tipo: TipoDocumento,
  de: number,
  para: number,
): Promise<ComparacaoDeVersoes> {
  const comparacao = await requisicaoProtegida<ComparacaoApi>(
    `${rota(processoId, tipo)}/versions/comparison?from=${de}&to=${para}`,
  );
  return {
    de: comparacao.from,
    para: comparacao.to,
    secoes: comparacao.sections.map((secao) => ({
      id: secao.sectionCode,
      titulo: secao.title,
      mudanca: secao.change,
      textoAnterior: secao.previousText,
      textoAtual: secao.currentText,
    })),
    errata: comparacao.errata.map((entrada) => ({
      id: entrada.sectionCode,
      titulo: entrada.title,
      ondeSeLe: entrada.ondeSeLe,
      leiaSe: entrada.leiaSe,
    })),
  };
}

/**
 * Acrescenta uma seção criada pelo servidor, ancorada em uma do catálogo.
 *
 * @param subtopico `true` para subtópico (5.1); `false` para seção nova logo
 *                  após a âncora
 */
export async function acrescentarSecao(
  processoId: string,
  tipo: TipoDocumento,
  titulo: string,
  ancora: string,
  subtopico: boolean,
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(`${rota(processoId, tipo)}/sections`, {
      method: "POST",
      body: JSON.stringify({ title: titulo, anchorSectionCode: ancora, nested: subtopico }),
    }),
    tipo,
  );
}

/** Exclui uma seção criada pelo servidor. As do catálogo têm a dispensa. */
export async function excluirSecao(
  processoId: string,
  tipo: TipoDocumento,
  secaoId: string,
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(
      `${rota(processoId, tipo)}/sections/${encodeURIComponent(secaoId)}`,
      { method: "DELETE" },
    ),
    tipo,
  );
}

/** Reordena as seções criadas pelo servidor. As do catálogo seguem a lei. */
export async function reordenarSecoes(
  processoId: string,
  tipo: TipoDocumento,
  secoesNaOrdem: string[],
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(`${rota(processoId, tipo)}/sections-order`, {
      method: "PUT",
      body: JSON.stringify({ sectionCodesInOrder: secoesNaOrdem }),
    }),
    tipo,
  );
}
