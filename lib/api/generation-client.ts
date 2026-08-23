import "client-only";

import { baixarProtegido, requisicaoProtegida } from "@/lib/api/auth-client";
import type { TipoDocumento } from "@/lib/types";

/** Os formatos que a plataforma imprime. */
export type FormatoArquivo = "DOCX" | "PDF";

/** Os tipos do contrato são maiúsculos sem acento; a interface usa o rótulo. */
const tipos: Record<TipoDocumento, string> = {
  "Cotação": "COTACAO",
  ETP: "ETP",
  Mapa: "MAPA",
  TR: "TR",
  Edital: "EDITAL",
  Contrato: "CONTRATO",
};

export interface ArquivoGerado {
  id: string;
  formato: FormatoArquivo;
  nomeDoArquivo: string;
  /** Tamanho em bytes, como o servidor o mediu — não estimado por tipo. */
  bytes: number;
  /** SHA-256 do arquivo; permite conferir o que foi baixado. */
  checksum: string;
  versaoDoDocumento: number;
  versaoDoTemplate: number;
  geradoEm: string;
}

export interface GeracaoDeDocumento {
  id: string;
  versaoDoDocumento: number;
  pedidaEm: string;
  concluida: boolean;
  arquivos: ArquivoGerado[];
}

interface ArquivoApi {
  id: string;
  format: FormatoArquivo;
  fileName: string;
  byteSize: number;
  sha256: string;
  documentVersion: number;
  templateVersion: number;
  generatedAt: string;
}

interface GeracaoApi {
  id: string;
  documentVersion: number;
  requestedAt: string;
  succeeded: boolean;
  files: ArquivoApi[];
}

function mapearArquivo(arquivo: ArquivoApi): ArquivoGerado {
  return {
    id: arquivo.id,
    formato: arquivo.format,
    nomeDoArquivo: arquivo.fileName,
    bytes: arquivo.byteSize,
    checksum: arquivo.sha256,
    versaoDoDocumento: arquivo.documentVersion,
    versaoDoTemplate: arquivo.templateVersion,
    geradoEm: arquivo.generatedAt,
  };
}

function mapear(geracao: GeracaoApi): GeracaoDeDocumento {
  return {
    id: geracao.id,
    versaoDoDocumento: geracao.documentVersion,
    pedidaEm: geracao.requestedAt,
    concluida: geracao.succeeded,
    arquivos: geracao.files.map(mapearArquivo),
  };
}

function rota(processoId: string, tipo: TipoDocumento) {
  return `/procurement-processes/${encodeURIComponent(processoId)}/documents/${
    tipos[tipo]
  }/generations`;
}

/**
 * Imprime a versão vigente do documento.
 *
 * <p>Os dois formatos numa requisição só, e não em duas: assim eles saem da
 * **mesma** versão. Em duas chamadas, uma retificação no meio produziria
 * arquivos que dizem coisas diferentes e parecem irmãos.
 */
export async function gerarArquivos(
  processoId: string,
  tipo: TipoDocumento,
  formatos: FormatoArquivo[] = ["DOCX", "PDF"],
): Promise<GeracaoDeDocumento> {
  return mapear(
    await requisicaoProtegida<GeracaoApi>(rota(processoId, tipo), {
      method: "POST",
      body: JSON.stringify({ formats: formatos }),
    }),
  );
}

/** As gerações do documento, da mais recente para a mais antiga. */
export async function geracoesDoDocumento(
  processoId: string,
  tipo: TipoDocumento,
): Promise<GeracaoDeDocumento[]> {
  return (await requisicaoProtegida<GeracaoApi[]>(rota(processoId, tipo))).map(mapear);
}

/** Busca os bytes de um arquivo gerado, autenticado. */
export async function baixarArquivo(
  processoId: string,
  tipo: TipoDocumento,
  arquivoId: string,
) {
  return baixarProtegido(
    `${rota(processoId, tipo)}/files/${encodeURIComponent(arquivoId)}`,
  );
}
