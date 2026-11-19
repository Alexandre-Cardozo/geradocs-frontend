import { ApiError } from "@/lib/api/auth-client"

/**
 * O limite de IA do plano contratado (§109; ADR-064 do back-end).
 *
 * <p>Quando a entidade gasta o teto do mês, o servidor recusa a geração com
 * `402` e o código `AI_BUDGET_EXHAUSTED`. Esperar não resolve: quem amplia o
 * limite é a GovPro. A tela abre um aviso flutuante com o contato, em vez de um
 * toast que some.
 */
export function ehLimiteDaIa(erro: unknown): boolean {
  return erro instanceof ApiError && (erro.code === "AI_BUDGET_EXHAUSTED" || erro.status === 402)
}

/** O contato comercial da GovPro, o mesmo do carimbo dos documentos. */
export const CONTATO_DA_GOVPRO = "contato@govpro.com.br"

/** O e-mail já com o assunto: quem recebe sabe do que se trata. */
export const LINK_PARA_AMPLIAR_O_LIMITE = `mailto:${CONTATO_DA_GOVPRO}?subject=${encodeURIComponent(
  "Ampliação do limite de IA do GeraDocs",
)}`

/** O que a revisão diz no resumo quando para no limite. */
export const MOTIVO_DO_LIMITE_ESGOTADO = "O limite de IA do plano contratado acabou neste mês. Fale com a GovPro para ampliar."
