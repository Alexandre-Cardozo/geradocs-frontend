"use client"

import { useState } from "react"

import { Button, Input, SectionBlock } from "@/components/ui"
import { IconFile, IconPlus, IconTrash } from "@/components/ui/icons"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useConfigTenant,
  useCriarSecretaria,
  useRemoverSecretaria,
  useSessao,
} from "@/lib/api/hooks"

/**
 * Secretarias do órgão.
 *
 * <p>É o cadastro que alimenta a Secretaria Requisitante do processo — sem ele o
 * wizard de novo processo não tem o que oferecer, e é para cá que ele aponta.
 */
export default function Secretarias() {
  const showToast = useToast()
  const { data: sessao } = useSessao()
  const entidadeId = sessao?.entidade?.id
  const tenant = useConfigTenant(entidadeId)
  const criarSecretaria = useCriarSecretaria(entidadeId)
  const removerSecretaria = useRemoverSecretaria(entidadeId)

  const [novaSecretaria, setNovaSecretaria] = useState("")

  if (tenant.isPending) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando as secretarias..." />
      </div>
    )
  }
  if (tenant.isError) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void tenant.refetch()} />
        </div>
      </div>
    )
  }

  const adicionar = () => {
    const nome = novaSecretaria.trim()
    if (nome === "") {
      showToast("Informe o nome da secretaria para adicionar.")
      return
    }
    criarSecretaria.mutate(nome, {
      onSuccess: () => {
        setNovaSecretaria("")
        showToast("Secretaria adicionada.")
      },
      onError: (error) =>
        showToast(
          error instanceof Error ? error.message : "Não foi possível adicionar a secretaria.",
        ),
    })
  }

  const remover = (id: string) => {
    removerSecretaria.mutate(id, {
      onSuccess: () => showToast("Secretaria desativada."),
      onError: (error) =>
        showToast(
          error instanceof Error ? error.message : "Não foi possível desativar a secretaria.",
        ),
    })
  }

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <SectionBlock
        title="Secretarias do Órgão"
        hint="As secretarias cadastradas aqui aparecem como opções de Secretaria Requisitante na criação de novos processos."
      >
        <div className="mb-4 flex flex-wrap gap-2.5">
          <div className="flex-[1_1_220px]">
            <Input
              value={novaSecretaria}
              onChange={(e) => setNovaSecretaria(e.target.value)}
              placeholder="Ex: Secretaria de Cultura e Turismo"
            />
          </div>
          <Button
            icon={<IconPlus size={14} strokeWidth={2.5} />}
            onClick={adicionar}
            disabled={criarSecretaria.isPending || novaSecretaria.trim() === ""}
            className="h-9.5"
          >
            Adicionar Nova Secretaria
          </Button>
        </div>
        {tenant.data.secretarias.length === 0 ? (
          <EmptyState message="Nenhuma secretaria cadastrada neste órgão" />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {tenant.data.secretarias.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-border-soft px-3 py-2.5"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-tint-royal-bg text-royal">
                  <IconFile size={14} />
                </span>
                <span className="flex-1 truncate text-base font-medium text-text-1">{s.nome}</span>
                <button
                  type="button"
                  aria-label={`Remover ${s.nome}`}
                  disabled={removerSecretaria.isPending}
                  onClick={() => remover(s.id)}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
