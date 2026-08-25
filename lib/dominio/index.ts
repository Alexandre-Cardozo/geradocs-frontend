/**
 * Domínio do GeraDocs — funções puras, sem React, sem fetch, sem estado.
 *
 * Quando o back-end assumir cada módulo, estas regras passam a ser
 * **autoritativas no servidor**. A cópia daqui permanece apenas como
 * *affordance* de interface — habilitar botão, mostrar pendência, calcular
 * progresso — e nunca como fonte de verdade. Ver ADR §27.
 */

export * from "@/lib/dominio/identidade"
export * from "@/lib/dominio/indicadores"
export * from "@/lib/dominio/numeracao"
export * from "@/lib/dominio/processo"
export * from "@/lib/dominio/secoes"
export * from "@/lib/dominio/versionamento"
export {
  MOTIVO_RETIFICACAO_EXPLICACAO,
  MOTIVO_RETIFICACAO_LABEL,
  foiRetificado,
  notaDaVersao,
  tituloComRotuloDeVersao,
} from "./versionamento"
export type { MotivoRetificacao, Retificacao } from "./versionamento"
export { corpoDoDocumento } from "./corpo"
export type { BlocoDoDocumento } from "./corpo"
export {
  dispensadasSemJustificativa,
  foiDispensada,
  paragrafoDeDispensa,
  statusAposDispensar,
} from "./secoes"
export { impactoTrocaModalidade, motivoDaTrocaDeModalidade } from "./modalidade"
export type { ImpactoTrocaModalidade } from "./modalidade"
export { CAMPOS_SINTETICOS, DADOS_SINTETICOS } from "./sintetico"
export type { CampoSintetico, DadoSintetico } from "./sintetico"
