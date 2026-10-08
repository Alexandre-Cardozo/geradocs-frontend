"use client"

import { usePathname } from "next/navigation"

/**
 * A rota atual sem a barra final: `/processos/` vira `/processos`; a raiz
 * continua `/`.
 *
 * O `trailingSlash` do `next.config.ts` faz o `usePathname` devolver a barra
 * junto. A moldura compara a rota por igualdade — o título do cabeçalho, o item
 * ativo do menu, o RBAC —, e com a barra o título caía no padrão "GeraDocs" e
 * nenhum item do menu acendia. Normalizar aqui mantém a comparação com o
 * caminho como ele é escrito no código (`href: "/processos"`).
 */
export function useRotaAtual(): string {
  return semBarraFinal(usePathname())
}

export function semBarraFinal(caminho: string): string {
  return caminho.length > 1 ? caminho.replace(/\/+$/, "") || "/" : caminho
}
