import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { BlocoDoDocumento } from "@/lib/dominio";
import type { SecaoDocumento, StatusDocumento, TipoDocumento } from "@/lib/types";

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
  legalBasis: string;
  hint: string;
  required: boolean;
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

function mapearSecao(secao: SecaoApi): SecaoDocumento {
  return {
    id: secao.sectionCode,
    titulo: secao.title,
    status: status(secao),
    obrigatoria: secao.required,
    conteudo: secao.content,
    hint: secao.hint,
    fundamentoLegal: secao.legalBasis,
    ...(secao.dispensationJustification
      ? { justificativaDispensa: secao.dispensationJustification }
      : {}),
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
    secoes: [...documento.sections].sort((a, b) => a.position - b.position).map(mapearSecao),
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

/** Conclui o documento, se as indispensáveis estiverem resolvidas. */
export async function concluirDocumento(
  processoId: string,
  tipo: TipoDocumento,
): Promise<DocumentoEmElaboracao> {
  return mapear(
    await requisicaoProtegida<DocumentoApi>(`${rota(processoId, tipo)}/finalize`, {
      method: "POST",
    }),
    tipo,
  );
}
