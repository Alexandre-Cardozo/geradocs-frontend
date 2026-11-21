import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { components } from "@/lib/api/gerado/v1";

type RespostaDaMelhoria = components["schemas"]["ImprovedTextResponse"];

/**
 * Pede à IA a redação melhorada da situação-problema do DFD (ADR-072 do back-end).
 *
 * É só uma sugestão: o servidor não grava nada, e o texto só muda no DFD quando
 * quem escreveu o salva. A IA não acrescenta nem retira fato; se não conseguir
 * garantir isso, o servidor recusa (`502`) e o texto da pessoa fica como está.
 */
export async function melhorarSituacaoProblema(processoId: string, texto: string): Promise<string> {
  const resposta = await requisicaoProtegida<RespostaDaMelhoria>(
    `/procurement-processes/${encodeURIComponent(processoId)}/dfds/improve-problem-description`,
    { method: "POST", body: JSON.stringify({ text: texto }) },
  );
  return resposta.text;
}
