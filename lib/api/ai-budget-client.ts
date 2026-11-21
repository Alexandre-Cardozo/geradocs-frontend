import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";
import type { components } from "@/lib/api/gerado/v1";

type RespostaDoTeto = components["schemas"]["AiBudgetResponse"];

/**
 * O teto mensal de IA de uma entidade (ADR-064 do back-end).
 *
 * <p>`definido` e `disponivel` são perguntas diferentes e a tela as trata
 * diferente: sem teto, "fale com o administrador para definir"; com teto
 * esgotado, "o limite do mês foi consumido".
 */
export interface TetoDeIa {
  definido: boolean;
  disponivel: boolean;
  /** Em reais; ausente quando nunca houve teto. */
  teto?: number;
  gasto: number;
  restante?: number;
}

function paraTeto(r: RespostaDoTeto): TetoDeIa {
  return {
    definido: r.defined,
    disponivel: r.available,
    teto: r.limitAmount ?? undefined,
    gasto: r.spentAmount,
    restante: r.remainingAmount ?? undefined,
  };
}

export async function lerTetoDeIa(entidadeId: string): Promise<TetoDeIa> {
  return paraTeto(await requisicaoProtegida<RespostaDoTeto>(`/organizations/${entidadeId}/ai-budget`));
}

/** Só o administrador da plataforma define; o servidor recusa os demais. */
export async function definirTetoDeIa(entidadeId: string, teto: number): Promise<TetoDeIa> {
  return paraTeto(
    await requisicaoProtegida<RespostaDoTeto>(`/organizations/${entidadeId}/ai-budget`, {
      method: "PUT",
      body: JSON.stringify({ limitAmount: teto }),
    }),
  );
}
