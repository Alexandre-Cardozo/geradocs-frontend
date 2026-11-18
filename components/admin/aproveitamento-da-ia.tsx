"use client"

import { Tag } from "@/components/ui"
import { useAproveitamentoDaIa } from "@/lib/api/hooks"

/**
 * Quanto da IA a entidade aproveita no mês (ADR-071 do back-end).
 *
 * <p>É a pergunta de quem paga a IA: dos rascunhos que já tiveram destino,
 * quantos o servidor usou. Enquanto nada foi decidido, a tela diz isso — não
 * mostra 0%, que diria que a IA não serviu quando ela só ainda não foi avaliada.
 */
export function AproveitamentoDaIa({ entidadeId }: { entidadeId: string }) {
  const resumo = useAproveitamentoDaIa(entidadeId)

  if (resumo.isPending) return <span className="text-sm text-text-3">Carregando...</span>
  if (resumo.isError) return <span className="text-sm text-text-3">Indisponível</span>

  const r = resumo.data
  if (r.taxaDeAceite === undefined) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="neutral">Sem decisões</Tag>
        <span className="text-xs text-text-3">
          {r.pendentes > 0
            ? `${r.pendentes} ${r.pendentes === 1 ? "rascunho espera" : "rascunhos esperam"} o servidor`
            : "Nenhum rascunho decidido neste mês."}
        </span>
      </div>
    )
  }

  const aceitas = r.aceitasComoVieram + r.aceitasEditadas
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-sm text-text-1">{Math.round(r.taxaDeAceite * 100)}% aceitos</span>
      <span className="text-xs text-text-3">
        {aceitas} de {r.decididas} decididos
        {r.aceitasEditadas > 0 && ` · ${r.aceitasEditadas} com edição`}
      </span>
    </div>
  )
}
