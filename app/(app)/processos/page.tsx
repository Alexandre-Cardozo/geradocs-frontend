"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button, DocPill, FilterTabs, SearchInput, StatusBadge, Tag } from "@/components/ui"
import { IconChevronRight, IconDownload, IconFilter } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { useProcessos } from "@/lib/api/hooks"
import { formatBRL } from "@/lib/format"
import { MODALIDADE_LABEL, STATUS_PROCESSO_LABEL, type StatusProcesso } from "@/lib/types"

/**
 * Os rótulos saem de `STATUS_PROCESSO_LABEL`, não de uma lista paralela: o
 * vocabulário de status é normativo e vai encolher quando o fluxo de aprovação
 * sair do produto. Uma cópia local continuaria oferecendo filtro para status que
 * deixou de existir, sem quebrar nada.
 */
const statusFilters = [
  { key: "todos", label: "Todos" },
  ...(Object.keys(STATUS_PROCESSO_LABEL) as StatusProcesso[]).map((key) => ({
    key,
    label: STATUS_PROCESSO_LABEL[key],
  })),
]

export default function Processos() {
  const router = useRouter()
  const showToast = useToast()
  const [activeFilter, setActiveFilter] = useState("todos")
  const [busca, setBusca] = useState("")
  const [pagina, setPagina] = useState(1)

  const processos = useProcessos({
    busca,
    status: activeFilter as StatusProcesso | "todos",
    pagina,
    porPagina: 8,
  })

  const itens = processos.data?.itens ?? []

  return (
    <div className="p-4 sm:p-5 lg:p-7">
      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput
          grow
          placeholder="Buscar por título ou número..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPagina(1)
          }}
          tone="surface"
        />

        <FilterTabs
          options={statusFilters}
          active={activeFilter}
          onChange={(key) => {
            setActiveFilter(key)
            setPagina(1)
          }}
        />

        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            icon={<IconFilter size={14} />}
            onClick={() => showToast("Filtros avançados ficarão disponíveis na integração com o backend.")}
          >
            Filtros
          </Button>
          <Button
            variant="secondary"
            icon={<IconDownload size={14} />}
            onClick={() => showToast("Exportação da lista disponível na integração com o backend.")}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {processos.isPending && <SkeletonRows rows={8} />}
        {processos.isError && <ErrorState onRetry={() => void processos.refetch()} />}

        {processos.isSuccess && itens.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Processo / Objeto", "Secretaria", "Modalidade", "Valor Est.", "ETP", "TR", "Responsável", "Status", ""].map((h, i) => (
                    <Th key={h === "" ? `vazio-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/processos/detalhe?id=${encodeURIComponent(p.id)}`)}
                    className={`cursor-pointer transition-colors hover:bg-ice ${i < itens.length - 1 ? "border-b border-ice" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="max-w-65 text-base font-semibold text-text-1">{p.objeto}</div>
                      <div className="mt-0.75 font-mono text-xs text-text-muted">{p.id}</div>
                    </td>
                    <td className="max-w-40 px-4 py-3.5 text-sm text-text-3">{p.secretaria}</td>
                    <td className="px-4 py-3.5">
                      <Tag tone="info">{MODALIDADE_LABEL[p.modalidade]}</Tag>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-base font-semibold whitespace-nowrap text-petroleum">
                      {formatBRL(p.valorEstimado)}
                    </td>
                    <td className="px-4 py-3.5">
                      <DocPill status={p.etpStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <DocPill status={p.trStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-3">{p.responsavel}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        aria-label={`Abrir processo ${p.id}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/processos/detalhe?id=${encodeURIComponent(p.id)}`)
                        }}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3"
                      >
                        <IconChevronRight size={13} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {processos.isSuccess && itens.length === 0 && <EmptyState message="Nenhum processo encontrado" />}

        {processos.isSuccess && (
          <div className="flex items-center justify-between border-t border-border-soft px-4 py-3">
            <span className="text-sm text-text-muted">
              Exibindo {itens.length} de {processos.data.total} processos
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: processos.data.totalPaginas }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPagina(p)}
                  className={`size-7.5 cursor-pointer rounded-sm border border-border text-base font-semibold ${
                    p === pagina ? "bg-navy text-surface" : "bg-surface text-text-3"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
