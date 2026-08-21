/**
 * Visibilidade multi-prefeitura.
 *
 * O administrador geral da plataforma enxerga todas as prefeituras; qualquer
 * outro perfil enxerga apenas a sua. É regra de produto, não detalhe de tela —
 * e do lado do front-end ela decide **o que pedir**, nunca o que é permitido: o
 * back-end escopa cada consulta pela identidade autenticada, e é ele quem barra.
 */

import type { Usuario } from "@/lib/types"

/**
 * Ids de prefeitura visíveis ao usuário. `null` significa "todas" — o escopo
 * global do administrador geral, que não pertence a prefeitura nenhuma.
 */
export function prefeiturasVisiveis(usuario: Usuario | null): string[] | null {
  return usuario?.prefeituraId ? [usuario.prefeituraId] : null
}

/** Filtra uma coleção pelo escopo. Escopo nulo devolve tudo. */
export function noEscopo<T extends { prefeituraId: string }>(itens: T[], escopo: string[] | null): T[] {
  return escopo ? itens.filter((item) => escopo.includes(item.prefeituraId)) : itens
}
