"use client"

import Link from "next/link"

import { documentosDaEstimativa, resumoDaEstimativa } from "@/lib/dominio/estimativa"
import { fundamentoDaFonte } from "@/lib/dominio/fontes-de-preco"
import { CATALOGO } from "@/lib/documentos"
import type { Processo } from "@/lib/types"

/**
 * A estimativa de valor do processo, na capa — só leitura (ADR-051 do back-end).
 *
 * <p>Quem abre o processo vê o critério adotado sem entrar nos documentos. A
 * troca é feita na seção de valor de um deles, onde o efeito no total aparece
 * na hora; aqui fica o caminho até lá.
 */
export function ResumoDaEstimativa({ processo }: { processo: Processo }) {
  const alcancados = documentosDaEstimativa(processo.documentos)
  const destino = alcancados.find((tipo) => tipo !== "Cotação") ?? alcancados[0]
  if (!destino) return null

  const resumo = resumoDaEstimativa(processo.estimativa)
  const fundamento = processo.estimativa?.fonte ? fundamentoDaFonte(processo.estimativa.fonte) : null
  const painel = destino === "Cotação" ? "referencia" : "valor"
  const href = `/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=${CATALOGO[destino].slug}&painel=${painel}`

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-ice px-4 py-3">
      <div className="min-w-0 text-sm text-text-3">
        <span className="font-semibold text-text-1">Estimativa de valor:</span>{" "}
        {resumo ?? "forma de cálculo e fonte ainda não declaradas"}
        {fundamento && <span className="text-text-muted"> ({fundamento})</span>}
      </div>
      {processo.status !== "concluido" && (
        <Link href={href} className="text-sm font-semibold text-royal no-underline hover:text-royal-hover">
          {resumo ? "Alterar" : "Declarar"} {destino === "Cotação" ? "na" : "no"} {destino}
        </Link>
      )}
    </div>
  )
}
