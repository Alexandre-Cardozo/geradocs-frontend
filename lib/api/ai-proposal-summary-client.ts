import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { components } from "@/lib/api/gerado/v1";

type RespostaDoResumo = components["schemas"]["AiProposalSummaryResponse"];

/**
 * O aproveitamento da IA de uma entidade num mês (ADR-071 do back-end).
 *
 * `taxaDeAceite` é de 0 a 1 e **ausente** enquanto nenhuma proposta foi
 * decidida: zero diria que a IA não serviu, quando ela só ainda não foi
 * avaliada.
 */
export interface AproveitamentoDaIa {
  /** O mês, como `AAAA-MM`. */
  mes: string;
  pendentes: number;
  aceitasComoVieram: number;
  aceitasEditadas: number;
  rejeitadas: number;
  substituidas: number;
  /** Aceitas + rejeitadas + substituídas: as que já tiveram destino. */
  decididas: number;
  taxaDeAceite?: number;
}

export async function lerAproveitamentoDaIa(entidadeId: string): Promise<AproveitamentoDaIa> {
  const r = await requisicaoProtegida<RespostaDoResumo>(`/organizations/${entidadeId}/ai-proposals/summary`);
  return {
    mes: r.month,
    pendentes: r.pending,
    aceitasComoVieram: r.acceptedAsIs,
    aceitasEditadas: r.acceptedEdited,
    rejeitadas: r.rejected,
    substituidas: r.superseded,
    decididas: r.decided,
    taxaDeAceite: r.acceptanceRate ?? undefined,
  };
}
