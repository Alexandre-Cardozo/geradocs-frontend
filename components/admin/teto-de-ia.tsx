"use client"

import { useState } from "react"

import { Button, MoneyInput, Tag } from "@/components/ui"
import { IconPencil } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useDefinirTetoDeIa, useTetoDeIa } from "@/lib/api/hooks"
import { formatBRL, formatNumeroBR, parseValorBR } from "@/lib/format"

/**
 * O teto mensal de IA de uma entidade (ADR-064 do back-end).
 *
 * <p>Sem teto definido a entidade não consegue gerar com IA, e a tela da
 * administração é o único lugar em que isso se resolve. Por isso o estado
 * "sem teto" não é um traço: diz o que acontece e deixa a ação à mão.
 *
 * <p>O teto vale para cada mês, e o valor é o do mês corrente: baixá-lo abaixo
 * do que já foi gasto é permitido e só esgota o mês.
 */
export function TetoDeIa({ entidadeId, nome }: { entidadeId: string; nome: string }) {
  const showToast = useToast()
  const teto = useTetoDeIa(entidadeId)
  const definir = useDefinirTetoDeIa()
  // Texto, e não número: é o que a pessoa digita, com a máscara do campo.
  const [valor, setValor] = useState<string | null>(null)

  if (teto.isPending) return <span className="text-sm text-text-3">Carregando...</span>
  if (teto.isError) return <span className="text-sm text-text-3">Indisponível</span>

  const atual = teto.data
  const valido = valor !== null && valor.trim() !== ""

  const salvar = () => {
    if (valor === null || !valido) return
    definir.mutate(
      { entidadeId, teto: parseValorBR(valor) },
      {
        onSuccess: () => {
          showToast(`Teto de IA de ${nome} atualizado.`)
          setValor(null)
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível definir o teto."),
      },
    )
  }

  if (valor !== null) {
    return (
      <div className="flex items-start gap-2">
        <div
          className="w-36"
          onFocusCapture={(e) => {
            if (e.target instanceof HTMLInputElement) e.target.select()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar()
            if (e.key === "Escape") setValor(null)
          }}
        >
          <MoneyInput value={valor} onChange={setValor} ariaLabel={`Teto mensal de IA de ${nome}`} />
          <p id={`motivo-teto-${entidadeId}`} className="m-0 mt-1 text-xs text-text-3">
            Por mês. Zero desliga a IA da entidade.
          </p>
        </div>
        <Button
          size="sm"
          disabled={definir.isPending || !valido}
          ariaDescribedBy={`motivo-teto-${entidadeId}`}
          onClick={salvar}
        >
          {definir.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setValor(null)}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {atual.definido && atual.teto !== undefined ? (
        <>
          <span className="font-mono text-sm text-text-1">{formatBRL(atual.teto)} por mês</span>
          <span className="text-xs text-text-3">gasto {formatBRL(atual.gasto)}</span>
          {!atual.disponivel && <Tag tone="neutral">Esgotado</Tag>}
        </>
      ) : (
        <>
          <Tag tone="neutral">Sem teto</Tag>
          <span className="text-xs text-text-3">A IA fica indisponível até definir.</span>
        </>
      )}
      <button
        type="button"
        aria-label={`Definir o teto mensal de IA de ${nome}`}
        title="Definir o teto mensal de IA"
        onClick={() => setValor(atual.teto === undefined ? "" : formatNumeroBR(atual.teto))}
        className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-surface text-text-3 transition-colors hover:bg-ice hover:text-text-1"
      >
        <IconPencil size={13} />
      </button>
    </div>
  )
}
