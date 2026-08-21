/**
 * Domínio do GeraDocs — funções puras, sem React, sem fetch, sem estado.
 *
 * Quando o back-end assumir cada módulo, estas regras passam a ser
 * **autoritativas no servidor**. A cópia daqui permanece apenas como
 * *affordance* de interface — habilitar botão, mostrar pendência, calcular
 * progresso — e nunca como fonte de verdade. Ver ADR §27.
 */

export * from "@/lib/dominio/escopo"
export * from "@/lib/dominio/indicadores"
export * from "@/lib/dominio/processo"
export * from "@/lib/dominio/secoes"
export * from "@/lib/dominio/versionamento"
