"use client"

import { useState } from "react"

import { Button, FormField, Input, InfoBanner } from "@/components/ui"
import { IconBuilding, IconPlus, IconTrash } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { useCriarPrefeitura, usePrefeituras, useRemoverPrefeitura, useUsuarios } from "@/lib/api/hooks"

export default function AdminPrefeituras() {
  const showToast = useToast()
  const prefeituras = usePrefeituras()
  const usuarios = useUsuarios()
  const criar = useCriarPrefeitura()
  const remover = useRemoverPrefeitura()

  const [novo, setNovo] = useState(false)
  const [orgao, setOrgao] = useState("")
  const [unidade, setUnidade] = useState("")

  // Ordena pelo código sequencial (PREF-001, PREF-002, ...).
  const ordenadas = [...(prefeituras.data ?? [])].sort((a, b) => a.id.localeCompare(b.id))

  const salvar = () => {
    if (orgao.trim() === "") return
    criar.mutate(
      { orgao, unidade },
      {
        onSuccess: () => {
          showToast("Prefeitura cadastrada.")
          setNovo(false)
          setOrgao("")
          setUnidade("")
        },
      }
    )
  }

  const excluir = (id: string, nome: string) => {
    remover.mutate(id, {
      onSuccess: () => showToast(`${nome} desativada.`),
      onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível remover."),
    })
  }

  const servidoresDe = (id: string) => (usuarios.data ?? []).filter((u) => u.prefeituraId === id).length

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Prefeituras</h1>
          <p className="m-0 mt-1 text-md text-text-3">Cadastre e configure as prefeituras clientes do GeraDocs.</p>
        </div>
        <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setNovo((v) => !v)}>
          Nova Prefeitura
        </Button>
      </div>

      {novo && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">Cadastrar Prefeitura</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome do Órgão" required>
              <Input value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Ex: Prefeitura de Vila Velha" />
            </FormField>
            <FormField label="Unidade">
              <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Secretaria de Administração" />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button>
            <p id="motivo-criar-prefeitura" className="sr-only">
              O nome do órgão é obrigatório.
            </p>
            <Button
              disabled={criar.isPending || orgao.trim() === ""}
              ariaDescribedBy="motivo-criar-prefeitura"
              onClick={salvar}
            >
              {criar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      <InfoBanner tone="info" className="mb-4">
        A configuração de cada prefeitura (identidade, PCA, cabeçalho/rodapé, secretarias) é feita pelo respectivo coordenador em Configurações.
      </InfoBanner>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {prefeituras.isPending && <SkeletonRows rows={4} />}
        {prefeituras.isError && <ErrorState onRetry={() => void prefeituras.refetch()} />}
        {prefeituras.isSuccess && prefeituras.data.length === 0 && <EmptyState message="Nenhuma prefeitura cadastrada" />}
        {prefeituras.isSuccess && prefeituras.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Prefeitura", "Unidade", "Servidores", ""].map((h, i) => (
                    <Th key={h === "" ? `x-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((p, i) => (
                  <tr key={p.id} className={i < ordenadas.length - 1 ? "border-b border-ice" : ""}>
                    <td className="px-4 py-3.25">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
                          <IconBuilding size={15} />
                        </span>
                        <div>
                          <div className="text-base font-semibold text-text-1">{p.orgao}</div>
                          <div className="font-mono text-xs text-text-muted">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{p.unidade}</td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{servidoresDe(p.id)}</td>
                    <td className="px-4 py-3.25">
                      <button
                        type="button"
                        aria-label={`Desativar ${p.orgao}`}
                        disabled={remover.isPending}
                        onClick={() => excluir(p.id, p.orgao)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-danger transition-colors hover:bg-tint-danger-bg disabled:opacity-50"
                      >
                        <IconTrash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
