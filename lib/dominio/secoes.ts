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

/**
 * A seção foi dispensada?
 *
 * Dispensa é seção **dispensável**, **em branco** e **com justificativa**. As
 * três condições juntas: obrigatória não se dispensa, seção preenchida não foi
 * dispensada, e seção em branco sem justificativa é lacuna — não dispensa.
 */
export function foiDispensada(secao: SecaoDocumento): secao is SecaoDispensada {
  return (
    !secao.obrigatoria &&
    secao.conteudo.trim() === "" &&
    (secao.justificativaDispensa ?? "").trim() !== ""
  )
}

/** Seção que passou por {@link foiDispensada}: a justificativa existe. */
export type SecaoDispensada = SecaoDocumento & { justificativaDispensa: string }

/** Seções dispensáveis em branco e sem justificativa — lacunas silenciosas. */
export function dispensadasSemJustificativa(secoes: SecaoDocumento[]): SecaoDocumento[] {
  return secoes.filter(
    (secao) =>
      !secao.obrigatoria &&
      secao.conteudo.trim() === "" &&
      (secao.justificativaDispensa ?? "").trim() === "",
  )
}

/**
 * O parágrafo que entra no documento no lugar da seção dispensada.
 *
 * Ele existe porque a alternativa é pior: hoje a seção em branco desaparece do
 * documento gerado, e quem audita não consegue distinguir o inciso que não se
 * aplica daquele que ninguém preencheu. O texto cita o fundamento literalmente,
 * como o resto do documento.
 */
export function paragrafoDeDispensa(secao: SecaoDispensada): string {
  // Sem fallback: o tipo garante que a justificativa existe, porque a função só
  // é alcançável através de `foiDispensada`. Um `?? ""` aqui seria um caminho
  // que nenhuma entrada percorre — e esconderia um chamador errado.
  const justificativa = secao.justificativaDispensa.trim()
  return (
    `${secao.titulo} — dispensado nos termos do Art. 18, § 2º, da Lei 14.133/21. ` +
    `Fundamento da seção: ${secao.fundamentoLegal}. Justificativa: ${justificativa}`
  )
}

/** Status de uma seção dispensada, para o trilho não contá-la como pendente. */
export function statusAposDispensar(justificativa: string): StatusDocumento {
  // "Em revisão" seria mentira: não há o que revisar. A dispensa é uma decisão
  // tomada, e o trilho precisa mostrá-la como resolvida.
  return justificativa.trim() ? "Completo" : "Não iniciado"
}
