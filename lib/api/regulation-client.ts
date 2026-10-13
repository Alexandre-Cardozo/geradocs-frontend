import "client-only";

import { baixarProtegido, requisicaoProtegida } from "@/lib/api/auth-client";

/**
 * O acervo de normas do órgão (ADR-043 do back-end).
 *
 * <p>Decreto, portaria e instrução que o município edita para aplicar a Lei
 * 14.133/21. Todo servidor do órgão consulta e baixa; só o coordenador
 * cadastra e altera. O texto de cada norma fica guardado no servidor para o
 * agente de IA citá-la ao redigir.
 */

export type EspecieNorma =
  | "LAW"
  | "DECREE"
  | "ORDINANCE"
  | "NORMATIVE_INSTRUCTION"
  | "RESOLUTION"
  | "OTHER";

/** Os rótulos na ordem em que o seletor os oferece. */
export const ESPECIES_DE_NORMA: Record<EspecieNorma, string> = {
  DECREE: "Decreto",
  ORDINANCE: "Portaria",
  NORMATIVE_INSTRUCTION: "Instrução Normativa",
  LAW: "Lei",
  RESOLUTION: "Resolução",
  OTHER: "Outro ato normativo",
};

export interface ArquivoDaNorma {
  versao: number;
  nomeDoArquivo: string;
  tipo: string;
  bytes: number;
  checksum: string;
  /** A IA terá o que ler. Falso num PDF digitalizado. */
  textoDisponivel: boolean;
  caracteresDeTexto: number;
  enviadoEm: string;
  vigente: boolean;
}

export interface Norma {
  id: string;
  especie: EspecieNorma;
  rotuloDaEspecie: string;
  numero: string | null;
  publicadaEm: string | null;
  ementa: string;
  observacao: string | null;
  vigente: boolean;
  revogadaEm: string | null;
  observacaoDaRevogacao: string | null;
  arquivo: ArquivoDaNorma;
  atualizadaEm: string;
  /** A versão lida; a correção a devolve para o servidor conferir. */
  versao: number;
}

export interface DadosDaNorma {
  especie: EspecieNorma;
  numero: string;
  /** AAAA-MM-DD, ou vazio. */
  publicadaEm: string;
  ementa: string;
  observacao: string;
}

interface ArquivoApi {
  version: number;
  fileName: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  textAvailable: boolean;
  textCharacters: number;
  uploadedAt: string;
  current: boolean;
}

interface NormaApi {
  id: string;
  kind: EspecieNorma;
  kindLabel: string;
  number?: string | null;
  publishedOn?: string | null;
  title: string;
  notes?: string | null;
  status: "IN_FORCE" | "REVOKED";
  revokedAt?: string | null;
  revocationNote?: string | null;
  currentFile: ArquivoApi;
  updatedAt: string;
  version: number;
}

function mapearArquivo(arquivo: ArquivoApi): ArquivoDaNorma {
  return {
    versao: arquivo.version,
    nomeDoArquivo: arquivo.fileName,
    tipo: arquivo.mediaType,
    bytes: arquivo.byteSize,
    checksum: arquivo.sha256,
    textoDisponivel: arquivo.textAvailable,
    caracteresDeTexto: arquivo.textCharacters,
    enviadoEm: arquivo.uploadedAt,
    vigente: arquivo.current,
  };
}

function mapear(norma: NormaApi): Norma {
  return {
    id: norma.id,
    especie: norma.kind,
    rotuloDaEspecie: norma.kindLabel,
    numero: norma.number ?? null,
    publicadaEm: norma.publishedOn ?? null,
    ementa: norma.title,
    observacao: norma.notes ?? null,
    vigente: norma.status === "IN_FORCE",
    revogadaEm: norma.revokedAt ?? null,
    observacaoDaRevogacao: norma.revocationNote ?? null,
    arquivo: mapearArquivo(norma.currentFile),
    atualizadaEm: norma.updatedAt,
    versao: norma.version,
  };
}

/** O corpo que o servidor espera; vazio vai como ausente. */
function corpoDosDados(dados: DadosDaNorma, versao?: number) {
  return {
    kind: dados.especie,
    number: dados.numero.trim() || null,
    publishedOn: dados.publicadaEm || null,
    title: dados.ementa,
    notes: dados.observacao.trim() || null,
    ...(versao === undefined ? {} : { version: versao }),
  };
}

const rota = (id: string) => `/regulations/${encodeURIComponent(id)}`;

export async function listarNormas(): Promise<Norma[]> {
  return (await requisicaoProtegida<NormaApi[]>("/regulations")).map(mapear);
}

/**
 * Cadastra a norma com o arquivo.
 *
 * <p>Multipart, como o DFD: os dados num JSON e o arquivo ao lado, como veio —
 * é o servidor que decide o tipo pelo conteúdo.
 */
export async function cadastrarNorma(entrada: { dados: DadosDaNorma; arquivo: File }): Promise<Norma> {
  const corpo = new FormData();
  corpo.append(
    "dados",
    new Blob([JSON.stringify(corpoDosDados(entrada.dados))], { type: "application/json" }),
  );
  corpo.append("file", entrada.arquivo);
  return mapear(await requisicaoProtegida<NormaApi>("/regulations", { method: "POST", body: corpo }));
}

export async function corrigirNorma(entrada: {
  id: string;
  versao: number;
  dados: DadosDaNorma;
}): Promise<Norma> {
  return mapear(
    await requisicaoProtegida<NormaApi>(rota(entrada.id), {
      method: "PUT",
      body: JSON.stringify(corpoDosDados(entrada.dados, entrada.versao)),
    }),
  );
}

/** Envia uma versão nova do arquivo; a anterior continua guardada. */
export async function trocarArquivoDaNorma(entrada: { id: string; arquivo: File }): Promise<Norma> {
  const corpo = new FormData();
  corpo.append("file", entrada.arquivo);
  return mapear(
    await requisicaoProtegida<NormaApi>(`${rota(entrada.id)}/file`, { method: "PUT", body: corpo }),
  );
}

export async function versoesDaNorma(id: string): Promise<ArquivoDaNorma[]> {
  return (await requisicaoProtegida<ArquivoApi[]>(`${rota(id)}/files`)).map(mapearArquivo);
}

export async function baixarNorma(
  id: string,
  versao: number,
): Promise<{ conteudo: Blob; nomeSugerido: string | null }> {
  return baixarProtegido(`${rota(id)}/files/${versao}`);
}

export async function revogarNorma(entrada: { id: string; observacao: string }): Promise<Norma> {
  return mapear(
    await requisicaoProtegida<NormaApi>(`${rota(entrada.id)}/revocation`, {
      method: "POST",
      body: JSON.stringify({ text: entrada.observacao.trim() || null }),
    }),
  );
}

/** Desfaz a revogação feita por engano. */
export async function restabelecerNorma(id: string): Promise<Norma> {
  return mapear(
    await requisicaoProtegida<NormaApi>(`${rota(id)}/revocation`, { method: "DELETE" }),
  );
}

/** Exclui o cadastro feito por engano; a justificativa vai para a trilha. */
export async function excluirNorma(entrada: { id: string; justificativa: string }): Promise<void> {
  await requisicaoProtegida<void>(`${rota(entrada.id)}/removal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: entrada.justificativa }),
  });
}
