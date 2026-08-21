/**
 * Regras de preenchimento e conclusão das seções de um documento.
 *
 * Vivem aqui, e não dentro do mock ou da tela, porque descrevem o produto: a
 * mesma regra vale quando o back-end assumir a persistência. Do lado do
 * front-end elas continuam servindo para decidir o que a interface oferece —
 * habilitar botão, mostrar progresso —, mas a palavra final passa a ser do
 * servidor.
 */

import type { SecaoDocumento, StatusDocumento } from "@/lib/types"

/**
 * Status resultante de salvar uma seção.
 *
 * Esvaziar uma seção antes concluída volta o status para "Não iniciado": sem
 * isso, o trilho e o percentual contariam como pronta uma seção em branco, e o
 * documento seria dado por completo sem estar.
 */
export function statusAposEditar(conteudo: string, statusInformado?: StatusDocumento): StatusDocumento {
  if (statusInformado) return statusInformado
  return conteudo.trim() ? "Completo" : "Não iniciado"
}

/** Seções concluídas do documento. */
export function concluidas(secoes: SecaoDocumento[]): SecaoDocumento[] {
  return secoes.filter((secao) => secao.status === "Completo")
}

/** Percentual inteiro de conclusão. Documento sem seção nenhuma é 0, não 100. */
export function progresso(secoes: SecaoDocumento[]): number {
  if (secoes.length === 0) return 0
  return Math.round((concluidas(secoes).length / secoes.length) * 100)
}

/**
 * Seções indispensáveis ainda não concluídas.
 *
 * Só elas travam a geração. As demais podem ficar em branco — no ETP é o que o
 * Art. 18, § 2º permite, dispensando incisos mediante justificativa.
 */
export function obrigatoriasPendentes(secoes: SecaoDocumento[]): SecaoDocumento[] {
  return secoes.filter((secao) => secao.obrigatoria && secao.status !== "Completo")
}

/** O documento pode ser gerado? Documento sem seção nenhuma não pode. */
export function podeGerar(secoes: SecaoDocumento[]): boolean {
  return secoes.length > 0 && obrigatoriasPendentes(secoes).length === 0
}
