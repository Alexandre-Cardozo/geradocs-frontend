import type { components } from "@/lib/api/gerado/v1"
import { requisicaoProtegida } from "@/lib/api/auth-client"

/**
 * A leitura da ATA anexada na adesão (ADR 119; ADR-080 do back-end).
 *
 * É apoio à conferência, e não parecer: o servidor lê o PDF ou o DOCX, a IA aponta o que a ATA diz com o trecho que
 * sustenta cada ponto, e a vigência é conferida pela data no servidor. Nada é gravado.
 */
export type SituacaoDaVigencia = "vigente" | "vencida" | "desconhecida"
export type CompatibilidadeDaAta = "compativel" | "parcial" | "incompativel" | "indeterminada"
export type AssuntoDoAchado = "vigencia" | "objeto" | "itens" | "precos" | "outro"

export interface AchadoDaAta {
  assunto: AssuntoDoAchado
  texto: string
  /** O trecho da própria ATA que sustenta o ponto. */
  trecho: string
}

export interface LeituraDaAta {
  orgaoGerenciador: string | null
  /** A vigência como a ATA a escreve. */
  vigenciaNaAta: string | null
  situacaoDaVigencia: SituacaoDaVigencia
  /** A data lida da vigência, "AAAA-MM-DD". */
  dataDaVigencia: string | null
  objetoDaAta: string | null
  compatibilidade: CompatibilidadeDaAta
  motivoDaCompatibilidade: string
  achados: AchadoDaAta[]
  /** A ATA passou do limite e só o começo foi lido. */
  textoCortado: boolean
}

type RespostaApi = components["schemas"]["AtaReviewResponse"]

// O mapeamento do contrato para o vocabulário da interface é à mão de propósito (camada anticorrupção).
const situacoes: Record<RespostaApi["validityStatus"], SituacaoDaVigencia> = {
  VALID: "vigente",
  EXPIRED: "vencida",
  UNKNOWN: "desconhecida",
}

const compatibilidades: Record<RespostaApi["compatibility"], CompatibilidadeDaAta> = {
  COMPATIBLE: "compativel",
  PARTIAL: "parcial",
  INCOMPATIBLE: "incompativel",
  UNDETERMINED: "indeterminada",
}

const assuntos: Record<RespostaApi["findings"][number]["kind"], AssuntoDoAchado> = {
  VALIDITY: "vigencia",
  OBJECT: "objeto",
  ITEMS: "itens",
  PRICES: "precos",
  OTHER: "outro",
}

/** Manda a ATA para o servidor ler. Não grava nada. */
export async function revisarAta(processoId: string, arquivo: File): Promise<LeituraDaAta> {
  const corpo = new FormData()
  corpo.append("file", arquivo)
  const resposta = await requisicaoProtegida<RespostaApi>(
    `/procurement-processes/${encodeURIComponent(processoId)}/ata-review`,
    { method: "POST", body: corpo },
  )
  return {
    orgaoGerenciador: resposta.managingBody ?? null,
    vigenciaNaAta: resposta.validityText ?? null,
    situacaoDaVigencia: situacoes[resposta.validityStatus],
    dataDaVigencia: resposta.validityDate ?? null,
    objetoDaAta: resposta.ataObject ?? null,
    compatibilidade: compatibilidades[resposta.compatibility],
    motivoDaCompatibilidade: resposta.compatibilityReason,
    achados: resposta.findings.map((achado) => ({
      assunto: assuntos[achado.kind],
      texto: achado.text,
      trecho: achado.quote,
    })),
    textoCortado: resposta.textTruncated,
  }
}
